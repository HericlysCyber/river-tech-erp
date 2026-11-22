let usuarioERP = null;
let empresaERP = null;
let listaPDVs = [];
let pdvSelecionado = null;
let acessoPDVSelecionado = null;


/* =========================================================
INICIALIZAÇÃO
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    if (!(await window.erpExigirModulo("PDV"))) return;

    configurarEventos();

    carregarSessao();

});


/* =========================================================
EVENTOS
========================================================= */

function configurarEventos() {

    const newPdvButton =
        document.getElementById("newPdvButton");

    const emptyNewButton =
        document.getElementById("emptyNewButton");

    const closeModal =
        document.getElementById("closeModal");

    const cancelModal =
        document.getElementById("cancelModal");

    const pdvForm =
        document.getElementById("pdvForm");

    const searchPdv =
        document.getElementById("searchPdv");

    const filterPdv =
        document.getElementById("filterPdv");

    const logoutButton =
        document.getElementById("logoutButton");


    /* NOVO PDV */

    if (newPdvButton) {

        newPdvButton.addEventListener(
            "click",
            abrirModalNovoPDV
        );

    }


    if (emptyNewButton) {

        emptyNewButton.addEventListener(
            "click",
            abrirModalNovoPDV
        );

    }


    if (closeModal) {

        closeModal.addEventListener(
            "click",
            fecharModalNovoPDV
        );

    }


    if (cancelModal) {

        cancelModal.addEventListener(
            "click",
            fecharModalNovoPDV
        );

    }


    if (pdvForm) {

        pdvForm.addEventListener(
            "submit",
            criarPDV
        );

    }


    /* BUSCA */

    if (searchPdv) {

        searchPdv.addEventListener(
            "input",
            aplicarFiltros
        );

    }


    /* FILTRO */

    if (filterPdv) {

        filterPdv.addEventListener(
            "change",
            aplicarFiltros
        );

    }


    /* LOGOUT */

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            fazerLogout
        );

    }


    /* =====================================================
       MODAL GERENCIAR PDV
       ===================================================== */

    const closeDetailsModal =
        document.getElementById("closeDetailsModal");

    const closeDetailsButton =
        document.getElementById("closeDetailsButton");

    const togglePdvButton =
        document.getElementById("togglePdvButton");

    const createPdvAccessButton =
        document.getElementById(
            "createPdvAccessButton"
        );


    if (closeDetailsModal) {

        closeDetailsModal.addEventListener(
            "click",
            fecharModalDetalhes
        );

    }


    if (closeDetailsButton) {

        closeDetailsButton.addEventListener(
            "click",
            fecharModalDetalhes
        );

    }


    if (togglePdvButton) {

        togglePdvButton.addEventListener(
            "click",
            alternarStatusPDV
        );

    }


    if (createPdvAccessButton) {

        createPdvAccessButton.addEventListener(
            "click",
            criarAcessoPDV
        );

    }


    /* FECHAR CLICANDO FORA DO MODAL */

    const pdvModal =
        document.getElementById("pdvModal");

    if (pdvModal) {

        pdvModal.addEventListener(
            "click",
            evento => {

                if (
                    evento.target === pdvModal
                ) {

                    fecharModalNovoPDV();

                }

            }
        );

    }


    const pdvDetailsModal =
        document.getElementById("pdvDetailsModal");

    if (pdvDetailsModal) {

        pdvDetailsModal.addEventListener(
            "click",
            evento => {

                if (
                    evento.target === pdvDetailsModal
                ) {

                    fecharModalDetalhes();

                }

            }
        );

    }


    /* ESC */

    document.addEventListener(
        "keydown",
        evento => {

            if (evento.key !== "Escape") {
                return;
            }

            fecharModalNovoPDV();

            fecharModalDetalhes();

        }
    );

}


/* =========================================================
SESSÃO
========================================================= */

