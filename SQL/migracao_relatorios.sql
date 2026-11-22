-- River Tech ERP — correções de leitura dos relatórios
-- 1) Permite que o administrador da empresa consulte itens de compras já recebidas.
--    A política antiga limitava SELECT a compras em RASCUNHO, deixando o relatório vazio.
-- 2) Não altera permissões de INSERT/UPDATE/DELETE do fluxo de compras.
ALTER TABLE public.erp_compra_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS erp_compra_itens_select_empresa_relatorios ON public.erp_compra_itens;
CREATE POLICY erp_compra_itens_select_empresa_relatorios
ON public.erp_compra_itens
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.erp_compras c
    JOIN public.erp_usuarios u ON u.empresa_id = c.empresa_id
    WHERE c.id = erp_compra_itens.compra_id
      AND u.auth_user_id = auth.uid()
      AND u.tipo = 'ADMIN_ERP'
      AND u.ativo IS TRUE
      AND COALESCE(u.bloqueado, false) IS FALSE
  )
);
