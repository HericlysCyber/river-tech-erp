document.addEventListener("DOMContentLoaded", async () => {
    if (!(await window.erpExigirModulo('PRODUTOS'))) return;

// =====================================================
// ESTADO
// =====================================================

let usuarioERP = null;
let empresaERP = null;

let produtos = [];
let categorias = [];

let produtoEditando = null;

let toastTimer = null;


// =====================================================
// ELEMENTOS
// =====================================================

const companyName =
    document.getElementById("companyName");

const companyLogo =
    document.getElementById("companyLogo");

const logoutButton =
    document.getElementById("logoutButton");

const campoBusca =
    document.getElementById("campoBusca");

const filtroCategoria =
    document.getElementById("filtroCategoria");

const filtroStatus =
    document.getElementById("filtroStatus");

const produtosTabela =
    document.getElementById("produtosTabela");

const loadingState =
    document.getElementById("loadingState");

const tableWrapper =
    document.getElementById("tableWrapper");

const emptyState =
    document.getElementById("emptyState");

const totalProdutos =
    document.getElementById("totalProdutos");

const totalAtivos =
    document.getElementById("totalAtivos");

const totalCategorias =
    document.getElementById("totalCategorias");


// =====================================================
// MODAL PRODUTO
// =====================================================

const produtoModal =
    document.getElementById("produtoModal");

const produtoModalTitulo =
    document.getElementById("produtoModalTitulo");

const fecharProdutoModal =
    document.getElementById("fecharProdutoModal");

const cancelarProdutoButton =
    document.getElementById(
        "cancelarProdutoButton"
    );

const novoProdutoButton =
    document.getElementById(
        "novoProdutoButton"
    );

const emptyNovoProdutoButton =
    document.getElementById(
        "emptyNovoProdutoButton"
    );

const produtoForm =
    document.getElementById("produtoForm");

const produtoId =
    document.getElementById("produtoId");

const produtoNome =
    document.getElementById("produtoNome");

const produtoCodigo =
    document.getElementById("produtoCodigo");

const produtoCodigoBarras =
    document.getElementById(
        "produtoCodigoBarras"
    );

const produtoCategoria =
    document.getElementById(
        "produtoCategoria"
    );

const produtoUnidade =
    document.getElementById(
        "produtoUnidade"
    );

const produtoDescricao =
    document.getElementById(
        "produtoDescricao"
    );

const produtoPrecoCusto =
    document.getElementById(
        "produtoPrecoCusto"
    );

const produtoPrecoVenda =
    document.getElementById(
        "produtoPrecoVenda"
    );

const produtoEstoqueMinimo =
    document.getElementById(
        "produtoEstoqueMinimo"
    );

const produtoEstoqueMaximo =
    document.getElementById(
        "produtoEstoqueMaximo"
    );

const produtoEstoqueInicial =
    document.getElementById(
        "produtoEstoqueInicial"
    );

const produtoAtivo =
    document.getElementById(
        "produtoAtivo"
    );

const estoqueInicialField =
    document.getElementById(
        "estoqueInicialField"
    );

const statusProdutoSection =
    document.getElementById(
        "statusProdutoSection"
    );

const salvarProdutoButton =
    document.getElementById(
        "salvarProdutoButton"
    );

const formMessage =
    document.getElementById(
        "formMessage"
    );


// =====================================================
// MODAL CATEGORIAS
// =====================================================

const categoriasModal =
    document.getElementById(
        "categoriasModal"
    );

const gerenciarCategoriasButton =
    document.getElementById(
        "gerenciarCategoriasButton"
    );

const fecharCategoriasModal =
    document.getElementById(
        "fecharCategoriasModal"
    );

const novaCategoriaNome =
    document.getElementById(
        "novaCategoriaNome"
    );

const criarCategoriaButton =
    document.getElementById(
        "criarCategoriaButton"
    );

const categoriaLista =
    document.getElementById(
        "categoriaLista"
    );

const categoriaMessage =
    document.getElementById(
        "categoriaMessage"
    );


// =====================================================
// UTILITÁRIOS
// =====================================================

function sairParaLogin() {

    sessionStorage.removeItem("ERP_USUARIO");
    sessionStorage.removeItem("ERP_EMPRESA");

    window.location.href = "index.html";

}


function primeiraLetra(nome) {

    if (!nome) {
        return "E";
    }

    return nome
        .trim()
        .charAt(0)
        .toUpperCase();

}


function nomeEmpresa(empresa) {

    return (
        empresa?.nome_fantasia ||
        empresa?.nome ||
        "Empresa"
    );

}


function colocarLogo(elemento, empresa) {

    if (!elemento) {
        return;
    }

    const logo = empresa?.logo_url;

    elemento.innerHTML = "";

    if (!logo) {

        elemento.textContent =
            primeiraLetra(
                nomeEmpresa(empresa)
            );

        return;

    }

    const imagem =
        document.createElement("img");

    imagem.src = logo;

    imagem.alt =
        nomeEmpresa(empresa);

    imagem.onerror = () => {

        elemento.innerHTML = "";

        elemento.textContent =
            primeiraLetra(
                nomeEmpresa(empresa)
            );

    };

    elemento.appendChild(imagem);

}


function escaparHTML(valor) {

    if (
        valor === null ||
        valor === undefined
    ) {
        return "";
    }

    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function formatarMoeda(valor) {

    return Number(valor || 0)
        .toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );

}


function mostrarToast(mensagem) {

    const toast =
        document.getElementById("toast");

    if (!toast) {
        return;
    }

    toast.textContent = mensagem;

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer =
        setTimeout(() => {

            toast.classList.remove("show");

        }, 3000);

}


function mostrarMensagem(
    elemento,
    mensagem,
    tipo = "error"
) {

    if (!elemento) {
        return;
    }

    elemento.textContent =
        mensagem;

    elemento.className =
        "form-message " + tipo;

    elemento.hidden = false;

}


function esconderMensagem(elemento) {

    if (!elemento) {
        return;
    }

    elemento.hidden = true;

    elemento.textContent = "";

}


function nomeCategoria(categoriaId) {

    if (!categoriaId) {
        return "Sem categoria";
    }

    const categoria =
        categorias.find(
            item =>
                String(item.id) ===
                String(categoriaId)
        );

    return categoria?.nome ||
        "Sem categoria";

}


// =====================================================
// ESTADOS VISUAIS DA LISTA
// =====================================================

function mostrarEstadoCarregando() {

    loadingState.hidden = false;
    tableWrapper.hidden = true;
    emptyState.hidden = true;

}


function mostrarEstadoTabela() {

    loadingState.hidden = true;
    tableWrapper.hidden = false;
    emptyState.hidden = true;

}


function mostrarEstadoVazio() {

    loadingState.hidden = true;
    tableWrapper.hidden = true;
    emptyState.hidden = false;

}


// =====================================================
// SESSÃO
// =====================================================

async function carregarSessao() {

    const {
        data: {
            session
        }
    } =
        await supabaseClient.auth.getSession();


    if (!session) {

        sairParaLogin();

        return false;

    }


    const {
        data: usuario,
        error: usuarioError
    } =
        await supabaseClient
            .from("erp_usuarios")
            .select(`
                id,
                auth_user_id,
                empresa_id,
                nome,
                email,
                tipo,
                ativo,
                bloqueado,
                pdv_id
            `)
            .eq(
                "auth_user_id",
                session.user.id
            )
            .maybeSingle();


    if (
        usuarioError ||
        !usuario
    ) {

        console.error(
            "Erro ao localizar usuário:",
            usuarioError
        );

        await supabaseClient.auth.signOut();

        sairParaLogin();

        return false;

    }


    if (
        !usuario.ativo ||
        usuario.bloqueado
    ) {

        await supabaseClient.auth.signOut();

        sairParaLogin();

        return false;

    }


    if (
        String(usuario.tipo || "")
            .toUpperCase() !==
        "ADMIN_ERP"
    ) {

        alert(
            "Este acesso não possui permissão para administrar produtos."
        );

        window.location.href =
            "dashboard.html";

        return false;

    }


    usuarioERP =
        usuario;


    const {
        data: empresa,
        error: empresaError
    } =
        await supabaseClient
            .from("erp_empresas")
            .select(`
                id,
                nome,
                nome_fantasia,
                logo_url,
                ativo,
                bloqueado,
                plano,
                limite_pdvs
            `)
            .eq(
                "id",
                usuario.empresa_id
            )
            .maybeSingle();


    if (
        empresaError ||
        !empresa
    ) {

        console.error(
            "Erro ao localizar empresa:",
            empresaError
        );

        await supabaseClient.auth.signOut();

        sairParaLogin();

        return false;

    }


    if (
        !empresa.ativo ||
        empresa.bloqueado
    ) {

        await supabaseClient.auth.signOut();

        sairParaLogin();

        return false;

    }


    empresaERP =
        empresa;


    if (companyName) {

        companyName.textContent =
            nomeEmpresa(empresa);

    }


    colocarLogo(
        companyLogo,
        empresa
    );


    return true;

}


// =====================================================
// CATEGORIAS
// =====================================================

async function carregarCategorias() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("erp_categorias")
            .select(`
                id,
                empresa_id,
                nome,
                descricao,
                ativo,
                created_at
            `)
            .eq(
                "empresa_id",
                empresaERP.id
            )
            .order(
                "nome",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Erro ao carregar categorias:",
            error
        );

        throw error;

    }


    categorias =
        data || [];


    totalCategorias.textContent =
        categorias.length;


    atualizarSelectCategorias();

    renderizarCategorias();

}


