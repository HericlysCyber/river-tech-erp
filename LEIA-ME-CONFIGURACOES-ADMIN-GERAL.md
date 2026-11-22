RIVER TECH ERP — Configurações do Administrador Geral

1. Faça backup do ZIP atual antes de substituir arquivos.
2. Execute SQL/migracao_configuracoes_administrador_geral.sql no SQL Editor do projeto Supabase do ERP/PDV.
3. Publique/substitua admin.html e js/admin.js.
4. Reabra a página admin.html e faça recarga forçada (Ctrl+F5).
5. Entre em Configurações e selecione uma empresa.

IMPORTANTE: esta etapa registra as permissões dos módulos na tabela erp_empresa_modulos_admin e permite consultar os PDVs e alternar o campo bloqueado da empresa. Ela ainda não garante o bloqueio efetivo de cada módulo nas páginas/RPCs do ERP/PDV; cada módulo deve consultar essa tabela no servidor antes de permitir operações. A tela também não altera plano, datas contratuais ou senha, para evitar gravar em colunas/fluxos de autenticação sem validação do esquema existente.

## Etapa seguinte — contratos, planos, redefinição e bloqueio individual de PDVs
1. Execute `SQL/migracao_contratos_bloqueio_pdvs_admin.sql` no projeto Supabase do ERP/PDV.
2. Publique os arquivos `admin.html` e `js/admin.js` atualizados.
3. Em Configurações, selecione uma empresa, escolha plano, limite de PDVs e datas contratuais e salve.
4. Na lista de PDVs, use Bloquear/Desbloquear para alterar o campo `erp_pdvs.bloqueado`.
5. Use “Enviar redefinição de senha” para enviar o fluxo padrão do Supabase ao e-mail associado à empresa. A URL de redirecionamento e o template de e-mail precisam estar configurados no Supabase Auth.

Atenção: esta etapa salva as datas contratuais, mas a aplicação automática do vencimento em todos os pontos de entrada e nas RPCs de operação ainda precisa ser conectada e validada antes de usar vencimento como mecanismo de bloqueio. Da mesma forma, a tabela de permissões por módulo precisa ser consultada por cada página e operação/RPC; gravar a permissão por si só não bloqueia o módulo.