async function carregarSessao() {

    try {

        mostrarLoading();


        const {
            data: sessionData,
            error: sessionError
        } = await supabaseClient.auth.getSession();


        if (sessionError) {

            console.error(
                "Erro ao recuperar sessão:",
                sessionError
            );

            redirecionarLogin();

            return;

        }


        let session =
            sessionData?.session || null;


        /*
         * Se a sessão não estiver disponível,
         * tenta atualizar o token.
         */

        if (!session) {

            const {
                data: refreshData,
                error: refreshError
            } =
                await supabaseClient.auth.refreshSession();


            if (!refreshError) {

                session =
                    refreshData?.session || null;

            }

        }


        if (!session) {

            redirecionarLogin();

            return;

        }


        const authUser =
            session.user;


        /* =================================================
           USUÁRIO ERP
           ================================================= */

        const {
            data: usuario,
            error: usuarioError
        } =
            await supabaseClient
                .from("erp_usuarios")
                .select("*")
                .eq("auth_user_id", authUser.id)
                .maybeSingle();


        if (usuarioError) {

            console.error(
                "Erro ao buscar usuário ERP:",
                usuarioError
            );

            mostrarErroPagina(
                "Não foi possível verificar o usuário ERP."
            );

            return;

        }


        if (!usuario) {

            mostrarErroPagina(
                "Usuário não possui acesso ao ERP."
            );

            await supabaseClient.auth.signOut();

            setTimeout(
                redirecionarLogin,
                1200
            );

            return;

        }


        if (
            usuario.ativo !== true ||
            usuario.bloqueado === true
        ) {

            mostrarErroPagina(
                "Seu acesso ao ERP está bloqueado ou inativo."
            );

            await supabaseClient.auth.signOut();

            setTimeout(
                redirecionarLogin,
                1200
            );

            return;

        }


        /*
         * A gestão de PDVs nesta etapa é exclusiva
         * do Administrador ERP.
         */

        if (
            usuario.tipo !== "ADMIN_ERP"
        ) {

            mostrarErroPagina(
                "Apenas o Administrador ERP pode gerenciar os PDVs."
            );

            return;

        }


        usuarioERP = usuario;


        /* =================================================
           EMPRESA
           ================================================= */

        const {
            data: empresa,
            error: empresaError
        } =
            await supabaseClient
                .from("erp_empresas")
                .select("*")
                .eq("id", usuario.empresa_id)
                .maybeSingle();


        if (empresaError) {

            console.error(
                "Erro ao buscar empresa:",
                empresaError
            );

            mostrarErroPagina(
                "Não foi possível carregar os dados da empresa."
            );

            return;

        }


        if (!empresa) {

            mostrarErroPagina(
                "Empresa vinculada ao usuário não encontrada."
            );

            return;

        }


        if (
            empresa.ativo !== true ||
            empresa.bloqueado === true
        ) {

            mostrarErroPagina(
                "A empresa está bloqueada ou inativa."
            );

            return;

        }


        empresaERP = empresa;


        atualizarIdentidade();


        /* =================================================
           MÓDULO PDV
           ================================================= */

        const moduloLiberado =
            await verificarModuloPDV();


        if (!moduloLiberado) {

            mostrarErroPagina(
                "O módulo PDV não está liberado para sua empresa."
            );

            return;

        }


        /* =================================================
           CARREGAR PDVS
           ================================================= */

        await carregarPDVs();

    }

    catch (error) {

        console.error(
            "Erro inesperado ao iniciar PDV:",
            error
        );

        mostrarErroPagina(
            "Ocorreu um erro ao carregar o módulo PDV."
        );

    }

}


/* =========================================================
IDENTIDADE
========================================================= */

function atualizarIdentidade() {

    if (!usuarioERP || !empresaERP) {
        return;
    }


    const userName =
        document.getElementById("userName");

    const userInitial =
        document.getElementById("userInitial");

    const companyMiniName =
        document.getElementById("companyMiniName");

    const companyMiniLogo =
        document.getElementById("companyMiniLogo");


    const nomeUsuario =
        usuarioERP.nome ||
        usuarioERP.email ||
        "Administrador";


    if (userName) {

        userName.textContent =
            nomeUsuario;

    }


    if (userInitial) {

        userInitial.textContent =
            obterInicial(nomeUsuario);

    }


    if (companyMiniName) {

        companyMiniName.textContent =
            empresaERP.nome_fantasia ||
            empresaERP.nome ||
            "Empresa";

    }


    if (companyMiniLogo) {

        companyMiniLogo.src =
            empresaERP.logo_url ||
            "assets/logo.png";

    }

}


/* =========================================================
VERIFICAR MÓDULO
========================================================= */

async function verificarModuloPDV() {

    if (!empresaERP?.id) {
        return false;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("erp_empresa_modulos")
            .select(`
                ativo,
                erp_modulos (
                    codigo,
                    ativo
                )
            `)
            .eq("empresa_id", empresaERP.id);


    if (error) {

        console.error(
            "Erro ao verificar módulo PDV:",
            error
        );

        return false;

    }


    const modulo =
        data?.find(item =>
            item.ativo === true &&
            item.erp_modulos?.codigo === "PDV" &&
            item.erp_modulos?.ativo === true
        );


    return !!modulo;

}


/* =========================================================
CARREGAR PDVS
========================================================= */

async function carregarPDVs() {

    mostrarLoading();

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("erp_pdvs")
                .select("*")
                .eq("empresa_id", empresaERP.id)
                .order("created_at", {
                    ascending: false
                });


        if (error) {

            console.error(
                "Erro ao carregar PDVs:",
                error
            );

            mostrarErroPagina(
                `Não foi possível carregar os PDVs: ${error.message}`
            );

            return;

        }


        listaPDVs =
            Array.isArray(data)
                ? data
                : [];


        atualizarResumo();

        renderizarPDVs();

    }

    catch (error) {

        console.error(
            "Erro inesperado ao carregar PDVs:",
            error
        );

        mostrarErroPagina(
            "Erro inesperado ao carregar os PDVs."
        );

    }

}


/* =========================================================
RESUMO
========================================================= */

function atualizarResumo() {

    const total =
        listaPDVs.length;


    /*
     * PDV ativo = ativo e não bloqueado.
     */

    const ativos =
        listaPDVs.filter(
            pdv =>
                pdv.ativo === true &&
                pdv.bloqueado !== true
        ).length;


    const limite =
        Number(
            empresaERP?.limite_pdvs || 0
        );


    const percentual =
        limite > 0
            ? Math.min(
                100,
                Math.round(
                    (ativos / limite) * 100
                )
            )
            : 0;


    const totalElement =
        document.getElementById("totalPdvs");

    const activeElement =
        document.getElementById("activePdvs");

    const limitElement =
        document.getElementById("pdvLimit");

    const usageElement =
        document.getElementById("pdvUsage");


    if (totalElement) {

        totalElement.textContent =
            total;

    }


    if (activeElement) {

        activeElement.textContent =
            ativos;

    }


    if (limitElement) {

        limitElement.textContent =
            limite;

    }


    if (usageElement) {

        usageElement.textContent =
            `${percentual}%`;

    }


    atualizarPainelLimite(
        ativos,
        limite,
        percentual
    );

}


/* =========================================================
PAINEL DE LIMITE
========================================================= */