function atualizarSelectCategorias() {

    const categoriaAtual =
        produtoCategoria.value;

    const filtroAtual =
        filtroCategoria.value;


    produtoCategoria.innerHTML =
        `
            <option value="">
                Sem categoria
            </option>
        `;


    filtroCategoria.innerHTML =
        `
            <option value="">
                Todas as categorias
            </option>
        `;


    categorias
        .filter(
            categoria =>
                categoria.ativo
        )
        .forEach(
            categoria => {

                const optionProduto =
                    document.createElement(
                        "option"
                    );

                optionProduto.value =
                    categoria.id;

                optionProduto.textContent =
                    categoria.nome;

                produtoCategoria.appendChild(
                    optionProduto
                );


                const optionFiltro =
                    document.createElement(
                        "option"
                    );

                optionFiltro.value =
                    categoria.id;

                optionFiltro.textContent =
                    categoria.nome;

                filtroCategoria.appendChild(
                    optionFiltro
                );

            }
        );


    if (categoriaAtual) {

        produtoCategoria.value =
            categoriaAtual;

    }


    if (filtroAtual) {

        filtroCategoria.value =
            filtroAtual;

    }

}


function renderizarCategorias() {

    categoriaLista.innerHTML = "";


    if (!categorias.length) {

        categoriaLista.innerHTML =
            `
                <div class="empty-category">
                    Nenhuma categoria cadastrada.
                </div>
            `;

        return;

    }


    categorias.forEach(
        categoria => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "category-item";


            item.innerHTML =
                `
                    <div>
                        <div class="category-name">
                            ${escaparHTML(categoria.nome)}
                        </div>

                        <div class="category-status">
                            ${
                                categoria.ativo
                                    ? "Ativa"
                                    : "Inativa"
                            }
                        </div>
                    </div>

                    <div class="category-actions">

                        <button
                            type="button"
                            class="table-action"
                            data-category-toggle="${categoria.id}"
                        >
                            ${
                                categoria.ativo
                                    ? "Desativar"
                                    : "Ativar"
                            }
                        </button>

                    </div>
                `;


            categoriaLista.appendChild(item);

        }
    );


    categoriaLista
        .querySelectorAll(
            "[data-category-toggle]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        await alternarCategoria(
                            button.dataset.categoryToggle
                        );

                    }
                );

            }
        );

}


