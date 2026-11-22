-- River Tech ERP: configurações persistentes por empresa
-- Execute no SQL Editor do projeto Supabase do ERP/PDV.
create table if not exists public.erp_configuracoes_empresa (
  empresa_id uuid primary key references public.erp_empresas(id) on delete cascade,
  nome_exibicao text,
  cabecalho_comprovante text,
  telefone text,
  email_contato text,
  logo_url text,
  endereco text,
  rodape_comprovante text,
  updated_by uuid references public.erp_usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.erp_configuracoes_empresa add column if not exists cabecalho_comprovante text;
alter table public.erp_configuracoes_empresa enable row level security;
drop policy if exists erp_config_empresa_select_admin on public.erp_configuracoes_empresa;
create policy erp_config_empresa_select_admin on public.erp_configuracoes_empresa
for select to authenticated using (
  exists (select 1 from public.erp_usuarios u
          where u.auth_user_id = auth.uid()
            and u.empresa_id = erp_configuracoes_empresa.empresa_id
            and upper(u.tipo) in ('ADMIN_ERP','PDV')
            and u.ativo is true
            and coalesce(u.bloqueado,false) is false)
);
drop policy if exists erp_config_empresa_insert_admin on public.erp_configuracoes_empresa;
create policy erp_config_empresa_insert_admin on public.erp_configuracoes_empresa
for insert to authenticated with check (
  exists (select 1 from public.erp_usuarios u
          where u.auth_user_id = auth.uid()
            and u.empresa_id = erp_configuracoes_empresa.empresa_id
            and u.tipo = 'ADMIN_ERP' and u.ativo is true
            and coalesce(u.bloqueado,false) is false)
);
drop policy if exists erp_config_empresa_update_admin on public.erp_configuracoes_empresa;
create policy erp_config_empresa_update_admin on public.erp_configuracoes_empresa
for update to authenticated using (
  exists (select 1 from public.erp_usuarios u
          where u.auth_user_id = auth.uid()
            and u.empresa_id = erp_configuracoes_empresa.empresa_id
            and u.tipo = 'ADMIN_ERP' and u.ativo is true
            and coalesce(u.bloqueado,false) is false)
) with check (
  exists (select 1 from public.erp_usuarios u
          where u.auth_user_id = auth.uid()
            and u.empresa_id = erp_configuracoes_empresa.empresa_id
            and u.tipo = 'ADMIN_ERP' and u.ativo is true
            and coalesce(u.bloqueado,false) is false)
);
