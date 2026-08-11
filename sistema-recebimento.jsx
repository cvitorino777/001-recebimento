import { useState, useMemo } from "react";
import { Package, ClipboardCheck, AlertTriangle, LayoutDashboard, Plus, Clock, Ban, CheckCircle2, X, Copy, Check, ListChecks } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// ---------- Design tokens ----------
// Paleta: doca de recebimento — aço, papel de romaneio, âmbar de alerta
const C = {
  bg: "#F1EFE9",        // papel kraft claro
  panel: "#FFFFFF",
  ink: "#1E2530",        // quase-preto azulado
  steel: "#2E3E52",      // azul-aço — primária
  steelDeep: "#1B2636",
  amber: "#D98E2B",      // alerta / pendente
  green: "#3E7A5C",      // concluído
  red: "#B8462F",        // bloqueado / divergência
  line: "#DCD6C8",
  sub: "#6B7280",
};

const FONT_DISPLAY = "'Oswald', 'Arial Narrow', sans-serif";
const FONT_MONO = "'IBM Plex Mono', 'Courier New', monospace";
const FONT_BODY = "'Inter', system-ui, sans-serif";

function StampTag({ numero }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar(e) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(numero);
    } catch {
      // clipboard indisponível neste ambiente — segue sem travar a UI
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1200);
  }

  return (
    <button
      onClick={copiar}
      title="Copiar número do 5000 para colar no SAP"
      style={{
        fontFamily: FONT_MONO,
        fontWeight: 700,
        fontSize: 13,
        color: C.steel,
        border: `2px solid ${C.steel}`,
        borderRadius: 3,
        padding: "3px 6px 3px 8px",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        letterSpacing: 0.5,
        transform: "rotate(-1deg)",
        background: copiado ? "#E8F1EC" : "#fff",
        cursor: "pointer",
        transition: "background 0.15s ease",
      }}
    >
      {numero}
      {copiado ? <Check size={12} color={C.green} /> : <Copy size={12} color={C.sub} />}
    </button>
  );
}

