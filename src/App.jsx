import { useState, useEffect, createContext, useContext } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { supabase } from "./supabaseClient";

// ─── STYLES ────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700;1,900&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #08080d;
    --bg-card: #0f0f17;
    --bg-hover: #141420;
    --border: #1a1a28;
    --border-hi: #252538;
    --accent: #7fff6e;
    --accent-dim: rgba(127,255,110,0.10);
    --accent-dim2: rgba(127,255,110,0.04);
    --red: #ff5f6d;
    --red-dim: rgba(255,95,109,0.10);
    --blue: #4fc3f7;
    --blue-dim: rgba(79,195,247,0.10);
    --gold: #ffd166;
    --gold-dim: rgba(255,209,102,0.10);
    --text: #e4e4f0;
    --muted: #a2a2bd;
    --dim: #b0b0c6;
    --display: 'Lato', sans-serif;
    --body: 'Lato', sans-serif;
    --mono: 'DM Mono', monospace;
    --r: 12px;
    --r-sm: 8px;
  }

  html, body, #root { height: 100%; }
  body { font-family: var(--body); background: var(--bg); color: var(--text); -webkit-font-smoothing: antialiased; }

  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border-hi); border-radius: 3px; }

  input, select, textarea, button { font-family: var(--body); }
  button { cursor: pointer; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .page { animation: fadeUp 0.35s ease; }

  .nav-btn { transition: background 0.15s, color 0.15s; }
  .nav-btn:hover { background: var(--bg-hover) !important; }

  .row-tr:hover { background: var(--bg-hover) !important; }

  .chip { transition: background 0.15s, color 0.15s; }
  .chip:hover { opacity: 0.8; }

  .action-btn { transition: opacity 0.15s; }
  .action-btn:hover { opacity: 0.75; }
`;

// ─── CONTEXT ───────────────────────────────────────────────────────────────────
const Ctx = createContext(null);

const SEED = {
  ingresos: [
    { id: 1, nombre: "Eldorado", categoria: "Freelance", monto: 270000, fecha: "2025-10-01", recurrente: true },
    { id: 2, nombre: "Leadsgg", categoria: "Freelance", monto: 250000, fecha: "2025-10-01", recurrente: true },
    { id: 3, nombre: "RL Coaching", categoria: "Coaching", monto: 0, fecha: "2025-10-01", recurrente: false },
    { id: 4, nombre: "RL Competencias", categoria: "Competencias", monto: 0, fecha: "2025-10-01", recurrente: false },
  ],
  gastos: [
    { id: 1, nombre: "Internet", categoria: "Servicios", monto: 20000, fecha: "2025-10-01", recurrente: true },
    { id: 2, nombre: "Spotify", categoria: "Suscripciones", monto: 4950, fecha: "2025-10-01", recurrente: true },
    { id: 3, nombre: "Disney Plus", categoria: "Suscripciones", monto: 4200, fecha: "2025-10-01", recurrente: true },
    { id: 4, nombre: "Adobe Express", categoria: "Herramientas", monto: 8200, fecha: "2025-10-01", recurrente: true },
    { id: 5, nombre: "Celular", categoria: "Servicios", monto: 15990, fecha: "2025-10-01", recurrente: true },
    { id: 6, nombre: "Gastos personales", categoria: "Personal", monto: 100000, fecha: "2025-10-01", recurrente: true },
    { id: 7, nombre: "Inyección", categoria: "Otros", monto: 13500, fecha: "2025-10-01", recurrente: false },
    { id: 8, nombre: "Speak", categoria: "Educación", monto: 0, fecha: "2025-10-01", recurrente: false },
  ],
  inversiones: [
    { id: 1, nombre: "DAP", tipo: "DAP", monto: 200000, fecha: "2025-10-01", rendimiento: 5.2, notas: "BancoEstado" },
  ],
};

function load() {
  try { const s = localStorage.getItem("fin_mauri"); return s ? JSON.parse(s) : SEED; }
  catch { return SEED; }
}

function Provider({ children, user }) {
  const [data, setData] = useState({ ingresos: [], gastos: [], inversiones: [] });

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const { data: i } = await supabase.from("ingresos").select("*");
      const { data: g } = await supabase.from("gastos").select("*");
      const { data: v } = await supabase.from("inversiones").select("*");
      setData({
        ingresos: i || [],
        gastos: g || [],
        inversiones: v || []
      });
    };
    fetchAll();
  }, [user]);

  const add = async (k, item) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return;

    // Remove empty id if it exists so Supabase can auto-generate it
    const { id, ...dbItemWithoutId } = item;
    const dbItem = { ...dbItemWithoutId, user_id: user.user.id };

    // Optimistic UI update
    const newId = Date.now();
    setData(d => ({ ...d, [k]: [...d[k], { ...item, id: newId }] }));

    // Remote update
    const { data: insertedData, error } = await supabase.from(k).insert([dbItem]).select();

    if (!error && insertedData?.[0]) {
      // Replace optimistic ID with real Supabase UUID
      setData(d => ({ ...d, [k]: d[k].map(x => x.id === newId ? insertedData[0] : x) }));
    } else {
      console.error("Error adding to", k, error);
      // Revert optimism on error
      setData(d => ({ ...d, [k]: d[k].filter(x => x.id !== newId) }));
    }
  };

  const update = async (k, id, upd) => {
    // Optimistic UI
    setData(d => ({ ...d, [k]: d[k].map(x => x.id === id ? { ...x, ...upd } : x) }));
    // Remote
    const { error } = await supabase.from(k).update(upd).eq("id", id);
    if (error) console.error("Error updating:", error);
  };

  const remove = async (k, id) => {
    // Optimistic UI
    setData(d => ({ ...d, [k]: d[k].filter(x => x.id !== id) }));
    // Remote
    const { error } = await supabase.from(k).delete().eq("id", id);
    if (error) console.error("Error deleting:", error);
  };

  const totI = (data?.ingresos || []).reduce((s, x) => s + (x.monto || 0), 0);
  const totG = (data?.gastos || []).reduce((s, x) => s + (x.monto || 0), 0);
  const totV = (data?.inversiones || []).reduce((s, x) => s + (x.monto || 0), 0);
  const margen = totI - totG;
  const margenPct = totI > 0 ? ((margen / totI) * 100).toFixed(1) : "0.0";

  return (
    <Ctx.Provider value={{ data: data || { ingresos: [], gastos: [], inversiones: [] }, totI, totG, totV, margen, margenPct, add, update, remove }}>
      {children}
    </Ctx.Provider>
  );
}
const useF = () => useContext(Ctx);

// ─── UTILS ─────────────────────────────────────────────────────────────────────
const clp = n => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n || 0);
const short = n => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}k` : `$${n}`;
const PIE_CLR = ["#7fff6e", "#4fc3f7", "#ffd166", "#ff5f6d", "#b39ddb", "#80cbc4", "#ffab76"];
const CAT_CLR = { Servicios: "#4fc3f7", Suscripciones: "#b39ddb", Herramientas: "#ffd166", Personal: "#ff5f6d", Educación: "#80cbc4", Otros: "#ffab76" };

// ─── PRIMITIVES ────────────────────────────────────────────────────────────────
const Card = ({ children, style }) => (
  <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r)", ...style }}>
    {children}
  </div>
);

const Mono = ({ children, style }) => (
  <span style={{ fontFamily: "var(--mono)", ...style }}>{children}</span>
);

const Display = ({ children, style }) => (
  <span style={{ fontFamily: "var(--display)", ...style }}>{children}</span>
);

const Tag = ({ children, color = "var(--accent)" }) => (
  <span style={{
    background: `${color}18`, color, border: `1px solid ${color}35`,
    borderRadius: 4, padding: "2px 8px", fontFamily: "var(--mono)", fontSize: 11
  }}>{children}</span>
);

const Pill = ({ children, active, onClick, color = "var(--accent)" }) => (
  <button className="chip" onClick={onClick} style={{
    padding: "5px 14px", borderRadius: 20,
    border: `1px solid ${active ? color : "var(--border)"}`,
    background: active ? `${color}18` : "transparent",
    color: active ? color : "var(--muted)",
    fontFamily: "var(--mono)", fontSize: 11, cursor: "pointer"
  }}>{children}</button>
);

const Btn = ({ children, onClick, variant = "primary", sm }) => {
  const v = {
    primary: { background: "var(--accent)", color: "#000", border: "none" },
    ghost: { background: "transparent", color: "var(--dim)", border: "1px solid var(--border)" },
    danger: { background: "transparent", color: "var(--red)", border: "1px solid var(--red)" },
  }[variant];
  return (
    <button className="action-btn" onClick={onClick} style={{
      ...v, padding: sm ? "5px 12px" : "9px 20px",
      borderRadius: 8, fontFamily: "var(--display)", fontWeight: 700,
      fontSize: sm ? 12 : 14, letterSpacing: "-0.2px"
    }}>{children}</button>
  );
};

const Inp = ({ value, onChange, type = "text", placeholder, style }) => (
  <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{
    width: "100%", background: "var(--bg)", border: "1px solid var(--border)",
    borderRadius: 8, padding: "9px 12px", color: "var(--text)",
    fontFamily: "var(--mono)", fontSize: 13, outline: "none", ...style
  }} />
);

const Sel = ({ value, onChange, options }) => (
  <select value={value} onChange={onChange} style={{
    width: "100%", background: "var(--bg)", border: "1px solid var(--border)",
    borderRadius: 8, padding: "9px 12px", color: "var(--text)",
    fontFamily: "var(--mono)", fontSize: 13, outline: "none", cursor: "pointer"
  }}>
    {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
  </select>
);

const Fld = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontFamily: "var(--mono)", fontSize: 14, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 5 }}>{label.toUpperCase()}</div>
    {children}
  </div>
);

const Modal = ({ title, onClose, children }) => (
  <div onClick={onClose} style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)"
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      background: "var(--bg-card)", border: "1px solid var(--border-hi)",
      borderRadius: 16, padding: "28px 32px", width: 420, maxWidth: "92vw",
      animation: "fadeUp 0.2s ease"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <Display style={{ fontWeight: 700, fontSize: 20, letterSpacing: "-0.5px" }}>{title}</Display>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

