document.addEventListener(
"DOMContentLoaded",
iniciarLoginAdmin
);

/* =========================================================
INICIALIZAÇÃO
========================================================= */

async function iniciarLoginAdmin() {

const form =
    document.getElementById(
        "adminLoginForm"
    );

const emailInput =
    document.getElementById(
        "adminEmail"
    );

const passwordInput =
    document.getElementById(
        "adminPassword"
    );

const button =
    document.getElementById(
        "adminLoginButton"
    );

const message =
    document.getElementById(
        "adminLoginMessage"
    );


/* =====================================================
   VERIFICA SESSÃO EXISTENTE
   ===================================================== */

try {

    const {
        data: {
            session
        }
    } =
        await supabaseClient.auth.getSession();


    if (session?.user) {

        const administrador =
            await verificarAdministrador(
                session.user.id
            );


        if (administrador) {

            window.location.href =
                "admin.html";

            return;

        }

    }

} catch (error) {

    console.error(
        "Erro ao verificar sessão administrativa:",
        error
    );

}


/* =====================================================
   LOGIN
   ===================================================== */

form.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        limparMensagem();


        const email =
            emailInput.value
                .trim()
                .toLowerCase();


        const senha =
            passwordInput.value;


        if (!email) {

            mostrarMensagem(
                "Informe o e-mail.",
                "error"
            );

            return;
        }


        if (!senha) {

            mostrarMensagem(
                "Informe a senha.",
                "error"
            );

            return;
        }


        button.disabled = true;

        button.textContent =
            "Entrando...";


        try {

            /* =========================================
               AUTENTICAÇÃO
               ========================================= */

            const {
                data,
                error
            } =
                await supabaseClient.auth.signInWithPassword({

                    email,

                    password:
                        senha

                });


            if (error) {

                console.error(
                    "Erro Auth:",
                    error
                );

                throw new Error(
                    traduzirErroLogin(
                        error
                    )
                );

            }


            if (!data?.user) {

                throw new Error(
                    "Não foi possível identificar o usuário."
                );

            }


            /* =========================================
               VERIFICA ADMINISTRADOR GERAL
               ========================================= */

            const administrador =
                await verificarAdministrador(
                    data.user.id
                );


            if (!administrador) {

                await supabaseClient.auth.signOut();

                throw new Error(
                    "Este usuário não possui acesso à Administração Geral."
                );

            }


            /* =========================================
               SUCESSO
               ========================================= */

            mostrarMensagem(
                "Acesso autorizado. Abrindo administração...",
                "success"
            );


            button.textContent =
                "Acesso autorizado";


            setTimeout(() => {

                window.location.href =
                    "admin.html";

            }, 300);


        } catch (error) {

            console.error(
                "Erro no login administrativo:",
                error
            );


            mostrarMensagem(
                error?.message ||
                "Não foi possível realizar o login.",
                "error"
            );


            button.disabled = false;

            button.textContent =
                "Entrar na administração";

        }

    }
);


/* =====================================================
   VERIFICAR ADMINISTRADOR
   ===================================================== */

async function verificarAdministrador(
    authUserId
) {

    if (!authUserId) {
        return null;
    }


    const {
        data: administrador,
        error
    } =
        await supabaseClient
            .from(
                "erp_administradores_gerais"
            )
            .select(
                "id, auth_user_id, nome, email, ativo"
            )
            .eq(
                "auth_user_id",
                authUserId
            )
            .eq(
                "ativo",
                true
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Erro ao consultar Administrador Geral:",
            error
        );

        throw new Error(
            "Não foi possível verificar as permissões administrativas."
        );

    }


    return administrador || null;

}


/* =====================================================
   MENSAGEM
   ===================================================== */

function mostrarMensagem(
    texto,
    tipo
) {

    message.textContent =
        texto;

    message.className =
        `admin-login-message ${tipo}`;

}


function limparMensagem() {

    message.textContent = "";

    message.className =
        "admin-login-message";

}


/* =====================================================
   TRADUZIR ERROS
   ===================================================== */

function traduzirErroLogin(
    error
) {

    const mensagem =
        String(
            error?.message || ""
        ).toLowerCase();


    if (
        mensagem.includes(
            "invalid login credentials"
        )
    ) {

        return "E-mail ou senha incorretos.";

    }


    if (
        mensagem.includes(
            "email not confirmed"
        )
    ) {

        return "Este e-mail ainda não foi confirmado.";

    }


    if (
        mensagem.includes(
            "too many requests"
        )
    ) {

        return "Muitas tentativas. Aguarde alguns instantes e tente novamente.";

    }


    if (
        mensagem.includes(
            "jwt expired"
        )
    ) {

        return "Sua sessão expirou. Tente novamente.";

    }


    return (
        error?.message ||
        "Não foi possível realizar o login."
    );

}

}