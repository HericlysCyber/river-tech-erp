# River Tech ERP — Reorganização do menu e favicon

Esta atualização parte do pacote validado `River_Tech_ERP_relatorio_produtos_sem_vendas.zip`.

## Alterações
- Etiquetas foi colocado imediatamente abaixo de Estoque no menu principal do ERP e nas barras laterais de Estoque e Produtos.
- Compras, Precificação e Ofertas foram agrupados sob a seção Comercial no menu principal.
- Clientes passou a ter seção própria de Relacionamento.
- Relatórios permanece como módulo independente na Administração.
- A navegação dos módulos comerciais foi organizada para manter Compras, Precificação e Ofertas juntas, com Etiquetas, Relatórios e Clientes como acessos independentes.
- Foi adicionado favicon PNG reutilizando `assets/logo.png` nas páginas HTML do ERP e do PDV. A arte da marca e os logotipos exibidos nas páginas não foram alterados.

## Preservação
Nenhuma função SQL, rotina de venda, pagamento, vale, estoque, contrato, configuração administrativa ou arquivo de identidade visual foi substituído. O favicon apenas referencia o logo River Tech já existente.

## Aplicação
Faça backup da pasta atual e substitua os arquivos pelos desta versão, mantendo a estrutura de diretórios. Não há migração SQL para esta atualização.
