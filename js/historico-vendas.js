document.addEventListener("DOMContentLoaded", async () => {
    if (!(await window.erpExigirModulo('RELATORIOS'))) return;
    const $ = (id) => document.getElementById(id);

    const dinheiro = (valor) =>
        Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    const dataHora = (valor) =>
        valor ? new Date(valor).toLocaleString("pt-BR") : "—";

    const dataLocal = (data) =>
        `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;

    let empresa = null;
    let vendas = [];
    let itensVenda = [];
    let pagamentosVenda = [];

    let produtosPorId = new Map();
    let pdvsPorId = new Map();
    let usuariosPorId = new Map();
    let formasPorId = new Map();

    function escapar(valor) {
        return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[caractere]);
    }

    function avisar(mensagem) {
        const toast = $("toast");
        toast.textContent = mensagem;
        toast.classList.add("show");

        window.setTimeout(() => {
            toast.classList.remove("show");
        }, 4000);
    }

    function datasPadrao() {
        const fim = new Date();
        const inicio = new Date();

        inicio.setDate(inicio.getDate() - 29);

        $("dateStart").value = dataLocal(inicio);
        $("dateEnd").value = dataLocal(fim);
    }

    async function validarAcesso() {
        if (typeof supabaseClient === "undefined") {
            throw new Error("Cliente Supabase não inicializado. Confira js/supabase.js.");
        }

        const {
            data: { session },
            error: erroSessao
        } = await supabaseClient.auth.getSession();

        if (erroSessao || !session) {
            window.location.href = "index.html";
            return false;
        }

        const {
            data: usuario,
            error: erroUsuario
        } = await supabaseClient
            .from("erp_usuarios")
            .select("id,auth_user_id,empresa_id,nome,email,tipo,ativo,bloqueado")
            .eq("auth_user_id", session.user.id)
            .maybeSingle();

        if (
            erroUsuario ||
            !usuario ||
            usuario.ativo !== true ||
            usuario.bloqueado === true
        ) {
            console.error("Falha ao validar usuário:", erroUsuario);
            await supabaseClient.auth.signOut();
            window.location.href = "index.html";
            return false;
        }

        if (
            String(usuario.tipo || "").trim().toUpperCase() !== "ADMIN_ERP"
        ) {
            window.location.href = "pdv/login.html";
            return false;
        }

        const {
            data: dadosEmpresa,
            error: erroEmpresa
        } = await supabaseClient
            .from("erp_empresas")
            .select("id,nome,nome_fantasia,ativo,bloqueado")
            .eq("id", usuario.empresa_id)
            .maybeSingle();

        if (
            erroEmpresa ||
            !dadosEmpresa ||
            dadosEmpresa.ativo !== true ||
            dadosEmpresa.bloqueado === true
        ) {
            console.error("Falha ao validar empresa:", erroEmpresa);
            await supabaseClient.auth.signOut();
            window.location.href = "index.html";
            return false;
        }

        empresa = dadosEmpresa;

        $("companyName").textContent =
            empresa.nome_fantasia || empresa.nome || "Empresa";

        return true;
    }

    async function carregarReferencias() {
        const [
            respostaPDVs,
            respostaUsuarios,
            respostaFormas
        ] = await Promise.all([
            supabaseClient
                .from("erp_pdvs")
                .select("id,nome,codigo")
                .eq("empresa_id", empresa.id),

            supabaseClient
                .from("erp_usuarios")
                .select("id,auth_user_id,nome,email")
                .eq("empresa_id", empresa.id),

            supabaseClient
                .from("erp_formas_pagamento")
                .select("id,nome,tipo")
                .eq("empresa_id", empresa.id)
        ]);

        if (respostaPDVs.error) throw respostaPDVs.error;
        if (respostaUsuarios.error) throw respostaUsuarios.error;
        if (respostaFormas.error) throw respostaFormas.error;

        pdvsPorId = new Map(
            (respostaPDVs.data || []).map(item => [item.id, item])
        );

        usuariosPorId = new Map();

        (respostaUsuarios.data || []).forEach(usuario => {
            usuariosPorId.set(usuario.id, usuario);

            if (usuario.auth_user_id) {
                usuariosPorId.set(usuario.auth_user_id, usuario);
            }
        });

        formasPorId = new Map(
            (respostaFormas.data || []).map(item => [item.id, item])
        );
    }

    function aplicarPeriodo(consulta) {
        const inicio = $("dateStart").value;
        const fim = $("dateEnd").value;

        if (inicio) {
            consulta = consulta.gte(
                "created_at",
                `${inicio}T00:00:00`
            );
        }

        if (fim) {
            const limite = new Date(`${fim}T00:00:00`);
            limite.setDate(limite.getDate() + 1);

            consulta = consulta.lt(
                "created_at",
                `${dataLocal(limite)}T00:00:00`
            );
        }

        return consulta;
    }

    async function carregarVendas() {
        if (
            $("dateStart").value &&
            $("dateEnd").value &&
            $("dateStart").value > $("dateEnd").value
        ) {
            avisar("A data inicial não pode ser posterior à data final.");
            return;
        }

        $("filterButton").disabled = true;
        $("salesTable").innerHTML = `
            <tr>
                <td colspan="7" class="table-message">
                    Carregando vendas...
                </td>
            </tr>`;

        try {
            let consulta = supabaseClient
                .from("erp_vendas")
                .select(`
                    id,
                    empresa_id,
                    pdv_id,
                    usuario_id,
                    cliente_id,
                    numero,
                    status,
                    subtotal,
                    desconto,
                    acrescimo,
                    total,
                    observacoes,
                    created_at,
                    caixa_id
                `)
                .eq("empresa_id", empresa.id)
                .order("created_at", { ascending: false })
                .limit(1000);

            consulta = aplicarPeriodo(consulta);

            const status = $("statusFilter").value;

            if (status) {
                consulta = consulta.eq("status", status);
            }

            const { data, error } = await consulta;

            if (error) throw error;

            vendas = data || [];

            await carregarReferencias();

            if (vendas.length) {
                const idsVendas = vendas.map(venda => venda.id);

                const [
                    respostaItens,
                    respostaPagamentos
                ] = await Promise.all([
                    supabaseClient
                        .from("erp_venda_itens")
                        .select(`
                            id,
                            empresa_id,
                            venda_id,
                            produto_id,
                            quantidade,
                            preco_unitario,
                            desconto,
                            total,
                            created_at
                        `)
                        .eq("empresa_id", empresa.id)
                        .in("venda_id", idsVendas),

                    supabaseClient
                        .from("erp_venda_pagamentos")
                        .select(`
                            id,
                            empresa_id,
                            venda_id,
                            forma_pagamento_id,
                            valor,
                            created_at
                        `)
                        .eq("empresa_id", empresa.id)
                        .in("venda_id", idsVendas)
                ]);

                if (respostaItens.error) throw respostaItens.error;
                if (respostaPagamentos.error) throw respostaPagamentos.error;

                itensVenda = respostaItens.data || [];
                pagamentosVenda = respostaPagamentos.data || [];

                const idsProdutos = [
                    ...new Set(
                        itensVenda
                            .map(item => item.produto_id)
                            .filter(Boolean)
                    )
                ];

                if (idsProdutos.length) {
                    const {
                        data: produtos,
                        error: erroProdutos
                    } = await supabaseClient
                        .from("erp_produtos")
                        .select("id,nome,codigo,codigo_barras,unidade")
                        .eq("empresa_id", empresa.id)
                        .in("id", idsProdutos);

                    if (erroProdutos) throw erroProdutos;

                    produtosPorId = new Map(
                        (produtos || []).map(produto => [produto.id, produto])
                    );
                } else {
                    produtosPorId = new Map();
                }
            } else {
                itensVenda = [];
                pagamentosVenda = [];
                produtosPorId = new Map();
            }

            renderizarVendas();

        } catch (erro) {
            console.error("Erro ao carregar histórico de vendas:", erro);

            $("salesTable").innerHTML = `
                <tr>
                    <td colspan="7" class="table-message">
                        Não foi possível carregar as vendas.
                        Verifique as permissões de leitura no Supabase.
                    </td>
                </tr>`;

            avisar(erro.message || "Erro ao carregar vendas.");

        } finally {
            $("filterButton").disabled = false;
        }
    }

    function vendasFiltradas() {
        const pesquisa = $("searchInput")
            .value
            .trim()
            .toLocaleLowerCase("pt-BR");

        if (!pesquisa) return vendas;

        return vendas.filter(venda => {
            const pdv = pdvsPorId.get(venda.pdv_id);
            const usuario = usuariosPorId.get(venda.usuario_id);

            const texto = [
                venda.numero,
                venda.status,
                pdv?.nome,
                pdv?.codigo,
                usuario?.nome,
                usuario?.email
            ].join(" ").toLocaleLowerCase("pt-BR");

            return texto.includes(pesquisa);
        });
    }

    function renderizarVendas() {
        const lista = vendasFiltradas();

        const total = lista.reduce(
            (soma, venda) => soma + Number(venda.total || 0),
            0
        );

        const descontos = lista.reduce(
            (soma, venda) => soma + Number(venda.desconto || 0),
            0
        );

        $("metricCount").textContent =
            lista.length.toLocaleString("pt-BR");

        $("metricTotal").textContent = dinheiro(total);

        $("metricAverage").textContent =
            dinheiro(lista.length ? total / lista.length : 0);

        $("metricDiscount").textContent = dinheiro(descontos);

        $("resultCount").textContent =
            `${lista.length} registro${lista.length === 1 ? "" : "s"}`;

        if (!lista.length) {
            $("salesTable").innerHTML = `
                <tr>
                    <td colspan="7" class="table-message">
                        Nenhuma venda encontrada para os filtros selecionados.
                    </td>
                </tr>`;
            return;
        }

        $("salesTable").innerHTML = lista.map(venda => {
            const pdv = pdvsPorId.get(venda.pdv_id);
            const usuario = usuariosPorId.get(venda.usuario_id);
            const status = String(venda.status || "indefinido").toLowerCase();

            return `
                <tr>
                    <td>
                        <strong>#${escapar(venda.numero ?? String(venda.id).slice(0, 8))}</strong>
                    </td>
                    <td>${escapar(dataHora(venda.created_at))}</td>
                    <td>
                        ${escapar(
                            pdv
                                ? `${pdv.nome || "PDV"}${pdv.codigo ? ` (${pdv.codigo})` : ""}`
                                : "PDV não identificado"
                        )}
                    </td>
                    <td>${escapar(usuario?.nome || usuario?.email || "Operador não identificado")}</td>
                    <td>
                        <span class="status-pill ${escapar(status)}">
                            ${escapar(venda.status || "—")}
                        </span>
                    </td>
                    <td class="numeric">
                        <strong>${dinheiro(venda.total)}</strong>
                    </td>
                    <td>
                        <button
                            class="action-link"
                            type="button"
                            data-sale-id="${escapar(venda.id)}"
                        >
                            Detalhes
                        </button>
                    </td>
                </tr>`;
        }).join("");

        $("salesTable")
            .querySelectorAll("[data-sale-id]")
            .forEach(botao => {
                botao.addEventListener("click", () => {
                    mostrarDetalhesVenda(botao.dataset.saleId);
                });
            });
    }

    function mostrarDetalhesVenda(id) {
        const venda = vendas.find(item => item.id === id);

        if (!venda) return;

        const pdv = pdvsPorId.get(venda.pdv_id);
        const usuario = usuariosPorId.get(venda.usuario_id);

        const itens = itensVenda.filter(item => item.venda_id === id);
        const pagamentos = pagamentosVenda.filter(item => item.venda_id === id);

        $("modalTitle").textContent =
            `Venda #${venda.numero ?? String(venda.id).slice(0, 8)}`;

        const resumo = [
            ["Data", dataHora(venda.created_at)],
            ["PDV", pdv?.nome || "Não identificado"],
            ["Operador", usuario?.nome || usuario?.email || "Não identificado"],
            ["Status", venda.status || "—"],
            ["Subtotal", dinheiro(venda.subtotal)],
            ["Desconto", dinheiro(venda.desconto)],
            ["Acréscimo", dinheiro(venda.acrescimo)],
            ["Total", dinheiro(venda.total)]
        ];

        $("saleSummary").innerHTML = resumo.map(([rotulo, valor]) => `
            <div class="detail-box">
                <span>${escapar(rotulo)}</span>
                <strong>${escapar(valor)}</strong>
            </div>
        `).join("");

        $("saleItems").innerHTML = itens.length
            ? itens.map(item => {
                const produto = produtosPorId.get(item.produto_id);

                return `
                    <tr>
                        <td>${escapar(produto?.nome || `Produto ${String(item.produto_id || "").slice(0, 8)}`)}</td>
                        <td>${Number(item.quantidade || 0).toLocaleString("pt-BR")}</td>
                        <td>${dinheiro(item.preco_unitario)}</td>
                        <td>${dinheiro(item.desconto)}</td>
                        <td class="numeric"><strong>${dinheiro(item.total)}</strong></td>
                    </tr>`;
            }).join("")
            : `<tr><td colspan="5" class="table-message">Nenhum item encontrado.</td></tr>`;

        $("salePayments").innerHTML = pagamentos.length
            ? pagamentos.map(pagamento => {
                const forma = formasPorId.get(pagamento.forma_pagamento_id);

                return `
                    <tr>
                        <td>${escapar(forma?.nome || forma?.tipo || "Forma não identificada")}</td>
                        <td class="numeric"><strong>${dinheiro(pagamento.valor)}</strong></td>
                    </tr>`;
            }).join("")
            : `<tr><td colspan="2" class="table-message">Nenhum pagamento encontrado.</td></tr>`;

        $("saleNotes").textContent = venda.observacoes
            ? `Observações: ${venda.observacoes}`
            : "";

        $("saleModal").classList.add("open");
        $("saleModal").setAttribute("aria-hidden", "false");
    }

    function fecharModal() {
        $("saleModal").classList.remove("open");
        $("saleModal").setAttribute("aria-hidden", "true");
    }

    $("backButton").addEventListener("click", () => {
        window.location.href = "dashboard.html";
    });

    $("refreshButton").addEventListener("click", carregarVendas);
    $("filterButton").addEventListener("click", carregarVendas);
    $("searchInput").addEventListener("input", renderizarVendas);
    $("statusFilter").addEventListener("change", carregarVendas);
    $("closeModal").addEventListener("click", fecharModal);

    $("saleModal").addEventListener("click", evento => {
        if (evento.target === $("saleModal")) fecharModal();
    });

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape") fecharModal();
    });

    datasPadrao();

    try {
        const acessoLiberado = await validarAcesso();

        if (acessoLiberado) {
            await carregarVendas();
        }
    } catch (erro) {
        console.error("Erro ao iniciar histórico:", erro);
        avisar(erro.message || "Erro ao iniciar o histórico.");
    }
});