-- River Tech ERP / PDV
-- Nova RPC aditiva para vendas com pagamentos divididos.
-- Não substitui erp_finalizar_venda nem erp_finalizar_venda_com_vale.
-- Executar no SQL Editor do Supabase após revisar/guardar backup.
-- Metadados opcionais para identificar transações com cartão.
ALTER TABLE public.erp_venda_pagamentos
    ADD COLUMN IF NOT EXISTS cartao_bandeira text,
    ADD COLUMN IF NOT EXISTS cartao_modalidade text,
    ADD COLUMN IF NOT EXISTS cartao_parcelas integer,
    ADD COLUMN IF NOT EXISTS cartao_ns text;

CREATE OR REPLACE FUNCTION public.erp_finalizar_venda_pagamento_dividido(
    p_itens jsonb,
    p_pagamentos jsonb,
    p_desconto numeric DEFAULT 0,
    p_observacoes text DEFAULT NULL,
    p_codigo_vale text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_auth_user_id uuid;
    v_usuario_id uuid;
    v_empresa_id uuid;
    v_pdv_id uuid;
    v_tipo text;
    v_ativo boolean;
    v_bloqueado boolean;
    v_caixa_id bigint;
    v_venda_id uuid;
    v_numero bigint;

    v_vale_id uuid;
    v_vale_codigo text;
    v_vale_saldo numeric := 0;
    v_vale_status text;
    v_credito_utilizado numeric := 0;
    v_valor_a_receber numeric := 0;
    v_saldo_vale numeric := 0;

    v_subtotal numeric := 0;
    v_desconto numeric := 0;
    v_total numeric := 0;
    v_total_pagamentos numeric := 0;
    v_quantidade_itens integer := 0;

    v_item jsonb;
    v_produto_id uuid;
    v_quantidade numeric;
    v_preco numeric;
    v_total_item numeric;
    v_estoque_id uuid;
    v_estoque numeric;

    v_pagamento jsonb;
    v_forma_id uuid;
    v_forma_nome text;
    v_forma_tipo text;
    v_cartao_bandeira text;
    v_cartao_modalidade text;
    v_cartao_parcelas integer;
    v_cartao_ns text;
    v_valor_pagamento numeric;
    v_quantidade_pagamentos integer := 0;
    v_pagamentos_resumo jsonb := '[]'::jsonb;
BEGIN
    ------------------------------------------------------------------
    -- 1. Autenticação e autorização: mesmo escopo do PDV existente.
    ------------------------------------------------------------------
    v_auth_user_id := auth.uid();
    IF v_auth_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    SELECT u.id, u.empresa_id, u.pdv_id, u.tipo, u.ativo, u.bloqueado
    INTO v_usuario_id, v_empresa_id, v_pdv_id, v_tipo, v_ativo, v_bloqueado
    FROM public.erp_usuarios u
    WHERE u.auth_user_id = v_auth_user_id
    LIMIT 1;

    IF v_usuario_id IS NULL OR v_tipo <> 'PDV'
       OR v_ativo IS NOT TRUE OR v_bloqueado IS TRUE THEN
        RAISE EXCEPTION 'Usuário sem acesso autorizado ao PDV.';
    END IF;

    IF v_empresa_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.erp_empresas e
        WHERE e.id = v_empresa_id
          AND COALESCE(e.ativo, true) IS TRUE
          AND COALESCE(e.bloqueado, false) IS FALSE
    ) THEN
        RAISE EXCEPTION 'Empresa ausente, inativa ou bloqueada.';
    END IF;

    IF v_pdv_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.erp_pdvs p
        WHERE p.id = v_pdv_id
          AND p.empresa_id = v_empresa_id
          AND COALESCE(p.ativo, true) IS TRUE
          AND COALESCE(p.bloqueado, false) IS FALSE
    ) THEN
        RAISE EXCEPTION 'PDV inválido, inativo ou bloqueado.';
    END IF;

    IF p_itens IS NULL OR jsonb_typeof(p_itens) <> 'array'
       OR jsonb_array_length(p_itens) = 0 THEN
        RAISE EXCEPTION 'A venda precisa possuir pelo menos um item.';
    END IF;

    v_desconto := round(COALESCE(p_desconto, 0), 2);
    IF v_desconto < 0 THEN
        RAISE EXCEPTION 'Desconto não pode ser negativo.';
    END IF;

    ------------------------------------------------------------------
    -- 2. Bloqueia caixa aberto e impede concorrência sobre o mesmo caixa.
    ------------------------------------------------------------------
    SELECT c.id INTO v_caixa_id
    FROM public.erp_caixas c
    WHERE c.empresa_id = v_empresa_id
      AND c.pdv_id = v_pdv_id
      AND c.status = 'aberto'
    ORDER BY c.data_abertura DESC
    LIMIT 1
    FOR UPDATE;

    IF v_caixa_id IS NULL THEN
        RAISE EXCEPTION 'Não existe caixa aberto para este PDV.';
    END IF;

    ------------------------------------------------------------------
    -- 3. Valida e bloqueia o vale, se informado.
    ------------------------------------------------------------------
    IF NULLIF(btrim(COALESCE(p_codigo_vale, '')), '') IS NOT NULL THEN
        SELECT v.id, v.codigo, v.saldo, v.status
        INTO v_vale_id, v_vale_codigo, v_vale_saldo, v_vale_status
        FROM public.erp_vales_credito v
        WHERE v.empresa_id = v_empresa_id
          AND upper(v.codigo) = upper(btrim(p_codigo_vale))
        FOR UPDATE;

        IF v_vale_id IS NULL THEN
            RAISE EXCEPTION 'Vale não encontrado nesta empresa.';
        END IF;
        IF v_vale_status NOT IN ('DISPONIVEL', 'PARCIAL')
           OR COALESCE(v_vale_saldo, 0) <= 0 THEN
            RAISE EXCEPTION 'Vale sem saldo disponível.';
        END IF;
    END IF;

    ------------------------------------------------------------------
    -- 4. Calcula subtotal e valida estoque antes de criar a venda.
    ------------------------------------------------------------------
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_itens)
    LOOP
        v_produto_id := NULLIF(v_item->>'produto_id', '')::uuid;
        v_quantidade := NULLIF(v_item->>'quantidade', '')::numeric;
        IF v_produto_id IS NULL OR v_quantidade IS NULL OR v_quantidade <= 0 THEN
            RAISE EXCEPTION 'Produto ou quantidade inválida.';
        END IF;

        SELECT pr.preco_venda INTO v_preco
        FROM public.erp_produtos pr
        WHERE pr.id = v_produto_id
          AND pr.empresa_id = v_empresa_id
          AND COALESCE(pr.ativo, true) IS TRUE;
        IF NOT FOUND OR v_preco IS NULL THEN
            RAISE EXCEPTION 'Produto inválido, inativo ou de outra empresa: %.', v_produto_id;
        END IF;

        SELECT e.id, e.quantidade INTO v_estoque_id, v_estoque
        FROM public.erp_estoques e
        WHERE e.empresa_id = v_empresa_id
          AND e.produto_id = v_produto_id
          AND e.pdv_id IS NULL
        FOR UPDATE;
        IF v_estoque_id IS NULL THEN
            RAISE EXCEPTION 'Produto sem estoque geral cadastrado: %.', v_produto_id;
        END IF;
        IF COALESCE(v_estoque, 0) < v_quantidade THEN
            RAISE EXCEPTION 'Estoque insuficiente para o produto %. Disponível: %, solicitado: %.',
                v_produto_id, COALESCE(v_estoque, 0), v_quantidade;
        END IF;

        v_subtotal := v_subtotal + (v_preco * v_quantidade);
        v_quantidade_itens := v_quantidade_itens + 1;
    END LOOP;

    v_subtotal := round(v_subtotal, 2);
    IF v_desconto > v_subtotal THEN
        RAISE EXCEPTION 'Desconto não pode ser maior que o subtotal.';
    END IF;
    v_total := round(v_subtotal - v_desconto, 2);
    IF v_total <= 0 THEN
        RAISE EXCEPTION 'O total da venda deve ser maior que zero.';
    END IF;

    ------------------------------------------------------------------
    -- 5. Calcula vale e valor líquido a receber.
    ------------------------------------------------------------------
    IF v_vale_id IS NOT NULL THEN
        v_credito_utilizado := round(LEAST(v_vale_saldo, v_total), 2);
        v_saldo_vale := round(v_vale_saldo - v_credito_utilizado, 2);
    END IF;
    v_valor_a_receber := round(v_total - v_credito_utilizado, 2);

    ------------------------------------------------------------------
    -- 6. Valida todas as parcelas e soma antes de registrar a venda.
    -- JSON esperado: [{"forma_pagamento_id":"UUID","valor":12.34}, ...]
    ------------------------------------------------------------------
    IF v_valor_a_receber > 0 THEN
        IF p_pagamentos IS NULL OR jsonb_typeof(p_pagamentos) <> 'array'
           OR jsonb_array_length(p_pagamentos) = 0 THEN
            RAISE EXCEPTION 'Informe ao menos uma forma de pagamento.';
        END IF;

        FOR v_pagamento IN SELECT value FROM jsonb_array_elements(p_pagamentos)
        LOOP
            v_forma_id := NULLIF(v_pagamento->>'forma_pagamento_id', '')::uuid;
            v_valor_pagamento := round(NULLIF(v_pagamento->>'valor', '')::numeric, 2);
            IF v_forma_id IS NULL OR v_valor_pagamento IS NULL OR v_valor_pagamento <= 0 THEN
                RAISE EXCEPTION 'Cada parcela precisa ter forma de pagamento e valor maior que zero.';
            END IF;

            SELECT upper(COALESCE(fp.tipo, 'OUTROS')) INTO v_forma_tipo
            FROM public.erp_formas_pagamento fp
            WHERE fp.id = v_forma_id
              AND fp.empresa_id = v_empresa_id
              AND fp.ativo IS TRUE;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Forma de pagamento inválida ou inativa: %.', v_forma_id;
            END IF;

            IF v_forma_tipo IN ('CARTAO', 'CARD', 'DEBIT', 'CREDIT') THEN
                v_cartao_modalidade := upper(NULLIF(btrim(v_pagamento->>'cartao_modalidade'), ''));
                v_cartao_parcelas := COALESCE(NULLIF(v_pagamento->>'cartao_parcelas', '')::integer, 1);
                IF v_cartao_modalidade IS NULL OR v_cartao_modalidade NOT IN ('DEBITO', 'CREDITO') THEN
                    RAISE EXCEPTION 'Selecione débito ou crédito para o pagamento com cartão.';
                END IF;
                IF v_cartao_parcelas < 1 OR v_cartao_parcelas > 48 THEN
                    RAISE EXCEPTION 'Quantidade de parcelas do cartão inválida.';
                END IF;
                IF v_cartao_modalidade = 'DEBITO' AND v_cartao_parcelas <> 1 THEN
                    RAISE EXCEPTION 'Pagamento no débito deve ser registrado em uma parcela.';
                END IF;
            END IF;

            v_total_pagamentos := v_total_pagamentos + v_valor_pagamento;
            v_quantidade_pagamentos := v_quantidade_pagamentos + 1;
        END LOOP;

        v_total_pagamentos := round(v_total_pagamentos, 2);
        IF abs(v_total_pagamentos - v_valor_a_receber) > 0.009 THEN
            RAISE EXCEPTION 'A soma dos pagamentos (%) deve ser igual ao valor devido (%).',
                v_total_pagamentos, v_valor_a_receber;
        END IF;
    ELSE
        -- Vale cobre o total: não deve haver cobrança financeira adicional.
        v_total_pagamentos := 0;
        v_quantidade_pagamentos := 0;
    END IF;

    ------------------------------------------------------------------
    -- 7. Número sequencial por empresa, serializado nesta nova RPC.
    ------------------------------------------------------------------
    PERFORM pg_advisory_xact_lock(hashtextextended(v_empresa_id::text, 0));
    SELECT COALESCE(MAX(v.numero), 0) + 1 INTO v_numero
    FROM public.erp_vendas v
    WHERE v.empresa_id = v_empresa_id;

    INSERT INTO public.erp_vendas (
        empresa_id, pdv_id, usuario_id, numero, status,
        subtotal, desconto, acrescimo, total, observacoes
    ) VALUES (
        v_empresa_id, v_pdv_id, v_usuario_id, v_numero, 'FINALIZADA',
        v_subtotal, v_desconto, 0, v_total, p_observacoes
    ) RETURNING id INTO v_venda_id;

    ------------------------------------------------------------------
    -- 8. Insere itens, baixa estoque e registra movimentações.
    ------------------------------------------------------------------
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_itens)
    LOOP
        v_produto_id := (v_item->>'produto_id')::uuid;
        v_quantidade := (v_item->>'quantidade')::numeric;

        SELECT pr.preco_venda INTO v_preco
        FROM public.erp_produtos pr
        WHERE pr.id = v_produto_id
          AND pr.empresa_id = v_empresa_id
          AND COALESCE(pr.ativo, true) IS TRUE;
        IF NOT FOUND OR v_preco IS NULL THEN
            RAISE EXCEPTION 'Produto deixou de estar disponível durante a finalização.';
        END IF;

        v_total_item := round(v_preco * v_quantidade, 2);
        INSERT INTO public.erp_venda_itens (
            empresa_id, venda_id, produto_id, quantidade, preco_unitario, desconto, total
        ) VALUES (
            v_empresa_id, v_venda_id, v_produto_id, v_quantidade, v_preco, 0, v_total_item
        );

        SELECT e.id, e.quantidade INTO v_estoque_id, v_estoque
        FROM public.erp_estoques e
        WHERE e.empresa_id = v_empresa_id
          AND e.produto_id = v_produto_id
          AND e.pdv_id IS NULL
        FOR UPDATE;
        IF v_estoque_id IS NULL OR COALESCE(v_estoque, 0) < v_quantidade THEN
            RAISE EXCEPTION 'Estoque insuficiente durante a finalização da venda.';
        END IF;

        UPDATE public.erp_estoques
        SET quantidade = quantidade - v_quantidade,
            atualizado_em = now()
        WHERE id = v_estoque_id;

        INSERT INTO public.erp_movimentacoes_estoque (
            empresa_id, produto_id, pdv_id, usuario_id, tipo, quantidade, observacao
        ) VALUES (
            v_empresa_id, v_produto_id, v_pdv_id, v_usuario_id,
            'SAIDA', v_quantidade, 'Venda PDV #' || v_numero
        );
    END LOOP;

    ------------------------------------------------------------------
    -- 9. Registra utilização e saldo do vale, se aplicável.
    ------------------------------------------------------------------
    IF v_vale_id IS NOT NULL THEN
        INSERT INTO public.erp_vales_credito_utilizacoes (
            empresa_id, vale_id, venda_id, pdv_id, usuario_id, valor_utilizado
        ) VALUES (
            v_empresa_id, v_vale_id, v_venda_id, v_pdv_id, v_usuario_id, v_credito_utilizado
        );

        UPDATE public.erp_vales_credito
        SET saldo = v_saldo_vale,
            status = CASE WHEN v_saldo_vale <= 0 THEN 'UTILIZADO' ELSE 'PARCIAL' END,
            updated_at = now()
        WHERE id = v_vale_id AND empresa_id = v_empresa_id;
    END IF;

    ------------------------------------------------------------------
    -- 10. Registra cada parcela uma vez; o trigger existente cria
    -- uma entrada no fluxo financeiro por registro de pagamento.
    ------------------------------------------------------------------
    IF v_valor_a_receber > 0 THEN
        FOR v_pagamento IN SELECT value FROM jsonb_array_elements(p_pagamentos)
        LOOP
            v_forma_id := (v_pagamento->>'forma_pagamento_id')::uuid;
            v_valor_pagamento := round((v_pagamento->>'valor')::numeric, 2);

            SELECT fp.nome, upper(COALESCE(fp.tipo, 'OUTROS'))
            INTO v_forma_nome, v_forma_tipo
            FROM public.erp_formas_pagamento fp
            WHERE fp.id = v_forma_id
              AND fp.empresa_id = v_empresa_id
              AND fp.ativo IS TRUE;

            v_cartao_bandeira := NULLIF(btrim(v_pagamento->>'cartao_bandeira'), '');
            v_cartao_modalidade := NULLIF(upper(btrim(v_pagamento->>'cartao_modalidade')), '');
            v_cartao_parcelas := NULLIF(v_pagamento->>'cartao_parcelas', '')::integer;
            v_cartao_ns := NULLIF(btrim(v_pagamento->>'cartao_ns'), '');

            INSERT INTO public.erp_venda_pagamentos (
                empresa_id, venda_id, forma_pagamento_id, valor,
                cartao_bandeira, cartao_modalidade, cartao_parcelas, cartao_ns
            ) VALUES (
                v_empresa_id, v_venda_id, v_forma_id, v_valor_pagamento,
                CASE WHEN v_forma_tipo IN ('CARTAO', 'CARD', 'DEBIT', 'CREDIT') THEN v_cartao_bandeira ELSE NULL END,
                CASE WHEN v_forma_tipo IN ('CARTAO', 'CARD', 'DEBIT', 'CREDIT') THEN v_cartao_modalidade ELSE NULL END,
                CASE WHEN v_forma_tipo IN ('CARTAO', 'CARD', 'DEBIT', 'CREDIT') THEN v_cartao_parcelas ELSE NULL END,
                CASE WHEN v_forma_tipo IN ('CARTAO', 'CARD', 'DEBIT', 'CREDIT') THEN v_cartao_ns ELSE NULL END
            );

            IF v_forma_tipo = 'DINHEIRO' THEN
                UPDATE public.erp_caixas SET valor_dinheiro = COALESCE(valor_dinheiro, 0) + v_valor_pagamento
                WHERE id = v_caixa_id;
            ELSIF v_forma_tipo = 'PIX' THEN
                UPDATE public.erp_caixas SET valor_pix = COALESCE(valor_pix, 0) + v_valor_pagamento
                WHERE id = v_caixa_id;
            ELSIF v_forma_tipo IN ('CARTAO', 'CARD', 'DEBIT', 'CREDIT') THEN
                UPDATE public.erp_caixas SET valor_cartao = COALESCE(valor_cartao, 0) + v_valor_pagamento
                WHERE id = v_caixa_id;
            ELSE
                UPDATE public.erp_caixas SET valor_outros = COALESCE(valor_outros, 0) + v_valor_pagamento
                WHERE id = v_caixa_id;
            END IF;

            v_pagamentos_resumo := v_pagamentos_resumo || jsonb_build_array(
                jsonb_build_object(
                    'forma_pagamento_id', v_forma_id,
                    'forma_pagamento', v_forma_nome,
                    'tipo', v_forma_tipo,
                    'valor', v_valor_pagamento
                )
            );
        END LOOP;
    END IF;

    UPDATE public.erp_pdvs SET ultimo_acesso = now() WHERE id = v_pdv_id;

    RETURN jsonb_build_object(
        'sucesso', true,
        'venda_id', v_venda_id,
        'numero', v_numero,
        'empresa_id', v_empresa_id,
        'pdv_id', v_pdv_id,
        'usuario_id', v_usuario_id,
        'caixa_id', v_caixa_id,
        'quantidade_itens', v_quantidade_itens,
        'subtotal', v_subtotal,
        'desconto', v_desconto,
        'total', v_total,
        'codigo_vale', v_vale_codigo,
        'credito_utilizado', v_credito_utilizado,
        'valor_recebido', v_valor_a_receber,
        'pagamentos', v_pagamentos_resumo,
        'quantidade_pagamentos', v_quantidade_pagamentos,
        'saldo_vale', v_saldo_vale,
        'mensagem', 'Venda finalizada com pagamentos divididos com sucesso.'
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.erp_finalizar_venda_pagamento_dividido(jsonb, jsonb, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.erp_finalizar_venda_pagamento_dividido(jsonb, jsonb, numeric, text, text) TO authenticated;