function atualizarPainelLimite(
    ativos,
    limite,
    percentual
) {

    const limitText =
        document.getElementById("limitText");

    const limitBadge =
        document.getElementById("limitBadge");

    const limitProgress =
        document.getElementById("limitProgress");

    const limitMessage =
        document.getElementById("limitMessage");


    if (limitText) {

        limitText.textContent =
            `${ativos} de ${limite} PDV(s) ativo(s)`;

    }


    if (limitProgress) {

        limitProgress.style.width =
            `${percentual}%`;

        limitProgress.classList.remove(
            "warning",
            "danger"
        );


        if (percentual >= 100) {

            limitProgress.classList.add(
                "danger"
            );

        }
        else if (percentual >= 80) {

            limitProgress.classList.add(
                "warning"
            );

        }

    }


    if (limitBadge) {

        limitBadge.classList.remove(
            "warning",
            "danger"
        );


        if (limite <= 0) {

            limitBadge.textContent =
                "Sem limite";

            limitBadge.classList.add(
                "danger"
            );

        }
        else if (ativos >= limite) {

            limitBadge.textContent =
                "Limite atingido";

            limitBadge.classList.add(
                "danger"
            );

        }
        else if (percentual >= 80) {

            limitBadge.textContent =
                "Próximo do limite";

            limitBadge.classList.add(
                "warning"
            );

        }
        else {

            limitBadge.textContent =
                "Disponível";

        }

    }


    if (limitMessage) {

        if (limite <= 0) {

            limitMessage.textContent =
                "Nenhum PDV está disponível para esta empresa.";

        }
        else if (ativos >= limite) {

            limitMessage.textContent =
                "O limite contratado foi atingido. Bloqueie ou remova um terminal para liberar uma vaga.";

        }
        else {

            const disponiveis =
                limite - ativos;

            limitMessage.textContent =
                `Você ainda pode cadastrar ${disponiveis} PDV(s).`;

        }

    }

}


/* =========================================================
RENDERIZAR
========================================================= */

function renderizarPDVs(
    lista = listaPDVs
) {

    const loading =
        document.getElementById("loadingPdv");

    const tableContainer =
        document.getElementById("pdvTableContainer");

    const emptyState =
        document.getElementById("emptyState");

    const tbody =
        document.getElementById("pdvTableBody");


    if (loading) {
        loading.style.display = "none";
    }


    if (!tbody) {
        return;
    }


    tbody.innerHTML = "";


    if (!lista || lista.length === 0) {

        if (tableContainer) {

            tableContainer.style.display =
                "none";

        }


        if (emptyState) {

            emptyState.style.display =
                "flex";

        }


        return;

    }


    if (emptyState) {

        emptyState.style.display =
            "none";

    }


    if (tableContainer) {

        tableContainer.style.display =
            "block";

    }


    lista.forEach(
        pdv => {

            tbody.appendChild(
                criarLinhaPDV(pdv)
            );

        }
    );

}


/* =========================================================
LINHA DO PDV
========================================================= */

function criarLinhaPDV(pdv) {

    const tr =
        document.createElement("tr");


    const ativo =
        pdv.ativo === true &&
        pdv.bloqueado !== true;


    const statusClass =
        ativo
            ? "active"
            : "blocked";


    const statusText =
        ativo
            ? "Ativo"
            : "Bloqueado";


    const nome =
        escaparHTML(
            pdv.nome ||
            "PDV sem nome"
        );


    const codigo =
        escaparHTML(
            pdv.codigo ||
            "—"
        );


    const equipamento =
        escaparHTML(
            pdv.identificador_equipamento ||
            "Não informado"
        );


    const criado =
        formatarData(
            pdv.created_at
        );


    const ultimoAcesso =
        pdv.ultimo_acesso
            ? formatarData(
                pdv.ultimo_acesso
            )
            : "Nunca";


    tr.innerHTML = `

        <td>

            <div class="pdv-cell">

                <div class="pdv-cell-icon">
                    ▣
                </div>

                <div class="pdv-cell-info">

                    <strong>
                        ${nome}
                    </strong>

                    <span>
                        Cadastrado em ${criado}
                    </span>

                </div>

            </div>

        </td>


        <td>
            <strong>
                ${codigo}
            </strong>
        </td>


        <td>
            ${equipamento}
        </td>


        <td>

            <span
                class="status-badge ${statusClass}"
            >
                ${statusText}
            </span>

        </td>


        <td>
            ${ultimoAcesso}
        </td>


        <td class="actions-column">

            <button
                type="button"
                class="row-action"
                title="Gerenciar PDV"
                data-pdv-id="${pdv.id}"
            >
                ⋮
            </button>

        </td>

    `;


    const actionButton =
        tr.querySelector(".row-action");


    if (actionButton) {

        actionButton.addEventListener(
            "click",
            () => {

                mostrarDetalhes(
                    pdv.id
                );

            }
        );

    }


    return tr;

}


/* =========================================================
FILTROS
========================================================= */