const PageHeader = ({ title, sub, action }) => (
  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20 }}>
    <div>
      <Display style={{ fontWeight: 800, fontSize: 32, letterSpacing: "-1.2px", display: "block", color: "var(--text)" }}>{title}</Display>
      <Mono style={{ fontSize: 14, color: "var(--muted)", marginTop: 4, display: "block" }}>{sub}</Mono>
    </div>
    {action}
  </div>
);

const SummaryCards = ({ title1, val1, title2, val2, color }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 22 }}>
    <Card style={{ padding: "18px 22px" }}>
      <Mono style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4, letterSpacing: "0.05em" }}>{title1}</Mono>
      <Display style={{ fontWeight: 700, fontSize: 26, color, display: "block", letterSpacing: "-0.5px" }}>{val1}</Display>
    </Card>
    <Card style={{ padding: "18px 22px" }}>
      <Mono style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4, letterSpacing: "0.05em" }}>{title2}</Mono>
      <Display style={{ fontWeight: 700, fontSize: 26, color, display: "block", letterSpacing: "-0.5px" }}>{val2}</Display>
    </Card>
  </div>
);

const TtTip = ({ contentStyle, itemStyle, ...p }) => (
  <Tooltip {...p} contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "var(--mono)", fontSize: 12, color: "var(--text)", ...contentStyle }} itemStyle={{ color: "var(--text)", ...itemStyle }} />
);

// ─── TABLE ─────────────────────────────────────────────────────────────────────
const Table = ({ headers, rows }) => (
  <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i} style={{ textAlign: "left", padding: "10px 16px", fontFamily: "var(--mono)", fontSize: 14, color: "var(--muted)", letterSpacing: "0.08em", borderBottom: "1px solid var(--border)" }}>{h.toUpperCase()}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="row-tr" style={{ borderBottom: "1px solid var(--border)" }}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding: "11px 16px", fontFamily: "var(--mono)", fontSize: 13, color: "var(--text)" }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── SIDEBAR ───────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "◈" },
  { id: "ingresos", label: "Ingresos", icon: "↑" },
  { id: "gastos", label: "Gastos", icon: "↓" },
  { id: "inversiones", label: "Inversiones", icon: "◎" },
  { id: "margen", label: "Margen", icon: "≈" },
  { id: "kpis", label: "KPIs", icon: "⬡" },
  { id: "importar", label: "Importar PDF", icon: "⇧" },
];

