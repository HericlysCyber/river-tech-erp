document.addEventListener("DOMContentLoaded", async () => {
    const $ = (id) => document.getElementById(id);

    const userName = $("userName");
    const userInitial = $("userInitial");
    const companyName = $("companyName");
    const companyLogo = $("companyLogo");
    const welcomeName = $("welcomeName");
    const welcomeCompany = $("welcomeCompany");
    const largeCompanyLogo = $("largeCompanyLogo");
    const detailCompanyName = $("detailCompanyName");
    const detailPlan = $("detailPlan");
    const detailPdvLimit = $("detailPdvLimit");
    const statPdvs = $("statPdvs");
    const statPdvsDescription = $("statPdvsDescription");
    const currentDate = $("currentDate");
    const logoutButton = $("logoutButton");

    function sairParaLogin() {
        sessionStorage.removeItem("ERP_USUARIO");
        sessionStorage.removeItem("ERP_EMPRESA");
        window.location.href = "index.html";
    }

    function primeiraLetra(nome) {
        return nome?.trim()?.charAt(0)?.toUpperCase() || "U";
    }

    function nomeEmpresa(empresa) {
        return empresa?.nome_fantasia || empresa?.nome || "Empresa";
    }

    function colocarLogo(elemento, empresa) {
        if (!elemento) return;

        const logo = empresa?.logo_url;

        if (!logo) {
            elemento.innerHTML = "";
            elemento.textContent = primeiraLetra(nomeEmpresa(empresa));
            return;
        }

        const imagem = document.createElement("img");
        imagem.src = logo;
        imagem.alt = nomeEmpresa(empresa);
        imagem.loading = "eager";
        imagem.referrerPolicy = "no-referrer";

        imagem.onerror = () => {
            elemento.innerHTML = "";
            elemento.textContent = primeiraLetra(nomeEmpresa(empresa));
        };

        elemento.innerHTML = "";
        elemento.appendChild(imagem);
    }

    function formatarData() {
        return new Date().toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        });
    }

    const recursoPorAtalho = {
        pdv: "PDV", produtos: "PRODUTOS", estoque: "ESTOQUE",
        fornecedores: "ESTOQUE", compras: "ESTOQUE",
        financeiro: "FINANCEIRO", "historico-vendas": "RELATORIOS",
        "historico-caixas": "RELATORIOS", devolucoes: "ESTOQUE",
        clientes: "CLIENTES", relatorios: "RELATORIOS",
        precificacao: "PRODUTOS", ofertas: "PRODUTOS",
        etiquetas: "PRODUTOS", configuracoes: "GESTAO_ATUAL"
    };

    async function aplicarPermissoesMenu() {
        const codigos = [...new Set(Object.values(recursoPorAtalho))];
        const permissoes = {};
        for (const codigo of codigos) {
            if (codigo === "GESTAO_ATUAL") {
                const { data, error } = await supabaseClient.rpc("erp_empresa_tem_recurso", {
                    p_empresa_id: window.__ERP_EMPRESA_ID__,
                    p_recurso_codigo: codigo
                });
                if (error) throw error;
                permissoes[codigo] = data === true;
            } else {
                const { data, error } = await supabaseClient.rpc("erp_usuario_tem_modulo", {
                    p_modulo_codigo: codigo
                });
                if (error) throw error;
                permissoes[codigo] = data === true;
            }
        }
        document.querySelectorAll("[data-module]").forEach((el) => {
            const atalho = el.dataset.module;
            if (atalho === "dashboard") return;
            const codigo = recursoPorAtalho[atalho];
            if (!codigo) return;
            const permitido = permissoes[codigo] === true;
            el.hidden = !permitido;
            el.setAttribute("aria-hidden", permitido ? "false" : "true");
            if ("disabled" in el) el.disabled = !permitido;
        });
    }

    function configurarMenu() {
        document.querySelectorAll("[data-module]").forEach((botao) => {
            botao.addEventListener("click", () => {
                const modulo = botao.dataset.module;

                const destinos = {
    pdv: "pdv.html",
    produtos: "produtos.html",
    estoque: "estoque.html",
    fornecedores: "fornecedores.html",
    compras: "compras.html",
    financeiro: "financeiro.html",
    "historico-vendas": "historico-vendas.html",
    "historico-caixas": "historico-caixas.html",
    devolucoes: "devolucoes.html",
    clientes: "clientes.html",
    relatorios: "relatorios.html",
    precificacao: "precificacao.html",
    ofertas: "ofertas.html",
    etiquetas: "etiquetas.html",
    configuracoes: "configuracoes.html"
};

                if (modulo === "dashboard") {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    return;
                }

                if (destinos[modulo]) {
                    window.location.href = destinos[modulo];
                    return;
                }

                alert("Este módulo ainda está em construção.");
            });
        });
    }

    try {
        if (typeof supabaseClient === "undefined") {
            throw new Error("Cliente Supabase não foi inicializado.");
        }

        const {
            data: { session },
            error: sessionError
        } = await supabaseClient.auth.getSession();

        if (sessionError || !session) {
            sairParaLogin();
            return;
        }

        const {
            data: usuario,
            error: usuarioError
        } = await supabaseClient
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
            .eq("auth_user_id", session.user.id)
            .maybeSingle();

        if (usuarioError || !usuario) {
            console.error("Erro ao consultar usuário:", usuarioError);
            await supabaseClient.auth.signOut();
            sairParaLogin();
            return;
        }

        if (
            usuario.ativo !== true ||
            usuario.bloqueado === true
        ) {
            await supabaseClient.auth.signOut();
            sairParaLogin();
            return;
        }

        // O dashboard é reservado à administração do ERP.
        const tipoUsuario = String(usuario.tipo || "")
    .trim()
    .toUpperCase();

if (tipoUsuario !== "ADMIN_ERP") {
    console.error("Tipo de usuário recebido pelo dashboard:", {
        tipo: usuario.tipo,
        empresa_id: usuario.empresa_id,
        auth_user_id: usuario.auth_user_id
    });

    if (tipoUsuario === "PDV") {
        window.location.href = "PDV/login.html";
        return;
    }

    alert(
        "Seu usuário não está cadastrado como ADMIN_ERP. " +
        "Tipo identificado: " + (usuario.tipo || "não informado") +
        ". Entre com o administrador do ERP."
    );

    return;
}

        const {
            data: empresa,
            error: empresaError
        } = await supabaseClient
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

        if (empresaError || !empresa) {
            console.error("Erro ao consultar empresa:", empresaError);
            await supabaseClient.auth.signOut();
            sairParaLogin();
            return;
        }

        if (
            empresa.ativo !== true ||
            empresa.bloqueado === true
        ) {
            await supabaseClient.auth.signOut();
            sairParaLogin();
            return;
        }

        window.__ERP_EMPRESA_ID__ = empresa.id;
        await aplicarPermissoesMenu();

        const nomeUsuario = usuario.nome || session.user.email || "Usuário";
        const nomeDaEmpresa = nomeEmpresa(empresa);

        if (userName) userName.textContent = nomeUsuario;
        if (userInitial) userInitial.textContent = primeiraLetra(nomeUsuario);

        // Perfil personalizável, mantendo o layout compacto da barra lateral.
        const perfilKey = `RIVER_ERP_PERFIL_${usuario.auth_user_id || usuario.id}`;
        const perfilSalvo = (() => { try { return JSON.parse(localStorage.getItem(perfilKey) || "{}"); } catch (_) { return {}; } })();
        const avatarEl = document.querySelector(".user-avatar");
        const sidebarProfile = $("sidebarProfile");
        const profileModal = $("profileModal");
        const profileForm = $("profileForm");
        const profilePreview = $("profilePhotoPreview");
        const profilePhoto = $("profilePhoto");
        const profileStatus = $("profileStatus");
        const profileClose = $("profileClose");
        const profileCancel = $("profileCancel");
        const profileName = $("profileDisplayName");
        const profilePhone = $("profilePhone");
        const profileEmail = $("profileEmail");
        let fotoPerfilAtual = perfilSalvo.foto || "";
        const aplicarPerfil = () => {
            const nome = perfilSalvo.nome || nomeUsuario;
            if (userName) userName.textContent = nome;
            if (userInitial) userInitial.textContent = primeiraLetra(nome);
            if (avatarEl) {
                avatarEl.innerHTML = "";
                if (fotoPerfilAtual) {
                    const img = document.createElement("img");
                    img.src = fotoPerfilAtual; img.alt = "Foto do perfil";
                    avatarEl.appendChild(img);
                } else {
                    const span = document.createElement("span");
                    span.id = "userInitial"; span.textContent = primeiraLetra(nome);
                    avatarEl.appendChild(span);
                }
            }
        };
        const abrirPerfil = () => {
            if (!profileModal) return;
            profileName.value = perfilSalvo.nome || nomeUsuario;
            profilePhone.value = perfilSalvo.telefone || "";
            profileEmail.value = perfilSalvo.email || usuario.email || session.user.email || "";
            profilePreview.src = fotoPerfilAtual; profilePreview.hidden = !fotoPerfilAtual;
            profileStatus.textContent = ""; profileModal.hidden = false;
        };
        const fecharPerfil = () => { if (profileModal) profileModal.hidden = true; };
        if (sidebarProfile) {
            sidebarProfile.addEventListener("click", abrirPerfil);
            sidebarProfile.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrirPerfil(); } });
        }
        [profileClose, profileCancel].forEach(btn => btn?.addEventListener("click", fecharPerfil));
        profilePhoto?.addEventListener("change", () => {
            const file = profilePhoto.files?.[0]; if (!file) return;
            if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 2*1024*1024) { profilePhoto.value = ""; profileStatus.textContent = "Use uma imagem PNG/JPG de até 2 MB."; return; }
            const reader = new FileReader(); reader.onload = () => { fotoPerfilAtual = String(reader.result || ""); profilePreview.src = fotoPerfilAtual; profilePreview.hidden = !fotoPerfilAtual; }; reader.readAsDataURL(file);
        });
        profileForm?.addEventListener("submit", e => {
            e.preventDefault();
            const novoPerfil = { nome: profileName.value.trim() || nomeUsuario, telefone: profilePhone.value.trim(), email: profileEmail.value.trim(), foto: fotoPerfilAtual };
            try { localStorage.setItem(perfilKey, JSON.stringify(novoPerfil)); Object.assign(perfilSalvo, novoPerfil); aplicarPerfil(); profileStatus.textContent = "Perfil salvo neste dispositivo."; profileStatus.style.color = "#087443"; setTimeout(fecharPerfil, 700); }
            catch (_) { profileStatus.textContent = "Não foi possível salvar. Escolha uma imagem menor."; }
        });
        aplicarPerfil();
        if (welcomeName) welcomeName.textContent = nomeUsuario.split(" ")[0];
        if (companyName) companyName.textContent = nomeDaEmpresa;
        if (welcomeCompany) welcomeCompany.textContent = nomeDaEmpresa;
        if (detailCompanyName) detailCompanyName.textContent = nomeDaEmpresa;

        // Usa a logo configurada no módulo de configurações, quando disponível.
        try {
            const { data: configuracaoLogo } = await supabaseClient
                .from("erp_configuracoes_empresa")
                .select("nome_exibicao,logo_url")
                .eq("empresa_id", empresa.id)
                .maybeSingle();
            // A logo de Configurações é exclusiva do comprovante.
            // No dashboard usamos a logo cadastral da empresa.
            if (configuracaoLogo?.nome_exibicao) empresa.nome_fantasia = configuracaoLogo.nome_exibicao;
        } catch (erroConfiguracao) {
            console.info("Configurações complementares ainda não disponíveis:", erroConfiguracao?.message);
        }
        colocarLogo(companyLogo, empresa);
        colocarLogo(largeCompanyLogo, empresa);

        if (detailPlan) {
            detailPlan.textContent = empresa.plano || "Plano não informado";
        }

        const limitePdvs = Number(empresa.limite_pdvs || 0);

        if (detailPdvLimit) {
            detailPdvLimit.textContent =
                `${limitePdvs} PDV${limitePdvs === 1 ? "" : "s"}`;
        }

        if (statPdvsDescription) {
            statPdvsDescription.textContent =
                `Limite disponível: ${limitePdvs}`;
        }

        const {
            count: quantidadePdvs,
            error: pdvError
        } = await supabaseClient
            .from("erp_pdvs")
            .select("id", { count: "exact", head: true })
            .eq("empresa_id", empresa.id);

        if (!pdvError && statPdvs) {
            statPdvs.textContent = quantidadePdvs ?? 0;
        }

        // Indicadores e lista rápida de vendas por empresa.
        const inicioHoje = new Date();
        inicioHoje.setHours(0, 0, 0, 0);
        const inicioAmanha = new Date(inicioHoje);
        inicioAmanha.setDate(inicioAmanha.getDate() + 1);
        const statVendas = $("statVendas");
        const corpoRecentes = $("vendasRecentesTabela");
        const avisoVendas = $("vendasDashboardAviso");
        const formatarDinheiro = valor => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        const normalizarStatusVenda = status => String(status || "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const vendaConcluida = venda => !["CANCELADA", "CANCELADO", "RASCUNHO", "ABERTA", "ABERTO", "ORCAMENTO", "PENDENTE"].includes(normalizarStatusVenda(venda.status));
        try {
            const { data: vendasDia, error: vendasError } = await supabaseClient
                .from("erp_vendas")
                .select("id,numero,status,total,created_at")
                .eq("empresa_id", empresa.id)
                .gte("created_at", inicioHoje.toISOString())
                .lt("created_at", inicioAmanha.toISOString())
                .order("created_at", { ascending: false })
                .limit(500);
            if (vendasError) throw vendasError;
            const concluidas = (vendasDia || []).filter(vendaConcluida);
            const total = concluidas.reduce((sum, venda) => sum + (Number(venda.total) || 0), 0);
            if (statVendas) statVendas.textContent = formatarDinheiro(total);
            const descricao = statVendas?.parentElement?.querySelector(".stat-description");
            if (descricao) descricao.textContent = `${concluidas.length} venda(s) registrada(s) hoje`;
            if ($("vendasHojeQtd")) $("vendasHojeQtd").textContent = String(concluidas.length);
            if ($("ticketMedioHoje")) $("ticketMedioHoje").textContent = formatarDinheiro(concluidas.length ? total / concluidas.length : 0);
            if ($("ultimaVendaData")) $("ultimaVendaData").textContent = concluidas[0]?.created_at ? new Date(concluidas[0].created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "Sem vendas hoje";
            if (corpoRecentes) {
                const recentes = (vendasDia || []).filter(vendaConcluida).slice(0, 8);
                corpoRecentes.innerHTML = recentes.length ? recentes.map(v => `<tr><td style="padding:11px;border-top:1px solid #edf1f6;font-weight:700;">${String(v.numero ?? v.id ?? "—").replace(/[&<>"']/g, "")}</td><td style="padding:11px;border-top:1px solid #edf1f6;">${v.created_at ? new Date(v.created_at).toLocaleString("pt-BR") : "—"}</td><td style="padding:11px;border-top:1px solid #edf1f6;">${String(v.status || "Concluída").replace(/[&<>"']/g, "")}</td><td style="padding:11px;border-top:1px solid #edf1f6;font-weight:800;">${formatarDinheiro(v.total)}</td></tr>`).join("") : `<tr><td colspan="4" style="padding:20px;text-align:center;color:#718096;">Nenhuma venda registrada hoje.</td></tr>`;
            }
            if (avisoVendas) avisoVendas.textContent = "Resumo atualizado diretamente das vendas desta empresa.";
        } catch (erroVendas) {
            console.error("Erro ao consultar vendas do dashboard:", erroVendas);
            if (statVendas) statVendas.textContent = "—";
            if (corpoRecentes) corpoRecentes.innerHTML = `<tr><td colspan="4" style="padding:20px;text-align:center;color:#a51e2a;">Não foi possível consultar as vendas. Confira a política RLS da tabela erp_vendas.</td></tr>`;
            if (avisoVendas) avisoVendas.textContent = erroVendas.message || "Falha ao consultar vendas.";
        }
        const statProdutos = $("statProdutos");
        if (statProdutos) {
            const { count, error: produtosError } = await supabaseClient.from("erp_produtos").select("id", { count: "exact", head: true }).eq("empresa_id", empresa.id).eq("ativo", true);
            if (!produtosError) statProdutos.textContent = count ?? 0;
        }
        const statClientes = $("statClientes");
        if (statClientes) {
            const { count, error: clientesError } = await supabaseClient.from("erp_clientes").select("id", { count: "exact", head: true }).eq("empresa_id", empresa.id);
            if (!clientesError) statClientes.textContent = count ?? 0;
        }

        if (currentDate) {
            currentDate.textContent = formatarData();
        }

        configurarMenu();

    } catch (erro) {
        console.error("Erro ao carregar dashboard:", erro);
        alert("Não foi possível carregar o painel. Confira a conexão e as permissões do Supabase.");
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            logoutButton.disabled = true;

            try {
                const { error } = await supabaseClient.auth.signOut();

                if (error) {
                    console.error("Erro ao encerrar sessão:", error);
                }
            } catch (erro) {
                console.error("Erro ao sair:", erro);
            }

            sairParaLogin();
        });
    }
});