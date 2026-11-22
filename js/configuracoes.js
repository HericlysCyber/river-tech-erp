document.addEventListener("DOMContentLoaded", async () => {
  const $ = id => document.getElementById(id);
  const form = $("formConfig"), status = $("cfgStatus"), save = $("cfgSalvar");
  let empresaId = null;
  const say = (msg, ok=false) => { status.textContent = msg; status.style.color = ok ? "#087443" : "#a51e2a"; };
  const session = await supabaseClient.auth.getSession();
  if (session.error || !session.data.session) { location.href = "index.html"; return; }
  const authId = session.data.session.user.id;
  const { data: recursoConfig, error: erroRecursoConfig } = await supabaseClient.rpc("erp_empresa_tem_recurso", { p_empresa_id: (await supabaseClient.from("erp_usuarios").select("empresa_id").eq("auth_user_id", authId).maybeSingle()).data?.empresa_id, p_recurso_codigo: "GESTAO_ATUAL" });
  if (erroRecursoConfig || recursoConfig !== true) { say("Acesso não liberado para as configurações."); form.querySelectorAll("input,textarea,button").forEach(e=>e.disabled=true); return; }
  const {data:user,error:userErr}=await supabaseClient.from("erp_usuarios").select("id,empresa_id,tipo,ativo,bloqueado").eq("auth_user_id",authId).maybeSingle();
  if(userErr || !user || user.ativo !== true || user.bloqueado === true || String(user.tipo).toUpperCase() !== "ADMIN_ERP") {
    say("Apenas o administrador ativo da empresa pode alterar estas configurações."); form.querySelectorAll("input,textarea,button").forEach(e=>e.disabled=true); return;
  }
  empresaId=user.empresa_id;
  async function carregar(){
    say("Carregando configurações...",true);
    const {data,error}=await supabaseClient.from("erp_configuracoes_empresa").select("nome_exibicao,cabecalho_comprovante,telefone,email_contato,logo_url,endereco,rodape_comprovante").eq("empresa_id",empresaId).maybeSingle();
    if(error){say("Não foi possível carregar. Execute o SQL de atualização incluído no ZIP. Detalhe: "+error.message);return;}
    const v=data||{};
    $("cfgNome").value=v.nome_exibicao||"";
    $("cfgCabecalho").value=v.cabecalho_comprovante||"";
    $("cfgTelefone").value=v.telefone||"";
    $("cfgEmail").value=v.email_contato||"";
    $("cfgLogo").value=v.logo_url||"";
    $("cfgLogoFile").value="";
    $("cfgEndereco").value=v.endereco||"";
    $("cfgRodape").value=v.rodape_comprovante||"";
    preview(); say("Configurações carregadas.",true);
  }
  function preview(){const url=$("cfgLogo").value.trim(),img=$("cfgLogoPreview");img.hidden=!url;if(url){img.src=url;img.onerror=()=>{img.hidden=true;};}}
  $("cfgLogoFile").addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      event.target.value = "";
      say("Selecione uma imagem PNG, JPG ou JPEG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      event.target.value = "";
      say("A imagem deve ter no máximo 2 MB para manter o comprovante leve.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      $("cfgLogo").value = String(reader.result || "");
      preview();
      say("Logo selecionada. Clique em Salvar configurações para confirmar.", true);
    };
    reader.onerror = () => say("Não foi possível ler a imagem selecionada.");
    reader.readAsDataURL(file);
  });
  $("cfgRecarregar").addEventListener("click",carregar);
  form.addEventListener("submit",async e=>{
    e.preventDefault(); save.disabled=true; say("Salvando...",true);
    const payload={empresa_id:empresaId,nome_exibicao:$("cfgNome").value.trim()||null,cabecalho_comprovante:$("cfgCabecalho").value.trim()||null,telefone:$("cfgTelefone").value.trim()||null,email_contato:$("cfgEmail").value.trim()||null,logo_url:$("cfgLogo").value.trim()||null,endereco:$("cfgEndereco").value.trim()||null,rodape_comprovante:$("cfgRodape").value.trim()||null,updated_by:user.id,updated_at:new Date().toISOString()};
    const {error}=await supabaseClient.from("erp_configuracoes_empresa").upsert(payload,{onConflict:"empresa_id"});
    save.disabled=false;
    if(error){say("Falha ao salvar: "+error.message);return;}
    say("Configurações salvas com sucesso.",true);
  });
  await carregar();
});