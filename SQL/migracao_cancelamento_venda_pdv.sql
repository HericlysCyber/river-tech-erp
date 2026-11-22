-- River Tech ERP/PDV — cancelamento de venda diretamente no caixa
-- Execute no SQL Editor do projeto Supabase do ERP/PDV.
-- Recomendado: backup antes de executar. A função bloqueia Pix e pagamentos mistos.
ALTER TABLE public.erp_vendas
  ADD COLUMN IF NOT EXISTS cancelado_em timestamptz,
  ADD COLUMN IF NOT EXISTS cancelado_por uuid REFERENCES public.erp_usuarios(id),
  ADD COLUMN IF NOT EXISTS motivo_cancelamento text,
  ADD COLUMN IF NOT EXISTS estorno_cartao_pendente boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.erp_cancelar_venda_pdv(
  p_venda_id uuid,
  p_motivo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_auth uuid;
  v_usuario_id uuid;
  v_empresa_id uuid;
  v_pdv_id uuid;
  v_tipo text;
  v_ativo boolean;
  v_bloqueado boolean;
  v_venda public.erp_vendas%ROWTYPE;
  v_caixa_id bigint;
  v_tipo_pagamento text;
  v_tem_dinheiro boolean := false;
  v_tem_cartao boolean := false;
  v_tem_pix boolean := false;
  v_tem_outro boolean := false;
  v_valor_pagamentos numeric := 0;
  v_item record;
  v_estoque_id uuid;
  v_estorno_pendente boolean := false;
BEGIN
  v_auth := auth.uid();
  IF v_auth IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado.'; END IF;

  SELECT u.id,u.empresa_id,u.pdv_id,u.tipo,u.ativo,u.bloqueado
    INTO v_usuario_id,v_empresa_id,v_pdv_id,v_tipo,v_ativo,v_bloqueado
  FROM public.erp_usuarios u
  WHERE u.auth_user_id=v_auth
  LIMIT 1;

  IF v_usuario_id IS NULL OR v_tipo <> 'PDV'
     OR v_ativo IS NOT TRUE OR v_bloqueado IS TRUE THEN
    RAISE EXCEPTION 'Apenas um operador de PDV ativo pode cancelar vendas.';
  END IF;
  IF length(btrim(coalesce(p_motivo,''))) < 3 THEN
    RAISE EXCEPTION 'Informe o motivo do cancelamento.';
  END IF;

  SELECT c.id INTO v_caixa_id
  FROM public.erp_caixas c
  WHERE c.empresa_id=v_empresa_id AND c.pdv_id=v_pdv_id AND c.status='aberto'
  ORDER BY c.data_abertura DESC LIMIT 1 FOR UPDATE;
  IF v_caixa_id IS NULL THEN RAISE EXCEPTION 'Não existe caixa aberto para este PDV.'; END IF;

  SELECT v.* INTO v_venda
  FROM public.erp_vendas v
  WHERE v.id=p_venda_id
    AND v.empresa_id=v_empresa_id
    AND v.pdv_id=v_pdv_id
    AND v.status='FINALIZADA'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venda não encontrada neste PDV, já cancelada ou não finalizada.';
  END IF;

  IF v_venda.created_at < (
    SELECT c.data_abertura FROM public.erp_caixas c WHERE c.id=v_caixa_id
  ) THEN
    RAISE EXCEPTION 'Só é possível cancelar vendas realizadas durante o caixa aberto atual.';
  END IF;

  SELECT
    coalesce(bool_or(upper(coalesce(fp.tipo,''))='DINHEIRO'),false),
    coalesce(bool_or(upper(coalesce(fp.tipo,'')) IN ('CARTAO','CARD','DEBIT','CREDIT','CARTÃO')),false),
    coalesce(bool_or(upper(coalesce(fp.tipo,''))='PIX'),false),
    coalesce(bool_or(upper(coalesce(fp.tipo,'')) NOT IN ('DINHEIRO','CARTAO','CARD','DEBIT','CREDIT','CARTÃO','PIX')),false),
    coalesce(sum(vp.valor),0)
  INTO v_tem_dinheiro,v_tem_cartao,v_tem_pix,v_tem_outro,v_valor_pagamentos
  FROM public.erp_venda_pagamentos vp
  JOIN public.erp_formas_pagamento fp ON fp.id=vp.forma_pagamento_id
  WHERE vp.empresa_id=v_empresa_id AND vp.venda_id=v_venda.id;

  IF v_tem_pix THEN
    RAISE EXCEPTION 'Esta venda contém pagamento por Pix. O cancelamento pelo PDV não é permitido; trate o reembolso separadamente.';
  END IF;
  IF v_tem_dinheiro AND v_tem_cartao THEN
    RAISE EXCEPTION 'Venda com pagamentos divididos entre dinheiro e cartão não pode ser cancelada por esta rotina. Faça a conferência manual para evitar divergência.';
  END IF;
  IF v_tem_outro THEN
    RAISE EXCEPTION 'Esta venda utiliza outra forma de pagamento ou vale; o cancelamento direto não é permitido.';
  END IF;
  IF NOT v_tem_dinheiro AND NOT v_tem_cartao THEN
    RAISE EXCEPTION 'Forma de pagamento não suportada para cancelamento direto no PDV.';
  END IF;
  IF abs(coalesce(v_valor_pagamentos,0) - coalesce(v_venda.total,0)) > 0.01 THEN
    RAISE EXCEPTION 'O total dos pagamentos não confere com o total da venda. Faça a conferência manual antes de cancelar.';
  END IF;

  -- Restaurar estoque uma única vez dentro da mesma transação.
  FOR v_item IN
    SELECT vi.produto_id, sum(vi.quantidade)::numeric AS quantidade
    FROM public.erp_venda_itens vi
    WHERE vi.empresa_id=v_empresa_id AND vi.venda_id=v_venda.id
    GROUP BY vi.produto_id
  LOOP
    SELECT e.id INTO v_estoque_id
    FROM public.erp_estoques e
    WHERE e.empresa_id=v_empresa_id
      AND e.produto_id=v_item.produto_id
      AND e.pdv_id IS NULL
    FOR UPDATE;

    IF v_estoque_id IS NULL THEN
      INSERT INTO public.erp_estoques (empresa_id,produto_id,pdv_id,quantidade,atualizado_em)
      VALUES (v_empresa_id,v_item.produto_id,NULL,v_item.quantidade,now());
    ELSE
      UPDATE public.erp_estoques
      SET quantidade=coalesce(quantidade,0)+v_item.quantidade,
          atualizado_em=now()
      WHERE id=v_estoque_id;
    END IF;

    INSERT INTO public.erp_movimentacoes_estoque
      (empresa_id,produto_id,pdv_id,usuario_id,tipo,quantidade,observacao)
    VALUES
      (v_empresa_id,v_item.produto_id,v_pdv_id,v_usuario_id,'ENTRADA',
       v_item.quantidade,'Estorno de estoque por cancelamento da venda #'||coalesce(v_venda.numero::text,v_venda.id::text));
  END LOOP;

  -- Ajusta os totais acumulados do caixa para refletir o cancelamento.
  IF v_tem_dinheiro THEN
    UPDATE public.erp_caixas
    SET valor_dinheiro=greatest(0,coalesce(valor_dinheiro,0)-v_valor_pagamentos)
    WHERE id=v_caixa_id;
  ELSE
    UPDATE public.erp_caixas
    SET valor_cartao=greatest(0,coalesce(valor_cartao,0)-v_valor_pagamentos)
    WHERE id=v_caixa_id;
    v_estorno_pendente := true; -- o operador ainda deve estornar na maquininha
  END IF;

  UPDATE public.erp_vendas
  SET status='CANCELADA',
      cancelado_em=now(),
      cancelado_por=v_usuario_id,
      motivo_cancelamento=btrim(p_motivo),
      estorno_cartao_pendente=v_estorno_pendente
  WHERE id=v_venda.id AND empresa_id=v_empresa_id AND status='FINALIZADA';

  IF NOT FOUND THEN RAISE EXCEPTION 'A venda já foi alterada; nenhuma operação foi confirmada.'; END IF;

  RETURN jsonb_build_object(
    'sucesso',true,
    'venda_id',v_venda.id,
    'numero',v_venda.numero,
    'estorno_cartao_pendente',v_estorno_pendente,
    'mensagem',CASE WHEN v_tem_dinheiro
      THEN 'Venda cancelada e estoque restaurado. Devolva o dinheiro ao cliente e confira o caixa.'
      ELSE 'Venda cancelada e estoque restaurado. ATENÇÃO: realize o estorno na maquininha e confirme-o conforme o procedimento da operadora.'
    END
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.erp_cancelar_venda_pdv(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.erp_cancelar_venda_pdv(uuid,text) TO authenticated;
