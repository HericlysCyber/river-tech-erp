// =====================================================
// RIVER TECH ERP
// LOGIN DO CLIENTE — ERP E PDV
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {
    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const loginButton = document.getElementById("loginButton");
    const loginMessage = document.getElementById("loginMessage");

    function mostrarMensagem(mensagem, tipo = "error") {
        loginMessage.textContent = mensagem;
        loginMessage.className = `login-message ${tipo}`;
    }

    function limparMensagem() {
        loginMessage.textContent = "";
        loginMessage.className = "login-message";
    }

    function carregando(estado) {
        loginButton.disabled = estado;
        loginButton.textContent = estado ? "Verificando acesso..." : "Entrar";
    }

    function sairParaLogin() {
        sessionStorage.removeItem("ERP_USUARIO");
        sessionStorage.removeItem("ERP_EMPRESA");
    }

    // =================================================
    // CONFERE SESSÃO ANTERIOR
    // =================================================

    

    // =================================================
    // LOGIN
    // =================================================

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        limparMensagem();

        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;

        if (!email || !password) {
            mostrarMensagem("Informe seu e-mail e sua senha.");
            return;
        }

        carregando(true);

        try {
            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

            if (error) {
                throw new Error(traduzirErroLogin(error));
            }

            if (!data?.user) {
                throw new Error("Não foi possível identificar o usuário.");
            }

            await verificarUsuarioERP(data.user);

        } catch (erro) {
            console.error("Erro no login:", erro);

            mostrarMensagem(
                erro.message || "Não foi possível realizar o login."
            );

            carregando(false);
        }
    });

    // =================================================
    // VERIFICA USUÁRIO E EMPRESA
    // =================================================

    async function verificarUsuarioERP(authUser) {
        const { data: usuario, error: usuarioError } =
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
                .eq("auth_user_id", authUser.id)
                .maybeSingle();

        if (usuarioError) {
            console.error("Erro ao consultar erp_usuarios:", usuarioError);
            throw new Error("Não foi possível verificar seu acesso.");
        }

        if (!usuario) {
            await supabaseClient.auth.signOut();
            sairParaLogin();
            throw new Error("Este usuário não possui acesso ao ERP ou PDV.");
        }

        if (usuario.ativo !== true || usuario.bloqueado === true) {
            await supabaseClient.auth.signOut();
            sairParaLogin();
            throw new Error("Seu usuário está inativo ou bloqueado.");
        }

        const tipo = String(usuario.tipo || "")
            .trim()
            .toUpperCase();

        // =================================================
        // CONFERE A EMPRESA VINCULADA
        // =================================================

        const { data: empresa, error: empresaError } =
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
                .eq("id", usuario.empresa_id)
                .maybeSingle();

        if (empresaError) {
            console.error("Erro ao consultar empresa:", empresaError);
            throw new Error("Não foi possível verificar a empresa vinculada.");
        }

        if (!empresa) {
            await supabaseClient.auth.signOut();
            sairParaLogin();
            throw new Error("A empresa vinculada não foi encontrada.");
        }

        if (empresa.ativo !== true || empresa.bloqueado === true) {
            await supabaseClient.auth.signOut();
            sairParaLogin();
            throw new Error("A empresa está inativa ou bloqueada.");
        }

        // =================================================
        // DEFINE O DESTINO CONFORME O PERFIL
        // =================================================

        if (tipo === "ADMIN_ERP") {
            sessionStorage.setItem("ERP_USUARIO", JSON.stringify(usuario));
            sessionStorage.setItem("ERP_EMPRESA", JSON.stringify(empresa));

            window.location.replace("dashboard.html");
            return;
        }

        if (tipo === "PDV" || tipo === "OPERADOR" || tipo === "SUPERVISOR") {
            if (!usuario.pdv_id) {
                await supabaseClient.auth.signOut();
                sairParaLogin();

                throw new Error(
                    "Este usuário não está vinculado a um caixa. " +
                    "Solicite ao administrador do ERP que confira o cadastro."
                );
            }

            sessionStorage.setItem("ERP_USUARIO", JSON.stringify(usuario));
            sessionStorage.setItem("ERP_EMPRESA", JSON.stringify(empresa));

            window.location.replace("PDV/login.html");
            return;
        }

        await supabaseClient.auth.signOut();
        sairParaLogin();

        throw new Error(
            "Perfil sem permissão de acesso. Tipo identificado: " +
            (usuario.tipo || "não informado")
        );
    }

    // =================================================
    // TRADUZ ERROS DE AUTENTICAÇÃO
    // =================================================

    function traduzirErroLogin(error) {
        const mensagem = String(error?.message || "").toLowerCase();

        if (mensagem.includes("invalid login credentials")) {
            return "E-mail ou senha incorretos.";
        }

        if (mensagem.includes("email not confirmed")) {
            return "Este e-mail ainda não foi confirmado.";
        }

        if (mensagem.includes("too many requests")) {
            return "Muitas tentativas. Aguarde e tente novamente.";
        }

        if (mensagem.includes("jwt expired")) {
            return "Sua sessão expirou. Entre novamente.";
        }

        return error?.message || "Não foi possível realizar o login.";
    }
});