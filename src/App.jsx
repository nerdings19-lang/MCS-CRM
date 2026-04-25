import { useState, useEffect, useCallback } from "react";

// ── Supabase Config ──
const SUPABASE_URL = "https://cupqasmbvvdyvciwyfab.supabase.co";
const SUPABASE_KEY = "sb_publishable_PeMs9i-NpZA2zkXL2mtYuQ_wMzGmUPY";

const sbFetch = async (table, options = {}) => {
  const { method = "GET", body, query = "", headers: extraHeaders = {} } = options;
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: method === "POST" ? "return=representation" : method === "DELETE" ? "return=minimal" : "return=representation",
    ...extraHeaders,
  };
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${method} ${table} failed: ${err}`);
  }
  if (method === "DELETE") return null;
  return res.json();
};

// ── Theme ──
const theme = {
  bg: "#0f1117",
  surface: "#1a1d27",
  surfaceHover: "#222633",
  card: "#1e2230",
  border: "#2a2f3f",
  accent: "#e8972c",
  accentDim: "#c47a1f",
  accentGlow: "rgba(232,151,44,0.15)",
  text: "#e8e6e1",
  textDim: "#8a8d9a",
  textMuted: "#5c5f6e",
  success: "#3ec97a",
  danger: "#e85454",
  dangerDim: "#c44040",
  white: "#ffffff",
};

const fonts = {
  heading: "'Barlow Condensed', sans-serif",
  body: "'DM Sans', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { overflow-x: hidden; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: ${theme.bg}; }
  ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: ${theme.textMuted}; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideIn { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
  @keyframes toastIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes toastOut { from { opacity: 1; } to { opacity: 0; transform: translateY(-10px); } }
`;

// ── Utility ──
const formatCurrency = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? "$0.00" : `$${n.toFixed(2)}`;
};

const formatDate = (d) => {
  if (!d) return "";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const todayStr = () => new Date().toISOString().split("T")[0];

// Map DB snake_case to app camelCase
const mapCustomer = (c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email, address: c.address, createdAt: c.created_at });
const mapVehicle = (v) => ({ id: v.id, customerId: v.customer_id, year: v.year, make: v.make, model: v.model, vin: v.vin, color: v.color, notes: v.notes });
const mapWorkOrder = (w) => ({ id: w.id, vehicleId: w.vehicle_id, date: w.date, services: w.services, partsCost: w.parts_cost, laborCost: w.labor_cost, total: w.total, deposit: w.deposit, status: w.status, notes: w.notes });

// ── Toast Component ──
const Toast = ({ toasts }) => (
  <div style={{ position: "fixed", top: "16px", right: "16px", zIndex: 2000, display: "flex", flexDirection: "column", gap: "8px", maxWidth: "320px" }}>
    {toasts.map((t) => (
      <div key={t.id} style={{
        padding: "12px 16px",
        borderRadius: "8px",
        background: t.type === "success" ? theme.success : t.type === "error" ? theme.danger : theme.accent,
        color: t.type === "success" ? "#fff" : t.type === "error" ? "#fff" : theme.bg,
        fontFamily: fonts.body,
        fontSize: "13px",
        fontWeight: 500,
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        animation: "toastIn 0.3s ease",
      }}>
        {t.type === "success" ? "✓ " : t.type === "error" ? "⚠ " : ""}{t.message}
      </div>
    ))}
  </div>
);

// ── Components ──
const Badge = ({ children, color = theme.accent, style }) => (
  <span style={{
    display: "inline-block", padding: "2px 10px", borderRadius: "4px",
    fontSize: "11px", fontFamily: fonts.mono, fontWeight: 500,
    background: color === theme.accent ? theme.accentGlow : `${color}22`,
    color, letterSpacing: "0.5px", textTransform: "uppercase", ...style,
  }}>{children}</span>
);

const Button = ({ children, onClick, variant = "primary", size = "md", style, disabled }) => {
  const variants = {
    primary: { bg: theme.accent, color: theme.bg, hoverBg: theme.accentDim },
    secondary: { bg: "transparent", color: theme.textDim, hoverBg: theme.surfaceHover, border: `1px solid ${theme.border}` },
    danger: { bg: theme.danger, color: theme.white, hoverBg: theme.dangerDim },
    ghost: { bg: "transparent", color: theme.textDim, hoverBg: theme.surfaceHover },
  };
  const sizes = {
    sm: { padding: "6px 12px", fontSize: "12px" },
    md: { padding: "10px 20px", fontSize: "13px" },
    lg: { padding: "12px 28px", fontSize: "14px" },
  };
  const v = variants[variant];
  const s = sizes[size];
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ ...s, background: hover && !disabled ? v.hoverBg : v.bg, color: disabled ? theme.textMuted : v.color,
        border: v.border || "none", borderRadius: "6px", cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: fonts.body, fontWeight: 600, letterSpacing: "0.3px",
        transition: "all 0.2s ease", opacity: disabled ? 0.5 : 1, ...style,
      }}>{children}</button>
  );
};

