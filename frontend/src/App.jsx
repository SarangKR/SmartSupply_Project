import { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, BarChart, Bar,
} from "recharts";

/* ══════════════════════════════════════════════
   STATIC DATA
══════════════════════════════════════════════ */
const NAV = [
  { icon: "◈", label: "Forecast",  id: "forecast"  },
  { icon: "▦", label: "Inventory", id: "inventory" },
  { icon: "⬡", label: "Reports",   id: "reports"   },
  { icon: "◎", label: "Settings",  id: "settings"  },
];

const INITIAL_ALERTS = [
  { id:1, color:"#F43F5E", title:"Critical Stock — Item A", desc:"Inventory below reorder threshold. Immediate action required.", time:"2m ago" },
  { id:2, color:"#D4A853", title:"Forecast Shift — Item C", desc:"Demand spike detected. Adjust safety stock.", time:"18m ago" },
  { id:3, color:"#10B981", title:"EOQ Optimized — Item B",  desc:"Order quantities recalculated for Q2 cycle.", time:"1h ago"  },
];

const METRICS_DEF = [
  { key:"safety_stock",  label:"Safety Stock",  },
  { key:"reorder_point", label:"Reorder Point", },
  { key:"eoq",           label:"EOQ Units",     },
  { key:null,            label:"Avg Demand",    static:642 },
];

const INVENTORY_ROWS = [
  { sku:"SKU-001", name:"Industrial Filter A", stock:842, max:1200, reorder:200, status:"ok",   lead:"5d",  lastSync:"2m ago" },
  { sku:"SKU-002", name:"Valve Assembly B",    stock:134, max:800,  reorder:300, status:"warn", lead:"7d",  lastSync:"2m ago" },
  { sku:"SKU-003", name:"Pump Housing C",      stock:28,  max:500,  reorder:150, status:"crit", lead:"12d", lastSync:"5m ago" },
  { sku:"SKU-004", name:"Bearing Set D",       stock:620, max:700,  reorder:100, status:"ok",   lead:"3d",  lastSync:"2m ago" },
  { sku:"SKU-005", name:"Gasket Kit E",        stock:310, max:600,  reorder:120, status:"ok",   lead:"4d",  lastSync:"8m ago" },
];

const REPORT_CARDS = [
  { icon:"📊", title:"Demand Forecast Report",  desc:"30-day demand projections with confidence intervals for all SKUs.", date:"Generated today" },
  { icon:"📦", title:"Inventory Health Report", desc:"Stock levels, reorder status, and EOQ analysis across all items.",  date:"Generated today" },
  { icon:"📈", title:"Trend Analysis",          desc:"Historical demand trends and seasonality patterns over 12 months.", date:"Yesterday"       },
  { icon:"⚡",  title:"Exception Report",        desc:"Critical alerts, stockouts, and anomalies requiring attention.",    date:"2 days ago"      },
];

const REPORT_HISTORY = [
  { icon:"📊", name:"Forecast_SKU001_Feb2026.txt",     size:"42 KB", date:"Today 09:14"      },
  { icon:"📦", name:"Inventory_Health_Jan2026.txt",    size:"18 KB", date:"Jan 31 · 17:02"   },
  { icon:"📈", name:"Trend_Q4_2025.txt",               size:"91 KB", date:"Jan 15 · 11:30"   },
];

const SETTINGS_TABS = ["General", "Forecasting", "Notifications", "Integrations"];

/* ══════════════════════════════════════════════
   UTILITY COMPONENTS
══════════════════════════════════════════════ */
/* Format ISO date string → "Oct 1" or pass through "Day N" unchanged */
const formatDate = (raw) => {
  if (!raw || typeof raw !== "string") return raw;
  if (raw.startsWith("Day ")) return raw; // demo data — already readable
  try {
    const d = new Date(raw);
    if (isNaN(d)) return raw;
    return d.toLocaleDateString("en-GB", { day:"numeric", month:"short" });
  } catch { return raw; }
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#1C1C21", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"10px 14px", fontFamily:"DM Mono, monospace", fontSize:12, color:"#F0EEE9" }}>
      <div style={{ color:"#6B6B78", marginBottom:4 }}>{formatDate(label)}</div>
      <div style={{ fontSize:10, color:"#6B6B78", marginBottom:2 }}>Predicted Demand</div>
      <div style={{ color:"#D4A853", fontWeight:500, fontSize:14 }}>{Number(payload[0]?.value).toFixed(0)} units</div>
    </div>
  );
};

