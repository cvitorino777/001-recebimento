// ---------- Estado (em memória — sem backend ainda) ----------
const state = {
  tab: "pendentes",
  pendentes: [],
  recebimentos: [],
  divergencias: [],
  novoRecebimentoBase: null, // { pendenteId, fornecedor, notaFiscal } quando o modal está aberto
  calendar: { year: new Date().getFullYear(), month: new Date().getMonth(), diaSelecionado: null },
};

// ---------- Helpers ----------
function notasComDivergenciaAberta() {
  return new Set(state.divergencias.filter(d => d.status === "aberta").map(d => d.notaFiscal));
}

function fmtTime(d) {
  if (!d) return "—";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(ms) {
  if (ms == null) return "—";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}min`;
}

function fmtMoeda(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const TIPO_LABEL = { pedido_divergente: "Pedido divergente", valor_divergente: "Valor divergente", nf_incorreta: "NF com erro", outro: "Outro motivo" };

// ---------- Navegação ----------
const NAV_ITEMS = [
  { id: "pendentes", label: "Pendentes", icon: "📋" },
  { id: "recebimentos", label: "Recebimentos", icon: "✅" },
  { id: "divergencias", label: "Divergências", icon: "⚠️" },
  { id: "dashboard", label: "Painel de tempo", icon: "📊" },
];

function renderNav() {
  const nav = document.getElementById("nav");
  nav.innerHTML = "";
  NAV_ITEMS.forEach(item => {
    const btn = document.createElement("button");
    btn.className = "nav-item" + (state.tab === item.id ? " active" : "");
    let badge = "";
    if (item.id === "pendentes") {
      const n = state.pendentes.filter(p => p.pedidoOk && p.valorOk && p.aprovacaoOk).length;
      if (n) badge = `<span class="nav-badge">${n}</span>`;
    }
    if (item.id === "divergencias") {
      const n = state.divergencias.filter(d => d.status === "aberta").length;
      if (n) badge = `<span class="nav-badge">${n}</span>`;
    }
    btn.innerHTML = `<span class="icon">${item.icon}</span><span class="label">${item.label}</span>${badge}`;
    btn.onclick = () => { state.tab = item.id; render(); };
    nav.appendChild(btn);
  });
}

// ---------- Telas ----------
function renderMain() {
  const main = document.getElementById("main");
  if (state.tab === "pendentes") return (main.innerHTML = viewPendentes());
  if (state.tab === "recebimentos") return (main.innerHTML = viewRecebimentos());
  if (state.tab === "divergencias") return (main.innerHTML = viewDivergencias());
  if (state.tab === "dashboard") return (main.innerHTML = viewDashboard());
}

function viewPendentes() {
  const rows = state.pendentes.map(p => {
    const liberado = p.pedidoOk && p.valorOk && p.aprovacaoOk;
    const tone = p.convertido || liberado ? "left-green" : "left-amber";
    return `
      <div class="card ${tone}">
        <div class="pend-info">
          <div class="nome">${p.fornecedor}</div>
          <div class="nf">NF: ${p.notaFiscal}</div>
          ${p.numeroPedido ? `<div class="nf">Nº Pedido: ${p.numeroPedido}</div>` : ""}
        </div>
        <div class="checks">
          ${checkFieldHtml("Pedido", p.pedidoOk, `togglePendente(${p.id},'pedidoOk')`, p.convertido)}
          ${checkFieldHtml("Valor", p.valorOk, `togglePendente(${p.id},'valorOk')`, p.convertido)}
          ${checkFieldHtml("Aprovação", p.aprovacaoOk, `togglePendente(${p.id},'aprovacaoOk')`, p.convertido)}
        </div>
        ${p.convertido
          ? `<span class="stamp-tag" id="stamp-pend-${p.id}" onclick="copiarNumeroPendente(${p.id})">5000 criado: ${p.numero5000} 📋</span>`
          : `<button class="btn-primary" ${liberado ? "" : "disabled"} onclick="abrirNovo5000(${p.id})">+ Criar 5000</button>`}
      </div>`;
  }).join("");

  return `
    <div class="section-head">
      <div>
        <h1 class="section-title">Pendentes</h1>
        <div class="section-sub">A fiscal confere pedido, valor e aprovação do compras. Fica na lista mesmo depois do 5000, para o levantamento do dia.</div>
      </div>
      <button class="btn-primary" onclick="resetModalPendenteChecks(); abrirModal('modalNovaPendente')">+ Nova NF pendente</button>
    </div>
    <div class="card-list">${rows || `<div class="empty-state">Nenhuma NF pendente de conferência.</div>`}</div>`;
}

function checkFieldHtml(label, checked, onclick, disabled) {
  if (disabled) {
    return `
      <span class="check-field" style="opacity:0.55; cursor:default;">
        <span class="toggle ${checked ? "on" : ""} disabled"><span class="knob"></span></span>
        <span class="lbl">${label}</span>
      </span>`;
  }
  return `
    <label class="check-field" onclick="${onclick}(); return false;">
      <span class="toggle ${checked ? "on" : ""}"><span class="knob"></span></span>
      <span class="lbl">${label}</span>
    </label>`;
}

function diaKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const NOMES_MES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function calendarHtml() {
  const { year, month, diaSelecionado } = state.calendar;
  const primeiroDia = new Date(year, month, 1);
  const diasNoMes = new Date(year, month + 1, 0).getDate();
  const offset = primeiroDia.getDay();
  const diasComRecebimento = new Set(state.recebimentos.map(r => diaKey(r.criadoEm)));

  let cells = "";
  for (let i = 0; i < offset; i++) cells += `<div class="cal-cell empty"></div>`;
  for (let d = 1; d <= diasNoMes; d++) {
    const key = `${year}-${month}-${d}`;
    const temDado = diasComRecebimento.has(key);
    const selecionado = diaSelecionado === key;
    cells += `<div class="cal-cell ${temDado ? "has-data" : ""} ${selecionado ? "selected" : ""}" onclick="selecionarDia('${key}')">
      <span class="cal-day-num">${d}</span>${temDado ? `<span class="cal-dot"></span>` : ""}
    </div>`;
  }

  return `
    <div class="calendar">
      <div class="cal-head">
        <button class="cal-nav" onclick="mudarMes(-1)">‹</button>
        <span class="cal-title">${NOMES_MES[month]} ${year}</span>
        <button class="cal-nav" onclick="mudarMes(1)">›</button>
      </div>
      <div class="cal-weekdays"><span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span></div>
      <div class="cal-grid">${cells}</div>
    </div>`;
}

function viewRecebimentos() {
  const bloqueadas = notasComDivergenciaAberta();
  const diaSel = state.calendar.diaSelecionado;
  const lista = diaSel ? state.recebimentos.filter(r => diaKey(r.criadoEm) === diaSel) : state.recebimentos;

  const rows = lista.map(r => {
    const bloqueado = bloqueadas.has(r.notaFiscal);
    let statusLabel, statusTone;
    if (r.mov105) { statusLabel = "Concluído"; statusTone = "green"; }
    else if (bloqueado) { statusLabel = "Bloqueado"; statusTone = "red"; }
    else { statusLabel = "Em andamento"; statusTone = "amber"; }

    return `
      <tr>
        <td><span class="stamp-tag" id="stamp-${r.id}" onclick="copiarNumero(${r.id})">${r.numero} 📋</span></td>
        <td class="fornecedor-nome">${r.fornecedor}</td>
        <td class="fornecedor-nf">${r.notaFiscal}</td>
        <td class="dt">${fmtTime(r.criadoEm)}</td>
        <td>
          <div class="toggle-cell">
            <span class="toggle ${r.espelhoImpresso ? "on" : ""}" onclick="toggleEspelho(${r.id})"><span class="knob"></span></span>
            <span class="toggle-time">${r.espelhoImpressoEm ? fmtTime(r.espelhoImpressoEm) : ""}</span>
          </div>
        </td>
        <td>
          <div class="toggle-cell">
            <span class="toggle ${r.mov105 ? "on" : ""} ${bloqueado && !r.mov105 ? "disabled" : ""}"
                  title="${bloqueado && !r.mov105 ? "Bloqueado: há divergência aberta para esta NF" : ""}"
                  onclick="toggleMov105(${r.id}, ${bloqueado})"><span class="knob"></span></span>
            <span class="toggle-time">${r.mov105Em ? fmtTime(r.mov105Em) : ""}</span>
          </div>
        </td>
        <td><span class="pill pill-${statusTone}">${statusLabel}</span> ${bloqueado && !r.mov105 ? "🚫" : ""}</td>
      </tr>`;
  }).join("");

  const filtroBar = diaSel
    ? `<div class="filtro-bar">Mostrando recebimentos de ${diaSel.split("-")[2]}/${parseInt(diaSel.split("-")[1]) + 1} <button class="btn-outline" onclick="limparFiltroDia()">Ver todos</button></div>`
    : "";

  return `
    <div class="section-head">
      <div>
        <h1 class="section-title">Recebimentos</h1>
      </div>
    </div>
    <div class="receb-layout">
      ${calendarHtml()}
      <div class="panel-table">
        ${filtroBar}
        <table>
          <thead><tr><th>5000</th><th>Forn.</th><th>NF</th><th>Criado</th><th>Espelho impresso</th><th>Mov. 105</th><th>Status</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="7" class="empty-state">Nenhum recebimento ${diaSel ? "nesse dia" : "lançado ainda"}.</td></tr>`}</tbody>
        </table>
      </div>
    </div>`;
}

