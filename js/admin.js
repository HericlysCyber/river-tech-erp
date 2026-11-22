let adminAtual = null;
let empresas = [];

document.addEventListener("DOMContentLoaded", iniciarAdmin);


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

async function iniciarAdmin() {

    const {
        data: { session },
        error
    } = await supabaseClient.auth.getSession();

    if (error || !session) {

        window.location.href = "index.html";

        return;
    }


    const { data: admin, error: adminError } =
        await supabaseClient
            .from("erp_administradores_gerais")
            .select("id, nome, email, ativo")
            .eq("auth_user_id", session.user.id)
            .eq("ativo", true)
            .maybeSingle();


    if (adminError || !admin) {

        await supabaseClient.auth.signOut();

        window.location.href = "index.html";

        return;
    }


    adminAtual = admin;


    document.getElementById("adminName").textContent =
        admin.nome || "Administrador";

    configurarPerfilAdmin(session.user.id, admin);

    configurarMenu();

    configurarModal();

    configurarLogo();
    configurarConfiguracoesAdmin();

    await carregarDados();

    iniciarBusca();

}


function configurarPerfilAdmin(authUserId, admin) {
    const $ = id => document.getElementById(id);
    const key = `RIVER_ADMIN_PERFIL_${authUserId}`;
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(key) || "{}"); } catch (_) {}
    let photo = saved.foto || "";
    const avatar = $("adminAvatar");
    const nameEl = $("adminName");
    const apply = () => {
        const name = saved.nome || admin.nome || "Administrador";
        if (nameEl) nameEl.textContent = name;
        if (avatar) {
            avatar.innerHTML = "";
            if (photo) { const img = document.createElement("img"); img.src = photo; img.alt = "Foto do administrador"; avatar.appendChild(img); }
            else avatar.textContent = (name.trim()[0] || "A").toUpperCase();
        }
    };
    const modal = $("adminProfileModal");
    const form = $("adminProfileForm");
    const preview = $("adminProfilePhotoPreview");
    const status = $("adminProfileStatus");
    const open = () => {
        $("adminProfileDisplayName").value = saved.nome || admin.nome || "";
        $("adminProfilePhone").value = saved.telefone || "";
        $("adminProfileEmail").value = saved.email || admin.email || "";
        preview.src = photo; preview.hidden = !photo; status.textContent = ""; modal.hidden = false;
    };
    const close = () => { modal.hidden = true; };
    $("adminProfileButton")?.addEventListener("click", open);
    $("adminProfileButton")?.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    $("adminProfileClose")?.addEventListener("click", close);
    $("adminProfileCancel")?.addEventListener("click", close);
    $("adminProfilePhoto")?.addEventListener("change", () => {
        const file = $("adminProfilePhoto").files?.[0]; if (!file) return;
        if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 2*1024*1024) { $("adminProfilePhoto").value = ""; status.textContent = "Use uma imagem PNG/JPG de até 2 MB."; return; }
        const reader = new FileReader(); reader.onload = () => { photo = String(reader.result || ""); preview.src = photo; preview.hidden = !photo; }; reader.readAsDataURL(file);
    });
    form?.addEventListener("submit", e => {
        e.preventDefault();
        saved = { nome: $("adminProfileDisplayName").value.trim() || admin.nome, telefone: $("adminProfilePhone").value.trim(), email: $("adminProfileEmail").value.trim(), foto: photo };
        try { localStorage.setItem(key, JSON.stringify(saved)); apply(); status.textContent = "Perfil salvo neste dispositivo."; status.style.color = "#087443"; setTimeout(close, 700); }
        catch (_) { status.textContent = "Não foi possível salvar. Escolha uma imagem menor."; }
    });
    apply();
}


/* =========================================================
   CONFIGURAÇÕES DO ADMINISTRADOR GERAL
   ========================================================= */
