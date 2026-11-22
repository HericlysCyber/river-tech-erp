(() => {
  "use strict";

  const $ = s => document.querySelector(s);
  const money = v => new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL"
  }).format(Number(v || 0));

  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };

  const dateText = v => {
    if (!v) return "—";
    const p = String(v).slice(0,10).split("-");
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : String(v);
  };

  const dateTimeText = v => {
    if (!v) return "—";
    const d = new Date(v);
    return Number.isNaN(d.getTime())
      ? dateText(v)
      : new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short", timeStyle: "short"
        }).format(d);
  };

  let client, companyId, rows = [], suppliers = [], selected = null;
  let flowRows = [];
  let flowLoaded = false;
  let loadingAccounts = false;
  let loadingFlow = false;

  function message(text, kind = "info") {
    const el = $("#pageMessage");
    el.textContent = text;
    el.className = `notice ${kind}`;
    el.hidden = false;
  }

  function hideMessage() {
    $("#pageMessage").hidden = true;
  }

  function statusInfo(r) {
    if (r.status === "PENDENTE" && r.vencimento && r.vencimento < todayISO()) {
      return { label: "Vencida", css: "status-overdue", key: "VENCIDA" };
    }
    if (r.status === "PAGO") return { label: "Paga", css: "status-paid", key: "PAGO" };
    if (r.status === "CANCELADO") return { label: "Cancelada", css: "status-cancelled", key: "CANCELADO" };
    return { label: "Pendente", css: "status-pending", key: "PENDENTE" };
  }

  function supplierName(r) {
    const s = suppliers.find(x => x.id === r.fornecedor_id);
    return s?.nome_fantasia || s?.nome || "—";
  }

  function thisMonth(v) {
    return !!v && String(v).slice(0,7) === todayISO().slice(0,7);
  }

  async function initialize() {
    if (!(await window.erpExigirModulo("FINANCEIRO"))) return;
    client = window.supabaseClient;

    if (!client) {
      message("A conexão do Supabase não foi carregada. Confira js/supabase.js e a ordem dos scripts.", "error");
      return;
    }

    const { data: sd, error: se } = await client.auth.getSession();

    if (se || !sd?.session?.user) {
      message("Sua sessão não está autenticada. Entre novamente pelo login do ERP.", "error");
      return;
    }

    const { data: u, error: ue } = await client
      .from("erp_usuarios")
      .select("id,empresa_id,nome,tipo,ativo,bloqueado")
      .eq("auth_user_id", sd.session.user.id)
      .maybeSingle();

    if (ue || !u) {
      message("Não foi possível localizar seu usuário no ERP.", "error");
      return;
    }

    if (
      String(u.tipo || "").trim().toUpperCase() !== "ADMIN_ERP" ||
      u.ativo !== true ||
      u.bloqueado === true
    ) {
      message("Esta tela é exclusiva de um Administrador ERP ativo e desbloqueado.", "error");
      return;
    }

    companyId = u.empresa_id;

    $("#userName").textContent = u.nome || "Administrador";
    $("#userInitial").textContent = (u.nome || "U").trim().charAt(0).toUpperCase();

    const { data: co, error: ce } = await client
      .from("erp_empresas")
      .select("nome_fantasia,razao_social,nome")
      .eq("id", companyId)
      .maybeSingle();

    if (!ce) {
      $("#companyNameSide").textContent =
        co?.nome_fantasia || co?.razao_social || co?.nome || "Empresa";
    }

    setDefaultFlowDates();
    bindEvents();
    await loadData();
  }

  function setDefaultFlowDates() {
    const today = todayISO();
    const start = new Date();
    start.setDate(1);
    const first = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,"0")}-01`;

    $("#flowStart").value = first;
    $("#flowEnd").value = today;
  }

  async function loadData() {
    if (loadingAccounts) return;
    loadingAccounts = true;
    hideMessage();

    $("#financeTableBody").innerHTML =
      '<tr><td colspan="6" class="empty-cell">Carregando lançamentos...</td></tr>';

    try {
      const [sr, fr] = await Promise.all([
        client.from("erp_fornecedores")
          .select("id,nome,nome_fantasia")
          .eq("empresa_id", companyId)
          .order("nome", { ascending: true }),

        client.from("erp_lancamentos_financeiros")
          .select("id,empresa_id,tipo,descricao,valor,vencimento,pagamento,status,compra_id,fornecedor_id,parcela_numero,total_parcelas,created_at")
          .eq("empresa_id", companyId)
          .order("vencimento", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: false })
      ]);

      if (sr.error) throw new Error("Não foi possível carregar fornecedores: " + sr.error.message);
      if (fr.error) throw new Error("Não foi possível carregar lançamentos financeiros: " + fr.error.message);

      suppliers = sr.data || [];
      rows = fr.data || [];

      populateSupplierFilter();
      renderMetrics();
      renderTable();
    } catch (err) {
      message(err?.message || "Erro ao carregar os dados financeiros.", "error");
      $("#financeTableBody").innerHTML =
        '<tr><td colspan="6" class="empty-cell">Erro ao carregar os dados.</td></tr>';
    } finally {
      loadingAccounts = false;
    }
  }

  function populateSupplierFilter() {
    const el = $("#supplierFilter");
    const old = el.value;

    el.innerHTML = '<option value="">Todos os fornecedores</option>';

    suppliers.forEach(s => {
      const o = document.createElement("option");
      o.value = s.id;
      o.textContent = s.nome_fantasia || s.nome || "Fornecedor";
      el.appendChild(o);
    });

    if ([...el.options].some(o => o.value === old)) el.value = old;
  }

  function renderMetrics() {
    const pending = rows.filter(r => r.tipo === "DESPESA" && r.status === "PENDENTE");
    const overdue = pending.filter(r => r.vencimento && r.vencimento < todayISO());
    const paid = rows.filter(r =>
      r.tipo === "DESPESA" && r.status === "PAGO" && thisMonth(r.pagamento)
    );

    $("#metricPending").textContent = money(pending.reduce((s,r) => s + Number(r.valor || 0), 0));
    $("#metricOverdue").textContent = money(overdue.reduce((s,r) => s + Number(r.valor || 0), 0));
    $("#metricPaid").textContent = money(paid.reduce((s,r) => s + Number(r.valor || 0), 0));
    $("#metricCount").textContent = String(rows.length);
  }

  function renderTable() {
    const q = $("#searchInput").value.trim().toLocaleLowerCase("pt-BR");
    const type = $("#typeFilter").value;
    const status = $("#statusFilter").value;
    const sid = $("#supplierFilter").value;

    const list = rows.filter(r => {
      const st = statusInfo(r);
      const txt = `${r.descricao || ""} ${supplierName(r)} ${r.compra_id || ""}`
        .toLocaleLowerCase("pt-BR");

      return (!q || txt.includes(q)) &&
        (!type || r.tipo === type) &&
        (!status || st.key === status) &&
        (!sid || r.fornecedor_id === sid);
    });

    const body = $("#financeTableBody");

    if (!list.length) {
      body.innerHTML = '<tr><td colspan="6" class="empty-cell">Nenhum lançamento corresponde aos filtros.</td></tr>';
      $("#resultsCount").textContent = "0 lançamentos";
      return;
    }

    body.innerHTML = "";

    list.forEach(r => {
      const tr = document.createElement("tr");
      const st = statusInfo(r);

      const desc = document.createElement("td");
      desc.className = "description-cell";
      desc.textContent = r.descricao || (r.tipo === "DESPESA" ? "Despesa" : "Receita");

      if (r.compra_id) {
        const sub = document.createElement("span");
        sub.className = "secondary-cell";
        sub.textContent = `Compra vinculada · Parcela ${r.parcela_numero || 1}/${r.total_parcelas || 1}`;
        desc.appendChild(sub);
      }

      const sup = document.createElement("td");
      sup.className = "supplier-cell";
      sup.textContent = supplierName(r);

      const due = document.createElement("td");
      due.textContent = dateText(r.vencimento);

      if (r.status === "PAGO" && r.pagamento) {
        const sub = document.createElement("span");
        sub.className = "secondary-cell";
        sub.textContent = `Pago em ${dateText(r.pagamento)}`;
        due.appendChild(sub);
      }

      const amount = document.createElement("td");
      amount.className = "money-cell";
      amount.textContent = money(r.valor);

      const statusCell = document.createElement("td");
      const pill = document.createElement("span");
      pill.className = `status-pill ${st.css}`;
      pill.textContent = st.label;
      statusCell.appendChild(pill);

      const action = document.createElement("td");

      if (r.tipo === "DESPESA" && r.status === "PENDENTE") {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "table-action";
        b.textContent = "Registrar pagamento";
        b.addEventListener("click", () => openPayment(r));
        action.appendChild(b);
      } else {
        action.textContent = "—";
      }

      [desc, sup, due, amount, statusCell, action].forEach(td => tr.appendChild(td));
      body.appendChild(tr);
    });

    $("#resultsCount").textContent = `${list.length} de ${rows.length} lançamentos`;
  }

  function originText(origin) {
    const labels = {
      VENDA_PAGAMENTO: "Venda PDV",
      LANCAMENTO_FINANCEIRO: "Lançamento financeiro",
      ESTORNO_VENDA: "Estorno de venda"
    };
    return labels[origin] || origin || "Outra origem";
  }

  function movementTypeText(type) {
    return type === "ENTRADA" ? "Entrada" : type === "SAIDA" ? "Saída" : type || "—";
  }

  async function loadFlow() {
    if (loadingFlow) return;

    const start = $("#flowStart").value;
    const end = $("#flowEnd").value;

    if (start && end && start > end) {
      message("A data inicial não pode ser posterior à data final.", "error");
      return;
    }

    loadingFlow = true;
    hideMessage();

    $("#flowTableBody").innerHTML =
      '<tr><td colspan="6" class="empty-cell">Carregando movimentações...</td></tr>';

    try {
      let query = client.from("erp_fluxo_caixa_movimentos")
        .select("id,empresa_id,data_movimento,tipo,categoria,descricao,valor,origem_tipo,venda_id,lancamento_id,pdv_id,forma_pagamento_id")
        .eq("empresa_id", companyId)
        .order("data_movimento", { ascending: false });

      // O fim do período inclui todo o dia local de Brasília.
      if (start) query = query.gte("data_movimento", `${start}T00:00:00-03:00`);
      if (end) {
        const next = new Date(`${end}T12:00:00-03:00`);
        next.setDate(next.getDate() + 1);
        const nextLocal = `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,"0")}-${String(next.getDate()).padStart(2,"0")}`;
        query = query.lt("data_movimento", `${nextLocal}T00:00:00-03:00`);
      }

      const type = $("#flowType").value;
      const origin = $("#flowOrigin").value;

      if (type) query = query.eq("tipo", type);
      if (origin) query = query.eq("origem_tipo", origin);

      const { data, error } = await query;

      if (error) {
        if (error.code === "42P01" || /does not exist/i.test(error.message || "")) {
          throw new Error("A tabela de fluxo de caixa não foi encontrada. Confira se o SQL de implantação foi executado.");
        }
        throw error;
      }

      flowRows = data || [];
      flowLoaded = true;
      renderFlow();
    } catch (err) {
      $("#flowTableBody").innerHTML =
        '<tr><td colspan="6" class="empty-cell">Não foi possível carregar o fluxo de caixa.</td></tr>';
      $("#flowResultsCount").textContent = "Erro na consulta";
      message(err?.message || "Erro ao carregar o fluxo de caixa.", "error");
    } finally {
      loadingFlow = false;
    }
  }

  function renderFlow() {
    const start = $("#flowStart").value;
    const end = $("#flowEnd").value;

    $("#flowPeriodLabel").textContent =
      `Período: ${start ? dateText(start) : "início não definido"} até ${end ? dateText(end) : "sem data final"}`;

    const incoming = flowRows
      .filter(r => r.tipo === "ENTRADA")
      .reduce((sum, r) => sum + Number(r.valor || 0), 0);

    const outgoing = flowRows
      .filter(r => r.tipo === "SAIDA")
      .reduce((sum, r) => sum + Number(r.valor || 0), 0);

    $("#flowIn").textContent = money(incoming);
    $("#flowOut").textContent = money(outgoing);
    $("#flowBalance").textContent = money(incoming - outgoing);
    $("#flowCount").textContent = String(flowRows.length);

    const body = $("#flowTableBody");
    body.innerHTML = "";

    if (!flowRows.length) {
      body.innerHTML = '<tr><td colspan="6" class="empty-cell">Nenhuma movimentação encontrada nesse período.</td></tr>';
      $("#flowResultsCount").textContent = "0 movimentações";
      return;
    }

    flowRows.forEach(r => {
      const tr = document.createElement("tr");

      const date = document.createElement("td");
      date.textContent = dateTimeText(r.data_movimento);

      const description = document.createElement("td");
      description.className = "description-cell";
      description.textContent = r.descricao || "Movimentação financeira";

      const origin = document.createElement("td");
      origin.textContent = originText(r.origem_tipo);

      const category = document.createElement("td");
      category.textContent = r.categoria || "—";

      const type = document.createElement("td");
      const pill = document.createElement("span");
      pill.className = `status-pill ${r.tipo === "ENTRADA" ? "status-paid" : "status-overdue"}`;
      pill.textContent = movementTypeText(r.tipo);
      type.appendChild(pill);

      const value = document.createElement("td");
      value.className = "money-cell";
      value.textContent = `${r.tipo === "SAIDA" ? "− " : "+ "}${money(r.valor)}`;

      [date, description, origin, category, type, value].forEach(td => tr.appendChild(td));
      body.appendChild(tr);
    });

    $("#flowResultsCount").textContent = `${flowRows.length} movimentações`;
  }

  async function switchView(view) {
    const accounts = view === "contas";
    $("#accountsView").hidden = !accounts;
    $("#cashflowView").hidden = accounts;

    document.querySelectorAll(".finance-tab").forEach(button => {
      const active = button.dataset.view === view;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (!accounts && !flowLoaded) await loadFlow();
  }

  function openPayment(r) {
    selected = r;
    $("#paymentId").value = r.id;
    $("#paymentDescription").textContent = r.descricao || "Despesa";
    $("#paymentAmount").textContent = money(r.valor);
    $("#paymentDate").value = todayISO();

    const d = $("#paymentDialog");
    if (d.showModal) d.showModal();
    else message("Seu navegador não oferece suporte à janela de pagamento.", "error");
  }

  function closePayment() {
    const d = $("#paymentDialog");
    if (d.open) d.close();
    selected = null;
  }

  async function submitPayment(e) {
    e.preventDefault();
    if (!selected) return;

    const btn = $("#confirmPayment");
    const date = $("#paymentDate").value;

    if (!date) {
      message("Informe a data do pagamento.", "error");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Registrando...";

    try {
      const { data, error } = await client.rpc("erp_registrar_pagamento_financeiro", {
        p_lancamento_id: selected.id,
        p_data_pagamento: date
      });

      if (error) throw error;

      let result = data;
      if (Array.isArray(result)) result = result[0];

      if (!result || result.sucesso !== true) {
        throw new Error(result?.mensagem || "O servidor não confirmou o pagamento.");
      }

      closePayment();
      message(result.mensagem || "Pagamento registrado com sucesso.", "success");

      await loadData();

      // O gatilho do banco registra a movimentação financeira.
      // Reconsultamos o fluxo se ele já foi aberto nesta sessão.
      if (flowLoaded) await loadFlow();
    } catch (err) {
      message(err?.message || "Não foi possível registrar o pagamento.", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Confirmar pagamento";
    }
  }

  function bindEvents() {
    $("#refreshButton").addEventListener("click", loadData);
    $("#refreshFlowButton").addEventListener("click", loadFlow);
    $("#applyFlowFilters").addEventListener("click", loadFlow);

    $("#searchInput").addEventListener("input", renderTable);

    ["#typeFilter", "#statusFilter", "#supplierFilter"].forEach(s => {
      $(s).addEventListener("change", renderTable);
    });

    document.querySelectorAll(".finance-tab").forEach(button => {
      button.addEventListener("click", () => switchView(button.dataset.view));
    });

    $("#paymentForm").addEventListener("submit", submitPayment);
    $("#closeDialog").addEventListener("click", closePayment);
    $("#cancelPayment").addEventListener("click", closePayment);

    $("#paymentDialog").addEventListener("click", e => {
      if (e.target === $("#paymentDialog")) closePayment();
    });
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();