function mudarMes(delta) {
  state.calendar.month += delta;
  if (state.calendar.month < 0) { state.calendar.month = 11; state.calendar.year--; }
  if (state.calendar.month > 11) { state.calendar.month = 0; state.calendar.year++; }
  render();
}

function selecionarDia(key) {
  state.calendar.diaSelecionado = state.calendar.diaSelecionado === key ? null : key;
  render();
}

function limparFiltroDia() {
  state.calendar.diaSelecionado = null;
  render();
}

function viewDivergencias() {
  const atrasando = state.pendentes.filter(p => !p.convertido && !(p.pedidoOk && p.valorOk && p.aprovacaoOk));
  const atrasoRows = atrasando.map(p => {
    const faltando = [];
    if (!p.pedidoOk) faltando.push("Pedido");
    if (!p.valorOk) faltando.push("Valor");
    if (!p.aprovacaoOk) faltando.push("Aprovação");
    return `
      <div class="card left-amber">
        <div class="div-body" style="flex:1">
          <div class="div-top">
            <span class="pill pill-amber">Aguardando: ${faltando.join(", ")}</span>
          </div>
          <div class="div-desc">Fornecedor: ${p.fornecedor}</div>
          <div class="div-desc">NF: ${p.notaFiscal}</div>
          <input class="field-input obs-input" style="margin-top:8px; margin-bottom:0;" placeholder="Anotar motivo / observação..."
                 value="${p.observacao || ""}" oninput="atualizarObservacaoPendente(${p.id}, this.value)">
        </div>
      </div>`;
  }).join("");

  const divRows = state.divergencias.map(d => `
    <div class="card ${d.status === "aberta" ? "left-red" : "left-green"}">
      <div class="div-body">
        <div class="div-top">
          <span class="nf">${d.notaFiscal}</span>
          <span class="pill pill-gray">${TIPO_LABEL[d.tipo]}</span>
          <span class="pill ${d.status === "aberta" ? "pill-red" : "pill-green"}">${d.status === "aberta" ? "Aberta" : "Resolvida"}</span>
        </div>
        <div class="div-desc">${d.descricao}</div>
        <div class="div-meta">${d.fornecedor} · aberta em ${fmtTime(d.abertaEm)}</div>
      </div>
      ${d.status === "aberta" ? `<button class="btn-outline" onclick="resolverDivergencia(${d.id})">✓ Marcar resolvida</button>` : ""}
    </div>`).join("");

  return `
    <div class="section-head">
      <div>
        <h1 class="section-title">Divergências</h1>
        <div class="section-sub">Tudo que está atrasando o lançamento do 105 — pendências do compras e divergências registradas.</div>
      </div>
      <button class="btn-primary" onclick="abrirModal('modalDivergencia')">+ Registrar divergência</button>
    </div>
    <div class="subsection-title">Aguardando conferência do compras</div>
    <div class="card-list">${atrasoRows || `<div class="empty-state">Nada pendente de compras no momento.</div>`}</div>
    <div class="subsection-title">Divergências registradas</div>
    <div class="card-list">${divRows || `<div class="empty-state">Nenhuma divergência registrada.</div>`}</div>`;
}

