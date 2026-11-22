/* =========================================================
   RIVER TECH ERP
   MÓDULO DE ESTOQUE
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    if (!(await window.erpExigirModulo('ESTOQUE'))) return;

    /* =====================================================
       SUPABASE
       ===================================================== */

    if (typeof supabaseClient === "undefined") {

        console.error(
            "Supabase não foi inicializado."
        );

        mostrarErroPagina(
            "Não foi possível conectar ao Supabase."
        );

        return;
    }


    /* =====================================================
       ELEMENTOS
       ===================================================== */

    const companyLogo =
        document.getElementById("companyLogo");

    const companyName =
        document.getElementById("companyName");


    // Indicadores

    const statProdutos =
        document.getElementById("statProdutos");

    const statNormal =
        document.getElementById("statNormal");

    const statBaixo =
        document.getElementById("statBaixo");

    const statZerado =
        document.getElementById("statZerado");


    // Busca / filtros

    const campoBusca =
        document.getElementById("campoBusca");

    const filtroSituacao =
        document.getElementById("filtroSituacao");

    const btnAtualizar =
        document.getElementById("btnAtualizar");


    // Tabela estoque

    const tabelaEstoque =
        document.getElementById("tabelaEstoque");

    const estadoTabela =
        document.getElementById("estadoTabela");


    // Tabela movimentações

    const tabelaMovimentacoes =
        document.getElementById("tabelaMovimentacoes");

    const estadoMovimentacoes =
        document.getElementById("estadoMovimentacoes");


    // Modal

    const modalMovimentacao =
        document.getElementById("modalMovimentacao");

    const btnNovaMovimentacao =
        document.getElementById("btnNovaMovimentacao");

    const btnFecharModal =
        document.getElementById("btnFecharModal");

    const btnCancelarModal =
        document.getElementById("btnCancelarModal");

    const formMovimentacao =
        document.getElementById("formMovimentacao");

    const movProduto =
        document.getElementById("movProduto");

    const movTipo =
        document.getElementById("movTipo");

    const movQuantidade =
        document.getElementById("movQuantidade");

    const movObservacao =
        document.getElementById("movObservacao");

    const modalErro =
        document.getElementById("modalErro");


    /* =====================================================
       ESTADO
       ===================================================== */

    let usuarioERP = null;
    let empresaERP = null;

    let produtos = [];
    let estoques = [];
    let movimentacoes = [];

    let carregando = false;


    /* =====================================================
       UTILITÁRIOS
       ===================================================== */

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


    function numero(valor) {

        const resultado =
            Number(valor);

        return Number.isFinite(resultado)
            ? resultado
            : 0;
    }


    function formatarNumero(valor) {

        return numero(valor).toLocaleString(
            "pt-BR",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 3
            }
        );
    }


    function formatarData(data) {

        if (!data) {
            return "-";
        }

        const dataObj =
            new Date(data);

        if (
            Number.isNaN(
                dataObj.getTime()
            )
        ) {
            return "-";
        }

        return dataObj.toLocaleString(
            "pt-BR",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    }


    function primeiraLetra(nome) {

        if (!nome) {
            return "R";
        }

        return String(nome)
            .trim()
            .charAt(0)
            .toUpperCase() || "R";
    }


    /* =====================================================
       ERRO DE PÁGINA
       ===================================================== */

    function mostrarErroPagina(mensagem) {

        const main =
            document.querySelector(
                ".main-content"
            );

        if (!main) {
            return;
        }

        main.innerHTML = `

            <div style="
                margin:40px auto;
                max-width:700px;
                padding:30px;
                border-radius:18px;
                background:#fff;
                border:1px solid #fecaca;
                box-shadow:0 10px 30px rgba(0,0,0,.06);
                color:#991b1b;
            ">

                <strong style="
                    display:block;
                    font-size:20px;
                    margin-bottom:10px;
                ">
                    Erro ao carregar o Estoque
                </strong>

                <span style="
                    font-size:14px;
                ">
                    ${escaparHTML(mensagem)}
                </span>

            </div>
        `;
    }


    /* =====================================================
       LOGO DA EMPRESA
       ===================================================== */

    function colocarLogo() {

        if (!companyLogo) {
            return;
        }

        companyLogo.innerHTML = "";

        if (
            empresaERP &&
            empresaERP.logo_url
        ) {

            const img =
                document.createElement("img");

            img.src =
                empresaERP.logo_url;

            img.alt =
                empresaERP.nome ||
                "Empresa";

            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = "contain";

            img.onerror = () => {

                companyLogo.textContent =
                    primeiraLetra(
                        empresaERP.nome
                    );
            };

            companyLogo.appendChild(img);

        } else {

            companyLogo.textContent =
                primeiraLetra(
                    empresaERP?.nome
                );
        }
    }


    /* =====================================================
       SESSÃO
       ===================================================== */

    async function verificarSessao() {

        const {
            data: { session },
            error
        } =
            await supabaseClient.auth.getSession();

        if (error) {

            console.error(
                "Erro ao verificar sessão:",
                error
            );

            throw new Error(
                "Não foi possível verificar sua sessão."
            );
        }

        if (
            !session ||
            !session.user
        ) {

            window.location.href =
                "index.html";

            return null;
        }

        return session.user;
    }


    /* =====================================================
       USUÁRIO ERP
       ===================================================== */

    async function carregarUsuario(authUser) {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("erp_usuarios")
                .select("*")
                .eq(
                    "auth_user_id",
                    authUser.id
                )
                .maybeSingle();

        if (error) {

            console.error(
                "Erro usuário ERP:",
                error
            );

            throw new Error(
                "Não foi possível carregar o usuário do ERP."
            );
        }

        if (!data) {

            throw new Error(
                "Usuário ERP não encontrado."
            );
        }

        if (
            data.ativo === false ||
            data.bloqueado === true
        ) {

            await supabaseClient.auth.signOut();

            alert(
                "Seu acesso ao ERP está bloqueado ou inativo."
            );

            window.location.href =
                "index.html";

            return null;
        }

        return data;
    }


    /* =====================================================
       EMPRESA
       ===================================================== */

    async function carregarEmpresa(
        empresaId
    ) {

        if (!empresaId) {

            throw new Error(
                "O usuário não possui uma empresa vinculada."
            );
        }

        const {
            data,
            error
        } =
            await supabaseClient
                .from("erp_empresas")
                .select("*")
                .eq(
                    "id",
                    empresaId
                )
                .maybeSingle();

        if (error) {

            console.error(
                "Erro empresa:",
                error
            );

            throw new Error(
                "Não foi possível carregar a empresa."
            );
        }

        if (!data) {

            throw new Error(
                "Empresa não encontrada."
            );
        }

        if (
            data.ativo === false ||
            data.bloqueado === true
        ) {

            await supabaseClient.auth.signOut();

            alert(
                "A empresa está bloqueada ou inativa."
            );

            window.location.href =
                "index.html";

            return null;
        }

        return data;
    }


    /* =====================================================
       PRODUTOS
       ===================================================== */

    async function carregarProdutos() {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("erp_produtos")
                .select("*")
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
                "Erro produtos:",
                error
            );

            throw new Error(
                "Não foi possível carregar os produtos."
            );
        }

        produtos =
            data || [];
    }


    /* =====================================================
       ESTOQUE
       ===================================================== */

    async function carregarEstoque() {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("erp_estoques")
                .select("*")
                .eq(
                    "empresa_id",
                    empresaERP.id
                )
                .is(
                    "pdv_id",
                    null
                );

        if (error) {

            console.error(
                "Erro estoque:",
                error
            );

            throw new Error(
                "Não foi possível carregar os registros de estoque."
            );
        }

        estoques =
            data || [];

        console.log(
            "Estoques carregados:",
            estoques
        );
    }


    /* =====================================================
       MOVIMENTAÇÕES
       ===================================================== */

    async function carregarMovimentacoes() {

        const {
            data,
            error
        } =
            await supabaseClient
                .from(
                    "erp_movimentacoes_estoque"
                )
                .select("*")
                .eq(
                    "empresa_id",
                    empresaERP.id
                )
                .is(
                    "pdv_id",
                    null
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                )
                .limit(100);

        if (error) {

            console.error(
                "Erro movimentações:",
                error
            );

            throw new Error(
                "Não foi possível carregar as movimentações."
            );
        }

        movimentacoes =
            data || [];

        console.log(
            "Movimentações carregadas:",
            movimentacoes
        );
    }


    /* =====================================================
       ENCONTRAR PRODUTO
       ===================================================== */

    function encontrarProduto(
        produtoId
    ) {

        return produtos.find(
            produto =>
                String(produto.id) ===
                String(produtoId)
        );
    }


    /* =====================================================
       ENCONTRAR ESTOQUE
       ===================================================== */

    function encontrarEstoque(
        produtoId
    ) {

        return estoques.find(
            estoque =>
                String(
                    estoque.produto_id
                ) ===
                String(produtoId)
        );
    }


    /* =====================================================
       ESTOQUE MÍNIMO
       ===================================================== */

    function obterEstoqueMinimo(
        produto
    ) {

        if (!produto) {
            return 0;
        }

        if (
            produto.estoque_minimo !==
            undefined &&
            produto.estoque_minimo !== null
        ) {

            return numero(
                produto.estoque_minimo
            );
        }

        if (
            produto.minimo_estoque !==
            undefined &&
            produto.minimo_estoque !== null
        ) {

            return numero(
                produto.minimo_estoque
            );
        }

        if (
            produto.estoque_min !==
            undefined &&
            produto.estoque_min !== null
        ) {

            return numero(
                produto.estoque_min
            );
        }

        return 0;
    }


    /* =====================================================
       SITUAÇÃO
       ===================================================== */

    function obterSituacao(
        produto,
        quantidade
    ) {

        const minimo =
            obterEstoqueMinimo(
                produto
            );

        if (quantidade <= 0) {

            return {
                texto: "Sem estoque",
                classe: "zerado"
            };
        }

        if (
            minimo > 0 &&
            quantidade <= minimo
        ) {

            return {
                texto: "Estoque baixo",
                classe: "baixo"
            };
        }

        return {
            texto: "Normal",
            classe: "normal"
        };
    }


    /* =====================================================
       RENDERIZAR TABELA DE ESTOQUE
       ===================================================== */

    function renderizarEstoque() {

        if (!tabelaEstoque) {
            return;
        }

        const busca =
            (
                campoBusca?.value ||
                ""
            )
                .trim()
                .toLowerCase();

        const filtro =
            (
                filtroSituacao?.value ||
                "TODOS"
            ).toUpperCase();


        const dados =
            produtos
                .map(produto => {

                    const estoque =
                        encontrarEstoque(
                            produto.id
                        );

                    const quantidade =
                        estoque
                            ? numero(
                                estoque.quantidade
                            )
                            : 0;

                    const situacao =
                        obterSituacao(
                            produto,
                            quantidade
                        );

                    return {
                        produto,
                        estoque,
                        quantidade,
                        situacao
                    };
                })
                .filter(item => {

                    const produto =
                        item.produto;

                    const nome =
                        String(
                            produto.nome || ""
                        ).toLowerCase();

                    const codigo =
                        String(
                            produto.codigo_barras ||
                            produto.codigo ||
                            ""
                        ).toLowerCase();

                    const correspondeBusca =
                        !busca ||
                        nome.includes(busca) ||
                        codigo.includes(busca);

                    let correspondeSituacao =
                        true;

                    if (
                        filtro === "NORMAL"
                    ) {

                        correspondeSituacao =
                            item.situacao.classe ===
                            "normal";
                    }

                    if (
                        filtro === "BAIXO"
                    ) {

                        correspondeSituacao =
                            item.situacao.classe ===
                            "baixo";
                    }

                    if (
                        filtro === "ZERADO"
                    ) {

                        correspondeSituacao =
                            item.situacao.classe ===
                            "zerado";
                    }

                    return (
                        correspondeBusca &&
                        correspondeSituacao
                    );
                });


        /* =============================================
           ESCONDE ESTADO DE CARREGAMENTO
           ============================================= */

        if (estadoTabela) {

            estadoTabela.style.display =
                "none";
        }


        /* =============================================
           NENHUM RESULTADO
           ============================================= */

        if (!dados.length) {

            tabelaEstoque.innerHTML = `

                <tr>

                    <td
                        colspan="7"
                        style="
                            text-align:center;
                            padding:40px;
                        "
                    >

                        Nenhum produto encontrado.

                    </td>

                </tr>

            `;

            return;
        }


        /* =============================================
           TABELA
           ============================================= */

        tabelaEstoque.innerHTML =
            dados
                .map(item => {

                    const produto =
                        item.produto;

                    const codigo =
                        produto.codigo_barras ||
                        produto.codigo ||
                        "-";

                    const unidade =
                        produto.unidade ||
                        produto.unidade_medida ||
                        "UN";

                    const minimo =
                        obterEstoqueMinimo(
                            produto
                        );

                    const atualizado =
                        item.estoque?.atualizado_em ||
                        item.estoque?.updated_at ||
                        null;


                    return `

                        <tr>

                            <td>

                                <strong>
                                    ${escaparHTML(
                                        produto.nome ||
                                        "-"
                                    )}
                                </strong>

                            </td>


                            <td>
                                ${escaparHTML(
                                    codigo
                                )}
                            </td>


                            <td>
                                ${escaparHTML(
                                    unidade
                                )}
                            </td>


                            <td>

                                <strong>
                                    ${formatarNumero(
                                        item.quantidade
                                    )}
                                </strong>

                            </td>


                            <td>
                                ${formatarNumero(
                                    minimo
                                )}
                            </td>


                            <td>

                                <span
                                    class="status-badge ${item.situacao.classe}"
                                >
                                    ${item.situacao.texto}
                                </span>

                            </td>


                            <td>

                                <span
                                    class="data-estoque"
                                >
                                    ${formatarData(
                                        atualizado
                                    )}
                                </span>

                            </td>

                        </tr>

                    `;

                })
                .join("");
    }


    /* =====================================================
       RENDERIZAR MOVIMENTAÇÕES
       ===================================================== */

    function renderizarMovimentacoes() {

        if (!tabelaMovimentacoes) {
            return;
        }


        if (estadoMovimentacoes) {

            estadoMovimentacoes.style.display =
                "none";
        }


        if (!movimentacoes.length) {

            tabelaMovimentacoes.innerHTML = `

                <tr>

                    <td
                        colspan="5"
                        style="
                            text-align:center;
                            padding:35px;
                        "
                    >

                        Nenhuma movimentação registrada.

                    </td>

                </tr>

            `;

            return;
        }


        tabelaMovimentacoes.innerHTML =
            movimentacoes
                .map(mov => {

                    const produto =
                        encontrarProduto(
                            mov.produto_id
                        );

                    const nomeProduto =
                        produto?.nome ||
                        "Produto não encontrado";

                    const tipo =
                        String(
                            mov.tipo ||
                            ""
                        ).toUpperCase();


                    let classeTipo =
                        "ajuste";

                    let sinal =
                        "";


                    if (
                        tipo ===
                        "ENTRADA"
                    ) {

                        classeTipo =
                            "entrada";

                        sinal =
                            "+";
                    }


                    if (
                        tipo ===
                        "SAIDA"
                    ) {

                        classeTipo =
                            "saida";

                        sinal =
                            "-";
                    }


                    return `

                        <tr>

                            <td>
                                ${formatarData(
                                    mov.created_at
                                )}
                            </td>


                            <td>

                                <strong>
                                    ${escaparHTML(
                                        nomeProduto
                                    )}
                                </strong>

                            </td>


                            <td>

                                <span
                                    class="tipo-movimentacao ${classeTipo}"
                                >
                                    ${escaparHTML(
                                        tipo ||
                                        "-"
                                    )}
                                </span>

                            </td>


                            <td>

                                <strong>
                                    ${sinal}
                                    ${formatarNumero(
                                        mov.quantidade
                                    )}
                                </strong>

                            </td>


                            <td>
                                ${escaparHTML(
                                    mov.observacao ||
                                    "-"
                                )}
                            </td>

                        </tr>

                    `;

                })
                .join("");
    }


    /* =====================================================
       INDICADORES
       ===================================================== */

    function atualizarIndicadores() {

        let normal =
            0;

        let baixo =
            0;

        let zerado =
            0;


        produtos.forEach(produto => {

            const estoque =
                encontrarEstoque(
                    produto.id
                );

            const quantidade =
                estoque
                    ? numero(
                        estoque.quantidade
                    )
                    : 0;

            const situacao =
                obterSituacao(
                    produto,
                    quantidade
                );


            if (
                situacao.classe ===
                "normal"
            ) {

                normal++;
            }

            else if (
                situacao.classe ===
                "baixo"
            ) {

                baixo++;
            }

            else {

                zerado++;
            }

        });


        if (statProdutos) {

            statProdutos.textContent =
                produtos.length;
        }


        if (statNormal) {

            statNormal.textContent =
                normal;
        }


        if (statBaixo) {

            statBaixo.textContent =
                baixo;
        }


        if (statZerado) {

            statZerado.textContent =
                zerado;
        }
    }


    /* =====================================================
       PREENCHER PRODUTOS DO MODAL
       ===================================================== */

    function preencherProdutos(
        produtoSelecionado = null
    ) {

        if (!movProduto) {
            return;
        }

        movProduto.innerHTML = `

            <option value="">
                Selecione um produto
            </option>

        `;


        produtos.forEach(produto => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                produto.id;

            option.textContent =
                produto.nome ||
                "Produto sem nome";


            if (
                produtoSelecionado &&
                String(produto.id) ===
                String(produtoSelecionado)
            ) {

                option.selected =
                    true;
            }


            movProduto.appendChild(
                option
            );
        });
    }


    /* =====================================================
       ERRO DO MODAL
       ===================================================== */

    function mostrarErroModal(
        mensagem
    ) {

        if (!modalErro) {
            alert(mensagem);
            return;
        }

        modalErro.textContent =
            mensagem;

        modalErro.style.display =
            "block";
    }


    function limparErroModal() {

        if (!modalErro) {
            return;
        }

        modalErro.textContent =
            "";

        modalErro.style.display =
            "none";
    }


    /* =====================================================
       ABRIR MODAL
       ===================================================== */

    function abrirModal(
        produtoId = null
    ) {

        limparErroModal();

        preencherProdutos(
            produtoId
        );


        if (movTipo) {

            movTipo.value =
                "ENTRADA";
        }


        if (movQuantidade) {

            movQuantidade.value =
                "";
        }


        if (movObservacao) {

            movObservacao.value =
                "";
        }


        if (!modalMovimentacao) {
            return;
        }


        modalMovimentacao.classList.add(
            "ativo"
        );


        modalMovimentacao.style.display =
            "flex";


        setTimeout(() => {

            if (
                produtoId &&
                movQuantidade
            ) {

                movQuantidade.focus();

            } else if (
                movProduto
            ) {

                movProduto.focus();
            }

        }, 100);
    }


    /* =====================================================
       FECHAR MODAL
       ===================================================== */

    function fecharModal() {

        if (!modalMovimentacao) {
            return;
        }

        modalMovimentacao.classList.remove(
            "ativo"
        );

        modalMovimentacao.style.display =
            "none";

        limparErroModal();
    }


    /* =====================================================
       MOVIMENTAR ESTOQUE
       ===================================================== */

    async function realizarMovimentacao(
        event
    ) {

        event.preventDefault();

        limparErroModal();


        const produtoId =
            movProduto?.value;

        const tipo =
            String(
                movTipo?.value ||
                ""
            ).toUpperCase();

        const quantidade =
            Number(
                movQuantidade?.value
            );

        const observacao =
            movObservacao?.value?.trim() ||
            null;


        /* =============================================
           VALIDAÇÕES
           ============================================= */

        if (!produtoId) {

            mostrarErroModal(
                "Selecione um produto."
            );

            return;
        }


        if (
            ![
                "ENTRADA",
                "SAIDA",
                "AJUSTE"
            ].includes(tipo)
        ) {

            mostrarErroModal(
                "Selecione um tipo de movimentação válido."
            );

            return;
        }


        if (
            !Number.isFinite(
                quantidade
            )
        ) {

            mostrarErroModal(
                "Informe uma quantidade válida."
            );

            return;
        }


        if (
            tipo !== "AJUSTE" &&
            quantidade <= 0
        ) {

            mostrarErroModal(
                "A quantidade deve ser maior que zero."
            );

            return;
        }


        if (
            tipo === "AJUSTE" &&
            quantidade < 0
        ) {

            mostrarErroModal(
                "O estoque final não pode ser negativo."
            );

            return;
        }


        const produto =
            encontrarProduto(
                produtoId
            );


        if (!produto) {

            mostrarErroModal(
                "Produto não encontrado."
            );

            return;
        }


        /* =============================================
           VERIFICAR ESTOQUE PARA SAÍDA
           ============================================= */

        const estoque =
            encontrarEstoque(
                produtoId
            );

        const estoqueAtual =
            estoque
                ? numero(
                    estoque.quantidade
                )
                : 0;


        if (
            tipo === "SAIDA" &&
            quantidade >
            estoqueAtual
        ) {

            mostrarErroModal(
                `Estoque insuficiente. Estoque atual: ${formatarNumero(
                    estoqueAtual
                )}.`
            );

            return;
        }


        /* =============================================
           BOTÃO
           ============================================= */

        const botao =
            formMovimentacao?.querySelector(
                'button[type="submit"]'
            );


        const textoOriginal =
            botao?.textContent ||
            "Confirmar movimentação";


        try {

            if (botao) {

                botao.disabled =
                    true;

                botao.textContent =
                    "Salvando...";
            }


            /* =========================================
               RPC
               ========================================= */

            const {
                data,
                error
            } =
                await supabaseClient.rpc(
                    "erp_ajustar_estoque",
                    {
                        p_produto_id:
                            produtoId,

                        p_quantidade:
                            quantidade,

                        p_tipo:
                            tipo,

                        p_observacao:
                            observacao
                    }
                );


            if (error) {

                console.error(
                    "Erro RPC estoque:",
                    error
                );

                throw error;
            }


            console.log(
                "Movimentação concluída:",
                data
            );


            fecharModal();


            await carregarTudo();


            alert(
                "Movimentação realizada com sucesso."
            );


        } catch (error) {

            console.error(
                "Erro ao movimentar estoque:",
                error
            );


            mostrarErroModal(
                error?.message ||
                "Não foi possível realizar a movimentação."
            );


        } finally {

            if (botao) {

                botao.disabled =
                    false;

                botao.textContent =
                    textoOriginal;
            }
        }
    }


    /* =====================================================
       CARREGAR DADOS
       ===================================================== */

    async function carregarTudo() {

        if (carregando) {
            return;
        }

        carregando =
            true;


        try {

            /* =============================================
               PRODUTOS
               ============================================= */

            await carregarProdutos();


            /* =============================================
               ESTOQUE
               ============================================= */

            await carregarEstoque();


            /* =============================================
               MOVIMENTAÇÕES
               ============================================= */

            await carregarMovimentacoes();


            /* =============================================
               RENDER
               ============================================= */

            renderizarEstoque();

            renderizarMovimentacoes();

            atualizarIndicadores();


            console.log(
                "Estoque carregado:",
                {
                    produtos:
                        produtos.length,

                    estoques:
                        estoques.length,

                    movimentacoes:
                        movimentacoes.length
                }
            );


        } catch (error) {

            console.error(
                "Erro ao carregar dados:",
                error
            );


            if (estadoTabela) {

                estadoTabela.style.display =
                    "none";
            }


            if (estadoMovimentacoes) {

                estadoMovimentacoes.style.display =
                    "none";
            }


            if (tabelaEstoque) {

                tabelaEstoque.innerHTML = `

                    <tr>

                        <td
                            colspan="7"
                            style="
                                text-align:center;
                                padding:35px;
                                color:#b91c1c;
                            "
                        >

                            Erro ao carregar o estoque.

                        </td>

                    </tr>

                `;
            }


            if (tabelaMovimentacoes) {

                tabelaMovimentacoes.innerHTML = `

                    <tr>

                        <td
                            colspan="5"
                            style="
                                text-align:center;
                                padding:35px;
                                color:#b91c1c;
                            "
                        >

                            Erro ao carregar as movimentações.

                        </td>

                    </tr>

                `;
            }


            console.error(
                "Detalhes:",
                error?.message
            );


        } finally {

            carregando =
                false;
        }
    }


    /* =====================================================
       MENU
       ===================================================== */

    function configurarMenu() {

        const menuItens =
            document.querySelectorAll(
                "[data-module]"
            );


        menuItens.forEach(item => {

            item.addEventListener(
                "click",
                () => {

                    const modulo =
                        item.dataset.module;


                    if (
                        modulo ===
                        "dashboard"
                    ) {

                        window.location.href =
                            "dashboard.html";

                        return;
                    }


                    if (
                        modulo ===
                        "pdv"
                    ) {

                        window.location.href =
                            "pdv.html";

                        return;
                    }


                    if (
                        modulo ===
                        "produtos"
                    ) {

                        window.location.href =
                            "produtos.html";

                        return;
                    }


                    if (
                        modulo ===
                        "estoque"
                    ) {

                        return;
                    }


                    alert(
                        "Este módulo ainda está em construção."
                    );

                }
            );
        });
    }


    /* =====================================================
       EVENTOS
       ===================================================== */

    if (btnNovaMovimentacao) {

        btnNovaMovimentacao.addEventListener(
            "click",
            () => abrirModal()
        );
    }


    if (btnFecharModal) {

        btnFecharModal.addEventListener(
            "click",
            fecharModal
        );
    }


    if (btnCancelarModal) {

        btnCancelarModal.addEventListener(
            "click",
            fecharModal
        );
    }


    if (formMovimentacao) {

        formMovimentacao.addEventListener(
            "submit",
            realizarMovimentacao
        );
    }


    if (modalMovimentacao) {

        modalMovimentacao.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    modalMovimentacao
                ) {

                    fecharModal();
                }
            }
        );
    }


    if (campoBusca) {

        campoBusca.addEventListener(
            "input",
            renderizarEstoque
        );
    }


    if (filtroSituacao) {

        filtroSituacao.addEventListener(
            "change",
            renderizarEstoque
        );
    }


    if (btnAtualizar) {

        btnAtualizar.addEventListener(
            "click",
            async () => {

                btnAtualizar.disabled =
                    true;

                btnAtualizar.textContent =
                    "Atualizando...";


                try {

                    await carregarTudo();

                } finally {

                    btnAtualizar.disabled =
                        false;

                    btnAtualizar.textContent =
                        "↻ Atualizar";
                }
            }
        );
    }


    /* =====================================================
       LOGOUT
       ===================================================== */

    const botoesLogout =
        document.querySelectorAll(
            "#btnLogout, #logoutBtn, [data-action='logout']"
        );


    botoesLogout.forEach(botao => {

        botao.addEventListener(
            "click",
            async () => {

                await supabaseClient.auth.signOut();

                window.location.href =
                    "index.html";
            }
        );
    });


    /* =====================================================
       INICIALIZAÇÃO
       ===================================================== */

    try {

        console.log(
            "Inicializando Estoque River Tech..."
        );


        const authUser =
            await verificarSessao();


        if (!authUser) {
            return;
        }


        usuarioERP =
            await carregarUsuario(
                authUser
            );


        if (!usuarioERP) {
            return;
        }


        empresaERP =
            await carregarEmpresa(
                usuarioERP.empresa_id
            );


        if (!empresaERP) {
            return;
        }


        /* =============================================
           EMPRESA
           ============================================= */

        if (companyName) {

            companyName.textContent =
                empresaERP.nome ||
                "Empresa";
        }


        colocarLogo();


        /* =============================================
           MENU
           ============================================= */

        configurarMenu();


        /* =============================================
           DADOS
           ============================================= */

        await carregarTudo();


        console.log(
            "Módulo Estoque iniciado com sucesso."
        );


    } catch (error) {

        console.error(
            "Erro ao iniciar Estoque:",
            error
        );


        mostrarErroPagina(
            error?.message ||
            "Não foi possível iniciar o módulo de estoque."
        );
    }

});