async function criarCategoria() {

    const nome =
        novaCategoriaNome.value.trim();


    if (!nome) {

        mostrarMensagem(
            categoriaMessage,
            "Informe o nome da categoria."
        );

        return;

    }


    criarCategoriaButton.disabled =
        true;


    try {

        const {
            error
        } =
            await supabaseClient
                .from("erp_categorias")
                .insert({
                    empresa_id:
                        empresaERP.id,

                    nome,

                    ativo: true
                });


        if (error) {
            throw error;
        }


        novaCategoriaNome.value = "";

        esconderMensagem(
            categoriaMessage
        );


        await carregarCategorias();


        mostrarToast(
            "Categoria criada com sucesso."
        );


    } catch (erro) {

        console.error(
            "Erro ao criar categoria:",
            erro
        );


        mostrarMensagem(
            categoriaMessage,
            traduzirErroBanco(
                erro,
                "Não foi possível criar a categoria."
            )
        );

    } finally {

        criarCategoriaButton.disabled =
            false;

    }

}


async function alternarCategoria(id) {

    const categoria =
        categorias.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!categoria) {
        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("erp_categorias")
                .update({
                    ativo:
                        !categoria.ativo
                })
                .eq(
                    "id",
                    categoria.id
                )
                .eq(
                    "empresa_id",
                    empresaERP.id
                );


        if (error) {
            throw error;
        }


        await carregarCategorias();

        await carregarProdutos();


        mostrarToast(
            categoria.ativo
                ? "Categoria desativada."
                : "Categoria ativada."
        );


    } catch (erro) {

        console.error(
            "Erro ao alterar categoria:",
            erro
        );


        mostrarToast(
            "Não foi possível alterar a categoria."
        );

    }

}