function viewDashboard() {
  const concluidos = state.recebimentos.filter(r => r.mov105 && r.mov105Em);
  const dados = concluidos.map(r => ({ nome: r.numero.slice(-4), minutos: Math.round((r.mov105Em - r.criadoEm) / 60000) }));
  const mediaMin = dados.length ? Math.round(dados.reduce((s, d) => s + d.minutos, 0) / dados.length) : null;
  const emAndamento = state.recebimentos.filter(r => !r.mov105).length;
  const maxMin = Math.max(1, ...dados.map(d => d.minutos));

  const bars = dados.map(d => `
    <div class="bar-col">
      <div class="bar-val">${d.minutos}min</div>
      <div class="bar" style="height:${Math.max(6, (d.minutos / maxMin) * 180)}px"></div>
      <div class="bar-name">#${d.nome}</div>
    </div>`).join("");

  return `
    <div class="section-head">
      <div>
        <h1 class="section-title">Painel de tempo</h1>
        <div class="section-sub">Do lançamento do 5000 até a movimentação 105 no SAP.</div>
      </div>
    </div>
    <div class="stat-row">
      <div class="stat-card"><div class="stat-label">⏱ Tempo médio (5000 → 105)</div><div class="stat-value">${mediaMin != null ? fmtDuration(mediaMin * 60000) : "—"}</div></div>
      <div class="stat-card"><div class="stat-label" style="color:var(--green)">✓ Concluídos</div><div class="stat-value">${concluidos.length}</div></div>
      <div class="stat-card"><div class="stat-label" style="color:var(--amber)">⏱ Em andamento</div><div class="stat-value">${emAndamento}</div></div>
    </div>
    <div class="chart-panel">
      <div class="chart-title">Minutos até o 105, por recebimento concluído</div>
      ${dados.length ? `<div class="bars">${bars}</div>` : `<div class="empty-state">Nenhum recebimento concluído ainda.</div>`}
    </div>`;
}

