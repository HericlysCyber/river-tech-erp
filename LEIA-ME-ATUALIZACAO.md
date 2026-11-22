# River Tech ERP + PDV — atualização complementar

## O que foi incluído

- Dashboard: total vendido no dia, quantidade de vendas, ticket médio, horário da última venda e lista das vendas recentes da empresa conectada.
- Clientes: cadastro por loja com nome completo, CPF, nascimento, telefone e endereço; validação do CPF e busca sem duplicar o cadastro.
- PDV: nova aba “Identificar cliente por CPF” dentro da tela de venda, com validação do CPF, busca restrita à loja atual, exibição dos dados do cadastro e associação do cliente à venda pela tabela `erp_venda_clientes` quando o retorno do RPC disponibiliza o identificador da venda.
- Relatórios: área central com filtros de período/texto, pré-visualização, impressão e exportação CSV (abre no Excel/LibreOffice). Inclui vendas, itens vendidos, pagamentos, produtos/preços, estoque/valoração, estoque baixo/zerado, movimentos de estoque, compras e itens de compra, clientes, financeiro, movimentos de caixa, histórico de preços, margem realizada e ofertas.
- Precificação: análise de custo, preço, lucro unitário, margem e markup; margem ponderada do conjunto; atualização imediata e agendamento por data/hora; margem realizada separada, baseada no custo histórico quando disponível.
- Ofertas: preço promocional separado do preço-base, com início/fim, observação e cancelamento.
- Etiquetas: busca por nome/código/barras, quantidade, pré-visualização e impressão de etiquetas normais e promocionais, com identidade visual da loja, preço, validade da oferta, data de emissão e código de barras Code 128 quando a biblioteca de impressão estiver disponível.
- O PDV consulta o banco Supabase e revalida os preços antes de concluir a venda. Não foi acrescentado modo offline; as operações dependem da conexão já usada pelo projeto.

## Ordem de implantação

1. Faça uma cópia de segurança do projeto e do banco Supabase.
2. Abra o arquivo `migracao_clientes_precificacao_ofertas.sql` no Supabase SQL Editor e execute o script inteiro no projeto correto.
3. Se o Supabase retornar erro, pare e envie a mensagem completa antes de executar correções avulsas. O script foi escrito para preservar registros existentes e criar apenas estruturas complementares.
4. Publique os arquivos deste ZIP no mesmo local onde o ERP está hospedado, substituindo os arquivos antigos pelos correspondentes desta versão. Não apague arquivos de configuração que estejam fora do ZIP.
5. Entre com um usuário `ADMIN_ERP` e valide, nesta ordem: dashboard; cadastro de um cliente de teste; busca do CPF no PDV; precificação imediata; preço agendado; oferta com início/fim de teste; impressão de uma etiqueta; relatórios.

## Observações importantes

- O custo histórico passa a ser registrado para os novos itens de venda após a migração. Não é possível reconstruir com precisão o custo histórico de vendas antigas que não gravaram esse dado.
- Preços agendados e ofertas são aplicados quando a função do banco é chamada pelo ERP/PDV; o PDV chama essa função ao carregar produtos e antes de concluir a venda. Assim, a venda deve usar o preço vigente mesmo se a tela do caixa ficou aberta. A atualização física do campo de preço no banco ocorre na próxima chamada da função, não por um cron independente.
- O tamanho final da etiqueta depende do modelo da impressora e da medida do rolo/etiqueta. O layout inicial pode ser ajustado depois que a medida exata for informada.
- A validação feita nesta entrega foi estática (referências locais e sintaxe JavaScript). Não houve conexão direta ao banco de produção para executar consultas reais nem impressão física; a validação funcional final depende da execução do SQL e do teste no ambiente Supabase do projeto.