function configurarConfiguracoesAdmin() {
    const select = document.getElementById("agEmpresaSelect");
    if (!select) return;
    select.addEventListener("change", carregarConfiguracaoEmpresaSelecionada);
    document.getElementById("agSalvarModulos")?.addEventListener("click", salvarModulosEmpresa);
    document.getElementById("agAlternarBloqueio")?.addEventListener("click", alternarBloqueioEmpresa);
    document.getElementById("agSalvarContrato")?.addEventListener("click", salvarContratoEmpresa);
    document.getElementById("agRedefinirSenha")?.addEventListener("click", enviarRedefinicaoSenhaEmpresa);
}
function mensagemConfigAdmin(msg, ok=false) {
    const el=document.getElementById("agConfigStatus");
    if(el){el.textContent=msg;el.style.color=ok?"#087443":"#b42318";}
}
async function carregarConfiguracaoEmpresaSelecionada() {
    const select=document.getElementById("agEmpresaSelect"), id=select?.value;
    const area=document.getElementById("agModuloArea"), resumo=document.getElementById("agEmpresaResumo");
    if(!id){area.hidden=true;resumo.textContent="Selecione uma empresa para começar.";return;}
    const empresa=empresas.find(e=>String(e.id)===String(id));
    if(!empresa){mensagemConfigAdmin("Empresa não encontrada na lista carregada.");return;}
    area.hidden=false;
    resumo.innerHTML=`<strong>${escapar(empresa.nome||"Empresa")}</strong><br>E-mail: ${escapar(empresa.email||"Não informado")}<br>Plano: ${escapar(empresa.plano||"Não definido")}<br>Limite de PDVs: ${escapar(empresa.limite_pdvs??0)}<br>Situação: ${empresa.bloqueado?"Bloqueada manualmente":empresa.ativo?"Ativa":"Inativa"}<br>Contrato (campos cadastrados): ${escapar(empresa.data_inicio||empresa.data_inicio_contrato||"—")} até ${escapar(empresa.data_fim||empresa.data_fim_contrato||"—")}<br>Observações: ${escapar(empresa.observacoes||empresa.observacao||"Nenhuma")}`;
    const setValue=(id,value)=>{const el=document.getElementById(id);if(el)el.value=value??"";};
    setValue("agPlano",String(empresa.plano||"BASICO").toUpperCase());
    setValue("agLimitePdvs",empresa.limite_pdvs??1);
    setValue("agContratoInicio",empresa.data_inicio_contrato||empresa.data_inicio||"");
    setValue("agContratoFim",empresa.data_fim_contrato||empresa.data_fim||"");
    mensagemConfigAdmin("");
    const {data,error}=await supabaseClient.from("erp_empresa_modulos_admin").select("modulo_codigo,liberado").eq("empresa_id",id);
    if(error){mensagemConfigAdmin("Execute a migração SQL de configurações administrativas incluída no ZIP. Detalhe: "+error.message);return;}
    const map=new Map((data||[]).map(x=>[String(x.modulo_codigo).toUpperCase(),x.liberado===true]));
    document.querySelectorAll("[data-modulo]").forEach(input=>{input.checked=map.has(input.dataset.modulo)?map.get(input.dataset.modulo):true;});
    const {data:pdvs,error:pdvErr}=await supabaseClient.from("erp_pdvs").select("id,nome,ativo,bloqueado").eq("empresa_id",id);
    const box=document.getElementById("agPdvsLista");
    if(pdvErr) box.textContent="Não foi possível consultar os PDVs: "+pdvErr.message;
    else if(!pdvs?.length) box.textContent="Nenhum PDV cadastrado para esta empresa.";
    else box.innerHTML=pdvs.map(p=>`<div style="display:flex;gap:12px;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0"><span><strong>${escapar(p.nome||("PDV "+p.id))}</strong> — ${p.bloqueado?"Bloqueado":p.ativo===false?"Inativo":"Ativo"}</span><button type="button" class="secondary-button" data-toggle-pdv="${escapar(p.id)}" data-blocked="${p.bloqueado===true}">${p.bloqueado?"Desbloquear":"Bloquear"}</button></div>`).join("");
    box.querySelectorAll("[data-toggle-pdv]").forEach(btn=>btn.addEventListener("click",()=>alternarBloqueioPDV(btn.dataset.togglePdv,btn.dataset.blocked==="true")));
}
async function salvarContratoEmpresa(){
    const id=document.getElementById("agEmpresaSelect")?.value;
    if(!id){mensagemConfigAdmin("Selecione uma empresa.");return;}
    const plano=document.getElementById("agPlano").value;
    const limite=Number(document.getElementById("agLimitePdvs").value);
    const inicio=document.getElementById("agContratoInicio").value||null;
    const fim=document.getElementById("agContratoFim").value||null;
    if(!Number.isInteger(limite)||limite<1){mensagemConfigAdmin("O limite de PDVs deve ser um número inteiro maior que zero.");return;}
    if(inicio&&fim&&fim<inicio){mensagemConfigAdmin("A data final não pode ser anterior à inicial.");return;}
    const {error}=await supabaseClient.from("erp_empresas").update({plano,limite_pdvs:limite,data_inicio_contrato:inicio,data_fim_contrato:fim}).eq("id",id);
    if(error){mensagemConfigAdmin("Não foi possível salvar plano/contrato: "+error.message);return;}
    mensagemConfigAdmin("Plano, limite e datas salvos. A aplicação automática do vencimento precisa ser validada no controle de acesso.",true);
    await carregarDados();await carregarConfiguracaoEmpresaSelecionada();
}
async function alternarBloqueioPDV(pdvId,jaBloqueado){
    if(!confirm(`${jaBloqueado?"Desbloquear":"Bloquear"} este PDV?`))return;
    const {error}=await supabaseClient.from("erp_pdvs").update({bloqueado:!jaBloqueado}).eq("id",pdvId);
    if(error){mensagemConfigAdmin("Não foi possível alterar o PDV: "+error.message);return;}
    mensagemConfigAdmin(jaBloqueado?"PDV desbloqueado.":"PDV bloqueado.",true);
    await carregarConfiguracaoEmpresaSelecionada();
}
async function enviarRedefinicaoSenhaEmpresa(){
    const id=document.getElementById("agEmpresaSelect")?.value;
    const empresa=empresas.find(e=>String(e.id)===String(id));
    if(!empresa){mensagemConfigAdmin("Selecione uma empresa.");return;}
    const email=empresa.email||empresa.email_admin||empresa.email_administrador;
    if(!email){mensagemConfigAdmin("O cadastro da empresa não contém um e-mail de acesso conhecido.");return;}
    if(!confirm(`Enviar instruções de redefinição de senha para ${email}?`))return;
    const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname.replace(/admin\.html$/,"index.html")});
    if(error){mensagemConfigAdmin("Não foi possível enviar a redefinição: "+error.message);return;}
    mensagemConfigAdmin("Solicitação de redefinição enviada para "+email+". Confira também o modelo de e-mail e a URL de redirecionamento no Supabase.",true);
}
async function salvarModulosEmpresa(){
    const id=document.getElementById("agEmpresaSelect")?.value;
    if(!id){mensagemConfigAdmin("Selecione uma empresa.");return;}
    const checks=[...document.querySelectorAll("[data-modulo]")];
    const rows=checks.map(c=>({empresa_id:id,modulo_codigo:c.dataset.modulo,liberado:c.checked,updated_at:new Date().toISOString(),updated_by:adminAtual?.id||null}));
    const {error}=await supabaseClient.from("erp_empresa_modulos_admin").upsert(rows,{onConflict:"empresa_id,modulo_codigo"});
    if(error){mensagemConfigAdmin("Não foi possível salvar: "+error.message);return;}
    mensagemConfigAdmin("Permissões registradas. A aplicação efetiva nos módulos depende da verificação dessas permissões em cada página e operação do banco.",true);
}
async function alternarBloqueioEmpresa(){
    const id=document.getElementById("agEmpresaSelect")?.value;
    const empresa=empresas.find(e=>String(e.id)===String(id));
    if(!empresa){mensagemConfigAdmin("Selecione uma empresa.");return;}
    const novo=empresa.bloqueado!==true;
    if(!confirm(`${novo?"Bloquear":"Desbloquear"} a empresa ${empresa.nome||"selecionada"}?`))return;
    const {error}=await supabaseClient.from("erp_empresas").update({bloqueado:novo}).eq("id",id);
    if(error){mensagemConfigAdmin("Não foi possível alterar o bloqueio: "+error.message);return;}
    mensagemConfigAdmin(novo?"Empresa bloqueada.":"Bloqueio manual removido. Verifique a vigência contratual antes de liberar o acesso.",true);
    await carregarDados(); popularSelectEmpresasConfig(); await carregarConfiguracaoEmpresaSelecionada();
}
function popularSelectEmpresasConfig(){
    const select=document.getElementById("agEmpresaSelect");if(!select)return;
    const old=select.value;select.innerHTML='<option value="">Selecione uma empresa...</option>'+empresas.map(e=>`<option value="${escapar(e.id)}">${escapar(e.nome||e.id)}</option>`).join("");
    if(empresas.some(e=>String(e.id)===String(old)))select.value=old;
}