function aplicarFiltros() {

    const searchInput =
        document.getElementById("searchPdv");

    const filterInput =
        document.getElementById("filterPdv");


    const termo =
        (
            searchInput?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const filtro =
        filterInput?.value ||
        "todos";


    let resultado =
        [...listaPDVs];


    /* BUSCA */

    if (termo) {

        resultado =
            resultado.filter(
                pdv => {

                    const nome =
                        String(
                            pdv.nome || ""
                        ).toLowerCase();

                    const codigo =
                        String(
                            pdv.codigo || ""
                        ).toLowerCase();

                    const equipamento =
                        String(
                            pdv.identificador_equipamento || ""
                        ).toLowerCase();


                    return (
                        nome.includes(termo) ||
                        codigo.includes(termo) ||
                        equipamento.includes(termo)
                    );

                }
            );

    }


    /* STATUS */

    if (filtro === "ativos") {

        resultado =
            resultado.filter(
                pdv =>
                    pdv.ativo === true &&
                    pdv.bloqueado !== true
            );

    }


    if (filtro === "bloqueados") {

        resultado =
            resultado.filter(
                pdv =>
                    pdv.bloqueado === true ||
                    pdv.ativo !== true
            );

    }


    renderizarPDVs(
        resultado
    );

}


/* =========================================================
MODAL NOVO PDV
========================================================= */

function abrirModalNovoPDV() {

    const modal =
        document.getElementById("pdvModal");

    const form =
        document.getElementById("pdvForm");


    if (!modal) {
        return;
    }


    if (form) {

        form.reset();

    }


    limparMensagemFormulario();


    modal.style.display =
        "flex";


    setTimeout(
        () => {

            document
                .getElementById("pdvNome")
                ?.focus();

        },
        50
    );

}


function fecharModalNovoPDV() {

    const modal =
        document.getElementById("pdvModal");


    if (modal) {

        modal.style.display =
            "none";

    }


    limparMensagemFormulario();

}


/* =========================================================
CRIAR PDV
========================================================= */

async function criarPDV(evento) {

    evento.preventDefault();


    const nomeInput =
        document.getElementById("pdvNome");

    const codigoInput =
        document.getElementById("pdvCodigo");

    const equipamentoInput =
        document.getElementById("pdvEquipamento");

    const descricaoInput =
        document.getElementById("pdvDescricao");

    const saveButton =
        document.getElementById("savePdv");


    const nome =
        nomeInput?.value.trim();

    const codigo =
        codigoInput?.value.trim();

    const equipamento =
        equipamentoInput?.value.trim();

    const descricao =
        descricaoInput?.value.trim();


    if (!nome) {

        mostrarMensagemFormulario(
            "Informe o nome do PDV.",
            "error"
        );

        nomeInput?.focus();

        return;

    }


    if (!codigo) {

        mostrarMensagemFormulario(
            "Informe o código do PDV.",
            "error"
        );

        codigoInput?.focus();

        return;

    }


    try {

        setBotaoCarregando(
            saveButton,
            true,
            "Cadastrando..."
        );


        limparMensagemFormulario();


        const {
            data,
            error
        } =
            await supabaseClient.rpc(
                "erp_criar_pdv",
                {
                    p_nome: nome,
                    p_codigo: codigo,
                    p_descricao:
                        descricao || null,
                    p_identificador_equipamento:
                        equipamento || null
                }
            );


        if (error) {

            console.error(
                "Erro ao criar PDV:",
                error
            );

            throw new Error(
                traduzirErroSupabase(
                    error
                )
            );

        }


        console.log(
            "PDV criado:",
            data
        );


        mostrarMensagemFormulario(
            "PDV cadastrado com sucesso.",
            "success"
        );


        await carregarPDVs();


        setTimeout(
            () => {

                fecharModalNovoPDV();

            },
            700
        );

    }

    catch (error) {

        console.error(
            "Erro ao cadastrar PDV:",
            error
        );


        mostrarMensagemFormulario(
            error.message ||
            "Não foi possível cadastrar o PDV.",
            "error"
        );

    }

    finally {

        setBotaoCarregando(
            saveButton,
            false,
            "Cadastrar PDV"
        );

    }

}


/* =========================================================
DETALHES
========================================================= */

function mostrarDetalhes(
    pdvId
) {

    const pdv =
        listaPDVs.find(
            item =>
                String(item.id) ===
                String(pdvId)
        );


    if (!pdv) {

        console.warn(
            "PDV não encontrado:",
            pdvId
        );

        return;

    }


    pdvSelecionado =
        pdv;

    acessoPDVSelecionado =
        null;


    preencherDetalhes(
        pdv
    );


    const modal =
        document.getElementById(
            "pdvDetailsModal"
        );


    if (modal) {

        modal.style.display =
            "flex";

    }


    /*
     * Busca o acesso depois de abrir o modal.
     */

    carregarAcessoPDV(
        pdv
    );

}


/* =========================================================
PREENCHER DETALHES
========================================================= */

function preencherDetalhes(
    pdv
) {

    const ativo =
        pdv.ativo === true &&
        pdv.bloqueado !== true;


    const nome =
        pdv.nome ||
        "PDV sem nome";


    const codigo =
        pdv.codigo ||
        "—";


    const equipment =
        pdv.identificador_equipamento ||
        "Não informado";


    const descricao =
        pdv.descricao ||
        "Nenhuma descrição cadastrada.";


    const created =
        formatarDataCompleta(
            pdv.created_at
        );


    const lastAccess =
        pdv.ultimo_acesso
            ? formatarDataCompleta(
                pdv.ultimo_acesso
            )
            : "Nunca acessado";


    const detailsPdvName =
        document.getElementById(
            "detailsPdvName"
        );

    const detailsPdvCode =
        document.getElementById(
            "detailsPdvCode"
        );

    const detailsPdvTitle =
        document.getElementById(
            "detailsPdvTitle"
        );

    const detailsPdvStatus =
        document.getElementById(
            "detailsPdvStatus"
        );

    const detailsStatusText =
        document.getElementById(
            "detailsStatusText"
        );

    const detailsStatusBox =
        document.getElementById(
            "detailsStatusBox"
        );

    const detailsCode =
        document.getElementById(
            "detailsCode"
        );

    const detailsEquipment =
        document.getElementById(
            "detailsEquipment"
        );

    const detailsCreated =
        document.getElementById(
            "detailsCreated"
        );

    const detailsLastAccess =
        document.getElementById(
            "detailsLastAccess"
        );

    const detailsDescription =
        document.getElementById(
            "detailsDescription"
        );

    const toggleButton =
        document.getElementById(
            "togglePdvButton"
        );


    if (detailsPdvName) {

        detailsPdvName.textContent =
            nome;

    }


    if (detailsPdvCode) {

        detailsPdvCode.textContent =
            `Código ${codigo}`;

    }


    if (detailsPdvTitle) {

        detailsPdvTitle.textContent =
            nome;

    }


    if (detailsPdvStatus) {

        detailsPdvStatus.textContent =
            ativo
                ? "Ativo"
                : "Bloqueado";


        detailsPdvStatus.classList.toggle(
            "blocked",
            !ativo
        );

    }


    if (detailsStatusText) {

        detailsStatusText.textContent =
            ativo
                ? "Este PDV está ativo e disponível para utilização."
                : "Este PDV está bloqueado e não pode ser utilizado.";

    }


    if (detailsStatusBox) {

        detailsStatusBox.classList.toggle(
            "blocked",
            !ativo
        );

    }


    if (detailsCode) {

        detailsCode.textContent =
            codigo;

    }


    if (detailsEquipment) {

        detailsEquipment.textContent =
            equipment;

    }


    if (detailsCreated) {

        detailsCreated.textContent =
            created;

    }


    if (detailsLastAccess) {

        detailsLastAccess.textContent =
            lastAccess;

    }


    if (detailsDescription) {

        detailsDescription.textContent =
            descricao;

    }


    if (toggleButton) {

        toggleButton.textContent =
            ativo
                ? "Bloquear PDV"
                : "Desbloquear PDV";


        toggleButton.className =
            ativo
                ? "danger-button"
                : "success-action";

    }


    prepararAreaAcessoPDV(
        pdv
    );


    limparMensagemDetalhes();

}


/* =========================================================
ÁREA DE ACESSO DO PDV
========================================================= */

function prepararAreaAcessoPDV(
    pdv
) {

    const accessStatus =
        document.getElementById(
            "pdvAccessStatus"
        );

    const accessForm =
        document.getElementById(
            "pdvAccessForm"
        );

    const accessInfo =
        document.getElementById(
            "pdvAccessInfo"
        );

    const createButton =
        document.getElementById(
            "createPdvAccessButton"
        );


    if (accessStatus) {

        accessStatus.textContent =
            "Verificando acesso...";

    }


    if (accessForm) {

        accessForm.style.display =
            "grid";

    }


    if (accessInfo) {

        accessInfo.style.display =
            "none";

    }


    if (createButton) {

        createButton.disabled =
            false;

        createButton.textContent =
            "Criar acesso";

    }


    limparCamposAcesso();


    /*
     * PDV bloqueado não deve receber um novo acesso.
     */

    const ativo =
        pdv?.ativo === true &&
        pdv?.bloqueado !== true;


    if (!ativo) {

        if (accessStatus) {

            accessStatus.textContent =
                "O PDV está bloqueado. Desbloqueie o terminal para configurar o acesso.";

        }


        if (accessForm) {

            accessForm.style.display =
                "none";

        }

    }

}


/* =========================================================
CARREGAR ACESSO DO PDV
========================================================= */

async function carregarAcessoPDV(
    pdv
) {

    const accessStatus =
        document.getElementById(
            "pdvAccessStatus"
        );

    const accessForm =
        document.getElementById(
            "pdvAccessForm"
        );

    const accessInfo =
        document.getElementById(
            "pdvAccessInfo"
        );

    const createButton =
        document.getElementById(
            "createPdvAccessButton"
        );


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("erp_usuarios")
                .select(`
                    id,
                    nome,
                    email,
                    tipo,
                    ativo,
                    bloqueado,
                    pdv_id,
                    created_at
                `)
                .eq("pdv_id", pdv.id)
                .eq("tipo", "PDV")
                .maybeSingle();


        if (error) {

            console.error(
                "Erro ao verificar acesso do PDV:",
                error
            );

            if (accessStatus) {

                accessStatus.textContent =
                    "Não foi possível verificar o acesso deste PDV.";

            }

            return;

        }


        acessoPDVSelecionado =
            data || null;


        /*
         * NÃO EXISTE ACESSO
         */

        if (!data) {

            if (accessStatus) {

                accessStatus.textContent =
                    "Este PDV ainda não possui um acesso.";

            }


            if (accessForm) {

                accessForm.style.display =
                    "grid";

            }


            if (accessInfo) {

                accessInfo.style.display =
                    "none";

            }


            return;

        }


        /*
         * JÁ EXISTE ACESSO
         */

        if (accessStatus) {

            accessStatus.textContent =
                data.bloqueado === true ||
                data.ativo !== true
                    ? "Acesso cadastrado, porém bloqueado."
                    : "Acesso cadastrado e disponível.";

        }


        if (accessForm) {

            accessForm.style.display =
                "none";

        }


        if (accessInfo) {

            accessInfo.style.display =
                "grid";

        }


        const accessUserName =
            document.getElementById(
                "pdvAccessUserName"
            );

        const accessUserEmail =
            document.getElementById(
                "pdvAccessUserEmail"
            );

        const accessUserStatus =
            document.getElementById(
                "pdvAccessUserStatus"
            );


        if (accessUserName) {

            accessUserName.textContent =
                data.nome ||
                "—";

        }


        if (accessUserEmail) {

            accessUserEmail.textContent =
                data.email ||
                "—";

        }


        if (accessUserStatus) {

            accessUserStatus.textContent =
                data.bloqueado === true ||
                data.ativo !== true
                    ? "Bloqueado"
                    : "Ativo";

        }


        if (createButton) {

            createButton.disabled =
                true;

        }

    }

    catch (error) {

        console.error(
            "Erro inesperado ao verificar acesso:",
            error
        );

        if (accessStatus) {

            accessStatus.textContent =
                "Erro ao verificar o acesso.";

        }

    }

}