const Input = ({ label, value, onChange, type = "text", placeholder, required, style, textarea, options }) => (
  <div style={{ marginBottom: "14px", ...style }}>
    {label && (
      <label style={{ display: "block", fontSize: "11px", fontFamily: fonts.mono, color: theme.textDim,
        marginBottom: "6px", letterSpacing: "0.8px", textTransform: "uppercase",
      }}>{label} {required && <span style={{ color: theme.accent }}>*</span>}</label>
    )}
    {options ? (
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "10px 14px", background: theme.bg, border: `1px solid ${theme.border}`,
          borderRadius: "6px", color: theme.text, fontSize: "14px", fontFamily: fonts.body, outline: "none",
        }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    ) : textarea ? (
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
        style={{ width: "100%", padding: "10px 14px", background: theme.bg, border: `1px solid ${theme.border}`,
          borderRadius: "6px", color: theme.text, fontSize: "14px", fontFamily: fonts.body, outline: "none", resize: "vertical",
        }} />
    ) : (
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "10px 14px", background: theme.bg, border: `1px solid ${theme.border}`,
          borderRadius: "6px", color: theme.text, fontSize: "14px", fontFamily: fonts.body, outline: "none",
        }} />
    )}
  </div>
);

const Modal = ({ title, children, onClose }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center",
    justifyContent: "center", zIndex: 1000, padding: "20px",
  }} onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()} style={{
      background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "12px",
      padding: "28px", width: "100%", maxWidth: "520px", maxHeight: "85vh", overflow: "auto", animation: "fadeIn 0.2s ease",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h2 style={{ fontFamily: fonts.heading, fontSize: "22px", fontWeight: 700, color: theme.text, letterSpacing: "0.5px" }}>{title}</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", color: theme.textMuted, fontSize: "22px", cursor: "pointer", padding: "4px" }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const EmptyState = ({ icon, message, action }) => (
  <div style={{ textAlign: "center", padding: "60px 20px", animation: "fadeIn 0.4s ease" }}>
    <div style={{ fontSize: "40px", marginBottom: "16px", opacity: 0.4 }}>{icon}</div>
    <p style={{ color: theme.textMuted, fontFamily: fonts.body, fontSize: "14px", marginBottom: "20px" }}>{message}</p>
    {action}
  </div>
);

// ── Invoice Component ──
const InvoiceView = ({ workOrder, customer, vehicle, onClose }) => {
  const printInvoice = () => window.print();
  return (
    <Modal title="Invoice" onClose={onClose}>
      <div style={{ background: theme.white, color: "#1a1a1a", borderRadius: "8px", padding: "32px", fontFamily: fonts.body }}>
        <div style={{ borderBottom: "3px solid #e8972c", paddingBottom: "16px", marginBottom: "20px" }}>
          <h1 style={{ fontFamily: fonts.heading, fontSize: "28px", fontWeight: 700, color: "#e8972c", margin: 0 }}>MCS MOBILE REPAIR</h1>
          <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>Professional Mobile Auto Repair</p>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <p style={{ fontSize: "12px", color: "#999", textTransform: "uppercase", letterSpacing: "1px" }}>Bill To</p>
            <p style={{ fontWeight: 600, fontSize: "15px" }}>{customer?.name || "—"}</p>
            <p style={{ fontSize: "13px", color: "#666" }}>{customer?.phone || ""}</p>
            <p style={{ fontSize: "13px", color: "#666" }}>{customer?.email || ""}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "12px", color: "#999", textTransform: "uppercase", letterSpacing: "1px" }}>Invoice</p>
            <p style={{ fontFamily: fonts.mono, fontWeight: 600, fontSize: "15px" }}>WO-{workOrder.id}</p>
            <p style={{ fontSize: "13px", color: "#666" }}>{formatDate(workOrder.date)}</p>
          </div>
        </div>
        <div style={{ background: "#f5f5f0", borderRadius: "6px", padding: "12px 16px", marginBottom: "20px", fontSize: "13px" }}>
          <span style={{ color: "#999" }}>Vehicle: </span>
          <span style={{ fontWeight: 600 }}>{vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "—"}</span>
          {vehicle?.vin && <span style={{ color: "#999" }}> | VIN: {vehicle.vin}</span>}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
              <th style={{ textAlign: "left", padding: "8px 0", color: "#999", fontWeight: 500 }}>Description</th>
              <th style={{ textAlign: "right", padding: "8px 0", color: "#999", fontWeight: 500 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "10px 0" }}>{workOrder.services || "Service"}</td>
              <td style={{ textAlign: "right", padding: "10px 0" }}>{formatCurrency(workOrder.laborCost)}</td>
            </tr>
            {parseFloat(workOrder.partsCost) > 0 && (
              <tr style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px 0" }}>Parts</td>
                <td style={{ textAlign: "right", padding: "10px 0" }}>{formatCurrency(workOrder.partsCost)}</td>
              </tr>
            )}
          </tbody>
        </table>
        <div style={{ borderTop: "2px solid #1a1a1a", paddingTop: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontWeight: 600, fontSize: "16px" }}>Total</span>
            <span style={{ fontWeight: 700, fontSize: "16px" }}>{formatCurrency(workOrder.total)}</span>
          </div>
          {parseFloat(workOrder.deposit) > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}>
                <span>Deposit Collected</span>
                <span>– {formatCurrency(workOrder.deposit)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "16px", fontWeight: 700, color: "#e8972c" }}>
                <span>Balance Due</span>
                <span>{formatCurrency(parseFloat(workOrder.total) - parseFloat(workOrder.deposit))}</span>
              </div>
            </>
          )}
        </div>
        {workOrder.notes && (
          <div style={{ marginTop: "20px", padding: "12px", background: "#f5f5f0", borderRadius: "6px", fontSize: "12px", color: "#666" }}>
            <strong>Notes:</strong> {workOrder.notes}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: "10px", marginTop: "16px", justifyContent: "flex-end" }}>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button onClick={printInvoice}>Print Invoice</Button>
      </div>
    </Modal>
  );
};