/* =========================================================
   MENU
   ========================================================= */

function configurarMenu() {

    const menuItems =
        document.querySelectorAll(".menu-item");


    menuItems.forEach(item => {

        item.addEventListener("click", () => {

            const section =
                item.dataset.section;

            abrirSecao(section);

        });

    });


    document
        .querySelectorAll("[data-open]")
        .forEach(button => {

            button.addEventListener("click", () => {

                abrirSecao(button.dataset.open);

            });

        });

}


function abrirSecao(nome) {

    document
        .querySelectorAll(".menu-item")
        .forEach(item => {

            item.classList.toggle(
                "active",
                item.dataset.section === nome
            );

        });


    document
        .querySelectorAll(".page-section")
        .forEach(section => {

            section.classList.toggle(
                "active",
                section.id === `section-${nome}`
            );

        });


    const titulos = {

        dashboard:
            "Dashboard",

        empresas:
            "Empresas",

        planos:
            "Planos",

        configuracoes:
            "Configurações"

    };


    document.getElementById("pageTitle").textContent =
        titulos[nome] || "Dashboard";

}


/* =========================================================
   MODAL
   ========================================================= */

function configurarModal() {

    const modal =
        document.getElementById("companyModal");


    const openButton =
        document.getElementById("newCompanyButton");


    const closeButton =
        document.getElementById("closeModal");


    const cancelButton =
        document.getElementById("cancelCompany");


    openButton.addEventListener(
        "click",
        () => abrirModal()
    );


    closeButton.addEventListener(
        "click",
        () => fecharModal()
    );


    cancelButton.addEventListener(
        "click",
        () => fecharModal()
    );


    modal.addEventListener("click", event => {

        if (event.target === modal) {

            fecharModal();

        }

    });


    document
        .getElementById("companyForm")
        .addEventListener(
            "submit",
            cadastrarEmpresa
        );


    document
        .getElementById("logoutButton")
        .addEventListener(
            "click",
            sair
        );

}


