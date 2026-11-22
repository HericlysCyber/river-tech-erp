-- River Tech ERP | Configurações administrativas por empresa
-- Execute somente no projeto Supabase do ERP/PDV.
-- Registra as permissões configuradas pelo Administrador Geral.
-- Este registro não substitui a validação de permissão nas páginas/RPCs dos módulos.
CREATE TABLE IF NOT EXISTS public.erp_empresa_modulos_admin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.erp_empresas(id) ON DELETE CASCADE,
  modulo_codigo text NOT NULL CHECK (modulo_codigo IN ('PDV','PRODUTOS','ESTOQUE','CLIENTES','FINANCEIRO','RELATORIOS')),
  liberado boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL,
  UNIQUE (empresa_id, modulo_codigo)
);
ALTER TABLE public.erp_empresa_modulos_admin ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS erp_empresa_modulos_admin_select_admin_geral ON public.erp_empresa_modulos_admin;
CREATE POLICY erp_empresa_modulos_admin_select_admin_geral ON public.erp_empresa_modulos_admin
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.erp_administradores_gerais ag WHERE ag.auth_user_id=auth.uid() AND ag.ativo IS TRUE));
DROP POLICY IF EXISTS erp_empresa_modulos_admin_insert_admin_geral ON public.erp_empresa_modulos_admin;
CREATE POLICY erp_empresa_modulos_admin_insert_admin_geral ON public.erp_empresa_modulos_admin
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.erp_administradores_gerais ag WHERE ag.auth_user_id=auth.uid() AND ag.ativo IS TRUE));
DROP POLICY IF EXISTS erp_empresa_modulos_admin_update_admin_geral ON public.erp_empresa_modulos_admin;
CREATE POLICY erp_empresa_modulos_admin_update_admin_geral ON public.erp_empresa_modulos_admin
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.erp_administradores_gerais ag WHERE ag.auth_user_id=auth.uid() AND ag.ativo IS TRUE)) WITH CHECK (EXISTS (SELECT 1 FROM public.erp_administradores_gerais ag WHERE ag.auth_user_id=auth.uid() AND ag.ativo IS TRUE));
GRANT SELECT, INSERT, UPDATE ON public.erp_empresa_modulos_admin TO authenticated;
SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='erp_empresa_modulos_admin' ORDER BY policyname;