// ── Main App ──
export default function MCSApp() {
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [invoiceWO, setInvoiceWO] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Form states
  const [custForm, setCustForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [vehForm, setVehForm] = useState({ customerId: "", year: "", make: "", model: "", vin: "", color: "", notes: "" });
  const [woForm, setWoForm] = useState({
    vehicleId: "", date: todayStr(), services: "", partsCost: "",
    laborCost: "", total: "", deposit: "", status: "pending", notes: "",
  });

  // Toast helper
  const addToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  // ── Load all data from Supabase ──
  useEffect(() => {
    (async () => {
      try {
        const [c, v, w] = await Promise.all([
          sbFetch("customers", { query: "?order=id.asc" }),
          sbFetch("vehicles", { query: "?order=id.asc" }),
          sbFetch("work_orders", { query: "?order=id.desc" }),
        ]);
        setCustomers(c.map(mapCustomer));
        setVehicles(v.map(mapVehicle));
        setWorkOrders(w.map(mapWorkOrder));
        addToast("Connected to cloud database", "success");
      } catch (e) {
        console.error("Load failed:", e);
        addToast("Failed to connect to database: " + e.message, "error");
      }
      setLoading(false);
    })();
  }, [addToast]);

  // ── CRUD Operations ──
  const addCustomer = async () => {
    if (!custForm.name.trim()) return;
    try {
      const result = await sbFetch("customers", {
        method: "POST",
        body: { name: custForm.name, phone: custForm.phone, email: custForm.email, address: custForm.address },
      });
      setCustomers((prev) => [...prev, mapCustomer(result[0])]);
      setCustForm({ name: "", phone: "", email: "", address: "" });
      setModal(null);
      addToast(`Customer "${custForm.name}" added`);
    } catch (e) {
      addToast("Failed to add customer: " + e.message, "error");
    }
  };

  const deleteCustomer = async (id) => {
    if (!confirm("Delete this customer and all associated vehicles/work orders?")) return;
    try {
      await sbFetch("customers", { method: "DELETE", query: `?id=eq.${id}` });
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      const vIds = vehicles.filter((v) => v.customerId === id).map((v) => v.id);
      setVehicles((prev) => prev.filter((v) => v.customerId !== id));
      setWorkOrders((prev) => prev.filter((wo) => !vIds.includes(wo.vehicleId)));
      if (selectedCustomer === id) setSelectedCustomer(null);
      addToast("Customer deleted");
    } catch (e) {
      addToast("Failed to delete customer: " + e.message, "error");
    }
  };

  const addVehicle = async () => {
    if (!vehForm.customerId || !vehForm.make.trim()) return;
    try {
      const result = await sbFetch("vehicles", {
        method: "POST",
        body: { customer_id: parseInt(vehForm.customerId), year: vehForm.year, make: vehForm.make, model: vehForm.model, vin: vehForm.vin, color: vehForm.color, notes: vehForm.notes },
      });
      setVehicles((prev) => [...prev, mapVehicle(result[0])]);
      setVehForm({ customerId: "", year: "", make: "", model: "", vin: "", color: "", notes: "" });
      setModal(null);
      addToast(`Vehicle "${vehForm.year} ${vehForm.make} ${vehForm.model}" added`);
    } catch (e) {
      addToast("Failed to add vehicle: " + e.message, "error");
    }
  };

  const addWorkOrder = async () => {
    if (!woForm.vehicleId) return;
    try {
      const result = await sbFetch("work_orders", {
        method: "POST",
        body: {
          vehicle_id: parseInt(woForm.vehicleId), date: woForm.date, services: woForm.services,
          parts_cost: parseFloat(woForm.partsCost) || 0, labor_cost: parseFloat(woForm.laborCost) || 0,
          total: parseFloat(woForm.total) || 0, deposit: parseFloat(woForm.deposit) || 0,
          status: woForm.status, notes: woForm.notes,
        },
      });
      setWorkOrders((prev) => [mapWorkOrder(result[0]), ...prev]);
      setWoForm({ vehicleId: "", date: todayStr(), services: "", partsCost: "", laborCost: "", total: "", deposit: "", status: "pending", notes: "" });
      setModal(null);
      addToast(`Work order WO-${result[0].id} created`);
    } catch (e) {
      addToast("Failed to create work order: " + e.message, "error");
    }
  };

  const updateWOStatus = async (woId, status) => {
    try {
      await sbFetch("work_orders", {
        method: "PATCH",
        query: `?id=eq.${woId}`,
        body: { status },
      });
      setWorkOrders((prev) => prev.map((wo) => wo.id === woId ? { ...wo, status } : wo));
      addToast(`WO-${woId} marked ${status}`);
    } catch (e) {
      addToast("Failed to update status: " + e.message, "error");
    }
  };

  const deleteWorkOrder = async (woId) => {
    if (!confirm("Delete this work order?")) return;
    try {
      await sbFetch("work_orders", { method: "DELETE", query: `?id=eq.${woId}` });
      setWorkOrders((prev) => prev.filter((wo) => wo.id !== woId));
      addToast(`WO-${woId} deleted`);
    } catch (e) {
      addToast("Failed to delete work order: " + e.message, "error");
    }
  };

  // ── Export data as JSON backup ──
  const exportData = () => {
    const data = { customers, vehicles, workOrders };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mcs-backup-${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast("Backup exported");
  };

  // Helpers
  const getCustomer = (id) => customers.find((c) => c.id === id);
  const getVehicle = (id) => vehicles.find((v) => v.id === id);
  const getCustomerVehicles = (custId) => vehicles.filter((v) => v.customerId === custId);
  const getVehicleOrders = (vehId) => workOrders.filter((wo) => wo.vehicleId === vehId);
  const getCustomerOrders = (custId) => {
    const vIds = getCustomerVehicles(custId).map((v) => v.id);
    return workOrders.filter((wo) => vIds.includes(wo.vehicleId));
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const totalRevenue = workOrders.filter((wo) => wo.status === "completed").reduce((sum, wo) => sum + (parseFloat(wo.total) || 0), 0);
  const activeOrders = workOrders.filter((wo) => wo.status !== "completed" && wo.status !== "cancelled").length;
  const totalCustomers = customers.length;

  // ── Loading Screen ──
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: fonts.heading, fontSize: "32px", fontWeight: 700, color: theme.accent, animation: "pulse 1.5s infinite" }}>MCS</div>
          <p style={{ color: theme.textMuted, fontFamily: fonts.body, fontSize: "13px", marginTop: "8px" }}>Connecting to database...</p>
        </div>
      </div>
    );
  }

  // ── Customer Detail View ──
  const renderCustomerDetail = () => {
    const cust = getCustomer(selectedCustomer);
    if (!cust) return null;
    const custVehicles = getCustomerVehicles(cust.id);
    const orders = getCustomerOrders(cust.id);

    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        <button onClick={() => setSelectedCustomer(null)}
          style={{ background: "none", border: "none", color: theme.accent, fontFamily: fonts.body, fontSize: "13px", cursor: "pointer", marginBottom: "16px", padding: 0 }}>
          ← Back to Customers
        </button>
        <div style={{ background: theme.surface, borderRadius: "10px", border: `1px solid ${theme.border}`, padding: "24px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ fontFamily: fonts.heading, fontSize: "26px", fontWeight: 700, color: theme.text }}>{cust.name}</h2>
              <div style={{ display: "flex", gap: "20px", marginTop: "8px", flexWrap: "wrap" }}>
                {cust.phone && <span style={{ color: theme.textDim, fontSize: "13px" }}>📞 {cust.phone}</span>}
                {cust.email && <span style={{ color: theme.textDim, fontSize: "13px" }}>✉ {cust.email}</span>}
                {cust.address && <span style={{ color: theme.textDim, fontSize: "13px" }}>📍 {cust.address}</span>}
              </div>
            </div>
            <Button variant="danger" size="sm" onClick={() => deleteCustomer(cust.id)}>Delete</Button>
          </div>
          <div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
            <Badge>{custVehicles.length} vehicle{custVehicles.length !== 1 ? "s" : ""}</Badge>
            <Badge color={theme.success}>{orders.length} work order{orders.length !== 1 ? "s" : ""}</Badge>
          </div>
        </div>

        {/* Vehicles */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontFamily: fonts.heading, fontSize: "18px", fontWeight: 600, color: theme.text }}>VEHICLES</h3>
            <Button size="sm" onClick={() => { setVehForm({ ...vehForm, customerId: String(cust.id) }); setModal("vehicle"); }}>+ Add Vehicle</Button>
          </div>
          {custVehicles.length === 0 ? (
            <p style={{ color: theme.textMuted, fontSize: "13px", fontStyle: "italic" }}>No vehicles added yet</p>
          ) : custVehicles.map((v, i) => (
            <div key={v.id} style={{ background: theme.surface, borderRadius: "8px", border: `1px solid ${theme.border}`, padding: "16px", marginBottom: "8px", animation: `slideIn 0.3s ease ${i * 0.05}s both` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontFamily: fonts.heading, fontSize: "16px", fontWeight: 600, color: theme.text }}>{v.year} {v.make} {v.model}</span>
                  {v.color && <Badge style={{ marginLeft: "10px" }}>{v.color}</Badge>}
                </div>
                <span style={{ fontFamily: fonts.mono, fontSize: "11px", color: theme.textMuted }}>{getVehicleOrders(v.id).length} orders</span>
              </div>
              {v.vin && <p style={{ fontFamily: fonts.mono, fontSize: "11px", color: theme.textDim, marginTop: "6px" }}>VIN: {v.vin}</p>}
              {v.notes && <p style={{ fontSize: "12px", color: theme.textDim, marginTop: "4px" }}>{v.notes}</p>}
            </div>
          ))}
        </div>

        {/* Work Orders */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontFamily: fonts.heading, fontSize: "18px", fontWeight: 600, color: theme.text }}>WORK ORDERS</h3>
            {custVehicles.length > 0 && (
              <Button size="sm" onClick={() => { setWoForm({ ...woForm, vehicleId: String(custVehicles[0].id) }); setModal("workOrder"); }}>+ New Work Order</Button>
            )}
          </div>
          {orders.length === 0 ? (
            <p style={{ color: theme.textMuted, fontSize: "13px", fontStyle: "italic" }}>No work orders yet</p>
          ) : orders.sort((a, b) => b.id - a.id).map((wo, i) => {
            const veh = getVehicle(wo.vehicleId);
            const statusColors = { pending: theme.accent, "in-progress": "#5b9cf5", completed: theme.success, cancelled: theme.danger };
            return (
              <div key={wo.id} style={{ background: theme.surface, borderRadius: "8px", border: `1px solid ${theme.border}`, padding: "16px", marginBottom: "8px", borderLeft: `3px solid ${statusColors[wo.status] || theme.border}`, animation: `slideIn 0.3s ease ${i * 0.05}s both` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontFamily: fonts.mono, fontSize: "13px", fontWeight: 600, color: theme.text }}>WO-{wo.id}</span>
                      <Badge color={statusColors[wo.status]}>{wo.status}</Badge>
                    </div>
                    <p style={{ fontSize: "14px", color: theme.text, marginTop: "6px" }}>{wo.services || "—"}</p>
                    {veh && <p style={{ fontSize: "12px", color: theme.textDim, marginTop: "2px" }}>{veh.year} {veh.make} {veh.model}</p>}
                    <p style={{ fontSize: "11px", color: theme.textMuted, marginTop: "4px" }}>{formatDate(wo.date)}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontFamily: fonts.mono, fontSize: "18px", fontWeight: 700, color: theme.accent }}>{formatCurrency(wo.total)}</p>
                    {parseFloat(wo.deposit) > 0 && <p style={{ fontSize: "11px", color: theme.textDim }}>Deposit: {formatCurrency(wo.deposit)}</p>}
                  </div>
                </div>
                {wo.notes && <p style={{ fontSize: "12px", color: theme.textDim, marginTop: "8px", padding: "8px", background: theme.bg, borderRadius: "4px" }}>{wo.notes}</p>}
                <div style={{ display: "flex", gap: "6px", marginTop: "12px", flexWrap: "wrap" }}>
                  {wo.status !== "completed" && <Button size="sm" variant="ghost" onClick={() => updateWOStatus(wo.id, "completed")}>✓ Complete</Button>}
                  {wo.status === "pending" && <Button size="sm" variant="ghost" onClick={() => updateWOStatus(wo.id, "in-progress")}>▶ Start</Button>}
                  <Button size="sm" variant="ghost" onClick={() => setInvoiceWO(wo)}>📄 Invoice</Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteWorkOrder(wo.id)} style={{ color: theme.danger }}>✕ Delete</Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Main Render ──
  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, fontFamily: fonts.body }}>
      <style>{globalStyles}</style>
      <Toast toasts={toasts} />

      {/* Header */}
      <header style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}`, padding: "12px 16px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
              <span style={{ fontFamily: fonts.heading, fontSize: "24px", fontWeight: 700, color: theme.accent, letterSpacing: "1px" }}>MCS</span>
              <span style={{ fontFamily: fonts.heading, fontSize: "14px", fontWeight: 400, color: theme.textDim, letterSpacing: "2px", textTransform: "uppercase" }}>Mobile Repair</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "9px", fontFamily: fonts.mono, color: theme.success, padding: "2px 6px", background: `${theme.success}22`, borderRadius: "3px" }}>☁ CLOUD</span>
              <button onClick={exportData} title="Export backup" style={{ background: "none", border: `1px solid ${theme.border}`, borderRadius: "5px", color: theme.textDim, padding: "5px 8px", cursor: "pointer", fontSize: "14px" }}>💾</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            {["dashboard", "customers"].map((v) => (
              <button key={v} onClick={() => { setView(v); setSelectedCustomer(null); }}
                style={{ background: view === v ? theme.accentGlow : "transparent", color: view === v ? theme.accent : theme.textDim,
                  border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer",
                  fontFamily: fonts.body, fontSize: "13px", fontWeight: view === v ? 600 : 400, textTransform: "capitalize",
                }}>{v}</button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: "960px", margin: "0 auto", padding: "20px 16px" }}>
        {/* Dashboard */}
        {view === "dashboard" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "28px" }}>
              {[
                { label: "Revenue", value: formatCurrency(totalRevenue), color: theme.success },
                { label: "Active", value: activeOrders, color: theme.accent },
                { label: "Customers", value: totalCustomers, color: "#5b9cf5" },
              ].map((stat, i) => (
                <div key={i} style={{ background: theme.surface, borderRadius: "10px", border: `1px solid ${theme.border}`, padding: "20px", animation: `fadeIn 0.3s ease ${i * 0.1}s both` }}>
                  <p style={{ fontFamily: fonts.mono, fontSize: "11px", color: theme.textMuted, letterSpacing: "1px", textTransform: "uppercase" }}>{stat.label}</p>
                  <p style={{ fontFamily: fonts.heading, fontSize: "28px", fontWeight: 700, color: stat.color, marginTop: "4px" }}>{stat.value}</p>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "10px", marginBottom: "28px", flexWrap: "wrap" }}>
              <Button onClick={() => setModal("customer")}>+ New Customer</Button>
              <Button variant="secondary" onClick={() => setModal("vehicle")}>+ Add Vehicle</Button>
              <Button variant="secondary" onClick={() => setModal("workOrder")}>+ Work Order</Button>
            </div>
            <h3 style={{ fontFamily: fonts.heading, fontSize: "18px", fontWeight: 600, color: theme.text, marginBottom: "12px" }}>RECENT WORK ORDERS</h3>
            {workOrders.length === 0 ? (
              <EmptyState icon="🔧" message="No work orders yet. Add a customer and vehicle to get started." />
            ) : (
              workOrders.slice(0, 8).map((wo, i) => {
                const veh = getVehicle(wo.vehicleId);
                const cust = veh ? getCustomer(vehicles.find((v) => v.id === wo.vehicleId)?.customerId) : null;
                const statusColors = { pending: theme.accent, "in-progress": "#5b9cf5", completed: theme.success, cancelled: theme.danger };
                return (
                  <div key={wo.id} onClick={() => { if (cust) { setSelectedCustomer(cust.id); setView("customers"); } }}
                    style={{ background: theme.surface, borderRadius: "8px", border: `1px solid ${theme.border}`, padding: "14px 16px", marginBottom: "6px",
                      borderLeft: `3px solid ${statusColors[wo.status] || theme.border}`, cursor: cust ? "pointer" : "default",
                      animation: `slideIn 0.3s ease ${i * 0.04}s both`,
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ fontFamily: fonts.mono, fontSize: "12px", color: theme.textDim }}>WO-{wo.id}</span>
                        <span style={{ margin: "0 8px", color: theme.textMuted }}>·</span>
                        <span style={{ fontSize: "13px", color: theme.text }}>{wo.services || "Service"}</span>
                        {cust && <span style={{ fontSize: "12px", color: theme.textDim, marginLeft: "10px" }}>— {cust.name}</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, marginLeft: "8px" }}>
                        <Badge color={statusColors[wo.status]}>{wo.status}</Badge>
                        <span style={{ fontFamily: fonts.mono, fontSize: "14px", fontWeight: 600, color: theme.accent }}>{formatCurrency(wo.total)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Customers */}
        {view === "customers" && !selectedCustomer && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
              <h2 style={{ fontFamily: fonts.heading, fontSize: "24px", fontWeight: 700, color: theme.text }}>CUSTOMERS</h2>
              <Button onClick={() => setModal("customer")}>+ New Customer</Button>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, or email..."
                style={{ width: "100%", padding: "12px 16px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "8px", color: theme.text, fontSize: "14px", fontFamily: fonts.body, outline: "none" }} />
            </div>
            {filteredCustomers.length === 0 ? (
              <EmptyState icon="👤" message={search ? "No customers match your search" : "No customers yet"}
                action={!search && <Button onClick={() => setModal("customer")}>Add First Customer</Button>} />
            ) : filteredCustomers.map((c, i) => {
              const vehCount = getCustomerVehicles(c.id).length;
              const orderCount = getCustomerOrders(c.id).length;
              return (
                <div key={c.id} onClick={() => setSelectedCustomer(c.id)}
                  style={{ background: theme.surface, borderRadius: "8px", border: `1px solid ${theme.border}`, padding: "16px", marginBottom: "8px", cursor: "pointer",
                    transition: "all 0.15s ease", animation: `slideIn 0.3s ease ${i * 0.04}s both`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = theme.surfaceHover; e.currentTarget.style.borderColor = theme.accent + "44"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = theme.surface; e.currentTarget.style.borderColor = theme.border; }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontFamily: fonts.heading, fontSize: "17px", fontWeight: 600, color: theme.text }}>{c.name}</span>
                      <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
                        {c.phone && <span style={{ fontSize: "12px", color: theme.textDim }}>{c.phone}</span>}
                        {c.email && <span style={{ fontSize: "12px", color: theme.textDim }}>{c.email}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Badge>{vehCount} veh</Badge>
                      <Badge color={theme.success}>{orderCount} wo</Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === "customers" && selectedCustomer && renderCustomerDetail()}
      </main>

      {/* Modals */}
      {modal === "customer" && (
        <Modal title="New Customer" onClose={() => setModal(null)}>
          <Input label="Name" value={custForm.name} onChange={(v) => setCustForm({ ...custForm, name: v })} required placeholder="Full name" />
          <Input label="Phone" value={custForm.phone} onChange={(v) => setCustForm({ ...custForm, phone: v })} type="tel" placeholder="(555) 123-4567" />
          <Input label="Email" value={custForm.email} onChange={(v) => setCustForm({ ...custForm, email: v })} type="email" placeholder="email@example.com" />
          <Input label="Address" value={custForm.address} onChange={(v) => setCustForm({ ...custForm, address: v })} placeholder="Street address" />
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={addCustomer} disabled={!custForm.name.trim()}>Add Customer</Button>
          </div>
        </Modal>
      )}

      {modal === "vehicle" && (
        <Modal title="Add Vehicle" onClose={() => setModal(null)}>
          <Input label="Customer" value={vehForm.customerId} onChange={(v) => setVehForm({ ...vehForm, customerId: v })} required
            options={[{ value: "", label: "Select customer..." }, ...customers.map((c) => ({ value: String(c.id), label: c.name }))]} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <Input label="Year" value={vehForm.year} onChange={(v) => setVehForm({ ...vehForm, year: v })} placeholder="2017" />
            <Input label="Make" value={vehForm.make} onChange={(v) => setVehForm({ ...vehForm, make: v })} required placeholder="Ford" />
            <Input label="Model" value={vehForm.model} onChange={(v) => setVehForm({ ...vehForm, model: v })} placeholder="Fusion" />
          </div>
          <Input label="VIN" value={vehForm.vin} onChange={(v) => setVehForm({ ...vehForm, vin: v })} placeholder="Vehicle Identification Number" />
          <Input label="Color" value={vehForm.color} onChange={(v) => setVehForm({ ...vehForm, color: v })} placeholder="Silver" />
          <Input label="Notes" value={vehForm.notes} onChange={(v) => setVehForm({ ...vehForm, notes: v })} textarea placeholder="Any notes about this vehicle" />
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={addVehicle} disabled={!vehForm.customerId || !vehForm.make.trim()}>Add Vehicle</Button>
          </div>
        </Modal>
      )}

      {modal === "workOrder" && (
        <Modal title="New Work Order" onClose={() => setModal(null)}>
          <Input label="Vehicle" value={woForm.vehicleId} onChange={(v) => setWoForm({ ...woForm, vehicleId: v })} required
            options={[{ value: "", label: "Select vehicle..." }, ...vehicles.map((v) => {
              const c = getCustomer(v.customerId);
              return { value: String(v.id), label: `${v.year} ${v.make} ${v.model} — ${c?.name || ""}` };
            })]} />
          <Input label="Date" value={woForm.date} onChange={(v) => setWoForm({ ...woForm, date: v })} type="date" />
          <Input label="Services Performed" value={woForm.services} onChange={(v) => setWoForm({ ...woForm, services: v })} textarea required placeholder="Rear brake pads & rotors replacement" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <Input label="Parts Cost" value={woForm.partsCost} onChange={(v) => setWoForm({ ...woForm, partsCost: v })} type="number" placeholder="0.00" />
            <Input label="Labor / Service Fee" value={woForm.laborCost} onChange={(v) => setWoForm({ ...woForm, laborCost: v })} type="number" placeholder="85.00" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <Input label="Total" value={woForm.total} onChange={(v) => setWoForm({ ...woForm, total: v })} type="number" placeholder="399.50" />
            <Input label="Deposit Collected" value={woForm.deposit} onChange={(v) => setWoForm({ ...woForm, deposit: v })} type="number" placeholder="75.00" />
          </div>
          <Input label="Status" value={woForm.status} onChange={(v) => setWoForm({ ...woForm, status: v })}
            options={[{ value: "pending", label: "Pending" }, { value: "in-progress", label: "In Progress" }, { value: "completed", label: "Completed" }]} />
          <Input label="Notes" value={woForm.notes} onChange={(v) => setWoForm({ ...woForm, notes: v })} textarea placeholder="20% markup on parts, $75 deposit collected" />
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={addWorkOrder} disabled={!woForm.vehicleId}>Create Work Order</Button>
          </div>
        </Modal>
      )}

      {invoiceWO && (
        <InvoiceView workOrder={invoiceWO}
          customer={(() => { const v = getVehicle(invoiceWO.vehicleId); return v ? getCustomer(v.customerId) : null; })()}
          vehicle={getVehicle(invoiceWO.vehicleId)} onClose={() => setInvoiceWO(null)} />
      )}
    </div>
  );
}