// =====================================================
// PRODUTOS
// =====================================================

async function carregarProdutos() {

    mostrarEstadoCarregando();


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("erp_produtos")
                .select(`
                    id,
                    empresa_id,
                    categoria_id,
                    codigo,
                    codigo_barras,
                    nome,
                    descricao,
                    unidade,
                    preco_custo,
                    preco_venda,
                    estoque_minimo,
                    estoque_maximo,
                    ativo,
                    created_at,
                    updated_at
                `)
                .eq(
                    "empresa_id",
                    empresaERP.id
                )
                .order(
                    "nome",
                    {
                        ascending: true
                    }
                );


        if (error) {
            throw error;
        }


        produtos =
            data || [];


        atualizarResumo();

        renderizarProdutos();

    } catch (erro) {

        console.error(
            "Erro ao carregar produtos:",
            erro
        );


        produtos = [];

        atualizarResumo();

        mostrarEstadoVazio();

        mostrarToast(
            "Não foi possível carregar os produtos."
        );

    }

}


function atualizarResumo() {

    totalProdutos.textContent =
        produtos.length;


    totalAtivos.textContent =
        produtos.filter(
            produto =>
                produto.ativo
        ).length;

}


function obterProdutosFiltrados() {

    const busca =
        campoBusca.value
            .trim()
            .toLowerCase();


    const categoria =
        filtroCategoria.value;


    const status =
        filtroStatus.value;


    return produtos.filter(
        produto => {

            const correspondeBusca =
                !busca ||

                String(
                    produto.nome || ""
                )
                    .toLowerCase()
                    .includes(busca) ||

                String(
                    produto.codigo || ""
                )
                    .toLowerCase()
                    .includes(busca) ||

                String(
                    produto.codigo_barras || ""
                )
                    .toLowerCase()
                    .includes(busca);


            const correspondeCategoria =
                !categoria ||
                String(
                    produto.categoria_id || ""
                ) ===
                String(categoria);


            const correspondeStatus =
                status === "todos" ||

                (
                    status === "ativos" &&
                    produto.ativo
                ) ||

                (
                    status === "inativos" &&
                    !produto.ativo
                );


            return (
                correspondeBusca &&
                correspondeCategoria &&
                correspondeStatus
            );

        }
    );

}


