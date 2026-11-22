-- River Tech ERP/PDV — Detalhamento de recolhimentos no relatório de fechamento
-- Migração aditiva. Execute no SQL Editor do Supabase do ERP/PDV.
CREATE OR REPLACE FUNCTION public.erp_relatorio_sangrias_caixa(p_caixa_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_auth uuid;
  v_empresa uuid;
  v_pdv uuid;
  v_total numeric(12,2);
  v_itens jsonb;
BEGIN
  v_auth := auth.uid();
  IF v_auth IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  SELECT empresa_id, pdv_id
    INTO v_empresa, v_pdv
    FROM public.erp_usuarios
   WHERE auth_user_id = v_auth
     AND tipo = 'PDV'
     AND ativo = true
     AND COALESCE(bloqueado, false) = false
   LIMIT 1;

  IF v_empresa IS NULL OR v_pdv IS NULL THEN
    RAISE EXCEPTION 'Operador sem autorização para consultar recolhimentos.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.erp_caixas c
     WHERE c.id = p_caixa_id
       AND c.empresa_id = v_empresa
       AND c.pdv_id = v_pdv
       AND c.status = 'fechado'
  ) THEN
    RAISE EXCEPTION 'Caixa fechado não encontrado ou sem permissão.';
  END IF;

  SELECT COALESCE(sum(s.valor), 0),
         COALESCE(jsonb_agg(jsonb_build_object(
           'id', s.id,
           'valor', s.valor,
           'motivo', s.motivo,
           'created_at', s.created_at
         ) ORDER BY s.created_at), '[]'::jsonb)
    INTO v_total, v_itens
    FROM public.erp_caixa_sangrias s
   WHERE s.caixa_id = p_caixa_id
     AND s.empresa_id = v_empresa
     AND s.pdv_id = v_pdv;

  RETURN jsonb_build_object('caixa_id', p_caixa_id, 'total_sangrias', v_total, 'sangrias', v_itens);
END;
$function$;

REVOKE ALL ON FUNCTION public.erp_relatorio_sangrias_caixa(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.erp_relatorio_sangrias_caixa(bigint) TO authenticated;
