# River Tech ERP + PDV — atualização de 27/10/2026

## Alterações preparadas sobre o projeto recebido

- Mantida a autenticação atual por e-mail e senha. Nenhuma alteração no login Supabase.
- Tela inicial do ERP agora usa `assets/logo.png` em vez do quadrado com a letra “R”.
- Corrigidos os nomes de coluna usados no relatório de estoque (`atualizado_em`) e removido o campo `categoria` inexistente do relatório financeiro.
- Relatórios passam a mostrar nomes de produtos, fornecedores e PDVs em vez de vários UUIDs.
- Resumo de valores dos relatórios não soma vendas com status `CANCELADA`/`CANCELADO`.
- Criada tela de Configurações da empresa para nome de exibição, telefone, e-mail de contato, URL da logo, endereço e rodapé de comprovantes.
- Adicionado ao PDV o comando “Cancelar venda”. A regra é validada pelo RPC no banco: dinheiro pode ser cancelado e exige devolução física pelo operador; cartão fica sinalizado para estorno manual na maquininha; Pix, pagamento misto, vale e outras formas são recusados por segurança. O motivo fica registrado e o estoque é restaurado na mesma transação.
- Ao fechar o caixa, o sistema prepara um relatório imprimível (impressora ou salvar como PDF).
- O módulo de devoluções já tinha consulta e reimpressão de vales; a funcionalidade existente foi preservada para imprimir o vale emitido sem gerar outro.

## SQL necessário

No projeto Supabase usado pelo ERP/PDV, revisar e executar no SQL Editor, nesta ordem:

1. `SQL/migracao_configuracoes_empresa.sql`
2. `SQL/migracao_relatorios.sql`
3. `SQL/migracao_cancelamento_venda_pdv.sql`

Faça backup antes de executar os scripts. A função de cancelamento é uma operação financeira/estoque e deve ser testada primeiro com vendas fictícias de dinheiro, cartão e Pix. O sistema **não** realiza estorno bancário ou na maquininha; para cartão, o operador ainda precisa fazer o estorno externo. Vendas Pix não são canceladas pela rotina.

## Validação realizada neste pacote

- Verificada a estrutura do ZIP e os arquivos alterados.
- Executada verificação sintática de JavaScript (`node --check`) nos arquivos JS modificados.
- Não foi possível testar contra o banco Supabase real nem confirmar as políticas e constraints específicas do ambiente remoto. Por isso, execute os scripts em ambiente de teste/backup e valide os cenários antes de usar em produção.

### Ajuste adicional — relatório de fechamento de caixa
- O relatório impresso agora apresenta uma seção de recolhimentos/sangrias, com total e detalhes (valor, data e motivo).
- A consulta de cancelamentos passou a considerar a data do cancelamento (`cancelado_em`), e não a data original da venda, para incluir vendas canceladas durante o caixa mesmo quando a venda foi criada antes do horário de abertura registrado.
- Para mostrar os detalhes de recolhimento, execute também `SQL/migracao_relatorio_recolhimentos_fechamento.sql` no SQL Editor do Supabase do ERP/PDV.