function renderizarProdutos() {

    const lista =
        obterProdutosFiltrados();


    produtosTabela.innerHTML = "";


    if (!lista.length) {

        mostrarEstadoVazio();

        return;

    }


    mostrarEstadoTabela();


    lista.forEach(
        produto => {

            const tr =
                document.createElement(
                    "tr"
                );


            tr.innerHTML =
                `
                    <td>

                        <div class="product-name">
                            ${escaparHTML(produto.nome)}
                        </div>

                        ${
                            produto.descricao
                                ? `
                                    <div class="product-description">
                                        ${escaparHTML(produto.descricao)}
                                    </div>
                                  `
                                : ""
                        }

                    </td>


                    <td>
                        ${escaparHTML(
                            produto.codigo || "-"
                        )}
                    </td>


                    <td>
                        ${escaparHTML(
                            nomeCategoria(
                                produto.categoria_id
                            )
                        )}
                    </td>


                    <td>
                        ${escaparHTML(
                            produto.unidade || "UN"
                        )}
                    </td>


                    <td class="price">
                        ${formatarMoeda(
                            produto.preco_venda
                        )}
                    </td>


                    <td>

                        <span
                            class="status-badge ${
                                produto.ativo
                                    ? "active"
                                    : "inactive"
                            }"
                        >

                            <span class="status-dot-small"></span>

                            ${
                                produto.ativo
                                    ? "Ativo"
                                    : "Inativo"
                            }

                        </span>

                    </td>


                    <td>

                        <div class="action-buttons">

                            <button
                                type="button"
                                class="table-action"
                                data-edit-product="${produto.id}"
                            >
                                Editar
                            </button>


                            <button
                                type="button"
                                class="table-action"
                                data-toggle-product="${produto.id}"
                            >
                                ${
                                    produto.ativo
                                        ? "Desativar"
                                        : "Ativar"
                                }
                            </button>

                        </div>

                    </td>
                `;


            produtosTabela.appendChild(tr);

        }
    );


    produtosTabela
        .querySelectorAll(
            "[data-edit-product]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        abrirModalProduto(
                            button.dataset.editProduct
                        );

                    }
                );

            }
        );


    produtosTabela
        .querySelectorAll(
            "[data-toggle-product]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        await alternarProduto(
                            button.dataset.toggleProduct
                        );

                    }
                );

            }
        );

}


// =====================================================
// MODAL PRODUTO
// =====================================================

function abrirModalProduto(id = null) {

    esconderMensagem(formMessage);


    produtoEditando =
        id
            ? produtos.find(
                produto =>
                    String(produto.id) ===
                    String(id)
            )
            : null;


    produtoForm.reset();


    produtoId.value =
        produtoEditando?.id || "";


    if (produtoEditando) {

        produtoModalTitulo.textContent =
            "Editar produto";


        produtoNome.value =
            produtoEditando.nome || "";


        produtoCodigo.value =
            produtoEditando.codigo || "";


        produtoCodigoBarras.value =
            produtoEditando.codigo_barras || "";


        produtoCategoria.value =
            produtoEditando.categoria_id || "";


        produtoUnidade.value =
            produtoEditando.unidade || "UN";


        produtoDescricao.value =
            produtoEditando.descricao || "";


        produtoPrecoCusto.value =
            produtoEditando.preco_custo ?? 0;


        produtoPrecoVenda.value =
            produtoEditando.preco_venda ?? 0;


        produtoEstoqueMinimo.value =
            produtoEditando.estoque_minimo ?? 0;


        produtoEstoqueMaximo.value =
            produtoEditando.estoque_maximo ?? "";


        produtoAtivo.checked =
            produtoEditando.ativo;


        estoqueInicialField.hidden =
            true;


        statusProdutoSection.hidden =
            false;


        salvarProdutoButton.textContent =
            "Salvar alterações";

    } else {

        produtoModalTitulo.textContent =
            "Novo produto";


        produtoUnidade.value =
            "UN";


        produtoPrecoCusto.value =
            "0";


        produtoPrecoVenda.value =
            "0";


        produtoEstoqueMinimo.value =
            "0";


        produtoEstoqueMaximo.value =
            "";


        produtoEstoqueInicial.value =
            "0";


        produtoAtivo.checked =
            true;


        estoqueInicialField.hidden =
            false;


        statusProdutoSection.hidden =
            true;


        salvarProdutoButton.textContent =
            "Salvar produto";

    }


    produtoModal.hidden = false;


    setTimeout(
        () => {
            produtoNome.focus();
        },
        50
    );

}


