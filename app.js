// ---------- Estado (em memória — sem backend ainda) ----------
const state = {
  tab: "dashboard",
  pendentes: [],
  recebimentos: [],
  divergencias: [],
  novoRecebimentoBase: null, // { pendenteId, fornecedor, notaFiscal } quando o modal está aberto
  calendar: { year: new Date().getFullYear(), month: new Date().getMonth(), diaSelecionado: null },
  buscaRecebimentos: "",
  filtroRecebimentos: "todos",
  filtroPendentes: "todos",
  auditoria: [],
  usuarioAtual: "",
  previsoes: [],
  estornoBase: null,
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

function diaKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const TIPO_LABEL = {
  quantidade_incorreta: "Quantidade incorreta",
  material_incorreto: "Material incorreto",
  nf_divergente: "NF divergente",
  pedido_incorreto: "Pedido incorreto",
  preco_divergente: "Preço divergente",
  material_danificado: "Material danificado",
  fornecedor_incorreto: "Fornecedor incorreto",
  outros: "Outros",
};
const NOMES_MES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

// ---------- Auditoria ----------
function logAuditoria(acao, detalhe) {
  state.auditoria.unshift({
    id: Date.now() + Math.random(),
    ts: new Date(),
    usuario: state.usuarioAtual || "Não identificado",
    acao,
    detalhe,
  });
  if (state.auditoria.length > 300) state.auditoria.length = 300;
}

// ---------- Exportar CSV (abre no Excel) ----------
function exportarCSV(headers, rows, filename) {
  const linhas = [headers, ...rows].map(l =>
    l.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")
  );
  const csv = "\uFEFF" + linhas.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function statusRecebimento(r) {
  const bloqueado = notasComDivergenciaAberta().has(r.notaFiscal);
  if (bloqueado) return { label: "Divergência", tone: "red", emoji: "🔴", key: "divergencias" };
  if (r.mov105) return { label: "Concluído", tone: "green", emoji: "🟢", key: "concluidos" };
  if (r.espelhoImpresso) return { label: "Em conferência", tone: "blue", emoji: "🔵", key: "conferencia" };
  return { label: "Pendente", tone: "amber", emoji: "🟡", key: "pendentes" };
}

// ---------- Navegação ----------
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "🏠" },
  { id: "recebimentos", label: "Recebimentos", icon: "📥" },
  { id: "pendentes", label: "Pendentes", icon: "🟡" },
  { id: "divergencias", label: "Divergências", icon: "🔴" },
  { id: "historico", label: "Histórico", icon: "📋" },
];

function renderNav() {
  const nav = document.getElementById("nav");
  nav.innerHTML = "";
  NAV_ITEMS.forEach(item => {
    const btn = document.createElement("button");
    btn.className = "nav-item" + (state.tab === item.id ? " active" : "");
    let badge = "";
    if (item.id === "pendentes") {
      const n = state.pendentes.filter(p => !p.convertido).length;
      if (n) badge = `<span class="nav-badge">${n}</span>`;
    }
    if (item.id === "divergencias") {
      const n = state.divergencias.filter(d => d.status === "aberta").length;
      if (n) badge = `<span class="nav-badge">${n}</span>`;
    }
    btn.innerHTML = `<span class="icon">${item.icon}</span><span class="label">${item.label}</span>${badge}`;
    btn.onclick = () => { state.tab = item.id; fecharMenuMobile(); render(); };
    nav.appendChild(btn);
  });

  const divider = document.createElement("div");
  divider.className = "nav-divider";
  nav.appendChild(divider);

  const cfg = document.createElement("button");
  cfg.className = "nav-item" + (state.tab === "config" ? " active" : "");
  cfg.innerHTML = `<span class="icon">⚙️</span><span class="label">Configurações</span>`;
  cfg.onclick = () => { state.tab = "config"; fecharMenuMobile(); render(); };
  nav.appendChild(cfg);
}

function toggleMenu() {
  document.getElementById("sidebar").classList.toggle("mobile-open");
  document.getElementById("menuOverlay").classList.toggle("show");
}
function fecharMenuMobile() {
  document.getElementById("sidebar").classList.remove("mobile-open");
  document.getElementById("menuOverlay").classList.remove("show");
}

// ---------- Telas ----------
function renderMain() {
  const main = document.getElementById("main");
  if (state.tab === "dashboard") return (main.innerHTML = viewDashboard());
  if (state.tab === "recebimentos") return (main.innerHTML = viewRecebimentosBusca());
  if (state.tab === "pendentes") return (main.innerHTML = viewPendentes());
  if (state.tab === "divergencias") return (main.innerHTML = viewDivergencias());
  if (state.tab === "historico") return (main.innerHTML = viewHistorico());
  if (state.tab === "config") return (main.innerHTML = viewConfig());
}

// ===== Dashboard =====
function todasChegadas() {
  return [
    ...state.pendentes.filter(p => !p.convertido).map(p => p.chegadaEm || new Date()),
    ...state.recebimentos.map(r => r.chegadaEm || r.criadoEm),
  ];
}

function chegadasPorDia(n) {
  const chegadas = todasChegadas();
  const hoje = new Date();
  const dias = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - i);
    const key = diaKey(d);
    dias.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, count: chegadas.filter(c => diaKey(c) === key).length });
  }
  return dias;
}

function deltaChegadas() {
  const [ontem, hoje] = chegadasPorDia(2);
  if (ontem.count === 0 && hoje.count === 0) return null;
  if (ontem.count === 0) return { pct: 100, up: true };
  const pct = Math.round(((hoje.count - ontem.count) / ontem.count) * 100);
  return { pct, up: pct >= 0 };
}

const DONUT_COLORS = ["#2E3E52", "#D98E2B", "#B8462F", "#3A5A8C", "#3E7A5C", "#8A6FB0", "#5CA7A0", "#B0894F"];

function divergenciasPorTipo() {
  const contagem = {};
  state.divergencias.forEach(d => { contagem[d.tipo] = (contagem[d.tipo] || 0) + 1; });
  return Object.entries(contagem).map(([tipo, count]) => ({ label: TIPO_LABEL[tipo] || tipo, count }));
}