function abrirModal() {

    document
        .getElementById("companyModal")
        .classList.add("active");

}


function fecharModal() {

    document
        .getElementById("companyModal")
        .classList.remove("active");


    document
        .getElementById("companyForm")
        .reset();


    document.getElementById(
        "companyLimitePdvs"
    ).value = 1;


    document.getElementById(
        "companyMessage"
    ).textContent = "";


    limparLogo();

}


/* =========================================================
   LOGO
   ========================================================= */

function configurarLogo() {

    const input =
        document.getElementById("companyLogo");


    if (!input) {
        return;
    }


    input.addEventListener(
        "change",
        visualizarLogoSelecionada
    );

}


function visualizarLogoSelecionada(event) {

    const input = event.target;

    const preview =
        document.getElementById("companyLogoImage");

    const placeholder =
        document.getElementById(
            "companyLogoPlaceholder"
        );

    const name =
        document.getElementById(
            "companyLogoName"
        );


    const arquivo =
        input.files?.[0];


    if (!arquivo) {

        limparLogo();

        return;
    }


    const tiposPermitidos = [
        "image/png",
        "image/jpeg",
        "image/webp"
    ];


    if (!tiposPermitidos.includes(arquivo.type)) {

        input.value = "";

        name.textContent =
            "Formato não permitido.";

        preview.src = "";

        preview.style.display = "none";

        placeholder.style.display =
            "block";

        return;
    }


    const tamanhoMaximo =
        5 * 1024 * 1024;


    if (arquivo.size > tamanhoMaximo) {

        input.value = "";

        name.textContent =
            "A imagem deve possuir no máximo 5 MB.";

        preview.src = "";

        preview.style.display = "none";

        placeholder.style.display =
            "block";

        return;
    }


    name.textContent =
        arquivo.name;


    const reader =
        new FileReader();


    reader.onload = function () {

        preview.src =
            reader.result;

        preview.style.display =
            "block";

        placeholder.style.display =
            "none";

    };


    reader.readAsDataURL(arquivo);

}


function limparLogo() {

    const input =
        document.getElementById(
            "companyLogo"
        );


    const preview =
        document.getElementById(
            "companyLogoImage"
        );


    const placeholder =
        document.getElementById(
            "companyLogoPlaceholder"
        );


    const name =
        document.getElementById(
            "companyLogoName"
        );


    if (input) {
        input.value = "";
    }


    if (preview) {

        preview.src = "";

        preview.style.display =
            "none";
    }


    if (placeholder) {

        placeholder.style.display =
            "block";
    }


    if (name) {

        name.textContent =
            "Nenhuma imagem selecionada";
    }

}


/* =========================================================
   UPLOAD DA LOGO
   ========================================================= */

async function enviarLogoEmpresa(
    empresaId,
    arquivo
) {

    if (!empresaId || !arquivo) {
        return null;
    }


    const extensao =
        obterExtensaoArquivo(arquivo);


    const caminho =
        `${empresaId}/logo.${extensao}`;


    /*
     * O mesmo caminho é utilizado para a empresa.
     * Assim, futuramente podemos substituir a logo
     * sem criar dezenas de arquivos abandonados.
     */

    const {
        error: uploadError
    } =
        await supabaseClient.storage
            .from("erp-logos")
            .upload(
                caminho,
                arquivo,
                {
                    cacheControl: "3600",
                    upsert: true,
                    contentType: arquivo.type
                }
            );


    if (uploadError) {

        console.error(
            "Erro ao enviar logo:",
            uploadError
        );

        throw new Error(
            `Não foi possível enviar a logo: ${uploadError.message}`
        );
    }


    const {
        data: publicData
    } =
        supabaseClient.storage
            .from("erp-logos")
            .getPublicUrl(caminho);


    const logoUrl =
        publicData?.publicUrl;


    if (!logoUrl) {

        throw new Error(
            "A logo foi enviada, mas não foi possível obter a URL pública."
        );
    }


    const {
    data: logoAtualizada,
    error: updateError
} =
    await supabaseClient.rpc(
        "erp_atualizar_logo_empresa",
        {
            p_empresa_id: empresaId,
            p_logo_url: logoUrl
        }
    );


if (updateError) {

    console.error(
        "Erro ao salvar URL da logo:",
        updateError
    );

    throw new Error(
        `A logo foi enviada, mas não foi possível vinculá-la à empresa: ${updateError.message}`
    );
}


if (logoAtualizada !== true) {

    throw new Error(
        "A logo foi enviada, mas o banco não confirmou a vinculação à empresa."
    );
}


    if (updateError) {

        console.error(
            "Erro ao salvar URL da logo:",
            updateError
        );

        throw new Error(
            `A logo foi enviada, mas não foi possível vinculá-la à empresa: ${updateError.message}`
        );
    }


    return logoUrl;

}