function fecharModalProduto() {

    produtoModal.hidden =
        true;

    produtoEditando =
        null;

}


async function salvarProduto(evento) {

    evento.preventDefault();

    esconderMensagem(formMessage);


    const nome =
        produtoNome.value.trim();


    if (!nome) {

        mostrarMensagem(
            formMessage,
            "Informe o nome do produto."
        );

        produtoNome.focus();

        return;

    }


    const precoCusto =
        Number(
            produtoPrecoCusto.value || 0
        );


    const precoVenda =
        Number(
            produtoPrecoVenda.value || 0
        );


    const estoqueMinimo =
        Number(
            produtoEstoqueMinimo.value || 0
        );


    const estoqueMaximo =
        produtoEstoqueMaximo.value === ""
            ? null
            : Number(
                produtoEstoqueMaximo.value
            );


    const estoqueInicial =
        Number(
            produtoEstoqueInicial.value || 0
        );


    if (
        !Number.isFinite(precoCusto) ||
        !Number.isFinite(precoVenda) ||
        !Number.isFinite(estoqueMinimo) ||
        !Number.isFinite(estoqueInicial) ||
        (
            estoqueMaximo !== null &&
            !Number.isFinite(estoqueMaximo)
        )
    ) {

        mostrarMensagem(
            formMessage,
            "Informe valores numéricos válidos."
        );

        return;

    }


    if (
        precoCusto < 0 ||
        precoVenda < 0 ||
        estoqueMinimo < 0 ||
        estoqueInicial < 0 ||
        (
            estoqueMaximo !== null &&
            estoqueMaximo < 0
        )
    ) {

        mostrarMensagem(
            formMessage,
            "Os valores informados não podem ser negativos."
        );

        return;

    }


    if (
        estoqueMaximo !== null &&
        estoqueMaximo < estoqueMinimo
    ) {

        mostrarMensagem(
            formMessage,
            "O estoque máximo não pode ser menor que o estoque mínimo."
        );

        return;

    }


    salvarProdutoButton.disabled =
        true;


    try {

        const dadosProduto = {

            empresa_id:
                empresaERP.id,

            categoria_id:
                produtoCategoria.value ||
                null,

            codigo:
                produtoCodigo.value.trim() ||
                null,

            codigo_barras:
                produtoCodigoBarras.value.trim() ||
                null,

            nome,

            descricao:
                produtoDescricao.value.trim() ||
                null,

            unidade:
                produtoUnidade.value ||
                "UN",

            preco_custo:
                precoCusto,

            preco_venda:
                precoVenda,

            estoque_minimo:
                estoqueMinimo,

            estoque_maximo:
                estoqueMaximo,

            ativo:
                produtoEditando
                    ? produtoAtivo.checked
                    : true

        };


        if (produtoEditando) {

            const {
                error
            } =
                await supabaseClient
                    .from("erp_produtos")
                    .update(dadosProduto)
                    .eq(
                        "id",
                        produtoEditando.id
                    )
                    .eq(
                        "empresa_id",
                        empresaERP.id
                    );


            if (error) {
                throw error;
            }


            mostrarToast(
                "Produto atualizado com sucesso."
            );

        } else {

            const {
                data: novoProduto,
                error
            } =
                await supabaseClient
                    .from("erp_produtos")
                    .insert(dadosProduto)
                    .select("id")
                    .single();


            if (error) {
                throw error;
            }


            if (
                estoqueInicial > 0
            ) {

                await registrarEstoqueInicial(
                    novoProduto.id,
                    estoqueInicial
                );

            } else {

                /*
                 * Mesmo sem estoque inicial,
                 * criamos o registro geral do produto.
                 * Isso deixa o módulo Estoque preparado
                 * para trabalhar com quantidade zero.
                 */

                const {
                    error: estoqueZeroError
                } =
                    await supabaseClient
                        .from("erp_estoques")
                        .insert({
                            empresa_id:
                                empresaERP.id,

                            produto_id:
                                novoProduto.id,

                            pdv_id:
                                null,

                            quantidade:
                                0
                        });


                if (estoqueZeroError) {
                    throw estoqueZeroError;
                }

            }


            mostrarToast(
                "Produto cadastrado com sucesso."
            );

        }


        fecharModalProduto();

        await carregarProdutos();

    } catch (erro) {

        console.error(
            "Erro ao salvar produto:",
            erro
        );


        mostrarMensagem(
            formMessage,
            traduzirErroBanco(
                erro,
                "Não foi possível salvar o produto."
            )
        );

    } finally {

        salvarProdutoButton.disabled =
            false;

    }

}


