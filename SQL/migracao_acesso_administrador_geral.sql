-- River Tech ERP
-- Libera leitura administrativa global para o Administrador Geral autenticado.
-- Execute SOMENTE no projeto Supabase do ERP/PDV.
-- Não desativa RLS e não concede acesso às contas de clientes.

DO $$
BEGIN
  IF to_regclass('public.erp_administradores_gerais') IS NULL THEN
    RAISE EXCEPTION 'Tabela public.erp_administradores_gerais não encontrada. Confira o projeto Supabase.';
  END IF;
  IF to_regclass('public.erp_empresas') IS NULL THEN
    RAISE EXCEPTION 'Tabela public.erp_empresas não encontrada. Confira o projeto Supabase.';
  END IF;
  IF to_regclass('public.erp_pdvs') IS NULL THEN
    RAISE EXCEPTION 'Tabela public.erp_pdvs não encontrada. Confira o projeto Supabase.';
  END IF;
  IF to_regclass('public.erp_modulos') IS NULL THEN
    RAISE EXCEPTION 'Tabela public.erp_modulos não encontrada. Confira o projeto Supabase.';
  END IF;
END $$;

-- Confirmação central: somente usuário autenticado cadastrado como
-- Administrador Geral e marcado como ativo.

DROP POLICY IF EXISTS erp_empresas_select_admin_geral ON public.erp_empresas;
CREATE POLICY erp_empresas_select_admin_geral
ON public.erp_empresas
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.erp_administradores_gerais ag
    WHERE ag.auth_user_id = auth.uid()
      AND ag.ativo IS TRUE
  )
);

DROP POLICY IF EXISTS erp_pdvs_select_admin_geral ON public.erp_pdvs;
CREATE POLICY erp_pdvs_select_admin_geral
ON public.erp_pdvs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.erp_administradores_gerais ag
    WHERE ag.auth_user_id = auth.uid()
      AND ag.ativo IS TRUE
  )
);

DROP POLICY IF EXISTS erp_modulos_select_admin_geral ON public.erp_modulos;
CREATE POLICY erp_modulos_select_admin_geral
ON public.erp_modulos
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.erp_administradores_gerais ag
    WHERE ag.auth_user_id = auth.uid()
      AND ag.ativo IS TRUE
  )
);

-- Verificação pós-execução: retorna as políticas administrativas criadas.
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname IN (
    'erp_empresas_select_admin_geral',
    'erp_pdvs_select_admin_geral',
    'erp_modulos_select_admin_geral'
  )
ORDER BY tablename;