/* =========================================================
CRIAR ACESSO DO PDV
========================================================= */

async function criarAcessoPDV() {

    if (!pdvSelecionado) {
        mostrarMensagemAcessoPDV(
            "Selecione um PDV antes de criar o acesso.",
            "erro"
        );
        return;
    }

    if (pdvSelecionado.bloqueado || !pdvSelecionado.ativo) {
        mostrarMensagemAcessoPDV(
            "Este PDV está bloqueado ou inativo. Desbloqueie-o antes de criar o acesso.",
            "erro"
        );
        return;
    }

    const nomeInput = document.getElementById("pdvAccessNome");
    const emailInput = document.getElementById("pdvAccessEmail");
    const senhaInput = document.getElementById("pdvAccessSenha");
    const button = document.getElementById("createPdvAccessButton");

    const nome = nomeInput?.value.trim() || "";
    const email = emailInput?.value.trim().toLowerCase() || "";
    const senha = senhaInput?.value || "";

    if (!nome) {
        mostrarMensagemAcessoPDV(
            "Informe o nome do acesso.",
            "erro"
        );
        nomeInput?.focus();
        return;
    }

    if (!email) {
        mostrarMensagemAcessoPDV(
            "Informe o e-mail de acesso.",
            "erro"
        );
        emailInput?.focus();
        return;
    }

    if (!senha || senha.length < 8) {
        mostrarMensagemAcessoPDV(
            "A senha deve possuir pelo menos 8 caracteres.",
            "erro"
        );
        senhaInput?.focus();
        return;
    }

    try {

        if (button) {
            button.disabled = true;
            button.textContent = "Criando acesso...";
        }

        mostrarMensagemAcessoPDV(
            "Criando o acesso do PDV...",
            "info"
        );

        // -----------------------------------------------------
        // GARANTIR SESSÃO ATUALIZADA
        // -----------------------------------------------------

        let {
            data: sessionData,
            error: sessionError
        } = await supabaseClient.auth.getSession();

        if (sessionError) {
            throw new Error(
                "Não foi possível verificar a sessão atual."
            );
        }

        let session = sessionData?.session;

        if (!session) {
            throw new Error(
                "Sua sessão expirou. Faça login novamente."
            );
        }

        // -----------------------------------------------------
        // RENOVAR TOKEN SE NECESSÁRIO
        // -----------------------------------------------------

        const agora = Math.floor(Date.now() / 1000);
        const expiraEm = session.expires_at || 0;

        if (expiraEm - agora < 60) {

            const {
                data: refreshData,
                error: refreshError
            } = await supabaseClient.auth.refreshSession();

            if (refreshError || !refreshData?.session) {
                throw new Error(
                    "Não foi possível renovar sua sessão."
                );
            }

            session = refreshData.session;
        }

        // -----------------------------------------------------
        // CHAMAR EDGE FUNCTION
        // -----------------------------------------------------

        const {
            data: resposta,
            error: functionError
        } = await supabaseClient.functions.invoke(
            "criar-acesso-pdv",
            {
                body: {
                    pdv_id: pdvSelecionado.id,
                    nome,
                    email,
                    senha
                }
            }
        );

        if (functionError) {

            console.error(
                "Erro da Edge Function:",
                functionError
            );

            throw new Error(
                functionError.message ||
                "Não foi possível criar o acesso do PDV."
            );
        }

        console.log(
            "Resposta da Edge Function:",
            resposta
        );

        // -----------------------------------------------------
        // IMPORTANTE:
        // NÃO VAMOS MAIS CONFIAR SOMENTE NA RESPOSTA "ok".
        //
        // Vamos confirmar diretamente no banco se o acesso
        // realmente existe.
        // -----------------------------------------------------

        const {
            data: acessoConfirmado,
            error: confirmacaoError
        } = await supabaseClient
            .from("erp_usuarios")
            .select(
                "id, nome, email, tipo, ativo, bloqueado, pdv_id"
            )
            .eq("pdv_id", pdvSelecionado.id)
            .eq("tipo", "PDV")
            .maybeSingle();

        if (confirmacaoError) {

            console.error(
                "Erro ao confirmar acesso:",
                confirmacaoError
            );

            throw new Error(
                "O acesso foi criado, mas não foi possível confirmar o registro no ERP."
            );
        }

        if (!acessoConfirmado) {

            throw new Error(
                "O servidor não confirmou o acesso do PDV."
            );
        }

        // -----------------------------------------------------
        // SUCESSO REAL
        // -----------------------------------------------------

        console.log(
            "Acesso confirmado no ERP:",
            acessoConfirmado
        );

        mostrarMensagemAcessoPDV(
            "Acesso do PDV criado e confirmado com sucesso.",
            "sucesso"
        );

        // Limpar senha imediatamente.
        if (senhaInput) {
            senhaInput.value = "";
        }

        // Recarregar estado visual do acesso.
        await carregarAcessoPDV(pdvSelecionado);

    } catch (error) {

        console.error(
            "Erro ao criar acesso do PDV:",
            error
        );

        mostrarMensagemAcessoPDV(
            error.message ||
            "Não foi possível criar o acesso do PDV.",
            "erro"
        );

    } finally {

        if (button) {
            button.disabled = false;
            button.textContent = "Criar acesso do PDV";
        }
    }
}


