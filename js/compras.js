document.addEventListener("DOMContentLoaded", async () => {
    if (!(await window.erpExigirModulo('ESTOQUE'))) return;
    const $ = (id) => document.getElementById(id);

    let usuarioAtual = null;
    let empresaAtual = null;
    let fornecedores = [];
    let produtos = [];
    let compras = [];
    let itensCompra = [];
    let compraEditando = null;
    let salvando = false;

    const form = $("compraForm");
    const itensBody = $("itensBody");
    const mensagemForm = $("mensagemForm");
    const mensagemLista = $("mensagemLista");
    const salvarButton = $("salvarCompraButton");

    const dinheiro = (valor) => Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

    const numero = (valor) => {
        const n = Number(valor);
        return Number.isFinite(n) ? n : 0;
    };

    const dataHoje = () => {
        const agora = new Date();
        const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
        return local.toISOString().slice(0, 10);
    };

    function escapar(valor) {
        return String(valor ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function mostrarMensagem(elemento, texto, erro = false) {
        elemento.textContent = texto;
        elemento.hidden = false;
        elemento.classList.toggle("error", erro);
    }

    function ocultarMensagem(elemento) {
        elemento.hidden = true;
        elemento.textContent = "";
        elemento.classList.remove("error");
    }

    function statusLabel(status) {
        const mapa = {
            RASCUNHO: ["Rascunho", "status-draft"],
            RECEBIDA: ["Recebida", "status-received"],
            CANCELADA: ["Cancelada", "status-cancelled"]
        };
        const [texto, classe] = mapa[status] || [status, "status-draft"];
        return `<span class="status ${classe}">${texto}</span>`;
    }

    function xmlFilhos(elemento, nome) {
        return Array.from(elemento?.getElementsByTagName("*") || [])
            .filter((node) => node.localName === nome);
    }

    function xmlTexto(elemento, nome) {
        const node = xmlFilhos(elemento, nome)[0];
        return node?.textContent?.trim() || "";
    }

    function numeroXml(valor) {
        const n = Number(String(valor || "0").replace(",", "."));
        return Number.isFinite(n) ? n : 0;
    }

    function mostrarMensagemXml(texto, erro = false) {
        const el = $("mensagemXml");
        el.textContent = texto;
        el.hidden = false;
        el.classList.toggle("error", erro);
    }

    async function importarNfeXml() {
        const arquivo = $("arquivoNfeXml").files?.[0];
        if (!arquivo) {
            mostrarMensagemXml("Selecione um arquivo XML da NF-e.", true);
            return;
        }
        if (arquivo.size > 10 * 1024 * 1024) {
            mostrarMensagemXml("O XML excede o limite de 10 MB.", true);
            return;
        }
        try {
            const texto = await arquivo.text();
            const doc = new DOMParser().parseFromString(texto, "application/xml");
            if (doc.querySelector("parsererror")) throw new Error("O arquivo não é um XML válido.");
            const infNFe = xmlFilhos(doc, "infNFe")[0];
            if (!infNFe) throw new Error("Não encontrei a estrutura infNFe. Selecione o XML autorizado da NF-e.");

            const ide = xmlFilhos(infNFe, "ide")[0];
            const emit = xmlFilhos(infNFe, "emit")[0];
            const totalNode = xmlFilhos(infNFe, "ICMSTot")[0];
            const numeroNota = xmlTexto(ide, "nNF");
            const serie = xmlTexto(ide, "serie");
            const dataEmissao = xmlTexto(ide, "dhEmi") || xmlTexto(ide, "dEmi");
            const dataCompra = dataEmissao ? dataEmissao.slice(0, 10) : dataHoje();
            const cnpjEmitente = xmlTexto(emit, "CNPJ").replace(/\D/g, "");
            const nomeEmitente = xmlTexto(emit, "xNome");
            const chave = xmlTexto(doc, "chNFe") || String(infNFe.getAttribute("Id") || "").replace(/^NFe/, "");

            let fornecedor = fornecedores.find((f) => String(f.documento || "").replace(/\D/g, "") === cnpjEmitente && cnpjEmitente);
            if (!fornecedor && nomeEmitente) {
                const candidatos = fornecedores.filter((f) => String(f.nome || f.nome_fantasia || "").trim().toLowerCase() === nomeEmitente.trim().toLowerCase());
                if (candidatos.length === 1) fornecedor = candidatos[0];
            }

            const detalhes = xmlFilhos(infNFe, "det");
            if (!detalhes.length) throw new Error("A NF-e não contém itens para importar.");

            const itensImportados = detalhes.map((det) => {
                const prod = xmlFilhos(det, "prod")[0];
                const codigoXml = xmlTexto(prod, "cProd");
                const gtin = xmlTexto(prod, "cEAN");
                const descricao = xmlTexto(prod, "xProd");
                const quantidade = numeroXml(xmlTexto(prod, "qCom"));
                const valorUnitario = numeroXml(xmlTexto(prod, "vUnCom"));
                const valorBrutoItem = numeroXml(xmlTexto(prod, "vProd")) || quantidade * valorUnitario;
                const descontoItem = numeroXml(xmlTexto(prod, "vDesc"));
                const custoEfetivo = quantidade > 0 ? Math.max(0, (valorBrutoItem - descontoItem) / quantidade) : valorUnitario;
                const codigoLimpo = (v) => String(v || "").trim().toLowerCase();
                let produto = null;
                if (gtin && !["", "sem gtin"].includes(gtin.toLowerCase())) {
                    produto = produtos.find((p) => codigoLimpo(p.codigo_barras) === codigoLimpo(gtin));
                }
                if (!produto && codigoXml) produto = produtos.find((p) => codigoLimpo(p.codigo) === codigoLimpo(codigoXml));
                return {
                    produto_id: produto?.id || "",
                    quantidade: String(quantidade > 0 ? quantidade : 1),
                    custo_unitario: custoEfetivo.toFixed(4),
                    custo_editado: false,
                    descricao_xml: descricao,
                    codigo_xml: codigoXml,
                    gtin_xml: gtin,
                    ncm_xml: xmlTexto(prod, "NCM"),
                    cfop_xml: xmlTexto(prod, "CFOP")
                };
            });

            // Proteção contra reimportação: primeiro pela chave de acesso já guardada em observações;
            // depois por fornecedor + número/série no esquema atual.
            if (chave && /^[0-9]{44}$/.test(chave)) {
                const { data: mesmaChave, error: erroChave } = await supabaseClient
                    .from("erp_compras")
                    .select("id,status,numero_documento")
                    .eq("empresa_id", empresaAtual.id)
                    .ilike("observacao", `%${chave}%`)
                    .limit(1);
                if (erroChave) throw erroChave;
                if (mesmaChave?.length) throw new Error(`A chave de acesso desta NF-e já aparece na compra ${mesmaChave[0].id} (status ${mesmaChave[0].status}). Não importei novamente.`);
            }
            if (numeroNota && fornecedor) {
                const documentoNormalizado = `${numeroNota}${serie ? `/${serie}` : ""}`.trim();
                const duplicada = compras.find((c) => String(c.fornecedor_id) === String(fornecedor.id) && [documentoNormalizado, numeroNota].includes(String(c.numero_documento || "").trim()));
                if (duplicada) throw new Error(`Esta nota parece já existir no histórico (compra ${duplicada.id}, status ${duplicada.status}). Confira antes de importar novamente.`);
            }

            if (compraEditando) {
                const atual = compras.find((c) => String(c.id) === String(compraEditando));
                if (atual?.status !== "RASCUNHO") throw new Error("Só é possível importar XML em uma compra nova ou em rascunho.");
            } else {
                form.reset();
                compraEditando = null;
            }

            const valorTotalNfe = numeroXml(xmlTexto(totalNode, "vNF"));
            const freteXml = numeroXml(xmlTexto(totalNode, "vFrete"));
            const descontoXml = numeroXml(xmlTexto(totalNode, "vDesc"));
            if (fornecedor) $("fornecedorId").value = String(fornecedor.id);
            else $("fornecedorId").value = "";
            $("numeroDocumento").value = `${numeroNota}${serie ? `/${serie}` : ""}`;
            $("dataCompra").value = /^\d{4}-\d{2}-\d{2}$/.test(dataCompra) ? dataCompra : dataHoje();
            $("frete").value = freteXml.toFixed(2);
            $("desconto").value = descontoXml.toFixed(2);
            itensCompra = itensImportados;
            const subtotalItens = itensCompra.reduce((acc, item) => acc + numero(item.quantidade) * numero(item.custo_unitario), 0);
            const observacaoBase = `Importado de XML NF-e. Emitente: ${nomeEmitente || "não informado"}; CNPJ: ${cnpjEmitente || "não informado"}; Chave de acesso: ${chave || "não encontrada"}. Total informado na NF-e: ${dinheiro(valorTotalNfe)}.`;
            $("observacao").value = observacaoBase;
            renderizarItens();
            $("formPanel").hidden = false;
            $("formPanel").scrollIntoView({ behavior: "smooth", block: "start" });
            $("formTitulo").textContent = "Conferir compra importada do XML";
            salvarButton.textContent = "Salvar rascunho";
            const semVinculo = itensImportados.filter((i) => !i.produto_id).length;
            const resumo = $("resumoXml");
            resumo.hidden = false;
            resumo.textContent = `NF-e ${numeroNota || "sem número"}${serie ? ` · Série ${serie}` : ""} · Emitente: ${nomeEmitente || "não informado"} · CNPJ: ${cnpjEmitente || "não informado"} · Itens: ${itensImportados.length} · Total XML: ${dinheiro(valorTotalNfe)} · Soma calculada dos itens: ${dinheiro(subtotalItens)} · Frete XML: ${dinheiro(freteXml)} · Desconto XML: ${dinheiro(descontoXml)} · ${semVinculo} item(ns) sem correspondência automática. Revise os dados e associe manualmente os itens destacados antes de salvar.`;
            mostrarMensagemXml(fornecedor ? "XML lido. Fornecedor associado; confira os itens e os valores antes de salvar." : "XML lido, mas não encontrei fornecedor correspondente pelo CNPJ/nome. Selecione o fornecedor manualmente.", !fornecedor || semVinculo > 0);
            ocultarMensagem(mensagemForm);
        } catch (error) {
            console.error("Falha ao importar XML NF-e:", error);
            mostrarMensagemXml(error.message || "Não foi possível interpretar este XML.", true);
        }
    }

    async function inicializar() {
        if (typeof supabaseClient === "undefined") {
            throw new Error("Cliente Supabase não foi inicializado.");
        }

        const { data: { session }, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError || !session) {
            window.location.href = "index.html";
            return false;
        }

        const { data: usuario, error: usuarioError } = await supabaseClient
            .from("erp_usuarios")
            .select("id, auth_user_id, empresa_id, nome, tipo, ativo, bloqueado")
            .eq("auth_user_id", session.user.id)
            .maybeSingle();

        if (
            usuarioError || !usuario ||
            usuario.ativo !== true || usuario.bloqueado === true ||
            String(usuario.tipo || "").trim().toUpperCase() !== "ADMIN_ERP"
        ) {
            alert("Acesso permitido somente ao administrador ativo do ERP.");
            window.location.href = "index.html";
            return false;
        }

        const { data: empresa, error: empresaError } = await supabaseClient
            .from("erp_empresas")
            .select("id, nome, nome_fantasia, ativo, bloqueado")
            .eq("id", usuario.empresa_id)
            .maybeSingle();

        if (
            empresaError || !empresa ||
            empresa.ativo !== true || empresa.bloqueado === true
        ) {
            alert("Empresa indisponível ou sem autorização.");
            window.location.href = "index.html";
            return false;
        }

        usuarioAtual = usuario;
        empresaAtual = empresa;

        $("empresaNome").textContent =
            empresa.nome_fantasia || empresa.nome || "Empresa";

        $("dataCompra").value = dataHoje();

        await Promise.all([
            carregarFornecedores(),
            carregarProdutos()
        ]);

        await carregarCompras();
        return true;
    }

    async function carregarFornecedores() {
        const { data, error } = await supabaseClient
            .from("erp_fornecedores")
            .select("id, nome, nome_fantasia, documento, ativo")
            .eq("empresa_id", empresaAtual.id)
            .eq("ativo", true)
            .order("nome");

        if (error) throw error;

        fornecedores = data || [];

        $("fornecedorId").innerHTML =
            '<option value="">Selecione um fornecedor</option>' +
            fornecedores.map((f) => `
                <option value="${escapar(f.id)}">
                    ${escapar(f.nome_fantasia || f.nome)}
                </option>
            `).join("");
    }

    async function carregarProdutos() {
        const { data, error } = await supabaseClient
            .from("erp_produtos")
            .select("id, codigo, codigo_barras, nome, unidade, preco_custo, preco_venda, ativo")
            .eq("empresa_id", empresaAtual.id)
            .eq("ativo", true)
            .order("nome");

        if (error) throw error;
        produtos = data || [];
    }

    async function carregarCompras() {
        const { data, error } = await supabaseClient
            .from("erp_compras")
            .select(`
                id, empresa_id, fornecedor_id, numero_documento,
                data_compra, observacao, frete, desconto, total,
                status, created_at, recebido_em
            `)
            .eq("empresa_id", empresaAtual.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Erro ao carregar compras:", error);
            mostrarMensagem(
                mensagemLista,
                "Não foi possível carregar as compras. Verifique as permissões no Supabase.",
                true
            );
            return;
        }

        compras = data || [];
        renderizarCompras();
        atualizarEstatisticas();
    }

    function atualizarEstatisticas() {
        const rascunhos = compras.filter((c) => c.status === "RASCUNHO");
        const recebidas = compras.filter((c) => c.status === "RECEBIDA");

        $("statRascunhos").textContent = rascunhos.length;
        $("statRecebidas").textContent = recebidas.length;

        $("statTotalRecebido").textContent = dinheiro(
            recebidas.reduce((soma, c) => soma + numero(c.total), 0)
        );
    }

    async function consultarContasCompra(compraId) {
    const { data, error } = await supabaseClient
        .from("erp_lancamentos_financeiros")
        .select("id, compra_id, descricao, valor, vencimento, pagamento, status, parcela_numero, total_parcelas")
        .eq("empresa_id", empresaAtual.id)
        .eq("compra_id", compraId)
        .order("parcela_numero", { ascending: true });

    if (error) throw error;

    return data || [];
}

async function gerarContasCompra(compra) {
    if (compra.status !== "RECEBIDA") {
        mostrarMensagem(
            mensagemLista,
            "Só é possível gerar contas a pagar para compras recebidas.",
            true
        );
        return;
    }

    ocultarMensagem(mensagemLista);

    try {
        // Proteção contra duplicidade
        const existentes = await consultarContasCompra(compra.id);

        if (existentes.length > 0) {
            const resumo = existentes.map((conta) =>
                `${conta.descricao || "Parcela"} — ${dinheiro(conta.valor)} — vencimento: ${conta.vencimento || "não informado"} — ${conta.status}`
            ).join("\n");

            alert(
                "Esta compra já possui contas financeiras cadastradas. " +
                "Nenhum novo lançamento foi criado.\n\n" + resumo
            );
            return;
        }

        const quantidadeTexto = prompt(
            "Quantas parcelas deseja gerar para esta compra?\n\n" +
            "Digite 1 para pagamento à vista."
        );

        if (quantidadeTexto === null) return;

        if (!/^\d+$/.test(quantidadeTexto.trim())) {
            throw new Error("Informe um número inteiro de parcelas.");
        }

        const quantidade = Number(quantidadeTexto);

        if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 120) {
            throw new Error("A quantidade deve estar entre 1 e 120 parcelas.");
        }

        const vencimentos = [];

        for (let i = 1; i <= quantidade; i++) {
            const vencimento = prompt(
                `Informe a data de vencimento da parcela ${i}/${quantidade}.\n` +
                "Formato obrigatório: AAAA-MM-DD",
                dataHoje()
            );

            if (vencimento === null) return;

            if (!/^\d{4}-\d{2}-\d{2}$/.test(vencimento)) {
                throw new Error(`Data inválida na parcela ${i}. Use AAAA-MM-DD.`);
            }

            const dataValidada = new Date(`${vencimento}T12:00:00`);

            if (
                Number.isNaN(dataValidada.getTime()) ||
                dataValidada.toISOString().slice(0, 10) !== vencimento
            ) {
                throw new Error(`A data da parcela ${i} não é válida.`);
            }

            vencimentos.push(vencimento);
        }

        const fornecedor = fornecedores.find(
            (f) => f.id === compra.fornecedor_id
        );

        const confirmado = confirm(
            "Confirme a geração das contas a pagar.\n\n" +
            `Fornecedor: ${fornecedor?.nome_fantasia || fornecedor?.nome || "—"}\n` +
            `Documento: ${compra.numero_documento || "—"}\n` +
            `Valor total: ${dinheiro(compra.total)}\n` +
            `Quantidade de parcelas: ${quantidade}\n` +
            `Vencimentos: ${vencimentos.join(", ")}\n\n` +
            "Esta operação criará os lançamentos financeiros."
        );

        if (!confirmado) return;

        const botoes = $("listaCompras").querySelectorAll("button");
        botoes.forEach((botao) => botao.disabled = true);

        mostrarMensagem(mensagemLista, "Gerando contas a pagar...");

        const { data, error } = await supabaseClient.rpc(
            "erp_gerar_contas_compra",
            {
                p_compra_id: compra.id,
                p_vencimentos: vencimentos
            }
        );

        if (error) {
            // Se a resposta falhar depois da execução no servidor,
            // verificamos se os lançamentos chegaram a ser criados.
            const verificacao = await consultarContasCompra(compra.id);

            if (verificacao.length > 0) {
                mostrarMensagem(
                    mensagemLista,
                    "As contas foram encontradas no Financeiro. Não tente gerá-las novamente."
                );
                return;
            }

            throw error;
        }

        const contasCriadas = await consultarContasCompra(compra.id);

        if (contasCriadas.length === 0) {
            throw new Error(
                "A função foi executada, mas não encontramos os lançamentos no Financeiro. Verifique o Supabase antes de tentar novamente."
            );
        }

        mostrarMensagem(
            mensagemLista,
            `Contas localizadas no Financeiro: ${contasCriadas.length} lançamento(s).`
        );

        const resumo = contasCriadas.map((conta) =>
            `${conta.descricao || "Parcela"} — ${dinheiro(conta.valor)} — vencimento: ${conta.vencimento || "—"}`
        ).join("\n");

        alert(
            "Contas a pagar localizadas com sucesso!\n\n" +
            resumo
        );

        console.log("Retorno da geração de contas:", data);
    } catch (error) {
        console.error("Erro ao gerar contas da compra:", error);

        mostrarMensagem(
            mensagemLista,
            error.message || "Não foi possível gerar as contas a pagar.",
            true
        );
    } finally {
        $("listaCompras").querySelectorAll("button")
            .forEach((botao) => botao.disabled = false);
    }
}

    function renderizarCompras() {
        const termo = $("pesquisa").value.trim().toLocaleLowerCase("pt-BR");
        const status = $("filtroStatus").value;

        const filtradas = compras.filter((c) => {
            const fornecedor = fornecedores.find((f) => f.id === c.fornecedor_id);
            const texto = [
                fornecedor?.nome,
                fornecedor?.nome_fantasia,
                c.numero_documento,
                c.status
            ].join(" ").toLocaleLowerCase("pt-BR");

            return (!status || c.status === status) && texto.includes(termo);
        });

        const corpo = $("listaCompras");

        if (!filtradas.length) {
            corpo.innerHTML = '<tr><td colspan="6">Nenhuma compra encontrada.</td></tr>';
            return;
        }

        corpo.innerHTML = filtradas.map((c) => {
            const fornecedor = fornecedores.find((f) => f.id === c.fornecedor_id);
            const data = c.data_compra
                ? new Date(`${c.data_compra}T12:00:00`).toLocaleDateString("pt-BR")
                : "—";

            return `
                <tr>
                    <td>${data}</td>
                    <td>${escapar(c.numero_documento || "—")}</td>
                    <td>${escapar(fornecedor?.nome_fantasia || fornecedor?.nome || "Fornecedor")}</td>
                    <td>${dinheiro(c.total)}</td>
                    <td>${statusLabel(c.status)}</td>
                    <td>
                        <div class="action-group">
                            <button type="button" class="action-btn"
                                data-action="detalhes" data-id="${escapar(c.id)}">
                                Detalhes
                            </button>
                            ${c.status === "RECEBIDA" ? `
    <button type="button" class="action-btn"
        data-action="contas" data-id="${escapar(c.id)}">
        Gerar contas a pagar
    </button>
` : ""}
                            ${c.status === "RASCUNHO" ? `
                                <button type="button" class="action-btn"
                                    data-action="editar" data-id="${escapar(c.id)}">
                                    Editar
                                </button>
                                <button type="button" class="action-btn receive"
                                    data-action="receber" data-id="${escapar(c.id)}">
                                    Receber
                                </button>
                                <button type="button" class="action-btn danger"
                                    data-action="cancelar" data-id="${escapar(c.id)}">
                                    Cancelar
                                </button>
                            ` : ""}
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function criarOpcaoProduto(produtoId) {
        return `
            <option value="">Selecione o produto</option>
            ${produtos.map((p) => `
                <option value="${escapar(p.id)}"
                    ${p.id === produtoId ? "selected" : ""}>
                    ${escapar(p.nome)}${p.codigo ? ` — ${escapar(p.codigo)}` : ""}
                </option>
            `).join("")}
        `;
    }

    function renderizarItens() {
        itensBody.innerHTML = itensCompra.map((item, indice) => `
            <tr data-index="${indice}">
                <td>
                    <select class="product-select" data-field="produto" required>
                        ${criarOpcaoProduto(item.produto_id)}
                    </select>
                    ${item.descricao_xml ? `<small class="xml-item-note">Descrição no XML: ${escapar(item.descricao_xml)}${item.codigo_xml ? ` · Código fornecedor: ${escapar(item.codigo_xml)}` : ""}</small>` : ""}
                </td>
                <td>
                    <input class="quantity-input" data-field="quantidade"
                        type="number" min="0.001" step="0.001"
                        value="${item.quantidade}" required>
                </td>
                <td>
                    <input class="cost-input" data-field="custo"
                        type="number" min="0" step="0.0001"
                        value="${item.custo_unitario}" required>
                </td>
                <td class="item-subtotal">${dinheiro(
                    numero(item.quantidade) * numero(item.custo_unitario)
                )}</td>
                <td>
                    <button type="button" class="remove-item"
                        data-action="remover-item" data-index="${indice}"
                        aria-label="Remover produto">×</button>
                </td>
            </tr>
        `).join("");

        $("emptyItems").hidden = itensCompra.length > 0;
        atualizarTotais();
    }

    function atualizarTotais() {
        let subtotal = 0;

        itensCompra.forEach((item, indice) => {
            const valor = numero(item.quantidade) * numero(item.custo_unitario);
            subtotal += valor;

            const celula = itensBody.querySelector(
                `tr[data-index="${indice}"] .item-subtotal`
            );

            if (celula) celula.textContent = dinheiro(valor);
        });

        const frete = numero($("frete").value);
        const desconto = numero($("desconto").value);

        $("subtotalProdutos").textContent = dinheiro(subtotal);
        $("totalCompra").textContent = dinheiro(subtotal + frete - desconto);
    }

    function novaCompra() {
        compraEditando = null;
        itensCompra = [];

        form.reset();
        $("dataCompra").value = dataHoje();
        $("frete").value = "0";
        $("desconto").value = "0";
        $("formTitulo").textContent = "Nova compra";
        salvarButton.textContent = "Salvar rascunho";

        ocultarMensagem(mensagemForm);
        renderizarItens();

        $("formPanel").hidden = false;
        $("formPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function fecharFormulario() {
        $("formPanel").hidden = true;
        form.reset();
        itensCompra = [];
        compraEditando = null;
        renderizarItens();
        ocultarMensagem(mensagemForm);
    }

    function sincronizarItem(indice, campo, valor) {
        const item = itensCompra[indice];
        if (!item) return;

        if (campo === "produto") {
            item.produto_id = valor;

            const produto = produtos.find((p) => p.id === valor);
            if (produto && (!item.custo_editado || !item.custo_unitario)) {
                item.custo_unitario = numero(produto.preco_custo).toFixed(4);
            }
        } else if (campo === "quantidade") {
            item.quantidade = valor;
        } else if (campo === "custo") {
            item.custo_unitario = valor;
            item.custo_editado = true;
        }

        const foco = document.activeElement;
        const manterCampo = foco?.dataset?.field;
        const manterIndice = foco?.closest("tr")?.dataset?.index;

        renderizarItens();

        if (manterCampo && manterIndice === String(indice)) {
            const linha = itensBody.querySelector(`tr[data-index="${indice}"]`);
            const controle = linha?.querySelector(`[data-field="${manterCampo}"]`);
            if (controle) {
                controle.focus();
                if (controle.tagName === "INPUT") {
                    const fim = controle.value.length;
                    controle.setSelectionRange?.(fim, fim);
                }
            }
        }
    }

    async function salvarRascunho(event) {
        event.preventDefault();
        if (salvando) return;

        ocultarMensagem(mensagemForm);

        if (!empresaAtual || !usuarioAtual) {
            mostrarMensagem(mensagemForm, "Empresa ou usuário não identificado.", true);
            return;
        }

        if (!$("fornecedorId").value) {
            mostrarMensagem(mensagemForm, "Selecione um fornecedor ativo.", true);
            return;
        }

        if (!itensCompra.length) {
            mostrarMensagem(mensagemForm, "Adicione pelo menos um produto.", true);
            return;
        }

        const produtosUsados = new Set();

        for (const item of itensCompra) {
            const quantidade = Number(item.quantidade);
            const custo = Number(item.custo_unitario);

            if (!item.produto_id || !produtos.some((p) => p.id === item.produto_id)) {
                mostrarMensagem(mensagemForm, "Selecione um produto válido em todos os itens.", true);
                return;
            }

            if (!Number.isFinite(quantidade) || quantidade <= 0) {
                mostrarMensagem(mensagemForm, "Todas as quantidades devem ser maiores que zero.", true);
                return;
            }

            if (!Number.isFinite(custo) || custo < 0) {
                mostrarMensagem(mensagemForm, "Confira os custos unitários.", true);
                return;
            }

            if (produtosUsados.has(item.produto_id)) {
                mostrarMensagem(
                    mensagemForm,
                    "Cada produto deve aparecer apenas uma vez. Edite a quantidade na linha existente.",
                    true
                );
                return;
            }

            produtosUsados.add(item.produto_id);
        }

        const frete = Number($("frete").value);
        const desconto = Number($("desconto").value);

        if (!Number.isFinite(frete) || frete < 0 ||
            !Number.isFinite(desconto) || desconto < 0) {
            mostrarMensagem(mensagemForm, "Frete e desconto não podem ser negativos.", true);
            return;
        }

        const subtotal = itensCompra.reduce(
            (soma, item) => soma +
                Number(item.quantidade) * Number(item.custo_unitario),
            0
        );
        const total = subtotal + frete - desconto;

        if (!Number.isFinite(total) || total < 0) {
            mostrarMensagem(mensagemForm, "O desconto não pode deixar o total negativo.", true);
            return;
        }

        const dadosCompra = {
            empresa_id: empresaAtual.id,
            fornecedor_id: $("fornecedorId").value,
            numero_documento: $("numeroDocumento").value.trim() || null,
            data_compra: $("dataCompra").value,
            observacao: $("observacao").value.trim() || null,
            frete,
            desconto,
            total,
            status: "RASCUNHO",
            criado_por: usuarioAtual.id,
            updated_at: new Date().toISOString()
        };

        salvando = true;
        salvarButton.disabled = true;
        salvarButton.textContent = "Salvando...";

        try {
            let compraId = compraEditando;

            if (compraId) {
                const { data, error } = await supabaseClient
                    .from("erp_compras")
                    .update(dadosCompra)
                    .eq("id", compraId)
                    .eq("empresa_id", empresaAtual.id)
                    .eq("status", "RASCUNHO")
                    .select("id")
                    .maybeSingle();

                if (error) throw error;
                if (!data) {
                    throw new Error("A compra não foi atualizada. Confira seu acesso ou o status da compra.");
                }
            } else {
                const { data, error } = await supabaseClient
                    .from("erp_compras")
                    .insert(dadosCompra)
                    .select("id")
                    .single();

                if (error) throw error;
                compraId = data.id;
            }

            const { error: limparItensError } = await supabaseClient
                .from("erp_compra_itens")
                .delete()
                .eq("compra_id", compraId);

            if (limparItensError) throw limparItensError;

            const linhas = itensCompra.map((item) => ({
                compra_id: compraId,
                produto_id: item.produto_id,
                quantidade: Number(item.quantidade),
                custo_unitario: Number(item.custo_unitario)
            }));

            const { error: inserirItensError } = await supabaseClient
                .from("erp_compra_itens")
                .insert(linhas);

            if (inserirItensError) throw inserirItensError;

            mostrarMensagem(mensagemForm, "Rascunho salvo com sucesso.");
            await carregarCompras();

            compraEditando = compraId;
            $("formTitulo").textContent = "Editar compra";
            salvarButton.textContent = "Salvar alterações";
        } catch (error) {
            console.error("Erro ao salvar compra:", error);
            mostrarMensagem(
                mensagemForm,
                error.message || "Não foi possível salvar o rascunho.",
                true
            );
        } finally {
            salvando = false;
            salvarButton.disabled = false;
            salvarButton.textContent = compraEditando
                ? "Salvar alterações"
                : "Salvar rascunho";
        }
    }

    async function editarCompra(compra) {
        if (compra.status !== "RASCUNHO") return;

        const { data: itens, error } = await supabaseClient
            .from("erp_compra_itens")
            .select("id, compra_id, produto_id, quantidade, custo_unitario")
            .eq("compra_id", compra.id);

        if (error) {
            console.error(error);
            mostrarMensagem(mensagemLista, "Não foi possível carregar os itens da compra.", true);
            return;
        }

        compraEditando = compra.id;
        itensCompra = (itens || []).map((item) => ({
            produto_id: item.produto_id,
            quantidade: String(item.quantidade),
            custo_unitario: String(item.custo_unitario),
            custo_editado: true
        }));

        form.reset();
        $("fornecedorId").value = compra.fornecedor_id;
        $("numeroDocumento").value = compra.numero_documento || "";
        $("dataCompra").value = compra.data_compra || dataHoje();
        $("observacao").value = compra.observacao || "";
        $("frete").value = numero(compra.frete);
        $("desconto").value = numero(compra.desconto);
        $("formTitulo").textContent = "Editar compra";
        salvarButton.textContent = "Salvar alterações";

        ocultarMensagem(mensagemForm);
        renderizarItens();

        $("formPanel").hidden = false;
        $("formPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function detalhesCompra(compra) {
        const fornecedor = fornecedores.find((f) => f.id === compra.fornecedor_id);

        const { data: itens, error } = await supabaseClient
            .from("erp_compra_itens")
            .select("produto_id, quantidade, custo_unitario")
            .eq("compra_id", compra.id);

        if (error) {
            mostrarMensagem(mensagemLista, "Não foi possível carregar os detalhes.", true);
            return;
        }

        const linhas = (itens || []).map((item) => {
            const produto = produtos.find((p) => p.id === item.produto_id);
            return `${produto?.nome || "Produto"} — ${item.quantidade} × ${dinheiro(item.custo_unitario)} = ${dinheiro(numero(item.quantidade) * numero(item.custo_unitario))}`;
        });

        alert(
            `Compra: ${compra.numero_documento || compra.id}\n` +
            `Fornecedor: ${fornecedor?.nome_fantasia || fornecedor?.nome || "—"}\n` +
            `Data: ${compra.data_compra || "—"}\n` +
            `Status: ${compra.status}\n\n` +
            `${linhas.join("\n") || "Sem itens"}\n\n` +
            `Frete: ${dinheiro(compra.frete)}\n` +
            `Desconto: ${dinheiro(compra.desconto)}\n` +
            `Total: ${dinheiro(compra.total)}`
        );
    }

    async function receberCompra(compra) {
        if (compra.status !== "RASCUNHO") return;

        const fornecedor = fornecedores.find((f) => f.id === compra.fornecedor_id);

        const confirmado = confirm(
            `Confirmar o recebimento desta compra?\n\n` +
            `Fornecedor: ${fornecedor?.nome_fantasia || fornecedor?.nome || "—"}\n` +
            `Total: ${dinheiro(compra.total)}\n\n` +
            `O estoque será atualizado e serão registradas as movimentações. Esta ação não deve ser repetida.`
        );

        if (!confirmado) return;

        ocultarMensagem(mensagemLista);

        const botoes = $("listaCompras").querySelectorAll("button");
        botoes.forEach((b) => b.disabled = true);

        try {
            const { data, error } = await supabaseClient.rpc(
                "erp_receber_compra",
                { p_compra_id: compra.id }
            );

            if (error) throw error;

            let retorno = data;

if (Array.isArray(retorno)) {
    retorno = retorno[0];
}

if (
    retorno &&
    (
        retorno.success === true ||
        retorno.status === "RECEBIDA"
    )
) {
    mostrarMensagem(
        mensagemLista,
        retorno.message ||
        "Compra recebida com sucesso! O estoque foi atualizado."
    );
} else {
    throw new Error(
        retorno?.message ||
        "Não foi possível confirmar o recebimento. Verifique o status da compra."
    );
}

            mostrarMensagem(
                mensagemLista,
                data.message || "Compra recebida e estoque atualizado."
            );

            await carregarCompras();
        } catch (error) {
            console.error("Erro ao receber compra:", error);
            mostrarMensagem(
                mensagemLista,
                error.message || "Não foi possível receber a compra.",
                true
            );
        } finally {
            $("listaCompras").querySelectorAll("button")
                .forEach((b) => b.disabled = false);
        }
    }

    async function cancelarCompra(compra) {
        if (compra.status !== "RASCUNHO") return;

        if (!confirm("Deseja cancelar este rascunho? O estoque não será movimentado.")) {
            return;
        }

        const { data, error } = await supabaseClient
            .from("erp_compras")
            .update({
                status: "CANCELADA",
                updated_at: new Date().toISOString()
            })
            .eq("id", compra.id)
            .eq("empresa_id", empresaAtual.id)
            .eq("status", "RASCUNHO")
            .select("id")
            .maybeSingle();

        if (error || !data) {
            console.error(error);
            mostrarMensagem(
                mensagemLista,
                error?.message || "Não foi possível cancelar a compra.",
                true
            );
            return;
        }

        mostrarMensagem(mensagemLista, "Compra cancelada. Nenhum estoque foi movimentado.");
        await carregarCompras();
    }

    $("importarNfeXmlButton").addEventListener("click", importarNfeXml);

    $("novaCompraButton").addEventListener("click", () => {
        if (!fornecedores.length) {
            alert("Cadastre e ative pelo menos um fornecedor antes de lançar uma compra.");
            return;
        }

        if (!produtos.length) {
            alert("Cadastre e ative pelo menos um produto no ERP antes de lançar uma compra.");
            return;
        }

        novaCompra();
    });

    $("adicionarItemButton").addEventListener("click", () => {
        if (!produtos.length) {
            mostrarMensagem(mensagemForm, "Não há produtos ativos cadastrados.", true);
            return;
        }

        itensCompra.push({
            produto_id: "",
            quantidade: "1",
            custo_unitario: "0.0000",
            custo_editado: false
        });

        renderizarItens();
    });

    itensBody.addEventListener("change", (event) => {
        const controle = event.target.closest("[data-field]");
        if (!controle) return;

        const linha = controle.closest("tr");
        const indice = Number(linha?.dataset.index);
        if (!Number.isInteger(indice) || !itensCompra[indice]) return;

        sincronizarItem(indice, controle.dataset.field, controle.value);
    });

    itensBody.addEventListener("input", (event) => {
        const controle = event.target.closest("[data-field]");
        if (!controle || !["quantidade", "custo"].includes(controle.dataset.field)) {
            return;
        }

        const linha = controle.closest("tr");
        const indice = Number(linha?.dataset.index);
        if (!Number.isInteger(indice) || !itensCompra[indice]) return;

        itensCompra[indice][
            controle.dataset.field === "quantidade" ? "quantidade" : "custo_unitario"
        ] = controle.value;

        const subtotal = numero(itensCompra[indice].quantidade) *
            numero(itensCompra[indice].custo_unitario);

        const celula = linha.querySelector(".item-subtotal");
        if (celula) celula.textContent = dinheiro(subtotal);

        atualizarTotais();
    });

    itensBody.addEventListener("click", (event) => {
        const botao = event.target.closest('[data-action="remover-item"]');
        if (!botao) return;

        itensCompra.splice(Number(botao.dataset.index), 1);
        renderizarItens();
    });

    $("frete").addEventListener("input", atualizarTotais);
    $("desconto").addEventListener("input", atualizarTotais);
    $("pesquisa").addEventListener("input", renderizarCompras);
    $("filtroStatus").addEventListener("change", renderizarCompras);

    $("cancelarEdicaoButton").addEventListener("click", fecharFormulario);

    $("voltarButton").addEventListener("click", () => {
        window.location.href = "dashboard.html";
    });

    form.addEventListener("submit", salvarRascunho);

    $("listaCompras").addEventListener("click", async (event) => {
        const botao = event.target.closest("button[data-action]");
        if (!botao) return;

        const compra = compras.find((c) => c.id === botao.dataset.id);
        if (!compra) return;

        switch (botao.dataset.action) {
            case "detalhes":
                await detalhesCompra(compra);
                break;
                case "contas":
    await gerarContasCompra(compra);
    break;
            case "editar":
                await editarCompra(compra);
                break;
            case "receber":
                await receberCompra(compra);
                break;
            case "cancelar":
                await cancelarCompra(compra);
                break;
        }
    });

    try {
        const sucesso = await inicializar();
        if (sucesso) renderizarItens();
    } catch (error) {
        console.error("Erro ao iniciar Compras:", error);
        mostrarMensagem(
            mensagemLista,
            error.message || "Não foi possível iniciar o módulo de Compras.",
            true
        );
    }
});