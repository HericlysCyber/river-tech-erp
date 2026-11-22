# River Tech ERP/PDV — revisão da etapa 1

## Alterações desta etapa
- Mantida a interface existente e as funções já integradas de cliente e vale-crédito.
- Formas de pagamento passam a aparecer como cartões clicáveis, usando as formas ativas cadastradas em `erp_formas_pagamento`.
- Ao selecionar uma forma identificada como dinheiro, aparece o campo de valor recebido e o cálculo de troco; a finalização bloqueia valor recebido inferior ao devido.
- Após a confirmação da venda pelo servidor, o operador pode abrir e imprimir um comprovante **não fiscal** com itens, valores, número da venda e pagamento. Para impressão, o navegador precisa permitir pop-ups.
- O comprovante é gerado apenas após o RPC confirmar sucesso; não altera estoque, caixa nem pagamentos.

## Limitações que continuam pendentes
- **Pagamento dividido entre várias formas:** não habilitado nesta etapa. O RPC atual `erp_finalizar_venda` aceita uma única forma de pagamento; precisamos preparar e validar uma função SQL complementar sem quebrar `erp_finalizar_venda_com_vale`.
- **Sangria/recolhimento de caixa:** ainda não implementado.
- **Cancelamento/estorno de venda:** ainda não implementado; requer função transacional no banco para reverter estoque, pagamentos e caixa uma única vez.
- **Reimpressão pelo histórico:** ainda precisa ser ligada aos dados persistidos da venda.
- **Teste real Supabase/navegador:** não executado neste ambiente. Foi feita verificação sintática do JavaScript com `node --check`.

## SQL
Não é necessário executar SQL para os recursos de interface desta etapa. Não execute scripts antigos ou improvisados para pagamento dividido, sangria ou cancelamento; eles precisam de migração específica e validação com as funções atuais.

## Teste manual recomendado
1. Abra o PDV com um caixa de teste e inicie uma venda de baixo valor.
2. Selecione a forma cadastrada como dinheiro.
3. Digite um valor recebido maior que o total e confira o troco.
4. Digite valor menor que o devido e confirme que o botão fica bloqueado ou a finalização é impedida.
5. Finalize uma venda de teste e aceite imprimir; confira itens, total e troco.
6. Repita com vale-crédito e confirme que o fluxo existente continua funcionando.