/* =========================================================
FECHAR DETALHES
========================================================= */

function fecharModalDetalhes() {

    const modal =
        document.getElementById(
            "pdvDetailsModal"
        );


    if (modal) {

        modal.style.display =
            "none";

    }


    pdvSelecionado =
        null;

    acessoPDVSelecionado =
        null;


    limparCamposAcesso();

    limparMensagemDetalhes();

}


/* =========================================================
BLOQUEAR / DESBLOQUEAR
========================================================= */

async function alternarStatusPDV() {

    if (!pdvSelecionado) {

        mostrarMensagemDetalhes(
            "Nenhum PDV selecionado.",
            "error"
        );

        return;

    }


    const pdv =
        pdvSelecionado;


    const estaAtivo =
        pdv.ativo === true &&
        pdv.bloqueado !== true;


    const acao =
        estaAtivo
            ? "bloquear"
            : "desbloquear";


    const confirmacao =
        estaAtivo

            ? `Tem certeza que deseja bloquear o PDV "${pdv.nome}"? O terminal deixará de estar disponível para utilização.`

            : `Deseja desbloquear o PDV "${pdv.nome}" e permitir novamente sua utilização?`;


    if (!confirm(confirmacao)) {

        return;

    }


    const button =
        document.getElementById(
            "togglePdvButton"
        );


    try {

        setBotaoCarregando(
            button,
            true,
            estaAtivo
                ? "Bloqueando..."
                : "Desbloqueando..."
        );


        limparMensagemDetalhes();


        let resultado;


        if (estaAtivo) {

            resultado =
                await supabaseClient.rpc(
                    "erp_bloquear_pdv",
                    {
                        p_pdv_id: pdv.id
                    }
                );

        }
        else {

            resultado =
                await supabaseClient.rpc(
                    "erp_desbloquear_pdv",
                    {
                        p_pdv_id: pdv.id
                    }
                );

        }


        if (resultado.error) {

            console.error(
                `Erro ao ${acao} PDV:`,
                resultado.error
            );

            throw new Error(
                traduzirErroSupabase(
                    resultado.error
                )
            );

        }


        /*
         * Atualiza a lista local.
         */

        const indice =
            listaPDVs.findIndex(
                item =>
                    String(item.id) ===
                    String(pdv.id)
            );


        if (indice !== -1) {

            listaPDVs[indice] = {

                ...listaPDVs[indice],

                bloqueado:
                    estaAtivo
                        ? true
                        : false

            };


            pdvSelecionado =
                listaPDVs[indice];

        }


        atualizarResumo();

        aplicarFiltros();

        preencherDetalhes(
            pdvSelecionado
        );


        mostrarMensagemDetalhes(
            estaAtivo
                ? "PDV bloqueado com sucesso."
                : "PDV desbloqueado com sucesso.",
            "success"
        );


        /*
         * Atualiza novamente com o banco.
         */

        await carregarPDVs();


        const pdvAtualizado =
            listaPDVs.find(
                item =>
                    String(item.id) ===
                    String(pdv.id)
            );


        if (pdvAtualizado) {

            pdvSelecionado =
                pdvAtualizado;

            preencherDetalhes(
                pdvAtualizado
            );

            await carregarAcessoPDV(
                pdvAtualizado
            );

        }


        mostrarMensagemDetalhes(
            estaAtivo
                ? "PDV bloqueado com sucesso."
                : "PDV desbloqueado com sucesso.",
            "success"
        );

    }

    catch (error) {

        console.error(
            `Erro ao ${acao} PDV:`,
            error
        );


        mostrarMensagemDetalhes(
            error.message ||
            `Não foi possível ${acao} o PDV.`,
            "error"
        );

    }

    finally {

        if (button) {

            const atualmenteAtivo =
                pdvSelecionado &&
                pdvSelecionado.ativo === true &&
                pdvSelecionado.bloqueado !== true;


            setBotaoCarregando(
                button,
                false,
                atualmenteAtivo
                    ? "Bloquear PDV"
                    : "Desbloquear PDV"
            );

        }

    }

}