// =====================================================
// ESTOQUE INICIAL
// =====================================================

async function registrarEstoqueInicial(
    produtoId,
    quantidade
) {

    const {
        error: estoqueError
    } =
        await supabaseClient
            .from("erp_estoques")
            .insert({
                empresa_id:
                    empresaERP.id,

                produto_id:
                    produtoId,

                pdv_id:
                    null,

                quantidade
            });


    if (estoqueError) {

        console.error(
            "Erro ao criar estoque inicial:",
            estoqueError
        );

        throw estoqueError;

    }


    const {
        error: movimentacaoError
    } =
        await supabaseClient
            .from(
                "erp_movimentacoes_estoque"
            )
            .insert({
                empresa_id:
                    empresaERP.id,

                produto_id:
                    produtoId,

                pdv_id:
                    null,

                usuario_id:
                    usuarioERP.id,

                tipo:
                    "ENTRADA",

                quantidade,

                observacao:
                    "Estoque inicial do produto"
            });


    if (movimentacaoError) {

        console.error(
            "Erro ao registrar movimentação:",
            movimentacaoError
        );

        throw movimentacaoError;

    }

}


// =====================================================
// ATIVAR / DESATIVAR PRODUTO
// =====================================================

async function alternarProduto(id) {

    const produto =
        produtos.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!produto) {
        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("erp_produtos")
                .update({
                    ativo:
                        !produto.ativo
                })
                .eq(
                    "id",
                    produto.id
                )
                .eq(
                    "empresa_id",
                    empresaERP.id
                );


        if (error) {
            throw error;
        }


        await carregarProdutos();


        mostrarToast(
            produto.ativo
                ? "Produto desativado."
                : "Produto ativado."
        );


    } catch (erro) {

        console.error(
            "Erro ao alterar produto:",
            erro
        );


        mostrarToast(
            "Não foi possível alterar o produto."
        );

    }

}


// =====================================================
// NAVEGAÇÃO
// =====================================================

