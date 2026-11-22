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

/* =========================================================
ELEMENTOS
========================================================= */

const formLoginPDV =
document.getElementById("formLoginPDV");

const emailInput =
document.getElementById("email");

const senhaInput =
document.getElementById("senha");

const btnEntrar =
document.getElementById("btnEntrar");

const textoBotao =
document.getElementById("textoBotao");

const btnMostrarSenha =
document.getElementById("btnMostrarSenha");

const mensagemLogin =
document.getElementById("mensagemLogin");

/* =========================================================
MENSAGENS
========================================================= */

function mostrarMensagem(texto) {

mensagemLogin.textContent = texto;

mensagemLogin.hidden = false;

}

function esconderMensagem() {

mensagemLogin.textContent = "";

mensagemLogin.hidden = true;

}

/* =========================================================
MOSTRAR / OCULTAR SENHA
========================================================= */

btnMostrarSenha.addEventListener("click", () => {

const mostrando =
    senhaInput.type === "text";

senhaInput.type =
    mostrando ? "password" : "text";

btnMostrarSenha.textContent =
    mostrando ? "◉" : "◌";

});

/* =========================================================
LOGIN PDV
========================================================= */

formLoginPDV.addEventListener("submit", async (event) => {

event.preventDefault();

esconderMensagem();

const email =
    emailInput.value.trim();

const senha =
    senhaInput.value;


if (!email || !senha) {

    mostrarMensagem(
        "Informe o e-mail e a senha para continuar."
    );

    return;
}


btnEntrar.disabled = true;

textoBotao.textContent =
    "Entrando...";


try {

    /* -------------------------------------------------
       1. LOGIN NO SUPABASE AUTH
       ------------------------------------------------- */

    const { data: authData, error: authError } =
        await supabaseClient.auth.signInWithPassword({
            email: email,
            password: senha
        });


    if (authError) {

        console.error(
            "Erro no login:",
            authError
        );

        throw new Error(
            "E-mail ou senha incorretos."
        );

    }


    const usuarioAuth =
        authData.user;


    if (!usuarioAuth) {

        throw new Error(
            "Não foi possível identificar o usuário."
        );

    }


    /* -------------------------------------------------
       2. BUSCAR USUÁRIO DO ERP
       ------------------------------------------------- */

    const {
        data: usuarioERP,
        error: usuarioError
    } = await supabaseClient
        .from("erp_usuarios")
        .select("*")
        .eq("auth_user_id", usuarioAuth.id)
        .maybeSingle();


    if (usuarioError) {

        console.error(
            "Erro ao consultar erp_usuarios:",
            usuarioError
        );

        throw new Error(
            "Não foi possível validar o usuário do PDV."
        );

    }


    if (!usuarioERP) {

        await supabaseClient.auth.signOut();

        throw new Error(
            "Este usuário não possui cadastro no ERP."
        );

    }


    /* -------------------------------------------------
       3. CONFIRMAR TIPO PDV
       ------------------------------------------------- */

    if (
        String(usuarioERP.tipo).toUpperCase() !==
        "PDV"
    ) {

        await supabaseClient.auth.signOut();

        throw new Error(
            "Este acesso não pertence a um usuário de PDV."
        );

    }


    /* -------------------------------------------------
       4. VALIDAR PDV
       ------------------------------------------------- */

    if (!usuarioERP.pdv_id) {

        await supabaseClient.auth.signOut();

        throw new Error(
            "Este usuário ainda não está vinculado a um PDV."
        );

    }


    /* -------------------------------------------------
       5. VALIDAR EMPRESA
       ------------------------------------------------- */

    if (!usuarioERP.empresa_id) {

        await supabaseClient.auth.signOut();

        throw new Error(
            "Este PDV não possui empresa vinculada."
        );

    }


    /* -------------------------------------------------
       6. VERIFICAR STATUS DO USUÁRIO
       ------------------------------------------------- */

    if (usuarioERP.ativo === false) {

        await supabaseClient.auth.signOut();

        throw new Error(
            "Este usuário de PDV está bloqueado."
        );

    }


    /* -------------------------------------------------
       7. BUSCAR O PDV
       ------------------------------------------------- */

    const {
        data: pdv,
        error: pdvError
    } = await supabaseClient
        .from("erp_pdvs")
        .select("*")
        .eq("id", usuarioERP.pdv_id)
        .eq("empresa_id", usuarioERP.empresa_id)
        .maybeSingle();


    if (pdvError) {

        console.error(
            "Erro ao consultar PDV:",
            pdvError
        );

        throw new Error(
            "Não foi possível validar o cadastro deste PDV."
        );

    }


    if (!pdv) {

        await supabaseClient.auth.signOut();

        throw new Error(
            "O PDV vinculado não foi encontrado."
        );

    }


    /* -------------------------------------------------
       8. VERIFICAR STATUS DO PDV
       ------------------------------------------------- */

    if (pdv.ativo === false) {

        await supabaseClient.auth.signOut();

        throw new Error(
            "Este PDV está bloqueado."
        );

    }


    /* -------------------------------------------------
       9. SALVAR DADOS DA SESSÃO DO PDV
       ------------------------------------------------- */

    sessionStorage.setItem(
        "RIVER_PDV_USUARIO",
        JSON.stringify(usuarioERP)
    );

    sessionStorage.setItem(
        "RIVER_PDV_DADOS",
        JSON.stringify(pdv)
    );

    sessionStorage.setItem(
        "RIVER_PDV_EMPRESA_ID",
        String(usuarioERP.empresa_id)
    );

    sessionStorage.setItem(
        "RIVER_PDV_ID",
        String(usuarioERP.pdv_id)
    );


    /* -------------------------------------------------
       10. TESTE DE ACESSO
       ------------------------------------------------- */

    console.log(
        "LOGIN PDV AUTORIZADO"
    );

    console.log(
        "Usuário:",
        usuarioERP
    );

    console.log(
        "PDV:",
        pdv
    );


    mostrarMensagem(
    `Acesso autorizado. PDV ${pdv.id} carregado.`
);

textoBotao.textContent =
    "Acesso autorizado";

setTimeout(() => {

    window.location.href = "painel.html";

}, 500);


    /*
       AQUI, NO PRÓXIMO PASSO,
       VAMOS REDIRECIONAR PARA:

       painel.html

       Ainda não vamos fazer isso agora,
       pois primeiro precisamos confirmar
       que a autenticação está funcionando.
    */


} catch (error) {

    console.error(error);

    mostrarMensagem(
        error.message ||
        "Não foi possível entrar no PDV."
    );

    btnEntrar.disabled = false;

    textoBotao.textContent =
        "Entrar no PDV";

}

});