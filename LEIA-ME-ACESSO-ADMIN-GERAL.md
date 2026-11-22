# Correção de leitura do Administrador Geral

O aviso `Tracking Prevention blocked access to storage` do navegador é referente ao armazenamento de terceiros do CDN e não confirma falha do Supabase.

O dashboard usa consultas diretas às tabelas `erp_empresas`, `erp_pdvs` e `erp_modulos`. Quando o RLS oculta linhas para o Administrador Geral, as consultas podem retornar listas/contagens vazias, resultando em zeros sem um erro visível na tela.

## Aplicação

1. Faça backup/garanta que está no projeto Supabase correto do River Tech ERP/PDV.
2. Abra SQL Editor.
3. Execute `SQL/migracao_acesso_administrador_geral.sql`.
4. Confira se a consulta final retorna as três políticas.
5. Saia e entre novamente no Administrador Geral e atualize com Ctrl+F5.

A migração não desativa RLS. Ela cria políticas SELECT para as três tabelas, condicionadas à existência de um registro ativo em `erp_administradores_gerais` cujo `auth_user_id` seja o usuário autenticado.

## Limite desta correção

Esta migração resolve a permissão de leitura necessária ao dashboard e à listagem básica. Ela NÃO implementa, por si só, edição de empresas, bloqueio/desbloqueio, liberação de módulos, alteração de plano ou redefinição de senha. Esses fluxos precisam ser implementados e protegidos separadamente, preferencialmente por RPCs SECURITY DEFINER com validação explícita do Administrador Geral.