function configurarMenu() {

    document
        .querySelectorAll("[data-module]")
        .forEach(
            botao => {

                botao.addEventListener(
                    "click",
                    () => {

                        const modulo =
                            botao.dataset.module;


                        if (
                            modulo === "dashboard"
                        ) {

                            window.location.href =
                                "dashboard.html";

                            return;

                        }


                        if (
                            modulo === "pdv"
                        ) {

                            window.location.href =
                                "pdv.html";

                            return;

                        }


                        if (
                            modulo === "produtos"
                        ) {

                            window.location.href =
                                "produtos.html";

                            return;

                        }


                        if (
                            modulo === "estoque"
                        ) {

                            window.location.href =
                                "estoque.html";

                            return;

                        }


                        alert(
                            "Módulo em construção: " +
                            modulo.toUpperCase()
                        );

                    }
                );

            }
        );

}


// =====================================================
// LOGOUT
// =====================================================

async function fazerLogout() {

    logoutButton.disabled =
        true;

    try {

        await supabaseClient.auth.signOut();

    } catch (erro) {

        console.error(
            "Erro ao sair:",
            erro
        );

    }

    sairParaLogin();

}


// =====================================================
// EVENTOS
// =====================================================

campoBusca.addEventListener(
    "input",
    renderizarProdutos
);


filtroCategoria.addEventListener(
    "change",
    renderizarProdutos
);


filtroStatus.addEventListener(
    "change",
    renderizarProdutos
);


novoProdutoButton.addEventListener(
    "click",
    () => abrirModalProduto()
);


emptyNovoProdutoButton.addEventListener(
    "click",
    () => abrirModalProduto()
);


fecharProdutoModal.addEventListener(
    "click",
    fecharModalProduto
);


cancelarProdutoButton.addEventListener(
    "click",
    fecharModalProduto
);


produtoForm.addEventListener(
    "submit",
    salvarProduto
);


gerenciarCategoriasButton.addEventListener(
    "click",
    () => {

        esconderMensagem(
            categoriaMessage
        );

        categoriasModal.hidden =
            false;

        novaCategoriaNome.focus();

    }
);


fecharCategoriasModal.addEventListener(
    "click",
    () => {

        categoriasModal.hidden =
            true;

    }
);


criarCategoriaButton.addEventListener(
    "click",
    criarCategoria
);


novaCategoriaNome.addEventListener(
    "keydown",
    evento => {

        if (
            evento.key === "Enter"
        ) {

            evento.preventDefault();

            criarCategoria();

        }

    }
);


logoutButton.addEventListener(
    "click",
    fazerLogout
);


produtoModal.addEventListener(
    "click",
    evento => {

        if (
            evento.target === produtoModal
        ) {

            fecharModalProduto();

        }

    }
);


categoriasModal.addEventListener(
    "click",
    evento => {

        if (
            evento.target === categoriasModal
        ) {

            categoriasModal.hidden =
                true;

        }

    }
);


// =====================================================
// ERROS DO BANCO
// =====================================================

function traduzirErroBanco(
    erro,
    padrao
) {

    const mensagem =
        String(
            erro?.message ||
            ""
        ).toLowerCase();


    if (
        mensagem.includes("duplicate") ||
        mensagem.includes("unique")
    ) {

        return (
            "Já existe um registro com essas informações."
        );

    }


    if (
        mensagem.includes("row-level security") ||
        mensagem.includes("policy") ||
        mensagem.includes("permission")
    ) {

        return (
            "A operação não foi autorizada para esta empresa."
        );

    }


    return padrao;

}


// =====================================================
// INICIALIZAÇÃO
// =====================================================

try {

    mostrarEstadoCarregando();


    const sessaoOK =
        await carregarSessao();


    if (!sessaoOK) {
        return;
    }


    configurarMenu();


    await carregarCategorias();

    await carregarProdutos();


} catch (erro) {

    console.error(
        "Erro ao iniciar módulo de produtos:",
        erro
    );


    produtos = [];

    atualizarResumo();

    mostrarEstadoVazio();


    mostrarToast(
        "Não foi possível carregar o módulo de produtos."
    );

}

});