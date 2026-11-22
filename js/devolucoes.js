document.addEventListener("DOMContentLoaded", async () => {
    if (!(await window.erpExigirModulo('ESTOQUE'))) return;
    const $ = (id) => document.getElementById(id);

    const estado = {
        usuario: null,
        empresa: null,
        vendas: [],
        vendaSelecionada: null,
        itens: [],
        creditoSessao: 0,
        processando: false
    };

    const dinheiro = (valor) =>
        Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    const dataBR = (valor) => valor
        ? new Date(valor).toLocaleString("pt-BR")
        : "—";

    function status(texto, tipo = "") {
        const el = $("devStatus");
        el.textContent = texto;
        el.className = `dev-status ${tipo}`;
    }

    function erroMensagem(erro) {
        console.error(erro);
        return erro?.message || erro?.details || "Ocorreu um erro inesperado.";
    }

    function exigirResposta(data, error) {
        if (error) throw error;
        if (data && typeof data === "object" &&
            (data.sucesso === false || data.success === false)) {
            throw new Error(data.mensagem || data.erro || "A operação não foi concluída.");
        }
        return data;
    }

    async function validarAcesso() {
        if (typeof supabaseClient === "undefined") {
            throw new Error("Cliente Supabase não foi inicializado em js/supabase.js.");
        }

        const { data: sessaoData, error: sessaoErro } =
            await supabaseClient.auth.getSession();

        if (sessaoErro || !sessaoData.session) {
            window.location.href = "index.html";
            return false;
        }

        const { data: usuario, error: usuarioErro } = await supabaseClient
            .from("erp_usuarios")
            .select("id, auth_user_id, empresa_id, nome, tipo, ativo, bloqueado")
            .eq("auth_user_id", sessaoData.session.user.id)
            .maybeSingle();

        if (usuarioErro) throw usuarioErro;

        if (!usuario || usuario.ativo !== true || usuario.bloqueado === true) {
            await supabaseClient.auth.signOut();
            window.location.href = "index.html";
            return false;
        }

        if (String(usuario.tipo || "").trim().toUpperCase() !== "ADMIN_ERP") {
            alert("Esta área é exclusiva do Administrador ERP.");
            window.location.href = "dashboard.html";
            return false;
        }

        const { data: empresa, error: empresaErro } = await supabaseClient
            .from("erp_empresas")
            .select("id, nome, nome_fantasia, ativo, bloqueado")
            .eq("id", usuario.empresa_id)
            .maybeSingle();

        if (empresaErro) throw empresaErro;

        if (!empresa || empresa.ativo !== true || empresa.bloqueado === true) {
            await supabaseClient.auth.signOut();
            window.location.href = "index.html";
            return false;
        }

        estado.usuario = usuario;
        estado.empresa = empresa;
        $("devEmpresa").textContent = empresa.nome_fantasia || empresa.nome || "Empresa";

        return true;
    }

    async function carregarVendas() {
        status("Buscando vendas da empresa...");

        const termo = $("devBusca").value.trim();

        let consulta = supabaseClient
            .from("erp_vendas")
            .select("id, numero, created_at, total, status")
            .eq("empresa_id", estado.empresa.id)
            .eq("status", "FINALIZADA")
            .order("created_at", { ascending: false })
            .limit(100);

        if (termo) {
            // Permite localizar por UUID completo ou por número.
            const ehUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(termo);
            if (ehUuid) {
                consulta = consulta.eq("id", termo);
            } else if (/^\d+$/.test(termo)) {
                consulta = consulta.eq("numero", Number(termo));
            } else {
                estado.vendas = [];
                renderizarVendas();
                status("Informe o número da venda ou um UUID completo.", "error");
                return;
            }
        }

        const { data, error } = await consulta;
        if (error) throw error;

        estado.vendas = data || [];
        renderizarVendas();
        $("devTotalVendas").textContent = String(estado.vendas.length);
        status(`${estado.vendas.length} venda(s) encontrada(s).`, "success");
    }

    function renderizarVendas() {
        const tbody = $("devListaVendas");
        tbody.replaceChildren();

        if (!estado.vendas.length) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = 5;
            td.textContent = "Nenhuma venda encontrada.";
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }

        estado.vendas.forEach((venda) => {
            const tr = document.createElement("tr");

            const numero = venda.numero ?? "—";
            const valores = [
                `#${numero}`,
                dataBR(venda.created_at),
                dinheiro(venda.total),
                venda.status || "—"
            ];

            valores.forEach((valor) => {
                const td = document.createElement("td");
                td.textContent = valor;
                tr.appendChild(td);
            });

            const acao = document.createElement("td");
            const botao = document.createElement("button");
            botao.type = "button";
            botao.className = "dev-button";
            botao.textContent = "Selecionar";
            botao.addEventListener("click", () => selecionarVenda(venda));
            acao.appendChild(botao);
            tr.appendChild(acao);

            tbody.appendChild(tr);
        });
    }

    async function selecionarVenda(venda) {
        try {
            status("Carregando itens da venda...");

            const { data: itens, error: erroItens } = await supabaseClient
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
        produto:erp_produtos!erp_venda_itens_produto_id_fkey(
            nome,
            codigo
        )
    `)
    .eq("venda_id", venda.id)
    .eq("empresa_id", estado.empresa.id);

if (erroItens) throw erroItens;

            if (!itens?.length) {
                throw new Error("Essa venda não possui itens disponíveis para consulta.");
            }

            const ids = itens.map((item) => item.id);

            const { data: devolvidos, error: devolvidosErro } = await supabaseClient
                .from("erp_devolucao_itens")
                .select("venda_item_id, quantidade")
                .eq("empresa_id", estado.empresa.id)
                .in("venda_item_id", ids);

            if (devolvidosErro) {
                throw new Error(
                    "Não foi possível verificar as devoluções anteriores. " +
                    "Confira as permissões de leitura das devoluções no Supabase."
                );
            }

            const quantidadesDevolvidas = new Map();

            (devolvidos || []).forEach((item) => {
                quantidadesDevolvidas.set(
                    item.venda_item_id,
                    (quantidadesDevolvidas.get(item.venda_item_id) || 0) +
                    Number(item.quantidade || 0)
                );
            });

            estado.vendaSelecionada = venda;
            estado.itens = itens.map((item) => ({
                ...item,
                quantidadeOriginal: Number(item.quantidade || 0),
                quantidadeDevolvida: quantidadesDevolvidas.get(item.id) || 0,
                quantidadeAgora: 0,
                reintegrarEstoque: false
            }));

            $("devTituloVenda").textContent = `Venda #${venda.numero ?? "—"}`;
            $("devInfoVenda").textContent =
                `${dataBR(venda.created_at)} · Total original ${dinheiro(venda.total)}`;

            $("devMotivo").value = "";
            $("devAreaVenda").hidden = false;
            $("devResultado").hidden = true;

            renderizarItens();
            calcularEstimativa();
            $("devAreaVenda").scrollIntoView({ behavior: "smooth", block: "start" });
            status("Venda carregada. Informe as quantidades que serão devolvidas.", "success");
        } catch (erro) {
            status(erroMensagem(erro), "error");
        }
    }

    function renderizarItens() {
    const tbody = $("devItensVenda");
    tbody.replaceChildren();

    estado.itens.forEach((item, indice) => {
        const tr = document.createElement("tr");
        const produto = item.produto?.nome || `Produto ${item.produto_id}`;

        const original = Number(item.quantidadeOriginal || 0);
        const devolvido = Number(item.quantidadeDevolvida || 0);
        const restantes = Math.max(0, original - devolvido);

        const tdProduto = document.createElement("td");
        tdProduto.textContent = produto;
        tr.appendChild(tdProduto);

        const tdComprado = document.createElement("td");
        tdComprado.textContent = String(original);
        tr.appendChild(tdComprado);

        const tdUnitario = document.createElement("td");
        tdUnitario.textContent = dinheiro(item.preco_unitario);
        tr.appendChild(tdUnitario);

        const tdDevolvido = document.createElement("td");
        tdDevolvido.textContent = String(devolvido);
        tr.appendChild(tdDevolvido);

        // Quantidade ainda disponível para devolver.
        const tdDisponivel = document.createElement("td");
        tdDisponivel.textContent = String(restantes);
        tdDisponivel.style.fontWeight = "700";
        tr.appendChild(tdDisponivel);

        const tdQuantidade = document.createElement("td");
        const quantidade = document.createElement("input");

        quantidade.type = "number";
        quantidade.min = "0";
        quantidade.max = String(restantes);
        quantidade.step = "0.0001";
        quantidade.value = String(
            Math.min(restantes, Math.max(0, Number(item.quantidadeAgora || 0)))
        );
        quantidade.setAttribute(
            "aria-label",
            `Quantidade a devolver: ${produto}. Disponível: ${restantes}`
        );
        quantidade.disabled = restantes <= 0;

        quantidade.addEventListener("input", () => {
            let valor = Number(quantidade.value || 0);

            if (!Number.isFinite(valor)) valor = 0;

            valor = Math.min(restantes, Math.max(0, valor));

            item.quantidadeAgora = valor;
            quantidade.value = String(valor);

            calcularEstimativa();
        });

        tdQuantidade.appendChild(quantidade);
        tr.appendChild(tdQuantidade);

        const tdEstoque = document.createElement("td");
        const label = document.createElement("label");
        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.checked = Boolean(item.reintegrarEstoque);
        checkbox.disabled = restantes <= 0;

        checkbox.addEventListener("change", () => {
            item.reintegrarEstoque = checkbox.checked;
        });

        label.append(checkbox, document.createTextNode(" Sim"));
        tdEstoque.appendChild(label);
        tr.appendChild(tdEstoque);

        tr.dataset.indice = String(indice);
        tbody.appendChild(tr);
    });

    atualizarAvisoDevolucao();
}

function atualizarAvisoDevolucao() {
    const selecionados = estado.itens.filter(
        item => Number(item.quantidadeAgora || 0) > 0
    );

    const aviso = $("devAvisoDevolucao");

    if (!aviso) return;

    if (!selecionados.length) {
        aviso.textContent =
            "Informe a quantidade desta devolução. " +
            "As quantidades já devolvidas são descontadas automaticamente.";
        return;
    }

    const resumo = selecionados.map(item => {
        const produto = item.produto?.nome || "Produto";
        const original = Number(item.quantidadeOriginal || 0);
        const devolvido = Number(item.quantidadeDevolvida || 0);
        const atual = Number(item.quantidadeAgora || 0);
        const restante = Math.max(0, original - devolvido - atual);

        return `${produto}: ${atual} nesta devolução; ${restante} restante(s) após confirmar`;
    });

    aviso.textContent = resumo.join(" | ");
}

    function calcularEstimativa() {
        let total = 0;

        estado.itens.forEach((item) => {
            const restante = Math.max(
                0,
                item.quantidadeOriginal - item.quantidadeDevolvida
            );

            const qtd = Math.min(restante, Math.max(0, Number(item.quantidadeAgora || 0)));
            const unitario = Number(item.preco_unitario || 0);
            total += qtd * unitario;
        });

        $("devValorEstimado").textContent = dinheiro(total);
        
        atualizarAvisoDevolucao();
    }

    function normalizarResposta(data) {
        if (Array.isArray(data)) return data[0] || {};
        return data || {};
    }

    // =====================================================
    // VALES DE CRÉDITO — CONSULTA, IMPRESSÃO E REIMPRESSÃO
    // Esta área nunca registra nem altera vales.
    // =====================================================

    let valeConsultado = null;

    function criarAreaVales() {
        if ($("devConsultaVales")) return;

        const painel = document.createElement("section");
        painel.id = "devConsultaVales";
        painel.style.cssText = [
            "margin-top:24px",
            "padding:20px",
            "border:1px solid #dbe3ed",
            "border-radius:14px",
            "background:#fff",
            "color:#172b4d"
        ].join(";");

        painel.innerHTML = `
            <h3 style="margin:0 0 8px;font-size:20px">
                Consulta de vales de crédito
            </h3>
            <p style="margin:0 0 16px;color:#526176">
                Consulte um vale existente, confira seu saldo e imprima
                ou reimprima o comprovante.
            </p>

            <form id="devFormConsultaVale"
                  style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
                <input
                    id="devCodigoConsulta"
                    type="text"
                    maxlength="64"
                    autocomplete="off"
                    placeholder="Digite o código do vale"
                    aria-label="Código do vale de crédito"
                    required
                    style="flex:1;min-width:220px;padding:12px;border:1px solid #cbd5e1;border-radius:8px"
                >
                <button type="submit" class="dev-button">
                    Consultar vale
                </button>
            </form>

            <div id="devConsultaStatus" role="status" aria-live="polite"
                 style="margin-bottom:12px"></div>

            <div id="devDadosVale" hidden>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px">
                    <div style="padding:14px;background:#f1f5f9;border-radius:9px">
                        <div style="font-size:12px;color:#526176">Código do vale</div>
                        <strong id="devValeCodigo" style="overflow-wrap:anywhere"></strong>
                    </div>
                    <div style="padding:14px;background:#f1f5f9;border-radius:9px">
                        <div style="font-size:12px;color:#526176">Valor original</div>
                        <strong id="devValeOriginal"></strong>
                    </div>
                    <div style="padding:14px;background:#f1f5f9;border-radius:9px">
                        <div style="font-size:12px;color:#526176">Saldo atual</div>
                        <strong id="devValeSaldo"></strong>
                    </div>
                    <div style="padding:14px;background:#f1f5f9;border-radius:9px">
                        <div style="font-size:12px;color:#526176">Status</div>
                        <strong id="devValeStatus"></strong>
                    </div>
                    <div style="padding:14px;background:#f1f5f9;border-radius:9px">
                        <div style="font-size:12px;color:#526176">Emissão</div>
                        <strong id="devValeData"></strong>
                    </div>
                </div>

                <button type="button" class="dev-button" id="devImprimirVale">
                    Imprimir / reimprimir comprovante
                </button>
            </div>
        `;

        const resultado = $("devResultado");

        if (resultado?.parentNode) {
            resultado.insertAdjacentElement("afterend", painel);
        } else {
            $("devRegistrar")?.parentNode?.appendChild(painel);
        }

        $("devFormConsultaVale").addEventListener("submit", async (evento) => {
            evento.preventDefault();
            await consultarVale($("devCodigoConsulta").value);
        });

        $("devImprimirVale").addEventListener("click", () => {
            if (valeConsultado?.codigo) {
                imprimirValeExistente(valeConsultado.codigo);
            }
        });
    }

    async function buscarValeExistente(codigoInformado) {
        const codigo = String(codigoInformado || "").trim().toUpperCase();

        if (!codigo) {
            throw new Error("Digite o código do vale.");
        }

        // Consulta somente leitura e limitada à empresa autenticada.
        const { data, error } = await supabaseClient
            .from("erp_vales_credito")
            .select(`
                id,
                empresa_id,
                devolucao_id,
                codigo,
                valor_original,
                saldo,
                status,
                created_at
            `)
            .eq("empresa_id", estado.empresa.id)
            .eq("codigo", codigo)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            throw new Error(
                "Vale não encontrado nesta empresa. Confira o código digitado."
            );
        }

        return data;
    }

    async function consultarVale(codigoInformado) {
        const areaStatus = $("devConsultaStatus");
        const dados = $("devDadosVale");

        dados.hidden = true;
        valeConsultado = null;
        areaStatus.textContent = "Consultando vale...";

        try {
            const vale = await buscarValeExistente(codigoInformado);

            valeConsultado = vale;

            $("devValeCodigo").textContent = vale.codigo;
            $("devValeOriginal").textContent = dinheiro(vale.valor_original);
            $("devValeSaldo").textContent = dinheiro(vale.saldo);
            $("devValeStatus").textContent = vale.status || "—";
            $("devValeData").textContent = dataBR(vale.created_at);

            $("devCodigoConsulta").value = vale.codigo;
            dados.hidden = false;
            areaStatus.textContent = "Vale localizado. Dados atualizados do banco.";
        } catch (erro) {
            areaStatus.textContent = erroMensagem(erro);
            status(erroMensagem(erro), "error");
        }
    }

    async function imprimirValeExistente(codigo) {
        // Abrir a janela diretamente no clique para reduzir bloqueios do navegador.
        const janela = window.open("", "_blank", "width=820,height=720");

        if (!janela) {
            status(
                "O navegador bloqueou a impressão. Permita janelas pop-up para este sistema.",
                "error"
            );
            return;
        }

        janela.document.write(`
            <!doctype html>
            <html lang="pt-BR">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Comprovante de vale de crédito</title>
                <style>
                    * { box-sizing: border-box; }
                    body {
                        font-family: Arial, Helvetica, sans-serif;
                        color: #172b4d;
                        margin: 0;
                        padding: 32px;
                        background: #fff;
                    }
                    .comprovante {
                        max-width: 680px;
                        margin: 0 auto;
                        border: 1px solid #dbe3ed;
                        border-radius: 14px;
                        padding: 30px;
                    }
                    .marca {
                        font-size: 12px;
                        letter-spacing: 2px;
                        color: #64748b;
                        font-weight: bold;
                        text-transform: uppercase;
                    }
                    h1 { margin: 10px 0 4px; font-size: 26px; }
                    .subtitulo { color: #64748b; margin: 0 0 26px; }
                    .codigo {
                        border: 2px dashed #94a3b8;
                        border-radius: 10px;
                        padding: 18px;
                        text-align: center;
                        margin: 22px 0;
                    }
                    .codigo small { display: block; color: #64748b; }
                    .codigo strong {
                        display: block;
                        font-size: 23px;
                        letter-spacing: 1px;
                        overflow-wrap: anywhere;
                        margin-top: 8px;
                    }
                    .linha {
                        display: flex;
                        justify-content: space-between;
                        gap: 20px;
                        padding: 13px 0;
                        border-bottom: 1px solid #e2e8f0;
                    }
                    .linha span { color: #64748b; }
                    .linha strong { text-align: right; overflow-wrap: anywhere; }
                    .saldo { font-size: 20px; }
                    .aviso {
                        margin-top: 24px;
                        padding: 14px;
                        background: #f1f5f9;
                        border-radius: 8px;
                        font-size: 12px;
                        line-height: 1.5;
                    }
                    .rodape {
                        text-align: center;
                        color: #64748b;
                        font-size: 11px;
                        margin-top: 25px;
                    }
                    .acoes { text-align: center; margin-top: 24px; }
                    button {
                        border: 0;
                        border-radius: 8px;
                        padding: 12px 20px;
                        background: #0b5ed7;
                        color: white;
                        font-weight: bold;
                        cursor: pointer;
                    }
                    @media print {
                        body { padding: 0; }
                        .comprovante {
                            border: 0;
                            border-radius: 0;
                            padding: 12px;
                        }
                        .acoes { display: none; }
                        @page { margin: 12mm; }
                    }
                </style>
            </head>
            <body>
                <main class="comprovante">
                    <div class="marca">River Tech · ERP</div>
                    <h1>Vale de crédito</h1>
                    <p class="subtitulo">Comprovante de crédito por devolução</p>
                    <div id="conteudo">Carregando os dados do vale...</div>
                    <div class="rodape">
                        Guarde este código para utilizar o crédito conforme as regras da empresa.
                    </div>
                    <div class="acoes">
                        <button onclick="window.print()">Imprimir comprovante</button>
                    </div>
                </main>
            </body>
            </html>
        `);
        janela.document.close();

        try {
            const vale = await buscarValeExistente(codigo);
            const empresa = estado.empresa.nome_fantasia || estado.empresa.nome || "Empresa";
            const conteudo = janela.document.getElementById("conteudo");

            if (!conteudo) throw new Error("Não foi possível preparar o comprovante.");

            const criarLinha = (rotulo, valor, classe = "") => {
                const linha = janela.document.createElement("div");
                linha.className = "linha";

                const texto = janela.document.createElement("span");
                texto.textContent = rotulo;

                const valorEl = janela.document.createElement("strong");
                valorEl.textContent = valor;

                if (classe) valorEl.className = classe;

                linha.append(texto, valorEl);
                return linha;
            };

            conteudo.replaceChildren();

            const empresaEl = janela.document.createElement("p");
            empresaEl.textContent = empresa;
            empresaEl.style.fontWeight = "bold";
            conteudo.appendChild(empresaEl);

            const codigoBox = janela.document.createElement("div");
            codigoBox.className = "codigo";

            const codigoLegenda = janela.document.createElement("small");
            codigoLegenda.textContent = "CÓDIGO DO VALE";

            const codigoValor = janela.document.createElement("strong");
            codigoValor.textContent = vale.codigo;

            codigoBox.append(codigoLegenda, codigoValor);
            conteudo.appendChild(codigoBox);

            conteudo.append(
                criarLinha("Valor original", dinheiro(vale.valor_original)),
                criarLinha("Saldo atual", dinheiro(vale.saldo), "saldo"),
                criarLinha("Situação", vale.status || "—"),
                criarLinha("Data de emissão", dataBR(vale.created_at)),
                criarLinha("Referência da devolução", vale.devolucao_id || "—")
            );

            const aviso = janela.document.createElement("div");
            aviso.className = "aviso";
            aviso.textContent =
                "Este comprovante representa um vale já existente. " +
                "A reimpressão não gera novo crédito nem altera o saldo. " +
                "O saldo e a situação podem mudar quando o vale for utilizado.";
            conteudo.appendChild(aviso);

            janela.document.title = `Vale de crédito ${vale.codigo}`;
            status("Comprovante preparado com os dados atuais do vale.", "success");
        } catch (erro) {
            janela.close();
            status(erroMensagem(erro), "error");
        }
    }

    async function registrarDevolucao() {
        if (estado.processando) return;

        const motivo = $("devMotivo").value.trim();
        if (!motivo) {
            status("Informe o motivo da devolução.", "error");
            $("devMotivo").focus();
            return;
        }

        const itensSelecionados = estado.itens
            .map((item) => {
                const restantes = Math.max(
                    0,
                    item.quantidadeOriginal - item.quantidadeDevolvida
                );
                const quantidade = Math.min(
                    restantes,
                    Math.max(0, Number(item.quantidadeAgora || 0))
                );

                return {
                    venda_item_id: item.id,
                    quantidade,
                    reintegrar_estoque: Boolean(item.reintegrarEstoque)
                };
            })
            .filter((item) => item.quantidade > 0);

        if (!itensSelecionados.length) {
            status("Informe uma quantidade maior que zero em pelo menos um item.", "error");
            return;
        }

        const confirmou = window.confirm(
            "Confirmar a devolução e gerar o vale de crédito?\n\n" +
            "Esta operação registrará a devolução no banco de dados."
        );

        if (!confirmou) return;

        estado.processando = true;
        $("devRegistrar").disabled = true;
        $("devRegistrar").textContent = "Registrando...";
        status("Registrando devolução no Supabase...");

        try {
            const { data, error } = await supabaseClient.rpc(
                "erp_registrar_devolucao",
                {
                    p_venda_id: estado.vendaSelecionada.id,
                    p_itens: itensSelecionados,
                    p_motivo: motivo
                }
            );

            exigirResposta(data, error);
            const resultado = normalizarResposta(data);

            const codigo = resultado.codigo_vale ||
                resultado.vale?.codigo ||
                resultado.codigo ||
                "";

            const valor = Number(
                resultado.valor_credito ??
                resultado.vale?.valor_original ??
                resultado.valor ??
                0
            );

            if (!codigo) {
                throw new Error(
                    "A função respondeu sem um código de vale. " +
                    "Confira o retorno de erp_registrar_devolucao no Supabase antes de repetir a operação."
                );
            }

            estado.creditoSessao += valor;
            $("devCreditoSessao").textContent = dinheiro(estado.creditoSessao);
            $("devResultadoTexto").textContent =
                `Devolução registrada. Crédito informado pelo servidor: ${dinheiro(valor)}.`;
            $("devCodigoVale").textContent = codigo;
            $("devSaldoVale").textContent =
                `Valor original do vale: ${dinheiro(valor)}. Consulte o saldo atualizado no PDV.`;
            $("devResultado").hidden = false;
            // Mostra o vale recém-emitido consultando o registro existente.
            criarAreaVales();
            $("devCodigoConsulta").value = codigo;
            await consultarVale(codigo);

            status("Devolução concluída e vale gerado.", "success");

            await carregarVendas();
            await selecionarVenda(estado.vendaSelecionada);
        } catch (erro) {
            status(erroMensagem(erro), "error");
        } finally {
            estado.processando = false;
            $("devRegistrar").disabled = false;
            $("devRegistrar").textContent = "Registrar devolução e gerar vale";
        }
    }

    $("devBuscar").addEventListener("click", () => carregarVendas().catch((e) => status(erroMensagem(e), "error")));
    $("devAtualizar").addEventListener("click", () => carregarVendas().catch((e) => status(erroMensagem(e), "error")));
    $("devBusca").addEventListener("keydown", (evento) => {
        if (evento.key === "Enter") {
            carregarVendas().catch((e) => status(erroMensagem(e), "error"));
        }
    });

    $("devLimparSelecao").addEventListener("click", () => {
        $("devAreaVenda").hidden = true;
        estado.vendaSelecionada = null;
        estado.itens = [];
    });

    $("devRegistrar").addEventListener("click", registrarDevolucao);

    $("devCopiarVale").addEventListener("click", async () => {
        const codigo = $("devCodigoVale").textContent;
        if (!codigo || codigo === "—") return;

        try {
            await navigator.clipboard.writeText(codigo);
            status("Código do vale copiado.", "success");
        } catch {
            status("Não foi possível copiar automaticamente. Selecione o código e copie manualmente.");
        }
    });

    try {
        const acessoPermitido = await validarAcesso();
if (!acessoPermitido) return;

criarAreaVales();
await carregarVendas();
    } catch (erro) {
        status(erroMensagem(erro), "error");
    }
});