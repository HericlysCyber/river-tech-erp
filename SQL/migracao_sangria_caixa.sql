-- River Tech ERP/PDV — Sangria e recolhimento de caixa
-- Migração aditiva. Execute no Supabase SQL Editor após backup.
BEGIN;

CREATE TABLE IF NOT EXISTS public.erp_caixa_sangrias (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_id text NOT NULL UNIQUE,
    caixa_id bigint NOT NULL REFERENCES public.erp_caixas(id),
    empresa_id uuid NOT NULL,
    pdv_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    valor numeric(12,2) NOT NULL CHECK (valor > 0),
    motivo text NOT NULL CHECK (length(trim(motivo)) > 0),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_erp_caixa_sangrias_caixa
    ON public.erp_caixa_sangrias (caixa_id, created_at);
ALTER TABLE public.erp_caixa_sangrias ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.erp_caixa_sangrias FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.erp_resumo_sangrias_caixa()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_auth uuid; v_empresa uuid; v_pdv uuid; v_caixa public.erp_caixas%ROWTYPE; v_total numeric(12,2);
BEGIN
  v_auth := auth.uid();
  IF v_auth IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado.'; END IF;
  SELECT empresa_id, pdv_id INTO v_empresa, v_pdv FROM public.erp_usuarios
   WHERE auth_user_id=v_auth AND tipo='PDV' AND ativo=true AND COALESCE(bloqueado,false)=false LIMIT 1;
  IF v_empresa IS NULL OR v_pdv IS NULL THEN RAISE EXCEPTION 'Operador sem autorização para consultar sangrias.'; END IF;
  SELECT * INTO v_caixa FROM public.erp_caixas WHERE empresa_id=v_empresa AND pdv_id=v_pdv AND status='aberto' ORDER BY data_abertura DESC LIMIT 1;
  IF v_caixa.id IS NULL THEN RETURN jsonb_build_object('total_sangrias',0); END IF;
  SELECT COALESCE(sum(valor),0) INTO v_total FROM public.erp_caixa_sangrias WHERE caixa_id=v_caixa.id AND empresa_id=v_empresa;
  RETURN jsonb_build_object('caixa_id',v_caixa.id,'total_sangrias',v_total);
END; $function$;

CREATE OR REPLACE FUNCTION public.erp_registrar_sangria(
 p_valor numeric, p_motivo text, p_solicitacao_id text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_auth uuid; v_usuario uuid; v_empresa uuid; v_pdv uuid; v_tipo text; v_ativo boolean; v_bloqueado boolean;
 v_caixa public.erp_caixas%ROWTYPE; v_sangrias numeric(12,2); v_disponivel numeric(12,2); v_id uuid; v_data timestamptz;
BEGIN
 v_auth := auth.uid();
 IF v_auth IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado.'; END IF;
 SELECT id,empresa_id,pdv_id,tipo,ativo,bloqueado INTO v_usuario,v_empresa,v_pdv,v_tipo,v_ativo,v_bloqueado
 FROM public.erp_usuarios WHERE auth_user_id=v_auth LIMIT 1;
 IF v_usuario IS NULL OR v_tipo <> 'PDV' OR COALESCE(v_ativo,false)=false OR COALESCE(v_bloqueado,false)=true THEN RAISE EXCEPTION 'Operador sem autorização para registrar sangria.'; END IF;
 IF p_valor IS NULL OR p_valor <= 0 THEN RAISE EXCEPTION 'Informe um valor de sangria maior que zero.'; END IF;
 IF NULLIF(trim(p_motivo),'') IS NULL THEN RAISE EXCEPTION 'Informe o motivo da sangria.'; END IF;
 IF NULLIF(trim(p_solicitacao_id),'') IS NULL THEN RAISE EXCEPTION 'Identificador da solicitação ausente.'; END IF;
 -- Retentativas com o mesmo identificador retornam o mesmo registro, sem duplicar retirada.
 SELECT id,created_at INTO v_id,v_data FROM public.erp_caixa_sangrias WHERE solicitacao_id=p_solicitacao_id;
 IF v_id IS NOT NULL THEN RETURN jsonb_build_object('sucesso',true,'sangria_id',v_id,'criado_em',v_data,'mensagem','Sangria já registrada nesta solicitação.'); END IF;
 SELECT * INTO v_caixa FROM public.erp_caixas WHERE empresa_id=v_empresa AND pdv_id=v_pdv AND status='aberto' ORDER BY data_abertura DESC LIMIT 1 FOR UPDATE;
 IF v_caixa.id IS NULL THEN RAISE EXCEPTION 'Não existe caixa aberto para este PDV.'; END IF;
 SELECT COALESCE(sum(valor),0) INTO v_sangrias FROM public.erp_caixa_sangrias WHERE caixa_id=v_caixa.id;
 v_disponivel := COALESCE(v_caixa.valor_inicial,0)+COALESCE(v_caixa.valor_dinheiro,0)-v_sangrias;
 IF p_valor > v_disponivel THEN RAISE EXCEPTION 'Valor da sangria excede o dinheiro disponível (%).', v_disponivel; END IF;
 INSERT INTO public.erp_caixa_sangrias(solicitacao_id,caixa_id,empresa_id,pdv_id,usuario_id,valor,motivo)
 VALUES(p_solicitacao_id,v_caixa.id,v_empresa,v_pdv,v_usuario,round(p_valor,2),trim(p_motivo))
 RETURNING id,created_at INTO v_id,v_data;
 RETURN jsonb_build_object('sucesso',true,'sangria_id',v_id,'caixa_id',v_caixa.id,'valor',round(p_valor,2),'criado_em',v_data,'dinheiro_disponivel_apos',v_disponivel-round(p_valor,2),'mensagem','Sangria registrada com sucesso.');
END; $function$;

-- Atualiza a rotina de fechamento: o dinheiro esperado passa a descontar as sangrias registradas.
CREATE OR REPLACE FUNCTION public.erp_fechar_caixa(p_valor_contado_dinheiro numeric, p_observacao text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
 v_auth_id uuid; v_usuario_id uuid; v_empresa_id uuid; v_pdv_id uuid; v_tipo text; v_ativo boolean; v_bloqueado boolean;
 v_caixa public.erp_caixas%ROWTYPE; v_dinheiro_esperado numeric; v_diferenca numeric; v_total_sangrias numeric;
BEGIN
 v_auth_id := auth.uid();
 IF v_auth_id IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado.'; END IF;
 SELECT id,empresa_id,pdv_id,tipo,ativo,bloqueado INTO v_usuario_id,v_empresa_id,v_pdv_id,v_tipo,v_ativo,v_bloqueado
 FROM public.erp_usuarios WHERE auth_user_id=v_auth_id LIMIT 1;
 IF v_usuario_id IS NULL THEN RAISE EXCEPTION 'Usuário não cadastrado no ERP.'; END IF;
 IF v_tipo <> 'PDV' OR COALESCE(v_ativo,false)=false OR COALESCE(v_bloqueado,false)=true THEN RAISE EXCEPTION 'Operador sem autorização para fechar o caixa.'; END IF;
 IF v_empresa_id IS NULL OR v_pdv_id IS NULL THEN RAISE EXCEPTION 'Operador sem empresa ou PDV vinculado.'; END IF;
 IF p_valor_contado_dinheiro IS NULL OR p_valor_contado_dinheiro < 0 THEN RAISE EXCEPTION 'Informe um valor contado válido.'; END IF;
 SELECT * INTO v_caixa FROM public.erp_caixas WHERE empresa_id=v_empresa_id AND pdv_id=v_pdv_id AND status='aberto' ORDER BY data_abertura DESC LIMIT 1 FOR UPDATE;
 IF v_caixa.id IS NULL THEN RAISE EXCEPTION 'Não existe caixa aberto para este PDV.'; END IF;
 SELECT COALESCE(sum(valor),0) INTO v_total_sangrias FROM public.erp_caixa_sangrias WHERE caixa_id=v_caixa.id AND empresa_id=v_empresa_id;
 v_dinheiro_esperado := COALESCE(v_caixa.valor_inicial,0)+COALESCE(v_caixa.valor_dinheiro,0)-v_total_sangrias;
 v_diferenca := p_valor_contado_dinheiro-v_dinheiro_esperado;
 UPDATE public.erp_caixas SET valor_contado_dinheiro=p_valor_contado_dinheiro,diferenca_caixa=v_diferenca,fechado_por_usuario_id=v_usuario_id,data_fechamento=now(),status='fechado',
 observacao=CASE WHEN NULLIF(TRIM(p_observacao),'') IS NOT NULL THEN p_observacao ELSE observacao END
 WHERE id=v_caixa.id AND status='aberto';
 IF NOT FOUND THEN RAISE EXCEPTION 'O caixa já foi fechado.'; END IF;
 RETURN jsonb_build_object('sucesso',true,'caixa_id',v_caixa.id,'empresa_id',v_empresa_id,'pdv_id',v_pdv_id,'valor_inicial',v_caixa.valor_inicial,'total_dinheiro',v_caixa.valor_dinheiro,'total_pix',v_caixa.valor_pix,'total_cartao',v_caixa.valor_cartao,'total_outros',v_caixa.valor_outros,'total_sangrias',v_total_sangrias,'dinheiro_esperado',v_dinheiro_esperado,'dinheiro_contado',p_valor_contado_dinheiro,'diferenca',v_diferenca,'data_fechamento',now(),'mensagem','Caixa fechado com sucesso.');
END; $function$;

GRANT EXECUTE ON FUNCTION public.erp_resumo_sangrias_caixa() TO authenticated;
GRANT EXECUTE ON FUNCTION public.erp_registrar_sangria(numeric,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.erp_fechar_caixa(numeric,text) TO authenticated;
COMMIT;
