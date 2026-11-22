/* =========================================================
   CONFIGURAÇÃO SUPABASE
   ========================================================= */

const SUPABASE_URL =
    "https://vdocjqaskeucnrqdobyb.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_A87wjQ82Uw6_CCmKg9TsQw_ruSBqSPF";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
window.supabaseClient = supabaseClient;
window.erpExigirModulo = async function(codigo) {
    const { data: sessao, error: erroSessao } = await supabaseClient.auth.getSession();
    if (erroSessao) throw erroSessao;
    if (!sessao?.session?.user) { window.location.href = "../index.html"; return false; }
    const { data, error } = await supabaseClient.rpc("erp_usuario_tem_modulo", { p_modulo_codigo: String(codigo).toUpperCase() });
    if (error) throw new Error("Falha ao validar permissão: " + error.message);
    if (data !== true) { alert("Acesso ao PDV não liberado. Solicite a liberação ao Administrador Geral."); window.location.href = "../dashboard.html"; return false; }
    return true;
};


/* =========================================================
   ELEMENTOS DO PAINEL
   ========================================================= */

const empresaNome = document.getElementById("empresaNome");
const pdvNumero = document.getElementById("pdvNumero");
const usuarioNome = document.getElementById("usuarioNome");
const usuarioEmail = document.getElementById("usuarioEmail");
const btnSair = document.getElementById("btnSair");

const btnAbrirCaixa = document.getElementById("btnAbrirCaixa");
const btnNovaVenda = document.getElementById("btnNovaVenda");
const valorInicial = document.getElementById("valorInicial");

const areaCaixaFechado = document.getElementById("areaCaixaFechado");
const areaCaixaAberto = document.getElementById("areaCaixaAberto");
const tituloCaixa = document.getElementById("tituloCaixa");
const descricaoCaixa = document.getElementById("descricaoCaixa");
const valorInicialExibido = document.getElementById("valorInicialExibido");
const pdvLogo = document.getElementById("pdvLogo");

/* =========================================================
   ELEMENTOS DO FECHAMENTO
   ========================================================= */

const btnAbrirFechamento =
    document.getElementById("btnAbrirFechamento");
const btnCancelarVendaCaixa =
    document.getElementById("btnCancelarVendaCaixa");

const modalFechamento =
    document.getElementById("modalFechamento");

const btnCancelarFechamento =
    document.getElementById("btnCancelarFechamento");

const btnCancelarFechamentoRodape =
    document.getElementById("btnCancelarFechamentoRodape");

const btnConfirmarFechamento =
    document.getElementById("btnConfirmarFechamento");

const fechValorInicial =
    document.getElementById("fechValorInicial");

const fechDinheiro =
    document.getElementById("fechDinheiro");

const fechPix =
    document.getElementById("fechPix");

const fechCartao =
    document.getElementById("fechCartao");

const fechOutros =
    document.getElementById("fechOutros");

const fechEsperado =
    document.getElementById("fechEsperado");

const fechValorContado =
    document.getElementById("fechValorContado");

const fechObservacao =
    document.getElementById("fechObservacao");

const fechRotuloDiferenca =
    document.getElementById("fechRotuloDiferenca");

const fechDiferenca =
    document.getElementById("fechDiferenca");

const fechDescricaoDiferenca =
    document.getElementById("fechDescricaoDiferenca");


/* =========================================================
   ELEMENTOS DA VENDA
   ========================================================= */

const modalVenda = document.getElementById("modalVenda");
const btnFecharVenda = document.getElementById("btnFecharVenda");
const campoBuscaProduto = document.getElementById("campoBuscaProduto");
const listaProdutos = document.getElementById("listaProdutos");
const listaCarrinho = document.getElementById("listaCarrinho");
const contadorItens = document.getElementById("contadorItens");
const subtotalVenda = document.getElementById("subtotalVenda");
const descontoVenda = document.getElementById("descontoVenda");
const totalVenda = document.getElementById("totalVenda");
const btnFinalizarVenda = document.getElementById("btnFinalizarVenda");
const areaFormaPagamento = document.getElementById("areaFormaPagamento");
const modalPagamento = document.getElementById("modalPagamento");
const btnAbrirPagamento = document.getElementById("btnAbrirPagamento");
const btnFecharPagamento = document.getElementById("btnFecharPagamento");
const resumoUltimoItem = document.getElementById("resumoUltimoItem");
const subtotalAcumuladoVenda = document.getElementById("subtotalAcumuladoVenda");
const tabProdutosVenda = document.getElementById("tabProdutosVenda");
const tabClienteVenda = document.getElementById("tabClienteVenda");
const layoutProdutosVenda = document.getElementById("layoutProdutosVenda");
const areaClienteVenda = document.getElementById("areaClienteVenda");
const formBuscarClientePDV = document.getElementById("formBuscarClientePDV");
const campoCpfClientePDV = document.getElementById("campoCpfClientePDV");
const btnBuscarClientePDV = document.getElementById("btnBuscarClientePDV");
const btnLimparClientePDV = document.getElementById("btnLimparClientePDV");
const btnVoltarVendaCliente = document.getElementById("btnVoltarVendaCliente");
const mensagemClientePDV = document.getElementById("mensagemClientePDV");
const dadosClientePDV = document.getElementById("dadosClientePDV");
const clienteTabStatus = document.getElementById("clienteTabStatus");
const tabValeCreditoVenda = document.getElementById("tabValeCreditoVenda");
const tabConsultaPrecoVenda = document.getElementById("tabConsultaPrecoVenda");
const areaValeCreditoPanel = document.getElementById("areaValeCreditoPanel");
const areaConsultaPrecoVenda = document.getElementById("areaConsultaPrecoVenda");
const campoConsultaPreco = document.getElementById("campoConsultaPreco");
const resultadosConsultaPreco = document.getElementById("resultadosConsultaPreco");


/* =========================================================
   ESTADO
   ========================================================= */

let dadosPDV = null;
let configuracoesComprovante = {};
let caixaAtual = null;
let produtosDisponiveis = [];
let formasPagamento = [];
let formaPagamentoSelecionada = "";
let pagamentosVenda = [];
let carrinho = [];

let fechamentoEmProcessamento = false;
let dinheiroEsperadoFechamento = 0;

let valeCreditoPDV = null;
let consultaValeEmAndamento = false;
let clienteSelecionadoPDV = null;


function carregarLogoPDV(empresa) {
if (!pdvLogo) return;

const nome =
    empresa?.nome_fantasia ||
    empresa?.nome ||
    "Empresa";

const logo = empresa?.logo_url;

pdvLogo.innerHTML = "";
pdvLogo.classList.remove("has-image");

if (!logo) {
    pdvLogo.textContent =
        nome.trim().charAt(0).toUpperCase() || "R";
    return;
}

const imagem = document.createElement("img");

imagem.src = logo;
imagem.alt = nome;
pdvLogo.classList.add("has-image");

imagem.onerror = () => {
    pdvLogo.classList.remove("has-image");
    pdvLogo.innerHTML = "";
    pdvLogo.textContent =
        nome.trim().charAt(0).toUpperCase() || "R";
};

pdvLogo.appendChild(imagem);

}