function obterExtensaoArquivo(arquivo) {

    const mapa = {

        "image/png":
            "png",

        "image/jpeg":
            "jpg",

        "image/webp":
            "webp"

    };


    return mapa[arquivo.type] || "png";

}


/* =========================================================
   DADOS
   ========================================================= */

async function carregarDados() {

    await carregarEmpresas();

    await carregarPdvs();

    await carregarModulos();

}


async function carregarEmpresas() {

    const { data, error } =
        await supabaseClient
            .from("erp_empresas")
            .select("*")
            .order("created_at", {
                ascending: false
            });


    if (error) {

        console.error(
            "Erro empresas:",
            error
        );

        return;
    }


    empresas = data || [];
    popularSelectEmpresasConfig();

    atualizarEstatisticas();

    renderizarEmpresas();

}


async function carregarPdvs() {

    const { count, error } =
        await supabaseClient
            .from("erp_pdvs")
            .select("*", {
                count: "exact",
                head: true
            });


    if (error) {

        console.error(
            "Erro PDVs:",
            error
        );

        return;
    }


    const total = count || 0;


    document.getElementById(
        "totalPdvs"
    ).textContent = total;


    document.getElementById(
        "structurePdvs"
    ).textContent = total;

}


async function carregarModulos() {

    const { count, error } =
        await supabaseClient
            .from("erp_modulos")
            .select("*", {
                count: "exact",
                head: true
            });


    if (error) {

        console.error(
            "Erro módulos:",
            error
        );

        return;
    }


    const total = count || 0;


    document.getElementById(
        "structureModulos"
    ).textContent = total;

}


/* =========================================================
   ESTATÍSTICAS
   ========================================================= */

function atualizarEstatisticas() {

    const total =
        empresas.length;


    const ativas =
        empresas.filter(
            empresa =>
                empresa.ativo === true
        ).length;


    const bloqueadas =
        empresas.filter(
            empresa =>
                empresa.bloqueado === true
        ).length;


    document.getElementById(
        "totalEmpresas"
    ).textContent = total;


    document.getElementById(
        "empresasAtivas"
    ).textContent = ativas;


    document.getElementById(
        "empresasBloqueadas"
    ).textContent = bloqueadas;


    document.getElementById(
        "structureEmpresas"
    ).textContent = total;


    renderizarRecentes();

}


/* =========================================================
   EMPRESAS RECENTES
   ========================================================= */

function renderizarRecentes() {

    const container =
        document.getElementById(
            "recentCompanies"
        );


    const recentes =
        empresas.slice(0, 5);


    if (!recentes.length) {

        container.innerHTML =
            `<div class="empty-state">
                Nenhuma empresa cadastrada ainda.
            </div>`;

        return;
    }


    container.innerHTML =
        recentes.map(empresa => {

            const status =
                empresa.bloqueado
                    ? "Bloqueada"
                    : empresa.ativo
                        ? "Ativa"
                        : "Inativa";


            return `
                <div style="
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    padding:15px 20px;
                    border-bottom:1px solid #f0f2f5;
                ">

                    <div>

                        <strong style="
                            display:block;
                            font-size:12px;
                        ">
                            ${escapar(empresa.nome)}
                        </strong>

                        <span style="
                            display:block;
                            margin-top:4px;
                            color:#9ca3af;
                            font-size:10px;
                        ">
                            ${escapar(
                                empresa.plano || "Sem plano"
                            )}
                        </span>

                    </div>

                    <span style="
                        font-size:10px;
                        font-weight:700;
                        color:${empresa.bloqueado
                            ? "#dc2626"
                            : "#16a34a"};
                    ">
                        ${status}
                    </span>

                </div>
            `;

        }).join("");

}


/* =========================================================
   TABELA DE EMPRESAS
   ========================================================= */

