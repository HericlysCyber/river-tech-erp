(function(){
  const money = value => Number(value || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateBR = value => { if(!value)return '—'; const isDateOnly=typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value); const d=new Date(isDateOnly?value+'T12:00:00':value); return isDateOnly?d.toLocaleDateString('pt-BR'):d.toLocaleString('pt-BR'); };
  const localDate = d => { const x=new Date(d); return new Date(x.getTime()-x.getTimezoneOffset()*60000).toISOString().slice(0,10); };
  async function context(moduleCode){
    if(!window.supabaseClient) throw new Error('Cliente Supabase não foi inicializado.');
    const {data:{session},error:se}=await supabaseClient.auth.getSession();
    if(se) throw se;
    if(!session?.user){location.href='index.html';throw new Error('Sessão encerrada.');}
    const {data:user,error:ue}=await supabaseClient.from('erp_usuarios').select('id,auth_user_id,empresa_id,nome,email,tipo,ativo,bloqueado,pdv_id').eq('auth_user_id',session.user.id).maybeSingle();
    if(ue) throw ue;
    if(!user || user.ativo!==true || user.bloqueado===true){await supabaseClient.auth.signOut();location.href='index.html';throw new Error('Usuário sem acesso ativo.');}
    if(String(user.tipo||'').trim().toUpperCase()!=='ADMIN_ERP') throw new Error('Este módulo é exclusivo do administrador do ERP.');
    const {data:company,error:ce}=await supabaseClient.from('erp_empresas').select('id,nome,nome_fantasia,logo_url,ativo,bloqueado').eq('id',user.empresa_id).maybeSingle();
    if(ce) throw ce;
    if(!company || company.ativo!==true || company.bloqueado===true) throw new Error('Empresa não encontrada ou bloqueada.');
    if(moduleCode){
      const {data:allowed,error:moduleError}=await supabaseClient.rpc('erp_usuario_tem_modulo',{p_modulo_codigo:String(moduleCode).toUpperCase()});
      if(moduleError) throw new Error('Não foi possível validar a permissão deste módulo: '+moduleError.message);
      if(allowed!==true){
        const error=new Error('Acesso não liberado para este módulo. Verifique o plano ou a liberação com o Administrador Geral.');
        error.code='MODULO_NAO_LIBERADO';
        throw error;
      }
    }
    document.querySelectorAll('[data-empresa-nome]').forEach(el=>el.textContent=company.nome_fantasia||company.nome||'Empresa');
    const currentFile=location.pathname.split('/').pop();document.querySelectorAll('.module-nav a').forEach(a=>{if(a.getAttribute('href')===currentFile)a.classList.add('active');});
    return {user,company};
  }
  function setMessage(el,text,error=false){if(!el)return;el.textContent=text;el.hidden=!text;el.classList.toggle('error',!!error);}
  window.RiverERP={context,money,escape,dateBR,localDate,setMessage};
})();