/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function escapeHtml(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function elementoExiste(elemento, nome) {
    if (elemento) return true;

    console.error(`Elemento HTML não encontrado: ${nome}`);

    return false;
}

function obterPrimeiroRegistro(dados) {
    if (Array.isArray(dados)) {
        return dados.length ? dados[0] : null;
    }

    return dados || null;
}

function obterSaldoVale(dados) {
    const campos = [
        "saldo",
        "saldo_atual",
        "saldo_disponivel",
        "valor_saldo",
        "saldo_restante",
        "valor_restante",
        "credito_disponivel",
        "valor_disponivel"
    ];

    for (const campo of campos) {
        if (
            dados &&
            dados[campo] !== null &&
            dados[campo] !== undefined &&
            dados[campo] !== ""
        ) {
            const valor = Number(dados[campo]);

            if (Number.isFinite(valor)) {
                return valor;
            }
        }
    }

    return null;
}

function obterCodigoVale() {
    return document
        .getElementById("codigoValeCredito")
        ?.value
        .trim() || "";
}


/* =========================================================
   PROTEGER PAINEL E VALIDAR USUÁRIO
   ========================================================= */

async function verificarAcessoPDV() {
    if (!(await window.erpExigirModulo("PDV"))) return null;
    const {
        data: { session },
        error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError) throw sessionError;

    if (!session?.user) {
        window.location.href = "index.html";
        return null;
    }

    const {
        data: usuario,
        error: usuarioError
    } = await supabaseClient
        .from("erp_usuarios")
        .select("*")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();

    if (usuarioError || !usuario) {
        console.error("Erro ao carregar usuário:", usuarioError);

        await supabaseClient.auth.signOut();
        window.location.href = "index.html";

        return null;
    }

    if (
        String(usuario.tipo).toUpperCase() !== "PDV" ||
        !usuario.pdv_id ||
        !usuario.empresa_id ||
        usuario.ativo === false ||
        usuario.bloqueado === true
    ) {
        alert("Este usuário não possui acesso autorizado a este PDV.");

        await supabaseClient.auth.signOut();
        window.location.href = "index.html";

        return null;
    }

    const {
        data: pdv,
        error: pdvError
    } = await supabaseClient
        .from("erp_pdvs")
        .select("*")
        .eq("id", usuario.pdv_id)
        .eq("empresa_id", usuario.empresa_id)
        .maybeSingle();

    if (pdvError || !pdv) {
        console.error("Erro ao carregar PDV:", pdvError);

        await supabaseClient.auth.signOut();
        window.location.href = "index.html";

        return null;
    }

    if (pdv.ativo === false || pdv.bloqueado === true) {
        alert("Este PDV está inativo ou bloqueado.");

        await supabaseClient.auth.signOut();
        window.location.href = "index.html";

        return null;
    }

    return { usuario, pdv };
}


/* =========================================================
   VERIFICAR CAIXA ABERTO
   ========================================================= */

async function verificarCaixaAberto() {
    const {
    data: caixaLeitura,
    error: erroLeitura
} = await supabaseClient
    .from("erp_caixas")
    .select("id, empresa_id, pdv_id, usuario_id, valor_inicial, status")
    .eq("id", 29)
    .maybeSingle();

console.log("DIAGNÓSTICO SELECT CAIXA:", {
    caixaLeitura,
    erroLeitura
});
    if (!dadosPDV) return;

    const { usuario, pdv } = dadosPDV;


    const {
        data: caixa,
        error
    } = await supabaseClient
        .from("erp_caixas")
        .select("*")
        .eq("pdv_id", pdv.id)
        .eq("empresa_id", usuario.empresa_id)
        .eq("status", "aberto")
        .maybeSingle();

    if (error) {
        console.error("Erro ao verificar caixa:", error);

        alert(
            "Não foi possível consultar o caixa: " +
            error.message
        );

        return;
    }

    if (caixa) {
        caixaAtual = caixa;
        mostrarCaixaAberto(caixa);
    } else {
        caixaAtual = null;
        mostrarCaixaFechado();
    }
}

function mostrarCaixaFechado() {
    areaCaixaFechado.hidden = false;
    areaCaixaAberto.hidden = true;

    tituloCaixa.textContent = "Caixa fechado";

    descricaoCaixa.textContent =
        "Abra o caixa para começar a realizar vendas.";
}

function mostrarCaixaAberto(caixa) {
    areaCaixaFechado.hidden = true;
    areaCaixaAberto.hidden = false;

    tituloCaixa.textContent = "Caixa aberto";

    descricaoCaixa.textContent =
        "O caixa está pronto para realizar vendas.";

    valorInicialExibido.textContent =
        formatarMoeda(caixa.valor_inicial);
}


/* =========================================================
   ABRIR CAIXA
   ========================================================= */

async function abrirCaixa() {
    if (!dadosPDV) return;

    const valor = Number(valorInicial.value);

    if (!Number.isFinite(valor) || valor < 0) {
        alert("Informe um valor inicial válido.");
        return;
    }

    btnAbrirCaixa.disabled = true;
    btnAbrirCaixa.textContent = "Abrindo caixa...";

    const { usuario, pdv } = dadosPDV;

    try {

        // ================================================
        // VERIFICA SE JÁ EXISTE UM CAIXA ABERTO
        // ================================================

        const {
            data: caixaExistente,
            error: erroBusca
        } = await supabaseClient
            .from("erp_caixas")
            .select("*")
            .eq("pdv_id", pdv.id)
            .eq("empresa_id", usuario.empresa_id)
            .eq("status", "aberto")
            .maybeSingle();

        if (erroBusca) throw erroBusca;

        if (caixaExistente) {
            caixaAtual = caixaExistente;

            mostrarCaixaAberto(caixaExistente);

            alert("Este PDV já possui um caixa aberto.");

            return;
        }

        // ================================================
        // VALIDA AUTORIZAÇÃO PARA ABRIR O CAIXA
        // ================================================

        const {
            data: autorizacao,
            error: erroRpc
        } = await supabaseClient.rpc(
            "erp_pode_abrir_caixa",
            {
                p_empresa_id: usuario.empresa_id,
                p_pdv_id: pdv.id
            }
        );

        if (erroRpc) throw erroRpc;

        if (autorizacao !== true) {
            throw new Error(
                "Este usuário não possui autorização para abrir o caixa."
            );
        }

        // ================================================
        // INSERE O CAIXA
        // SEM .SELECT() PARA EVITAR O ERRO 403
        // ================================================

        const {
            error: erroInsercao
        } = await supabaseClient
            .from("erp_caixas")
            .insert({
                empresa_id: usuario.empresa_id,
                pdv_id: pdv.id,
                usuario_id: usuario.id,
                valor_inicial: valor,
                status: "aberto"
            });

        if (erroInsercao) throw erroInsercao;

        // ================================================
        // CONSULTA O CAIXA RECÉM-CRIADO
        // ================================================

        const {
            data: novoCaixa,
            error: erroLeitura
        } = await supabaseClient
            .from("erp_caixas")
            .select("*")
            .eq("pdv_id", pdv.id)
            .eq("empresa_id", usuario.empresa_id)
            .eq("usuario_id", usuario.id)
            .eq("status", "aberto")
            .order("data_abertura", {
                ascending: false
            })
            .limit(1)
            .maybeSingle();

        if (erroLeitura) throw erroLeitura;

        if (!novoCaixa) {
            throw new Error(
                "O caixa foi gravado, mas não foi possível carregar seus dados. Atualize o painel antes de tentar novamente."
            );
        }

        // ================================================
        // ATUALIZA O PAINEL
        // ================================================

        caixaAtual = novoCaixa;

        mostrarCaixaAberto(novoCaixa);

        alert("Caixa aberto com sucesso!");

    } catch (error) {

        console.error("Erro ao abrir caixa:", error);

        alert(
            "Não foi possível abrir o caixa.\n\n" +
            (error.message || "Erro desconhecido.")
        );

    } finally {

        btnAbrirCaixa.disabled = false;
        btnAbrirCaixa.textContent = "Abrir caixa";

    }
}


/* =========================================================
   FECHAMENTO: ATUALIZAR DIFERENÇA
   ========================================================= */

function atualizarDiferencaFechamento() {
    if (
        !fechValorContado ||
        !fechDiferenca ||
        !fechRotuloDiferenca ||
        !fechDescricaoDiferenca
    ) {
        return;
    }

    const texto = fechValorContado.value.trim();

    if (texto === "") {
        fechRotuloDiferenca.textContent = "Diferença";
        fechDiferenca.textContent = "—";

        fechDescricaoDiferenca.textContent =
            "Informe o dinheiro contado para conferir o caixa.";

        return;
    }

    const contado = Number(texto);

    if (!Number.isFinite(contado) || contado < 0) {
        fechRotuloDiferenca.textContent = "Valor inválido";
        fechDiferenca.textContent = "—";

        fechDescricaoDiferenca.textContent =
            "Informe um valor igual ou maior que zero.";

        return;
    }

    const diferenca = contado - dinheiroEsperadoFechamento;

    fechDiferenca.textContent = formatarMoeda(
        Math.abs(diferenca)
    );

    if (diferenca > 0.009) {
        fechRotuloDiferenca.textContent = "Sobra de dinheiro";

        fechDescricaoDiferenca.textContent =
            "O valor contado está acima do esperado em " +
            formatarMoeda(diferenca) + ".";
    } else if (diferenca < -0.009) {
        fechRotuloDiferenca.textContent = "Falta de dinheiro";

        fechDescricaoDiferenca.textContent =
            "O valor contado está abaixo do esperado em " +
            formatarMoeda(Math.abs(diferenca)) + ".";
    } else {
        fechRotuloDiferenca.textContent = "Caixa conferido";

        fechDescricaoDiferenca.textContent =
            "O dinheiro contado corresponde ao valor esperado.";
    }
}


/* =========================================================
   FECHAMENTO: ABRIR MODAL
   ========================================================= */

async function abrirModalFechamento() {
    if (fechamentoEmProcessamento) return;

    if (!dadosPDV || !caixaAtual) {
        alert("Não existe um caixa aberto para fechar.");
        return;
    }

    const elementosObrigatorios = [
        [modalFechamento, "modalFechamento"],
        [fechValorInicial, "fechValorInicial"],
        [fechDinheiro, "fechDinheiro"],
        [fechPix, "fechPix"],
        [fechCartao, "fechCartao"],
        [fechOutros, "fechOutros"],
        [fechEsperado, "fechEsperado"],
        [fechValorContado, "fechValorContado"],
        [fechObservacao, "fechObservacao"]
    ];

    if (!elementosObrigatorios.every(([el, nome]) =>
        elementoExiste(el, nome)
    )) {
        alert(
            "O modal de fechamento está incompleto no painel.html. " +
            "Confira os IDs dos campos."
        );

        return;
    }

    try {
        const { usuario, pdv } = dadosPDV;

        const {
            data: caixa,
            error
        } = await supabaseClient
            .from("erp_caixas")
            .select("*")
            .eq("id", caixaAtual.id)
            .eq("empresa_id", usuario.empresa_id)
            .eq("pdv_id", pdv.id)
            .eq("status", "aberto")
            .maybeSingle();

        if (error) throw error;

        if (!caixa) {
            caixaAtual = null;

            await verificarCaixaAberto();

            alert(
                "Este caixa não está mais aberto. " +
                "Atualizei o estado do painel."
            );

            return;
        }

        caixaAtual = caixa;

        const inicial = Number(caixa.valor_inicial || 0);
        const dinheiro = Number(caixa.valor_dinheiro || 0);
        const pix = Number(caixa.valor_pix || 0);
        const cartao = Number(caixa.valor_cartao || 0);
        const outros = Number(caixa.valor_outros || 0);

        let totalSangrias = 0;
        try {
            const { data: resumoSangrias, error: erroSangrias } = await supabaseClient.rpc("erp_resumo_sangrias_caixa");
            if (!erroSangrias && resumoSangrias) totalSangrias = Number(resumoSangrias.total_sangrias || 0);
        } catch (erroSangrias) { console.warn("Não foi possível consultar sangrias do caixa:", erroSangrias); }
        dinheiroEsperadoFechamento = inicial + dinheiro - totalSangrias;

        fechValorInicial.textContent = formatarMoeda(inicial);
        fechDinheiro.textContent = formatarMoeda(dinheiro);
        fechPix.textContent = formatarMoeda(pix);
        fechCartao.textContent = formatarMoeda(cartao);
        fechOutros.textContent = formatarMoeda(outros);

        fechEsperado.textContent =
            formatarMoeda(dinheiroEsperadoFechamento);

        fechValorContado.value = "";
        fechObservacao.value = "";

        atualizarDiferencaFechamento();

        modalFechamento.hidden = false;
        document.body.style.overflow = "hidden";

        fechValorContado.focus();
    } catch (error) {
        console.error("Erro ao preparar fechamento:", error);

        alert(
            "Não foi possível carregar os dados do fechamento.\n\n" +
            (error.message || "Erro desconhecido.")
        );
    }
}


/* =========================================================
   FECHAMENTO: CANCELAR MODAL
   ========================================================= */

function cancelarModalFechamento() {
    if (fechamentoEmProcessamento) return;
    if (!modalFechamento) return;

    modalFechamento.hidden = true;

    if (!modalVenda || modalVenda.hidden) {
        document.body.style.overflow = "";
    }
}


/* =========================================================
   FECHAMENTO: CONFIRMAR
   ========================================================= */

async function confirmarFechamentoCaixa() {
    if (fechamentoEmProcessamento) return;

    if (!dadosPDV || !caixaAtual) {
        alert("Não existe um caixa aberto para fechar.");
        return;
    }

    const textoValor = fechValorContado?.value.trim() ?? "";
    const valorContado = Number(textoValor);

    if (
        textoValor === "" ||
        !Number.isFinite(valorContado) ||
        valorContado < 0
    ) {
        alert("Informe o valor de dinheiro contado no caixa.");

        fechValorContado?.focus();

        return;
    }

    const diferenca =
        valorContado - dinheiroEsperadoFechamento;

    const mensagem =
        "Confirma o fechamento deste caixa?\n\n" +
        "Dinheiro esperado: " +
        formatarMoeda(dinheiroEsperadoFechamento) + "\n" +
        "Dinheiro contado: " +
        formatarMoeda(valorContado) + "\n" +
        "Diferença: " +
        (diferenca < 0 ? "- " : "+ ") +
        formatarMoeda(Math.abs(diferenca)) + "\n\n" +
        "Depois de fechado, será necessário abrir outro caixa " +
        "para realizar novas vendas.";

    if (!window.confirm(mensagem)) return;

    // Reserva a janela durante o clique do operador para evitar bloqueio de pop-up
    // após a resposta assíncrona do Supabase.
    const janelaRelatorioFechamento = window.open("", "_blank", "width=850,height=900");

    fechamentoEmProcessamento = true;

    btnConfirmarFechamento.disabled = true;
    btnConfirmarFechamento.textContent = "Fechando caixa...";

    try {
        const {
            data: resultado,
            error
        } = await supabaseClient.rpc(
            "erp_fechar_caixa",
            {
                p_valor_contado_dinheiro: valorContado,
                p_observacao: fechObservacao.value.trim() || null
            }
        );

        if (error) throw error;

        if (!resultado || resultado.sucesso !== true) {
            throw new Error(
                resultado?.mensagem ||
                "O servidor não confirmou o fechamento."
            );
        }

        modalFechamento.hidden = true;
        document.body.style.overflow = "";

        const caixaFechadoParaImpressao = caixaAtual;
        const caixaFechadoId = caixaFechadoParaImpressao?.id;
        caixaAtual = null;

        await verificarCaixaAberto();

        let cancelamentosCaixa = [];
        try {
            const inicioCaixa = caixaFechadoParaImpressao?.data_abertura || caixaFechadoParaImpressao?.created_at;
            let qCanceladas = supabaseClient.from("erp_vendas")
                .select("numero,total,cancelado_em,motivo_cancelamento,estorno_cartao_pendente,created_at")
                .eq("empresa_id", dadosPDV.usuario.empresa_id)
                .eq("pdv_id", dadosPDV.usuario.pdv_id)
                .eq("status", "CANCELADA")
                .order("cancelado_em", {ascending:false})
                .limit(100);
            // A data relevante é a do cancelamento, não a data original da venda.
            if (inicioCaixa) qCanceladas = qCanceladas.gte("cancelado_em", inicioCaixa);
            const {data: canceladas, error: erroCanceladas} = await qCanceladas;
            if (!erroCanceladas) cancelamentosCaixa = canceladas || [];
            else console.warn("Consulta de cancelamentos do fechamento:", erroCanceladas);
        } catch (erroConsultaCanceladas) {
            console.warn("Não foi possível incluir cancelamentos no relatório:", erroConsultaCanceladas);
        }

        let sangriasCaixa = [];
        let totalSangrias = Number(resultado.total_sangrias || 0);
        try {
            if (caixaFechadoId) {
                const {data: resumoSangrias, error: erroSangrias} = await supabaseClient.rpc(
                    "erp_relatorio_sangrias_caixa", {p_caixa_id: caixaFechadoId}
                );
                if (erroSangrias) throw erroSangrias;
                sangriasCaixa = Array.isArray(resumoSangrias?.sangrias) ? resumoSangrias.sangrias : [];
                totalSangrias = Number(resumoSangrias?.total_sangrias ?? totalSangrias);
            }
        } catch (erroConsultaSangrias) {
            console.warn("Não foi possível detalhar os recolhimentos do caixa:", erroConsultaSangrias);
        }

        imprimirRelatorioFechamento({
            empresa: empresaNome?.textContent || "Empresa",
            pdv: pdvNumero?.textContent || "PDV",
            operador: usuarioNome?.textContent || "Operador",
            abertura: caixaFechadoParaImpressao?.data_abertura || caixaFechadoParaImpressao?.created_at || null,
            fechamento: new Date().toLocaleString("pt-BR"),
            inicial: Number(fechValorInicial?.textContent?.replace(/[^0-9,.-]/g, "").replace(".", "").replace(",", ".") || valorInicial?.value || 0),
            dinheiro: Number(String(fechDinheiro?.textContent || "0").replace(/[^0-9,.-]/g, "").replace(".", "").replace(",", ".")) || 0,
            pix: Number(String(fechPix?.textContent || "0").replace(/[^0-9,.-]/g, "").replace(".", "").replace(",", ".")) || 0,
            cartao: Number(String(fechCartao?.textContent || "0").replace(/[^0-9,.-]/g, "").replace(".", "").replace(",", ".")) || 0,
            outros: Number(String(fechOutros?.textContent || "0").replace(/[^0-9,.-]/g, "").replace(".", "").replace(",", ".")) || 0,
            esperado: Number(String(fechEsperado?.textContent || "0").replace(/[^0-9,.-]/g, "").replace(".", "").replace(",", ".")) || dinheiroEsperadoFechamento,
            contado: valorContado,
            diferenca: diferenca,
            observacao: fechObservacao?.value?.trim() || "",
            cancelamentos: cancelamentosCaixa,
            sangrias: sangriasCaixa,
            totalSangrias: totalSangrias
        }, janelaRelatorioFechamento);

        alert(
            "Caixa fechado com sucesso!\n\n" +
            "Dinheiro esperado: " +
            formatarMoeda(dinheiroEsperadoFechamento) + "\n" +
            "Dinheiro contado: " +
            formatarMoeda(valorContado) + "\n" +
            "Diferença: " +
            (diferenca < 0 ? "- " : "+ ") +
            formatarMoeda(Math.abs(diferenca))
        );
    } catch (error) {
        if (janelaRelatorioFechamento && !janelaRelatorioFechamento.closed) janelaRelatorioFechamento.close();
        console.error("Erro ao fechar caixa:", error);

        alert(
            "Não foi possível fechar o caixa.\n\n" +
            (error.message || "Erro desconhecido.")
        );
    } finally {
        fechamentoEmProcessamento = false;

        if (btnConfirmarFechamento) {
            btnConfirmarFechamento.disabled = false;

            btnConfirmarFechamento.textContent =
                "Confirmar fechamento";
        }
    }
}


function imprimirRelatorioFechamento(dados, janelaExistente = null) {
    const janela = janelaExistente ||
        window.open("", "_blank", "width=850,height=900");

    if (!janela) {
        alert(
            "Caixa fechado. Permita janelas pop-up para imprimir o relatório."
        );
        return;
    }

    const brl = valor =>
        Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    const esc = valor =>
        String(valor ?? "—").replace(/[&<>"']/g, c => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[c]);

    const sangrias = Array.isArray(dados.sangrias)
        ? dados.sangrias
        : [];

    const cancelamentos = Array.isArray(dados.cancelamentos)
        ? dados.cancelamentos
        : [];

    const htmlSangrias = sangrias.length
        ? sangrias.map(s => {
            const data = s.created_at
                ? new Date(s.created_at).toLocaleString("pt-BR")
                : "Data não informada";

            return (
                '<div class="linha">' +
                    '<span>' +
                        esc(data) +
                        '<br><small>' +
                        esc(s.motivo || "Sem motivo informado") +
                        '</small>' +
                    '</span>' +
                    '<b>' + brl(s.valor) + '</b>' +
                '</div>'
            );
        }).join("")
        : "<p>Não há detalhes de recolhimento disponíveis.</p>";

    const htmlCancelamentos = cancelamentos.length
        ? cancelamentos.map(c => {
            const data = c.cancelado_em
                ? new Date(c.cancelado_em).toLocaleString("pt-BR")
                : "Data não informada";

            const motivo = esc(
                c.motivo_cancelamento || "Sem motivo informado"
            );

            const pendencia = c.estorno_cartao_pendente
                ? " · ESTORNO NA MAQUININHA PENDENTE"
                : "";

            return (
                '<div class="linha">' +
                    '<span>' +
                        'Venda #' + esc(c.numero ?? "—") +
                        ' · ' + esc(data) +
                        '<br><small>' +
                        motivo + esc(pendencia) +
                        '</small>' +
                    '</span>' +
                    '<b>' + brl(c.total) + '</b>' +
                '</div>'
            );
        }).join("")
        : "<p>Nenhum cancelamento registrado neste caixa.</p>";

    const html =
        '<!doctype html>' +
        '<html lang="pt-BR">' +
        '<head>' +
            '<meta charset="utf-8">' +
            '<meta name="viewport" content="width=device-width, initial-scale=1">' +
            '<title>Fechamento de caixa</title>' +

            '<style>' +
                'body{font:14px Arial,sans-serif;color:#172033;margin:24px}' +
                '.rel{max-width:760px;margin:auto}' +
                '.top{border-bottom:2px solid #1266d6;padding-bottom:14px;margin-bottom:18px}' +
                'h1{margin:0 0 5px;font-size:24px}' +
                'h2{font-size:17px}' +
                'p{margin:4px 0;color:#526176}' +
                '.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
                '.box{border:1px solid #dbe3ed;border-radius:8px;padding:12px;margin:8px 0}' +
                '.linha{display:flex;justify-content:space-between;gap:15px;padding:9px 0;border-bottom:1px solid #e5e7eb}' +
                '.linha:last-child{border-bottom:0}' +
                '.total{font-size:18px;font-weight:bold}' +
                '.rodape{margin-top:25px;color:#64748b;font-size:11px}' +
                '@media print{body{margin:0}.nao-imprimir{display:none}}' +
                '@media(max-width:500px){.grid{grid-template-columns:1fr}}' +
            '</style>' +
        '</head>' +

        '<body>' +
        '<main class="rel">' +

            '<header class="top">' +
                '<h1>Relatório de fechamento de caixa</h1>' +
                '<p><b>' + esc(dados.empresa) + '</b> · ' + esc(dados.pdv) + '</p>' +
                '<p>Operador: ' + esc(dados.operador) + '</p>' +
                '<p>Abertura: ' +
                    esc(dados.abertura
                        ? new Date(dados.abertura).toLocaleString("pt-BR")
                        : "Não informada") +
                    ' | Fechamento: ' + esc(dados.fechamento) +
                '</p>' +
            '</header>' +

            '<section class="grid">' +
                '<div class="box"><p>Dinheiro inicial</p><div class="total">' +
                    brl(dados.inicial) +
                '</div></div>' +
                '<div class="box"><p>Dinheiro esperado</p><div class="total">' +
                    brl(dados.esperado) +
                '</div></div>' +
            '</section>' +

            '<section class="box">' +
                '<h2>Resumo por forma de pagamento</h2>' +
                '<div class="linha"><span>Dinheiro</span><b>' + brl(dados.dinheiro) + '</b></div>' +
                '<div class="linha"><span>PIX</span><b>' + brl(dados.pix) + '</b></div>' +
                '<div class="linha"><span>Cartão</span><b>' + brl(dados.cartao) + '</b></div>' +
                '<div class="linha"><span>Outros / vale</span><b>' + brl(dados.outros) + '</b></div>' +
            '</section>' +

            '<section class="grid">' +
                '<div class="box"><p>Dinheiro contado</p><div class="total">' +
                    brl(dados.contado) +
                '</div></div>' +
                '<div class="box"><p>Diferença de caixa</p><div class="total">' +
                    brl(dados.diferenca) +
                '</div></div>' +
            '</section>' +

            '<section class="box">' +
                '<h2>Recolhimentos / sangrias (' + sangrias.length + ')</h2>' +
                '<div class="linha"><span><b>Total recolhido</b></span><b>' +
                    brl(dados.totalSangrias) +
                '</b></div>' +
                htmlSangrias +
            '</section>' +

            '<section class="box">' +
                '<h2>Cancelamentos (' + cancelamentos.length + ')</h2>' +
                htmlCancelamentos +
            '</section>' +

            '<section class="box">' +
                '<h2>Observações</h2>' +
                '<p>' + esc(dados.observacao || "Nenhuma observação registrada.") + '</p>' +
            '</section>' +

            '<p class="rodape">Documento gerado pelo River Tech ERP. Guarde este relatório para conferência.</p>' +

            '<p class="nao-imprimir" style="text-align:center;margin-top:24px">' +
                '<button onclick="window.print()">Imprimir / Salvar PDF</button>' +
            '</p>' +

        '</main>' +
        '</body>' +
        '</html>';

    try {
        janela.document.open();
        janela.document.write(html);
        janela.document.close();

        janela.onload = function () {
            janela.focus();
            janela.print();
        };

    } catch (erro) {
        console.error("Erro ao gerar relatório de fechamento:", erro);
        alert("O caixa foi fechado, mas ocorreu um erro ao montar o relatório.");
    }
}

/* =========================================================
   PAGAMENTOS: PREPARAR ÁREA
   ========================================================= */

function prepararAreaPagamento() {
    if (!areaFormaPagamento) {
        console.error(
            "Elemento #areaFormaPagamento não encontrado."
        );

        return null;
    }

    areaFormaPagamento.hidden = false;
    areaFormaPagamento.style.display = "block";

    let select = document.getElementById("formaPagamentoVenda");

    if (!select) {
        areaFormaPagamento.innerHTML = `
            <div class="pagamento-box">
                <label
                    for="formaPagamentoVenda"
                    class="pagamento-label">
                    Forma de pagamento
                </label>

                <select
                    id="formaPagamentoVenda"
                    class="pagamento-select">
                    <option value="">
                        Carregando formas de pagamento...
                    </option>
                </select>
            </div>
        `;

        select = document.getElementById("formaPagamentoVenda");
    }

    if (select && select.dataset.eventoRegistrado !== "true") {
        select.addEventListener("change", () => {
            formaPagamentoSelecionada = select.value;
            const devido = obterValorDevidoPagamento();
            pagamentosVenda = formaPagamentoSelecionada
                ? [{ formaPagamentoId: formaPagamentoSelecionada, valor: devido, recebido: devido }]
                : [];
            renderizarCardsPagamento();
            renderizarDetalhesPagamento();
            atualizarEstadoBotaoFinalizar();
            atualizarResumoValeCredito();
        });
        select.dataset.eventoRegistrado = "true";
    }
    if (!document.getElementById("detalhesPagamentoVenda")) {
        const detalhes = document.createElement("div");
        detalhes.id = "detalhesPagamentoVenda";
        detalhes.style.cssText = "margin-top:10px;padding:12px;border:1px solid #dbe3ee;border-radius:10px;background:#fff;";
        if (select && select.parentElement) select.parentElement.appendChild(detalhes);
    }
    prepararAreaValeCredito();

    return select;
}


/* =========================================================
   VALE DE CRÉDITO: PREPARAR INTERFACE
   ========================================================= */

function prepararAreaValeCredito() {
    const destinoVale = areaValeCreditoPanel || areaFormaPagamento;
    if (!destinoVale) return;

    if (document.getElementById("areaValeCredito")) {
        return;
    }

    const area = document.createElement("div");

    area.id = "areaValeCredito";

    area.style.cssText = [
        "margin-top:16px",
        "padding:14px",
        "border:1px solid #d8e0ea",
        "border-radius:12px",
        "background:#f8fafc"
    ].join(";");

    area.innerHTML = `
        <div style="font-weight:700;font-size:15px;margin-bottom:6px;">
            Vale de crédito
        </div>

        <div style="font-size:13px;color:#475569;margin-bottom:10px;">
            Informe o código do vale emitido pelo ERP para utilizar
            o crédito nesta compra.
        </div>

        <label
            for="codigoValeCredito"
            style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;">
            Código do vale
        </label>

        <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <input
                id="codigoValeCredito"
                type="text"
                autocomplete="off"
                placeholder="Digite ou leia o código"
                style="flex:1;min-width:150px;padding:10px;border:1px solid #cbd5e1;border-radius:8px;">

            <button
                type="button"
                id="btnConsultarVale"
                style="padding:10px 14px;border:0;border-radius:8px;background:#1d4ed8;color:white;font-weight:600;cursor:pointer;">
                Consultar vale
            </button>
        </div>

        <div
            id="resumoValeCredito"
            aria-live="polite"
            style="margin-top:10px;font-size:13px;color:#475569;">
            Nenhum vale de crédito aplicado.
        </div>

        <button
            type="button"
            id="btnRemoverVale"
            hidden
            style="margin-top:10px;padding:7px 10px;border:1px solid #cbd5e1;border-radius:8px;background:white;color:#334155;cursor:pointer;">
            Remover vale
        </button>
    `;

    destinoVale.insertBefore(area, destinoVale.firstChild);

    const campoCodigo =
        document.getElementById("codigoValeCredito");

    const btnConsultar =
        document.getElementById("btnConsultarVale");

    const btnRemover =
        document.getElementById("btnRemoverVale");

    if (campoCodigo) {
        campoCodigo.addEventListener("input", () => {
            // Alterar o código invalida a consulta anterior.
            valeCreditoPDV = null;

            atualizarResumoValeCredito();
            atualizarEstadoBotaoFinalizar();
        });

        campoCodigo.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                consultarValeCredito();
            }
        });
    }

    if (btnConsultar) {
        btnConsultar.addEventListener(
            "click",
            consultarValeCredito
        );
    }

    if (btnRemover) {
        btnRemover.addEventListener(
            "click",
            limparValeCredito
        );
    }
}


