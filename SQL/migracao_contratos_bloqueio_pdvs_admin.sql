-- River Tech ERP | Contratos, planos e bloqueio de PDVs pelo Administrador Geral
-- Execute somente no Supabase do ERP/PDV, após a migração de acesso do Administrador Geral.
-- Idempotente: adiciona apenas colunas ausentes.
ALTER TABLE public.erp_empresas ADD COLUMN IF NOT EXISTS data_inicio_contrato date;
ALTER TABLE public.erp_empresas ADD COLUMN IF NOT EXISTS data_fim_contrato date;
ALTER TABLE public.erp_empresas ADD COLUMN IF NOT EXISTS plano text NOT NULL DEFAULT 'BASICO';
ALTER TABLE public.erp_empresas ADD COLUMN IF NOT EXISTS limite_pdvs integer NOT NULL DEFAULT 1;
ALTER TABLE public.erp_pdvs ADD COLUMN IF NOT EXISTS bloqueado boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='erp_empresas_plano_validacao') THEN
    ALTER TABLE public.erp_empresas ADD CONSTRAINT erp_empresas_plano_validacao CHECK (plano IN ('BASICO','PROFISSIONAL','PREMIUM'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='erp_empresas_limite_pdvs_positivo') THEN
    ALTER TABLE public.erp_empresas ADD CONSTRAINT erp_empresas_limite_pdvs_positivo CHECK (limite_pdvs >= 1);
  END IF;
END $$;

ALTER TABLE public.erp_pdvs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS erp_pdvs_admin_geral_update ON public.erp_pdvs;
CREATE POLICY erp_pdvs_admin_geral_update ON public.erp_pdvs
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.erp_administradores_gerais ag WHERE ag.auth_user_id=auth.uid() AND ag.ativo IS TRUE))
WITH CHECK (EXISTS (SELECT 1 FROM public.erp_administradores_gerais ag WHERE ag.auth_user_id=auth.uid() AND ag.ativo IS TRUE));
GRANT UPDATE (bloqueado) ON public.erp_pdvs TO authenticated;

-- Verificação da migração
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name='erp_empresas'
AND column_name IN ('plano','limite_pdvs','data_inicio_contrato','data_fim_contrato') ORDER BY column_name;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name='erp_pdvs' AND column_name='bloqueado';
