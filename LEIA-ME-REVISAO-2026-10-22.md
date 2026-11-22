# River Tech ERP + PDV — revisão de produtividade e importação XML

## Alterações desta revisão

- O carrinho do PDV recebeu mais espaço na tela desktop.
- O vale-crédito foi movido para uma aba superior própria. O processo de consulta/resgate existente foi mantido, sem trocar os RPCs de validação e consumo.
- Foi criada uma aba de consulta de preços somente leitura, pesquisando código, código de barras e descrição, mostrando preço vigente, oferta ativa quando disponível e saldo do estoque central quando a política do banco permite a consulta. A consulta não adiciona itens ao carrinho.
- O módulo Compras recebeu importação assistida de XML de NF-e: lê emitente, CNPJ, número/série, data, chave de acesso, itens e totais; tenta localizar fornecedor por documento/nome e produto por GTIN/código; itens sem correspondência ficam destacados para associação manual.
- A importação preenche o formulário como rascunho. Não faz entrada automática no estoque. O operador precisa revisar os dados e usar o fluxo de recebimento já existente.
- Foi adicionada uma verificação de reimportação pela chave de acesso guardada nas observações e, como segunda proteção, por fornecedor + número/série.

## Limitações importantes

Esta revisão não altera funções SQL de finalização de venda nem políticas RLS. Portanto, ainda não implementa pagamentos divididos, sangria, cancelamento de cupom, reimpressão do histórico de vendas ou integração fiscal. Essas funções dependem de revisar as definições atuais dos RPCs/tabelas do projeto Supabase, para não duplicar movimentos de caixa, estornar estoque incorretamente ou consumir vales duas vezes.

A consulta de preços é somente leitura; se a política RLS não permitir ler `erp_estoques` ou `erp_ofertas` pelo usuário PDV, os dados indisponíveis aparecerão sem esses complementos, sem impedir a consulta básica do produto.

A NF-e importada é apenas um XML fornecido pelo usuário. Esta alteração não consulta a SEFAZ nem emite NFC-e.

## Validação feita no pacote

- Verificação sintática de `js/compras.js` e `PDV/painel.js` com `node --check`.
- Não foi feita conexão ao Supabase real nem teste de venda/recebimento contra dados de produção.

## Para concluir as funções financeiras com segurança

No SQL Editor do Supabase, execute a consulta abaixo e envie os resultados completos. Ela só lê definições de funções e não altera dados:

```sql
SELECT
  p.oid::regprocedure AS assinatura,
  pg_get_functiondef(p.oid) AS definicao
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'erp_finalizar_venda',
    'erp_finalizar_venda_com_vale',
    'erp_fechar_caixa'
  )
ORDER BY p.proname, p.oid::regprocedure::text;
```

Isso permite desenhar a extensão de pagamentos e estornos com os mesmos campos e regras que o projeto já usa.