function Sidebar({ active, setActive }) {
  const { totI, totG, margen, margenPct } = useF();
  return (
    <aside style={{
      width: 240, minHeight: "100vh", background: "var(--bg-card)",
      borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column",
      position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 100
    }}>
      <div style={{ padding: "28px 24px 20px", borderBottom: "1px solid var(--border)" }}>
        <Display style={{ fontWeight: 800, fontSize: 21, letterSpacing: "-0.5px", color: "var(--accent)", display: "block" }}>MAURI</Display>
        <Mono style={{ fontSize: 14, color: "var(--muted)", marginTop: 2, display: "block", letterSpacing: "0.12em" }}>FINANZAS PERSONALES</Mono>
      </div>

      <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)" }}>
        {[
          { label: "Ingresos", value: clp(totI), color: "var(--accent)" },
          { label: "Gastos", value: clp(totG), color: "var(--red)" },
          { label: "Margen", value: `${margenPct}%`, color: margen >= 0 ? "var(--accent)" : "var(--red)" },
        ].map(r => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <Mono style={{ fontSize: 13, color: "var(--muted)" }}>{r.label}</Mono>
            <Mono style={{ fontSize: 11, color: r.color, fontWeight: 500 }}>{r.value}</Mono>
          </div>
        ))}
      </div>

      <nav style={{ flex: 1, padding: "14px 10px" }}>
        {NAV.map(n => {
          const on = active === n.id;
          return (
            <button key={n.id} className="nav-btn" onClick={() => setActive(n.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              padding: "10px 12px", borderRadius: "var(--r-sm)", border: "none",
              background: on ? "var(--accent-dim)" : "transparent",
              color: on ? "var(--accent)" : "var(--dim)",
              fontFamily: "var(--display)", fontWeight: on ? 700 : 400,
              fontSize: 14, textAlign: "left", marginBottom: 2, letterSpacing: "-0.2px"
            }}>
              <Mono style={{ fontSize: 16, width: 20, textAlign: "center" }}>{n.icon}</Mono>
              {n.label}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)" }}>
        <Mono style={{ fontSize: 14, color: "var(--muted)" }}>
          {new Date().toLocaleDateString("es-CL", { month: "long", year: "numeric" }).toUpperCase()}
        </Mono>
      </div>
      <div style={{ padding: "14px 24px" }}>
        <button onClick={() => supabase.auth.signOut()} style={{ ...Btn({ variant: "danger" }).props.style, width: "100%", textAlign: "center", display: "block" }}>Cerrar Sesión</button>
      </div>
    </aside>
  );
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard() {
  const { data, totI, totG, totV, margen, margenPct } = useF();

  const [filterMonth, setFilterMonth] = useState("Global");
  const [sortBy, setSortBy] = useState("fecha");
  const [sortDesc, setSortDesc] = useState(true);

  const monthsSet = new Set();
  const d = new Date();
  for (let i = 0; i < 12; i++) {
    const nd = new Date(d.getFullYear(), d.getMonth() - i, 1);
    monthsSet.add(nd.toISOString().slice(0, 7));
  }
  data.ingresos.forEach(i => i.fecha && monthsSet.add(i.fecha.substring(0, 7)));
  data.gastos.forEach(g => g.fecha && monthsSet.add(g.fecha.substring(0, 7)));
  data.inversiones.forEach(v => v.fecha && monthsSet.add(v.fecha.substring(0, 7)));
  const availableMonths = Array.from(monthsSet).sort().reverse();

  const isMatch = (f) => filterMonth === "Global" || (f && f.substring(0, 7) === filterMonth);
  const fIngresos = data.ingresos.filter(x => isMatch(x.fecha));
  const fGastos = data.gastos.filter(x => isMatch(x.fecha));
  const fInversiones = data.inversiones.filter(x => isMatch(x.fecha));

  const fTotI = fIngresos.reduce((a, b) => a + (b.monto || 0), 0);
  const fTotG = fGastos.reduce((a, b) => a + (b.monto || 0), 0);
  const fTotV = fInversiones.reduce((a, b) => a + (b.monto || 0), 0);
  const fMargen = fTotI - fTotG;
  const fMargenPct = fTotI > 0 ? ((fMargen / fTotI) * 100).toFixed(1) : "0.0";

  const byCat = fGastos.reduce((a, g) => { a[g.categoria] = (a[g.categoria] || 0) + g.monto; return a; }, {});
  const pieData = Object.entries(byCat).map(([name, value]) => ({ name, value }));

  const trend = [
    { mes: "Sep", ingresos: 472000, gastos: 356000 },
    { mes: "Oct", ingresos: 520000, gastos: 167000 },
    { mes: "Nov", ingresos: 481000, gastos: 171000 },
    { mes: "Dic", ingresos: 510000, gastos: 180000 },
    { mes: "Ene", ingresos: 460000, gastos: 162000 },
    { mes: "Feb", ingresos: 550000, gastos: 175000 },
    { mes: "Mar", ingresos: totI, gastos: totG },
  ];

  const cards = [
    { label: "Ingresos", value: clp(fTotI), sub: `${fIngresos.filter(x => x.monto > 0).length} fuentes`, color: "var(--accent)", bg: "var(--accent-dim)", icon: "↑" },
    { label: "Gastos", value: clp(fTotG), sub: `${fGastos.length} ítems`, color: "var(--red)", bg: "var(--red-dim)", icon: "↓" },
    { label: "Inversiones", value: clp(fTotV), sub: "Capital invertido", color: "var(--blue)", bg: "var(--blue-dim)", icon: "◎" },
    { label: "Margen Neto", value: clp(fMargen), sub: `${fMargenPct}% de ingresos`, color: fMargen >= 0 ? "var(--accent)" : "var(--red)", bg: fMargen >= 0 ? "var(--accent-dim)" : "var(--red-dim)", icon: "≈" },
  ];


  return (
    <div className="page">
      <PageHeader title="Dashboard" sub="Resumen financiero" action={
        <div style={{ width: 150 }}>
          <Sel
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            options={[
              { value: "Global", label: "Global" },
              ...availableMonths.map(m => ({ value: m, label: m }))
            ]}
          />
        </div>
      } />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        {cards.map((c, i) => (
          <Card key={i} style={{ padding: "20px 22px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 14, right: 14, width: 34, height: 34, borderRadius: 8, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Mono style={{ fontSize: 17, color: c.color }}>{c.icon}</Mono>
            </div>
            <Mono style={{ fontSize: 14, color: "var(--muted)", letterSpacing: "0.08em", display: "block", marginBottom: 7 }}>{c.label.toUpperCase()}</Mono>
            <Display style={{ fontWeight: 700, fontSize: 21, color: c.color, display: "block", marginBottom: 3 }}>{c.value}</Display>
            <Mono style={{ fontSize: 13, color: "var(--muted)" }}>{c.sub}</Mono>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card style={{ padding: 24 }}>
          <Display style={{ fontWeight: 700, fontSize: 15, color: "var(--dim)", display: "block", marginBottom: 16 }}>Tendencia Mensual</Display>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7fff6e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#7fff6e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff5f6d" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ff5f6d" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fill: "var(--muted)", fontFamily: "var(--mono)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={short} tick={{ fill: "var(--muted)", fontFamily: "var(--mono)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <TtTip formatter={v => [clp(v)]} labelStyle={{ color: "var(--dim)" }} itemStyle={{ color: "var(--text)" }} />
              <Area type="monotone" dataKey="ingresos" stroke="#7fff6e" strokeWidth={2} fill="url(#gi)" name="Ingresos" />
              <Area type="monotone" dataKey="gastos" stroke="#ff5f6d" strokeWidth={2} fill="url(#gg)" name="Gastos" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ padding: 24 }}>
          <Display style={{ fontWeight: 700, fontSize: 15, color: "var(--dim)", display: "block", marginBottom: 12 }}>Gastos por Categoría</Display>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_CLR[i % PIE_CLR.length]} />)}
              </Pie>
              <TtTip formatter={v => [clp(v)]} itemStyle={{ color: "var(--text)" }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
            {pieData.slice(0, 5).map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: 2, background: PIE_CLR[i % PIE_CLR.length], flexShrink: 0 }} />
                <Mono style={{ fontSize: 15, color: "var(--dim)", flex: 1 }}>{d.name}</Mono>
                <Mono style={{ fontSize: 11, color: "var(--text)" }}>{short(d.value)}</Mono>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {[
          { title: "Fuentes de Ingreso", items: fIngresos, color: "var(--accent)" },
          { title: "Gastos Principales", items: fGastos.slice(0, 5), color: "var(--red)" },
        ].map(({ title, items, color }) => (
          <Card key={title} style={{ padding: 24 }}>
            <Display style={{ fontWeight: 700, fontSize: 15, color: "var(--dim)", display: "block", marginBottom: 14 }}>{title}</Display>
            {items.map((x, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div>
                  <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{x.nombre}</div>
                  <Mono style={{ fontSize: 13, color: "var(--muted)" }}>{x.categoria}</Mono>
                </div>
                <Mono style={{ fontSize: 13, color, fontWeight: 500 }}>{clp(x.monto)}</Mono>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── CRUD MODAL ────────────────────────────────────────────────────────────────
function CrudModal({ title, fields, form, setForm, onSave, onClose }) {
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  return (
    <Modal title={title} onClose={onClose}>
      {fields.map(fl => (
        <Fld key={fl.key} label={fl.label}>
          {fl.type === "select"
            ? <Sel value={form[fl.key]} onChange={f(fl.key)} options={fl.options} />
            : <Inp type={fl.type || "text"} value={form[fl.key]} onChange={f(fl.key)} placeholder={fl.placeholder} />
          }
        </Fld>
      ))}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={onSave}>Guardar</Btn>
      </div>
    </Modal>
  );
}

// ─── INGRESOS ──────────────────────────────────────────────────────────────────
const CATS_I = ["Freelance", "Coaching", "Competencias", "Empleado", "Negocio", "Arriendo", "Otro"];

function Ingresos() {
  const { data, totI, add, update, remove } = useF();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [filterMonth, setFilterMonth] = useState("Global");
  const [sortBy, setSortBy] = useState("fecha");
  const [sortDesc, setSortDesc] = useState(true);

  const blank = () => ({ nombre: "", categoria: "Freelance", monto: "", fecha: new Date().toISOString().slice(0, 10), recurrente: "false" });
  const open = (item = null) => { setForm(item ? { ...item, monto: String(item.monto), recurrente: String(item.recurrente) } : blank()); setEditing(item?.id || null); setModal(true); };
  const close = () => setModal(false);
  const save = () => {
    const item = { ...form, monto: parseFloat(form.monto) || 0, recurrente: form.recurrente === "true" };
    editing ? update("ingresos", editing, item) : add("ingresos", item);
    close();
  };

  const monthsSet = new Set();
  const d = new Date();
  for (let i = 0; i < 12; i++) {
    const nd = new Date(d.getFullYear(), d.getMonth() - i, 1);
    monthsSet.add(nd.toISOString().slice(0, 7));
  }
  data.ingresos.forEach(i => i.fecha && monthsSet.add(i.fecha.substring(0, 7)));
  const availableMonths = Array.from(monthsSet).sort().reverse();
  const isMatch = (f) => filterMonth === "Global" || (f && f.substring(0, 7) === filterMonth);
  const fIngresos = data.ingresos.filter(x => isMatch(x.fecha));
  const fTotI = fIngresos.reduce((a, b) => a + (b.monto || 0), 0);

  const curMoI = new Date().toISOString().slice(0, 7);
  const tHistI = data.ingresos.reduce((a, b) => a + (b.monto || 0), 0);
  const tMesI = data.ingresos.filter(x => x.fecha?.startsWith(curMoI)).reduce((a, b) => a + (b.monto || 0), 0);


  const sortedIngresos = [...fIngresos].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "monto") cmp = a.monto - b.monto;
    else if (sortBy === "categoria") cmp = a.categoria.localeCompare(b.categoria);
    else cmp = new Date(a.fecha) - new Date(b.fecha);
    return sortDesc ? -cmp : cmp;
  });

  const byCat = CATS_I.slice(0, 3).map(c => ({ cat: c, total: fIngresos.filter(x => x.categoria === c).reduce((s, x) => s + x.monto, 0), count: fIngresos.filter(x => x.categoria === c).length }));

  return (
    <div className="page">
      <PageHeader title="Ingresos" sub={`${fIngresos.length} fuentes · ${clp(fTotI)}`} action={
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ width: 140 }}>
            <Sel value={sortBy} onChange={e => setSortBy(e.target.value)} options={[
              { value: "fecha", label: "Por Fecha" },
              { value: "monto", label: "Por Monto" },
              { value: "categoria", label: "Por Categoría" }
            ]} />
          </div>
          <Btn variant="ghost" sm onClick={() => setSortDesc(!sortDesc)}>{sortDesc ? "↓" : "↑"}</Btn>
          <div style={{ width: 130 }}>
            <Sel
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              options={[
                { value: "Global", label: "Global" },
                ...availableMonths.map(m => ({ value: m, label: m }))
              ]}
            />
          </div>
          <Btn onClick={() => open()}>+ Agregar</Btn>
        </div>
      } />

      <SummaryCards
        title1="TOTAL INGRESOS (HISTÓRICO)" val1={clp(tHistI)}
        title2="INGRESOS (ESTE MES)" val2={clp(tMesI)} color="var(--accent)"
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 22 }}>
        {byCat.map(b => (
          <Card key={b.cat} style={{ padding: "18px 20px" }}>
            <Mono style={{ fontSize: 14, color: "var(--muted)", display: "block", marginBottom: 6 }}>{b.cat.toUpperCase()}</Mono>
            <Display style={{ fontWeight: 700, fontSize: 20, color: "var(--accent)", display: "block" }}>{clp(b.total)}</Display>
            <Mono style={{ fontSize: 13, color: "var(--muted)", marginTop: 4, display: "block" }}>{b.count} fuentes</Mono>
          </Card>
        ))}
      </div>

      <Card>
        <Table
          headers={["Fuente", "Categoría", "Monto", "Fecha", "Recurrente", ""]}
          rows={sortedIngresos.map(x => [
            <span style={{ fontWeight: 500 }}>{x.nombre}</span>,
            <Tag>{x.categoria}</Tag>,
            <Mono style={{ color: "var(--accent)" }}>{clp(x.monto)}</Mono>,
            <Mono style={{ color: "var(--muted)" }}>{x.fecha}</Mono>,
            <Mono style={{ color: x.recurrente ? "var(--accent)" : "var(--muted)" }}>{x.recurrente ? "● Sí" : "○ No"}</Mono>,
            <div style={{ display: "flex", gap: 8 }}>
              <Btn sm variant="ghost" onClick={() => open(x)}>Editar</Btn>
              <Btn sm variant="danger" onClick={() => remove("ingresos", x.id)}>×</Btn>
            </div>
          ])}
        />
      </Card>

      {modal && (
        <CrudModal
          title={editing ? "Editar Ingreso" : "Nueva Fuente"}
          fields={[
            { key: "nombre", label: "Nombre", placeholder: "Ej: Eldorado" },
            { key: "categoria", label: "Categoría", type: "select", options: CATS_I },
            { key: "monto", label: "Monto CLP", type: "number", placeholder: "0" },
            { key: "fecha", label: "Fecha", type: "date" },
            { key: "recurrente", label: "Recurrente", type: "select", options: [{ value: "true", label: "Sí" }, { value: "false", label: "No" }] },
          ]}
          form={form} setForm={setForm} onSave={save} onClose={close}
        />
      )}
    </div>
  );
}

// ─── GASTOS ────────────────────────────────────────────────────────────────────
const CATS_G = ["Servicios", "Suscripciones", "Herramientas", "Personal", "Educación", "Salud", "Alimentación", "Transporte", "Otros"];

function Gastos() {
  const { data, totG, add, update, remove } = useF();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [filter, setFilter] = useState("Todos");
  const [filterMonth, setFilterMonth] = useState("Global");
  const [sortBy, setSortBy] = useState("fecha");
  const [sortDesc, setSortDesc] = useState(true);

  const blank = () => ({ nombre: "", categoria: "Personal", monto: "", fecha: new Date().toISOString().slice(0, 10) });
  const open = (item = null) => { setForm(item ? { ...item, monto: String(item.monto) } : blank()); setEditing(item?.id || null); setModal(true); };
  const close = () => setModal(false);
  const save = () => {
    const item = { ...form, monto: parseFloat(form.monto) || 0 };
    editing ? update("gastos", editing, item) : add("gastos", item);
    close();
  };

  const monthsSet = new Set();
  const d = new Date();
  for (let i = 0; i < 12; i++) {
    const nd = new Date(d.getFullYear(), d.getMonth() - i, 1);
    monthsSet.add(nd.toISOString().slice(0, 7));
  }
  data.gastos.forEach(g => g.fecha && monthsSet.add(g.fecha.substring(0, 7)));
  const availableMonths = Array.from(monthsSet).sort().reverse();
  const isMatch = (f) => filterMonth === "Global" || (f && f.substring(0, 7) === filterMonth);

  const fGastos = data.gastos.filter(x => isMatch(x.fecha));
  const fTotG = fGastos.reduce((a, b) => a + (b.monto || 0), 0);

  const curMoG = new Date().toISOString().slice(0, 7);
  const tHistG = data.gastos.reduce((a, b) => a + (b.monto || 0), 0);
  const tMesG = data.gastos.filter(x => x.fecha?.startsWith(curMoG)).reduce((a, b) => a + (b.monto || 0), 0);

  const byCat = fGastos.reduce((a, g) => { a[g.categoria] = (a[g.categoria] || 0) + g.monto; return a; }, {});
  const chartData = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  const cats = ["Todos", ...new Set(fGastos.map(g => g.categoria))];
  const filteredList = filter === "Todos" ? fGastos : fGastos.filter(g => g.categoria === filter);

  const sortedGastos = [...filteredList].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "monto") cmp = a.monto - b.monto;
    else if (sortBy === "categoria") cmp = a.categoria.localeCompare(b.categoria);
    else cmp = new Date(a.fecha) - new Date(b.fecha);
    return sortDesc ? -cmp : cmp;
  });


  return (
    <div className="page">
      <PageHeader title="Gastos" sub={`${fGastos.length} ítems · ${clp(fTotG)}`} action={
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ width: 140 }}>
            <Sel value={sortBy} onChange={e => setSortBy(e.target.value)} options={[
              { value: "fecha", label: "Por Fecha" },
              { value: "monto", label: "Por Monto" },
              { value: "categoria", label: "Por Categoría" }
            ]} />
          </div>
          <Btn variant="ghost" sm onClick={() => setSortDesc(!sortDesc)}>{sortDesc ? "↓" : "↑"}</Btn>
          <div style={{ width: 130 }}>
            <Sel
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              options={[
                { value: "Global", label: "Global" },
                ...availableMonths.map(m => ({ value: m, label: m }))
              ]}
            />
          </div>
          <Btn onClick={() => open()}>+ Agregar</Btn>
        </div>
      } />

      <SummaryCards
        title1="TOTAL GASTOS (HISTÓRICO)" val1={clp(tHistG)}
        title2="GASTOS (ESTE MES)" val2={clp(tMesG)} color="var(--red)"
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 22 }}>
        <Card style={{ padding: 24 }}>
          <Display style={{ fontWeight: 700, fontSize: 15, color: "var(--dim)", display: "block", marginBottom: 14 }}>Por Categoría</Display>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "var(--muted)", fontFamily: "var(--mono)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" width={95} tick={{ fill: "var(--dim)", fontFamily: "var(--mono)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <TtTip formatter={v => [clp(v)]} itemStyle={{ color: "var(--text)" }} />
              <Bar dataKey="value" fill="var(--red)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ padding: 24 }}>
          <Display style={{ fontWeight: 700, fontSize: 15, color: "var(--dim)", display: "block", marginBottom: 14 }}>Distribución</Display>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {chartData.slice(0, 5).map((d, i) => {
              const pct = fTotG > 0 ? (d.value / fTotG * 100).toFixed(0) : 0;
              return (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <Mono style={{ fontSize: 15, color: "var(--dim)" }}>{d.name}</Mono>
                    <Mono style={{ fontSize: 11, color: "var(--red)" }}>{pct}%</Mono>
                  </div>
                  <div style={{ height: 4, background: "var(--border)", borderRadius: 2 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "var(--red)", borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ padding: "14px 16px 0", display: "flex", gap: 7, flexWrap: "wrap" }}>
          {cats.map(c => <Pill key={c} active={filter === c} onClick={() => setFilter(c)} color="var(--red)">{c}</Pill>)}
        </div>
        <Table
          headers={["Nombre", "Categoría", "Monto", "Fecha", ""]}
          rows={sortedGastos.map(g => [
            <span style={{ fontWeight: 500 }}>{g.nombre}</span>,
            <Tag color={CAT_CLR[g.categoria] || "var(--dim)"}>{g.categoria}</Tag>,
            <Mono style={{ color: "var(--red)" }}>{clp(g.monto)}</Mono>,
            <Mono style={{ color: "var(--muted)" }}>{g.fecha}</Mono>,
            <div style={{ display: "flex", gap: 8 }}>
              <Btn sm variant="ghost" onClick={() => open(g)}>Editar</Btn>
              <Btn sm variant="danger" onClick={() => remove("gastos", g.id)}>×</Btn>
            </div>
          ])}
        />
      </Card>

      {modal && (
        <CrudModal
          title={editing ? "Editar Gasto" : "Nuevo Gasto"}
          fields={[
            { key: "nombre", label: "Nombre", placeholder: "Ej: Netflix" },
            { key: "categoria", label: "Categoría", type: "select", options: CATS_G },
            { key: "monto", label: "Monto CLP", type: "number", placeholder: "0" },
            { key: "fecha", label: "Fecha", type: "date" },
          ]}
          form={form} setForm={setForm} onSave={save} onClose={close}
        />
      )}
    </div>
  );
}

// ─── INVERSIONES ───────────────────────────────────────────────────────────────
const TIPOS_V = ["DAP", "Renta Fija", "Renta Variable", "Fondos Mutuos", "Acciones", "Criptomonedas", "Bienes Raíces", "Otro"];

// ─── DATE PICKER ───────────────────────────────────────────────────────────────
function DatePicker({ value, onChange, label }) {
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  const months = [
    { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' }, { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' }, { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => String(currentYear - 2 + i));

  const [y, m, d] = value ? value.split('-') : [String(currentYear), '01', '01'];

  const handle = (part, val) => {
    const parts = { y, m, d };
    parts[part] = val;
    onChange(`${parts.y}-${parts.m}-${parts.d}`);
  };

  const sel = (val, options, part) => (
    <select value={val} onChange={e => handle(part, e.target.value)} style={{
      flex: 1, background: 'var(--bg)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '9px 10px', color: 'var(--text)',
      fontFamily: 'var(--mono)', fontSize: 13, outline: 'none', cursor: 'pointer'
    }}>
      {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
    </select>
  );

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {sel(d, days.map(v => ({ value: v, label: v })), 'd')}
      {sel(m, months, 'm')}
      {sel(y, years.map(v => ({ value: v, label: v })), 'y')}
    </div>
  );
}

function Inversiones() {
  const { data, totV, add, update, remove } = useF();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [filterMonth, setFilterMonth] = useState("Global");
  const [sortBy, setSortBy] = useState("fecha");
  const [sortDesc, setSortDesc] = useState(true);

  const blank = () => ({ nombre: "", tipo: "DAP", monto: "", fecha: new Date().toISOString().slice(0, 10), rendimiento: "", rendimientoTipo: "anual", notas: "", fechaTermino: "", ganancia: "" });
  const open = (item = null) => { setForm(item ? { ...item, monto: String(item.monto), rendimiento: String(item.rendimiento || ""), rendimientoTipo: item.rendimientoTipo || "anual", fechaTermino: item.fechaTermino || "", ganancia: String(item.ganancia || "") } : blank()); setEditing(item?.id || null); setModal(true); };
  const close = () => setModal(false);
  const save = () => {
    const item = {
      ...form,
      monto: parseFloat(form.monto) || 0,
      rendimiento: form.rendimiento !== "" ? parseFloat(form.rendimiento) : null,
      rendimientoTipo: form.rendimientoTipo || "anual",
      fechaTermino: form.tipo === "DAP" && form.fechaTermino ? form.fechaTermino : null,
      notas: form.notas || null,
      ganancia: form.ganancia !== "" ? parseFloat(form.ganancia) : null,
    };
    editing ? update("inversiones", editing, item) : add("inversiones", item);
    close();
  };

  const monthsSet = new Set();
  const d = new Date();
  for (let i = 0; i < 12; i++) {
    const nd = new Date(d.getFullYear(), d.getMonth() - i, 1);
    monthsSet.add(nd.toISOString().slice(0, 7));
  }
  data.inversiones.forEach(v => v.fecha && monthsSet.add(v.fecha.substring(0, 7)));
  const availableMonths = Array.from(monthsSet).sort().reverse();
  const isMatch = (f) => filterMonth === "Global" || (f && f.substring(0, 7) === filterMonth);

  const fInversiones = data.inversiones.filter(x => isMatch(x.fecha));
  const fTotV = fInversiones.reduce((a, b) => a + (b.monto || 0), 0);

  const curMoV = new Date().toISOString().slice(0, 7);
  const tHistV = data.inversiones.reduce((a, b) => a + (b.monto || 0), 0);
  const tMesV = data.inversiones.filter(x => x.fecha?.startsWith(curMoV)).reduce((a, b) => a + (b.monto || 0), 0);
  const totalRend = fInversiones.reduce((s, x) => {
    let r = x.rendimiento || 0;
    if (x.rendimientoTipo === "mensual") r *= 12;
    return s + (x.monto * r / 100);
  }, 0);

  const sortedInversiones = [...fInversiones].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "monto") cmp = a.monto - b.monto;
    else if (sortBy === "tipo") cmp = a.tipo.localeCompare(b.tipo);
    else cmp = new Date(a.fecha) - new Date(b.fecha);
    return sortDesc ? -cmp : cmp;
  });


  return (
    <div className="page">
      <PageHeader title="Inversiones" sub={`${fInversiones.length} posiciones · ${clp(fTotV)}`} action={
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ width: 140 }}>
            <Sel value={sortBy} onChange={e => setSortBy(e.target.value)} options={[
              { value: "fecha", label: "Por Fecha" },
              { value: "monto", label: "Por Capital" },
              { value: "tipo", label: "Por Tipo" }
            ]} />
          </div>
          <Btn variant="ghost" sm onClick={() => setSortDesc(!sortDesc)}>{sortDesc ? "↓" : "↑"}</Btn>
          <div style={{ width: 130 }}>
            <Sel
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              options={[
                { value: "Global", label: "Global" },
                ...availableMonths.map(m => ({ value: m, label: m }))
              ]}
            />
          </div>
          <Btn onClick={() => open()}>+ Agregar</Btn>
        </div>
      } />

      <SummaryCards
        title1="CAPITAL TOTAL (HISTÓRICO)" val1={clp(tHistV)}
        title2="CAPITAL INVERTIDO (ESTE MES)" val2={clp(tMesV)} color="var(--blue)"
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 22 }}>
        {[
          { label: "Capital Total", value: clp(fTotV), color: "var(--blue)", icon: "◎" },
          { label: "Rendimiento Estimado", value: clp(totalRend), color: "var(--gold)", icon: "↑", sub: "anual" },
          { label: "Posiciones", value: fInversiones.length, color: "var(--text)", icon: "≡" },
        ].map(c => (
          <Card key={c.label} style={{ padding: "20px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <Mono style={{ fontSize: 14, color: "var(--muted)", display: "block", marginBottom: 6 }}>{c.label.toUpperCase()}</Mono>
                <Display style={{ fontWeight: 700, fontSize: 21, color: c.color, display: "block" }}>{c.value}</Display>
                {c.sub && <Mono style={{ fontSize: 13, color: "var(--muted)", display: "block", marginTop: 2 }}>{c.sub}</Mono>}
              </div>
              <Mono style={{ fontSize: 22, color: c.color, opacity: 0.4 }}>{c.icon}</Mono>
            </div>
          </Card>
        ))}
      </div>

      {fInversiones.length > 0 && (
        <Card style={{ padding: 24, marginBottom: 16 }}>
          <Display style={{ fontWeight: 700, fontSize: 15, color: "var(--dim)", display: "block", marginBottom: 16 }}>Distribución del Portfolio</Display>
          {fInversiones.map((inv, i) => {
            const pct = fTotV > 0 ? (inv.monto / fTotV * 100).toFixed(1) : 0;
            return (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <div>
                    <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{inv.nombre}</span>
                    <Mono style={{ fontSize: 13, color: "var(--muted)", marginLeft: 8 }}>{inv.tipo}</Mono>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <Mono style={{ fontSize: 13, color: "var(--blue)" }}>{clp(inv.monto)}</Mono>
                    <Mono style={{ fontSize: 13, color: "var(--muted)", marginLeft: 8 }}>{pct}%</Mono>
                  </div>
                </div>
                <div style={{ height: 6, background: "var(--border)", borderRadius: 3 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "var(--blue)", borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
        </Card>
      )}

      <Card>
        <Table
          headers={["Instrumento", "Tipo", "Capital", "Rto. %", "Inicio", "Vencimiento", "Notas", ""]}
          rows={sortedInversiones.map(x => {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const diasRestantes = x.fechaTermino
              ? Math.ceil((new Date(x.fechaTermino) - hoy) / (1000 * 60 * 60 * 24))
              : null;
            const vencColor = diasRestantes === null ? null
              : diasRestantes < 0 ? 'var(--red)'
                : diasRestantes < 10 ? 'var(--red)'
                  : diasRestantes < 30 ? 'var(--gold)'
                    : 'var(--accent)';
            const vencLabel = diasRestantes === null ? '—'
              : diasRestantes < 0 ? `Venció hace ${Math.abs(diasRestantes)}d`
                : diasRestantes === 0 ? '¡Vence hoy!'
                  : `${diasRestantes} días`;
            return [
              <span style={{ fontWeight: 500 }}>{x.nombre}</span>,
              <Tag color="var(--blue)">{x.tipo}</Tag>,
              <Mono style={{ color: "var(--blue)" }}>{clp(x.monto)}</Mono>,
              <Mono style={{ color: "var(--gold)" }}>{x.rendimiento || 0}% <span style={{ fontSize: 10, color: "var(--muted)" }}>{x.rendimientoTipo === "mensual" ? "mensual" : "anual"}</span></Mono>,
              <Mono style={{ color: "var(--muted)" }}>{x.fecha}</Mono>,
              x.fechaTermino ? (
                <div>
                  <Mono style={{ color: "var(--muted)", display: "block", fontSize: 12 }}>{x.fechaTermino}</Mono>
                  <span style={{
                    display: "inline-block", marginTop: 3,
                    background: `${vencColor}20`, color: vencColor,
                    border: `1px solid ${vencColor}40`,
                    borderRadius: 4, padding: "1px 7px",
                    fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600
                  }}>{vencLabel}</span>
                </div>
              ) : <Mono style={{ color: "var(--muted)", fontSize: 12 }}>—</Mono>,
              <Mono style={{ color: "var(--muted)", fontSize: 12 }}>{x.notas || "—"}</Mono>,
              <div style={{ display: "flex", gap: 8 }}>
                <Btn sm variant="ghost" onClick={() => open(x)}>Editar</Btn>
                <Btn sm variant="danger" onClick={() => remove("inversiones", x.id)}>×</Btn>
              </div>
            ];
          })}
        />
      </Card>

      {modal && (
        <Modal title={editing ? "Editar Inversión" : "Nueva Inversión"} onClose={close}>
          <Fld label="Nombre"><Inp value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: DAP BancoEstado" /></Fld>
          <Fld label="Tipo"><Sel value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} options={TIPOS_V} /></Fld>
          <Fld label="Monto CLP"><Inp type="number" value={form.monto} onChange={e => setForm(p => ({ ...p, monto: e.target.value }))} placeholder="0" /></Fld>
          <Fld label="Ganancia Estimada CLP"><Inp type="number" value={form.ganancia} onChange={e => setForm(p => ({ ...p, ganancia: e.target.value }))} placeholder="Ej: 5000" /></Fld>
          <Fld label="Período Rend"><Sel value={form.rendimientoTipo} onChange={e => setForm(p => ({ ...p, rendimientoTipo: e.target.value }))} options={[{ value: "anual", label: "Anual" }, { value: "mensual", label: "Mensual" }]} /></Fld>
          <Fld label="Rendimiento %"><Inp type="number" value={form.rendimiento} onChange={e => setForm(p => ({ ...p, rendimiento: e.target.value }))} placeholder="0.0" /></Fld>
          <Fld label="Fecha de Inicio"><DatePicker value={form.fecha} onChange={v => setForm(p => ({ ...p, fecha: v }))} /></Fld>
          {form.tipo === "DAP" && <Fld label="Fecha de Término"><DatePicker value={form.fechaTermino || new Date().toISOString().slice(0, 10)} onChange={v => setForm(p => ({ ...p, fechaTermino: v }))} /></Fld>}
          <Fld label="Notas"><Inp value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} placeholder="Observaciones..." /></Fld>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
            <Btn variant="ghost" onClick={close}>Cancelar</Btn>
            <Btn onClick={save}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── MARGEN ────────────────────────────────────────────────────────────────────
function Margen() {
  const { totI, totG, totV, margen, margenPct, data } = useF();
  const pct = parseFloat(margenPct);
  const gastosPct = totI > 0 ? ((totG / totI) * 100).toFixed(1) : 0;
  const invPct = totI > 0 ? ((totV / totI) * 100).toFixed(1) : 0;
  const saldoLibre = margen - totV;
  const saldoLibrePct = totI > 0 ? ((saldoLibre / totI) * 100).toFixed(1) : 0;
  const recurrentes = data.gastos.filter(g => g.recurrente).reduce((s, g) => s + g.monto, 0);
  const noRecurrentes = data.gastos.filter(g => !g.recurrente).reduce((s, g) => s + g.monto, 0);
  const score = Math.min(100, Math.max(0, pct * 1.5));
  const healthColor = score >= 70 ? "var(--accent)" : score >= 40 ? "var(--gold)" : "var(--red)";
  const healthLabel = score >= 70 ? "Excelente" : score >= 40 ? "Aceptable" : "Ajustado";

  const WRow = ({ label, value, positive, bold }) => {
    const p = totI > 0 ? Math.abs(value / totI * 100) : 0;
    const c = value >= 0 ? "var(--accent)" : "var(--red)";
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <Mono style={{ width: 150, fontSize: 12, color: bold ? "var(--text)" : "var(--dim)", fontWeight: bold ? 600 : 400, flexShrink: 0 }}>{label}</Mono>
        <div style={{ flex: 1, height: 7, background: "var(--border)", borderRadius: 3 }}>
          <div style={{ width: `${p}%`, height: "100%", background: c, borderRadius: 3, transition: "width 0.6s ease" }} />
        </div>
        <Mono style={{ width: 130, textAlign: "right", fontSize: 13, color: c, fontWeight: bold ? 700 : 400 }}>
          {value < 0 ? "−" : "+"}{clp(Math.abs(value))}
        </Mono>
      </div>
    );
  };

  const insights = [
    pct < 20 && { type: "warning", text: "Tu margen es bajo. Considera reducir gastos variables o aumentar ingresos." },
    pct >= 20 && { type: "ok", text: `Buen margen. Estás reteniendo el ${margenPct}% de tus ingresos.` },
    parseFloat(invPct) < 10 && { type: "info", text: `Podrías incrementar el porcentaje destinado a inversiones (actualmente ${invPct}%).` },
    recurrentes > totI * 0.5 && { type: "warning", text: "Tus gastos recurrentes superan el 50% de tus ingresos." },
    parseFloat(invPct) >= 15 && { type: "ok", text: `Excelente hábito: ${invPct}% de tus ingresos se están invirtiendo.` },
  ].filter(Boolean);

  return (
    <div className="page">
      <PageHeader title="Margen" sub="Análisis detallado de tu salud financiera" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 22 }}>
        <Card style={{ padding: 32, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <Mono style={{ fontSize: 14, color: "var(--muted)", letterSpacing: "0.1em", display: "block", marginBottom: 12 }}>MARGEN NETO</Mono>
          <Display style={{ fontWeight: 800, fontSize: 46, color: margen >= 0 ? "var(--accent)" : "var(--red)", letterSpacing: "-2px", lineHeight: 1, display: "block" }}>
            {clp(margen)}
          </Display>
          <Mono style={{ fontSize: 18, color: "var(--muted)", marginTop: 8, display: "block" }}>{margenPct}% de los ingresos</Mono>
          <div style={{ marginTop: 22, display: "flex", gap: 28 }}>
            <div>
              <Mono style={{ fontSize: 14, color: "var(--muted)", display: "block" }}>INGRESOS</Mono>
              <Display style={{ fontWeight: 700, color: "var(--accent)" }}>{clp(totI)}</Display>
            </div>
            <div>
              <Mono style={{ fontSize: 14, color: "var(--muted)", display: "block" }}>GASTOS</Mono>
              <Display style={{ fontWeight: 700, color: "var(--red)" }}>{clp(totG)}</Display>
            </div>
          </div>
        </Card>

        <Card style={{ padding: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Mono style={{ fontSize: 14, color: "var(--muted)", letterSpacing: "0.1em", display: "block", marginBottom: 16 }}>SALUD FINANCIERA</Mono>
          <div style={{ position: "relative", width: 160, height: 82, marginBottom: 14 }}>
            <svg viewBox="0 0 160 82" style={{ overflow: "visible" }}>
              <path d="M 20 80 A 60 60 0 0 1 140 80" fill="none" stroke="var(--border)" strokeWidth="12" strokeLinecap="round" />
              <path d="M 20 80 A 60 60 0 0 1 140 80" fill="none" stroke={healthColor} strokeWidth="12" strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 188} 188`} />
            </svg>
            <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
              <Display style={{ fontWeight: 800, fontSize: 30, color: healthColor, letterSpacing: "-1px" }}>{Math.round(score)}</Display>
            </div>
          </div>
          <Display style={{ fontWeight: 700, fontSize: 18, color: healthColor }}>{healthLabel}</Display>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 18, width: "100%" }}>
            {[
              { label: "Gastos", value: `${gastosPct}%`, color: "var(--red)", note: "de ingresos" },
              { label: "Inversiones", value: `${invPct}%`, color: "var(--blue)", note: "de ingresos" },
              { label: "Saldo Libre", value: clp(saldoLibre), color: "var(--gold)", note: `${saldoLibrePct}%` },
              { label: "Recurrentes", value: clp(recurrentes), color: "var(--muted)", note: "gastos fijos" },
            ].map(s => (
              <div key={s.label} style={{ background: "var(--bg)", borderRadius: 8, padding: "9px 12px" }}>
                <Mono style={{ fontSize: 14, color: "var(--muted)", display: "block", marginBottom: 3 }}>{s.label}</Mono>
                <Display style={{ fontWeight: 700, fontSize: 15, color: s.color, display: "block" }}>{s.value}</Display>
                <Mono style={{ fontSize: 14, color: "var(--muted)", display: "block" }}>{s.note}</Mono>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card style={{ padding: 24, marginBottom: 16 }}>
        <Display style={{ fontWeight: 700, fontSize: 15, color: "var(--dim)", display: "block", marginBottom: 18 }}>Flujo de Caja</Display>
        <WRow label="Ingresos Totales" value={totI} positive />
        <WRow label="Gastos Fijos" value={-recurrentes} />
        <WRow label="Gastos Variables" value={-noRecurrentes} />
        <WRow label="Inversiones" value={-totV} />
        <div style={{ height: 1, background: "var(--border)", margin: "10px 0" }} />
        <WRow label="Saldo Final" value={saldoLibre} bold />
      </Card>

      <Card style={{ padding: 24 }}>
        <Display style={{ fontWeight: 700, fontSize: 15, color: "var(--dim)", display: "block", marginBottom: 14 }}>Insights</Display>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {insights.map((ins, i) => {
            const clrs = { ok: "var(--accent)", warning: "var(--gold)", info: "var(--blue)" };
            const icons = { ok: "✓", warning: "!", info: "i" };
            const c = clrs[ins.type];
            return (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 14px", background: `${c}10`, borderRadius: 8, border: `1px solid ${c}30` }}>
                <Mono style={{ fontSize: 12, color: c, width: 16, flexShrink: 0 }}>{icons[ins.type]}</Mono>
                <span style={{ fontSize: 15, color: "var(--dim)" }}>{ins.text}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ─── KPIs ──────────────────────────────────────────────────────────────────────
function KPIs() {
  const { data, totI, totG, totV, margen, margenPct } = useF();

  const curMo = new Date().toISOString().slice(0, 7);
  const mesI = data.ingresos.filter(x => x.fecha?.startsWith(curMo)).reduce((s, x) => s + (x.monto || 0), 0);
  const mesG = data.gastos.filter(x => x.fecha?.startsWith(curMo)).reduce((s, x) => s + (x.monto || 0), 0);
  const mesN = mesI - mesG;

  // KPI calculations
  const savingsRate = totI > 0 ? ((margen / totI) * 100) : 0;
  const expRatio = totI > 0 ? ((totG / totI) * 100) : 0;
  const invRate = totI > 0 ? ((totV / totI) * 100) : 0;
  const runway = mesG > 0 ? (totV / mesG) : 0;
  const totalRendAnual = data.inversiones.reduce((s, x) => {
    let r = x.rendimiento || 0;
    if (x.rendimientoTipo === 'mensual') r *= 12;
    return s + (x.monto * r / 100);
  }, 0);
  const roi = totV > 0 ? ((totalRendAnual / totV) * 100) : 0;
  const burnRate = mesG;
  const recurrentes = data.gastos.filter(g => g.recurrente).reduce((s, g) => s + g.monto, 0);
  const fixedCostRatio = totI > 0 ? ((recurrentes / totI) * 100) : 0;
  const freeCashFlow = margen - totV;
  const fcfRate = totI > 0 ? ((freeCashFlow / totI) * 100) : 0;

  // Health score (0-100)
  let score = 0;
  if (savingsRate >= 20) score += 25; else score += Math.max(0, savingsRate / 20 * 25);
  if (expRatio <= 60) score += 20; else score += Math.max(0, (1 - (expRatio - 60) / 40) * 20);
  if (invRate >= 10) score += 20; else score += invRate / 10 * 20;
  if (runway >= 3) score += 20; else score += runway / 3 * 20;
  if (roi >= 3) score += 15; else score += roi / 3 * 15;
  score = Math.min(100, Math.round(score));

  const scoreColor = score >= 75 ? 'var(--accent)' : score >= 45 ? 'var(--gold)' : 'var(--red)';
  const scoreLabel = score >= 75 ? 'Excelente' : score >= 45 ? 'Bueno' : 'En riesgo';

  const KpiCard = ({ label, value, sub, color, pct, targetLabel, inverse, tooltip }) => {
    const [tip, setTip] = useState(false);
    const bar = pct !== undefined ? Math.min(100, Math.max(0, pct)) : null;
    const barColor = inverse
      ? (pct <= 60 ? 'var(--accent)' : pct <= 80 ? 'var(--gold)' : 'var(--red)')
      : (color || 'var(--accent)');
    return (
      <Card style={{ padding: '22px 24px', position: 'relative' }}>
        {/* Tooltip trigger */}
        <div
          onMouseEnter={() => setTip(true)}
          onMouseLeave={() => setTip(false)}
          style={{
            position: 'absolute', top: 12, right: 12,
            width: 18, height: 18, borderRadius: '50%',
            background: 'var(--border-hi)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            cursor: 'default', userSelect: 'none',
          }}
        >
          <Mono style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1 }}>?</Mono>
          {tip && tooltip && (
            <div style={{
              position: 'absolute', top: 24, right: 0,
              background: 'var(--bg-card)', border: '1px solid var(--border-hi)',
              borderRadius: 10, padding: '12px 14px', width: 220, zIndex: 200,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              animation: 'fadeUp 0.15s ease',
            }}>
              <Mono style={{ fontSize: 11, color: 'var(--accent)', display: 'block', marginBottom: 4 }}>{label}</Mono>
              <span style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, display: 'block' }}>{tooltip}</span>
              {targetLabel && <Mono style={{ fontSize: 11, color: 'var(--gold)', display: 'block', marginTop: 6 }}>Meta: {targetLabel}</Mono>}
            </div>
          )}
        </div>
        <Mono style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.1em', display: 'block', marginBottom: 6, paddingRight: 22 }}>{label.toUpperCase()}</Mono>
        <Display style={{ fontWeight: 800, fontSize: 28, color: color || 'var(--accent)', display: 'block', letterSpacing: '-1px', marginBottom: 2 }}>{value}</Display>
        {sub && <Mono style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 10 }}>{sub}</Mono>}
        {bar !== null && (
          <div style={{ marginTop: 10 }}>
            <div style={{ height: 5, background: 'var(--border)', borderRadius: 3 }}>
              <div style={{ width: `${bar}%`, height: '100%', background: barColor, borderRadius: 3, transition: 'width 0.6s ease' }} />
            </div>
            {targetLabel && <Mono style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, display: 'block' }}>Meta: {targetLabel}</Mono>}
          </div>
        )}
      </Card>
    );
  };

  const kpiRows = [
    {
      label: 'Tasa de Ahorro',
      value: `${savingsRate.toFixed(1)}%`,
      sub: `Ahorro neto sobre ingresos totales`,
      color: savingsRate >= 20 ? 'var(--accent)' : savingsRate >= 10 ? 'var(--gold)' : 'var(--red)',
      pct: savingsRate,
      targetLabel: '≥ 20%',
      tooltip: 'Porcentaje de tus ingresos totales que no gastas. Una tasa ≥ 20% indica buena capacidad de ahorro.',
    },
    {
      label: 'Ratio de Gastos',
      value: `${expRatio.toFixed(1)}%`,
      sub: `Porcentaje de ingresos en gastos`,
      color: expRatio <= 60 ? 'var(--accent)' : expRatio <= 80 ? 'var(--gold)' : 'var(--red)',
      pct: expRatio,
      targetLabel: '≤ 60%',
      inverse: true,
      tooltip: 'Qué fracción de tus ingresos se destina a gastos. Por encima del 80% es zona de riesgo.',
    },
    {
      label: 'Tasa de Inversión',
      value: `${invRate.toFixed(1)}%`,
      sub: `Capital invertido sobre ingresos`,
      color: invRate >= 10 ? 'var(--blue)' : invRate >= 5 ? 'var(--gold)' : 'var(--red)',
      pct: Math.min(invRate, 40) / 40 * 100,
      targetLabel: '≥ 10%',
      tooltip: 'Porcentaje de tus ingresos que destinas a inversiones. Se recomienda al menos un 10-15% para construir patrimonio.',
    },
    {
      label: 'Runway (meses)',
      value: runway > 0 ? `${runway.toFixed(1)} m` : '—',
      sub: `Capital / Gastos mensuales actuales`,
      color: runway >= 6 ? 'var(--accent)' : runway >= 3 ? 'var(--gold)' : 'var(--red)',
      pct: Math.min(runway, 12) / 12 * 100,
      targetLabel: '≥ 6 meses',
      tooltip: 'Cuántos meses podrías sostener tu nivel de gastos actual solo con tu capital invertido, sin recibir ingresos.',
    },
    {
      label: 'ROI Inversiones',
      value: `${roi.toFixed(2)}%`,
      sub: `Rendimiento anual sobre capital`,
      color: roi >= 5 ? 'var(--accent)' : roi >= 2 ? 'var(--gold)' : 'var(--muted)',
      pct: Math.min(roi, 15) / 15 * 100,
      targetLabel: '≥ 5%',
      tooltip: 'Rendimiento anual estimado sobre el capital total invertido. Un buen DAP o fondo mutual suele dar 4-7% anual.',
    },
    {
      label: 'Gastos Fijos (%)',
      value: `${fixedCostRatio.toFixed(1)}%`,
      sub: `Gastos recurrentes sobre ingresos`,
      color: fixedCostRatio <= 40 ? 'var(--accent)' : fixedCostRatio <= 60 ? 'var(--gold)' : 'var(--red)',
      pct: fixedCostRatio,
      targetLabel: '≤ 40%',
      inverse: true,
      tooltip: 'Proporción de tu ingreso comprometida en gastos recurrentes (fijos). Mantenerla baja te da mayor flexibilidad financiera.',
    },
    {
      label: 'Flujo de Caja Libre',
      value: clp(freeCashFlow),
      sub: `FCF Rate: ${fcfRate.toFixed(1)}% de ingresos`,
      color: freeCashFlow >= 0 ? 'var(--accent)' : 'var(--red)',
      pct: Math.min(100, Math.max(0, fcfRate)),
      targetLabel: '> 0%',
      tooltip: 'Dinero que te queda después de cubrir todos tus gastos e inversiones. Si es negativo estás gastando más de lo que ganas.',
    },
    {
      label: 'Burn Rate Mensual',
      value: clp(burnRate),
      sub: `Gasto total del mes actual`,
      color: 'var(--red)',
      tooltip: 'Cuánto dinero estás gastando en el mes actual. Útil para comparar con meses anteriores y detectar aumentos.',
    },
  ];

  const explanations = [
    { k: 'Tasa de Ahorro', t: '¿Cuánto ahorras?', d: 'Porcentaje de tus ingresos que no gastas. Meta recomendada ≥ 20%.' },
    { k: 'Ratio de Gastos', t: '¿Cuánto gastas?', d: 'Qué fracción de tus ingresos se destina a gastos. Idealmente ≤ 60%.' },
    { k: 'Tasa de Inversión', t: '¿Cuánto inviertes?', d: 'Del total de ingresos, qué porcentaje va a inversiones. Recomendado ≥ 10%.' },
    { k: 'Runway', t: '¿Cuánto aguantas?', d: 'Con tu capital actual, cuántos meses podrías sostener tus gastos sin ingresos. Meta ≥ 6 meses.' },
    { k: 'ROI', t: '¿Cómo rinden tus inversiones?', d: 'Rendimiento anual estimado de tu portafolio de inversiones.' },
    { k: 'Flujo de Caja Libre', t: '¿Tienes excedente?', d: 'Ingresos menos gastos e inversiones. Cuánto dinero queda disponible.' },
  ];

  return (
    <div className="page">
      <PageHeader title="KPIs" sub="Indicadores clave de tu salud financiera" />

      {/* Score general */}
      <Card style={{ padding: '28px 32px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 32 }}>
        <div style={{ position: 'relative', width: 120, height: 62, flexShrink: 0 }}>
          <svg viewBox="0 0 120 62" style={{ overflow: 'visible' }}>
            <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="var(--border)" strokeWidth="10" strokeLinecap="round" />
            <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke={scoreColor} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 157} 157`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
          </svg>
          <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
            <Display style={{ fontWeight: 900, fontSize: 26, color: scoreColor, letterSpacing: '-1px' }}>{score}</Display>
          </div>
        </div>
        <div>
          <Display style={{ fontWeight: 800, fontSize: 22, color: scoreColor, display: 'block', marginBottom: 4 }}>Salud Financiera: {scoreLabel}</Display>
          <Mono style={{ fontSize: 13, color: 'var(--muted)', display: 'block', maxWidth: 520 }}>
            Basado en tu tasa de ahorro, ratio de gastos, nivel de inversión, runway y ROI. Puntaje de 0 a 100.
          </Mono>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            {[
              { l: 'Ingresos Totales', v: clp(totI), c: 'var(--accent)' },
              { l: 'Gastos Totales', v: clp(totG), c: 'var(--red)' },
              { l: 'Capital Invertido', v: clp(totV), c: 'var(--blue)' },
              { l: 'Rend. Anual Est.', v: clp(totalRendAnual), c: 'var(--gold)' },
            ].map(s => (
              <div key={s.l}>
                <Mono style={{ fontSize: 10, color: 'var(--muted)', display: 'block' }}>{s.l.toUpperCase()}</Mono>
                <Mono style={{ fontSize: 14, color: s.c, fontWeight: 600 }}>{s.v}</Mono>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 22 }}>
        {kpiRows.map((k, i) => <KpiCard key={i} {...k} />)}
      </div>

      {/* This month snapshot */}
      <Card style={{ padding: '22px 28px', marginBottom: 22 }}>
        <Display style={{ fontWeight: 700, fontSize: 15, color: 'var(--dim)', display: 'block', marginBottom: 16 }}>Snapshot del Mes Actual</Display>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {[
            { l: 'Ingresos este mes', v: clp(mesI), c: 'var(--accent)' },
            { l: 'Gastos este mes', v: clp(mesG), c: 'var(--red)' },
            { l: 'Neto este mes', v: clp(mesN), c: mesN >= 0 ? 'var(--accent)' : 'var(--red)' },
          ].map(s => (
            <div key={s.l} style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px 18px' }}>
              <Mono style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4, letterSpacing: '0.06em' }}>{s.l.toUpperCase()}</Mono>
              <Display style={{ fontWeight: 700, fontSize: 22, color: s.c }}>{s.v}</Display>
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
}

// ─── IMPORTAR PDF ──────────────────────────────────────────────────────────────
const CATS_SUGGEST_MAP = [
  { kw: ['spotify', 'netflix', 'disney', 'amazon', 'prime', 'youtube', 'hbo', 'apple', 'suscripcion'], cat: 'Suscripciones' },
  { kw: ['internet', 'vtr', 'movistar', 'entel', 'claro', 'wom', 'celular', 'telefono'], cat: 'Servicios' },
  { kw: ['uber', 'cabify', 'didi', 'transporte', 'buses', 'metro'], cat: 'Transporte' },
  { kw: ['supermercado', 'lider', 'jumbo', 'unimarc', 'santa isabel', 'tottus', 'acuenta', 'alimento', 'comida'], cat: 'Alimentación' },
  { kw: ['farmacia', 'clinica', 'hospital', 'salud', 'medico'], cat: 'Salud' },
  { kw: ['adobe', 'figma', 'github', 'herramienta', 'software', 'aws', 'google'], cat: 'Herramientas' },
  { kw: ['coursera', 'udemy', 'duolingo', 'educacion', 'estudio', 'speak'], cat: 'Educación' },
  { kw: ['falabella', 'ripley', 'paris', 'mercadopago', 'mercado', 'tienda', 'compra', 'payu', 'ohana'], cat: 'Personal' },
];

function suggestCat(desc) {
  const d = (desc || '').toLowerCase();
  for (const { kw, cat } of CATS_SUGGEST_MAP) {
    if (kw.some(k => d.includes(k))) return cat;
  }
  return 'Otros';
}

function parseCLPAmount(s) {
  if (!s) return 0;
  return parseInt(String(s).replace(/[^0-9]/g, ''), 10) || 0;
}

async function extractPDFText(file) {
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) throw new Error('pdf.js no cargado. Recarga la página e intenta de nuevo.');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const allLines = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const byY = {};
    for (const item of tc.items) {
      const y = Math.round(item.transform[5]);
      if (!byY[y]) byY[y] = [];
      byY[y].push({ x: item.transform[4], text: item.str });
    }
    const sortedYs = Object.keys(byY).map(Number).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const rowText = byY[y].sort((a, b) => a.x - b.x).map(i => i.text).join(' ');
      allLines.push(rowText);
    }
    allLines.push('---PAGE---');
  }
  return allLines.join('\n');
}

function parseCartolaRows(text) {
  const rows = [];
  const lines = text.split('\n').map(l => l.trim());
  let currentDate = null;

  // Lines to skip: headers, meta, page separators
  const skipLine = l => !l ||
    l.startsWith('---') ||
    /^(estado de cuenta|cuenta vista|sr\(a\)|moneda|ejecutivo|n[°º] de cuenta|cartola n[°º]|tel[eé]fono|fecha detalle|d[ií]a\/mes|sucursal\s*:|pagina|n[°º] de pagina|0014|mauricio|gmail|xxxxxxx)/i.test(l) ||
    /saldo inicial/i.test(l) ||
    /^\d{8,}$/.test(l);

  // Keywords that indicate this is an INGRESO (abono/deposit)
  const isIngreso = desc =>
    /traspaso de:|deposito|abono|remuneracion|sueldo|credito en cta|pago de tercero|transferencia recibida|remesa|bono/i.test(desc);

  for (const line of lines) {
    if (skipLine(line)) continue;

    // Date-only line (DD/MM) → update currentDate
    if (/^\d{1,2}\/\d{2}$/.test(line)) {
      currentDate = line;
      continue;
    }

    // Inline date at start of line (DD/MM CONTENT)
    let content = line;
    const dil = line.match(/^(\d{1,2}\/\d{2})\s+(.+)/);
    if (dil) {
      currentDate = dil[1];
      content = dil[2];
    }

    if (!currentDate) continue;

    // Skip pure header/meta content lines
    if (/^(DETALLE DE TRANSACCION|MONTO CARGOS|MONTO DEPOSITOS|N[°º] DOCTO|DIA\/MES|SUCURSAL$|SALDO$)/i.test(content)) continue;

    // Extract amounts: dot-formatted numbers (5.000, 1.234.567) or standalone "0"
    // This filters out plain document/account numbers (no dots)
    const amtMatches = [...content.matchAll(/\b(\d[\d.]+\d|\d)\b/g)]
      .filter(m => m[1].includes('.') || m[1] === '0');

    if (amtMatches.length === 0) continue;

    // Description: everything before the first amount, minus the sucursal word
    let descRaw = content.slice(0, amtMatches[0].index)
      .replace(/\s+(CENTRAL|SUR|NORTE|ESTE|OESTE|VIRTUAL|INTERNET|SB|CB)\s*$/i, '')
      .trim();
    const desc = descRaw.replace(/\s+/g, ' ').trim();
    if (!desc || desc.length < 2) continue;

    // KEY FIX: The LAST number in each line is always the running SALDO (balance),
    // NOT the abono amount. The FIRST number is the actual transaction amount.
    // We take amounts[0] and ignore the rest (saldo, zero-placeholder columns).
    const monto = parseCLPAmount(amtMatches[0][1]);
    if (monto === 0) continue; // skip zero-amount transactions

    let cargo = 0, abono = 0;
    if (isIngreso(desc)) {
      abono = monto;
    } else {
      cargo = monto;
    }

    rows.push({
      fecha: currentDate, desc, cargo, abono,
      tipo: abono > 0 ? 'ingreso' : 'gasto',
      cat: abono > 0 ? 'Freelance' : suggestCat(desc),
      selected: true, id: Math.random(),
    });
  }
  return rows;
}

function Importar() {
  const { add } = useF();
  const [status, setStatus] = useState('idle');
  const [rows, setRows] = useState([]);
  const [drag, setDrag] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [imported, setImported] = useState(0);
  const curYear = new Date().getFullYear();

  function handleFile(file) {
    if (!file || file.type !== 'application/pdf') { setErrMsg('Por favor selecciona un archivo PDF válido.'); setStatus('error'); return; }
    setStatus('loading'); setErrMsg('');
    extractPDFText(file)
      .then(text => {
        const parsed = parseCartolaRows(text);
        if (parsed.length === 0) {
          setErrMsg('No se encontraron transacciones. Asegúrate de subir una cartola bancaria válida.');
          setStatus('error');
        } else {
          setRows(parsed);
          setStatus('preview');
        }
      })
      .catch(e => {
        setErrMsg('Error al leer el PDF: ' + (e.message || 'Error desconocido'));
        setStatus('error');
      });
  }

  const toggleRow = id => setRows(r => r.map(x => x.id === id ? { ...x, selected: !x.selected } : x));
  const toggleAll = () => { const all = rows.every(r => r.selected); setRows(r => r.map(x => ({ ...x, selected: !all }))); };
  const updateRow = (id, key, val) => setRows(r => r.map(x => x.id === id ? { ...x, [key]: val } : x));

  function doImport() {
    const sel = rows.filter(r => r.selected);
    for (const r of sel) {
      const [d, m] = r.fecha.split('/');
      const fecha = `${curYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      if (r.tipo === 'ingreso') add('ingresos', { nombre: r.desc, categoria: r.cat, monto: r.abono, fecha, recurrente: false });
      else add('gastos', { nombre: r.desc, categoria: r.cat, monto: r.cargo, fecha });
    }
    setImported(sel.length); setStatus('done');
  }

  const selectedCount = rows.filter(r => r.selected).length;
  const gastosCats = ['Servicios', 'Suscripciones', 'Herramientas', 'Personal', 'Educación', 'Salud', 'Alimentación', 'Transporte', 'Otros'];
  const ingresosCats = ['Freelance', 'Coaching', 'Competencias', 'Empleado', 'Negocio', 'Arriendo', 'Otro'];

  return (
    <div className="page">
      <PageHeader title="Importar PDF" sub="Sube tu cartola bancaria · los datos se clasifican automáticamente" />

      {status === 'idle' && (
        <Card style={{ padding: 56, textAlign: 'center', border: drag ? '2px dashed var(--accent)' : '2px dashed var(--border-hi)', background: drag ? 'var(--accent-dim2)' : 'var(--bg-card)', transition: 'all 0.2s' }}
          onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>📄</div>
          <Display style={{ fontWeight: 700, fontSize: 22, display: 'block', marginBottom: 8 }}>Arrastra tu cartola PDF aquí</Display>
          <Mono style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 28 }}>Compatible con BancoEstado · Banco Chile · Santander · BCI y otros</Mono>
          <label style={{ display: 'inline-block', background: 'var(--accent)', color: '#000', padding: '11px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--display)' }}>
            Seleccionar archivo PDF
            <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
          </label>
        </Card>
      )}

      {status === 'loading' && (
        <Card style={{ padding: 72, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16, display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</div>
          <Display style={{ fontWeight: 700, fontSize: 18, display: 'block', color: 'var(--muted)' }}>Analizando PDF…</Display>
        </Card>
      )}
      {status === 'error' && (
        <Card style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <Mono style={{ color: 'var(--red)', display: 'block', marginBottom: 24 }}>{errMsg}</Mono>
          <Btn onClick={() => setStatus('idle')}>Intentar de nuevo</Btn>
        </Card>
      )}

      {status === 'done' && (
        <Card style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
          <Display style={{ fontWeight: 800, fontSize: 26, color: 'var(--accent)', display: 'block', marginBottom: 8 }}>{imported} transacciones importadas</Display>
          <Mono style={{ color: 'var(--muted)', display: 'block', marginBottom: 28 }}>Los datos ya están en Ingresos y Gastos.</Mono>
          <Btn onClick={() => { setStatus('idle'); setRows([]); }}>Importar otro archivo</Btn>
        </Card>
      )}

      {status === 'preview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 22 }}>
            {[
              { l: 'Encontradas', v: rows.length, c: 'var(--text)' },
              { l: 'Seleccionadas', v: selectedCount, c: 'var(--accent)' },
              { l: 'Total Cargos', v: clp(rows.filter(r => r.selected && r.tipo === 'gasto').reduce((s, r) => s + r.cargo, 0)), c: 'var(--red)' },
              { l: 'Total Abonos', v: clp(rows.filter(r => r.selected && r.tipo === 'ingreso').reduce((s, r) => s + r.abono, 0)), c: 'var(--accent)' },
            ].map(s => (
              <Card key={s.l} style={{ padding: '16px 20px' }}>
                <Mono style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{s.l.toUpperCase()}</Mono>
                <Display style={{ fontWeight: 700, fontSize: 22, color: s.c }}>{s.v}</Display>
              </Card>
            ))}
          </div>

          <Card style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
              <Display style={{ fontWeight: 700, fontSize: 15, color: 'var(--dim)' }}>Revisar y ajustar transacciones</Display>
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn variant="ghost" sm onClick={toggleAll}>{rows.every(r => r.selected) ? 'Deseleccionar todo' : 'Seleccionar todo'}</Btn>
                <Btn onClick={doImport}>⇩ Importar {selectedCount} registro{selectedCount !== 1 ? 's' : ''}</Btn>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['', 'Fecha', 'Descripción', 'Tipo', 'Categoría', 'Cargo', 'Abono'].map((h, i) => (
                    <th key={i} style={{ textAlign: 'left', padding: '9px 12px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h.toUpperCase()}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} className="row-tr" style={{ borderBottom: '1px solid var(--border)', opacity: row.selected ? 1 : 0.4, transition: 'opacity 0.15s' }}>
                      <td style={{ padding: '7px 12px' }}><input type="checkbox" checked={row.selected} onChange={() => toggleRow(row.id)} style={{ accentColor: 'var(--accent)', width: 15, height: 15, cursor: 'pointer' }} /></td>
                      <td style={{ padding: '7px 12px' }}><Mono style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{row.fecha}</Mono></td>
                      <td style={{ padding: '7px 12px', maxWidth: 260 }}><span style={{ fontSize: 13, color: 'var(--text)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.desc}>{row.desc}</span></td>
                      <td style={{ padding: '7px 12px' }}>
                        <select value={row.tipo} onChange={e => updateRow(row.id, 'tipo', e.target.value)}
                          style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: row.tipo === 'ingreso' ? 'var(--accent)' : 'var(--red)', fontFamily: 'var(--mono)', fontSize: 12, cursor: 'pointer' }}>
                          <option value="gasto">↓ Gasto</option>
                          <option value="ingreso">↑ Ingreso</option>
                        </select>
                      </td>
                      <td style={{ padding: '7px 12px' }}>
                        <select value={row.cat} onChange={e => updateRow(row.id, 'cat', e.target.value)}
                          style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 12, cursor: 'pointer' }}>
                          {(row.tipo === 'ingreso' ? ingresosCats : gastosCats).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '7px 12px' }}>{row.cargo > 0 && <Mono style={{ color: 'var(--red)', fontSize: 13 }}>{clp(row.cargo)}</Mono>}</td>
                      <td style={{ padding: '7px 12px' }}>{row.abono > 0 && <Mono style={{ color: 'var(--accent)', fontSize: 13 }}>{clp(row.abono)}</Mono>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => { setStatus('idle'); setRows([]); }}>Cancelar</Btn>
            <Btn onClick={doImport}>⇩ Importar {selectedCount} registro{selectedCount !== 1 ? 's' : ''}</Btn>
          </div>
        </>
      )}
    </div>
  );
}

// ─── AUTH ──────────────────────────────────────────────────────────────────────
function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [msg, setMsg] = useState("");

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const { error } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) setMsg(error.message);
    else if (!isLogin) setMsg("Revisa tu correo para confirmar el registro.");
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <Card style={{ padding: "40px", width: "100%", maxWidth: "420px", animation: "fadeUp 0.3s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Display style={{ fontWeight: 900, fontSize: 28, color: "var(--accent)", display: "block", letterSpacing: "-1px" }}>MAURI</Display>
          <Mono style={{ fontSize: 13, color: "var(--muted)", letterSpacing: "0.15em", marginTop: 4 }}>FINANZAS PERSONALES</Mono>
        </div>

        <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Fld label="Correo Electrónico">
            <Inp type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" required />
          </Fld>
          <Fld label="Contraseña">
            <Inp type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </Fld>

          {msg && <Mono style={{ fontSize: 12, color: "var(--red)", textAlign: "center" }}>{msg}</Mono>}

          <div style={{ marginTop: 8 }}>
            <Btn style={{ width: "100%" }} disabled={loading}>
              {loading ? "Cargando..." : (isLogin ? "Iniciar Sesión" : "Registrarse")}
            </Btn>
          </div>
        </form>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button onClick={() => { setIsLogin(!isLogin); setMsg(""); }} style={{ background: "none", border: "none", color: "var(--dim)", fontFamily: "var(--mono)", fontSize: 13, textDecoration: "underline" }}>
            {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── ROOT ──────────────────────────────────────────────────────────────────────
const PAGES = { dashboard: Dashboard, ingresos: Ingresos, gastos: Gastos, inversiones: Inversiones, margen: Margen, kpis: KPIs, importar: Importar };

export default function App() {
  const [active, setActive] = useState("dashboard");
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><Mono style={{ color: "var(--accent)" }}>Cargando...</Mono></div>;

  if (!session) return (
    <>
      <style>{css}</style>
      <Auth />
    </>
  );

  const Page = PAGES[active];

  return (
    <Provider user={session.user}>
      <style>{css}</style>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar active={active} setActive={setActive} />
        <main style={{ flex: 1, marginLeft: 240, padding: "40px 48px", minHeight: "100vh", background: "var(--bg)" }}>
          <Page key={active} />
        </main>
      </div>
    </Provider>
  );
}