function Modal({ title, onClose, children }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toast({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">{t.type==="success"?"✓":t.type==="error"?"✕":"⟳"}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function Toggle({ on, onToggle }) {
  return (
    <div className={`toggle ${on ? "on" : ""}`} onClick={onToggle}>
      <div className="toggle-thumb" />
    </div>
  );
}

/* ══════════════════════════════════════════════
   LIVE CLOCK
══════════════════════════════════════════════ */
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="topbar-clock">
      {time.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}
      {"  ·  "}
      {time.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit", second:"2-digit" })}
    </div>
  );
}

/* ══════════════════════════════════════════════
   INTRO SPLASH
══════════════════════════════════════════════ */
function Intro({ onDone }) {
  const [phase, setPhase] = useState(0);
  const loadingMsgs = ["Initializing AI engine…", "Loading supply data…", "System ready."];

  useEffect(() => {
    const timers = loadingMsgs.map((_, i) =>
      setTimeout(() => setPhase(i), i * 900 + 400)
    );
    const done = setTimeout(onDone, 3800);
    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
  }, []);

  return (
    <div className="intro-overlay">
      <div className="intro-bg-grid" />
      <div className="intro-glow" />
      <div className="intro-logo-wrap">
        <div className="intro-mark">S</div>
        <div className="intro-wordmark">Smart<span>Supply</span></div>
        <div className="intro-tagline">Enterprise Inventory Intelligence</div>
      </div>
      <div className="intro-bar-wrap">
        <div className="intro-bar-track">
          <div className="intro-bar-fill" />
        </div>
        <div className="intro-loading-text">{loadingMsgs[phase]}</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   PAGE WRAPPER — triggers transition on mount
══════════════════════════════════════════════ */
function PageWrapper({ children }) {
  return <div className="page-transition">{children}</div>;
}

/* ══════════════════════════════════════════════
   PAGE: FORECAST
══════════════════════════════════════════════ */
function ForecastPage({ addToast }) {
  const [item, setItem]     = useState(1);
  const [days, setDays]     = useState(30);
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchForecast = async () => {
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      const r = await fetch(`${API_URL}/forecast`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ item, days, lead_time:7, holding_cost:2, ordering_cost:50 }),
      });
      setData(await r.json());
      addToast("Forecast generated successfully");
    } catch {
      addToast("Backend unreachable — loaded demo data", "error");
      setData({
        safety_stock:148, reorder_point:312, eoq:520,
        forecast: Array.from({ length:days }, (_, i) => ({
          ds: `Day ${i+1}`,
          yhat: 300 + Math.sin(i/4)*80 + Math.random()*40,
        })),
      });
    } finally { setLoading(false); }
  };

  return (
    <PageWrapper>
      <div className="controls-bar">
        <span className="controls-label">Item</span>
        <select value={item} onChange={e => setItem(+e.target.value)}>
          {[1,2,3,4,5].map(i => (
            <option key={i} value={i}>SKU-{String(i).padStart(3,"0")}</option>
          ))}
        </select>
        <span className="controls-label" style={{ marginLeft:8 }}>Horizon</span>
        <input className="input-field" type="number" value={days}
          onChange={e => setDays(+e.target.value)} style={{ width:80 }} />
        <span style={{ fontSize:12, color:"var(--text-muted)" }}>days</span>
        <button className="run-btn" onClick={fetchForecast} disabled={loading}>
          {loading ? "⟳ Running…" : "▶ Run Forecast"}
        </button>
      </div>

      {data ? (
        <>
          <div className="metrics">
            {METRICS_DEF.map((m, i) => {
              const val    = m.static ?? data[m.key];
              const slices = data.forecast?.slice(-7) ?? [];
              const trends = ["+4.2%", "+1.8%", "+6.1%", "−0.3%"];
              const isUp   = trends[i].startsWith("+");
              return (
                <div className="metric" key={i}>
                  <div className="metric-header">
                    <span className="metric-label">{m.label}</span>
                    <span className={`metric-badge ${isUp ? "badge-up" : "badge-down"}`}>{trends[i]}</span>
                  </div>
                  <div className="metric-value">{Number(val).toLocaleString()}</div>
                  <div className="metric-chart">
                    <ResponsiveContainer width="100%" height={36}>
                      <LineChart data={slices}>
                        <Line type="monotone" dataKey="yhat"
                          stroke={isUp ? "#10B981" : "#F43F5E"} dot={false} strokeWidth={1.5} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="chart-container">
            <div className="chart-header">
              <div>
                <div className="chart-title">Demand Forecast Curve</div>
                <div className="chart-subtitle">{days}-day projection for SKU-{String(item).padStart(3,"0")}</div>
              </div>
              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-dot" style={{ background:"#D4A853" }} />
                  Predicted Demand
                </div>
              </div>
            </div>
            <div className="chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.forecast} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                  <defs>
                    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#D4A853" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#D4A853" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 6" vertical={false} />
                  <XAxis dataKey="ds"
                    tickFormatter={formatDate}
                    tick={{ fill:"#6B6B78", fontSize:11, fontFamily:"DM Mono" }}
                    tickLine={false} axisLine={false}
                    interval={Math.max(0, Math.floor((data.forecast?.length || 1) / 6) - 1)} />
                  <YAxis
                    tickFormatter={(v) => `${Math.round(v)}`}
                    tick={{ fill:"#6B6B78", fontSize:11, fontFamily:"DM Mono" }}
                    tickLine={false} axisLine={false} width={40} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="yhat" stroke="#D4A853" strokeWidth={2} fill="url(#goldGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">◈</div>
          <div className="empty-title">No Forecast Generated</div>
          <div className="empty-desc">Select your SKU and time horizon above, then run the AI forecast engine to visualize demand projections.</div>
        </div>
      )}
    </PageWrapper>
  );
}

/* ══════════════════════════════════════════════
   PAGE: INVENTORY
══════════════════════════════════════════════ */
function InventoryPage({ addToast, searchQuery }) {
  const filtered = INVENTORY_ROWS.filter(r =>
    r.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tagClass = { ok:"tag-ok", warn:"tag-warn", crit:"tag-crit" };
  const tagLabel = { ok:"In Stock", warn:"Low Stock", crit:"Critical"  };
  const barColor = { ok:"#10B981", warn:"#D4A853",   crit:"#F43F5E"   };
  const chartData = INVENTORY_ROWS.map(r => ({ name:r.sku, stock:r.stock, max:r.max }));

  return (
    <PageWrapper>
      <div className="chart-container" style={{ marginBottom:24 }}>
        <div className="chart-header">
          <div>
            <div className="chart-title">Stock Levels Overview</div>
            <div className="chart-subtitle">Current inventory vs. maximum capacity</div>
          </div>
        </div>
        <div style={{ height:200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top:4, right:4, left:-20, bottom:0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 6" vertical={false} />
              <XAxis dataKey="name" tick={{ fill:"#6B6B78", fontSize:11, fontFamily:"DM Mono" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill:"#6B6B78", fontSize:11, fontFamily:"DM Mono" }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="max"   fill="rgba(255,255,255,0.05)" radius={[4,4,0,0]} />
              <Bar dataKey="stock" fill="#D4A853"                radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="inv-table-wrap">
        <table className="inv-table">
          <thead>
            <tr>
              <th>SKU</th><th>Product Name</th><th>Stock Level</th>
              <th>Reorder Qty</th><th>Lead Time</th><th>Status</th><th>Last Sync</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign:"center", padding:32, color:"var(--text-muted)" }}>
                  No results for "{searchQuery}"
                </td>
              </tr>
            ) : filtered.map((r, i) => (
              <tr key={i}>
                <td>{r.sku}</td>
                <td style={{ color:"var(--text)" }}>{r.name}</td>
                <td>
                  <div className="stock-bar-wrap">
                    <span className="num" style={{ fontSize:12, minWidth:34 }}>{r.stock}</span>
                    <div className="stock-bar-bg">
                      <div className="stock-bar-fill"
                        style={{ width:`${Math.round(r.stock/r.max*100)}%`, background:barColor[r.status] }} />
                    </div>
                    <span style={{ fontSize:11, color:"var(--text-muted)", minWidth:28 }}>
                      {Math.round(r.stock/r.max*100)}%
                    </span>
                  </div>
                </td>
                <td className="num">{r.reorder}</td>
                <td className="num">{r.lead}</td>
                <td><span className={`status-tag ${tagClass[r.status]}`}>{tagLabel[r.status]}</span></td>
                <td style={{ color:"var(--text-muted)", fontSize:12 }}>{r.lastSync}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageWrapper>
  );
}

/* ══════════════════════════════════════════════
   PAGE: REPORTS
══════════════════════════════════════════════ */
function ReportsPage({ addToast }) {
  const handleGenerate = (title) => {
    addToast(`Generating "${title}"…`, "info");
    setTimeout(() => {
      const content = [
        `SmartSupply — ${title}`,
        "=".repeat(40),
        `Generated: ${new Date().toLocaleString()}`,
        "",
        "Summary data would appear here.",
        "Connect your backend for real data.",
        "",
        "— SmartSupply AI —",
      ].join("\n");
      const blob = new Blob([content], { type:"text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${title.replace(/\s+/g,"_")}_${Date.now()}.txt`;
      a.click();
      addToast(`${title} downloaded!`);
    }, 1200);
  };

  const handleHistoryDownload = (name) => {
    addToast(`Re-downloading ${name}…`, "info");
    setTimeout(() => {
      const blob = new Blob([`SmartSupply report: ${name}\nGenerated by SmartSupply AI.`], { type:"text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = name; a.click();
      addToast("Downloaded!");
    }, 800);
  };

  return (
    <PageWrapper>
      <div className="report-grid">
        {REPORT_CARDS.map((c, i) => (
          <div className="report-card" key={i} onClick={() => handleGenerate(c.title)}>
            <div className="report-card-icon">{c.icon}</div>
            <div className="report-card-title">{c.title}</div>
            <div className="report-card-desc">{c.desc}</div>
            <div className="report-card-date">🕐 {c.date} · Click to download</div>
          </div>
        ))}
      </div>

      <div className="chart-container">
        <div className="chart-header">
          <div>
            <div className="chart-title">Recent Downloads</div>
            <div className="chart-subtitle">Previously generated reports</div>
          </div>
        </div>
        {REPORT_HISTORY.map((h, i) => (
          <div className="report-history-item" key={i}>
            <div className="report-hist-icon">{h.icon}</div>
            <div>
              <div className="report-hist-name">{h.name}</div>
              <div className="report-hist-meta">{h.date} · {h.size}</div>
            </div>
            <div className="report-hist-dl" onClick={() => handleHistoryDownload(h.name)}>⬇ Download</div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}

/* ══════════════════════════════════════════════
   PAGE: SETTINGS
══════════════════════════════════════════════ */
function SettingsPage({ addToast, settings, setSettings }) {
  const [activeTab, setActiveTab] = useState("General");

  // Destructure from shared settings state so values persist across nav
  const { general, forecast, notif, integrations } = settings;
  const set = (section, key, val) =>
    setSettings(s => ({ ...s, [section]: { ...s[section], [key]: val } }));

  const save = () => addToast("Settings saved successfully!");

  return (
    <PageWrapper>
      <div className="settings-grid">
        <div className="settings-nav">
          {SETTINGS_TABS.map(t => (
            <div key={t} className={`settings-nav-item ${activeTab===t ? "active" : ""}`}
              onClick={() => setActiveTab(t)}>{t}</div>
          ))}
        </div>

        <div className="settings-panel">
          {activeTab === "General" && (
            <>
              <div className="settings-section-title">General Settings</div>
              <div className="settings-section-desc">Configure your workspace preferences and regional settings.</div>
              {[
                { label:"Company Name", key:"company"  },
                { label:"Timezone",     key:"timezone" },
                { label:"Currency",     key:"currency" },
                { label:"Language",     key:"lang"     },
              ].map(({ label, key }) => (
                <div className="settings-row" key={key}>
                  <div><div className="settings-row-label">{label}</div></div>
                  <input className="settings-input" value={general[key]}
                    onChange={e => set("general", key, e.target.value)} />
                </div>
              ))}
            </>
          )}

          {activeTab === "Forecasting" && (
            <>
              <div className="settings-section-title">Forecasting Parameters</div>
              <div className="settings-section-desc">Tune the AI model parameters used for demand forecasting.</div>
              {[
                { label:"Lead Time (days)", key:"leadTime",     desc:"Default supplier lead time" },
                { label:"Holding Cost ($)", key:"holdingCost",  desc:"Per-unit per-day holding cost" },
                { label:"Ordering Cost ($)",key:"orderingCost", desc:"Fixed cost per order placed" },
              ].map(({ label, key, desc }) => (
                <div className="settings-row" key={key}>
                  <div>
                    <div className="settings-row-label">{label}</div>
                    <div className="settings-row-desc">{desc}</div>
                  </div>
                  <input className="settings-input" type="number" value={forecast[key]}
                    onChange={e => set("forecast", key, +e.target.value)} />
                </div>
              ))}
              <div className="settings-divider" />
              {[
                { label:"Auto-run on startup",        key:"autoRun",           desc:"Run forecast when app loads" },
                { label:"Show confidence intervals",  key:"confidenceInterval",desc:"Show upper & lower confidence range" },
              ].map(({ label, key, desc }) => (
                <div className="settings-row" key={key}>
                  <div>
                    <div className="settings-row-label">{label}</div>
                    <div className="settings-row-desc">{desc}</div>
                  </div>
                  <Toggle on={forecast[key]} onToggle={() => set("forecast", key, !forecast[key])} />
                </div>
              ))}
            </>
          )}

          {activeTab === "Notifications" && (
            <>
              <div className="settings-section-title">Notification Preferences</div>
              <div className="settings-section-desc">Control how and when you receive alerts from SmartSupply.</div>
              {[
                { label:"Email Notifications", key:"email",       desc:"Receive alerts via email" },
                { label:"Slack Integration",   key:"slack",       desc:"Send alerts to Slack channel" },
                { label:"Critical Alerts Only",key:"criticalOnly",desc:"Skip low-priority events" },
                { label:"Daily Digest",        key:"digest",      desc:"Summary email every morning" },
              ].map(({ label, key, desc }) => (
                <div className="settings-row" key={key}>
                  <div>
                    <div className="settings-row-label">{label}</div>
                    <div className="settings-row-desc">{desc}</div>
                  </div>
                  <Toggle on={notif[key]} onToggle={() => set("notif", key, !notif[key])} />
                </div>
              ))}
            </>
          )}

          {activeTab === "Integrations" && (
            <>
              <div className="settings-section-title">Connected Integrations</div>
              <div className="settings-section-desc">Link SmartSupply to your existing tools and platforms.</div>
              {[
                { label:"ERP System",         key:"erp",       desc:"SAP / Oracle integration" },
                { label:"Warehouse System",   key:"warehouse", desc:"Real-time WMS sync" },
                { label:"Analytics Platform", key:"analytics", desc:"Power BI / Tableau export" },
              ].map(({ label, key, desc }) => (
                <div className="settings-row" key={key}>
                  <div>
                    <div className="settings-row-label">{label}</div>
                    <div className="settings-row-desc">{desc}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:11, color:integrations[key] ? "var(--emerald)" : "var(--text-muted)" }}>
                      {integrations[key] ? "Connected" : "Disconnected"}
                    </span>
                    <Toggle on={integrations[key]} onToggle={() => {
                      const next = !integrations[key];
                      set("integrations", key, next);
                      addToast(`${label} ${next ? "connected" : "disconnected"}`);
                    }} />
                  </div>
                </div>
              ))}
            </>
          )}

          <button className="settings-save-btn" onClick={save}>Save Changes</button>
        </div>
      </div>
    </PageWrapper>
  );
}

/* ══════════════════════════════════════════════
   CONTEXT-AWARE RIGHT PANEL
══════════════════════════════════════════════ */
function RightPanel({ activeNav, alerts, onDismissAlert, onAction, modal, setModal }) {
  // Quick Actions are context-aware per page
  const actions = {
    forecast:  [
      { icon:"⬡", label:"Generate Report",    fn: () => onAction("pdf")      },
      { icon:"◷", label:"Schedule Reorder",   fn: () => setModal("schedule") },
      { icon:"⬕", label:"Export Forecast CSV",fn: () => onAction("csv")      },
      { icon:"◎", label:"Configure Alerts",   fn: () => setModal("alerts")   },
    ],
    inventory: [
      { icon:"⬕", label:"Export Inventory CSV", fn: () => onAction("csv")      },
      { icon:"◷", label:"Schedule Reorder",     fn: () => setModal("schedule") },
      { icon:"◎", label:"Configure Alerts",     fn: () => setModal("alerts")   },
      { icon:"⬡", label:"Inventory Report",     fn: () => onAction("pdf")      },
    ],
    reports: [
      { icon:"📊", label:"Forecast Report",    fn: () => onAction("pdf") },
      { icon:"📦", label:"Inventory Report",   fn: () => onAction("pdf") },
      { icon:"⬕",  label:"Export All CSVs",    fn: () => onAction("csv") },
      { icon:"◎",  label:"Configure Alerts",   fn: () => setModal("alerts") },
    ],
    settings: [
      { icon:"◎", label:"Configure Alerts",  fn: () => setModal("alerts")   },
      { icon:"◷", label:"Schedule Reorder",  fn: () => setModal("schedule") },
      { icon:"⬡", label:"Generate Report",   fn: () => onAction("pdf")      },
      { icon:"⬕", label:"Export Data CSV",   fn: () => onAction("csv")      },
    ],
  };

  const healthRows = [
    { label:"Forecast Engine", value:"Online", cls:"health-good" },
    { label:"Data Pipeline",   value:"98.7%",  cls:"health-good" },
    { label:"Model Accuracy",  value:"91.3%",  cls:"health-good" },
    { label:"Last Sync",       value:"4m ago", cls:"health-warn" },
  ];

  return (
    <>
      {/* Intelligence Feed */}
      <div className="right-section">
        <div className="panel-title">Intelligence Feed</div>
        <div className="card">
          {alerts.length === 0 ? (
            <div className="alerts-empty">✓ All clear — no active alerts</div>
          ) : alerts.map(a => (
            <div className="alert-item" key={a.id}>
              <div className="alert-dot" style={{ background:a.color }} />
              <div className="alert-text">
                <strong>{a.title}</strong>
                {a.desc}
                <div className="alert-time">{a.time}</div>
              </div>
              <button className="alert-dismiss" onClick={() => onDismissAlert(a.id)} title="Dismiss">✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions — changes per page */}
      <div className="right-section" key={activeNav}>
        <div className="panel-title">Quick Actions</div>
        <div className="card">
          {(actions[activeNav] || actions.forecast).map((a, i) => (
            <button key={i} className="action-btn" onClick={a.fn}>{a.icon} {a.label}</button>
          ))}
        </div>
      </div>

      {/* System Health */}
      <div className="right-section">
        <div className="panel-title">System Health</div>
        <div className="card">
          {healthRows.map((h, i) => (
            <div className="health-row" key={i}>
              <span className="health-label">{h.label}</span>
              <span className={`health-value ${h.cls}`}>{h.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Insight */}
      <div style={{ marginTop:"auto" }}>
        <div className="card" style={{ background:"var(--gold-dim)", border:"1px solid rgba(212,168,83,0.2)", textAlign:"center" }}>
          <div style={{ fontSize:11, color:"var(--gold)", fontWeight:600, letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 }}>
            AI Insight
          </div>
          <div style={{ fontSize:12, color:"var(--text-dim)", lineHeight:1.6, fontStyle:"italic" }}>
            Seasonal demand spike predicted for Items A & C in next 14 days. Consider pre-stocking.
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════
   ROOT APP
══════════════════════════════════════════════ */
export default function App() {
  const [showIntro, setShowIntro]   = useState(true);
  const [activeNav, setActiveNav]   = useState("forecast");
  const [searchQuery, setSearchQuery] = useState("");
  const [modal, setModal]           = useState(null);
  const [alerts, setAlerts]         = useState(INITIAL_ALERTS);
  const [notifCount, setNotifCount] = useState(INITIAL_ALERTS.length);

  // Shared settings state — persists across page nav
  const [settings, setSettings] = useState({
    general:      { company:"SmartSupply Co.", timezone:"UTC+5:30", currency:"USD", lang:"English" },
    forecast:     { leadTime:7, holdingCost:2, orderingCost:50, autoRun:true, confidenceInterval:true },
    notif:        { email:true, slack:false, criticalOnly:false, digest:true },
    integrations: { erp:false, warehouse:true, analytics:false },
  });

  const [schedule, setSchedule] = useState({ sku:"SKU-001", qty:200, date:"", freq:"weekly", email:"" });
  const [scheduleSubmitted, setScheduleSubmitted] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    criticalStock:true, forecastShift:true, eoqChange:false,
    threshold:50, emailNotify:true, slackNotify:false,
  });
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  const addToast = useCallback((msg, type="success") => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // Clear search when changing pages
  const handleNavChange = (id) => {
    setActiveNav(id);
    setSearchQuery("");
  };

  // Dismiss an alert from the feed
  const handleDismissAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    setNotifCount(prev => Math.max(0, prev - 1));
  };

  // Open notifications — clears the badge
  const handleOpenNotifications = () => {
    setNotifCount(0);
    setModal("notifications");
  };

  // Quick action handlers
  const handleGeneratePDF = () => {
    addToast("Building report…", "info");
    setTimeout(() => {
      const content = [
        "SmartSupply — Report", "=".repeat(30),
        `Generated: ${new Date().toLocaleString()}`, "",
        "Connect your backend for live data.", "", "— SmartSupply AI —",
      ].join("\n");
      const blob = new Blob([content], { type:"text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `SmartSupply_Report_${Date.now()}.txt`;
      a.click(); URL.revokeObjectURL(a.href);
      addToast("Report downloaded!");
    }, 1200);
  };

  const handleExportCSV = () => {
    addToast("Exporting CSV…", "info");
    setTimeout(() => {
      const header = "sku,name,stock,max,reorder,status,lead_time\n";
      const rows   = INVENTORY_ROWS.map(r =>
        `${r.sku},"${r.name}",${r.stock},${r.max},${r.reorder},${r.status},${r.lead}`
      ).join("\n");
      const blob = new Blob([header + rows], { type:"text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `inventory_export_${Date.now()}.csv`;
      a.click(); URL.revokeObjectURL(a.href);
      addToast("CSV exported!");
    }, 600);
  };

  const handleQuickAction = (type) => {
    if (type === "pdf") handleGeneratePDF();
    if (type === "csv") handleExportCSV();
  };

  const handleScheduleSubmit = () => {
    if (!schedule.date) { addToast("Please select a start date.", "error"); return; }
    setScheduleSubmitted(true);
    setTimeout(() => {
      setModal(null); setScheduleSubmitted(false);
      addToast(`Auto-reorder scheduled — ${schedule.sku} · ${schedule.freq}`);
    }, 1400);
  };

  const handleAlertsSave = () => { setModal(null); addToast("Alert preferences saved."); };

  const PAGE_TITLES = {
    forecast:  ["Demand Forecast",     "AI-powered supply intelligence · Real-time analytics"],
    inventory: ["Inventory Manager",   "Live stock levels, reorder tracking, and EOQ analysis"],
    reports:   ["Reports & Analytics", "Generate, download, and review supply chain reports"],
    settings:  ["Settings",            "Configure your SmartSupply workspace and preferences"],
  };
  const [pageTitle, pageSubtitle] = PAGE_TITLES[activeNav];

  return (
    <>
      {showIntro && <Intro onDone={() => setShowIntro(false)} />}
      <Toast toasts={toasts} />

      {/* SCHEDULE MODAL */}
      {modal === "schedule" && (
        <Modal title="◷  Schedule Auto-Reorder" onClose={() => setModal(null)}>
          <div className="modal-body">
            <div className="form-row"><label>SKU</label>
              <select value={schedule.sku} onChange={e => setSchedule(s => ({ ...s, sku:e.target.value }))}>
                {[1,2,3,4,5].map(i => <option key={i}>SKU-{String(i).padStart(3,"0")}</option>)}
              </select>
            </div>
            <div className="form-row"><label>Order Quantity</label>
              <input type="number" value={schedule.qty} onChange={e => setSchedule(s => ({ ...s, qty:e.target.value }))} />
            </div>
            <div className="form-row"><label>Start Date</label>
              <input type="date" value={schedule.date} onChange={e => setSchedule(s => ({ ...s, date:e.target.value }))} />
            </div>
            <div className="form-row"><label>Frequency</label>
              <select value={schedule.freq} onChange={e => setSchedule(s => ({ ...s, freq:e.target.value }))}>
                <option value="daily">Daily</option><option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option><option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="form-row"><label>Notify Email</label>
              <input type="email" placeholder="you@company.com" value={schedule.email}
                onChange={e => setSchedule(s => ({ ...s, email:e.target.value }))} />
            </div>
            <div className="modal-summary">
              <span>📦 {schedule.sku}</span><span>·</span>
              <span>Qty: {schedule.qty}</span><span>·</span><span>{schedule.freq}</span>
            </div>
            <button className="modal-submit" onClick={handleScheduleSubmit} disabled={scheduleSubmitted}>
              {scheduleSubmitted ? "⟳  Scheduling…" : "Confirm Schedule"}
            </button>
          </div>
        </Modal>
      )}

      {/* ALERTS MODAL */}
      {modal === "alerts" && (
        <Modal title="◎  Configure Alerts" onClose={() => setModal(null)}>
          <div className="modal-body">
            <p className="modal-section-label">Trigger Events</p>
            {[
              { key:"criticalStock", label:"Critical stock level reached"        },
              { key:"forecastShift", label:"Significant forecast shift detected"  },
              { key:"eoqChange",     label:"EOQ recalculated"                     },
            ].map(({ key, label }) => (
              <div className="toggle-row" key={key}>
                <span>{label}</span>
                <Toggle on={alertConfig[key]} onToggle={() => setAlertConfig(c => ({ ...c, [key]:!c[key] }))} />
              </div>
            ))}
            <p className="modal-section-label" style={{ marginTop:20 }}>Stock Threshold</p>
            <div className="form-row">
              <label>Alert below (units)</label>
              <input type="number" value={alertConfig.threshold}
                onChange={e => setAlertConfig(c => ({ ...c, threshold:e.target.value }))} />
            </div>
            <p className="modal-section-label" style={{ marginTop:20 }}>Delivery Channels</p>
            {[
              { key:"emailNotify", label:"Email notifications" },
              { key:"slackNotify", label:"Slack notifications" },
            ].map(({ key, label }) => (
              <div className="toggle-row" key={key}>
                <span>{label}</span>
                <Toggle on={alertConfig[key]} onToggle={() => setAlertConfig(c => ({ ...c, [key]:!c[key] }))} />
              </div>
            ))}
            <button className="modal-submit" onClick={handleAlertsSave}>Save Preferences</button>
          </div>
        </Modal>
      )}

      {/* NOTIFICATIONS MODAL */}
      {modal === "notifications" && (
        <Modal title="🔔  Notifications" onClose={() => setModal(null)}>
          <div className="modal-body">
            {alerts.length === 0 ? (
              <div className="alerts-empty" style={{ padding:"24px 0" }}>✓ No new notifications</div>
            ) : alerts.map(a => (
              <div className="notif-item" key={a.id}>
                <div className="alert-dot" style={{ background:a.color, marginTop:5, flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>{a.title}</div>
                  <div style={{ fontSize:12, color:"var(--text-muted)" }}>{a.desc}</div>
                  <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:4, fontFamily:"DM Mono" }}>{a.time}</div>
                </div>
              </div>
            ))}
            <button className="modal-submit"
              style={{ background:"var(--surface-3)", color:"var(--text-dim)", boxShadow:"none" }}
              onClick={() => { setAlerts([]); setModal(null); addToast("All notifications cleared."); }}>
              Mark all as read
            </button>
          </div>
        </Modal>
      )}

      <div className="app">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-mark">S</div>
            <div className="logo-text">Smart<span>Supply</span></div>
          </div>
          <div className="status-pill"><div className="status-dot" />AI Engine Active</div>
          <div className="sidebar-section-label">Navigation</div>
          {NAV.map(n => (
            <div key={n.id} className={`nav-item ${activeNav===n.id ? "active" : ""}`}
              onClick={() => handleNavChange(n.id)}>
              <span className="nav-icon">{n.icon}</span>{n.label}
            </div>
          ))}
          <div className="sidebar-divider" />
          <div className="sidebar-section-label">Workspace</div>
          <div className="nav-item"><span className="nav-icon">⬕</span>Team Overview</div>
          <div className="nav-item"><span className="nav-icon">◷</span>Audit Log</div>
          <div className="profile-card">
            <div className="profile-avatar">N</div>
            <div className="profile-info">
              <div className="profile-name">Nomam</div>
              <div className="profile-role">Supply Manager</div>
            </div>
            <span style={{ color:"var(--text-muted)", fontSize:16 }}>⋯</span>
          </div>
        </aside>

        {/* MAIN */}
        <main className="main">
          <div className="topbar">
            <div>
              <div className="page-title">{pageTitle}</div>
              <div className="page-subtitle">{pageSubtitle}</div>
            </div>
            <div className="topbar-right">
              <LiveClock />
              {/* Search only shown on pages where it makes sense */}
              {(activeNav === "inventory" || activeNav === "reports") && (
                <div className="search-wrap">
                  <span className="search-icon">⌕</span>
                  <input className="search"
                    placeholder={activeNav==="inventory" ? "Search SKU or product…" : "Search reports…"}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)} />
                </div>
              )}
              <div className="icon-btn" onClick={handleOpenNotifications} title="Notifications">
                🔔
                {notifCount > 0 && <span className="notif-badge">{notifCount}</span>}
              </div>
              <div className="icon-btn" onClick={() => setModal("alerts")} title="Configure Alerts">⚙</div>
            </div>
          </div>

          {activeNav === "forecast"  && <ForecastPage  addToast={addToast} />}
          {activeNav === "inventory" && <InventoryPage addToast={addToast} searchQuery={searchQuery} />}
          {activeNav === "reports"   && <ReportsPage   addToast={addToast} />}
          {activeNav === "settings"  && <SettingsPage  addToast={addToast} settings={settings} setSettings={setSettings} />}
        </main>

        {/* RIGHT PANEL */}
        <aside className="right">
          <RightPanel
            activeNav={activeNav}
            alerts={alerts}
            onDismissAlert={handleDismissAlert}
            onAction={handleQuickAction}
            modal={modal}
            setModal={setModal}
          />
        </aside>
      </div>
    </>
  );
}