function StatusPill({ label, tone }) {
  const tones = {
    green: { bg: "#E8F1EC", fg: C.green },
    amber: { bg: "#FBF0DD", fg: C.amber },
    red: { bg: "#F8E7E2", fg: C.red },
    gray: { bg: "#EEEFF1", fg: C.sub },
  };
  const t = tones[tone] || tones.gray;
  return (
    <span
      style={{
        fontFamily: FONT_BODY,
        fontSize: 11,
        fontWeight: 600,
        color: t.fg,
        background: t.bg,
        padding: "3px 9px",
        borderRadius: 20,
        textTransform: "uppercase",
        letterSpacing: 0.4,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function Toggle({ checked, onChange, disabled, disabledReason }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      title={disabled ? disabledReason : ""}
      style={{
        width: 40,
        height: 22,
        borderRadius: 999,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        background: disabled ? "#D8D3C4" : checked ? C.green : "#C9C2B0",
        position: "relative",
        transition: "background 0.15s ease",
        flexShrink: 0,
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.15s ease",
          boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}

function fmtDuration(ms) {
  if (ms == null) return "—";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}min`;
}

function fmtTime(d) {
  if (!d) return "—";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// ---------- Seed data ----------
const seedRecebimentos = [
  {
    id: 1,
    numero: "50231",
    fornecedor: "Fone & Cia Distribuidora",
    notaFiscal: "NF-88213",
    valor: 4820.0,
    criadoEm: new Date(Date.now() - 1000 * 60 * 130),
    espelhoImpresso: true,
    espelhoImpressoEm: new Date(Date.now() - 1000 * 60 * 118),
    mov105: true,
    mov105Em: new Date(Date.now() - 1000 * 60 * 20),
  },
  {
    id: 2,
    numero: "50232",
    fornecedor: "Metalúrgica Ravena",
    notaFiscal: "NF-40021",
    valor: 12990.5,
    criadoEm: new Date(Date.now() - 1000 * 60 * 60),
    espelhoImpresso: true,
    espelhoImpressoEm: new Date(Date.now() - 1000 * 60 * 52),
    mov105: false,
    mov105Em: null,
  },
  {
    id: 3,
    numero: "50233",
    fornecedor: "Metalúrgica Ravena",
    notaFiscal: "NF-40022",
    valor: 3110.0,
    criadoEm: new Date(Date.now() - 1000 * 60 * 40),
    espelhoImpresso: false,
    espelhoImpressoEm: null,
    mov105: false,
    mov105Em: null,
  },
];

const seedPendentes = [
  {
    id: 1,
    fornecedor: "Componentes Aurora Ltda",
    notaFiscal: "NF-91007",
    valor: 7460.3,
    pedidoOk: true,
    valorOk: true,
    aprovacaoOk: false,
  },
  {
    id: 2,
    fornecedor: "Distribuidora Vieira",
    notaFiscal: "NF-91012",
    valor: 2210.0,
    pedidoOk: true,
    valorOk: true,
    aprovacaoOk: true,
  },
];

const seedDivergencias = [
  {
    id: 1,
    notaFiscal: "NF-40022",
    fornecedor: "Metalúrgica Ravena",
    tipo: "valor_divergente",
    descricao: "Valor da NF R$ 3.110,00 não bate com o pedido (R$ 2.980,00)",
    status: "aberta",
    abertaEm: new Date(Date.now() - 1000 * 60 * 35),
  },
];

// ---------- Main App ----------
export default function App() {
  const [tab, setTab] = useState("pendentes");
  const [pendentes, setPendentes] = useState(seedPendentes);
  const [recebimentos, setRecebimentos] = useState(seedRecebimentos);
  const [divergencias, setDivergencias] = useState(seedDivergencias);
  const [novoRecebimentoBase, setNovoRecebimentoBase] = useState(null); // null = fechado; objeto = aberto pré-preenchido
  const [showNovaDivergencia, setShowNovaDivergencia] = useState(false);

  const notasComDivergenciaAberta = useMemo(
    () => new Set(divergencias.filter((d) => d.status === "aberta").map((d) => d.notaFiscal)),
    [divergencias]
  );

  function togglePendente(id, campo, val) {
    setPendentes((ps) => ps.map((p) => (p.id === id ? { ...p, [campo]: val } : p)));
  }

  function toggleEspelho(id, val) {
    setRecebimentos((rs) =>
      rs.map((r) =>
        r.id === id
          ? { ...r, espelhoImpresso: val, espelhoImpressoEm: val ? new Date() : null }
          : r
      )
    );
  }

  function toggleMov105(id, val) {
    setRecebimentos((rs) =>
      rs.map((r) => (r.id === id ? { ...r, mov105: val, mov105Em: val ? new Date() : null } : r))
    );
  }

  function addRecebimento(data) {
    setRecebimentos((rs) => [
      {
        id: Date.now(),
        numero: data.numero,
        fornecedor: data.fornecedor,
        notaFiscal: data.notaFiscal,
        valor: parseFloat(data.valor) || 0,
        criadoEm: new Date(),
        espelhoImpresso: false,
        espelhoImpressoEm: null,
        mov105: false,
        mov105Em: null,
      },
      ...rs,
    ]);
    if (data.pendenteId) {
      setPendentes((ps) => ps.filter((p) => p.id !== data.pendenteId));
    }
    setNovoRecebimentoBase(null);
    setTab("recebimentos");
  }

  function addDivergencia(data) {
    setDivergencias((ds) => [
      {
        id: Date.now(),
        notaFiscal: data.notaFiscal,
        fornecedor: data.fornecedor,
        tipo: data.tipo,
        descricao: data.descricao,
        status: "aberta",
        abertaEm: new Date(),
      },
      ...ds,
    ]);
    setShowNovaDivergencia(false);
  }

  function resolverDivergencia(id) {
    setDivergencias((ds) => ds.map((d) => (d.id === id ? { ...d, status: "resolvida" } : d)));
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        fontFamily: FONT_BODY,
        color: C.ink,
        display: "flex",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: 210,
          background: C.steelDeep,
          color: "#EDEFF3",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          padding: "22px 14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 30, paddingLeft: 6 }}>
          <Package size={22} color={C.amber} />
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: 0.5 }}>DOCA·105</div>
        </div>
        <NavItem
          icon={<ListChecks size={17} />}
          label="Pendentes"
          active={tab === "pendentes"}
          onClick={() => setTab("pendentes")}
          badge={pendentes.filter((p) => p.pedidoOk && p.valorOk && p.aprovacaoOk).length}
        />
        <NavItem icon={<ClipboardCheck size={17} />} label="Recebimentos" active={tab === "recebimentos"} onClick={() => setTab("recebimentos")} />
        <NavItem
          icon={<AlertTriangle size={17} />}
          label="Divergências"
          active={tab === "divergencias"}
          onClick={() => setTab("divergencias")}
          badge={divergencias.filter((d) => d.status === "aberta").length}
        />
        <NavItem icon={<LayoutDashboard size={17} />} label="Painel de tempo" active={tab === "dashboard"} onClick={() => setTab("dashboard")} />
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: "28px 36px", maxWidth: 1100 }}>
        {tab === "pendentes" && (
          <PendentesView pendentes={pendentes} onToggle={togglePendente} onCriar5000={setNovoRecebimentoBase} />
        )}
        {tab === "recebimentos" && (
          <RecebimentosView
            recebimentos={recebimentos}
            notasComDivergenciaAberta={notasComDivergenciaAberta}
            onToggleEspelho={toggleEspelho}
            onToggleMov105={toggleMov105}
          />
        )}
        {tab === "divergencias" && (
          <DivergenciasView
            divergencias={divergencias}
            onResolver={resolverDivergencia}
            onNova={() => setShowNovaDivergencia(true)}
          />
        )}
        {tab === "dashboard" && <DashboardView recebimentos={recebimentos} />}
      </div>

      {novoRecebimentoBase && (
        <NovoRecebimentoModal base={novoRecebimentoBase} onClose={() => setNovoRecebimentoBase(null)} onSave={addRecebimento} />
      )}
      {showNovaDivergencia && (
        <NovaDivergenciaModal onClose={() => setShowNovaDivergencia(false)} onSave={addDivergencia} />
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "10px 10px",
        marginBottom: 4,
        border: "none",
        borderRadius: 6,
        background: active ? "#2A3648" : "transparent",
        color: active ? "#fff" : "#B7BECC",
        cursor: "pointer",
        fontSize: 13.5,
        fontWeight: 500,
        fontFamily: FONT_BODY,
        textAlign: "left",
      }}
    >
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {!!badge && (
        <span
          style={{
            background: C.red,
            color: "#fff",
            fontSize: 10.5,
            fontWeight: 700,
            borderRadius: 10,
            padding: "1px 6px",
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function SectionHeader({ title, subtitle, action, actionLabel }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
      <div>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 500, margin: 0, color: C.steelDeep, letterSpacing: 0.3 }}>
          {title}
        </h1>
        {subtitle && <div style={{ color: C.sub, fontSize: 13, marginTop: 4 }}>{subtitle}</div>}
      </div>
      {action && (
        <button
          onClick={action}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: C.steel,
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "9px 14px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Plus size={15} /> {actionLabel}
        </button>
      )}
    </div>
  );
}

function PendentesView({ pendentes, onToggle, onCriar5000 }) {
  return (
    <div>
      <SectionHeader
        title="Pendentes"
        subtitle="A fiscal confere pedido, valor e aprovação do compras. Só com os três OK o 5000 é liberado."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {pendentes.length === 0 && (
          <div style={{ color: C.sub, fontSize: 13.5, padding: 20 }}>Nenhuma NF pendente de conferência.</div>
        )}
        {pendentes.map((p) => {
          const liberado = p.pedidoOk && p.valorOk && p.aprovacaoOk;
          return (
            <div
              key={p.id}
              style={{
                background: C.panel,
                border: `1px solid ${liberado ? "#BFDACB" : C.line}`,
                borderLeft: `4px solid ${liberado ? C.green : C.amber}`,
                borderRadius: 8,
                padding: "14px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div style={{ minWidth: 190 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.fornecedor}</div>
                <div style={{ color: C.sub, fontSize: 12, fontFamily: FONT_MONO }}>{p.notaFiscal}</div>
                <div style={{ color: C.sub, fontSize: 12 }}>
                  {p.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </div>

              <div style={{ display: "flex", gap: 22 }}>
                <CheckField label="Pedido OK" checked={p.pedidoOk} onChange={(v) => onToggle(p.id, "pedidoOk", v)} />
                <CheckField label="Valor OK" checked={p.valorOk} onChange={(v) => onToggle(p.id, "valorOk", v)} />
                <CheckField label="Aprovação compras" checked={p.aprovacaoOk} onChange={(v) => onToggle(p.id, "aprovacaoOk", v)} />
              </div>

              <button
                disabled={!liberado}
                onClick={() => onCriar5000({ pendenteId: p.id, fornecedor: p.fornecedor, notaFiscal: p.notaFiscal, valor: p.valor })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: liberado ? C.steel : "#EEEDE7",
                  color: liberado ? "#fff" : C.sub,
                  border: "none",
                  borderRadius: 6,
                  padding: "9px 14px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: liberado ? "pointer" : "not-allowed",
                  whiteSpace: "nowrap",
                }}
              >
                <Plus size={14} /> Criar 5000
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CheckField({ label, checked, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
      <Toggle checked={checked} onChange={onChange} />
      <span style={{ fontSize: 12, color: C.sub, fontWeight: 500 }}>{label}</span>
    </label>
  );
}

function RecebimentosView({ recebimentos, notasComDivergenciaAberta, onToggleEspelho, onToggleMov105 }) {
  return (
    <div>
      <SectionHeader
        title="Recebimentos"
        subtitle="Cada linha é um número 5000 — do descarregamento até a movimentação 105."
      />
      <div style={{ background: C.panel, borderRadius: 10, border: `1px solid ${C.line}`, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: "#F7F5F0", textAlign: "left" }}>
              <Th>5000</Th>
              <Th>Fornecedor / NF</Th>
              <Th>Criado</Th>
              <Th>Espelho impresso</Th>
              <Th>Mov. 105</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {recebimentos.map((r) => {
              const bloqueado = notasComDivergenciaAberta.has(r.notaFiscal);
              const status = r.mov105
                ? { label: "Concluído", tone: "green" }
                : bloqueado
                  ? { label: "Bloqueado", tone: "red" }
                  : { label: "Em andamento", tone: "amber" };
              return (
                <tr key={r.id} style={{ borderTop: `1px solid ${C.line}` }}>
                  <td style={{ padding: "12px 16px" }}>
                    <StampTag numero={r.numero} />
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 600 }}>{r.fornecedor}</div>
                    <div style={{ color: C.sub, fontSize: 12, fontFamily: FONT_MONO }}>{r.notaFiscal}</div>
                  </td>
                  <td style={{ padding: "12px 16px", color: C.sub, fontFamily: FONT_MONO, fontSize: 12.5 }}>
                    {fmtTime(r.criadoEm)}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Toggle checked={r.espelhoImpresso} onChange={(v) => onToggleEspelho(r.id, v)} />
                      <span style={{ fontSize: 11.5, color: C.sub, fontFamily: FONT_MONO }}>
                        {r.espelhoImpressoEm ? fmtTime(r.espelhoImpressoEm) : ""}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Toggle
                        checked={r.mov105}
                        onChange={(v) => onToggleMov105(r.id, v)}
                        disabled={bloqueado && !r.mov105}
                        disabledReason="Bloqueado: há divergência aberta para esta NF"
                      />
                      <span style={{ fontSize: 11.5, color: C.sub, fontFamily: FONT_MONO }}>
                        {r.mov105Em ? fmtTime(r.mov105Em) : ""}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <StatusPill label={status.label} tone={status.tone} />
                      {bloqueado && !r.mov105 && <Ban size={13} color={C.red} />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }) {
  return (
    <th
      style={{
        padding: "10px 16px",
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        color: C.sub,
        fontWeight: 700,
      }}
    >
      {children}
    </th>
  );
}

function DivergenciasView({ divergencias, onResolver, onNova }) {
  const tipoLabel = { pedido_divergente: "Pedido divergente", valor_divergente: "Valor divergente" };
  return (
    <div>
      <SectionHeader
        title="Divergências"
        subtitle="Enquanto uma NF tiver divergência aberta, o 105 correspondente fica bloqueado."
        action={onNova}
        actionLabel="Registrar divergência"
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {divergencias.length === 0 && (
          <div style={{ color: C.sub, fontSize: 13.5, padding: 20 }}>Nenhuma divergência registrada.</div>
        )}
        {divergencias.map((d) => (
          <div
            key={d.id}
            style={{
              background: C.panel,
              border: `1px solid ${d.status === "aberta" ? "#EAC7B8" : C.line}`,
              borderLeft: `4px solid ${d.status === "aberta" ? C.red : C.green}`,
              borderRadius: 8,
              padding: "14px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 13 }}>{d.notaFiscal}</span>
                <StatusPill label={tipoLabel[d.tipo]} tone="gray" />
                <StatusPill label={d.status === "aberta" ? "Aberta" : "Resolvida"} tone={d.status === "aberta" ? "red" : "green"} />
              </div>
              <div style={{ fontSize: 13, color: C.ink, marginBottom: 2 }}>{d.descricao}</div>
              <div style={{ fontSize: 11.5, color: C.sub }}>
                {d.fornecedor} · aberta em {fmtTime(d.abertaEm)}
              </div>
            </div>
            {d.status === "aberta" && (
              <button
                onClick={() => onResolver(d.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#fff",
                  border: `1px solid ${C.green}`,
                  color: C.green,
                  borderRadius: 6,
                  padding: "7px 12px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <CheckCircle2 size={14} /> Marcar resolvida
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardView({ recebimentos }) {
  const concluidos = recebimentos.filter((r) => r.mov105 && r.mov105Em);
  const dados = concluidos.map((r) => ({
    nome: `#${r.numero}`,
    minutos: Math.round((r.mov105Em - r.criadoEm) / 60000),
  }));
  const mediaMin = dados.length ? Math.round(dados.reduce((s, d) => s + d.minutos, 0) / dados.length) : null;
  const emAndamento = recebimentos.filter((r) => !r.mov105);

  return (
    <div>
      <SectionHeader title="Painel de tempo" subtitle="Do lançamento do 5000 até a movimentação 105 no SAP." />

      <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
        <StatCard icon={<Clock size={16} />} label="Tempo médio (5000 → 105)" value={mediaMin != null ? fmtDuration(mediaMin * 60000) : "—"} />
        <StatCard icon={<CheckCircle2 size={16} />} label="Concluídos" value={concluidos.length} tone="green" />
        <StatCard icon={<Clock size={16} />} label="Em andamento" value={emAndamento.length} tone="amber" />
      </div>

      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: "20px 20px 8px" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
          Minutos até o 105, por recebimento concluído
        </div>
        {dados.length === 0 ? (
          <div style={{ color: C.sub, fontSize: 13, padding: "20px 0" }}>Nenhum recebimento concluído ainda.</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dados} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
              <XAxis dataKey="nome" tick={{ fontSize: 11, fill: C.sub }} axisLine={{ stroke: C.line }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.sub }} axisLine={false} tickLine={false} unit="min" />
              <Tooltip formatter={(v) => [`${v} min`, "Tempo"]} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
              <Bar dataKey="minutos" fill={C.steel} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, tone }) {
  const color = tone === "green" ? C.green : tone === "amber" ? C.amber : C.steel;
  return (
    <div style={{ flex: 1, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color, marginBottom: 8 }}>
        {icon}
        <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
      </div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: C.steelDeep }}>{value}</div>
    </div>
  );
}

