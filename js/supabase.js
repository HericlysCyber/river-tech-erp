const SUPABASE_URL = "https://vdocjqaskeucnrqdobyb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_A87wjQ82Uw6_CCmKg9TsQw_ruSBqSPF";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

// Disponibiliza a conexão para outras páginas e scripts.
window.supabaseClient = supabaseClient;
// Validação central de acesso a módulos antes da inicialização de cada página.
window.erpExigirModulo = async function(codigo) {
    const client = window.supabaseClient;
    if (!client) throw new Error('Conexão do ERP indisponível.');
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData?.session?.user) {
        window.location.href = 'index.html';
        return false;
    }
    const { data, error } = await client.rpc('erp_usuario_tem_modulo', {
        p_modulo_codigo: String(codigo || '').toUpperCase()
    });
    if (error) throw new Error('Não foi possível validar o módulo ' + codigo + ': ' + error.message);
    if (data !== true) {
        alert('Acesso não liberado para este módulo. Solicite a liberação ao Administrador Geral.');
        window.location.href = 'dashboard.html';
        return false;
    }
    return true;
};