/* =========================================================
   VALE DE CRÉDITO: CONSULTAR E VALIDAR
   ========================================================= */

async function consultarValeCredito() {
    if (consultaValeEmAndamento) return;

    if (!dadosPDV || !caixaAtual) {
        alert("Abra o caixa antes de utilizar um vale de crédito.");
        return;
    }

    const codigo = obterCodigoVale();

    if (!codigo) {
        alert("Informe o código do vale de crédito.");

        document.getElementById("codigoValeCredito")?.focus();

        return;
    }

    const btnConsultar =
        document.getElementById("btnConsultarVale");

    const campoCodigo =
        document.getElementById("codigoValeCredito");

    const resumo =
        document.getElementById("resumoValeCredito");

    consultaValeEmAndamento = true;

    if (btnConsultar) {
        btnConsultar.disabled = true;
        btnConsultar.textContent = "Consultando...";
    }

    if (resumo) {
        resumo.textContent = "Validando o vale de crédito...";
        resumo.style.color = "#475569";
    }

    try {
        const {
            data,
            error
        } = await supabaseClient.rpc(
            "erp_consultar_vale_credito",
            {
                p_codigo: codigo
            }
        );

        if (error) throw error;

        const resultado = obterPrimeiroRegistro(data);

        if (!resultado) {
            throw new Error(
                "O servidor não retornou os dados do vale."
            );
        }

        if (
            resultado.sucesso === false ||
            resultado.valido === false
        ) {
            throw new Error(
                resultado.mensagem ||
                "Este vale não foi autorizado para uso."
            );
        }

        const status = String(
            resultado.status ||
            resultado.status_vale ||
            ""
        ).toUpperCase();

        if (
            status &&
            !["DISPONIVEL", "PARCIAL", "ATIVO"].includes(status)
        ) {
            throw new Error(
                resultado.mensagem ||
                "Este vale não está disponível para utilização. " +
                "Status: " + status
            );
        }

        const saldo = obterSaldoVale(resultado);

        if (saldo === null) {
            console.error(
                "Resposta da consulta do vale:",
                resultado
            );

            throw new Error(
                "A consulta foi recebida, mas o servidor não retornou " +
                "um campo de saldo reconhecido. Verifique o retorno " +
                "do RPC erp_consultar_vale_credito."
            );
        }

        if (saldo <= 0) {
            throw new Error(
                "Este vale não possui saldo disponível."
            );
        }

        // Se o servidor retornar empresa/PDV, verificar novamente.
        // A validação definitiva continua sendo feita pelo banco.
        const empresaVale =
            resultado.empresa_id ??
            resultado.vale?.empresa_id;

        if (
            empresaVale !== undefined &&
            empresaVale !== null &&
            String(empresaVale) !== String(dadosPDV.usuario.empresa_id)
        ) {
            throw new Error(
                "Este vale não pertence à empresa deste PDV."
            );
        }

        valeCreditoPDV = {
            codigo,
            saldo,
            status,
            dados: resultado
        };

        if (campoCodigo) {
            campoCodigo.value = codigo;
        }

        atualizarResumoValeCredito();
        atualizarEstadoBotaoFinalizar();
    } catch (error) {
        console.error("Erro ao consultar vale:", error);

        valeCreditoPDV = null;

        if (resumo) {
            resumo.textContent =
                error.message ||
                "Não foi possível validar o vale.";

            resumo.style.color = "#b91c1c";
        }

        atualizarEstadoBotaoFinalizar();
    } finally {
        consultaValeEmAndamento = false;

        if (btnConsultar) {
            btnConsultar.disabled = false;
            btnConsultar.textContent = "Consultar vale";
        }
    }
}


/* =========================================================
   VALE DE CRÉDITO: ATUALIZAR RESUMO
   ========================================================= */

function atualizarResumoValeCredito() {
    const resumo =
        document.getElementById("resumoValeCredito");

    const btnRemover =
        document.getElementById("btnRemoverVale");

    if (!resumo) return;

    if (!valeCreditoPDV) {
        resumo.textContent =
            "Nenhum vale de crédito aplicado.";

        resumo.style.color = "#475569";

        if (btnRemover) {
            btnRemover.hidden = true;
        }

        return;
    }

    const total = calcularTotal();

    const saldo = Number(valeCreditoPDV.saldo) || 0;

    const creditoUtilizado = Math.min(total, saldo);

    const diferenca = Math.max(
        0,
        total - creditoUtilizado
    );

    const saldoRestante = Math.max(
        0,
        saldo - creditoUtilizado
    );

    let mensagem =
        "Vale validado: " + valeCreditoPDV.codigo + "\n" +
        "Saldo disponível: " + formatarMoeda(saldo) + "\n" +
        "Crédito nesta compra: " +
        formatarMoeda(creditoUtilizado) + "\n" +
        "Diferença a pagar: " +
        formatarMoeda(diferenca);

    if (saldoRestante > 0.009) {
        mensagem +=
            "\nSaldo estimado após a venda: " +
            formatarMoeda(saldoRestante);
    }

    if (diferenca > 0.009 && !formaPagamentoSelecionada) {
        mensagem +=
            "\nSelecione uma forma de pagamento para quitar a diferença.";
    } else if (diferenca <= 0.009) {
        mensagem +=
            "\nO vale cobre o total desta compra.";
    }

    resumo.textContent = mensagem;
    resumo.style.whiteSpace = "pre-line";
    resumo.style.color = "#166534";

    if (btnRemover) {
        btnRemover.hidden = false;
    }
}


/* =========================================================
   VALE DE CRÉDITO: REMOVER
   ========================================================= */

function limparValeCredito() {
    valeCreditoPDV = null;

    const campoCodigo =
        document.getElementById("codigoValeCredito");

    if (campoCodigo) {
        campoCodigo.value = "";
    }

    const resumo =
        document.getElementById("resumoValeCredito");

    if (resumo) {
        resumo.textContent =
            "Nenhum vale de crédito aplicado.";

        resumo.style.color = "#475569";
        resumo.style.whiteSpace = "normal";
    }

    const btnRemover =
        document.getElementById("btnRemoverVale");

    if (btnRemover) {
        btnRemover.hidden = true;
    }

    atualizarEstadoBotaoFinalizar();
}


/* =========================================================
   DETALHES DO PAGAMENTO E TROCO
   ========================================================= */
function renderizarCardsPagamento() {
    const select = document.getElementById("formaPagamentoVenda");
    if (!select) return;
    let grid = document.getElementById("cardsFormasPagamento");
    if (!grid) {
        grid = document.createElement("div");
        grid.id = "cardsFormasPagamento";
        grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(115px,1fr));gap:8px;margin-top:10px;";
        select.insertAdjacentElement("afterend", grid);
        select.style.cssText += ";position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap";
    }
    grid.innerHTML = formasPagamento.map(forma => {
        const ativo = String(forma.id) === String(formaPagamentoSelecionada);
        const texto = `${forma.tipo || ""} ${forma.nome || ""}`.toUpperCase();
        const icone = texto.includes("PIX") ? "▦" : texto.includes("DINHEIRO") ? "R$" : (texto.includes("CART") || texto.includes("CRED") || texto.includes("DEB")) ? "▣" : "✓";
        return `<button type="button" data-forma-pagamento="${escapeHtml(forma.id)}" aria-pressed="${ativo}" style="padding:12px 8px;border:1px solid ${ativo ? "#2563eb" : "#cbd5e1"};border-radius:10px;background:${ativo ? "#eff6ff" : "#fff"};color:#0f172a;font-weight:700;cursor:pointer;min-height:68px"><span style="display:block;font-size:19px;margin-bottom:4px">${icone}</span>${escapeHtml(forma.nome)}</button>`;
    }).join("");
    grid.querySelectorAll("[data-forma-pagamento]").forEach(btn => btn.addEventListener("click", () => {
        select.value = btn.dataset.formaPagamento;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        renderizarCardsPagamento();
    }));
}

function obterFormaPagamentoSelecionada() {
    return formasPagamento.find(f => String(f.id) === String(formaPagamentoSelecionada)) || null;
}
function pagamentoEhDinheiro(forma) {
    const texto = `${forma?.tipo || ""} ${forma?.nome || ""}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    return texto.includes("DINHEIRO") || texto.includes("CASH");
}
function obterValorDevidoPagamento() {
    const total = Math.max(0, calcularTotal());
    const saldoVale = valeCreditoPDV ? Number(valeCreditoPDV.saldo) || 0 : 0;
    return Math.max(0, Math.round((total - Math.min(total, saldoVale)) * 100) / 100);
}

function obterFormaPorId(id) {
    return formasPagamento.find(f => String(f.id) === String(id)) || null;
}

function formaEhDinheiroPorId(id) {
    return pagamentoEhDinheiro(obterFormaPorId(id));
}

function formaEhCartaoPorId(id) {
    const forma = obterFormaPorId(id);
    const tipo = String(forma?.tipo || "").toUpperCase();
    const texto = `${forma?.tipo || ""} ${forma?.nome || ""}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    return ["CARTAO", "CARD", "DEBIT", "CREDIT"].includes(tipo) || texto.includes("CARTAO");
}

