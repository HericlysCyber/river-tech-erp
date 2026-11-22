"use strict";

/* =========================================================
   RIVER TECH ERP — HISTÓRICO DE CAIXAS
   Arquivo: js/historico-caixas.js
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    if (!(await window.erpExigirModulo("RELATORIOS"))) return;

    $("btnVoltar")?.addEventListener("click", () => {
        window.location.href = "dashboard.html";
    });

    iniciarHistoricoCaixas();
});

let clienteSupabase = null;
let usuarioERP = null;
let empresaERP = null;

let caixasOriginais = [];
let caixasFiltrados = [];

let pdvsPorId = new Map();
let usuariosPorId = new Map();

let caixaSelecionado = null;

const $ = (id) => document.getElementById(id);

/* =========================================================
   FUNÇÕES AUXILIARES
   ========================================================= */

function escapar(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caractere]);
}

function dinheiro(valor) {
    return Number(valor ?? 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function dataLocalISO(data = new Date()) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function formatarData(valor) {
    if (!valor) return "—";

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) return "—";

    return data.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function normalizarStatus(status) {
    const valor = String(status ?? "").trim().toUpperCase();

    if (["ABERTO", "OPEN", "ATIVO"].includes(valor)) return "aberto";
    if (["FECHADO", "CLOSED", "ENCERRADO"].includes(valor)) return "fechado";

    return valor.toLowerCase() || "indefinido";
}

function nomeStatus(status) {
    const normalizado = normalizarStatus(status);

    if (normalizado === "aberto") return "Aberto";
    if (normalizado === "fechado") return "Fechado";

    return normalizado.charAt(0).toUpperCase() + normalizado.slice(1);
}

function nomePdv(pdvId) {
    if (!pdvId) return "PDV não identificado";

    const pdv = pdvsPorId.get(String(pdvId));

    if (!pdv) return "PDV " + String(pdvId).slice(0, 8);

    return pdv.nome || pdv.codigo || "PDV " + String(pdv.id).slice(0, 8);
}

function nomeOperador(usuarioId) {
    if (!usuarioId) return "Não identificado";

    const usuario = usuariosPorId.get(String(usuarioId));

    if (!usuario) return "Usuário não identificado";

    return usuario.nome || usuario.email || "Usuário";
}

function mostrarMensagem(mensagem, tipo = "info") {
    const elemento = $("mensagem");

    if (!elemento) return;

    elemento.textContent = mensagem;
    elemento.style.display = "block";
    elemento.dataset.tipo = tipo;
}

function ocultarMensagem() {
    const elemento = $("mensagem");

    if (!elemento) return;

    elemento.textContent = "";
    elemento.style.display = "none";
    delete elemento.dataset.tipo;
}

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

async function iniciarHistoricoCaixas() {
    try {
        mostrarMensagem("Conectando ao Supabase...", "info");

        clienteSupabase = window.supabaseClient;

        if (!clienteSupabase) {
            throw new Error(
                "Cliente Supabase não encontrado. Confira js/supabase.js."
            );
        }

        const { data, error } = await clienteSupabase.auth.getSession();

        if (error) throw error;

        if (!data?.session) {
            window.location.href = "index.html";
            return;
        }

        mostrarMensagem("Validando acesso ao ERP...", "info");

        const acessoValido = await validarAcesso();

        if (!acessoValido) return;

        configurarEventos();

        mostrarMensagem("Carregando PDVs e usuários...", "info");

        await carregarReferencias();

        mostrarMensagem("Carregando histórico de caixas...", "info");

        await carregarCaixas();

    } catch (erro) {
        console.error("[Histórico de Caixas] Erro:", erro);

        mostrarMensagem(
            "Não foi possível carregar o histórico: " +
            (erro.message || String(erro)),
            "error"
        );

        if ($("nomeEmpresa")) {
            $("nomeEmpresa").textContent = "Erro ao carregar empresa";
        }

        if ($("nomeUsuario")) {
            $("nomeUsuario").textContent =
                erro.message || "Consulte o console do navegador.";
        }
    }
}

/* =========================================================
   VALIDAR USUÁRIO E EMPRESA
   ========================================================= */

async function validarAcesso() {
    const {
        data: { user },
        error: erroUsuario
    } = await clienteSupabase.auth.getUser();

    if (erroUsuario) throw erroUsuario;

    if (!user) {
        window.location.href = "index.html";
        return false;
    }

    const { data: usuario, error } = await clienteSupabase
        .from("erp_usuarios")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (error) {
        throw new Error(
            "Não foi possível consultar o usuário do ERP: " + error.message
        );
    }

    if (!usuario) {
        throw new Error("Seu usuário não foi encontrado em erp_usuarios.");
    }

    if (usuario.ativo !== true || usuario.bloqueado === true) {
        throw new Error("Seu acesso ao ERP está inativo ou bloqueado.");
    }

    if (String(usuario.tipo ?? "").trim().toUpperCase() !== "ADMIN_ERP") {
        if (String(usuario.tipo ?? "").trim().toUpperCase() === "PDV") {
            window.location.href = "pdv/login.html";
            return false;
        }

        throw new Error("Esta página é exclusiva do administrador do ERP.");
    }

    if (!usuario.empresa_id) {
        throw new Error("O usuário não possui uma empresa vinculada.");
    }

    const { data: empresa, error: erroEmpresa } = await clienteSupabase
        .from("erp_empresas")
        .select("*")
        .eq("id", usuario.empresa_id)
        .maybeSingle();

    if (erroEmpresa) {
        throw new Error(
            "Não foi possível consultar a empresa: " + erroEmpresa.message
        );
    }

    if (!empresa) {
        throw new Error("A empresa vinculada ao usuário não foi encontrada.");
    }

    if (empresa.ativo !== true || empresa.bloqueado === true) {
        throw new Error("A empresa está inativa ou bloqueada.");
    }

    usuarioERP = usuario;
    empresaERP = empresa;

    if ($("nomeEmpresa")) {
        $("nomeEmpresa").textContent =
            empresa.nome_fantasia ||
            empresa.nome ||
            empresa.razao_social ||
            "Minha empresa";
    }

    if ($("nomeUsuario")) {
        $("nomeUsuario").textContent = usuario.nome || user.email || "Administrador";
    }

    return true;
}

/* =========================================================
   EVENTOS
   ========================================================= */

function configurarEventos() {
    $("btnAtualizar")?.addEventListener("click", carregarCaixas);

    $("btnFiltrar")?.addEventListener("click", aplicarFiltros);
    $("pesquisa")?.addEventListener("input", aplicarFiltros);

    $("dataInicio")?.addEventListener("change", aplicarFiltros);
    $("dataFim")?.addEventListener("change", aplicarFiltros);
    $("filtroPdv")?.addEventListener("change", aplicarFiltros);
    $("filtroStatus")?.addEventListener("change", aplicarFiltros);

    $("btnFecharModal")?.addEventListener("click", fecharModal);
    $("btnFecharDetalhes")?.addEventListener("click", fecharModal);

    $("btnReimprimirRelatorio")?.addEventListener("click", () => {
        gerarRelatorioHistorico("imprimir");
    });

    $("btnSalvarPDF")?.addEventListener("click", () => {
        gerarRelatorioHistorico("pdf");
    });

    $("modalCaixa")?.addEventListener("click", evento => {
        if (evento.target === $("modalCaixa")) fecharModal();
    });

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape") fecharModal();
    });

    $("listaCaixas")?.addEventListener("click", evento => {
        const botao = evento.target.closest("[data-caixa-id]");

        if (!botao) return;

        abrirDetalhes(botao.dataset.caixaId);
    });
}