function donutChartHtml(dados) {
  const total = dados.reduce((s, d) => s + d.count, 0);
  if (!total) return `<div class="empty-state">Sem divergências registradas ainda.</div>`;
  let acc = 0;
  const stops = dados.map((d, i) => {
    const start = (acc / total) * 360;
    acc += d.count;
    const end = (acc / total) * 360;
    return `${DONUT_COLORS[i % DONUT_COLORS.length]} ${start}deg ${end}deg`;
  }).join(", ");
  const legend = dados.map((d, i) => `
    <div class="donut-legend-item">
      <span class="donut-dot" style="background:${DONUT_COLORS[i % DONUT_COLORS.length]}"></span>
      <span class="donut-legend-label">${d.label}</span>
      <span class="donut-legend-count">${d.count}</span>
    </div>`).join("");
  return `
    <div class="donut-wrap">
      <div class="donut" style="background: conic-gradient(${stops})"><div class="donut-hole"><span>${total}</span><small>total</small></div></div>
      <div class="donut-legend">${legend}</div>
    </div>`;
}

// ===== Previsão de chegadas (checklist do dia, independente do fluxo do 5000) =====
function resetModalPrevisao() {
  ["prev-fornecedor", "prev-notafiscal", "prev-transportadora"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const submit = document.getElementById("prev-submit");
  if (submit) submit.disabled = true;
  const confirm = document.getElementById("prev-confirm");
  if (confirm) confirm.textContent = "";
}

function previsoesHoje() {
  const hojeKey = diaKey(new Date());
  return state.previsoes.filter(p => diaKey(p.criadoEm) === hojeKey);
}

function togglePrevisaoChegou(id) {
  const p = state.previsoes.find(p => p.id === id);
  p.chegou = !p.chegou;
  p.chegouEm = p.chegou ? new Date() : null;
  if (p.chegou) logAuditoria("Marcou chegada prevista", `${p.fornecedor}${p.notaFiscal ? " — NF " + p.notaFiscal : ""}`);
  render();
}

function previsaoRowHtml(p) {
  const detalhes = [p.notaFiscal ? `NF ${p.notaFiscal}` : "", p.transportadora].filter(Boolean).join(" · ");
  return `
    <div class="prev-row ${p.chegou ? "chegou" : ""}">
      <span class="toggle ${p.chegou ? "on" : ""}" onclick="togglePrevisaoChegou(${p.id})"><span class="knob"></span></span>
      <div class="prev-info">
        <div class="prev-forn">${p.fornecedor}</div>
        <div class="prev-meta">${detalhes || "Sem detalhes extras"}</div>
      </div>
      <span class="prev-status">${p.chegou ? `✅ Chegou às ${fmtTime(p.chegouEm)}` : "⏳ Aguardando"}</span>
    </div>`;
}

function viewPrevisaoPanel() {
  const lista = previsoesHoje();
  const ordenada = [...lista.filter(p => !p.chegou), ...lista.filter(p => p.chegou)];
  return `
    <div class="prev-panel">
      <div class="prev-panel-head">
        <div>
          <div class="subsection-title" style="margin:0">Previsão de chegadas — hoje</div>
          <div class="section-sub">Cadastre quem é esperado hoje (mesmo sem NF ainda) e vá marcando conforme chega. É só uma conferência visual — o registro que gera o 5000 continua em Recebimentos.</div>
        </div>
        <button class="btn-outline" onclick="resetModalPrevisao(); abrirModal('modalPrevisao')">+ Adicionar previsão</button>
      </div>
      ${ordenada.length ? `<div class="prev-list">${ordenada.map(previsaoRowHtml).join("")}</div>` : `<div class="empty-state">Nenhuma previsão cadastrada pra hoje ainda.</div>`}
    </div>`;
}

// Últimas chegadas (com 5000 ou não), pra mostrar assim que o fornecedor chega — não só quando vira 5000
function ultimasChegadas(n) {
  const pend = state.pendentes.filter(p => !p.convertido)
    .map(p => ({ tipo: "pendente", ref: p, chegada: p.chegadaEm || new Date() }));
  const receb = state.recebimentos
    .map(r => ({ tipo: "recebimento", ref: r, chegada: r.chegadaEm || r.criadoEm }));
  return [...pend, ...receb].sort((a, b) => b.chegada - a.chegada).slice(0, n);
}

function viewDashboard() {
  const chegadasHojeCount = chegadasHoje().length;
  const pendentesAbertos = state.pendentes.filter(p => !p.convertido);
  const divergenciasAbertas = state.divergencias.filter(d => d.status === "aberta");
  const concluidos = state.recebimentos.filter(r => r.mov105);
  const ultimos = ultimasChegadas(5);
  const delta = deltaChegadas();

  const diasChegada = chegadasPorDia(7);
  const maxChegada = Math.max(1, ...diasChegada.map(d => d.count));
  const barsChegada = diasChegada.map(d => `
    <div class="bar-col">
      <div class="bar-val">${d.count}</div>
      <div class="bar" style="height:${Math.max(6, (d.count / maxChegada) * 160)}px"></div>
      <div class="bar-name">${d.label}</div>
    </div>`).join("");

  return `
    <div class="section-head">
      <div>
        <h1 class="section-title">Dashboard</h1>
        <div class="section-sub">Visão geral do setor de recebimento.</div>
      </div>
    </div>

    <div class="dash-stat-row">
      <div class="stat-card stat-card-dash">
        <span class="stat-icon-badge" style="background:#E5EAF3">📥</span>
        ${delta ? `<span class="delta-chip ${delta.up ? "up" : "down"}">${delta.up ? "▲" : "▼"} ${Math.abs(delta.pct)}%</span>` : ""}
        <div class="stat-label" style="margin-top:8px">Chegaram hoje</div>
        <div class="stat-value">${chegadasHojeCount}</div>
        <div class="dash-stat-sub">vs. ontem</div>
      </div>
      <div class="stat-card stat-card-dash">
        <span class="stat-icon-badge" style="background:#FBF0DD">🟡</span>
        <div class="stat-label" style="margin-top:8px">Pendentes</div>
        <div class="stat-value">${pendentesAbertos.length}</div>
        <div class="dash-stat-sub">aguardando conferência</div>
      </div>
      <div class="stat-card stat-card-dash">
        <span class="stat-icon-badge" style="background:#F8E7E2">🔴</span>
        <div class="stat-label" style="margin-top:8px">Divergências</div>
        <div class="stat-value">${divergenciasAbertas.length}</div>
        <div class="dash-stat-sub">em aberto</div>
      </div>
      <div class="stat-card stat-card-dash">
        <span class="stat-icon-badge" style="background:#E8F1EC">✅</span>
        <div class="stat-label" style="margin-top:8px">Concluídos</div>
        <div class="stat-value">${concluidos.length}</div>
        <div class="dash-stat-sub">mov. 105 lançada</div>
      </div>
    </div>

    <div class="dash-actions">
      <button class="btn-outline" onclick="irPara('pendentes')">Ver pendências</button>
      <button class="btn-outline" style="border-color:var(--red); color:var(--red)" onclick="irPara('divergencias')">Ver divergências</button>
    </div>

    ${viewPrevisaoPanel()}

    <div class="dash-charts-row">
      <div class="chart-panel">
        <div class="chart-title">Recebimentos — últimos 7 dias</div>
        <div class="bars">${barsChegada}</div>
      </div>
      <div class="chart-panel">
        <div class="chart-title">Divergências por tipo</div>
        ${donutChartHtml(divergenciasPorTipo())}
      </div>
    </div>

    <div class="subsection-title">Últimos recebimentos</div>
    ${tabelaRecebimentosHtml(ultimos, "Nenhum recebimento lançado ainda.", false)}`;
}

function irPara(tab) {
  state.tab = tab;
  render();
}

// ===== Tabela padrão de recebimentos (Dashboard, Recebimentos e Histórico usam a mesma) =====
function linhaRecebimentoHtml(item, interativo) {
  if (item.tipo === "recebimento") {
    const r = item.ref;
    const bloqueado = notasComDivergenciaAberta().has(r.notaFiscal);
    let statusLabel, statusTone;
    if (r.estornado) { statusLabel = "Estornado"; statusTone = "gray"; }
    else if (r.mov105) { statusLabel = "Concluído"; statusTone = "green"; }
    else if (bloqueado) { statusLabel = "Bloqueado"; statusTone = "red"; }
    else { statusLabel = "Em andamento"; statusTone = "amber"; }

    const podeEditar = interativo && !r.estornado;
    const espelhoCell = podeEditar
      ? `<div class="toggle-cell">
          <span class="toggle ${r.espelhoImpresso ? "on" : ""}" onclick="toggleEspelho(${r.id})"><span class="knob"></span></span>
          <span class="toggle-time">${r.espelhoImpressoEm ? fmtTime(r.espelhoImpressoEm) : ""}</span>
        </div>`
      : (r.espelhoImpresso
          ? `<span class="info-badge info-ok">✓ ${fmtTime(r.espelhoImpressoEm)}</span>`
          : `<span class="info-badge info-pending">—</span>`);
    const mov105Cell = podeEditar
      ? `<div class="toggle-cell">
          <span class="toggle ${r.mov105 ? "on" : ""} ${bloqueado && !r.mov105 ? "disabled" : ""}"
                title="${bloqueado && !r.mov105 ? "Bloqueado: há divergência aberta para esta NF" : ""}"
                onclick="toggleMov105(${r.id}, ${bloqueado})"><span class="knob"></span></span>
          <span class="toggle-time">${r.mov105Em ? fmtTime(r.mov105Em) : ""}</span>
        </div>`
      : (r.mov105
          ? `<span class="info-badge info-ok">✓ ${fmtTime(r.mov105Em)}</span>`
          : `<span class="info-badge info-pending">—</span>`);

    const statusCell = `
      <span class="pill pill-${statusTone}">${statusLabel}</span> ${bloqueado && !r.mov105 && !r.estornado ? "🚫" : ""}
      ${r.estornado && r.motivoEstorno ? `<div class="estorno-motivo">Motivo: ${r.motivoEstorno}</div>` : ""}
      ${interativo && !r.estornado ? `<button class="btn-link-danger" onclick="abrirEstorno(${r.id})">↩ Estornar</button>` : ""}`;

    return `
      <tr class="${r.estornado ? "row-estornado" : ""}">
        <td><span class="stamp-tag" id="stamp-${r.id}" onclick="copiarNumero(${r.id})">${r.numero} 📋</span></td>
        <td class="fornecedor-nome">${r.fornecedor}</td>
        <td class="fornecedor-nf">${r.notaFiscal}</td>
        <td class="dt">${fmtTime(r.chegadaEm || r.criadoEm)}</td>
        <td>${espelhoCell}</td>
        <td>${mov105Cell}</td>
        <td>${statusCell}</td>
      </tr>`;
  }
  // pendente — chegou, mas a fiscal ainda não liberou o 5000
  const p = item.ref;
  const st = statusChegada(item);
  return `
    <tr class="row-clickable" onclick="irPara('pendentes')">
      <td><span class="dt">Aguardando fiscal</span></td>
      <td class="fornecedor-nome">${p.fornecedor}</td>
      <td class="fornecedor-nf">${p.notaFiscal}</td>
      <td class="dt">${fmtTime(p.chegadaEm)}</td>
      <td class="dt">—</td>
      <td class="dt">—</td>
      <td><span class="pill pill-${st.tone}">${st.emoji} ${st.label}</span></td>
    </tr>`;
}

function tabelaRecebimentosHtml(itens, vazioTexto, interativo) {
  const rows = itens.map(item => linhaRecebimentoHtml(item, interativo)).join("");
  return `
    <div class="panel-table">
      <table>
        <thead><tr><th>5000</th><th>Forn.</th><th>NF</th><th>Chegou</th><th>Espelho impresso</th><th>Mov. 105</th><th>Status</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="7" class="empty-state">${vazioTexto}</td></tr>`}</tbody>
      </table>
    </div>`;
}

// ===== Recebimentos (quadro do dia: busca / filtro) =====
function viewRecebimentosBusca() {
  return `
    <div class="section-head">
      <div>
        <h1 class="section-title">Recebimentos</h1>
        <div class="section-sub">Tudo que chegou hoje. Registre a chegada aqui — a conferência (Pedido/Valor/Aprovação) acontece em Pendentes. Depois que a fiscal criar o 5000, marque espelho impresso e mov. 105 direto nesta lista.</div>
      </div>
      <button class="btn-primary" onclick="resetModalPendenteChecks(); abrirModal('modalNovaPendente')">+ Registrar chegada</button>
    </div>
    <div class="busca-row">
      <input class="field-input search-input" id="busca-receb" placeholder="🔎 Buscar NF, fornecedor ou 5000..."
             value="${state.buscaRecebimentos}" oninput="atualizarBuscaRecebimentos(this.value)">
    </div>
    <div class="filter-chips" id="filtro-chips">${filterChipsHtml()}</div>
    <div id="lista-recebimentos-busca">${listaRecebimentosBuscaHtml()}</div>
    <div class="section-sub" style="margin-top:18px">Procurando de outro dia? Veja no <a href="#" onclick="irPara('historico'); return false;">Histórico</a>.</div>`;
}

// Unifica pendentes (ainda sem 5000) + recebimentos (já com 5000) que chegaram hoje
function chegadasHoje() {
  const hojeKey = diaKey(new Date());
  const pend = state.pendentes.filter(p => !p.convertido && diaKey(p.chegadaEm || new Date()) === hojeKey)
    .map(p => ({ tipo: "pendente", ref: p, chegada: p.chegadaEm || new Date() }));
  const receb = state.recebimentos.filter(r => diaKey(r.chegadaEm || r.criadoEm) === hojeKey)
    .map(r => ({ tipo: "recebimento", ref: r, chegada: r.chegadaEm || r.criadoEm }));
  return [...pend, ...receb].sort((a, b) => b.chegada - a.chegada);
}

function statusChegada(item) {
  if (item.tipo === "recebimento") return statusRecebimento(item.ref);
  const p = item.ref;
  if (p.pedidoOk && p.valorOk && p.aprovacaoOk) {
    return { label: "Liberado p/ 5000", tone: "amber", emoji: "🟡", key: "pendentes" };
  }
  const faltando = [];
  if (!p.pedidoOk) faltando.push("Pedido");
  if (!p.valorOk) faltando.push("Valor");
  if (!p.aprovacaoOk) faltando.push("Aprovação");
  return { label: faltando.join(", "), tone: "amber", emoji: "🟡", key: "pendentes" };
}

function filterChipsHtml() {
  const chips = [
    { key: "todos", label: "Todos" },
    { key: "pendentes", label: "Pendentes" },
    { key: "conferencia", label: "Em conferência" },
    { key: "concluidos", label: "Concluídos" },
    { key: "divergencias", label: "Divergências" },
  ];
  return chips.map(c => `<button class="chip ${state.filtroRecebimentos === c.key ? "active" : ""}" onclick="filtrarRecebimentos('${c.key}')">${c.label}</button>`).join("");
}

function listaRecebimentosBuscaHtml() {
  const termo = state.buscaRecebimentos.trim().toLowerCase();
  const lista = chegadasHoje().filter(item => {
    const st = statusChegada(item);
    if (state.filtroRecebimentos !== "todos" && st.key !== state.filtroRecebimentos) return false;
    if (!termo) return true;
    const numero = item.tipo === "recebimento" ? item.ref.numero : "";
    return item.ref.notaFiscal.toLowerCase().includes(termo) || item.ref.fornecedor.toLowerCase().includes(termo) || numero.toLowerCase().includes(termo);
  });
  return tabelaRecebimentosHtml(lista, "Nada chegou hoje ainda.", true);
}

function atualizarBuscaRecebimentos(valor) {
  state.buscaRecebimentos = valor;
  document.getElementById("lista-recebimentos-busca").innerHTML = listaRecebimentosBuscaHtml();
}

function filtrarRecebimentos(chave) {
  state.filtroRecebimentos = chave;
  document.getElementById("filtro-chips").innerHTML = filterChipsHtml();
  document.getElementById("lista-recebimentos-busca").innerHTML = listaRecebimentosBuscaHtml();
}

// ===== Pendentes =====
const PENDENTES_FILTROS = [
  { key: "todos", label: "Todos" },
  { key: "falta_pedido", label: "Falta Pedido" },
  { key: "falta_valor", label: "Falta Valor" },
  { key: "falta_aprovacao", label: "Falta Aprovação" },
  { key: "liberado", label: "Liberado p/ 5000" },
  { key: "convertido", label: "Já com 5000" },
];

function pendenteMatchesFiltro(p, filtro) {
  if (filtro === "todos") return true;
  if (filtro === "falta_pedido") return !p.pedidoOk && !p.convertido;
  if (filtro === "falta_valor") return !p.valorOk && !p.convertido;
  if (filtro === "falta_aprovacao") return !p.aprovacaoOk && !p.convertido;
  if (filtro === "liberado") return !p.convertido && p.pedidoOk && p.valorOk && p.aprovacaoOk;
  if (filtro === "convertido") return p.convertido;
  return true;
}

function pendentesFilterChipsHtml() {
  return PENDENTES_FILTROS.map(c => `<button class="chip ${state.filtroPendentes === c.key ? "active" : ""}" onclick="filtrarPendentes('${c.key}')">${c.label}</button>`).join("");
}

function filtrarPendentes(chave) {
  state.filtroPendentes = chave;
  document.getElementById("filtro-chips-pend").innerHTML = pendentesFilterChipsHtml();
  document.getElementById("lista-pendentes").innerHTML = listaPendentesHtml();
}

function listaPendentesHtml() {
  const lista = state.pendentes.filter(p => pendenteMatchesFiltro(p, state.filtroPendentes));
  const rows = lista.map(p => {
    const liberado = p.pedidoOk && p.valorOk && p.aprovacaoOk;
    const tone = p.convertido || liberado ? "left-green" : "left-amber";
    return `
      <div class="card ${tone}">
        <div class="pend-info">
          <div class="nome">Fornecedor: ${p.fornecedor}</div>
          <div class="nf">NF: ${p.notaFiscal}</div>
          <input class="field-input pend-inline-input" placeholder="Nº do pedido (opcional)"
                 value="${p.numeroPedido || ""}" oninput="atualizarPedidoPendente(${p.id}, this.value)">
          <input class="field-input pend-inline-input" placeholder="Notas..."
                 value="${p.observacao || ""}" oninput="atualizarObservacaoPendente(${p.id}, this.value)">
        </div>
        <div class="checks">
          ${checkFieldHtml("Pedido", p.pedidoOk, `togglePendente(${p.id},'pedidoOk')`, p.convertido)}
          ${checkFieldHtml("Valor", p.valorOk, `togglePendente(${p.id},'valorOk')`, p.convertido)}
          ${checkFieldHtml("Aprovação", p.aprovacaoOk, `togglePendente(${p.id},'aprovacaoOk')`, p.convertido)}
        </div>
        ${p.convertido
          ? `<span class="stamp-tag" id="stamp-pend-${p.id}" onclick="copiarNumeroPendente(${p.id})">5000 criado: ${p.numero5000} 📋</span>`
          : `<div style="display:flex; gap:8px; align-items:center">
              <button class="btn-primary" ${liberado ? "" : "disabled"} onclick="abrirNovo5000(${p.id})">+ Criar 5000</button>
              <button class="btn-link-danger" onclick="excluirPendente(${p.id})">🗑 Excluir</button>
             </div>`}
      </div>`;
  }).join("");
  return `<div class="card-list">${rows || `<div class="empty-state">Nada encontrado com esse filtro.</div>`}</div>`;
}

function viewPendentes() {
  return `
    <div class="section-head">
      <div>
        <h1 class="section-title">Pendentes</h1>
        <div class="section-sub">A fiscal confere pedido, valor e aprovação do compras. Fica na lista mesmo depois do 5000, para o levantamento do dia. Novas chegadas são registradas em <a href="#" onclick="irPara('recebimentos'); return false;">Recebimentos</a>.</div>
      </div>
    </div>
    <div class="filter-chips" id="filtro-chips-pend">${pendentesFilterChipsHtml()}</div>
    <div id="lista-pendentes">${listaPendentesHtml()}</div>`;
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

function atualizarPedidoPendente(id, valor) {
  const p = state.pendentes.find(p => p.id === id);
  if (p) p.numeroPedido = valor;
}

function atualizarObservacaoPendente(id, valor) {
  const p = state.pendentes.find(p => p.id === id);
  if (p) p.observacao = valor;
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

function togglePendente(id, campo) {
  const p = state.pendentes.find(p => p.id === id);
  if (p.convertido) return;
  p[campo] = !p[campo];
  render();
}

function excluirPendente(id) {
  const p = state.pendentes.find(p => p.id === id);
  if (!p || p.convertido) return;
  confirmarAcao(
    "Excluir chegada",
    `Excluir a chegada de ${p.fornecedor} (NF ${p.notaFiscal})? Essa ação não pode ser desfeita.`,
    () => {
      state.pendentes = state.pendentes.filter(x => x.id !== id);
      logAuditoria("Excluiu chegada", `NF ${p.notaFiscal} — ${p.fornecedor}`);
      render();
    }
  );
}

// ===== Divergências =====
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

  const divRows = state.divergencias.map(d => {
    const evidenciasHtml = (d.evidencias && d.evidencias.length)
      ? `<div class="card-evidencias">${d.evidencias.map(ev => `
          <a class="card-evidencia-thumb" href="${ev.dataUrl}" target="_blank" title="${ev.nome}">
            ${ev.tipo.startsWith("image/") ? `<img src="${ev.dataUrl}">` : `📎`}
          </a>`).join("")}</div>`
      : "";
    return `
    <div class="card ${d.status === "aberta" ? "left-red" : "left-green"}">
      <div class="div-body" style="flex:1">
        <div class="div-top">
          <span class="nf">${d.notaFiscal}</span>
          <span class="pill pill-gray">${TIPO_LABEL[d.tipo]}</span>
          <span class="pill ${d.status === "aberta" ? "pill-red" : "pill-green"}">${d.status === "aberta" ? "Aberta" : "Resolvida"}</span>
        </div>
        <div class="div-desc">${d.descricao}</div>
        <div class="div-meta">${d.fornecedor} · aberta em ${fmtTime(d.abertaEm)}</div>
        ${evidenciasHtml}
        <input class="field-input obs-input" style="margin-top:8px; margin-bottom:0;" placeholder="Notas..."
               value="${d.notas || ""}" oninput="atualizarNotaDivergencia(${d.id}, this.value)">
      </div>
      ${d.status === "aberta" ? `<button class="btn-outline" onclick="resolverDivergencia(${d.id})">✓ Marcar resolvida</button>` : ""}
    </div>`;
  }).join("");

  const ocorrencias = state.recebimentos
    .filter(r => r.estornado)
    .sort((a, b) => b.estornadoEm - a.estornadoEm);
  const ocorrenciasRows = ocorrencias.map(r => `
    <div class="card left-red">
      <div class="div-body" style="flex:1">
        <div class="div-top">
          <span class="nf">${r.notaFiscal}</span>
          <span class="pill pill-gray">Estornado</span>
        </div>
        <div class="div-desc">${r.motivoEstorno || "Sem motivo registrado."}</div>
        <div class="div-meta">${r.fornecedor} · nº ${r.numero} · estornado em ${fmtTime(r.estornadoEm)}</div>
      </div>
    </div>`).join("");

  return `
    <div class="section-head">
      <div>
        <h1 class="section-title">Divergências</h1>
        <div class="section-sub">Tudo que está atrasando o lançamento do 105 — pendências do compras e divergências registradas.</div>
      </div>
      <button class="btn-primary" onclick="resetModalDivergenciaEvidencias(); abrirModal('modalDivergencia')">+ Registrar divergência</button>
    </div>
    <div class="subsection-title">Aguardando conferência do compras</div>
    <div class="card-list">${atrasoRows || `<div class="empty-state">Nada pendente de compras no momento.</div>`}</div>
    <div class="subsection-title">Divergências registradas</div>
    <div class="card-list">${divRows || `<div class="empty-state">Nenhuma divergência registrada.</div>`}</div>
    <div class="subsection-title">Ocorrências</div>
    <div class="section-sub" style="margin-top:-8px; margin-bottom:12px">Indicador do que aconteceu no processo — por enquanto, lançamentos estornados (o motivo é o que a fiscal ou o recebimento escreveu na hora do estorno).</div>
    <div class="card-list">${ocorrenciasRows || `<div class="empty-state">Nenhuma ocorrência registrada.</div>`}</div>`;
}

function atualizarNotaDivergencia(id, valor) {
  const d = state.divergencias.find(d => d.id === id);
  if (d) d.notas = valor;
}

function resolverDivergencia(id) {
  const d = state.divergencias.find(d => d.id === id);
  d.status = "resolvida";
  logAuditoria("Resolveu divergência", `NF ${d.notaFiscal} — ${TIPO_LABEL[d.tipo]}`);
  render();
}

// ===== Histórico (agenda + tabela + toggles) =====
function calendarHtml() {
  const { year, month, diaSelecionado } = state.calendar;
  const primeiroDia = new Date(year, month, 1);
  const diasNoMes = new Date(year, month + 1, 0).getDate();
  const offset = primeiroDia.getDay();
  const diasComRecebimento = new Set([
    ...state.recebimentos.map(r => diaKey(r.chegadaEm || r.criadoEm)),
    ...state.pendentes.filter(p => !p.convertido).map(p => diaKey(p.chegadaEm || new Date())),
  ]);

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

function recebimentosNoPeriodo() {
  const { year, month, diaSelecionado } = state.calendar;
  if (diaSelecionado) return state.recebimentos.filter(r => diaKey(r.criadoEm) === diaSelecionado);
  return state.recebimentos.filter(r => r.criadoEm.getFullYear() === year && r.criadoEm.getMonth() === month);
}

// Todos os fornecedores/NFs que chegaram no período — com 5000 ou não (pendentes)
function itensNoPeriodo() {
  const { year, month, diaSelecionado } = state.calendar;
  const pend = state.pendentes.filter(p => !p.convertido)
    .map(p => ({ tipo: "pendente", ref: p, chegada: p.chegadaEm || new Date() }));
  const receb = state.recebimentos
    .map(r => ({ tipo: "recebimento", ref: r, chegada: r.chegadaEm || r.criadoEm }));
  const todos = [...pend, ...receb];
  const filtrados = diaSelecionado
    ? todos.filter(i => diaKey(i.chegada) === diaSelecionado)
    : todos.filter(i => i.chegada.getFullYear() === year && i.chegada.getMonth() === month);
  return filtrados.sort((a, b) => b.chegada - a.chegada);
}

function periodoLabel() {
  const { year, month, diaSelecionado } = state.calendar;
  if (diaSelecionado) {
    const [y, m, d] = diaSelecionado.split("-").map(Number);
    return `${d} de ${NOMES_MES[m]} de ${y}`;
  }
  return `${NOMES_MES[month]} de ${year}`;
}

function viewHistorico() {
  const diaSel = state.calendar.diaSelecionado;
  const lista = recebimentosNoPeriodo(); // só os que já têm 5000 — usado no relatório
  const itens = itensNoPeriodo(); // todos que chegaram, com 5000 ou não — usado na tabela

  const filtroBar = `<div class="filtro-bar">Mostrando: <strong>${periodoLabel()}</strong> ${diaSel ? `<button class="btn-outline" onclick="limparFiltroDia()">Ver mês inteiro</button>` : ""}</div>`;

  const auditoriaHtml = state.auditoria.slice(0, 15).map(a => `
    <div class="audit-item">
      <span class="audit-time">${fmtTime(a.ts)}</span>
      <span class="audit-user">${a.usuario}</span>
      <span class="audit-acao">${a.acao}</span>
      <span class="audit-detalhe">— ${a.detalhe}</span>
    </div>`).join("");

  // Relatório: acompanha o mesmo período que está sendo visto no calendário
  // Tempo médio conta desde a chegada (quando a fiscal começa a conferência) até a mov. 105
  const concluidos = lista.filter(r => r.mov105 && r.mov105Em);
  const dados = concluidos.map(r => ({ nf: r.notaFiscal, minutos: Math.round((r.mov105Em - (r.chegadaEm || r.criadoEm)) / 60000) }));
  const mediaMin = dados.length ? Math.round(dados.reduce((s, d) => s + d.minutos, 0) / dados.length) : null;
  const emAndamento = lista.filter(r => !r.mov105).length;
  const maxMin = Math.max(1, ...dados.map(d => d.minutos));
  const bars = dados.map(d => `
    <div class="bar-col">
      <div class="bar-val">${d.minutos}min</div>
      <div class="bar" style="height:${Math.max(6, (d.minutos / maxMin) * 180)}px"></div>
      <div class="bar-name">NF:${d.nf}</div>
    </div>`).join("");

  return `
    <div class="section-head">
      <div>
        <h1 class="section-title">Histórico</h1>
        <div class="section-sub">Todo fornecedor/NF que chegou aparece aqui — com 5000 já criado ou ainda pendente. O relatório abaixo acompanha o período selecionado no calendário.</div>
      </div>
      <button class="btn-outline" onclick="exportarHistoricoCSV()">📊 Exportar CSV</button>
    </div>
    <div class="receb-layout">
      ${calendarHtml()}
      <div class="panel-table">
        ${filtroBar}
        <table>
          <thead><tr><th>5000</th><th>Forn.</th><th>NF</th><th>Chegou</th><th>Espelho impresso</th><th>Mov. 105</th><th>Status</th></tr></thead>
          <tbody>${itens.length ? itens.map(item => linhaRecebimentoHtml(item, false)).join("") : `<tr><td colspan="7" class="empty-state">Nenhum recebimento em ${periodoLabel()}.</td></tr>`}</tbody>
        </table>
      </div>
    </div>

    <div class="subsection-title" style="margin-top:24px">Relatório — ${periodoLabel()}</div>
    <div class="stat-row">
      <div class="stat-card"><div class="stat-label">⏱ Tempo médio (chegada → 105)</div><div class="stat-value">${mediaMin != null ? fmtDuration(mediaMin * 60000) : "—"}</div></div>
      <div class="stat-card"><div class="stat-label" style="color:var(--green)">✓ Concluídos</div><div class="stat-value">${concluidos.length}</div></div>
      <div class="stat-card"><div class="stat-label" style="color:var(--amber)">⏱ Em andamento</div><div class="stat-value">${emAndamento}</div></div>
    </div>
    <div class="chart-panel">
      <div class="chart-title">Minutos até o 105 (desde a chegada), por recebimento concluído</div>
      ${dados.length ? `<div class="bars">${bars}</div>` : `<div class="empty-state">Nenhum recebimento concluído em ${periodoLabel()}.</div>`}
      <div style="text-align:right; margin-top:10px"><button class="btn-outline" onclick="exportarRelatorioCSV()">📊 Exportar CSV do relatório</button></div>
    </div>

    <div class="subsection-title" style="margin-top:24px">Trilha de auditoria</div>
    <div class="audit-panel">${auditoriaHtml || `<div class="empty-state">Nenhuma atividade registrada ainda.</div>`}</div>`;
}

function exportarHistoricoCSV() {
  const itens = itensNoPeriodo();
  const bloqueadas = notasComDivergenciaAberta();
  const headers = ["5000", "Fornecedor", "NF", "Chegou em", "Espelho impresso", "Mov. 105", "Status"];
  const rows = itens.map(item => {
    if (item.tipo === "pendente") {
      const p = item.ref;
      const st = statusChegada(item);
      return ["Aguardando fiscal", p.fornecedor, p.notaFiscal, fmtTime(p.chegadaEm), "—", "—", st.label];
    }
    const r = item.ref;
    const bloqueado = bloqueadas.has(r.notaFiscal);
    const status = r.mov105 ? "Concluído" : bloqueado ? "Bloqueado" : "Em andamento";
    return [r.numero, r.fornecedor, r.notaFiscal, fmtTime(r.chegadaEm || r.criadoEm), r.espelhoImpresso ? fmtTime(r.espelhoImpressoEm) : "Não", r.mov105 ? fmtTime(r.mov105Em) : "Não", status];
  });
  exportarCSV(headers, rows, `doca105-historico-${periodoLabel().replace(/\s/g, "-")}.csv`);
}

function exportarRelatorioCSV() {
  const lista = recebimentosNoPeriodo();
  const concluidos = lista.filter(r => r.mov105 && r.mov105Em);
  const headers = ["5000", "Fornecedor", "NF", "Chegou em", "Concluído em", "Minutos (chegada → 105)"];
  const rows = concluidos.map(r => [r.numero, r.fornecedor, r.notaFiscal, fmtTime(r.chegadaEm || r.criadoEm), fmtTime(r.mov105Em), Math.round((r.mov105Em - (r.chegadaEm || r.criadoEm)) / 60000)]);
  exportarCSV(headers, rows, `doca105-relatorio-${periodoLabel().replace(/\s/g, "-")}.csv`);
}

function mudarMes(delta) {
  state.calendar.month += delta;
  if (state.calendar.month < 0) { state.calendar.month = 11; state.calendar.year--; }
  if (state.calendar.month > 11) { state.calendar.month = 0; state.calendar.year++; }
  state.calendar.diaSelecionado = null;
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
  if (r.estornado) return;
  r.espelhoImpresso = !r.espelhoImpresso;
  r.espelhoImpressoEm = r.espelhoImpresso ? new Date() : null;
  if (r.espelhoImpresso) logAuditoria("Imprimiu espelho", `NF ${r.notaFiscal} — nº ${r.numero}`);
  render();
}

function toggleMov105(id, bloqueado) {
  const r = state.recebimentos.find(r => r.id === id);
  if (r.estornado) return;
  if (bloqueado && !r.mov105) return;
  r.mov105 = !r.mov105;
  r.mov105Em = r.mov105 ? new Date() : null;
  if (r.mov105) logAuditoria("Lançou mov. 105", `NF ${r.notaFiscal} — nº ${r.numero}`);
  render();
}

// ===== Configurações =====
function viewConfig() {

  return `
    <div class="section-head">
      <div>
        <h1 class="section-title">Configurações</h1>
        <div class="section-sub">Ainda sem login de verdade — só um nome pra identificar quem fez cada lançamento na trilha de auditoria.</div>
      </div>
    </div>
    <div class="subsection-title">Responsável</div>
    <div class="responsavel-row">
      <input class="field-input" id="cfg-usuario" placeholder="Seu nome" value="${state.usuarioAtual}" onkeydown="if(event.key==='Enter'){event.preventDefault();salvarUsuarioAtual();}">
      <button class="btn-primary" onclick="salvarUsuarioAtual()">Salvar</button>
    </div>
    <div class="responsavel-atual">${state.usuarioAtual ? `Lançamentos atuais serão registrados como <strong>${state.usuarioAtual}</strong>.` : "Nenhum responsável definido — lançamentos ficam como \"Não identificado\"."}</div>
    <div class="subsection-title" style="margin-top:28px">Integrações</div>
    <div class="empty-state">Login de usuários, integração com Arquivei e com SAP ainda não implementados nesta versão do protótipo.</div>`;
}

function salvarUsuarioAtual() {
  state.usuarioAtual = document.getElementById("cfg-usuario").value.trim();
  render();
}

// ---------- Modal: Criar 5000 ----------
function abrirNovo5000(pendenteId) {
  const p = state.pendentes.find(p => p.id === pendenteId);
  state.novoRecebimentoBase = { pendenteId, fornecedor: p.fornecedor, notaFiscal: p.notaFiscal, chegadaEm: p.chegadaEm };
  document.getElementById("f5000-fornecedor").textContent = p.fornecedor;
  document.getElementById("f5000-notafiscal").textContent = p.notaFiscal;
  document.getElementById("f5000-numero").value = "";
  document.getElementById("f5000-submit").disabled = true;
  document.getElementById("f5000-hint").classList.remove("show");
  abrirModal("modalNovo5000");
}

// ---------- Modal: Estornar 5000 ----------
function abrirEstorno(id) {
  const r = state.recebimentos.find(r => r.id === id);
  if (!r) return;
  state.estornoBase = { id };
  document.getElementById("estorno-nf").textContent = `${r.notaFiscal} — ${r.fornecedor} — nº ${r.numero}`;
  document.getElementById("estorno-motivo").value = "";
  document.getElementById("estorno-submit").disabled = true;
  abrirModal("modalEstorno");
}

let modalPendenteChecks = { pedidoOk: false, valorOk: false, aprovacaoOk: false };
let chegadasRegistradasNestaSessao = 0;

function toggleModalPendente(campo) {
  modalPendenteChecks[campo] = !modalPendenteChecks[campo];
  const el = document.getElementById(`fp-check-${campo}`);
  el.classList.toggle("on", modalPendenteChecks[campo]);
}

function resetModalPendenteChecks() {
  modalPendenteChecks = { pedidoOk: false, valorOk: false, aprovacaoOk: false };
  chegadasRegistradasNestaSessao = 0;
  ["pedidoOk", "valorOk", "aprovacaoOk"].forEach(campo => {
    document.getElementById(`fp-check-${campo}`).classList.remove("on");
  });
  const confirm = document.getElementById("fp-confirm");
  if (confirm) confirm.textContent = "";
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
      chegadaEm: base.chegadaEm || new Date(),
      criadoEm: new Date(), espelhoImpresso: false, espelhoImpressoEm: null, mov105: false, mov105Em: null,
      estornado: false, motivoEstorno: "", estornadoEm: null,
    });
    const pend = state.pendentes.find(p => p.id === base.pendenteId);
    if (pend) { pend.convertido = true; pend.numero5000 = numero; }
    logAuditoria("Criou 5000", `NF ${base.notaFiscal} — ${base.fornecedor} — nº ${numero}`);
    fecharModal("modalNovo5000");
    render();
  });

  // Modal: Confirmação genérica
  document.getElementById("confirm-ok-btn").addEventListener("click", () => {
    fecharModal("modalConfirmacao");
    const cb = confirmacaoCallback;
    confirmacaoCallback = null;
    if (cb) cb();
  });

  // Modal: Estornar 5000
  document.getElementById("estorno-motivo").addEventListener("input", () => {
    document.getElementById("estorno-submit").disabled = document.getElementById("estorno-motivo").value.trim().length === 0;
  });
  document.getElementById("estorno-submit").addEventListener("click", () => {
    const r = state.recebimentos.find(r => r.id === state.estornoBase.id);
    const motivo = document.getElementById("estorno-motivo").value.trim();
    r.estornado = true;
    r.motivoEstorno = motivo;
    r.estornadoEm = new Date();
    logAuditoria("Estornou 5000", `NF ${r.notaFiscal} — nº ${r.numero} — motivo: ${motivo}`);
    fecharModal("modalEstorno");
    render();
  });

  // Modal: Nova divergência
  const camposDiv = ["fd-notafiscal", "fd-fornecedor", "fd-descricao"];
  function checarDivergencia() {
    const ok = camposDiv.every(id => document.getElementById(id).value.trim().length > 0);
    document.getElementById("fd-submit").disabled = !ok;
  }
  camposDiv.forEach(id => document.getElementById(id).addEventListener("input", checarDivergencia));

  // Evidências: leitura dos arquivos como base64, guardados só em memória
  let evidenciasSelecionadas = [];
  function renderEvidenciasPreview() {
    const el = document.getElementById("fd-evidencias-preview");
    el.innerHTML = evidenciasSelecionadas.map((ev, i) => `
      <div class="evidencia-item">
        ${ev.tipo.startsWith("image/") ? `<img src="${ev.dataUrl}">` : `📎`}
        <button class="evidencia-remove" type="button" onclick="removerEvidencia(${i})">✕</button>
      </div>`).join("");
  }
  window.removerEvidencia = function (i) {
    evidenciasSelecionadas.splice(i, 1);
    renderEvidenciasPreview();
  };
  window.resetModalDivergenciaEvidencias = function () {
    evidenciasSelecionadas = [];
    renderEvidenciasPreview();
  };
  document.getElementById("fd-evidencias").addEventListener("change", (e) => {
    const arquivos = Array.from(e.target.files || []);
    arquivos.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        evidenciasSelecionadas.push({ nome: file.name, tipo: file.type, dataUrl: reader.result });
        renderEvidenciasPreview();
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  });

  document.getElementById("fd-submit").addEventListener("click", () => {
    const notaFiscal = document.getElementById("fd-notafiscal").value;
    const fornecedor = document.getElementById("fd-fornecedor").value;
    const tipo = document.getElementById("fd-tipo").value;
    state.divergencias.unshift({
      id: Date.now(),
      notaFiscal,
      fornecedor,
      tipo,
      descricao: document.getElementById("fd-descricao").value,
      status: "aberta",
      abertaEm: new Date(),
      notas: "",
      evidencias: evidenciasSelecionadas,
    });
    logAuditoria("Registrou divergência", `NF ${notaFiscal} — ${TIPO_LABEL[tipo]}${evidenciasSelecionadas.length ? ` — ${evidenciasSelecionadas.length} evidência(s)` : ""}`);
    camposDiv.forEach(id => (document.getElementById(id).value = ""));
    document.getElementById("fd-submit").disabled = true;
    evidenciasSelecionadas = [];
    renderEvidenciasPreview();
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
    const fornecedor = document.getElementById("fp-fornecedor").value;
    const notaFiscal = document.getElementById("fp-notafiscal").value;
    state.pendentes.unshift({
      id: Date.now() + Math.random(),
      fornecedor,
      notaFiscal,
      chegadaEm: new Date(),
      numeroPedido: "",
      pedidoOk: modalPendenteChecks.pedidoOk,
      valorOk: modalPendenteChecks.valorOk,
      aprovacaoOk: modalPendenteChecks.aprovacaoOk,
      convertido: false,
      numero5000: null,
      observacao: "",
    });
    logAuditoria("Registrou chegada", `NF ${notaFiscal} — ${fornecedor}`);
    chegadasRegistradasNestaSessao++;
    camposPend.forEach(id => (document.getElementById(id).value = ""));
    document.getElementById("fp-submit").disabled = true;
    resetModalPendenteChecks();
    document.getElementById("fp-confirm").textContent = `✓ ${fornecedor} — NF ${notaFiscal} registrada. (${chegadasRegistradasNestaSessao} nesta leva) Pode add a próxima.`;
    document.getElementById("fp-fornecedor").focus();
    render(); // atualiza a lista atrás, mas mantém o modal aberto pra próxima chegada
  });

  // Modal: Nova previsão de chegada
  const camposPrev = ["prev-fornecedor"];
  function checarPrevisao() {
    document.getElementById("prev-submit").disabled = document.getElementById("prev-fornecedor").value.trim().length === 0;
  }
  camposPrev.forEach(id => document.getElementById(id).addEventListener("input", checarPrevisao));

  document.getElementById("prev-submit").addEventListener("click", () => {
    const fornecedor = document.getElementById("prev-fornecedor").value.trim();
    const notaFiscal = document.getElementById("prev-notafiscal").value.trim();
    const transportadora = document.getElementById("prev-transportadora").value.trim();
    state.previsoes.unshift({
      id: Date.now() + Math.random(),
      fornecedor, notaFiscal, transportadora,
      chegou: false, chegouEm: null,
      criadoEm: new Date(),
    });
    logAuditoria("Adicionou previsão de chegada", `${fornecedor}${notaFiscal ? " — NF " + notaFiscal : ""}`);
    document.getElementById("prev-confirm").textContent = `✓ ${fornecedor} adicionado. Pode add o próximo.`;
    ["prev-fornecedor", "prev-notafiscal", "prev-transportadora"].forEach(id => (document.getElementById(id).value = ""));
    document.getElementById("prev-submit").disabled = true;
    document.getElementById("prev-fornecedor").focus();
    render();
  });

  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => fecharModal(btn.dataset.close));
  });
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", e => { if (e.target === overlay) fecharModal(overlay.id); });
  });

  // Enter funciona como clicar no botão principal, em vez de precisar do mouse
  habilitarEnter(["fp-fornecedor", "fp-notafiscal"], "fp-submit");
  habilitarEnter(["f5000-numero"], "f5000-submit");
  habilitarEnter(["fd-notafiscal", "fd-fornecedor", "fd-descricao"], "fd-submit");
  habilitarEnter(["prev-fornecedor", "prev-notafiscal", "prev-transportadora"], "prev-submit");
  habilitarEnter(["estorno-motivo"], "estorno-submit");

  render();
});

function abrirModal(id) { document.getElementById(id).classList.add("open"); }
function fecharModal(id) { document.getElementById(id).classList.remove("open"); }

let confirmacaoCallback = null;
function confirmarAcao(titulo, mensagem, onConfirm) {
  document.getElementById("confirm-titulo").textContent = titulo;
  document.getElementById("confirm-mensagem").textContent = mensagem;
  confirmacaoCallback = onConfirm;
  abrirModal("modalConfirmacao");
}

// Faz o Enter, dentro de um campo de texto, clicar no botão de confirmar (se não estiver desabilitado)
function habilitarEnter(inputIds, submitId) {
  inputIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const btn = document.getElementById(submitId);
      if (btn && !btn.disabled) btn.click();
    });
  });
}

// ---------- Render geral ----------
function render() {
  renderNav();
  renderMain();
}