/* =========================================================
LOADING
========================================================= */

function mostrarLoading() {

    const loading =
        document.getElementById(
            "loadingPdv"
        );

    const table =
        document.getElementById(
            "pdvTableContainer"
        );

    const empty =
        document.getElementById(
            "emptyState"
        );


    if (loading) {

        loading.style.display =
            "flex";

    }


    if (table) {

        table.style.display =
            "none";

    }


    if (empty) {

        empty.style.display =
            "none";

    }

}


/* =========================================================
ERRO DE PÁGINA
========================================================= */

function mostrarErroPagina(
    mensagem
) {

    const loading =
        document.getElementById(
            "loadingPdv"
        );

    const table =
        document.getElementById(
            "pdvTableContainer"
        );

    const empty =
        document.getElementById(
            "emptyState"
        );


    if (loading) {

        loading.innerHTML = `

            <div style="
                width:48px;
                height:48px;
                border-radius:12px;
                background:#fff0f0;
                color:#c23d3d;
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:22px;
            ">
                !
            </div>

            <p style="
                max-width:500px;
                text-align:center;
                line-height:1.6;
            ">
                ${escaparHTML(mensagem)}
            </p>

            <button
                type="button"
                class="secondary-button"
                onclick="window.location.reload()"
            >
                Tentar novamente
            </button>

        `;

        loading.style.display =
            "flex";

    }


    if (table) {

        table.style.display =
            "none";

    }


    if (empty) {

        empty.style.display =
            "none";

    }

}