function renderizarEmpresas(lista = empresas) {

    const tbody =
        document.getElementById(
            "companiesTable"
        );


    if (!lista.length) {

        tbody.innerHTML = `
            <tr>

                <td
                    colspan="5"
                    class="empty-table"
                >
                    Nenhuma empresa encontrada.
                </td>

            </tr>
        `;

        return;
    }


    tbody.innerHTML =
        lista.map(empresa => {

            const status =
                empresa.bloqueado

                    ? `<span style="
                        color:#dc2626;
                        font-weight:700;
                    ">
                        Bloqueada
                    </span>`

                    : empresa.ativo

                        ? `<span style="
                            color:#16a34a;
                            font-weight:700;
                        ">
                            Ativa
                        </span>`

                        : `<span style="
                            color:#64748b;
                            font-weight:700;
                        ">
                            Inativa
                        </span>`;


            return `
                <tr>

                    <td>
                        <strong>
                            ${escapar(empresa.nome)}
                        </strong>
                    </td>

                    <td>
                        ${escapar(
                            empresa.plano || "—"
                        )}
                    </td>

                    <td>
                        ${empresa.limite_pdvs || 0}
                    </td>

                    <td>
                        ${status}
                    </td>

                    <td>

                        <button
                            style="
                                border:0;
                                background:#1266d6;
                                color:#ffffff;
                                padding:8px 12px;
                                border-radius:7px;
                                font-size:11px;
                                font-weight:700;
                                cursor:pointer;
                            "
                            onclick="mostrarDetalhesEmpresa('${empresa.id}')"
                        >
                            Gerenciar
                        </button>

                    </td>

                </tr>
            `;

        }).join("");

}


function mostrarDetalhesEmpresa(empresaId) {
    const empresa = empresas.find(item => String(item.id) === String(empresaId));
    if (!empresa) { alert("Empresa não encontrada na lista atual."); return; }
    const observacoes = empresa.observacoes || empresa.observacao || empresa.observacoes_cadastro || "Nenhuma observação registrada no cadastro.";
    const email = empresa.email || empresa.email_contato || "Não informado";
    const telefone = empresa.telefone || "Não informado";
    const endereco = empresa.endereco || "Não informado";
    const status = empresa.bloqueado ? "Bloqueada manualmente" : (empresa.ativo ? "Ativa" : "Inativa");
    alert(
        "DADOS DA EMPRESA\n\n" +
        "Nome: " + (empresa.nome || "—") + "\n" +
        "Nome fantasia: " + (empresa.nome_fantasia || "—") + "\n" +
        "E-mail: " + email + "\n" +
        "Telefone: " + telefone + "\n" +
        "Endereço: " + endereco + "\n" +
        "Plano: " + (empresa.plano || "Não definido") + "\n" +
        "Limite de PDVs: " + (empresa.limite_pdvs ?? 0) + "\n" +
        "Situação: " + status + "\n\n" +
        "OBSERVAÇÕES DO CADASTRO\n" + observacoes
    );
}


/* =========================================================
   BUSCA
   ========================================================= */

function iniciarBusca() {

    document
        .getElementById("companySearch")
        .addEventListener("input", event => {

            const termo =
                event.target.value
                    .toLowerCase()
                    .trim();


            const filtradas =
                empresas.filter(empresa =>

                    (empresa.nome || "")
                        .toLowerCase()
                        .includes(termo)

                    ||

                    (empresa.nome_fantasia || "")
                        .toLowerCase()
                        .includes(termo)

                );


            renderizarEmpresas(filtradas);

        });

}


/* =========================================================
   CADASTRAR EMPRESA
   ========================================================= */