/* =========================================================
   REFERÊNCIAS
   ========================================================= */

async function carregarReferencias() {
    pdvsPorId.clear();
    usuariosPorId.clear();

    const [resultadoPDVs, resultadoUsuarios] = await Promise.all([
        clienteSupabase
            .from("erp_pdvs")
            .select("id, nome, codigo")
            .eq("empresa_id", empresaERP.id),

        clienteSupabase
            .from("erp_usuarios")
            .select("id, auth_user_id, nome, email")
            .eq("empresa_id", empresaERP.id)
    ]);

    if (resultadoPDVs.error) {
        throw new Error("Erro ao carregar PDVs: " + resultadoPDVs.error.message);
    }

    if (resultadoUsuarios.error) {
        throw new Error(
            "Erro ao carregar usuários: " + resultadoUsuarios.error.message
        );
    }

    for (const pdv of resultadoPDVs.data || []) {
        pdvsPorId.set(String(pdv.id), pdv);
    }

    for (const usuario of resultadoUsuarios.data || []) {
        usuariosPorId.set(String(usuario.id), usuario);

        if (usuario.auth_user_id) {
            usuariosPorId.set(String(usuario.auth_user_id), usuario);
        }
    }

    preencherFiltroPDV(resultadoPDVs.data || []);
}

