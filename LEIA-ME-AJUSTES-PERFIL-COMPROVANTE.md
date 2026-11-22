RIVER TECH ERP + PDV — AJUSTES DE PERFIL E COMPROVANTE

Alterações nesta versão:
- Configurações da empresa: seletor de arquivo para logo PNG/JPG/JPEG (até 2 MB), com prévia.
- A logo das Configurações é usada no comprovante, separada da logo cadastral da empresa usada no dashboard.
- Comprovante não fiscal mais organizado, com nome de exibição, telefone, e-mail, endereço, logo e rodapé personalizados.
- Logo River Tech na tela de login do PDV.
- Ajuste do encaixe da logo River Tech na barra lateral do ERP e do Administrador Geral.
- Perfil clicável no canto inferior esquerdo tanto no dashboard do cliente quanto no Administrador Geral: foto, nome de exibição, telefone e e-mail.
- Detalhes básicos da empresa e observações passam a aparecer pela ação Gerenciar na lista administrativa.

IMPORTANTE:
- Os dados de configurações do comprovante continuam usando a tabela erp_configuracoes_empresa criada pela migração SQL já incluída no projeto.
- Os perfis personalizados (foto, nome de exibição, telefone e e-mail informativo) ficam salvos no armazenamento local do navegador/dispositivo. Não alteram credenciais nem permissões de autenticação. Para sincronizar o perfil entre dispositivos será necessária uma etapa futura com persistência no Supabase.
- Não foram alteradas as rotinas de vendas, pagamentos divididos, fechamento, sangria, cancelamentos, compras XML, estoque ou contas a pagar.
