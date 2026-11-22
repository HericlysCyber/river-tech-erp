RIVER TECH ERP — RELATÓRIO DE PRODUTOS SEM VENDAS

Esta atualização acrescenta à Central de Relatórios o relatório “Produtos sem vendas / inativos”.

Filtros disponíveis:
- Inatividade de 15, 20, 30, 60 ou 90 dias;
- Período personalizado (data inicial e final);
- Categoria;
- Situação do estoque: todos, com estoque, sem estoque (zero ou negativo).

Colunas apresentadas:
- Código e produto;
- Categoria;
- Estoque geral atual;
- Data da última venda;
- Dias sem venda (ou “Nunca vendido”);
- Custo unitário e preço de venda;
- Valor em estoque calculado pelo custo;
- Situação da venda no período.

Regras:
- Vendas canceladas e rascunhos não contam como vendas.
- O estoque é lido do estoque geral da empresa (erp_estoques com pdv_id nulo), seguindo a estrutura atual do projeto.
- O período personalizado lista produtos sem venda dentro do intervalo informado e mantém a data da última venda histórica para distinção entre nunca vendidos e sem venda no período.
- Não foi incluído SQL novo: o relatório usa as tabelas existentes e as permissões/RLS já configuradas.

Limitação identificada na base recebida:
- O cadastro atual de produtos possui categoria_id e a tabela erp_categorias, mas não foi encontrada estrutura de departamentos. Por isso, o filtro de categoria está implementado e o filtro de departamento fica pendente até existir/ser confirmada a tabela ou coluna correta. Nenhuma estrutura foi inventada nesta atualização.

Preservação:
- Não foram alteradas rotinas SQL de venda, pagamentos, vale ou movimentação de estoque.
- Não foram alterados logotipos, identidade visual, acesso administrativo ou regras de contrato.