function renderizarDetalhesPagamento() {
    const area = document.getElementById("detalhesPagamentoVenda");
    if (!area) return;
    const devido = obterValorDevidoPagamento();

    if (devido <= 0.009) {
        pagamentosVenda = [];
        area.innerHTML = '<div style="padding:10px;border-radius:8px;background:#ecfdf5;color:#166534;font-size:13px">O vale-crédito cobre o total. Nenhum pagamento adicional é necessário.</div>';
        atualizarEstadoBotaoFinalizar();
        return;
    }

    if (!pagamentosVenda.length && formaPagamentoSelecionada) {
        pagamentosVenda = [{ formaPagamentoId: formaPagamentoSelecionada, valor: devido, recebido: devido }];
    } else if (pagamentosVenda.length === 1 && formaPagamentoSelecionada && String(pagamentosVenda[0].formaPagamentoId) !== String(formaPagamentoSelecionada)) {
        pagamentosVenda = [{ formaPagamentoId: formaPagamentoSelecionada, valor: devido, recebido: devido }];
    } else if (pagamentosVenda.length === 1) {
        const parcela = pagamentosVenda[0];
        if (Math.abs((Number(parcela.valor) || 0) - devido) < 0.011 && formaEhDinheiroPorId(parcela.formaPagamentoId) && Math.abs((Number(parcela.recebido) || 0) - (Number(parcela.valor) || 0)) < 0.011) {
            parcela.recebido = devido;
        }
        parcela.valor = devido;
        if (formaEhDinheiroPorId(parcela.formaPagamentoId) && (!Number.isFinite(Number(parcela.recebido)) || Number(parcela.recebido) < devido)) parcela.recebido = devido;
    }

    pagamentosVenda.forEach(parcela => {
        if (formaEhCartaoPorId(parcela.formaPagamentoId)) {
            if (!parcela.cartaoModalidade) parcela.cartaoModalidade = "DEBITO";
            if (!Number(parcela.cartaoParcelas)) parcela.cartaoParcelas = 1;
        }
    });

    if (!pagamentosVenda.length) {
        area.innerHTML = '<span style="color:#64748b;font-size:13px">Selecione uma forma de pagamento para começar.</span>';
        atualizarEstadoBotaoFinalizar();
        return;
    }

    const options = (selecionado) => formasPagamento.map(forma =>
        `<option value="${escapeHtml(forma.id)}" ${String(forma.id) === String(selecionado) ? "selected" : ""}>${escapeHtml(forma.nome)} (${escapeHtml(forma.tipo || "OUTROS")})</option>`
    ).join("");

    area.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px">
            <strong style="font-size:14px">Como o cliente vai pagar?</strong>
            <button type="button" id="btnAdicionarParcelaPagamento" style="border:1px solid #2563eb;background:#eff6ff;color:#1d4ed8;padding:8px 10px;border-radius:8px;font-weight:700;cursor:pointer">+ Dividir pagamento</button>
        </div>
        <div style="display:grid;gap:10px">
            ${pagamentosVenda.map((parcela, index) => {
                const dinheiro = formaEhDinheiroPorId(parcela.formaPagamentoId);
                return `<div style="padding:11px;border:1px solid #dbe3ee;border-radius:10px;background:#f8fafc">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px">
                        <strong style="font-size:13px">Pagamento ${index + 1}</strong>
                        ${pagamentosVenda.length > 1 ? `<button type="button" data-remover-parcela="${index}" aria-label="Remover pagamento ${index + 1}" style="border:0;background:transparent;color:#b91c1c;font-weight:700;cursor:pointer">Remover</button>` : ""}
                    </div>
                    <label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px" for="parcelaForma${index}">Forma de pagamento</label>
                    <select id="parcelaForma${index}" data-parcela-forma="${index}" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:white;box-sizing:border-box;margin-bottom:9px">
                        <option value="">Selecione a forma</option>${options(parcela.formaPagamentoId)}
                    </select>
                    <label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px" for="parcelaValor${index}">Valor destinado à venda (R$)</label>
                    <input id="parcelaValor${index}" data-parcela-valor="${index}" type="number" min="0" step="0.01" inputmode="decimal" value="${Math.max(0, Number(parcela.valor) || 0).toFixed(2)}" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;background:white">
                    ${dinheiro ? `<label style="display:block;font-size:12px;font-weight:600;margin:9px 0 5px" for="parcelaRecebido${index}">Dinheiro entregue pelo cliente (R$)</label><input id="parcelaRecebido${index}" data-parcela-recebido="${index}" type="number" min="0" step="0.01" inputmode="decimal" value="${Math.max(0, Number(parcela.recebido ?? parcela.valor) || 0).toFixed(2)}" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;background:white"><small style="display:block;color:#64748b;margin-top:5px">O troco é calculado sobre esta parcela e não entra no total da venda.</small>` : ""}
                    ${formaEhCartaoPorId(parcela.formaPagamentoId) ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid #dbe3ee"><strong style="font-size:12px;display:block;margin-bottom:8px">Dados da transação de cartão</strong><label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px" for="cartaoBandeira${index}">Bandeira</label><select id="cartaoBandeira${index}" data-cartao-meta="bandeira" data-index="${index}" style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;margin-bottom:8px;background:white"><option value="">Não informada</option>${["Visa","Mastercard","Elo","American Express","Hipercard","Outra"].map(b => `<option value="${b}" ${parcela.cartaoBandeira === b ? "selected" : ""}>${b}</option>`).join("")}</select><label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px" for="cartaoModalidade${index}">Modalidade</label><select id="cartaoModalidade${index}" data-cartao-meta="modalidade" data-index="${index}" style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;margin-bottom:8px;background:white"><option value="DEBITO" ${parcela.cartaoModalidade === "DEBITO" ? "selected" : ""}>Débito</option><option value="CREDITO" ${parcela.cartaoModalidade === "CREDITO" ? "selected" : ""}>Crédito</option></select><label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px" for="cartaoParcelas${index}">Parcelas</label><input id="cartaoParcelas${index}" data-cartao-meta="parcelas" data-index="${index}" type="number" min="1" max="48" step="1" value="${Number(parcela.cartaoParcelas) || 1}" ${parcela.cartaoModalidade === "DEBITO" ? "disabled" : ""} style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;margin-bottom:8px;box-sizing:border-box;background:white"><label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px" for="cartaoNs${index}">NS / referência da transação (opcional)</label><input id="cartaoNs${index}" data-cartao-meta="ns" data-index="${index}" type="text" maxlength="80" value="${escapeHtml(parcela.cartaoNs || "")}" placeholder="Número sequencial / NS" style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;background:white"></div>` : ""}
                </div>`;
            }).join("")}
        </div>
        <div style="margin-top:12px;padding:12px;border-radius:10px;background:#f1f5f9;display:grid;gap:7px">
            <div style="display:flex;justify-content:space-between;gap:10px"><span>Total a pagar</span><strong>${formatarMoeda(devido)}</strong></div>
            <div style="display:flex;justify-content:space-between;gap:10px"><span>Total distribuído</span><strong id="totalDistribuidoVenda">R$ 0,00</strong></div>
            <div style="display:flex;justify-content:space-between;gap:10px"><span>Troco</span><strong id="trocoVenda">R$ 0,00</strong></div>
            <div id="validacaoPagamentosVenda" aria-live="polite" style="font-size:12px;color:#b91c1c">Confira as formas e os valores.</div>
        </div>
    `;

    area.querySelectorAll("[data-parcela-forma]").forEach(select => select.addEventListener("change", () => {
        const index = Number(select.dataset.parcelaForma);
        const parcela = pagamentosVenda[index];
        if (!parcela) return;
        parcela.formaPagamentoId = select.value;
        parcela.recebido = Number(parcela.valor) || 0;
        if (formaEhCartaoPorId(parcela.formaPagamentoId)) {
            parcela.cartaoModalidade = parcela.cartaoModalidade || "DEBITO";
            parcela.cartaoParcelas = Number(parcela.cartaoParcelas) || 1;
        } else {
            delete parcela.cartaoModalidade;
            delete parcela.cartaoParcelas;
            delete parcela.cartaoBandeira;
            delete parcela.cartaoNs;
        }
        if (pagamentosVenda.length === 1) {
            formaPagamentoSelecionada = parcela.formaPagamentoId;
            const principal = document.getElementById("formaPagamentoVenda");
            if (principal) principal.value = formaPagamentoSelecionada;
            renderizarCardsPagamento();
        }
        renderizarDetalhesPagamento();
        atualizarEstadoBotaoFinalizar();
    }));

    area.querySelectorAll("[data-parcela-valor]").forEach(input => input.addEventListener("input", () => {
        const index = Number(input.dataset.parcelaValor);
        const parcela = pagamentosVenda[index];
        if (!parcela) return;
        const valorAnterior = Number(parcela.valor) || 0;
        parcela.valor = Math.max(0, Number(input.value) || 0);
        if (formaEhDinheiroPorId(parcela.formaPagamentoId) && Math.abs((Number(parcela.recebido) || 0) - valorAnterior) < 0.011) {
            parcela.recebido = parcela.valor;
            const recebidoInput = document.getElementById(`parcelaRecebido${index}`);
            if (recebidoInput) recebidoInput.value = parcela.valor.toFixed(2);
        }
        atualizarTrocoVenda();
    }));

    area.querySelectorAll("[data-parcela-recebido]").forEach(input => input.addEventListener("input", () => {
        const index = Number(input.dataset.parcelaRecebido);
        if (pagamentosVenda[index]) pagamentosVenda[index].recebido = Math.max(0, Number(input.value) || 0);
        atualizarTrocoVenda();
    }));

    area.querySelectorAll("[data-cartao-meta]").forEach(input => input.addEventListener("change", () => {
        const index = Number(input.dataset.index);
        const parcela = pagamentosVenda[index];
        if (!parcela) return;
        const campo = input.dataset.cartaoMeta;
        if (campo === "bandeira") parcela.cartaoBandeira = input.value;
        if (campo === "modalidade") {
            parcela.cartaoModalidade = input.value;
            if (input.value === "DEBITO") parcela.cartaoParcelas = 1;
            else parcela.cartaoParcelas = Math.max(1, Number(parcela.cartaoParcelas) || 1);
            renderizarDetalhesPagamento();
        }
        if (campo === "parcelas") parcela.cartaoParcelas = Math.max(1, Math.min(48, parseInt(input.value, 10) || 1));
        if (campo === "ns") parcela.cartaoNs = input.value.trim();
        atualizarEstadoBotaoFinalizar();
    }));

    area.querySelectorAll("[data-remover-parcela]").forEach(button => button.addEventListener("click", () => {
        pagamentosVenda.splice(Number(button.dataset.removerParcela), 1);
        if (pagamentosVenda.length === 1) {
            pagamentosVenda[0].valor = obterValorDevidoPagamento();
            pagamentosVenda[0].recebido = pagamentosVenda[0].valor;
            formaPagamentoSelecionada = pagamentosVenda[0].formaPagamentoId || "";
            const selectPrincipal = document.getElementById("formaPagamentoVenda");
            if (selectPrincipal) selectPrincipal.value = formaPagamentoSelecionada;
        }
        renderizarCardsPagamento();
        renderizarDetalhesPagamento();
        atualizarEstadoBotaoFinalizar();
    }));

    const btnAdicionar = document.getElementById("btnAdicionarParcelaPagamento");
    if (btnAdicionar) btnAdicionar.addEventListener("click", () => {
        const qtd = pagamentosVenda.length + 1;
        const parte = Math.floor((devido / qtd) * 100) / 100;
        let restante = Math.round((devido - parte * (qtd - 1)) * 100) / 100;
        pagamentosVenda = pagamentosVenda.map((parcela, i) => ({
            ...parcela,
            valor: i === qtd - 1 ? parte : parte,
            recebido: formaEhDinheiroPorId(parcela.formaPagamentoId) ? parte : parte
        }));
        const usadas = new Set(pagamentosVenda.map(x => String(x.formaPagamentoId)));
        const alternativa = formasPagamento.find(f => !usadas.has(String(f.id))) || formasPagamento[0];
        pagamentosVenda.push({ formaPagamentoId: alternativa?.id || "", valor: restante, recebido: restante });
        renderizarDetalhesPagamento();
        atualizarEstadoBotaoFinalizar();
    });

    atualizarTrocoVenda();
}

function atualizarTrocoVenda() {
    const area = document.getElementById("detalhesPagamentoVenda");
    if (!area) return;
    const devido = obterValorDevidoPagamento();
    const distribuido = pagamentosVenda.reduce((soma, p) => soma + (Number(p.valor) || 0), 0);
    const troco = pagamentosVenda.reduce((soma, p) => {
        if (!formaEhDinheiroPorId(p.formaPagamentoId)) return soma;
        return soma + Math.max(0, (Number(p.recebido) || 0) - (Number(p.valor) || 0));
    }, 0);
    const totalEl = document.getElementById("totalDistribuidoVenda");
    const trocoEl = document.getElementById("trocoVenda");
    const validacao = document.getElementById("validacaoPagamentosVenda");
    if (totalEl) totalEl.textContent = formatarMoeda(distribuido);
    if (trocoEl) {
        trocoEl.textContent = formatarMoeda(troco);
        trocoEl.style.color = "#166534";
    }

    let mensagem = "Pagamentos conferidos.";
    let valido = pagamentosVenda.length > 0;
    if (Math.abs(distribuido - devido) > 0.009) {
        valido = false;
        mensagem = distribuido < devido
            ? `Falta distribuir ${formatarMoeda(devido - distribuido)}.`
            : `O valor distribuído excede o devido em ${formatarMoeda(distribuido - devido)}.`;
    }
    for (const parcela of pagamentosVenda) {
        if (!parcela.formaPagamentoId || !obterFormaPorId(parcela.formaPagamentoId)) {
            valido = false; mensagem = "Selecione a forma de pagamento de cada parcela."; break;
        }
        if ((Number(parcela.valor) || 0) <= 0) {
            valido = false; mensagem = "Cada parcela deve ter valor maior que zero."; break;
        }
        if (formaEhDinheiroPorId(parcela.formaPagamentoId) && (Number(parcela.recebido) || 0) + 0.0001 < (Number(parcela.valor) || 0)) {
            valido = false; mensagem = "O dinheiro entregue deve cobrir a parcela em dinheiro."; break;
        }
    }
    if (validacao) {
        validacao.textContent = mensagem;
        validacao.style.color = valido ? "#166534" : "#b91c1c";
    }
    atualizarEstadoBotaoFinalizar();
}

function obterPagamentosParaEnviar() {
    return pagamentosVenda.map(p => ({
        forma_pagamento_id: p.formaPagamentoId,
        valor: Math.round((Number(p.valor) || 0) * 100) / 100,
        cartao_bandeira: p.cartaoBandeira || null,
        cartao_modalidade: p.cartaoModalidade || null,
        cartao_parcelas: Number(p.cartaoParcelas) || null,
        cartao_ns: p.cartaoNs || null
    }));
}

function pagamentoDivididoEstaValido() {
    const devido = obterValorDevidoPagamento();
    if (devido <= 0.009) return true;
    if (!pagamentosVenda.length) return false;
    const total = pagamentosVenda.reduce((soma, p) => soma + (Number(p.valor) || 0), 0);
    if (Math.abs(total - devido) > 0.009) return false;
    return pagamentosVenda.every(p => p.formaPagamentoId && obterFormaPorId(p.formaPagamentoId)
        && Number(p.valor) > 0
        && (!formaEhDinheiroPorId(p.formaPagamentoId) || (Number(p.recebido) || 0) + 0.0001 >= Number(p.valor)));
}

let comprovantePendenteImpressao = null;
const modalEscolhaImpressao = document.getElementById("modalEscolhaImpressao");

function abrirEscolhaImpressao(dados) {
    comprovantePendenteImpressao = dados;
    if (!modalEscolhaImpressao) {
        imprimirComprovanteVenda(dados, "80");
        return;
    }
    modalEscolhaImpressao.hidden = false;
    modalEscolhaImpressao.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    carregarPreferenciaFormatoImpressao();
    detectarImpressorasWindows();
}

function fecharEscolhaImpressao() {
    if (!modalEscolhaImpressao) return;
    modalEscolhaImpressao.hidden = true;
    modalEscolhaImpressao.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}

const RIVER_PRINT_BRIDGE = "http://127.0.0.1:17654";
const RIVER_PRINT_STORAGE_KEY = "rivertech_pdv_impressora_padrao";
const RIVER_PRINT_FORMAT_STORAGE_KEY = "rivertech_pdv_formato_impressao_padrao";

function obterFormatoPadraoImpressao() {
    try {
        const formato = localStorage.getItem(RIVER_PRINT_FORMAT_STORAGE_KEY) || "";
        return ["80", "58", "a4"].includes(formato) ? formato : "";
    } catch (_) { return ""; }
}

function carregarPreferenciaFormatoImpressao() {
    const formatoSalvo = obterFormatoPadraoImpressao();
    const select = document.getElementById("rtFormatoPadrao");
    const checkbox = document.getElementById("rtSalvarFormatoPadrao");
    const status = document.getElementById("rtFormatoStatus");
    if (select) select.value = formatoSalvo || "80";
    if (checkbox) checkbox.checked = !!formatoSalvo;
    if (status) status.textContent = formatoSalvo
        ? `Formato preferido carregado: ${formatoSalvo === "a4" ? "A4" : formatoSalvo + " mm"}. Você ainda pode escolher outro formato nesta venda.`
        : "Você pode escolher um formato diferente a cada impressão.";
    atualizarDestaqueFormatoImpressao(formatoSalvo);
}

function atualizarDestaqueFormatoImpressao(formato) {
    modalEscolhaImpressao?.querySelectorAll("[data-print-format]").forEach(botao => {
        const selecionado = !!formato && botao.dataset.printFormat === formato;
        botao.classList.toggle("rt-print-option-default", selecionado);
        if (selecionado) botao.setAttribute("aria-current", "true");
        else botao.removeAttribute("aria-current");
    });
}

document.getElementById("rtFormatoPadrao")?.addEventListener("change", event => {
    const checkbox = document.getElementById("rtSalvarFormatoPadrao");
    const status = document.getElementById("rtFormatoStatus");
    if (checkbox?.checked) {
        try { localStorage.setItem(RIVER_PRINT_FORMAT_STORAGE_KEY, event.target.value); }
        catch (error) { console.warn("Não foi possível salvar o formato preferido:", error); }
        if (status) status.textContent = "Formato preferido atualizado neste computador.";
    }
    atualizarDestaqueFormatoImpressao(event.target.value);
});

document.getElementById("rtSalvarFormatoPadrao")?.addEventListener("change", event => {
    const select = document.getElementById("rtFormatoPadrao");
    const status = document.getElementById("rtFormatoStatus");
    if (event.target.checked) {
        try { localStorage.setItem(RIVER_PRINT_FORMAT_STORAGE_KEY, select?.value || "80"); }
        catch (error) { console.warn("Não foi possível salvar o formato preferido:", error); }
        if (status) status.textContent = "Formato preferido memorizado neste computador.";
    } else {
        try { localStorage.removeItem(RIVER_PRINT_FORMAT_STORAGE_KEY); }
        catch (error) { console.warn("Não foi possível remover o formato preferido:", error); }
        if (status) status.textContent = "Preferência removida. Você poderá escolher a cada impressão.";
    }
});
let impressorasWindowsDetectadas = false;

function obterImpressoraPadraoSalva() {
    try { return localStorage.getItem(RIVER_PRINT_STORAGE_KEY) || ""; }
    catch (_) { return ""; }
}

function salvarPreferenciaImpressora(nome) {
    try {
        if (nome) localStorage.setItem(RIVER_PRINT_STORAGE_KEY, nome);
        else localStorage.removeItem(RIVER_PRINT_STORAGE_KEY);
    } catch (error) {
        console.warn("Não foi possível salvar a impressora padrão neste navegador:", error);
    }
}

async function detectarImpressorasWindows() {
    const status = document.getElementById("rtBridgeStatus");
    const select = document.getElementById("rtBridgePrinter");
    const botaoImprimir = document.getElementById("rtBridgeImprimir80");
    if (status) status.textContent = "Verificando componente Windows...";
    if (select) select.innerHTML = '<option value="">Consultando impressoras...</option>';
    if (botaoImprimir) botaoImprimir.disabled = true;
    try {
        const healthResponse = await fetch(`${RIVER_PRINT_BRIDGE}/health`, { method: "GET", cache: "no-store" });
        if (!healthResponse.ok) throw new Error("O componente Windows não respondeu corretamente.");
        const health = await healthResponse.json();
        if (!health.ok) throw new Error("O componente Windows não está ativo.");
        const printersResponse = await fetch(`${RIVER_PRINT_BRIDGE}/printers`, { method: "GET", cache: "no-store" });
        if (!printersResponse.ok) throw new Error("Não foi possível consultar as impressoras.");
        const resultado = await printersResponse.json();
        const printers = Array.isArray(resultado.printers) ? resultado.printers : [];
        const impressoraSalva = obterImpressoraPadraoSalva();
        if (select) {
            select.innerHTML = '<option value="">Selecione uma impressora...</option>';
            printers.forEach(nome => {
                const option = document.createElement("option");
                option.value = nome;
                option.textContent = nome;
                select.appendChild(option);
            });
            select.value = printers.includes(impressoraSalva) ? impressoraSalva : "";
        }
        const checkboxPadrao = document.getElementById("rtBridgeSalvarPadrao");
        if (checkboxPadrao) checkboxPadrao.checked = !!(impressoraSalva && printers.includes(impressoraSalva));
        impressorasWindowsDetectadas = true;
        if (status) {
            const padraoDisponivel = impressoraSalva && printers.includes(impressoraSalva);
            status.textContent = printers.length
                ? `${printers.length} impressora(s) encontrada(s). ${padraoDisponivel ? "Impressora padrão carregada: " + impressoraSalva + "." : "Selecione a impressora térmica de 80 mm."}`
                : "Nenhuma impressora instalada foi encontrada no Windows.";
        }
        if (botaoImprimir) botaoImprimir.disabled = !select?.value;
    } catch (error) {
        impressorasWindowsDetectadas = false;
        if (select) select.innerHTML = '<option value="">Componente não disponível</option>';
        if (status) status.textContent = "Não foi possível conectar ao Windows Print Bridge. Verifique se ele está aberto neste computador. A impressão pelo navegador continua disponível.";
        console.warn("River Tech Print Bridge:", error);
    }
}

function textoSeguroImpressora(valor) {
    return String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "?");
}

function montarComprovanteEscPos80(dados) {
    const ESC = 0x1B, GS = 0x1D;
    const comandos = [ESC, 0x40, ESC, 0x61, 1];
    const linhas = [];
    const cfg = configuracoesComprovante || {};
    linhas.push(textoSeguroImpressora(cfg.nome_exibicao || empresaNome?.textContent || "RIVER TECH"));
    if (cfg.telefone) linhas.push(textoSeguroImpressora(cfg.telefone));
    if (cfg.endereco) linhas.push(textoSeguroImpressora(cfg.endereco));
    linhas.push("COMPROVANTE NAO FISCAL", "--------------------------------");
    comandos.push(ESC, 0x61, 0);
    linhas.push(`Venda: ${textoSeguroImpressora(dados.numero || "-")}`, new Date().toLocaleString("pt-BR"), "--------------------------------");
    (dados.itens || []).forEach(item => {
        const nome = textoSeguroImpressora(item.produto?.nome || item.nome || "Produto");
        const qtd = Number(item.quantidade) || 0;
        const preco = Number(item.produto?.preco_venda ?? item.preco_unitario) || 0;
        linhas.push(nome.slice(0, 42), `${qtd} x ${textoSeguroImpressora(formatarMoeda(preco))} = ${textoSeguroImpressora(formatarMoeda(qtd * preco))}`);
    });
    linhas.push("--------------------------------", `Subtotal: ${textoSeguroImpressora(formatarMoeda(dados.subtotal))}`, `Desconto: ${textoSeguroImpressora(formatarMoeda(dados.desconto))}`, `TOTAL: ${textoSeguroImpressora(formatarMoeda(dados.total))}`, `Pagamento: ${textoSeguroImpressora(dados.formaPagamento || "Registrado")}`);
    if (dados.valorRecebido != null) { linhas.push(`Recebido: ${textoSeguroImpressora(formatarMoeda(dados.valorRecebido))}`, `Troco: ${textoSeguroImpressora(formatarMoeda(dados.troco || 0))}`); }
    if (dados.cliente) linhas.push(`Cliente: ${textoSeguroImpressora(dados.cliente)}`);
    linhas.push("", "Documento nao fiscal.", "Nao substitui documento fiscal.", "", "");
    const texto = new TextEncoder().encode(linhas.join("\n") + "\n");
    comandos.push(...texto, GS, 0x56, 0x00);
    return new Uint8Array(comandos);
}

async function imprimirComprovanteWindows80() {
    const dados = comprovantePendenteImpressao;
    const select = document.getElementById("rtBridgePrinter");
    const printerName = select?.value;
    if (!dados || !printerName) { alert("Selecione uma impressora instalada no Windows."); return; }
    const botao = document.getElementById("rtBridgeImprimir80");
    if (botao) { botao.disabled = true; botao.textContent = "Enviando..."; }
    try {
        const bytes = montarComprovanteEscPos80(dados);
        let binary = "";
        bytes.forEach(byte => binary += String.fromCharCode(byte));
        const dataBase64 = btoa(binary);
        const response = await fetch(`${RIVER_PRINT_BRIDGE}/print/raw`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ printerName, dataBase64 })
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "Falha ao enviar impressão.");
        fecharEscolhaImpressao();
        comprovantePendenteImpressao = null;
        alert("Comprovante enviado à impressora " + printerName + ".");
    } catch (error) {
        alert("Não foi possível imprimir pelo Windows: " + (error.message || error) + "\nVocê ainda pode usar a impressão pelo navegador.");
    } finally {
        if (botao) { botao.disabled = false; botao.textContent = "Imprimir 80 mm pelo Windows"; }
    }
}

document.getElementById("rtBridgePrinter")?.addEventListener("change", event => {
    const nome = event.target.value;
    const checkbox = document.getElementById("rtBridgeSalvarPadrao");
    const botao = document.getElementById("rtBridgeImprimir80");
    if (botao) botao.disabled = !nome;
    if (checkbox?.checked) salvarPreferenciaImpressora(nome);
});

document.getElementById("rtBridgeSalvarPadrao")?.addEventListener("change", event => {
    const nome = document.getElementById("rtBridgePrinter")?.value || "";
    if (event.target.checked && !nome) {
        event.target.checked = false;
        alert("Selecione uma impressora antes de memorizá-la como padrão.");
        return;
    }
    salvarPreferenciaImpressora(event.target.checked ? nome : "");
    const status = document.getElementById("rtBridgeStatus");
    if (status && event.target.checked) status.textContent = `Impressora padrão salva neste computador: ${nome}.`;
    else if (status) status.textContent = "Preferência de impressora padrão removida deste navegador.";
});

document.getElementById("rtBridgeDetectar")?.addEventListener("click", detectarImpressorasWindows);
document.getElementById("rtBridgeImprimir80")?.addEventListener("click", imprimirComprovanteWindows80);

if (modalEscolhaImpressao) {
    modalEscolhaImpressao.addEventListener("transitionend", () => {});
    modalEscolhaImpressao.querySelectorAll("[data-print-format]").forEach(botao => {
        botao.addEventListener("click", () => {
            const formato = botao.dataset.printFormat;
            const dados = comprovantePendenteImpressao;
            const salvarFormato = document.getElementById("rtSalvarFormatoPadrao")?.checked;
            if (salvarFormato) {
                try { localStorage.setItem(RIVER_PRINT_FORMAT_STORAGE_KEY, formato); }
                catch (error) { console.warn("Não foi possível salvar o formato preferido:", error); }
            }
            fecharEscolhaImpressao();
            comprovantePendenteImpressao = null;
            if (dados) imprimirComprovanteVenda(dados, formato);
        });
    });
    ["btnFecharEscolhaImpressao", "btnCancelarEscolhaImpressao"].forEach(id => {
        document.getElementById(id)?.addEventListener("click", () => {
            fecharEscolhaImpressao();
            comprovantePendenteImpressao = null;
        });
    });
    modalEscolhaImpressao.addEventListener("click", e => {
        if (e.target === modalEscolhaImpressao) { fecharEscolhaImpressao(); comprovantePendenteImpressao = null; }
    });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape" && !modalEscolhaImpressao.hidden) { fecharEscolhaImpressao(); comprovantePendenteImpressao = null; }
    });
}