/* =========================================================
MENSAGENS DO FORMULÁRIO
========================================================= */

function mostrarMensagemFormulario(
    mensagem,
    tipo
) {

    const element =
        document.getElementById(
            "formMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        mensagem;


    element.className =
        `form-message ${tipo}`;


    element.style.display =
        "block";

}


function limparMensagemFormulario() {

    const element =
        document.getElementById(
            "formMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        "";

    element.className =
        "form-message";

    element.style.display =
        "none";

}


/* =========================================================
MENSAGENS DETALHES
========================================================= */

function mostrarMensagemDetalhes(
    mensagem,
    tipo
) {

    const element =
        document.getElementById(
            "detailsMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        mensagem;


    element.className =
        `details-message ${tipo}`;


    element.style.display =
        "block";

}


function limparMensagemDetalhes() {

    const element =
        document.getElementById(
            "detailsMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        "";

    element.className =
        "details-message";

    element.style.display =
        "none";

}


/* =========================================================
LIMPAR CAMPOS DE ACESSO
========================================================= */

function limparCamposAcesso() {

    const nome =
        document.getElementById(
            "pdvAccessNome"
        );

    const email =
        document.getElementById(
            "pdvAccessEmail"
        );

    const senha =
        document.getElementById(
            "pdvAccessSenha"
        );


    if (nome) {
        nome.value = "";
    }


    if (email) {
        email.value = "";
    }


    if (senha) {
        senha.value = "";
    }

}


/* =========================================================
VALIDAR E-MAIL
========================================================= */

function validarEmail(
    email
) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
    );

}


/* =========================================================
TRADUZIR ERROS DO ACESSO
========================================================= */

function traduzirErroAcessoPDV(
    mensagem
) {

    if (!mensagem) {

        return "Não foi possível criar o acesso do PDV.";

    }


    if (
        mensagem.includes(
            "already been registered"
        )
    ) {

        return "Este e-mail já está cadastrado no Supabase Auth.";

    }


    if (
        mensagem.includes(
            "already registered"
        )
    ) {

        return "Este e-mail já está cadastrado no Supabase Auth.";

    }


    if (
        mensagem.includes(
            "Acesso negado"
        )
    ) {

        return mensagem;

    }


    if (
        mensagem.includes(
            "já possui um usuário"
        )
    ) {

        return mensagem;

    }


    if (
        mensagem.includes(
            "PDV não encontrado"
        )
    ) {

        return mensagem;

    }


    if (
        mensagem.includes(
            "não pertence à sua empresa"
        )
    ) {

        return mensagem;

    }


    return mensagem;

}


/* =========================================================
BOTÃO LOADING
========================================================= */

function setBotaoCarregando(
    button,
    carregando,
    texto
) {

    if (!button) {
        return;
    }


    if (carregando) {

        if (!button.dataset.textoOriginal) {

            button.dataset.textoOriginal =
                button.textContent;

        }


        button.disabled =
            true;

        button.textContent =
            texto;

        button.style.opacity =
            ".7";

        button.style.cursor =
            "wait";

    }
    else {

        button.disabled =
            false;

        button.textContent =
            texto ||
            button.dataset.textoOriginal ||
            "Salvar";

        button.style.opacity =
            "";

        button.style.cursor =
            "";

    }

}


/* =========================================================
LOGOUT
========================================================= */

async function fazerLogout() {

    try {

        await supabaseClient.auth.signOut();

    }
    catch (error) {

        console.error(
            "Erro ao sair:",
            error
        );

    }


    sessionStorage.removeItem(
        "ERP_USUARIO"
    );

    sessionStorage.removeItem(
        "ERP_EMPRESA"
    );


    redirecionarLogin();

}


/* =========================================================
REDIRECIONAR LOGIN
========================================================= */

function redirecionarLogin() {

    window.location.href =
        "index.html";

}


/* =========================================================
UTILITÁRIOS
========================================================= */

function obterInicial(
    texto
) {

    if (!texto) {
        return "A";
    }


    return texto
        .trim()
        .charAt(0)
        .toUpperCase();

}


function formatarData(
    valor
) {

    if (!valor) {
        return "—";
    }


    const data =
        new Date(valor);


    if (
        Number.isNaN(
            data.getTime()
        )
    ) {

        return "—";

    }


    return data.toLocaleDateString(
        "pt-BR"
    );

}


function formatarDataCompleta(
    valor
) {

    if (!valor) {
        return "—";
    }


    const data =
        new Date(valor);


    if (
        Number.isNaN(
            data.getTime()
        )
    ) {

        return "—";

    }


    return data.toLocaleString(
        "pt-BR",
        {
            dateStyle: "short",
            timeStyle: "short"
        }
    );

}


function escaparHTML(
    valor
) {

    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function traduzirErroSupabase(
    error
) {

    if (!error) {

        return "Erro desconhecido.";

    }


    const mensagem =
        error.message ||
        error.details ||
        error.hint ||
        "Erro desconhecido.";


    if (
        mensagem.includes(
            "Limite de PDVs atingido"
        )
    ) {

        return mensagem;

    }


    if (
        mensagem.includes(
            "Já existe um PDV com este código"
        )
    ) {

        return mensagem;

    }


    if (
        mensagem.includes(
            "módulo PDV"
        )
    ) {

        return mensagem;

    }


    return mensagem;

}