let modalPendenteChecks = { pedidoOk: false, valorOk: false, aprovacaoOk: false };

function toggleModalPendente(campo) {
  modalPendenteChecks[campo] = !modalPendenteChecks[campo];
  const el = document.getElementById(`fp-check-${campo}`);
  el.classList.toggle("on", modalPendenteChecks[campo]);
}

function resetModalPendenteChecks() {
  modalPendenteChecks = { pedidoOk: false, valorOk: false, aprovacaoOk: false };
  ["pedidoOk", "valorOk", "aprovacaoOk"].forEach(campo => {
    document.getElementById(`fp-check-${campo}`).classList.remove("on");
  });
}

// ---------- Ações ----------
function togglePendente(id, campo) {
  const p = state.pendentes.find(p => p.id === id);
  if (p.convertido) return;
  p[campo] = !p[campo];
  render();
}

function copiarNumeroPendente(id) {
  const p = state.pendentes.find(p => p.id === id);
  navigator.clipboard?.writeText(p.numero5000).catch(() => {});
  const el = document.getElementById(`stamp-pend-${id}`);
  if (el) {
    el.classList.add("copied");
    el.innerHTML = `5000 criado: ${p.numero5000} ✓`;
    setTimeout(() => { el.classList.remove("copied"); el.innerHTML = `5000 criado: ${p.numero5000} 📋`; }, 1200);
  }
}

function copiarNumero(id) {
  const r = state.recebimentos.find(r => r.id === id);
  navigator.clipboard?.writeText(r.numero).catch(() => {});
  const el = document.getElementById(`stamp-${id}`);
  if (el) {
    el.classList.add("copied");
    el.innerHTML = `${r.numero} ✓`;
    setTimeout(() => { el.classList.remove("copied"); el.innerHTML = `${r.numero} 📋`; }, 1200);
  }
}

function toggleEspelho(id) {
  const r = state.recebimentos.find(r => r.id === id);
  r.espelhoImpresso = !r.espelhoImpresso;
  r.espelhoImpressoEm = r.espelhoImpresso ? new Date() : null;
  render();
}

function toggleMov105(id, bloqueado) {
  const r = state.recebimentos.find(r => r.id === id);
  if (bloqueado && !r.mov105) return; // não deixa ligar se estiver bloqueado
  r.mov105 = !r.mov105;
  r.mov105Em = r.mov105 ? new Date() : null;
  render();
}

function atualizarObservacaoPendente(id, valor) {
  const p = state.pendentes.find(p => p.id === id);
  if (p) p.observacao = valor;
}

function resolverDivergencia(id) {
  const d = state.divergencias.find(d => d.id === id);
  d.status = "resolvida";
  render();
}