function preencherFiltroPDV(pdvs) {
    const select = $("filtroPdv");

    if (!select) return;

    const valorAnterior = select.value;

    select.innerHTML = '<option value="">Todos os PDVs</option>';

    for (const pdv of pdvs) {
        const opcao = document.createElement("option");

        opcao.value = String(pdv.id);
        opcao.textContent = pdv.nome || pdv.codigo || "PDV " + pdv.id;

        select.appendChild(opcao);
    }

    if (
        valorAnterior &&
        [...select.options].some(opcao => opcao.value === valorAnterior)
    ) {
        select.value = valorAnterior;
    }
}

/* =========================================================
   CARREGAR CAIXAS
   ========================================================= */

async function carregarCaixas() {
    try {
        mostrarMensagem("Carregando histórico de caixas...", "info");

        const { data, error } = await clienteSupabase
            .from("erp_caixas")
            .select(`
                id,
                created_at,
                empresa_id,
                pdv_id,
                usuario_id,
                data_abertura,
                data_fechamento,
                valor_inicial,
                valor_dinheiro,
                valor_pix,
                valor_cartao,
                valor_outros,
                valor_contado_dinheiro,
                diferenca_caixa,
                fechado_por_usuario_id,
                status,
                observacao
            `)
            .eq("empresa_id", empresaERP.id)
            .order("data_abertura", { ascending: false })
            .limit(2000);

        if (error) {
            throw new Error("Erro ao consultar caixas: " + error.message);
        }

        caixasOriginais = data || [];

        aplicarFiltros();

    } catch (erro) {
        console.error("[Histórico de Caixas] Consulta:", erro);

        mostrarMensagem(
            erro.message || "Não foi possível carregar os caixas.",
            "error"
        );
    }
}

/* =========================================================
   FILTROS
   ========================================================= */

function aplicarFiltros() {
    const inicio = $("dataInicio")?.value || "";
    const fim = $("dataFim")?.value || "";
    const pdvId = $("filtroPdv")?.value || "";
    const status = $("filtroStatus")?.value || "";
    const pesquisa = ($("pesquisa")?.value || "").trim().toLowerCase();

    caixasFiltrados = caixasOriginais.filter(caixa => {
        const data = caixa.data_abertura
            ? dataLocalISO(new Date(caixa.data_abertura))
            : "";

        if (inicio && data && data < inicio) return false;
        if (fim && data && data > fim) return false;

        if (pdvId && String(caixa.pdv_id) !== pdvId) return false;

        if (status && normalizarStatus(caixa.status) !== status) return false;

        if (pesquisa) {
            const texto = [
                caixa.id,
                nomePdv(caixa.pdv_id),
                nomeOperador(caixa.usuario_id),
                nomeOperador(caixa.fechado_por_usuario_id),
                caixa.status,
                caixa.observacao
            ].join(" ").toLowerCase();

            if (!texto.includes(pesquisa)) return false;
        }

        return true;
    });

    renderizarResumo(caixasFiltrados);
    renderizarTabela(caixasFiltrados);
}

/* =========================================================
   RESUMO
   ========================================================= */

function totalVendasRegistrado(caixa) {
    return (
        Number(caixa.valor_dinheiro || 0) +
        Number(caixa.valor_pix || 0) +
        Number(caixa.valor_cartao || 0) +
        Number(caixa.valor_outros || 0)
    );
}

