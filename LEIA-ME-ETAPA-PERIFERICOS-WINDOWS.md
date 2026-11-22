# River Tech PDV — etapa inicial de periféricos Windows

Esta entrega inclui:

1. Exibição separada do subtotal acumulado no carrinho. O cálculo usa a soma de preço unitário × quantidade de todos os itens; o cartão de último item permanece individual.
2. Estrutura inicial do River Tech Print Bridge para Windows, com verificação de serviço, listagem de impressoras instaladas e envio de dados RAW para fila de impressão.
3. Documentação dos perfis previstos: térmica 80 mm (padrão), 58 mm (alternativa), impressora convencional A4 e etiquetas configuráveis.

## Atenção
O Print Bridge é um protótipo técnico inicial, ainda não integrado ao botão de impressão do PDV e ainda não validado em impressora física. Não instalar em computadores de clientes nesta fase. O ambiente de trabalho não possui .NET SDK, portanto não foi possível compilar o projeto C# aqui. A próxima validação deve ser feita em Windows 10/11 com .NET 8 SDK e uma impressora instalada.

O fluxo de venda, pagamentos, estoque e fechamento não foi intencionalmente alterado.