function imprimirComprovanteVenda(dados, formato = "80") {
    const janela = window.open("", "_blank", "width=420,height=720");
    if (!janela) { alert("A venda foi concluída, mas o navegador bloqueou a impressão. Permita pop-ups para este PDV."); return; }
    const cfg = configuracoesComprovante || {};
    const nomeEmpresaComprovante = cfg.nome_exibicao || empresaNome?.textContent || "Empresa";
    const cabecalhoPersonalizado = cfg.cabecalho_comprovante ? `<p class="cabecalho-personalizado">${escapeHtml(cfg.cabecalho_comprovante).replace(/\n/g, "<br>")}</p>` : "";
    const telefone = cfg.telefone ? `<p>${escapeHtml(cfg.telefone)}</p>` : "";
    const email = cfg.email_contato ? `<p>${escapeHtml(cfg.email_contato)}</p>` : "";
    const endereco = cfg.endereco ? `<p>${escapeHtml(cfg.endereco)}</p>` : "";
    const logo = cfg.logo_url ? `<div class="logo"><img src="${escapeHtml(cfg.logo_url)}" alt="Logo da empresa"></div>` : "";
    const rodape = cfg.rodape_comprovante ? `<p class="rodape">${escapeHtml(cfg.rodape_comprovante).replace(/\n/g, "<br>")}</p>` : "";
    const linhas = (dados.itens || []).map(item => {
        const nome = escapeHtml(item.produto?.nome || item.nome || "Produto"), qtd = Number(item.quantidade) || 0, preco = Number(item.produto?.preco_venda ?? item.preco_unitario) || 0;
        return `<tr><td>${nome}<br><small>${qtd} x ${formatarMoeda(preco)}</small></td><td style="text-align:right">${formatarMoeda(qtd * preco)}</td></tr>`;
    }).join("");
    janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Comprovante de venda</title><style>
    *{box-sizing:border-box}
    :root{color-scheme:light}
    body{font-family:Arial,Helvetica,sans-serif;color:#111;width:${formato === "a4" ? "190mm" : formato === "58" ? "48mm" : "72mm"};max-width:100%;margin:${formato === "a4" ? "10mm auto" : "6px auto"};font-size:${formato === "a4" ? "11pt" : formato === "58" ? "9pt" : "9.5pt"};line-height:1.35;background:#fff}
    .cabecalho{text-align:center;border-bottom:1px dashed #777;padding:0 0 8px;margin-bottom:8px}
    .logo{margin:0 auto 6px;max-width:${formato === "a4" ? "150px" : "110px"};max-height:64px;display:flex;align-items:center;justify-content:center}
    .logo img{max-width:100%;max-height:64px;object-fit:contain}
    h2{font-size:${formato === "a4" ? "17pt" : "13pt"};line-height:1.2;margin:3px 0 5px;overflow-wrap:anywhere}
    .cabecalho p{margin:2px 0;overflow-wrap:anywhere}
    .cabecalho-personalizado{font-size:.92em;font-weight:600;line-height:1.3;margin-top:5px!important}
    p{margin:5px 0;overflow-wrap:anywhere}
    table{width:100%;border-collapse:collapse;table-layout:fixed;margin:8px 0}
    td{padding:${formato === "a4" ? "7px 4px" : "4px 1px"};border-bottom:1px dashed #c4c4c4;vertical-align:top;overflow-wrap:anywhere}
    td:first-child{padding-right:5px;width:70%}td:last-child{width:30%;text-align:right;white-space:nowrap}
    td small{font-size:.88em;color:#444;line-height:1.25}
    .total{font-size:${formato === "a4" ? "16pt" : "13pt"};font-weight:700;border-top:1.5px solid #111;padding-top:7px;margin-top:7px}
    .linha{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin:4px 0}
    .linha span:last-child{text-align:right;white-space:nowrap}
    .muted{font-size:8.5pt;color:#555;text-align:center;line-height:1.4}
    .rodape{text-align:center;overflow-wrap:anywhere;margin:8px 0;font-size:.9em}
    .acoes{text-align:center;margin-top:14px}
    hr{border:0;border-top:1px dashed #888;margin:7px 0}
    @page{size:${formato === "a4" ? "A4 portrait" : formato === "58" ? "58mm auto" : "80mm auto"};margin:${formato === "a4" ? "10mm" : "2mm"}}
    @media print{html,body{margin:0 auto!important;width:${formato === "a4" ? "190mm" : formato === "58" ? "48mm" : "72mm"};max-width:none}button{display:none!important}table,tr,.linha,.cabecalho{break-inside:avoid}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body>
    <header class="cabecalho">${logo}<h2>${escapeHtml(nomeEmpresaComprovante)}</h2>${cabecalhoPersonalizado}${telefone}${email}${endereco}<p>PDV ${escapeHtml(pdvNumero?.textContent || "")}</p><p><b>COMPROVANTE NÃO FISCAL</b></p></header>
    <p>Venda nº ${escapeHtml(dados.numero || "—")}</p><p>${new Date().toLocaleString("pt-BR")}</p><hr><table>${linhas}</table>
    <div class="linha"><span>Subtotal</span><span>${formatarMoeda(dados.subtotal)}</span></div><div class="linha"><span>Desconto</span><span>${formatarMoeda(dados.desconto)}</span></div><p class="linha total"><span>TOTAL</span><span>${formatarMoeda(dados.total)}</span></p>
    <p>Pagamento: ${escapeHtml(dados.formaPagamento || "Registrado no sistema")}</p>${dados.valorRecebido != null ? `<div class="linha"><span>Recebido</span><span>${formatarMoeda(dados.valorRecebido)}</span></div><div class="linha"><span>Troco</span><span>${formatarMoeda(dados.troco || 0)}</span></div>` : ""}${dados.cliente ? `<p>Cliente: ${escapeHtml(dados.cliente)}</p>` : ""}
    <hr><p class="muted">Documento não fiscal. Não substitui documento fiscal autorizado.</p>${rodape}<div class="acoes"><button onclick="window.print()">Imprimir</button></div><script>window.onload=()=>{const img=document.querySelector('.logo img');if(img&&!img.complete){img.onload=()=>window.print();img.onerror=()=>window.print()}else{window.print()}}<\/script></body></html>`);
    janela.document.close();
}
/* =========================================================
   CARREGAR FORMAS DE PAGAMENTO
   ========================================================= */

async function carregarFormasPagamento() {
    if (!dadosPDV) return;

    const select = prepararAreaPagamento();

    if (!select) return;

    select.disabled = true;

    select.innerHTML =
        '<option value="">Carregando formas de pagamento...</option>';

    const { usuario } = dadosPDV;

    const {
        data,
        error
    } = await supabaseClient
        .from("erp_formas_pagamento")
        .select("id, nome, tipo, ativo")
        .eq("empresa_id", usuario.empresa_id)
        .eq("ativo", true)
        .order("nome", { ascending: true });

    if (error) {
        console.error("Erro ao carregar pagamentos:", error);

        formasPagamento = [];

        select.innerHTML =
            '<option value="">Erro ao carregar pagamentos</option>';

        select.disabled = true;

        atualizarEstadoBotaoFinalizar();

        return;
    }

    formasPagamento = data || [];

    if (!formasPagamento.length) {
        select.innerHTML =
            '<option value="">Nenhuma forma de pagamento cadastrada</option>';

        select.disabled = true;

        atualizarEstadoBotaoFinalizar();

        return;
    }

    select.innerHTML = `
        <option value="">Selecione o pagamento</option>

        ${formasPagamento.map(forma => `
            <option value="${escapeHtml(forma.id)}">
                ${escapeHtml(forma.nome)}
            </option>
        `).join("")}
    `;

    select.disabled = false;
    select.value = "";
    formaPagamentoSelecionada = "";
    pagamentosVenda = [];
    renderizarCardsPagamento();
    renderizarDetalhesPagamento();
    atualizarEstadoBotaoFinalizar();
    atualizarResumoValeCredito();
}


/* =========================================================
   ATUALIZAR BOTÃO DE FINALIZAÇÃO
   ========================================================= */

function atualizarEstadoBotaoFinalizar() {
    if (!btnFinalizarVenda) return;
    const temItens = carrinho.length > 0;
    const devido = obterValorDevidoPagamento();
    const valeCobreTudo = devido <= 0.009 && Boolean(valeCreditoPDV);
    const pagamentosValidos = valeCobreTudo || pagamentoDivididoEstaValido();
    btnFinalizarVenda.disabled = !(temItens && pagamentosValidos);
    atualizarResumoValeCredito();
}


/* =========================================================
   PRODUTOS
   ========================================================= */

async function carregarProdutos() {
    if (!dadosPDV) return;

    const { usuario } = dadosPDV;

    // Atualiza preços agendados e ofertas vigentes antes de exibir produtos.
    try {
        const { error: erroPrecos } = await supabaseClient.rpc("erp_aplicar_precos_agendados");
        if (erroPrecos) console.info("Aplicação de preços/ofertas ainda indisponível:", erroPrecos.message);
    } catch (erroPrecos) {
        console.info("Não foi possível atualizar preços programados:", erroPrecos);
    }

    const {
        data,
        error
    } = await supabaseClient
        .from("erp_produtos")
        .select(`
            id,
            empresa_id,
            codigo,
            codigo_barras,
            nome,
            descricao,
            unidade,
            preco_venda,
            ativo
        `)
        .eq("empresa_id", usuario.empresa_id)
        .eq("ativo", true)
        .order("nome", { ascending: true })
        .limit(100);

    if (error) {
        console.error("Erro ao carregar produtos:", error);

        listaProdutos.innerHTML = `
            <div class="venda-vazia">
                <strong>Não foi possível carregar os produtos</strong>
                <span>${escapeHtml(error.message)}</span>
            </div>
        `;

        return;
    }

    produtosDisponiveis = data || [];

    renderizarProdutos(produtosDisponiveis);
}

function pesquisarProdutos() {
    // Não exibimos cartões/pré-visualização de produtos: a busca serve para
    // leitura de código e inclusão direta pelo Enter (como leitor de barras).
    if (listaProdutos) {
        listaProdutos.innerHTML = "";
        listaProdutos.hidden = true;
    }
}

function adicionarProdutoPelaBusca() {
    const termo = String(campoBuscaProduto?.value || "").trim().toLowerCase();
    if (!termo) return;
    const produto = produtosDisponiveis.find(p =>
        String(p.codigo_barras || "").trim().toLowerCase() === termo ||
        String(p.codigo || "").trim().toLowerCase() === termo ||
        String(p.nome || "").trim().toLowerCase() === termo
    ) || (() => {
        const encontrados = produtosDisponiveis.filter(p =>
            String(p.codigo_barras || "").toLowerCase().includes(termo) ||
            String(p.codigo || "").toLowerCase().includes(termo) ||
            String(p.nome || "").toLowerCase().includes(termo)
        );
        return encontrados.length === 1 ? encontrados[0] : null;
    })();
    if (!produto) {
        alert("Produto não encontrado de forma única. Confira o código e tente novamente.");
        campoBuscaProduto?.select();
        return;
    }
    adicionarAoCarrinho(produto);
    campoBuscaProduto.value = "";
    campoBuscaProduto.focus();
}

function renderizarProdutos(produtos) {
    if (!produtos.length) {
        listaProdutos.innerHTML = `
            <div class="venda-vazia">
                <strong>Nenhum produto encontrado</strong>
                <span>Tente outro nome ou código.</span>
            </div>
        `;

        return;
    }

    listaProdutos.innerHTML = produtos.map(produto => {
        const codigo =
            produto.codigo_barras ||
            produto.codigo ||
            "Sem código";

        return `
            <button
                type="button"
                class="produto-item"
                data-produto-id="${escapeHtml(produto.id)}">

                <div class="produto-info">
                    <span class="produto-nome">
                        ${escapeHtml(produto.nome)}
                    </span>

                    <span class="produto-codigo">
                        ${escapeHtml(codigo)}
                        ${produto.unidade
                            ? " • " + escapeHtml(produto.unidade)
                            : ""}
                    </span>
                </div>

                <span class="produto-preco">
                    ${formatarMoeda(produto.preco_venda)}
                </span>
            </button>
        `;
    }).join("");

    listaProdutos.querySelectorAll(".produto-item").forEach(botao => {
        botao.addEventListener("click", () => {
            const produto = produtosDisponiveis.find(
                item => String(item.id) === String(botao.dataset.produtoId)
            );

            if (produto) {
                adicionarAoCarrinho(produto);
            }
        });
    });
}


/* =========================================================
   CARRINHO E CÁLCULOS
   ========================================================= */

function adicionarAoCarrinho(produto) {
    const existente = carrinho.find(
        item => String(item.produto.id) === String(produto.id)
    );

    if (existente) {
        existente.quantidade += 1;
    } else {
        carrinho.push({
            produto,
            quantidade: 1
        });
    }

    atualizarCarrinho();
}

function alterarQuantidade(produtoId, delta) {
    const item = carrinho.find(
        item => String(item.produto.id) === String(produtoId)
    );

    if (!item) return;

    item.quantidade += delta;

    if (item.quantidade <= 0) {
        carrinho = carrinho.filter(
            item => String(item.produto.id) !== String(produtoId)
        );
    }

    atualizarCarrinho();
}

function removerDoCarrinho(produtoId) {
    carrinho = carrinho.filter(
        item => String(item.produto.id) !== String(produtoId)
    );

    atualizarCarrinho();
}

function calcularSubtotal() {
    return carrinho.reduce((total, item) => {
        const preco =
            Number(item.produto.preco_venda) || 0;

        return total + preco * item.quantidade;
    }, 0);
}

function calcularDesconto() {
    let desconto = Number(descontoVenda.value) || 0;

    const subtotal = calcularSubtotal();

    desconto = Math.max(
        0,
        Math.min(desconto, subtotal)
    );

    return desconto;
}

function calcularTotal() {
    return Math.max(
        0,
        calcularSubtotal() - calcularDesconto()
    );
}

function abrirModalPagamento() {
    if (!carrinho.length) { alert("Adicione pelo menos um produto antes de efetuar o pagamento."); return; }
    if (!modalPagamento) return;
    modalPagamento.hidden = false;
    document.body.classList.add("pagamento-aberto");
    const primeiroCampo = modalPagamento.querySelector("input:not([type=hidden]), select, button:not(:disabled)");
    if (primeiroCampo) setTimeout(() => primeiroCampo.focus(), 40);
}
function fecharModalPagamento() {
    if (!modalPagamento) return;
    if (btnFinalizarVenda && btnFinalizarVenda.disabled === true && /processando/i.test(btnFinalizarVenda.textContent)) return;
    modalPagamento.hidden = true;
    document.body.classList.remove("pagamento-aberto");
    if (campoBuscaProduto) campoBuscaProduto.focus();
}
if (btnAbrirPagamento) btnAbrirPagamento.addEventListener("click", abrirModalPagamento);
if (btnFecharPagamento) btnFecharPagamento.addEventListener("click", fecharModalPagamento);
if (modalPagamento) modalPagamento.addEventListener("click", e => { if (e.target === modalPagamento) fecharModalPagamento(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && modalPagamento && !modalPagamento.hidden) fecharModalPagamento(); });

function atualizarCarrinho() {
    const quantidadeTotal = carrinho.reduce(
        (total, item) => total + item.quantidade,
        0
    );

    contadorItens.textContent =
        `${quantidadeTotal} ${quantidadeTotal === 1 ? "item" : "itens"}`;

    const subtotalAcumulado = calcularSubtotal();

    subtotalVenda.textContent = formatarMoeda(subtotalAcumulado);
    if (subtotalAcumuladoVenda) {
        subtotalAcumuladoVenda.textContent = formatarMoeda(subtotalAcumulado);
    }

    totalVenda.textContent =
        formatarMoeda(calcularTotal());
    if (resumoUltimoItem) {
        const ultimo = carrinho.length ? carrinho[carrinho.length - 1] : null;
        resumoUltimoItem.innerHTML = ultimo ? `
            <span>ÚLTIMO ITEM REGISTRADO</span>
            <strong>${escapeHtml(ultimo.produto.nome)}</strong>
            <small>Quantidade: ${ultimo.quantidade} · Unitário: ${formatarMoeda(Number(ultimo.produto.preco_venda) || 0)} · Subtotal: ${formatarMoeda((Number(ultimo.produto.preco_venda) || 0) * ultimo.quantidade)}</small>
        ` : '<span>ÚLTIMO ITEM REGISTRADO</span><strong>Nenhum produto adicionado</strong><small>Quantidade, preço e subtotal aparecerão aqui.</small>';
    }
    if (formaPagamentoSelecionada) renderizarDetalhesPagamento();

    if (!carrinho.length) {
        listaCarrinho.innerHTML = `
            <div class="carrinho-vazio">
                <div>🛒</div>
                <strong>Carrinho vazio</strong>
                <span>Adicione produtos para começar.</span>
            </div>
        `;
    } else {
        listaCarrinho.innerHTML = carrinho.map(item => {
            const preco =
                Number(item.produto.preco_venda) || 0;

            const totalItem =
                preco * item.quantidade;

            return `
                <div class="carrinho-item">
                    <div class="carrinho-item-topo">
                        <span class="carrinho-item-nome">
                            ${escapeHtml(item.produto.nome)}
                        </span>

                        <button
                            type="button"
                            class="carrinho-item-remover"
                            data-remover="${escapeHtml(item.produto.id)}"
                            title="Remover">
                            ×
                        </button>
                    </div>

                    <div class="carrinho-item-info">
                        <div class="quantidade-controle">
                            <button
                                type="button"
                                data-delta="-1"
                                data-produto="${escapeHtml(item.produto.id)}">
                                −
                            </button>

                            <span>${item.quantidade}</span>

                            <button
                                type="button"
                                data-delta="1"
                                data-produto="${escapeHtml(item.produto.id)}">
                                +
                            </button>
                        </div>

                        <strong class="carrinho-item-total">
                            ${formatarMoeda(totalItem)}
                        </strong>
                    </div>
                </div>
            `;
        }).join("");

        listaCarrinho
            .querySelectorAll("[data-remover]")
            .forEach(botao => {
                botao.addEventListener("click", () => {
                    removerDoCarrinho(botao.dataset.remover);
                });
            });

        listaCarrinho
            .querySelectorAll("[data-delta]")
            .forEach(botao => {
                botao.addEventListener("click", () => {
                    alterarQuantidade(
                        botao.dataset.produto,
                        Number(botao.dataset.delta)
                    );
                });
            });
    }

    atualizarEstadoBotaoFinalizar();
    atualizarResumoValeCredito();
}


/* =========================================================
   IDENTIFICAÇÃO DO CLIENTE POR CPF
   ========================================================= */
function cpfSomenteDigitos(valor) {
    return String(valor || "").replace(/\D/g, "").slice(0, 11);
}

function formatarCPF(valor) {
    const cpf = cpfSomenteDigitos(valor);
    if (cpf.length <= 3) return cpf;
    if (cpf.length <= 6) return cpf.replace(/(\d{3})(\d+)/, "$1.$2");
    if (cpf.length <= 9) return cpf.replace(/(\d{3})(\d{3})(\d+)/, "$1.$2.$3");
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4");
}

function cpfValidoPDV(valor) {
    const cpf = cpfSomenteDigitos(valor);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i);
    let digito = (soma * 10) % 11;
    if (digito === 10) digito = 0;
    if (digito !== Number(cpf[9])) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i);
    digito = (soma * 10) % 11;
    if (digito === 10) digito = 0;
    return digito === Number(cpf[10]);
}

function alternarAbaVenda(aba) {
    const areas = {
        produtos: layoutProdutosVenda,
        cliente: areaClienteVenda,
        vale: areaValeCreditoPanel,
        precos: areaConsultaPrecoVenda
    };
    Object.entries(areas).forEach(([nome, elemento]) => {
        if (elemento) elemento.hidden = nome !== aba;
    });
    const botoes = {
        produtos: tabProdutosVenda,
        cliente: tabClienteVenda,
        vale: tabValeCreditoVenda,
        precos: tabConsultaPrecoVenda
    };
    Object.entries(botoes).forEach(([nome, elemento]) => {
        if (!elemento) return;
        elemento.classList.toggle("active", nome === aba);
        elemento.setAttribute("aria-selected", String(nome === aba));
    });
    if (aba === "cliente" && campoCpfClientePDV) {
        window.setTimeout(() => campoCpfClientePDV.focus(), 50);
    } else if (aba === "precos" && campoConsultaPreco) {
        window.setTimeout(() => campoConsultaPreco.focus(), 50);
    } else if (aba === "produtos" && campoBuscaProduto) {
        campoBuscaProduto.focus();
    }
}

let estoquesConsultaPreco = [];
let ofertasConsultaPreco = [];
let consultaPrecoCarregando = false;

async function carregarDadosConsultaPreco() {
    if (!dadosPDV || consultaPrecoCarregando) return;
    consultaPrecoCarregando = true;
    try {
        const agora = new Date().toISOString();
        const [estoqueResp, ofertaResp] = await Promise.all([
            supabaseClient.from("erp_estoques").select("produto_id,quantidade").eq("empresa_id", dadosPDV.usuario.empresa_id).is("pdv_id", null),
            supabaseClient.from("erp_ofertas").select("produto_id,preco_oferta,preco_normal,inicio_em,fim_em,status").eq("empresa_id", dadosPDV.usuario.empresa_id).eq("status", "ATIVA").lte("inicio_em", agora).gt("fim_em", agora)
        ]);
        estoquesConsultaPreco = estoqueResp.error ? [] : (estoqueResp.data || []);
        ofertasConsultaPreco = ofertaResp.error ? [] : (ofertaResp.data || []);
        renderizarConsultaPreco();
    } catch (error) {
        console.warn("Não foi possível carregar estoque/ofertas para consulta de preço:", error);
    } finally {
        consultaPrecoCarregando = false;
    }
}

function renderizarConsultaPreco() {
    if (!resultadosConsultaPreco) return;
    const termo = String(campoConsultaPreco?.value || "").trim().toLowerCase();
    if (!termo) {
        resultadosConsultaPreco.innerHTML = "<p>Digite um termo para consultar produtos.</p>";
        return;
    }
    const encontrados = produtosDisponiveis.filter((p) =>
        [p.codigo, p.codigo_barras, p.nome, p.descricao].some((v) => String(v || "").toLowerCase().includes(termo))
    ).slice(0, 50);
    if (!encontrados.length) {
        resultadosConsultaPreco.innerHTML = "<p>Nenhum produto encontrado.</p>";
        return;
    }
    resultadosConsultaPreco.innerHTML = encontrados.map((p) => {
        const oferta = ofertasConsultaPreco.find((o) => String(o.produto_id) === String(p.id));
        const estoque = estoquesConsultaPreco.filter((e) => String(e.produto_id) === String(p.id)).reduce((soma, e) => soma + Number(e.quantidade || 0), 0);
        return `<article class="price-search-item">
            <div><strong>${escapeHtml(p.nome || "Produto")}</strong><span>Código: ${escapeHtml(p.codigo || "—")} · Barras: ${escapeHtml(p.codigo_barras || "—")}</span><span>Estoque central: ${estoque.toLocaleString("pt-BR")}</span></div>
            <div class="price-search-price"><strong>${formatarMoeda(oferta ? oferta.preco_oferta : p.preco_venda)}</strong>${oferta ? `<span class="price-promo">Oferta ativa · normal ${formatarMoeda(oferta.preco_normal)}</span>` : `<span>Preço vigente</span>`}</div>
        </article>`;
    }).join("");
}


function mostrarMensagemClientePDV(texto, tipo = "") {
    if (!mensagemClientePDV) return;
    mensagemClientePDV.textContent = texto;
    mensagemClientePDV.classList.remove("erro", "sucesso");
    if (tipo) mensagemClientePDV.classList.add(tipo);
}

function renderizarClienteSelecionadoPDV() {
    if (!clienteSelecionadoPDV) {
        if (dadosClientePDV) {
            dadosClientePDV.hidden = true;
            dadosClientePDV.innerHTML = "";
        }
        if (clienteTabStatus) clienteTabStatus.textContent = "Opcional";
        mostrarMensagemClientePDV("Nenhum cliente identificado nesta venda.");
        return;
    }
    const c = clienteSelecionadoPDV;
    const endereco = [c.logradouro, c.numero, c.complemento, c.bairro, c.cidade, c.uf, c.cep]
        .filter(Boolean).join(", ");
    if (dadosClientePDV) {
        dadosClientePDV.innerHTML = `
            <h4>Cliente identificado</h4>
            <div class="cliente-venda-grid">
                <div class="cliente-venda-dado"><span>Nome completo</span><strong>${escapeHtml(c.nome)}</strong></div>
                <div class="cliente-venda-dado"><span>CPF</span><strong>${escapeHtml(formatarCPF(c.cpf))}</strong></div>
                <div class="cliente-venda-dado"><span>Telefone</span><strong>${escapeHtml(c.telefone || "Não informado")}</strong></div>
                <div class="cliente-venda-dado"><span>Nascimento</span><strong>${c.data_nascimento ? escapeHtml(new Date(c.data_nascimento + "T12:00:00").toLocaleDateString("pt-BR")) : "Não informado"}</strong></div>
                <div class="cliente-venda-dado" style="grid-column:1/-1"><span>Endereço</span><strong>${escapeHtml(endereco || "Não informado")}</strong></div>
            </div>`;
        dadosClientePDV.hidden = false;
    }
    if (clienteTabStatus) clienteTabStatus.textContent = "Identificado";
    mostrarMensagemClientePDV("Cliente selecionado para esta venda.", "sucesso");
}

async function buscarClientePorCPFNoPDV(event) {
    if (event) event.preventDefault();
    if (!dadosPDV?.usuario?.empresa_id) {
        mostrarMensagemClientePDV("Não foi possível identificar a loja deste PDV.", "erro");
        return;
    }
    const cpf = cpfSomenteDigitos(campoCpfClientePDV?.value);
    if (!cpfValidoPDV(cpf)) {
        mostrarMensagemClientePDV("Digite um CPF válido para pesquisar.", "erro");
        campoCpfClientePDV?.focus();
        return;
    }
    if (btnBuscarClientePDV) {
        btnBuscarClientePDV.disabled = true;
        btnBuscarClientePDV.textContent = "Buscando...";
    }
    try {
        const { data, error } = await supabaseClient
            .from("erp_clientes")
            .select("id,empresa_id,nome,cpf,data_nascimento,telefone,logradouro,numero,complemento,bairro,cidade,uf,cep,ativo")
            .eq("empresa_id", dadosPDV.usuario.empresa_id)
            .eq("cpf", cpf)
            .maybeSingle();
        if (error) throw error;
        if (!data || data.ativo === false) {
            clienteSelecionadoPDV = null;
            renderizarClienteSelecionadoPDV();
            mostrarMensagemClientePDV("Cliente não encontrado ou cadastro inativo nesta loja. Confira o CPF ou cadastre o cliente no módulo Clientes.", "erro");
            return;
        }
        clienteSelecionadoPDV = data;
        renderizarClienteSelecionadoPDV();
        alternarAbaVenda("produtos");
    } catch (error) {
        console.error("Erro ao buscar cliente por CPF:", error);
        mostrarMensagemClientePDV("Não foi possível consultar o cliente. Confira a migração SQL e a conexão do PDV.", "erro");
    } finally {
        if (btnBuscarClientePDV) {
            btnBuscarClientePDV.disabled = false;
            btnBuscarClientePDV.textContent = "Buscar CPF";
        }
    }
}

function limparClienteSelecionadoPDV() {
    clienteSelecionadoPDV = null;
    if (campoCpfClientePDV) campoCpfClientePDV.value = "";
    renderizarClienteSelecionadoPDV();
    if (campoCpfClientePDV) campoCpfClientePDV.focus();
}

async function vincularClienteAVenda(resultadoVenda) {
    if (!clienteSelecionadoPDV) return { vinculado: false, ignorado: true };
    const vendaId = resultadoVenda?.venda_id ?? resultadoVenda?.id ?? resultadoVenda?.venda?.id;
    if (vendaId === null || vendaId === undefined || vendaId === "") {
        console.warn("Venda confirmada, mas a resposta do RPC não retornou o ID para vincular o cliente.", resultadoVenda);
        return { vinculado: false, semId: true };
    }
    const { error } = await supabaseClient
        .from("erp_venda_clientes")
        .upsert({
            empresa_id: dadosPDV.usuario.empresa_id,
            venda_id: vendaId,
            cliente_id: clienteSelecionadoPDV.id
        }, { onConflict: "empresa_id,venda_id" });
    if (error) throw error;
    return { vinculado: true };
}

if (tabProdutosVenda) tabProdutosVenda.addEventListener("click", () => alternarAbaVenda("produtos"));
if (tabClienteVenda) tabClienteVenda.addEventListener("click", () => alternarAbaVenda("cliente"));
if (tabValeCreditoVenda) tabValeCreditoVenda.addEventListener("click", () => alternarAbaVenda("vale"));
if (tabConsultaPrecoVenda) tabConsultaPrecoVenda.addEventListener("click", () => { alternarAbaVenda("precos"); carregarDadosConsultaPreco(); renderizarConsultaPreco(); });
if (document.getElementById("btnVoltarVendaVale")) document.getElementById("btnVoltarVendaVale").addEventListener("click", () => alternarAbaVenda("produtos"));
if (document.getElementById("btnVoltarConsultaPreco")) document.getElementById("btnVoltarConsultaPreco").addEventListener("click", () => alternarAbaVenda("produtos"));
if (campoConsultaPreco) campoConsultaPreco.addEventListener("input", renderizarConsultaPreco);
if (btnVoltarVendaCliente) btnVoltarVendaCliente.addEventListener("click", () => alternarAbaVenda("produtos"));
if (formBuscarClientePDV) formBuscarClientePDV.addEventListener("submit", buscarClientePorCPFNoPDV);
if (campoCpfClientePDV) campoCpfClientePDV.addEventListener("input", () => { campoCpfClientePDV.value = formatarCPF(campoCpfClientePDV.value); });
if (btnLimparClientePDV) btnLimparClientePDV.addEventListener("click", limparClienteSelecionadoPDV);

/* =========================================================
   ABRIR E FECHAR MODAL DE VENDA
   ========================================================= */

async function abrirNovaVenda() {
    if (!caixaAtual) {
        alert("Abra o caixa antes de iniciar uma venda.");
        return;
    }

    carrinho = [];
    formaPagamentoSelecionada = "";
    produtosDisponiveis = [];
    clienteSelecionadoPDV = null;
    if (campoCpfClientePDV) campoCpfClientePDV.value = "";
    renderizarClienteSelecionadoPDV();
    alternarAbaVenda("produtos");

    limparValeCredito();

    atualizarCarrinho();

    descontoVenda.value = "0";

    modalVenda.hidden = false;
    document.body.style.overflow = "hidden";

    prepararAreaPagamento();

    const select =
        document.getElementById("formaPagamentoVenda");

    if (select) {
        select.value = "";
        select.disabled = true;

        select.innerHTML =
            '<option value="">Carregando formas de pagamento...</option>';
    }

    campoBuscaProduto.value = "";

    listaProdutos.innerHTML = `
        <div class="venda-vazia">
            <strong>Carregando produtos...</strong>
            <span>Aguarde um momento.</span>
        </div>
    `;

    try {
        await carregarProdutos();
        await carregarFormasPagamento();
    } catch (error) {
        console.error("Erro ao abrir venda:", error);

        alert(
            "Ocorreu um erro ao carregar os dados da venda."
        );
    }

    atualizarCarrinho();
    atualizarEstadoBotaoFinalizar();

    campoBuscaProduto.focus();
}

function fecharNovaVenda() {
    modalVenda.hidden = true;

    if (!modalFechamento || modalFechamento.hidden) {
        document.body.style.overflow = "";
    }
}


/* =========================================================
   FINALIZAR VENDA
   ========================================================= */

async function finalizarVenda() {
    if (!dadosPDV) return;

    if (!caixaAtual) {
        alert("O caixa não está aberto.");
        return;
    }

    if (!carrinho.length) {
        alert("Adicione pelo menos um produto.");
        return;
    }

    // Revalida a vigência imediatamente antes de concluir a venda.
    try {
        const { error: erroAplicacao } = await supabaseClient.rpc("erp_aplicar_precos_agendados");
        if (erroAplicacao) console.info("Não foi possível aplicar preços vigentes antes da venda:", erroAplicacao.message);
        const { data: precosAtuais, error: erroConsultaPrecos } = await supabaseClient
            .from("erp_produtos")
            .select("id,preco_venda")
            .eq("empresa_id", dadosPDV.usuario.empresa_id)
            .in("id", carrinho.map(item => item.produto.id));
        if (!erroConsultaPrecos && precosAtuais) {
            const mapaPrecos = new Map(precosAtuais.map(p => [String(p.id), Number(p.preco_venda) || 0]));
            carrinho.forEach(item => { const atual = mapaPrecos.get(String(item.produto.id)); if (atual !== undefined) item.produto.preco_venda = atual; });
            atualizarCarrinho();
        }
    } catch (erroAplicacao) {
        console.warn("Falha ao revalidar preço no PDV:", erroAplicacao);
    }

    const desconto = calcularDesconto();
    const total = calcularTotal();

    const codigoVale = valeCreditoPDV
        ? valeCreditoPDV.codigo
        : "";

    const saldoVale = valeCreditoPDV
        ? Number(valeCreditoPDV.saldo) || 0
        : 0;

    const temValeValido =
        Boolean(codigoVale) && saldoVale > 0;

    const creditoPrevisto = temValeValido
        ? Math.min(total, saldoVale)
        : 0;

    const diferencaPrevista = Math.max(
        0,
        total - creditoPrevisto
    );

    // Confere todas as parcelas no navegador; a validação definitiva também ocorre no banco.
    if (diferencaPrevista > 0.009 && !pagamentoDivididoEstaValido()) {
        alert("Confira as formas de pagamento: os valores devem somar exatamente o saldo devido e cada parcela em dinheiro deve estar coberta pelo valor recebido.");
        atualizarTrocoVenda();
        return;
    }

    const formaPagamentoAtual = obterFormaPorId(pagamentosVenda[0]?.formaPagamentoId || formaPagamentoSelecionada);
    const trocoCalculado = pagamentosVenda.reduce((soma, p) => soma + (formaEhDinheiroPorId(p.formaPagamentoId) ? Math.max(0, (Number(p.recebido) || 0) - (Number(p.valor) || 0)) : 0), 0);
    const recebidoDinheiroTotal = pagamentosVenda.reduce((soma, p) => soma + (formaEhDinheiroPorId(p.formaPagamentoId) ? (Number(p.recebido) || 0) : 0), 0);
    const possuiCartao = pagamentosVenda.some(p => formaEhCartaoPorId(p.formaPagamentoId));
    const usarPagamentoDividido = diferencaPrevista > 0.009 && (pagamentosVenda.length > 1 || possuiCartao);
    const itens = carrinho.map(item => ({
        produto_id: item.produto.id,
        quantidade: item.quantidade
    }));

    btnFinalizarVenda.disabled = true;
    btnFinalizarVenda.textContent = "Processando venda...";

    try {
        const {
            data: { session },
            error: erroSessao
        } = await supabaseClient.auth.getSession();

        if (erroSessao) throw erroSessao;

        if (!session?.user) {
            throw new Error(
                "Sua sessão expirou. Faça login novamente."
            );
        }

        let resultado;
        let error;

        if (usarPagamentoDividido) {
            const resposta = await supabaseClient.rpc(
                "erp_finalizar_venda_pagamento_dividido",
                {
                    p_itens: itens,
                    p_pagamentos: obterPagamentosParaEnviar(),
                    p_desconto: desconto,
                    p_observacoes: null,
                    p_codigo_vale: temValeValido ? codigoVale : null
                }
            );
            resultado = resposta.data;
            error = resposta.error;
        } else if (temValeValido) {
            // Mantém a rotina validada para vale com uma única forma de pagamento.
            const resposta = await supabaseClient.rpc(
                "erp_finalizar_venda_com_vale",
                {
                    p_itens: itens,
                    p_forma_pagamento_id: formaPagamentoSelecionada || null,
                    p_desconto: desconto,
                    p_observacoes: null,
                    p_codigo_vale: codigoVale
                }
            );
            resultado = resposta.data;
            error = resposta.error;
        } else {
            // Venda comum com uma forma continua usando o RPC existente.
            const resposta = await supabaseClient.rpc(
                "erp_finalizar_venda",
                {
                    p_itens: itens,
                    p_forma_pagamento_id: formaPagamentoSelecionada,
                    p_desconto: desconto,
                    p_observacoes: null
                }
            );
            resultado = resposta.data;
            error = resposta.error;
        }

        if (error) throw error;

        resultado = obterPrimeiroRegistro(resultado);

        if (!resultado || resultado.sucesso !== true) {
            throw new Error(
                resultado?.mensagem ||
                "O servidor não confirmou a venda."
            );
        }

        let avisoVinculoCliente = "";
        if (clienteSelecionadoPDV) {
            try {
                const vinculo = await vincularClienteAVenda(resultado);
                if (!vinculo.vinculado) {
                    avisoVinculoCliente = vinculo.semId
                        ? "\n\nAtenção: a venda foi concluída, mas o servidor não retornou o identificador necessário para gravar o cliente na venda."
                        : "";
                }
            } catch (erroVinculo) {
                console.error("Venda concluída, mas não foi possível vincular o cliente:", erroVinculo);
                avisoVinculoCliente = "\n\nAtenção: a venda foi concluída, mas o vínculo do cliente não foi salvo. Confira as permissões da tabela erp_venda_clientes antes de repetir a venda.";
            }
        }

        const numeroVenda =
            resultado.numero ||
            resultado.venda_numero ||
            "—";

        const totalConfirmado =
            Number(resultado.total ?? total);

        let mensagemSucesso =
            "Venda finalizada com sucesso!\n\n" +
            "Venda nº: " + numeroVenda + "\n" +
            "Total: " + formatarMoeda(totalConfirmado) +
            (clienteSelecionadoPDV && !avisoVinculoCliente
                ? "\nCliente: " + clienteSelecionadoPDV.nome
                : "") +
            avisoVinculoCliente;

        if (temValeValido) {
            const creditoUtilizado = Number(
                resultado.credito_utilizado ??
                creditoPrevisto
            );

            const valorRecebido = Number(
                resultado.valor_recebido ??
                Math.max(0, totalConfirmado - creditoUtilizado)
            );

            const saldoRestante = Number(
                resultado.saldo_vale ?? 0
            );

            mensagemSucesso +=
                "\n\nVale utilizado: " + codigoVale +
                "\nCrédito utilizado: " +
                formatarMoeda(creditoUtilizado) +
                "\nValor recebido: " +
                formatarMoeda(valorRecebido) +
                "\nSaldo restante do vale: " +
                formatarMoeda(saldoRestante);
        }

        const dadosComprovante = {
            numero: numeroVenda, total: totalConfirmado, subtotal: calcularSubtotal(), desconto,
            itens: carrinho.map(item => ({ produto: { nome: item.produto.nome, preco_venda: item.produto.preco_venda }, quantidade: item.quantidade })),
            formaPagamento: pagamentosVenda.map(p => obterFormaPorId(p.formaPagamentoId)?.nome).filter(Boolean).join(" + ") || (temValeValido ? "Vale de crédito" : "Não informado"),
            valorRecebido: recebidoDinheiroTotal,
            troco: trocoCalculado,
            cliente: clienteSelecionadoPDV?.nome || ""
        };
        alert(mensagemSucesso);
        abrirEscolhaImpressao(dadosComprovante);

        // Limpa a venda após confirmação do servidor.
        carrinho = [];
        clienteSelecionadoPDV = null;
        if (campoCpfClientePDV) campoCpfClientePDV.value = "";
        renderizarClienteSelecionadoPDV();
        descontoVenda.value = "0";
        if (modalPagamento) modalPagamento.hidden = true;
        document.body.classList.remove("pagamento-aberto");
        formaPagamentoSelecionada = "";
        pagamentosVenda = [];

        const select =
            document.getElementById("formaPagamentoVenda");

        if (select) {
            select.value = "";
        }

        limparValeCredito();

        atualizarCarrinho();

        await verificarCaixaAberto();

        fecharNovaVenda();
    } catch (error) {
        console.error("Erro ao finalizar venda:", error);

        alert(
            "Não foi possível finalizar a venda.\n\n" +
            (error.message || "Erro desconhecido.") +
            "\n\nSe houver dúvida sobre o resultado, consulte " +
            "as vendas registradas antes de tentar novamente."
        );
    } finally {
        btnFinalizarVenda.textContent = "Finalizar venda";

        atualizarEstadoBotaoFinalizar();
    }
}



/* =========================================================
   SANGRIA DE CAIXA + COMPROVANTE EM DUAS VIAS
   ========================================================= */
const btnAbrirSangria = document.getElementById("btnAbrirSangria");
const modalSangria = document.getElementById("modalSangria");
const btnCancelarSangria = document.getElementById("btnCancelarSangria");
const btnCancelarSangriaRodape = document.getElementById("btnCancelarSangriaRodape");
const btnConfirmarSangria = document.getElementById("btnConfirmarSangria");
const sangriaValor = document.getElementById("sangriaValor");
const sangriaMotivo = document.getElementById("sangriaMotivo");
const sangriaMensagem = document.getElementById("sangriaMensagem");
let sangriaEmProcessamento = false;

function abrirModalSangria() {
    if (!caixaAtual) { alert("Abra o caixa antes de registrar uma sangria."); return; }
    sangriaValor.value = "";
    sangriaMotivo.value = "";
    sangriaMensagem.textContent = "";
    modalSangria.hidden = false;
    document.body.style.overflow = "hidden";
    sangriaValor.focus();
}
function fecharModalSangria() {
    if (sangriaEmProcessamento) return;
    modalSangria.hidden = true;
    if (!modalFechamento?.hidden && modalFechamento) return;
    if (!modalVenda || modalVenda.hidden) document.body.style.overflow = "";
}
function imprimirComprovanteSangria(dados) {
    const data = new Date().toLocaleString("pt-BR");
    const empresa = escapeHtml(empresaNome?.textContent || "River Tech");
    const terminal = escapeHtml(pdvNumero?.textContent || "--");
    const usuario = escapeHtml(usuarioNome?.textContent || "Operador");
    const valor = formatarMoeda(Number(dados.valor || sangriaValor.value));
    const motivo = escapeHtml(sangriaMotivo.value.trim());
    const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Comprovante de sangria</title><style>body{font:14px Arial;color:#111;margin:12mm}.via{border:1px dashed #777;padding:16px;margin-bottom:18px;page-break-inside:avoid}.via h2{text-align:center;font-size:18px}.linha{border-top:1px dashed #777;margin:12px 0}.valor{font-size:23px;font-weight:bold;text-align:center;margin:18px 0}.rodape{text-align:center;font-size:11px}@media print{button{display:none}}</style><body>${[1,2].map((n)=>`<section class="via"><h2>RIVER TECH — SANGRIA DE CAIXA</h2><p><b>Via ${n===1?'do estabelecimento':'do responsável'}</b></p><div class="linha"></div><p>Empresa: ${empresa}</p><p>Caixa/PDV: ${terminal}</p><p>Operador: ${usuario}</p><p>Data: ${data}</p><div class="valor">${valor}</div><p><b>Motivo/destino:</b> ${motivo}</p><p><b>Protocolo:</b> ${escapeHtml(dados.sangria_id || dados.solicitacao_id || 'registrado')}</p><div class="linha"></div><p>Assinatura do responsável: __________________________</p><p class="rodape">Documento de controle interno — guardar junto ao fechamento do caixa.</p></section>`).join('')}<script>window.onload=()=>{window.print();};<\/script></body></html>`;
    const w = window.open("", "_blank", "width=700,height=850");
    if (!w) { alert("O navegador bloqueou a impressão. Permita pop-ups para imprimir o comprovante em duas vias."); return; }
    w.document.open(); w.document.write(html); w.document.close();
}
async function confirmarSangria() {
    if (sangriaEmProcessamento) return;
    const valor = Number(sangriaValor.value);
    const motivo = String(sangriaMotivo.value || "").trim();
    if (!caixaAtual) { sangriaMensagem.textContent = "Não existe caixa aberto."; return; }
    if (!Number.isFinite(valor) || valor <= 0) { sangriaMensagem.textContent = "Informe um valor maior que zero."; sangriaValor.focus(); return; }
    if (!motivo) { sangriaMensagem.textContent = "Informe o motivo ou destino."; sangriaMotivo.focus(); return; }
    if (!window.confirm(`Confirma a retirada de ${formatarMoeda(valor)} do caixa?`)) return;
    sangriaEmProcessamento = true; btnConfirmarSangria.disabled = true; btnConfirmarSangria.textContent = "Registrando...";
    const solicitacaoId = (window.crypto?.randomUUID?.() || `sangria-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    try {
        const {data, error} = await supabaseClient.rpc("erp_registrar_sangria", {p_valor:valor,p_motivo:motivo,p_solicitacao_id:solicitacaoId});
        if (error) throw error;
        if (!data || data.sucesso !== true) throw new Error(data?.mensagem || "O servidor não confirmou a sangria.");
        modalSangria.hidden = true; document.body.style.overflow = "";
        imprimirComprovanteSangria({...data,valor});
        alert("Sangria registrada. Foi solicitado o comprovante em duas vias.");
    } catch (error) {
        sangriaMensagem.textContent = error.message || "Não foi possível registrar a sangria.";
    } finally {
        sangriaEmProcessamento = false; btnConfirmarSangria.disabled = false; btnConfirmarSangria.textContent = "Registrar e imprimir 2 vias";
    }
}
if (btnAbrirSangria) btnAbrirSangria.addEventListener("click", abrirModalSangria);
if (btnCancelarSangria) btnCancelarSangria.addEventListener("click", fecharModalSangria);
if (btnCancelarSangriaRodape) btnCancelarSangriaRodape.addEventListener("click", fecharModalSangria);
if (btnConfirmarSangria) btnConfirmarSangria.addEventListener("click", confirmarSangria);



/* =========================================================
   CANCELAMENTO DE VENDA NO CAIXA
   A decisão final e os estornos são validados no RPC do banco.
   Pix e pagamentos mistos são recusados no servidor.
   ========================================================= */
async function cancelarVendaDoCaixa() {
    if (!dadosPDV?.usuario || !caixaAtual) {
        alert("Abra o caixa antes de cancelar uma venda.");
        return;
    }
    const botao = btnCancelarVendaCaixa;
    if (botao) { botao.disabled = true; botao.textContent = "Consultando vendas..."; }
    try {
        let consulta = supabaseClient.from("erp_vendas")
            .select("id,numero,total,created_at,status,pdv_id")
            .eq("empresa_id", dadosPDV.usuario.empresa_id)
            .eq("pdv_id", dadosPDV.usuario.pdv_id)
            .eq("status", "FINALIZADA")
            .order("created_at", {ascending:false})
            .limit(30);
        const abertura = caixaAtual.data_abertura || caixaAtual.created_at;
        if (abertura) consulta = consulta.gte("created_at", abertura);
        const {data,error} = await consulta;
        if (error) throw error;
        const vendas = data || [];
        if (!vendas.length) {
            alert("Não há vendas finalizadas deste caixa disponíveis para cancelamento.");
            return;
        }
        const lista = vendas.map((v,i) =>
            `${i+1}. Venda #${v.numero ?? String(v.id).slice(0,8)} — ${Number(v.total||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} — ${new Date(v.created_at).toLocaleString("pt-BR")}`
        ).join("\n");
        const escolha = prompt("Informe o número da venda que deseja cancelar:\n\n"+lista+"\n\nDigite 1 a "+vendas.length+".");
        if (escolha === null) return;
        const indice = Number(escolha);
        if (!Number.isInteger(indice) || indice < 1 || indice > vendas.length) {
            alert("Seleção inválida.");
            return;
        }
        const venda = vendas[indice-1];
        const motivo = prompt("Informe o motivo do cancelamento da venda #"+(venda.numero ?? "")+":");
        if (motivo === null) return;
        if (!motivo.trim()) { alert("O motivo do cancelamento é obrigatório."); return; }
        const confirmar = confirm(
            "Confirma cancelar a venda #"+(venda.numero ?? "")+" no valor de "+
            Number(venda.total||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})+
            "?\n\nO estoque será restaurado. Venda paga por Pix não pode ser cancelada por esta função. Para cartão, o estorno deverá ser realizado na maquininha."
        );
        if (!confirmar) return;
        if (botao) botao.textContent = "Cancelando...";
        const {data:resultado,error:rpcError}=await supabaseClient.rpc("erp_cancelar_venda_pdv",{
            p_venda_id:venda.id,
            p_motivo:motivo.trim()
        });
        if (rpcError) throw rpcError;
        const r=Array.isArray(resultado)?resultado[0]:resultado;
        if (!r || r.sucesso !== true) throw new Error(r?.mensagem || "O banco não confirmou o cancelamento.");
        alert(r.mensagem || "Venda cancelada. Confira a devolução física do dinheiro ou realize o estorno na maquininha, conforme a forma de pagamento.");
        await verificarCaixaAberto();
    } catch (e) {
        console.error("Erro ao cancelar venda:",e);
        alert("Não foi possível cancelar a venda.\n\n"+(e?.message || "Erro desconhecido."));
    } finally {
        if (botao) { botao.disabled=false; botao.textContent="Cancelar venda"; }
    }
}

/* =========================================================
   EVENTOS
   ========================================================= */

if (btnNovaVenda) {
    btnNovaVenda.addEventListener("click", abrirNovaVenda);
}

if (btnFecharVenda) {
    btnFecharVenda.addEventListener("click", fecharNovaVenda);
}

if (campoBuscaProduto) {
    campoBuscaProduto.addEventListener(
        "input",
        pesquisarProdutos
    );
    campoBuscaProduto.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            adicionarProdutoPelaBusca();
        }
    });
}

if (descontoVenda) {
    descontoVenda.addEventListener(
        "input",
        atualizarCarrinho
    );
}

if (btnFinalizarVenda) {
    btnFinalizarVenda.addEventListener(
        "click",
        finalizarVenda
    );
}

if (btnCancelarVendaCaixa) {
    btnCancelarVendaCaixa.addEventListener("click", cancelarVendaDoCaixa);
}

if (btnAbrirCaixa) {
    btnAbrirCaixa.addEventListener(
        "click",
        abrirCaixa
    );
}

if (btnAbrirFechamento) {
    btnAbrirFechamento.addEventListener(
        "click",
        abrirModalFechamento
    );
} else {
    console.error(
        "Botão #btnAbrirFechamento não encontrado no painel.html."
    );
}

if (btnCancelarFechamento) {
    btnCancelarFechamento.addEventListener(
        "click",
        cancelarModalFechamento
    );
}

if (btnCancelarFechamentoRodape) {
    btnCancelarFechamentoRodape.addEventListener(
        "click",
        cancelarModalFechamento
    );
}

if (btnConfirmarFechamento) {
    btnConfirmarFechamento.addEventListener(
        "click",
        confirmarFechamentoCaixa
    );
}

if (fechValorContado) {
    fechValorContado.addEventListener(
        "input",
        atualizarDiferencaFechamento
    );
}

if (btnSair) {
    btnSair.addEventListener("click", async () => {
        btnSair.disabled = true;
        btnSair.textContent = "Saindo...";

        await supabaseClient.auth.signOut();

        sessionStorage.clear();

        window.location.href = "index.html";
    });
}


/* =========================================================
   TECLA ESCAPE
   ========================================================= */

document.addEventListener("keydown", event => {
    if (
        event.key === "Escape" &&
        modalFechamento &&
        !modalFechamento.hidden &&
        !fechamentoEmProcessamento
    ) {
        cancelarModalFechamento();
        return;
    }

    if (
        event.key === "Escape" &&
        modalVenda &&
        !modalVenda.hidden
    ) {
        fecharNovaVenda();
    }
});


/* =========================================================
   CARREGAR PAINEL
   ========================================================= */

async function carregarConfiguracoesComprovante(empresaId) {
    configuracoesComprovante = {};
    if (!empresaId) return;
    const { data, error } = await supabaseClient
        .from("erp_configuracoes_empresa")
        .select("nome_exibicao,cabecalho_comprovante,telefone,email_contato,logo_url,endereco,rodape_comprovante")
        .eq("empresa_id", empresaId)
        .maybeSingle();
    if (error) {
        console.warn("Configurações do comprovante não disponíveis; será usado o cabeçalho padrão.", error.message);
        return;
    }
    configuracoesComprovante = data || {};
}

async function carregarPainel() {
    try {
        dadosPDV = await verificarAcessoPDV();

        if (!dadosPDV) return;

        const { usuario, pdv } = dadosPDV;

        usuarioNome.textContent =
            usuario.nome || "Operador PDV";

        usuarioEmail.textContent =
            usuario.email || "Usuário autenticado";

        pdvNumero.textContent =
            pdv.numero || pdv.nome || pdv.id;

        // Busca o nome real da empresa sem alterar o ID interno.
try {
const { data: empresa, error: erroEmpresa } =
await supabaseClient
.from("erp_empresas")
.select("nome, nome_fantasia, logo_url")
.eq("id", usuario.empresa_id)
.maybeSingle();

        if (erroEmpresa) {
            console.error(
                "Erro ao consultar nome da empresa:",
                erroEmpresa
            );
        }

        empresaNome.textContent =
            empresa?.nome ||
            pdv.empresa_nome ||
            "Empresa não identificada";

            carregarLogoPDV(empresa);
            await carregarConfiguracoesComprovante(usuario.empresa_id);

    } catch (erroEmpresa) {
        console.error(
            "Não foi possível carregar o nome da empresa:",
            erroEmpresa
        );

        empresaNome.textContent =
            pdv.empresa_nome ||
            "Empresa não identificada";
    }


        await verificarCaixaAberto();

        console.log("Painel PDV carregado com sucesso.");
    } catch (error) {
        console.error("Erro ao carregar painel PDV:", error);

        alert(
            "Não foi possível carregar o painel.\n\n" +
            (error.message ||
                "Verifique sua conexão e tente novamente.")
        );
    }
}


/* =========================================================
   INICIAR
   ========================================================= */

carregarPainel();
