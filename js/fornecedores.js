document.addEventListener("DOMContentLoaded", async () => {
    if (!(await window.erpExigirModulo('ESTOQUE'))) return;
    const $ = (id) => document.getElementById(id);
    const form = $("fornecedorForm");
    const lista = $("listaFornecedores");
    const mensagem = $("mensagem");
    const salvarButton = $("salvarButton");

    let empresaAtual = null;
    let fornecedores = [];

    function mostrarMensagem(texto, erro = false) {
        mensagem.textContent = texto;
        mensagem.hidden = false;
        mensagem.classList.toggle("error", erro);
    }

    function limparMensagem() {
        mensagem.hidden = true;
        mensagem.textContent = "";
        mensagem.classList.remove("error");
    }

    function escapar(valor) {
        return String(valor ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function limparFormulario() {
        form.reset();
        $("fornecedorId").value = "";
        $("formTitulo").textContent = "Novo fornecedor";
        salvarButton.textContent = "Salvar fornecedor";
        limparMensagem();
    }

    function preencherFormulario(f) {
        $("fornecedorId").value = f.id;
        $("nome").value = f.nome || "";
        $("nomeFantasia").value = f.nome_fantasia || "";
        $("documento").value = f.documento || "";
        $("telefone").value = f.telefone || "";
        $("email").value = f.email || "";
        $("endereco").value = f.endereco || "";
        $("observacao").value = f.observacao || "";

        $("formTitulo").textContent = "Editar fornecedor";
        salvarButton.textContent = "Salvar alterações";
        limparMensagem();

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function renderizarLista() {
        const termo = $("pesquisa").value.trim().toLocaleLowerCase("pt-BR");

        const filtrados = fornecedores.filter((f) => {
            const texto = [
                f.nome,
                f.nome_fantasia,
                f.documento,
                f.email,
                f.telefone
            ].join(" ").toLocaleLowerCase("pt-BR");

            return texto.includes(termo);
        });

        $("totalFornecedores").textContent = fornecedores.length;

        if (!filtrados.length) {
            lista.innerHTML = `
                <tr>
                    <td colspan="5">Nenhum fornecedor encontrado.</td>
                </tr>`;
            return;
        }

        lista.innerHTML = filtrados.map((f) => `
            <tr>
                <td>
                    ${escapar(f.nome)}
                    ${f.nome_fantasia
                        ? `<br><small>${escapar(f.nome_fantasia)}</small>`
                        : ""}
                </td>
                <td>${escapar(f.documento || "—")}</td>
                <td>
                    ${escapar(f.telefone || "—")}
                    ${f.email
                        ? `<br><small>${escapar(f.email)}</small>`
                        : ""}
                </td>
                <td>
                    <span class="badge ${f.ativo ? "" : "inactive"}">
                        ${f.ativo ? "Ativo" : "Inativo"}
                    </span>
                </td>
                <td>
                    <div class="action-group">
                        <button class="action-btn"
                            data-action="editar"
                            data-id="${escapar(f.id)}">
                            Editar
                        </button>
                        <button class="action-btn danger"
                            data-action="status"
                            data-id="${escapar(f.id)}">
                            ${f.ativo ? "Desativar" : "Ativar"}
                        </button>
                    </div>
                </td>
            </tr>
        `).join("");
    }

    async function carregarFornecedores() {
        lista.innerHTML = `
            <tr><td colspan="5">Carregando...</td></tr>`;

        const { data, error } = await supabaseClient
            .from("erp_fornecedores")
            .select("*")
            .eq("empresa_id", empresaAtual.id)
            .order("nome", { ascending: true });

        if (error) {
            console.error(error);
            mostrarMensagem(
                "Não foi possível carregar os fornecedores. Confira as políticas de acesso do Supabase.",
                true
            );
            lista.innerHTML = `
                <tr><td colspan="5">Erro ao carregar fornecedores.</td></tr>`;
            return;
        }

        fornecedores = data || [];
        renderizarLista();
    }

    async function inicializar() {
        const { data: { session }, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError || !session) {
            window.location.href = "index.html";
            return;
        }

        const { data: usuario, error: usuarioError } = await supabaseClient
            .from("erp_usuarios")
            .select("id, empresa_id, nome, tipo, ativo, bloqueado, auth_user_id")
            .eq("auth_user_id", session.user.id)
            .maybeSingle();

        if (
            usuarioError ||
            !usuario ||
            usuario.ativo !== true ||
            usuario.bloqueado === true ||
            String(usuario.tipo || "").trim().toUpperCase() !== "ADMIN_ERP"
        ) {
            alert("Acesso permitido somente ao administrador ativo do ERP.");
            window.location.href = "index.html";
            return;
        }

        const { data: empresa, error: empresaError } = await supabaseClient
            .from("erp_empresas")
            .select("id, nome, nome_fantasia, ativo, bloqueado")
            .eq("id", usuario.empresa_id)
            .maybeSingle();

        if (
            empresaError ||
            !empresa ||
            empresa.ativo !== true ||
            empresa.bloqueado === true
        ) {
            alert("Empresa indisponível ou sem autorização de acesso.");
            window.location.href = "index.html";
            return;
        }

        empresaAtual = empresa;
        $("empresaNome").textContent =
            empresa.nome_fantasia || empresa.nome || "Empresa";

        await carregarFornecedores();
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        limparMensagem();

        if (!empresaAtual) {
            mostrarMensagem("Empresa não identificada.", true);
            return;
        }

        const id = $("fornecedorId").value || null;

        const dados = {
            empresa_id: empresaAtual.id,
            nome: $("nome").value.trim(),
            nome_fantasia: $("nomeFantasia").value.trim() || null,
            documento: $("documento").value.trim() || null,
            telefone: $("telefone").value.trim() || null,
            email: $("email").value.trim() || null,
            endereco: $("endereco").value.trim() || null,
            observacao: $("observacao").value.trim() || null,
            updated_at: new Date().toISOString()
        };

        if (!dados.nome) {
            mostrarMensagem("Informe o nome ou a razão social.", true);
            return;
        }

        salvarButton.disabled = true;
        salvarButton.textContent = "Salvando...";

        try {
            let resultado;

            if (id) {
                resultado = await supabaseClient
                    .from("erp_fornecedores")
                    .update(dados)
                    .eq("id", id)
                    .eq("empresa_id", empresaAtual.id)
                    .select("id")
                    .maybeSingle();
            } else {
                resultado = await supabaseClient
                    .from("erp_fornecedores")
                    .insert(dados)
                    .select("id")
                    .single();
            }

            if (resultado.error) throw resultado.error;

            if (!resultado.data) {
                throw new Error(
                    "Nenhum registro foi alterado. Verifique as permissões de acesso."
                );
            }

            limparFormulario();
            mostrarMensagem(
                id
                    ? "Fornecedor atualizado com sucesso."
                    : "Fornecedor cadastrado com sucesso."
            );

            await carregarFornecedores();
        } catch (error) {
            console.error("Erro ao salvar fornecedor:", error);
            mostrarMensagem(
                error.message || "Não foi possível salvar o fornecedor.",
                true
            );
        } finally {
            salvarButton.disabled = false;
            salvarButton.textContent = $("fornecedorId").value
                ? "Salvar alterações"
                : "Salvar fornecedor";
        }
    });

    lista.addEventListener("click", async (event) => {
        const botao = event.target.closest("button[data-action]");
        if (!botao) return;

        const fornecedor = fornecedores.find((f) => f.id === botao.dataset.id);
        if (!fornecedor) return;

        if (botao.dataset.action === "editar") {
            preencherFormulario(fornecedor);
            return;
        }

        if (botao.dataset.action === "status") {
            const novoStatus = !fornecedor.ativo;
            const confirmacao = confirm(
                `${novoStatus ? "Ativar" : "Desativar"} o fornecedor "${fornecedor.nome}"?`
            );

            if (!confirmacao) return;

            botao.disabled = true;

            const { error } = await supabaseClient
                .from("erp_fornecedores")
                .update({
                    ativo: novoStatus,
                    updated_at: new Date().toISOString()
                })
                .eq("id", fornecedor.id)
                .eq("empresa_id", empresaAtual.id);

            if (error) {
                console.error(error);
                mostrarMensagem("Não foi possível alterar o status.", true);
            } else {
                mostrarMensagem(
                    `Fornecedor ${novoStatus ? "ativado" : "desativado"} com sucesso.`
                );
            }

            await carregarFornecedores();
        }
    });

    $("pesquisa").addEventListener("input", renderizarLista);
    $("limparButton").addEventListener("click", limparFormulario);

    $("voltarButton").addEventListener("click", () => {
        window.location.href = "dashboard.html";
    });

    try {
        await inicializar();
    } catch (error) {
        console.error(error);
        mostrarMensagem("Falha ao iniciar a página. Confira a conexão com o Supabase.", true);
    }
});