// ---------- Modal: Criar 5000 ----------
function abrirNovo5000(pendenteId) {
  const p = state.pendentes.find(p => p.id === pendenteId);
  state.novoRecebimentoBase = { pendenteId, fornecedor: p.fornecedor, notaFiscal: p.notaFiscal };
  document.getElementById("f5000-fornecedor").textContent = p.fornecedor;
  document.getElementById("f5000-notafiscal").textContent = p.notaFiscal;
  document.getElementById("f5000-numero").value = "";
  document.getElementById("f5000-submit").disabled = true;
  document.getElementById("f5000-hint").classList.remove("show");
  abrirModal("modalNovo5000");
}

document.addEventListener("DOMContentLoaded", () => {
  const numeroInput = document.getElementById("f5000-numero");
  numeroInput.addEventListener("input", () => {
    numeroInput.value = numeroInput.value.replace(/\D/g, "");
    const valido = /^5000\d{6}$/.test(numeroInput.value);
    document.getElementById("f5000-submit").disabled = !valido;
    document.getElementById("f5000-hint").classList.toggle("show", numeroInput.value.length > 0 && !valido);
  });

  document.getElementById("f5000-submit").addEventListener("click", () => {
    const base = state.novoRecebimentoBase;
    const numero = numeroInput.value;
    state.recebimentos.unshift({
      id: Date.now(), numero, fornecedor: base.fornecedor, notaFiscal: base.notaFiscal,
      criadoEm: new Date(), espelhoImpresso: false, espelhoImpressoEm: null, mov105: false, mov105Em: null,
    });
    const pend = state.pendentes.find(p => p.id === base.pendenteId);
    if (pend) { pend.convertido = true; pend.numero5000 = numero; }
    state.tab = "recebimentos";
    fecharModal("modalNovo5000");
    render();
  });

  // Modal: Nova divergência
  const camposDiv = ["fd-notafiscal", "fd-fornecedor", "fd-descricao"];
  function checarDivergencia() {
    const ok = camposDiv.every(id => document.getElementById(id).value.trim().length > 0);
    document.getElementById("fd-submit").disabled = !ok;
  }
  camposDiv.forEach(id => document.getElementById(id).addEventListener("input", checarDivergencia));

  document.getElementById("fd-submit").addEventListener("click", () => {
    state.divergencias.unshift({
      id: Date.now(),
      notaFiscal: document.getElementById("fd-notafiscal").value,
      fornecedor: document.getElementById("fd-fornecedor").value,
      tipo: document.getElementById("fd-tipo").value,
      descricao: document.getElementById("fd-descricao").value,
      status: "aberta",
      abertaEm: new Date(),
    });
    camposDiv.forEach(id => (document.getElementById(id).value = ""));
    document.getElementById("fd-submit").disabled = true;
    fecharModal("modalDivergencia");
    render();
  });

  // Modal: Nova NF pendente
  const camposPend = ["fp-fornecedor", "fp-notafiscal"];
  function checarPendente() {
    const ok = camposPend.every(id => document.getElementById(id).value.trim().length > 0);
    document.getElementById("fp-submit").disabled = !ok;
  }
  camposPend.forEach(id => document.getElementById(id).addEventListener("input", checarPendente));

  document.getElementById("fp-submit").addEventListener("click", () => {
    state.pendentes.unshift({
      id: Date.now(),
      fornecedor: document.getElementById("fp-fornecedor").value,
      notaFiscal: document.getElementById("fp-notafiscal").value,
      numeroPedido: document.getElementById("fp-pedido").value.trim(),
      pedidoOk: modalPendenteChecks.pedidoOk,
      valorOk: modalPendenteChecks.valorOk,
      aprovacaoOk: modalPendenteChecks.aprovacaoOk,
      convertido: false,
      numero5000: null,
      observacao: "",
    });
    document.getElementById("fp-pedido").value = "";
    camposPend.forEach(id => (document.getElementById(id).value = ""));
    document.getElementById("fp-submit").disabled = true;
    resetModalPendenteChecks();
    fecharModal("modalNovaPendente");
    render();
  });

  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => fecharModal(btn.dataset.close));
  });
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", e => { if (e.target === overlay) fecharModal(overlay.id); });
  });

  render();
});

function abrirModal(id) { document.getElementById(id).classList.add("open"); }
function fecharModal(id) { document.getElementById(id).classList.remove("open"); }

// ---------- Render geral ----------
function render() {
  renderNav();
  renderMain();
}