// ---------- Modals ----------
function ModalShell({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,24,32,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div style={{ background: "#fff", borderRadius: 10, width: 420, maxWidth: "90vw", padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: C.steelDeep }}>{title}</div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: C.sub }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <label style={{ fontSize: 11.5, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 4 }}>
      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${C.line}`,
  borderRadius: 6,
  padding: "9px 10px",
  fontSize: 13.5,
  fontFamily: FONT_BODY,
  marginBottom: 14,
  outline: "none",
};

function NovoRecebimentoModal({ base, onClose, onSave }) {
  const [numero, setNumero] = useState("");
  const [fornecedor] = useState(base?.fornecedor || "");
  const [notaFiscal] = useState(base?.notaFiscal || "");
  const [valor] = useState(base?.valor ?? "");
  const numeroValido = /^5000\d{6}$/.test(numero);

  return (
    <ModalShell title="Criar 5000" onClose={onClose}>
      <FieldLabel>Fornecedor</FieldLabel>
      <div style={{ ...inputStyle, background: "#F7F5F0", color: C.sub }}>{fornecedor}</div>
      <FieldLabel>Nota fiscal</FieldLabel>
      <div style={{ ...inputStyle, background: "#F7F5F0", color: C.sub, fontFamily: FONT_MONO }}>{notaFiscal}</div>
      <FieldLabel>Número do 5000 (do SAP)</FieldLabel>
      <input
        style={{ ...inputStyle, fontFamily: FONT_MONO }}
        value={numero}
        onChange={(e) => setNumero(e.target.value.replace(/\D/g, ""))}
        placeholder="Ex: 5000867123"
        inputMode="numeric"
      />
      {!numeroValido && numero.length > 0 && (
        <div style={{ marginTop: -10, marginBottom: 14, fontSize: 11.5, color: C.amber }}>
          Formato esperado: 5000 + 6 dígitos (ex: 5000867123)
        </div>
      )}
      <button
        disabled={!numeroValido}
        onClick={() => onSave({ numero, fornecedor, notaFiscal, valor, pendenteId: base?.pendenteId })}
        style={{
          width: "100%",
          background: numeroValido ? C.steel : "#C9C2B0",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "11px 0",
          fontSize: 13.5,
          fontWeight: 600,
          cursor: numeroValido ? "pointer" : "not-allowed",
        }}
      >
        Criar recebimento
      </button>
    </ModalShell>
  );
}

function NovaDivergenciaModal({ onClose, onSave }) {
  const [notaFiscal, setNotaFiscal] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [tipo, setTipo] = useState("pedido_divergente");
  const [descricao, setDescricao] = useState("");
  const valid = notaFiscal && fornecedor && descricao;

  return (
    <ModalShell title="Registrar divergência" onClose={onClose}>
      <FieldLabel>Nota fiscal</FieldLabel>
      <input style={inputStyle} value={notaFiscal} onChange={(e) => setNotaFiscal(e.target.value)} placeholder="Ex: NF-12345" />
      <FieldLabel>Fornecedor</FieldLabel>
      <input style={inputStyle} value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Nome do fornecedor" />
      <FieldLabel>Tipo</FieldLabel>
      <select style={inputStyle} value={tipo} onChange={(e) => setTipo(e.target.value)}>
        <option value="pedido_divergente">Pedido divergente</option>
        <option value="valor_divergente">Valor divergente</option>
      </select>
      <FieldLabel>Descrição</FieldLabel>
      <input style={inputStyle} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que está divergente" />
      <button
        disabled={!valid}
        onClick={() => onSave({ notaFiscal, fornecedor, tipo, descricao })}
        style={{
          width: "100%",
          background: valid ? C.red : "#C9C2B0",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "11px 0",
          fontSize: 13.5,
          fontWeight: 600,
          cursor: valid ? "pointer" : "not-allowed",
        }}
      >
        Registrar divergência
      </button>
    </ModalShell>
  );
}