function renderizarResumo(caixas) {
    const abertos = caixas.filter(
        caixa => normalizarStatus(caixa.status) === "aberto"
    );

    const fechados = caixas.filter(
        caixa => normalizarStatus(caixa.status) === "fechado"
    );

    const diferencas = fechados.reduce((total, caixa) => {
        return total + Math.abs(Number(caixa.diferenca_caixa || 0));
    }, 0);

    if ($("totalCaixas")) $("totalCaixas").textContent = caixas.length;
    if ($("caixasAbertos")) $("caixasAbertos").textContent = abertos.length;
    if ($("caixasFechados")) $("caixasFechados").textContent = fechados.length;

    if ($("totalDiferencas")) {
        $("totalDiferencas").textContent = dinheiro(diferencas);
    }

    if ($("contagemResultados")) {
        $("contagemResultados").textContent = `${caixas.length} registro(s)`;
    }
}

/* =========================================================
   TABELA — 10 COLUNAS NA MESMA ORDEM DO HTML
   ========================================================= */

function renderizarTabela(caixas) {
    const tabela = $("listaCaixas");

    if (!tabela) return;

    if ($("contagemResultados")) {
        $("contagemResultados").textContent = `${caixas.length} registro(s)`;
    }

    if (!caixas.length) {
        tabela.innerHTML = `
            <tr>
                <td colspan="10" class="table-message">
                    Nenhum caixa encontrado para os filtros selecionados.
                </td>
            </tr>
        `;

        ocultarMensagem();
        return;
    }

    tabela.innerHTML = caixas.map(caixa => {
        const status = normalizarStatus(caixa.status);

        const classeStatus = status === "aberto"
            ? "aberto"
            : status === "fechado"
                ? "fechado"
                : "";

        const vendas = totalVendasRegistrado(caixa);
        const diferenca = caixa.diferenca_caixa == null
            ? "—"
            : dinheiro(caixa.diferenca_caixa);

        return `
            <tr>
                <td>#${escapar(caixa.id)}</td>

                <td>${escapar(nomePdv(caixa.pdv_id))}</td>

                <td>${escapar(nomeOperador(caixa.usuario_id))}</td>

                <td>${escapar(formatarData(caixa.data_abertura))}</td>

                <td>
                    ${escapar(
                        caixa.data_fechamento
                            ? formatarData(caixa.data_fechamento)
                            : "Em andamento"
                    )}
                </td>

                <td>${escapar(dinheiro(caixa.valor_inicial))}</td>

                <td>${escapar(dinheiro(vendas))}</td>

                <td>${escapar(diferenca)}</td>

                <td>
                    <span class="status-pill ${classeStatus}">
                        ${escapar(nomeStatus(caixa.status))}
                    </span>
                </td>

                <td>
                    <button
                        type="button"
                        class="btn btn-light"
                        data-caixa-id="${escapar(caixa.id)}"
                    >
                        Ver detalhes
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    ocultarMensagem();
}

/* =========================================================
   DETALHES DO CAIXA
   ========================================================= */

function abrirDetalhes(id) {
    const caixa = caixasOriginais.find(
        item => String(item.id) === String(id)
    );

    if (!caixa) {
        mostrarMensagem("Não foi possível encontrar os dados deste caixa.", "error");
        return;
    }

    caixaSelecionado = caixa;

    const titulo = $("detalheTitulo");
    const detalhes = $("detalhesCaixa");
    const modal = $("modalCaixa");

    if (!detalhes || !modal) return;

    if (titulo) titulo.textContent = `Detalhes do caixa #${caixa.id}`;

    const status = normalizarStatus(caixa.status);
    const classeStatus = status === "aberto"
        ? "aberto"
        : status === "fechado"
            ? "fechado"
            : "";

    const operadorAbertura = nomeOperador(caixa.usuario_id);

    const operadorFechamento = caixa.fechado_por_usuario_id
        ? nomeOperador(caixa.fechado_por_usuario_id)
        : "Não informado";

    const vendasDinheiro = Number(caixa.valor_dinheiro || 0);
    const vendasPix = Number(caixa.valor_pix || 0);
    const vendasCartao = Number(caixa.valor_cartao || 0);
    const vendasOutros = Number(caixa.valor_outros || 0);

    const totalVendas =
        vendasDinheiro + vendasPix + vendasCartao + vendasOutros;

    const valorInicial = Number(caixa.valor_inicial || 0);

    const valorContado = caixa.valor_contado_dinheiro == null
        ? null
        : Number(caixa.valor_contado_dinheiro);

    const diferenca = caixa.diferenca_caixa == null
        ? null
        : Number(caixa.diferenca_caixa);

    detalhes.innerHTML = `
        <div class="cash-detail-item">
            <span>Caixa</span>
            <strong>#${escapar(caixa.id)}</strong>
        </div>

        <div class="cash-detail-item">
            <span>Status</span>
            <strong>
                <span class="status-pill ${classeStatus}">
                    ${escapar(nomeStatus(caixa.status))}
                </span>
            </strong>
        </div>

        <div class="cash-detail-item">
            <span>PDV</span>
            <strong>${escapar(nomePdv(caixa.pdv_id))}</strong>
        </div>

        <div class="cash-detail-item">
            <span>Operador de abertura</span>
            <strong>${escapar(operadorAbertura)}</strong>
        </div>

        <div class="cash-detail-item">
            <span>Operador de fechamento</span>
            <strong>${escapar(operadorFechamento)}</strong>
        </div>

        <div class="cash-detail-item">
            <span>Abertura</span>
            <strong>${escapar(formatarData(caixa.data_abertura))}</strong>
        </div>

        <div class="cash-detail-item">
            <span>Fechamento</span>
            <strong>
                ${escapar(
                    caixa.data_fechamento
                        ? formatarData(caixa.data_fechamento)
                        : "Caixa ainda aberto"
                )}
            </strong>
        </div>

        <div class="cash-detail-item">
            <span>Valor inicial</span>
            <strong>${escapar(dinheiro(valorInicial))}</strong>
        </div>

        <div class="cash-detail-item">
            <span>Vendas em dinheiro</span>
            <strong>${escapar(dinheiro(vendasDinheiro))}</strong>
        </div>

        <div class="cash-detail-item">
            <span>Vendas via PIX</span>
            <strong>${escapar(dinheiro(vendasPix))}</strong>
        </div>

        <div class="cash-detail-item">
            <span>Vendas no cartão</span>
            <strong>${escapar(dinheiro(vendasCartao))}</strong>
        </div>

        <div class="cash-detail-item">
            <span>Outras formas de pagamento</span>
            <strong>${escapar(dinheiro(vendasOutros))}</strong>
        </div>

        <div class="cash-detail-item">
            <span>Total registrado em vendas</span>
            <strong>${escapar(dinheiro(totalVendas))}</strong>
        </div>

        <div class="cash-detail-item">
            <span>Dinheiro contado no fechamento</span>
            <strong>
                ${valorContado === null ? "Não informado" : escapar(dinheiro(valorContado))}
            </strong>
        </div>

        <div class="cash-detail-item">
            <span>Diferença de caixa</span>
            <strong>
                ${diferenca === null ? "Não informada" : escapar(dinheiro(diferenca))}
            </strong>
        </div>

        <div class="cash-detail-item">
            <span>Observação</span>
            <strong>${escapar(caixa.observacao || "Nenhuma")}</strong>
        </div>
    `;

    const habilitarRelatorio = normalizarStatus(caixa.status) === "fechado";

    if ($("btnReimprimirRelatorio")) {
        $("btnReimprimirRelatorio").disabled = !habilitarRelatorio;
    }

    if ($("btnSalvarPDF")) {
        $("btnSalvarPDF").disabled = !habilitarRelatorio;
    }

    modal.classList.add("open");
}

function fecharModal() {
    $("modalCaixa")?.classList.remove("open");
}

/* =========================================================
   RECUPERAR DADOS HISTÓRICOS DO FECHAMENTO
   ========================================================= */

async function recuperarDadosRelatorio(caixa) {
    if (!caixa || normalizarStatus(caixa.status) !== "fechado") {
        throw new Error("O relatório só pode ser emitido para caixas fechados.");
    }

    /*
     * A RPC administrativa consulta as sangrias do caixa,
     * validando o ADMIN_ERP e a empresa no servidor.
     */
    const { data: resumoSangrias, error: erroSangrias } =
        await clienteSupabase.rpc(
            "erp_relatorio_sangrias_caixa_admin",
            {
                p_caixa_id: caixa.id
            }
        );

    if (erroSangrias) {
        throw new Error(
            "Não foi possível consultar as sangrias: " + erroSangrias.message
        );
    }

    /*
     * Cancelamentos vinculados ao caixa exato.
     * Não utilizar intervalo de datas, pois ele poderia
     * misturar cancelamentos de caixas posteriores.
     */
    const { data: cancelamentos, error: erroCancelamentos } =
        await clienteSupabase
            .from("erp_vendas")
            .select(`
                numero,
                total,
                cancelado_em,
                motivo_cancelamento,
                estorno_cartao_pendente,
                created_at
            `)
            .eq("empresa_id", empresaERP.id)
            .eq("caixa_id", caixa.id)
            .eq("status", "CANCELADA")
            .order("cancelado_em", { ascending: false })
            .limit(100);

    if (erroCancelamentos) {
        throw new Error(
            "Não foi possível consultar os cancelamentos: " +
            erroCancelamentos.message
        );
    }

    const inicial = Number(caixa.valor_inicial || 0);
    const dinheiroVendas = Number(caixa.valor_dinheiro || 0);
    const pix = Number(caixa.valor_pix || 0);
    const cartao = Number(caixa.valor_cartao || 0);
    const outros = Number(caixa.valor_outros || 0);

    const contado = caixa.valor_contado_dinheiro == null
        ? null
        : Number(caixa.valor_contado_dinheiro);

    const diferenca = caixa.diferenca_caixa == null
        ? null
        : Number(caixa.diferenca_caixa);

    /*
     * No fechamento validado, a diferença é:
     * dinheiro contado - dinheiro esperado.
     *
     * Assim, quando os dois valores armazenados existem,
     * o esperado é recuperado sem refazer o fechamento.
     */
    const esperado = contado === null || diferenca === null
        ? null
        : contado - diferenca;

    const sangrias = Array.isArray(resumoSangrias?.sangrias)
        ? resumoSangrias.sangrias
        : [];

    return {
        empresa: empresaERP.nome_fantasia ||
            empresaERP.nome ||
            empresaERP.razao_social ||
            "Empresa",

        pdv: nomePdv(caixa.pdv_id),
        operador: nomeOperador(caixa.usuario_id),

        abertura: caixa.data_abertura,
        fechamento: caixa.data_fechamento,

        inicial,
        dinheiro: dinheiroVendas,
        pix,
        cartao,
        outros,

        esperado,
        contado,
        diferenca,

        observacao: caixa.observacao || "",

        cancelamentos: cancelamentos || [],
        sangrias,

        totalSangrias: Number(
            resumoSangrias?.total_sangrias || 0
        ),

        caixaId: caixa.id
    };
}

/* =========================================================
   REIMPRIMIR / SALVAR PDF
   ========================================================= */

async function gerarRelatorioHistorico(modo) {
    const caixa = caixaSelecionado;

    if (!caixa) {
        alert("Selecione um caixa para emitir o relatório.");
        return;
    }

    if (normalizarStatus(caixa.status) !== "fechado") {
        alert("Não é possível emitir relatório de um caixa aberto.");
        return;
    }

    /*
     * Abrir a janela imediatamente no clique do usuário
     * evita bloqueio do navegador durante as consultas.
     */
    const janela = window.open("", "_blank");

    if (!janela) {
        alert("O navegador bloqueou a janela do relatório. Permita pop-ups para este site.");
        return;
    }

    janela.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Preparando relatório</title>
        </head>
        <body style="font-family:Arial,sans-serif;padding:30px">
            <h2>Preparando relatório do caixa...</h2>
            <p>Aguarde enquanto recuperamos os dados históricos.</p>
        </body>
        </html>
    `);

    try {
        const dados = await recuperarDadosRelatorio(caixa);

        montarRelatorioImpressao(dados, janela, modo);

    } catch (erro) {
        console.error("[Relatório histórico] Erro:", erro);

        janela.close();

        alert(
            erro.message ||
            "Não foi possível gerar o relatório deste caixa."
        );
    }
}

/* =========================================================
   MODELO DE IMPRESSÃO
   ========================================================= */

function montarRelatorioImpressao(dados, janela, modo) {
    const moeda = valor => dinheiro(valor);

    const esperadoTexto = dados.esperado === null
        ? "Não disponível"
        : moeda(dados.esperado);

    const contadoTexto = dados.contado === null
        ? "Não informado"
        : moeda(dados.contado);

    const diferencaTexto = dados.diferenca === null
        ? "Não informada"
        : moeda(dados.diferenca);

    const htmlSangrias = dados.sangrias.length
        ? dados.sangrias.map(item => `
            <tr>
                <td>${escapar(formatarData(item.created_at))}</td>
                <td>${escapar(item.motivo || "—")}</td>
                <td class="valor">${escapar(moeda(item.valor))}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="3">Nenhuma sangria registrada.</td></tr>`;

    const htmlCancelamentos = dados.cancelamentos.length
        ? dados.cancelamentos.map(item => `
            <tr>
                <td>${escapar(item.numero ?? "—")}</td>
                <td>${escapar(formatarData(item.cancelado_em || item.created_at))}</td>
                <td>${escapar(item.motivo_cancelamento || "—")}</td>
                <td class="valor">${escapar(moeda(item.total))}</td>
                <td>
                    ${item.estorno_cartao_pendente
                        ? "Estorno pendente"
                        : "—"}
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="5">Nenhum cancelamento registrado.</td></tr>`;

    const tituloAcao = modo === "pdf"
        ? "Salvar relatório em PDF"
        : "Reimprimir relatório";

    const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Relatório de Fechamento - Caixa ${escapar(dados.caixaId)}</title>

            <style>
                * {
                    box-sizing: border-box;
                }

                body {
                    font-family: Arial, Helvetica, sans-serif;
                    color: #202938;
                    margin: 0;
                    padding: 25px;
                    background: #fff;
                    font-size: 12px;
                }

                .relatorio {
                    max-width: 850px;
                    margin: auto;
                }

                .topo {
                    border-bottom: 3px solid #1769aa;
                    padding-bottom: 16px;
                    margin-bottom: 20px;
                }

                .topo h1 {
                    margin: 0 0 5px;
                    font-size: 23px;
                    color: #145b94;
                }

                .topo p {
                    margin: 4px 0;
                    color: #586477;
                }

                .identificacao {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    margin-bottom: 20px;
                }

                .campo {
                    border: 1px solid #dce3eb;
                    border-radius: 7px;
                    padding: 10px;
                }

                .campo span {
                    display: block;
                    color: #667085;
                    margin-bottom: 5px;
                }

                .campo strong {
                    font-size: 13px;
                }

                h2 {
                    font-size: 15px;
                    color: #145b94;
                    border-bottom: 1px solid #dce3eb;
                    padding-bottom: 7px;
                    margin-top: 22px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 9px;
                }

                th, td {
                    border: 1px solid #dce3eb;
                    padding: 8px;
                    text-align: left;
                }

                th {
                    background: #f0f5fa;
                    color: #344054;
                }

                .valor {
                    text-align: right;
                    white-space: nowrap;
                }

                .resumo {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 9px;
                }

                .resumo .campo {
                    background: #fafcff;
                }

                .destaque {
                    background: #eef6ff !important;
                    border-color: #a9cbea;
                }

                .observacao {
                    border: 1px solid #dce3eb;
                    padding: 12px;
                    border-radius: 7px;
                    min-height: 40px;
                    white-space: pre-wrap;
                }

                .rodape {
                    margin-top: 28px;
                    padding-top: 12px;
                    border-top: 1px solid #dce3eb;
                    text-align: center;
                    color: #667085;
                    font-size: 10px;
                }

                .acoes {
                    display: flex;
                    justify-content: flex-end;
                    margin-bottom: 20px;
                }

                .acoes button {
                    border: 0;
                    border-radius: 6px;
                    padding: 10px 18px;
                    background: #1769aa;
                    color: white;
                    cursor: pointer;
                    font-weight: bold;
                }

                @media print {
                    body {
                        padding: 0;
                    }

                    .acoes {
                        display: none !important;
                    }

                    .relatorio {
                        max-width: none;
                    }

                    tr, .campo {
                        break-inside: avoid;
                    }
                }

                @media (max-width: 600px) {
                    body {
                        padding: 12px;
                    }

                    .identificacao,
                    .resumo {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
        </head>

        <body>
            <div class="relatorio">

                <div class="acoes">
                    <button onclick="window.print()">
                        ${escapar(tituloAcao)}
                    </button>
                </div>

                <header class="topo">
                    <h1>RIVER TECH ERP</h1>
                    <p>RELATÓRIO DE FECHAMENTO DE CAIXA</p>
                    <p>${escapar(dados.empresa)}</p>
                </header>

                <section class="identificacao">
                    <div class="campo">
                        <span>Caixa</span>
                        <strong>#${escapar(dados.caixaId)}</strong>
                    </div>

                    <div class="campo">
                        <span>PDV</span>
                        <strong>${escapar(dados.pdv)}</strong>
                    </div>

                    <div class="campo">
                        <span>Operador</span>
                        <strong>${escapar(dados.operador)}</strong>
                    </div>

                    <div class="campo">
                        <span>Data de emissão</span>
                        <strong>${escapar(formatarData(new Date()))}</strong>
                    </div>

                    <div class="campo">
                        <span>Abertura</span>
                        <strong>${escapar(formatarData(dados.abertura))}</strong>
                    </div>

                    <div class="campo">
                        <span>Fechamento</span>
                        <strong>${escapar(formatarData(dados.fechamento))}</strong>
                    </div>
                </section>

                <h2>Resumo financeiro</h2>

                <div class="resumo">
                    <div class="campo">
                        <span>Valor inicial</span>
                        <strong>${escapar(moeda(dados.inicial))}</strong>
                    </div>

                    <div class="campo">
                        <span>Total registrado em vendas</span>
                        <strong>${escapar(moeda(
                            dados.dinheiro + dados.pix + dados.cartao + dados.outros
                        ))}</strong>
                    </div>

                    <div class="campo">
                        <span>Dinheiro esperado</span>
                        <strong>${escapar(esperadoTexto)}</strong>
                    </div>

                    <div class="campo">
                        <span>Dinheiro contado</span>
                        <strong>${escapar(contadoTexto)}</strong>
                    </div>

                    <div class="campo destaque">
                        <span>Diferença de caixa</span>
                        <strong>${escapar(diferencaTexto)}</strong>
                    </div>

                    <div class="campo">
                        <span>Total de sangrias</span>
                        <strong>${escapar(moeda(dados.totalSangrias))}</strong>
                    </div>
                </div>

                <h2>Vendas por forma de pagamento</h2>

                <table>
                    <thead>
                        <tr>
                            <th>Forma de pagamento</th>
                            <th class="valor">Valor registrado</th>
                        </tr>
                    </thead>

                    <tbody>
                        <tr>
                            <td>Dinheiro</td>
                            <td class="valor">${escapar(moeda(dados.dinheiro))}</td>
                        </tr>
                        <tr>
                            <td>PIX</td>
                            <td class="valor">${escapar(moeda(dados.pix))}</td>
                        </tr>
                        <tr>
                            <td>Cartão</td>
                            <td class="valor">${escapar(moeda(dados.cartao))}</td>
                        </tr>
                        <tr>
                            <td>Outras formas</td>
                            <td class="valor">${escapar(moeda(dados.outros))}</td>
                        </tr>
                    </tbody>
                </table>

                <h2>Sangrias / Recolhimentos</h2>

                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Motivo</th>
                            <th class="valor">Valor</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${htmlSangrias}
                    </tbody>

                    <tfoot>
                        <tr>
                            <th colspan="2">Total de sangrias</th>
                            <th class="valor">${escapar(moeda(dados.totalSangrias))}</th>
                        </tr>
                    </tfoot>
                </table>

                <h2>Cancelamentos</h2>

                <table>
                    <thead>
                        <tr>
                            <th>Venda</th>
                            <th>Data</th>
                            <th>Motivo</th>
                            <th class="valor">Valor</th>
                            <th>Estorno</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${htmlCancelamentos}
                    </tbody>
                </table>

                <h2>Observações do fechamento</h2>

                <div class="observacao">
                    ${escapar(dados.observacao || "Nenhuma observação registrada.")}
                </div>

                <footer class="rodape">
                    River Tech ERP — Relatório histórico de fechamento de caixa
                </footer>

            </div>

            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 400);
                };
            <\/script>
        </body>
        </html>
    `;

    janela.document.open();
    janela.document.write(html);
    janela.document.close();
}