async function cadastrarEmpresa(event) {

    event.preventDefault();


    const message =
        document.getElementById(
            "companyMessage"
        );


    const button =
        document.getElementById(
            "saveCompany"
        );


    /* =========================================
       DADOS DA EMPRESA
       ========================================= */

    const nome =
        document.getElementById(
            "companyNome"
        ).value.trim();


    const fantasia =
        document.getElementById(
            "companyFantasia"
        ).value.trim();


    const documento =
        document.getElementById(
            "companyDocumento"
        ).value.trim();


    const email =
        document.getElementById(
            "companyEmail"
        ).value.trim();


    const telefone =
        document.getElementById(
            "companyTelefone"
        ).value.trim();


    /* =========================================
       LOGO
       ========================================= */

    const logoInput =
        document.getElementById(
            "companyLogo"
        );


    const logoArquivo =
        logoInput?.files?.[0] || null;


    /* =========================================
       ENDEREÇO
       ========================================= */

    const endereco =
        document.getElementById(
            "companyEndereco"
        ).value.trim();


    const numero =
        document.getElementById(
            "companyNumero"
        ).value.trim();


    const bairro =
        document.getElementById(
            "companyBairro"
        ).value.trim();


    const cidade =
        document.getElementById(
            "companyCidade"
        ).value.trim();


    const estado =
        document.getElementById(
            "companyEstado"
        ).value;


    const cep =
        document.getElementById(
            "companyCep"
        ).value.trim();


    /* =========================================
       CONTRATO
       ========================================= */

    const plano =
        document.getElementById(
            "companyPlano"
        ).value;


    const limitePdvs =
        Number(
            document.getElementById(
                "companyLimitePdvs"
            ).value
        );


    const inicio =
        document.getElementById(
            "companyInicio"
        ).value || null;


    const fim =
        document.getElementById(
            "companyFim"
        ).value || null;


    const renovacao =
        document.getElementById(
            "companyRenovacao"
        ).checked;


    /* =========================================
       ADMINISTRADOR ERP
       ========================================= */

    const adminErpNome =
        document.getElementById(
            "adminErpNome"
        ).value.trim();


    const adminErpEmail =
        document.getElementById(
            "adminErpEmail"
        ).value.trim()
            .toLowerCase();


    const adminErpSenha =
        document.getElementById(
            "adminErpSenha"
        ).value;


    /* =========================================
       OBSERVAÇÕES
       ========================================= */

    const observacoes =
        document.getElementById(
            "companyObservacoes"
        ).value.trim();


    /* =========================================
       VALIDAÇÕES
       ========================================= */

    if (!nome) {

        mostrarErro(
            message,
            "Informe o nome da empresa."
        );

        return;
    }


    if (!limitePdvs || limitePdvs < 1) {

        mostrarErro(
            message,
            "A quantidade de PDVs deve ser pelo menos 1."
        );

        return;
    }


    if (
        inicio &&
        fim &&
        fim < inicio
    ) {

        mostrarErro(
            message,
            "A data final não pode ser anterior à data inicial."
        );

        return;
    }


    if (!adminErpNome) {

        mostrarErro(
            message,
            "Informe o nome do Administrador ERP."
        );

        return;
    }


    if (!adminErpEmail) {

        mostrarErro(
            message,
            "Informe o e-mail do Administrador ERP."
        );

        return;
    }


    if (!emailValido(adminErpEmail)) {

        mostrarErro(
            message,
            "Informe um e-mail válido para o Administrador ERP."
        );

        return;
    }


    if (adminErpSenha.length < 6) {

        mostrarErro(
            message,
            "A senha inicial do Administrador ERP deve possuir pelo menos 6 caracteres."
        );

        return;
    }


    /* =========================================
       MÓDULOS
       ========================================= */

    const modulos =
        Array.from(
            document.querySelectorAll(
                ".module-option input:checked"
            )
        ).map(input => input.value);


    if (!modulos.includes("PDV")) {

        mostrarErro(
            message,
            "O módulo PDV precisa estar liberado para uma empresa ERP."
        );

        return;
    }


    /* =========================================
       ESTADO DO BOTÃO
       ========================================= */

    button.disabled = true;

    button.textContent =
        "Cadastrando empresa...";

    message.textContent = "";


    try {

        /* =========================================
           1. CRIA EMPRESA
           ========================================= */

        const {
            data: empresaId,
            error
        } =
            await supabaseClient.rpc(
                "erp_criar_empresa",
                {

                    p_nome:
                        nome,

                    p_nome_fantasia:
                        fantasia || null,

                    p_documento:
                        documento || null,

                    p_email:
                        email || null,

                    p_telefone:
                        telefone || null,

                    p_endereco:
                        endereco || null,

                    p_numero:
                        numero || null,

                    p_bairro:
                        bairro || null,

                    p_cidade:
                        cidade || null,

                    p_estado:
                        estado || null,

                    p_cep:
                        cep || null,

                    p_limite_pdvs:
                        limitePdvs,

                    p_plano:
                        plano || null,

                    p_data_inicio:
                        inicio,

                    p_data_fim:
                        fim,

                    p_renovacao_automatica:
                        renovacao,

                    p_observacoes:
                        observacoes || null

                }
            );


        if (error) {
            throw error;
        }


        if (!empresaId) {

            throw new Error(
                "A empresa foi cadastrada, mas o banco não retornou o ID."
            );

        }


        /* =========================================
           2. ENVIA LOGO
           ========================================= */

        if (logoArquivo) {

            button.textContent =
                "Enviando logo...";


            await enviarLogoEmpresa(
                empresaId,
                logoArquivo
            );

        }


        /* =========================================
           3. LIBERA MÓDULOS
           ========================================= */

        button.textContent =
            "Liberando módulos...";


        for (const codigo of modulos) {

            const {
                error: moduloError
            } =
                await supabaseClient.rpc(
                    "erp_liberar_modulo",
                    {

                        p_empresa_id:
                            empresaId,

                        p_modulo_codigo:
                            codigo

                    }
                );


            if (moduloError) {
                throw moduloError;
            }

        }


        /* =========================================
           4. DEFINE LIMITE DE PDVs
           ========================================= */

        button.textContent =
            "Configurando PDVs...";


        const {
            error: limiteError
        } =
            await supabaseClient.rpc(
                "erp_definir_limite_pdvs",
                {

                    p_empresa_id:
                        empresaId,

                    p_limite:
                        limitePdvs

                }
            );


        if (limiteError) {
            throw limiteError;
        }


        /* =========================================
           5. CRIA ADMINISTRADOR ERP
           ========================================= */

        button.textContent =
            "Criando Administrador ERP...";


        /*
         * Garante uma sessão válida antes
         * da chamada da Edge Function.
         */

        const {
            data: {
                session: sessaoAtual
            },
            error: erroSessao
        } =
            await supabaseClient.auth.getSession();


        if (erroSessao) {

            throw new Error(
                "Não foi possível verificar a sessão de administrador."
            );

        }


        if (!sessaoAtual) {

            throw new Error(
                "Sua sessão expirou. Faça login novamente no Administrador Geral."
            );

        }


        const {
            data: {
                session: sessaoRenovada
            },
            error: erroRefresh
        } =
            await supabaseClient.auth.refreshSession();


        if (erroRefresh || !sessaoRenovada) {

            console.error(
                "Erro ao renovar sessão:",
                erroRefresh
            );

            throw new Error(
                "Sua sessão expirou. Faça login novamente no Administrador Geral."
            );

        }


        const {
            data: adminData,
            error: adminFunctionError
        } =
            await supabaseClient.functions.invoke(
                "criar-admin-erp",
                {
                    body: {
                        empresa_id:
                            empresaId,

                        nome:
                            adminErpNome,

                        email:
                            adminErpEmail,

                        senha:
                            adminErpSenha
                    }
                }
            );


        /* =========================================
           TRATAMENTO EDGE FUNCTION
           ========================================= */

        if (adminFunctionError) {

            console.error(
                "Erro completo da Edge Function:",
                adminFunctionError
            );


            let mensagemReal =
                adminFunctionError.message ||
                "Erro desconhecido na Edge Function.";


            try {

                if (
                    adminFunctionError.context &&
                    typeof adminFunctionError.context.json === "function"
                ) {

                    const resposta =
                        await adminFunctionError.context.json();


                    console.error(
                        "Resposta da Edge Function:",
                        resposta
                    );


                    if (resposta?.error) {

                        mensagemReal =
                            resposta.error;

                    }

                }

            } catch (leituraError) {

                console.error(
                    "Não foi possível ler a resposta da Edge Function:",
                    leituraError
                );

            }


            throw new Error(
                `Empresa criada, mas o Administrador ERP não foi criado. ${mensagemReal}`
            );

        }


        if (
            !adminData ||
            adminData.success !== true
        ) {

            throw new Error(
                adminData?.error ||
                "A Edge Function não confirmou a criação do Administrador ERP."
            );

        }


        /* =========================================
           6. ATUALIZA DADOS
           ========================================= */

        button.textContent =
            "Finalizando cadastro...";


        await carregarDados();


        /* =========================================
           7. SUCESSO
           ========================================= */

        message.style.color =
            "#16a34a";


        message.innerHTML = `
            <strong>
                Empresa cadastrada com sucesso!
            </strong>
            <br>
            ${logoArquivo
                ? "Logo enviada, empresa configurada e Administrador ERP criado."
                : "Empresa configurada e Administrador ERP criado."
            }
        `;


        setTimeout(() => {

            fecharModal();

        }, 1800);


    } catch (error) {

        console.error(
            "Erro ao cadastrar empresa:",
            error
        );


        message.style.color =
            "#dc2626";


        message.innerHTML = `
            <strong>
                Não foi possível concluir o cadastro.
            </strong>
            <br>
            ${escapar(
                error?.message ||
                "Ocorreu um erro inesperado."
            )}
        `;


    } finally {

        button.disabled = false;

        button.textContent =
            "Cadastrar empresa";

    }

}


/* =========================================================
   MENSAGEM DE ERRO
   ========================================================= */

function mostrarErro(elemento, mensagem) {

    elemento.style.color =
        "#dc2626";

    elemento.textContent =
        mensagem;

}


/* =========================================================
   VALIDAÇÃO DE E-MAIL
   ========================================================= */

function emailValido(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
    );

}


/* =========================================================
   LOGOUT
   ========================================================= */

async function sair() {

    await supabaseClient.auth.signOut();

    window.location.href =
        "index.html";

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapar(valor) {

    return String(valor ?? "")

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}
