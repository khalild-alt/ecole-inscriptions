import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE CLIENT ──────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── OPTIONAL FIELDS ──────────────────────────────────────────
const OPTIONAL_FIELDS = [
  { key: "qty",       labelFr: "Quantité",       labelAr: "الكمية",        defaultOn: true },
  { key: "threshold", labelFr: "Seuil d'alerte", labelAr: "حد التنبيه",    defaultOn: true },
  { key: "supplier",  labelFr: "Fournisseur",     labelAr: "المورد",        defaultOn: true },
  { key: "reference", labelFr: "Référence",       labelAr: "المرجع",        defaultOn: true },
  { key: "price",     labelFr: "Prix unitaire",   labelAr: "السعر الوحدوي", defaultOn: true },
  { key: "buyer",     labelFr: "Acheteur",        labelAr: "المشتري",       defaultOn: true },
  { key: "dateIn",    labelFr: "Date d'entrée",   labelAr: "تاريخ الدخول",  defaultOn: true },
  { key: "dateOut",   labelFr: "Date de sortie",  labelAr: "تاريخ الخروج",  defaultOn: true },
];

const DEFAULT_FIELD_CONFIG = {
  global: Object.fromEntries(OPTIONAL_FIELDS.map(f => [f.key, f.defaultOn])),
  byCategory: {},
};
const DEFAULT_LOC_LEVELS = [
  { level_num: 1, label_fr: "Bâtiment", label_ar: "مبنى" },
  { level_num: 2, label_fr: "Salle", label_ar: "قاعة" },
  { level_num: 3, label_fr: "Armoire", label_ar: "خزانة" },
  { level_num: 4, label_fr: "Étagère", label_ar: "رف" },
];
const DEFAULT_LABELS = {
  fr: { dashboard: "Tableau de bord", articles: "Articles", locations: "Emplacements", history: "Historique" },
  ar: { dashboard: "لوحة التحكم", articles: "المنتجات", locations: "الأماكن", history: "السجل" },
};
const ALL_COLUMNS = [
  { key: "category", alwaysOn: true },
  { key: "location", alwaysOn: false }, { key: "qty", alwaysOn: false },
  { key: "threshold", alwaysOn: false }, { key: "unit", alwaysOn: false },
  { key: "supplier", alwaysOn: false }, { key: "reference", alwaysOn: false },
  { key: "price", alwaysOn: false }, { key: "buyer", alwaysOn: false },
  { key: "dateIn", alwaysOn: false }, { key: "dateOut", alwaysOn: false },
  { key: "status", alwaysOn: false },
];
const DEFAULT_VISIBLE_COLS = Object.fromEntries(ALL_COLUMNS.map(c => [c.key, true]));

// ─── TRANSLATIONS ─────────────────────────────────────────────
const T = {
  fr: {
    dir: "ltr", appName: "Stock et Inventaire", tagline: "Gestion", langSwitch: "العربية",
    nav: { dashboard: "Tableau de bord", articles: "Articles", locations: "Emplacements", history: "Historique", settings: "Paramètres" },
    auth: { title: "Connexion", email: "Email", password: "Mot de passe", login: "Se connecter", logout: "Se déconnecter", error: "Email ou mot de passe incorrect.", loading: "Connexion..." },
    dashboard: { total: "Total articles", categories: "Catégories", lowStock: "Stock faible", outOfStock: "Rupture de stock", recentAlerts: "Alertes récentes", noAlerts: "Aucune alerte — tout est en ordre ✓", categoryBreakdown: "Répartition par catégorie", items: "articles" },
    articles: { add: "Ajouter", search: "Rechercher...", filterCat: "Toutes catégories", filterStatus: "Tous statuts", noResults: "Aucun article trouvé", name: "Nom", category: "Catégorie", quantity: "Quantité", unit: "Unité", threshold: "Seuil", location: "Emplacement", supplier: "Fournisseur", reference: "Référence", price: "Prix", buyer: "Acheteur", dateIn: "Date entrée", dateOut: "Date sortie", status: "Statut", actions: "Actions", edit: "Modifier", delete: "Supprimer", confirmDelete: "Supprimer cet article ?", statusOk: "OK", statusLow: "Faible", statusOut: "Rupture", columns: "Colonnes", transfer: "Transférer", transferTitle: "Transférer vers un autre emplacement", transferQty: "Quantité à transférer", transferDest: "Emplacement destination", transferConfirm: "Transférer", transferNote: "Transfert depuis", transferAvailable: "Disponible" },
    form: { addTitle: "Nouvel article", editTitle: "Modifier l'article", name: "Nom de l'article", namePh: "Ex: Ramette de papier A4", category: "Catégorie", categoryPh: "Ex: Papeterie", quantity: "Quantité", unit: "Unité", unitPh: "Ex: rame, pièce, boîte", threshold: "Seuil d'alerte", supplier: "Fournisseur", supplierPh: "Ex: Bureau Vallée", reference: "Référence", referencePh: "Ex: REF-001", price: "Prix unitaire (DT)", buyer: "Acheteur", buyerPh: "Ex: Service RH", dateIn: "Date d'entrée", dateOut: "Date de sortie", save: "Enregistrer", cancel: "Annuler", selectLevel: "Sélectionner" },
    locations: { add: "Ajouter", namePh: "Nom...", save: "Ajouter", edit: "Modifier", delete: "Supprimer", confirmDeleteCascade: "Supprimer cet élément et ses sous-éléments ?", noItems: "Aucun emplacement", itemCount: "article(s)" },
    history: { noHistory: "Aucun mouvement enregistré", in: "Entrée", out: "Sortie", adjust: "Ajustement", addMovement: "Enregistrer un mouvement", article: "Article", type: "Type", quantity: "Quantité", note: "Note", notePh: "Raison (optionnel)", save: "Enregistrer", cancel: "Annuler" },
    io: { export: "Exporter CSV", import: "Importer CSV", importError: "Erreur lors de l'import" },
    settings: {
      menuLabels: "Noms des menus", menuLabelsDesc: "Personnalisez les labels de navigation.", frLabel: "Français", arLabel: "Arabe",
      locLevels: "Niveaux d'emplacement", locLevelsDesc: "Nommez les niveaux de la hiérarchie.",
      fieldsTitle: "Champs des articles", fieldsDesc: "Activez ou désactivez les champs.",
      fieldsByCategory: "Champs par catégorie", fieldsByCategoryDesc: "Affinez les champs pour chaque catégorie.", allCategories: "Aucune catégorie créée.",
      save: "Enregistrer", reset: "Réinitialiser", saved: "Enregistré ✓",
    },
  },
  ar: {
    dir: "rtl", appName: "المخزون والجرد", tagline: "إدارة", langSwitch: "Français",
    nav: { dashboard: "لوحة التحكم", articles: "المنتجات", locations: "الأماكن", history: "السجل", settings: "الإعدادات" },
    auth: { title: "تسجيل الدخول", email: "البريد الإلكتروني", password: "كلمة المرور", login: "دخول", logout: "تسجيل الخروج", error: "البريد أو كلمة المرور غير صحيحة.", loading: "جارٍ الدخول..." },
    dashboard: { total: "إجمالي المنتجات", categories: "الفئات", lowStock: "مخزون منخفض", outOfStock: "نفاد المخزون", recentAlerts: "التنبيهات الأخيرة", noAlerts: "لا توجد تنبيهات ✓", categoryBreakdown: "التوزيع حسب الفئة", items: "منتجات" },
    articles: { add: "إضافة", search: "بحث...", filterCat: "جميع الفئات", filterStatus: "جميع الحالات", noResults: "لا توجد نتائج", name: "الاسم", category: "الفئة", quantity: "الكمية", unit: "الوحدة", threshold: "حد التنبيه", location: "المكان", supplier: "المورد", reference: "المرجع", price: "السعر", buyer: "المشتري", dateIn: "تاريخ الدخول", dateOut: "تاريخ الخروج", status: "الحالة", actions: "إجراءات", edit: "تعديل", delete: "حذف", confirmDelete: "هل تريد الحذف؟", statusOk: "جيد", statusLow: "منخفض", statusOut: "نفاد", columns: "الأعمدة", transfer: "تحويل", transferTitle: "تحويل إلى موقع آخر", transferQty: "الكمية المحولة", transferDest: "الوجهة", transferConfirm: "تحويل", transferNote: "تحويل من", transferAvailable: "المتاح" },
    form: { addTitle: "منتج جديد", editTitle: "تعديل المنتج", name: "اسم المنتج", namePh: "مثال: رزمة ورق A4", category: "الفئة", categoryPh: "مثال: قرطاسية", quantity: "الكمية", unit: "الوحدة", unitPh: "مثال: رزمة، قطعة", threshold: "حد التنبيه", supplier: "المورد", supplierPh: "", reference: "المرجع", referencePh: "", price: "السعر (د.ت)", buyer: "المشتري", buyerPh: "", dateIn: "تاريخ الدخول", dateOut: "تاريخ الخروج", save: "حفظ", cancel: "إلغاء", selectLevel: "اختر" },
    locations: { add: "إضافة", namePh: "الاسم...", save: "إضافة", edit: "تعديل", delete: "حذف", confirmDeleteCascade: "حذف هذا العنصر وكل ما يندرج تحته؟", noItems: "لا توجد أماكن", itemCount: "منتج" },
    history: { noHistory: "لا توجد حركات", in: "إدخال", out: "إخراج", adjust: "تعديل", addMovement: "تسجيل حركة", article: "المنتج", type: "النوع", quantity: "الكمية", note: "ملاحظة", notePh: "السبب (اختياري)", save: "حفظ", cancel: "إلغاء" },
    io: { export: "تصدير CSV", import: "استيراد CSV", importError: "خطأ في الاستيراد" },
    settings: {
      menuLabels: "أسماء القوائم", menuLabelsDesc: "خصص تسميات التنقل.", frLabel: "بالفرنسية", arLabel: "بالعربية",
      locLevels: "مستويات الأماكن", locLevelsDesc: "سمّ مستويات التسلسل الهرمي.",
      fieldsTitle: "حقول المنتجات", fieldsDesc: "فعّل أو عطّل الحقول.",
      fieldsByCategory: "الحقول حسب الفئة", fieldsByCategoryDesc: "خصص الحقول لكل فئة.", allCategories: "لا توجد فئات.",
      save: "حفظ", reset: "إعادة التعيين", saved: "تم الحفظ ✓",
    },
  },
};

// ─── HELPERS ──────────────────────────────────────────────────
const uid = () => crypto.randomUUID();
const getStatus = (qty, threshold, hasQty) => !hasQty ? "ok" : qty === 0 ? "out" : qty <= threshold ? "low" : "ok";
const STATUS_COLORS = { ok: "#22c55e", low: "#f59e0b", out: "#ef4444" };
const STATUS_BG = { ok: "#f0fdf4", low: "#fffbeb", out: "#fef2f2" };

function getFieldsForCategory(category, fieldConfig) {
  const global = fieldConfig.global;
  const cat = fieldConfig.byCategory?.[category];
  return cat ? { ...global, ...cat } : global;
}

// ─── LOCATION TREE HELPERS ────────────────────────────────────
// DB rows: { id, parent_id, name } → build tree for UI
function buildTree(rows, parentId = null) {
  return rows
    .filter(r => r.parent_id === parentId)
    .map(r => ({ ...r, children: buildTree(rows, r.id) }));
}

function getPathLabel(rows, pathIds) {
  if (!pathIds || pathIds.length === 0) return "—";
  return pathIds.map(id => rows.find(r => r.id === id)?.name || "").filter(Boolean).join(" › ") || "—";
}

// ─── DASHBOARD LOCATION FILTER (Centre → Salle cascade) ───────
function LocationFilter({ locRows, value, onChange, lang }) {
  const centres = useMemo(() => locRows.filter(r => r.parent_id === null), [locRows]);
  const salles = useMemo(() => value.centre ? locRows.filter(r => r.parent_id === value.centre) : [], [locRows, value.centre]);

  const selectStyle = { padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff", cursor: "pointer" };
  const labelCentre = lang === "ar" ? "كل المراكز" : "Tous les centres";
  const labelSalle = lang === "ar" ? "كل القاعات" : "Toutes les salles";

  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
      <select value={value.centre || ""} onChange={e => onChange({ centre: e.target.value || null, salle: null })} style={selectStyle}>
        <option value="">{labelCentre}</option>
        {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      {value.centre && salles.length > 0 && (
        <select value={value.salle || ""} onChange={e => onChange({ ...value, salle: e.target.value || null })} style={selectStyle}>
          <option value="">{labelSalle}</option>
          {salles.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
    </div>
  );
}

// Compact cascade selector for use inside table header filter rows
function LocationFilterInline({ locRows, value, onChange, lang }) {
  const centres = useMemo(() => locRows.filter(r => r.parent_id === null), [locRows]);
  const salles = useMemo(() => value.centre ? locRows.filter(r => r.parent_id === value.centre) : [], [locRows, value.centre]);

  const selectStyle = { width: "100%", padding: "5px 6px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 11, fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff", cursor: "pointer" };
  const labelCentre = lang === "ar" ? "الكل" : "Tous";
  const labelSalle = lang === "ar" ? "الكل" : "Toutes";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <select value={value.centre || ""} onChange={e => onChange({ centre: e.target.value || null, salle: null })} style={selectStyle}>
        <option value="">{labelCentre}</option>
        {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      {value.centre && salles.length > 0 && (
        <select value={value.salle || ""} onChange={e => onChange({ ...value, salle: e.target.value || null })} style={selectStyle}>
          <option value="">{labelSalle}</option>
          {salles.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
    </div>
  );
}

// Returns true if item's location_path matches the selected centre/salle filter
function matchesLocationFilter(locationPath, filter) {
  if (!filter.centre) return true;
  const path = locationPath || [];
  if (!path.includes(filter.centre)) return false;
  if (filter.salle && !path.includes(filter.salle)) return false;
  return true;
}

// ─── SUPABASE DATA LAYER ──────────────────────────────────────
async function getConfig(userId, key, fallback) {
  const { data } = await supabase.from("app_config").select("value").eq("user_id", userId).eq("key", key).maybeSingle();
  return data ? data.value : fallback;
}

async function setConfig(userId, key, value) {
  await supabase.from("app_config").upsert({ user_id: userId, key, value, updated_at: new Date().toISOString() }, { onConflict: "user_id,key" });
}

// Load menu labels with priority: centre-specific > global > app_config fallback > default
async function loadMenuLabels(userId, centreId, defaultLabels) {
  // 1. Try centre-specific labels
  if (centreId) {
    const { data } = await supabase.from("menu_labels").select("labels").eq("centre_id", centreId).maybeSingle();
    if (data?.labels && Object.keys(data.labels).length > 0) return data.labels;
  }
  // 2. Try global labels (set by superadmin for all centres)
  const { data: global } = await supabase.from("menu_labels").select("labels").is("centre_id", null).maybeSingle();
  if (global?.labels && Object.keys(global.labels).length > 0) return global.labels;
  // 3. Fallback to app_config (legacy)
  const { data: cfg } = await supabase.from("app_config").select("value").eq("user_id", userId).eq("key", "menuLabels").maybeSingle();
  if (cfg?.value) return cfg.value;
  return defaultLabels;
}

async function saveMenuLabels(labels, centreId) {
  if (centreId) {
    await supabase.from("menu_labels").delete().eq("centre_id", centreId);
    await supabase.from("menu_labels").insert({ centre_id: centreId, labels, updated_at: new Date().toISOString() });
  } else {
    await supabase.from("menu_labels").delete().is("centre_id", null);
    await supabase.from("menu_labels").insert({ centre_id: null, labels, updated_at: new Date().toISOString() });
  }
}

function exportCSV(articles, locRows, locLevels, fieldConfig) {
  const escCsv = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const header = ["Nom", "Catégorie", ...locLevels, "Unité", ...OPTIONAL_FIELDS.map(f => f.labelFr)].join(",");
  const rows = articles.map(a => {
    const fields = getFieldsForCategory(a.category, fieldConfig);
    const pathParts = (a.location_path || []).map(id => locRows.find(r => r.id === id)?.name || "");
    while (pathParts.length < locLevels.length) pathParts.push("");
    return [a.name, a.category, ...pathParts, a.unit,
      fields.qty ? a.qty : "", fields.threshold ? a.threshold : "",
      fields.supplier ? (a.supplier || "") : "", fields.reference ? (a.reference || "") : "",
      fields.price ? (a.price || "") : "", fields.buyer ? (a.buyer || "") : "",
      fields.dateIn ? (a.date_in || "") : "", fields.dateOut ? (a.date_out || "") : "",
    ].map(escCsv).join(",");
  });
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const el = document.createElement("a"); el.href = url; el.download = "inventaire.csv"; el.click();
  URL.revokeObjectURL(url);
}

// ─── UI PRIMITIVES ────────────────────────────────────────────
function StatCard({ label, value, color, icon, onClick }) {
  return (
    <div onClick={onClick} style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderLeft: `4px solid ${color}`, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: onClick ? "pointer" : "default", transition: "transform 0.1s, box-shadow 0.1s" }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateY(-2px)"; } }}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.07)"; e.currentTarget.style.transform = "translateY(0)"; } }}>
      <div>
        <div style={{ fontSize: 13, color: "#6b7280", fontFamily: "'DM Sans',sans-serif", marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 36, fontWeight: 700, color: "#111827", fontFamily: "'Fraunces',serif", lineHeight: 1 }}>{value}</div>
      </div>
      <div style={{ fontSize: 32 }}>{icon}</div>
    </div>
  );
}

function StatusBadge({ status, t }) {
  const labels = { ok: t.articles.statusOk, low: t.articles.statusLow, out: t.articles.statusOut };
  return <span style={{ background: STATUS_BG[status], color: STATUS_COLORS[status], border: `1px solid ${STATUS_COLORS[status]}30`, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>{labels[status]}</span>;
}

function Modal({ title, children, onClose, dir, confirmClose }) {
  const handleClose = () => {
    if (confirmClose) {
      if (window.confirm(confirmClose)) onClose();
    } else {
      onClose();
    }
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={handleClose}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 560, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto", overflowX: "visible", direction: dir }} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 24 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

// ─── AUTOCOMPLETE INPUT ───────────────────────────────────────
function AutocompleteInput({ label, value, onChange, suggestions = [], placeholder, accentColor = "#6366f1" }) {
  const [show, setShow] = useState(false);
  const inputRef = useRef(null);

  const filtered = value.trim()
    ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase())).slice(0, 10)
    : suggestions.slice(0, 10);

  const select = (s) => { onChange(s); setShow(false); inputRef.current?.focus(); };

  return (
    <div style={{ marginBottom: 13 }}>
      {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5, fontFamily: "'DM Sans',sans-serif" }}>{label}</label>}
      <div style={{ position: "relative" }}>
        <input ref={inputRef} value={value} placeholder={placeholder || ""}
          onChange={e => { onChange(e.target.value); setShow(true); }}
          onFocus={() => setShow(true)}
          onClick={() => setShow(true)}
          onBlur={() => setTimeout(() => setShow(false), 200)}
          onKeyDown={e => {
            if (e.key === "Escape") { setShow(false); e.preventDefault(); }
            if ((e.key === "Enter" || e.key === "Tab") && filtered[0]) { select(filtered[0]); if (e.key === "Enter") e.preventDefault(); }
          }}
          style={{ width: "100%", padding: "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none", boxSizing: "border-box" }}
          onFocusCapture={e => e.target.style.borderColor = accentColor}
          onBlurCapture={e => e.target.style.borderColor = "#e5e7eb"} />
        {show && filtered.length > 0 && inputRef.current && (() => {
          const rect = inputRef.current.getBoundingClientRect();
          return (
            <div style={{ position: "fixed", top: rect.bottom + 2, left: rect.left, width: rect.width, background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 9, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", zIndex: 2000, maxHeight: 220, overflowY: "auto" }}>
              {filtered.map((s, i) => (
                <div key={i} onMouseDown={() => select(s)}
                  style={{ padding: "9px 13px", cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans',sans-serif", borderBottom: "1px solid #f3f4f6" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                  {s}
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function FInput({ label, ...props }) {
  const [showPwd, setShowPwd] = useState(false);
  const isPassword = props.type === "password";
  const inputType = isPassword && showPwd ? "text" : props.type;
  return (
    <div style={{ marginBottom: 13 }}>
      {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5, fontFamily: "'DM Sans',sans-serif" }}>{label}</label>}
      <div style={{ position: "relative" }}>
        <input {...props} type={inputType}
          style={{ width: "100%", padding: isPassword ? "9px 40px 9px 13px" : "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none", boxSizing: "border-box", ...(props.style || {}) }}
          onFocus={e => e.target.style.borderColor = "#6366f1"} onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
        {isPassword && (
          <button type="button" onClick={() => setShowPwd(v => !v)}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9ca3af", padding: 2 }}>
            {showPwd ? "🙈" : "👁"}
          </button>
        )}
      </div>
    </div>
  );
}

function FSelect({ label, children, ...props }) {
  return (
    <div style={{ marginBottom: 13 }}>
      {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5, fontFamily: "'DM Sans',sans-serif" }}>{label}</label>}
      <select {...props} style={{ width: "100%", padding: "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff", boxSizing: "border-box" }}>{children}</select>
    </div>
  );
}

// ─── SCROLL NAVIGATION ARROWS ─────────────────────────────────
function ScrollNav() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 200 || window.scrollX > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  const btn = (label, onClick) => (
    <button onClick={onClick} style={{
      width: 38, height: 38, borderRadius: "50%", border: "none",
      background: "#1e1b4b", color: "#fff", fontSize: 18,
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 2px 8px rgba(0,0,0,0.25)", fontFamily: "'DM Sans',sans-serif",
      transition: "background 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.background = "#4f46e5"}
      onMouseLeave={e => e.currentTarget.style.background = "#1e1b4b"}
    >{label}</button>
  );

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Vertical arrows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
        {btn("↑", () => window.scrollBy({ top: -300, behavior: "smooth" }))}
        {btn("↓", () => window.scrollBy({ top: 300, behavior: "smooth" }))}
      </div>
      {/* Horizontal arrows */}
      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
        {btn("←", () => window.scrollBy({ left: -300, behavior: "smooth" }))}
        {btn("→", () => window.scrollBy({ left: 300, behavior: "smooth" }))}
      </div>
      {/* Back to top */}
      {btn("⌂", () => window.scrollTo({ top: 0, left: 0, behavior: "smooth" }))}
    </div>
  );
}

function Btn({ children, variant = "primary", small, ...props }) {
  const base = { fontFamily: "'DM Sans',sans-serif", fontWeight: 600, borderRadius: 9, border: "none", cursor: "pointer", fontSize: small ? 12 : 14, padding: small ? "5px 11px" : "10px 20px" };
  const v = { primary: { background: "#4f46e5", color: "#fff" }, secondary: { background: "#f3f4f6", color: "#374151" }, danger: { background: "#fee2e2", color: "#dc2626" } };
  return <button {...props} style={{ ...base, ...v[variant], ...(props.style || {}) }}>{children}</button>;
}

function Toggle({ checked, onChange }) {
  return (
    <div onClick={() => onChange(!checked)} style={{ width: 38, height: 21, borderRadius: 99, background: checked ? "#4f46e5" : "#d1d5db", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 2.5, left: checked ? 19 : 2.5, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </div>
  );
}

function Spinner() {
  return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 60 }}><div style={{ width: 36, height: 36, border: "3px solid #e5e7eb", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /></div>;
}

// ─── LOGIN ────────────────────────────────────────────────────
function Login({ t }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.toLowerCase().trim(), password });
    if (err) setError(t.auth.error);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4f0", display: "flex", alignItems: "center", justifyContent: "center", direction: t.dir }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 40, width: "100%", maxWidth: 400, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 28, fontWeight: 900, color: "#1e1b4b" }}>{t.appName}</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4, fontFamily: "'DM Sans',sans-serif" }}>{t.tagline}</div>
        </div>
        <FInput label={t.auth.email} type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
        <FInput label={t.auth.password} type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
        {error && <div style={{ color: "#ef4444", fontSize: 13, fontFamily: "'DM Sans',sans-serif", marginBottom: 12 }}>{error}</div>}
        <Btn onClick={handleLogin} style={{ width: "100%" }} disabled={loading}>{loading ? t.auth.loading : t.auth.login}</Btn>
      </div>
    </div>
  );
}

// ─── LOCATION PICKER ──────────────────────────────────────────
function LocationPicker({ t, lang, locRows, locLevels, value, onChange }) {
  const path = value || [];
  const selects = [];
  for (let i = 0; i < locLevels.length; i++) {
    const parentId = i === 0 ? null : path[i - 1] || null;
    const options = locRows.filter(r => r.parent_id === parentId);
    if (i > 0 && !path[i - 1]) break;
    const selectedId = path[i] || "";
    const levelLabel = typeof locLevels[i] === "string"
      ? locLevels[i]
      : (lang === "ar" ? locLevels[i].label_ar : locLevels[i].label_fr);
    selects.push(
      <div key={i} style={{ marginBottom: 10 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5, fontFamily: "'DM Sans',sans-serif" }}>{levelLabel}</label>
        <select value={selectedId} onChange={e => { const np = path.slice(0, i); if (e.target.value) np.push(e.target.value); onChange(np); }}
          style={{ width: "100%", padding: "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff", boxSizing: "border-box" }}>
          <option value="">{t.form?.selectLevel || (lang === "ar" ? "اختر..." : "Choisir...")}</option>
          {options.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>
      </div>
    );
    if (!selectedId) break;
  }
  return <div>{selects}</div>;
}

// ─── ARTICLE FORM ─────────────────────────────────────────────
// ─── TRANSFER FORM ────────────────────────────────────────────
function TransferForm({ t, lang, article, locRows, centres, onTransfer, onClose }) {
  const [qty, setQty] = useState(1);
  const [destCentreId, setDestCentreId] = useState("");
  const [bulletin, setBulletin] = useState("");
  const [note, setNote] = useState("");
  const maxQty = article.qty || 0;
  const fromCentre = centres.find(c => c.id === article.centre_id);
  const fromLabel = fromCentre?.name || getPathLabel(locRows, article.location_path);

  const inpStyle = { width: "100%", padding: "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none" };
  const row = (label, children) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );

  // Restrict: transfers only allowed Siège <-> other centre, never centre <-> centre
  const isSiege = fromCentre?.is_siege === true;
  const destCentres = isSiege
    ? centres.filter(c => c.id !== article.centre_id) // Siège can send to any other centre
    : centres.filter(c => c.is_siege === true); // others can only send to Siège

  return (
    <div>
      <div style={{ background: "#f3f4f6", borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#374151" }}>
        <strong>{article.name}</strong> — {t.articles.transferAvailable} : <strong style={{ color: "#6366f1" }}>{maxQty} {article.unit}</strong>
        <br /><span style={{ color: "#9ca3af", fontSize: 12 }}>{lang === "ar" ? "من" : "De"} : {fromLabel}</span>
      </div>

      {row(t.articles.transferQty,
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input type="number" value={qty} min={1} max={maxQty}
            onChange={e => setQty(Math.min(maxQty, Math.max(1, Number(e.target.value))))}
            style={{ ...inpStyle, width: 90 }} />
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#9ca3af" }}>/ {maxQty} {article.unit}</span>
        </div>
      )}

      {row(lang === "ar" ? "المركز المستقبِل" : "Centre destination",
        destCentres.length === 0
          ? <div style={{ color: "#ef4444", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>{lang === "ar" ? "لا توجد مراكز أخرى" : "Aucun autre centre disponible"}</div>
          : <select value={destCentreId} onChange={e => setDestCentreId(e.target.value)} style={{ ...inpStyle, background: "#fff" }}>
              <option value="">{lang === "ar" ? "اختر المركز" : "Choisir le centre"}</option>
              {destCentres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
      )}

      {row(lang === "ar" ? "رقم وصل التسليم (اختياري)" : "N° bon de livraison (optionnel)",
        <input value={bulletin} onChange={e => setBulletin(e.target.value)}
          placeholder={lang === "ar" ? "مثال: BL-2026-001" : "ex: BL-2026-001"}
          style={inpStyle} />
      )}

      {row(lang === "ar" ? "ملاحظات (اختياري)" : "Notes (optionnel)",
        <input value={note} onChange={e => setNote(e.target.value)}
          placeholder={lang === "ar" ? "ملاحظات إضافية..." : "Remarques..."}
          style={inpStyle} />
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
        <Btn variant="secondary" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Annuler"}</Btn>
        <Btn onClick={() => {
          if (qty < 1 || qty > maxQty) return;
          if (!destCentreId) { alert(lang === "ar" ? "اختر مركزاً" : "Choisissez un centre"); return; }
          onTransfer(qty, destCentreId, bulletin, null, note);
        }}>{t.articles.transferConfirm}</Btn>
      </div>
    </div>
  );
}

// ─── CUSTOM FIELDS SECTION (for use inside forms) ─────────────
// Renders all active custom fields for a module, pre-filled if editing.
// Calls onChange(key, value) for each change so parent can collect values.
function CustomFieldsSection({ lang, module, userId, entityId, onChange, valuesRef, defaultValues }) {
  const [defs, setDefs] = useState([]);
  const [values, setValues] = useState({});
  const [fieldSuggestions, setFieldSuggestions] = useState({});

  useEffect(() => {
    if (!userId) return;
    supabase.from("custom_field_definitions")
      .select("*").eq("module", module).eq("active", true)
      .order("sort_order")
      .then(({ data }) => {
        setDefs(data || []);
        // Load all existing values for suggestions
        if (data?.length) {
          const defIds = data.map(d => d.id);
          supabase.from("custom_field_values").select("definition_id, value")
            .in("definition_id", defIds)
            .then(({ data: allVals }) => {
              const suggMap = {};
              (allVals || []).forEach(v => {
                if (!suggMap[v.definition_id]) suggMap[v.definition_id] = new Set();
                if (v.value) suggMap[v.definition_id].add(v.value);
              });
              setFieldSuggestions(Object.fromEntries(
                Object.entries(suggMap).map(([k, s]) => [k, [...s]])
              ));
            });
        }
        if (entityId && data?.length) {
          supabase.from("custom_field_values")
            .select("*").eq("entity_id", entityId)
            .then(({ data: vals }) => {
              const map = {};
              (vals || []).forEach(v => { map[v.definition_id] = v.value; });
              setValues(map);
              if (valuesRef) valuesRef.current = map;
            });
        } else if (!entityId && defaultValues && data?.length) {
          const map = {};
          (data || []).forEach(def => {
            if (defaultValues[def.field_key]) map[def.id] = defaultValues[def.field_key];
          });
          setValues(map);
          if (valuesRef) valuesRef.current = map;
        }
      });
  }, [userId, module, entityId]);  useEffect(() => {
    if (!userId) return;
    supabase.from("custom_field_definitions")
      .select("*").eq("module", module).eq("active", true)
      .order("sort_order")
      .then(({ data }) => {
        setDefs(data || []);
        if (entityId && data?.length) {
          supabase.from("custom_field_values")
            .select("*").eq("entity_id", entityId)
            .then(({ data: vals }) => {
              const map = {};
              (vals || []).forEach(v => { map[v.definition_id] = v.value; });
              setValues(map);
              if (valuesRef) valuesRef.current = map;
            });
        } else if (!entityId && defaultValues && data?.length) {
          // Pre-fill from defaultValues (keyed by field_key)
          const map = {};
          (data || []).forEach(def => {
            if (defaultValues[def.field_key]) {
              map[def.id] = defaultValues[def.field_key];
            }
          });
          setValues(map);
          if (valuesRef) valuesRef.current = map;
        }
      });
  }, [userId, module, entityId]);

  const handleChange = (defId, value) => {
    const next = { ...values, [defId]: value };
    setValues(next);
    if (valuesRef) valuesRef.current = next;
    if (onChange) onChange(defId, value);
  };

  if (defs.length === 0) return null;

  const inp = { padding: "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 16, marginTop: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'DM Sans',sans-serif", marginBottom: 12 }}>
        {lang === "ar" ? "حقول إضافية" : "Champs supplémentaires"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {defs.map(def => {
          const label = lang === "ar" ? def.label_ar : def.label_fr;
          const val = values[def.id] || "";
          return (
            <div key={def.id} style={{ marginBottom: 4 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5, fontFamily: "'DM Sans',sans-serif" }}>
                {label}{def.required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
              </label>
              {def.field_type === "list" && (
                <select value={val} onChange={e => handleChange(def.id, e.target.value)} style={{ ...inp, background: "#fff" }}>
                  <option value="">—</option>
                  {(def.options || []).map(opt => (
                    <option key={opt.value} value={opt.value}>{lang === "ar" ? opt.label_ar : opt.label_fr}</option>
                  ))}
                </select>
              )}
              {def.field_type === "text" && (
                <AutocompleteInput label="" value={val} onChange={v => handleChange(def.id, v)} suggestions={fieldSuggestions[def.id] || []} />
              )}
              {def.field_type === "number" && (
                <input type="number" value={val} onChange={e => handleChange(def.id, e.target.value)} style={inp} />
              )}
              {def.field_type === "date" && (
                <input type="date" value={val} onChange={e => handleChange(def.id, e.target.value)} style={inp} />
              )}
              {def.field_type === "boolean" && (
                <select value={val} onChange={e => handleChange(def.id, e.target.value)} style={{ ...inp, background: "#fff" }}>
                  <option value="">—</option>
                  <option value="true">{lang === "ar" ? "نعم" : "Oui"}</option>
                  <option value="false">{lang === "ar" ? "لا" : "Non"}</option>
                </select>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Save custom field values after an entity is created/updated
async function saveCustomFieldValues(userId, entityId, valuesMap, centreId) {
  if (!valuesMap || Object.keys(valuesMap).length === 0) return;
  const rows = Object.entries(valuesMap)
    .filter(([, v]) => v !== "" && v !== null && v !== undefined)
    .map(([definitionId, value]) => ({
      user_id: userId, definition_id: definitionId, entity_id: entityId,
      value: String(value), centre_id: centreId || null,
      updated_at: new Date().toISOString(),
    }));
  if (rows.length === 0) return;
  await supabase.from("custom_field_values").upsert(rows, { onConflict: "definition_id,entity_id" });
}

// Load custom field values for display in a table row
async function loadCustomFieldValues(userId, entityIds) {
  if (!entityIds?.length) return {};
  const { data } = await supabase.from("custom_field_values")
    .select("*").in("entity_id", entityIds);
  const map = {};
  (data || []).forEach(v => {
    if (!map[v.entity_id]) map[v.entity_id] = {};
    map[v.entity_id][v.definition_id] = v.value;
  });
  return map;
}

function ArticleForm({ t, lang, article, locRows, locLevels, categories, onSave, onClose, fieldConfig, userId, hasActiveCentre = true, allArticles = [] }) {
  const isAr = lang === "ar";
  const [form, setForm] = useState({
    name: "", category: "", qty: 0, unit: "", threshold: 0,
    location_path: [], supplier: "", reference: "", price: "",
    buyer: "", date_in: "", date_out: "",
    // التزويد fields
    source_type: "achat",
    fournisseur_etablissement: "",
    donateur: "",
    num_facture: "",
    date_facture: "",
    num_bon_don: "",
    num_enregistrement: "",
    date_enregistrement: "",
    ...(article || {}),
    // Pre-fill fields from last used if new article
    name: article?.name || "",
    unit: article?.unit || (!article ? (localStorage.getItem("lastUnit") || "") : ""),
    supplier: article?.supplier || (!article ? (localStorage.getItem("lastSupplier") || "") : ""),
    fournisseur_etablissement: article?.fournisseur_etablissement || (!article ? (localStorage.getItem("lastEtablissement") || "") : ""),
  });
  const [catInput, setCatInput] = useState(article?.category || "");
  const [showSugg, setShowSugg] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const filtered = categories.filter(c => c.toLowerCase().includes(catInput.toLowerCase()));

  // Build suggestions from all articles
  const suggestions = {
    name: [...new Set(allArticles.map(a => a.name).filter(Boolean))],
    unit: [...new Set(allArticles.map(a => a.unit).filter(Boolean))],
    supplier: [...new Set(allArticles.map(a => a.supplier).filter(Boolean))],
    fournisseur_etablissement: [...new Set(allArticles.map(a => a.fournisseur_etablissement).filter(Boolean))],
    donateur: [...new Set(allArticles.map(a => a.donateur).filter(Boolean))],
    buyer: [...new Set(allArticles.map(a => a.buyer).filter(Boolean))],
  };
  const fields = getFieldsForCategory(form.category, fieldConfig);
  const customValuesRef = useRef({});

  const sectionTitle = (title) => (
    <div style={{ fontFamily: "'Fraunces',serif", fontSize: 15, fontWeight: 700, color: "#1e1b4b", margin: "18px 0 10px", borderBottom: "2px solid #e5e7eb", paddingBottom: 6 }}>{title}</div>
  );

  return (
    <div>
      {sectionTitle(isAr ? "معلومات المادة" : "Informations de l'article")}
      <AutocompleteInput label={t.form.name} value={form.name} onChange={v => set("name", v)} suggestions={suggestions.name} placeholder={t.form.namePh} />
      <div style={{ marginBottom: 13, position: "relative" }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5, fontFamily: "'DM Sans',sans-serif" }}>{t.form.category}</label>
        <input value={catInput} placeholder={t.form.categoryPh} onChange={e => { setCatInput(e.target.value); set("category", e.target.value); setShowSugg(true); }} onFocus={() => setShowSugg(true)} onClick={() => setShowSugg(true)} onBlur={() => setTimeout(() => setShowSugg(false), 200)}
          onKeyDown={e => { if (e.key === "Escape") { setShowSugg(false); e.preventDefault(); } if ((e.key === "Enter" || e.key === "Tab") && filtered[0]) { setCatInput(filtered[0]); set("category", filtered[0]); setShowSugg(false); } }}
          style={{ width: "100%", padding: "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none", boxSizing: "border-box" }} />
        {showSugg && filtered.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 9, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 1001, maxHeight: 130, overflowY: "auto" }}>
            {filtered.map(c => <div key={c} onMouseDown={() => { setCatInput(c); set("category", c); setShowSugg(false); }} style={{ padding: "9px 13px", cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>{c}</div>)}
          </div>
        )}
      </div>
      {hasActiveCentre
        ? <LocationPicker t={t} lang={lang} locRows={locRows} locLevels={locLevels} value={form.location_path} onChange={v => set("location_path", v)} />
        : <div data-centre-warning="true" style={{ marginBottom: 13, padding: "10px 14px", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 9, fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#92400e" }}>
            {lang === "ar" ? "اختر مركزاً من الشريط الأصفر لتحديد الأماكن" : "Sélectionnez un centre dans le bandeau jaune pour choisir un emplacement"}
          </div>
      }
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {fields.qty && <FInput label={t.form.quantity} type="number" min="0" value={form.qty} onChange={e => set("qty", Number(e.target.value))} />}
        <AutocompleteInput label={t.form.unit} value={form.unit} onChange={v => set("unit", v)} suggestions={suggestions.unit} placeholder={t.form.unitPh} />
        {fields.threshold && <FInput label={t.form.threshold} type="number" min="0" value={form.threshold} onChange={e => set("threshold", Number(e.target.value))} />}
        {fields.price && <FInput label={t.form.price} type="number" min="0" step="0.01" value={form.price} onChange={e => set("price", e.target.value)} />}
      </div>

      {sectionTitle(isAr ? "مصدر التزويد" : "Source d'approvisionnement")}

      {/* Source type selector */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8, fontFamily: "'DM Sans',sans-serif" }}>
          {isAr ? "نوع المصدر" : "Type de source"}
        </label>
        <div style={{ display: "flex", gap: 20 }}>
          {[["achat", isAr ? "شراء" : "Achat"], ["don", isAr ? "هبة" : "Don"]].map(([val, label]) => (
            <label key={val} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: form.source_type === val ? 700 : 400, color: form.source_type === val ? "#1e1b4b" : "#6b7280" }}>
              <input type="radio" value={val} checked={form.source_type === val} onChange={() => set("source_type", val)} style={{ cursor: "pointer", accentColor: "#4f46e5" }} />
              {label}
            </label>
          ))}
        </div>
      </div>

      {form.source_type === "achat" ? (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <AutocompleteInput label={isAr ? "اسم المزود" : "Nom du fournisseur"} value={form.supplier} onChange={v => set("supplier", v)} suggestions={suggestions.supplier} placeholder={isAr ? "اسم المزود" : "Fournisseur"} />
            <AutocompleteInput label={isAr ? "المؤسسة" : "Établissement"} value={form.fournisseur_etablissement} onChange={v => set("fournisseur_etablissement", v)} suggestions={suggestions.fournisseur_etablissement} />
            <FInput label={isAr ? "رقم الفاتورة" : "N° facture"} value={form.num_facture} onChange={e => set("num_facture", e.target.value)} />
            <FInput label={isAr ? "تاريخ الفاتورة" : "Date facture"} type="date" value={form.date_facture} onChange={e => set("date_facture", e.target.value)} />
          </div>
          {fields.buyer && <AutocompleteInput label={t.form.buyer} value={form.buyer} onChange={v => set("buyer", v)} suggestions={suggestions.buyer} placeholder={t.form.buyerPh} />}
        </div>
      ) : (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <AutocompleteInput label={isAr ? "اسم الواهب" : "Nom du donateur"} value={form.donateur} onChange={v => set("donateur", v)} suggestions={suggestions.donateur} />
            <FInput label={isAr ? "رقم بطاقة التعريف" : "Num CIN"} value={form.num_bon_don} onChange={e => set("num_bon_don", e.target.value)} />
            <FInput label={isAr ? "رقم التضمين" : "N° enregistrement"} value={form.num_enregistrement} onChange={e => set("num_enregistrement", e.target.value)} />
            <FInput label={isAr ? "تاريخ التضمين" : "Date enregistrement"} type="date" value={form.date_enregistrement} onChange={e => set("date_enregistrement", e.target.value)} />
          </div>
        </div>
      )}

      {sectionTitle(isAr ? "معلومات إضافية" : "Informations complémentaires")}
      {fields.reference && <FInput label={t.form.reference} value={form.reference} placeholder={t.form.referencePh} onChange={e => set("reference", e.target.value)} />}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      </div>
      {userId && <CustomFieldsSection lang={lang} module="article" userId={userId} entityId={article?.id} valuesRef={customValuesRef}
        defaultValues={!article ? { receptionnaire: localStorage.getItem("lastReceptionnaire") || "" } : undefined} />}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
        <Btn variant="secondary" onClick={onClose}>{t.form.cancel}</Btn>
        <Btn onClick={() => {
          if (!hasActiveCentre) {
            document.querySelector('[data-centre-warning]')?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
          }
          if (form.name && form.category) {
            if (form.unit) localStorage.setItem("lastUnit", form.unit);
            if (form.supplier) localStorage.setItem("lastSupplier", form.supplier);
            if (form.fournisseur_etablissement) localStorage.setItem("lastEtablissement", form.fournisseur_etablissement);
            const customVals = customValuesRef.current;
            if (customVals && Object.keys(customVals).length > 0) {
              localStorage.setItem("lastCustomValues", JSON.stringify(customVals));
            }
            onSave(form, customValuesRef.current);
          }
        }}>{t.form.save}</Btn>
      </div>
    </div>
  );
}

function MovementForm({ t, articles, onSave, onClose }) {
  const [form, setForm] = useState({ article_id: "", type: "in", qty: 1, note: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div>
      <FSelect label={t.history.article} value={form.article_id} onChange={e => set("article_id", e.target.value)}>
        <option value="">—</option>
        {articles.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </FSelect>
      <FSelect label={t.history.type} value={form.type} onChange={e => set("type", e.target.value)}>
        <option value="in">{t.history.in}</option>
        <option value="out">{t.history.out}</option>
        <option value="adjust">{t.history.adjust}</option>
      </FSelect>
      <FInput label={t.history.quantity} type="number" min="1" value={form.qty} onChange={e => set("qty", Number(e.target.value))} />
      <FInput label={t.history.note} value={form.note} placeholder={t.history.notePh} onChange={e => set("note", e.target.value)} />
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
        <Btn variant="secondary" onClick={onClose}>{t.history.cancel}</Btn>
        <Btn onClick={() => { if (form.article_id && form.qty > 0) onSave(form); }}>{t.history.save}</Btn>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────
function Dashboard({ t, lang, articles, locRows, fieldConfig, onNavigate, centreFilter }) {
  const filteredArticles = useMemo(() => articles.filter(a =>
    !centreFilter || a.centre_id === centreFilter
  ), [articles, centreFilter]);

  const total = filteredArticles.length;
  const cats = [...new Set(filteredArticles.map(a => a.category))].length;
  const withQty = filteredArticles.filter(a => getFieldsForCategory(a.category, fieldConfig).qty);
  const low = withQty.filter(a => getStatus(a.qty, a.threshold, true) === "low").length;
  const out = withQty.filter(a => getStatus(a.qty, a.threshold, true) === "out").length;
  const alerts = withQty.filter(a => getStatus(a.qty, a.threshold, true) !== "ok");
  const catGroups = filteredArticles.reduce((acc, a) => { acc[a.category] = (acc[a.category] || 0) + 1; return acc; }, {});
  const maxCat = Math.max(...Object.values(catGroups), 1);
  const goTo = (filter) => onNavigate && onNavigate(filter);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 32 }}>
        <StatCard label={t.dashboard.total} value={total} color="#6366f1" icon="📦" onClick={() => goTo({})} />
        <StatCard label={t.dashboard.categories} value={cats} color="#0ea5e9" icon="🗂️" />
        <StatCard label={t.dashboard.lowStock} value={low} color="#f59e0b" icon="⚠️" onClick={() => goTo({ status: "low" })} />
        <StatCard label={t.dashboard.outOfStock} value={out} color="#ef4444" icon="🚨" onClick={() => goTo({ status: "out" })} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 16 }}>{t.dashboard.recentAlerts}</div>
          {alerts.length === 0 ? <div style={{ color: "#6b7280", fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>{t.dashboard.noAlerts}</div>
            : alerts.map(a => (
              <div key={a.id} onClick={() => goTo({ status: getStatus(a.qty, a.threshold, true) })} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}>
                <div>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, color: "#111827" }}>{a.name}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: "'DM Sans',sans-serif" }}>{getPathLabel(locRows, a.location_path)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 18, color: STATUS_COLORS[getStatus(a.qty, a.threshold, true)] }}>{a.qty}</span>
                  <StatusBadge status={getStatus(a.qty, a.threshold, true)} t={t} />
                </div>
              </div>
            ))}
        </div>
        <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 16 }}>{t.dashboard.categoryBreakdown}</div>
          {Object.entries(catGroups).map(([cat, count]) => (
            <div key={cat} onClick={() => goTo({ category: cat })} style={{ marginBottom: 12, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#374151", marginBottom: 4 }}>
                <span>{cat}</span><span style={{ fontWeight: 600 }}>{count} {t.dashboard.items}</span>
              </div>
              <div style={{ background: "#f3f4f6", borderRadius: 99, height: 8 }}>
                <div style={{ background: "#6366f1", borderRadius: 99, height: 8, width: `${(count / maxCat) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── COLUMN PICKER ────────────────────────────────────────────
function ColumnPicker({ t, lang, visibleCols, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  const colLabel = (key) => ({ category: "Catégorie", location: "Emplacement", qty: "Quantité", threshold: "Seuil", unit: "Unité", supplier: "Fournisseur", reference: "Référence", price: "Prix", buyer: "Acheteur", dateIn: "Date entrée", dateOut: "Date sortie", status: "Statut" })[key] || key;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <Btn variant="secondary" small onClick={() => setOpen(o => !o)}>⚙ {t.articles.columns}</Btn>
      {open && (
        <div style={{ position: "absolute", top: "100%", right: 0, background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, padding: 16, minWidth: 200, marginTop: 4 }}>
          {ALL_COLUMNS.map(col => (
            <div key={col.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#374151" }}>{colLabel(col.key)}</span>
              {col.alwaysOn ? <span style={{ fontSize: 11, color: "#9ca3af" }}>—</span> : <Toggle checked={!!visibleCols[col.key]} onChange={v => onChange({ ...visibleCols, [col.key]: v })} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ARTICLES ─────────────────────────────────────────────────
function Articles({ t, lang, articles, locRows, locLevels, categories, onAdd, onDelete, onDeleteMany, onTransfer, onImport, fieldConfig, visibleCols, onVisibleColsChange, initialFilter, userId, centres, centreFilter, onCentreFilterChange, centresForTransfer, showCentreFilter, centreId }) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState(initialFilter?.category || "");
  const [filterStatus, setFilterStatus] = useState(initialFilter?.status || "");
  const [locFilter, setLocFilter] = useState({ centre: null, salle: null });
  const [supplierFilter, setSupplierFilter] = useState("");
  const [referenceFilter, setReferenceFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editArticle, setEditArticle] = useState(null);
  const [transferArticle, setTransferArticle] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [cfDefs, setCfDefs] = useState([]);
  const [cfValues, setCfValues] = useState({});
  const fileRef = useRef();

  // Load custom field definitions
  useEffect(() => {
    if (!userId) return;
    supabase.from("custom_field_definitions")
      .select("*").eq("module", "article").eq("active", true)
      .order("sort_order")
      .then(({ data }) => setCfDefs(data || []));
  }, [userId]);

  // Load custom field values for visible articles
  useEffect(() => {
    if (!cfDefs.length || !articles.length) return;
    loadCustomFieldValues(userId, articles.map(a => a.id))
      .then(map => setCfValues(map));
  }, [cfDefs, articles, userId]);

  useEffect(() => {
    if (initialFilter) {
      setFilterCat(initialFilter.category || "");
      setFilterStatus(initialFilter.status || "");
    }
  }, [initialFilter]);

  const effectiveFilter = centreFilter || centreId || null;
  const filtered = useMemo(() => articles.filter(a => {
    const fields = getFieldsForCategory(a.category, fieldConfig);
    const status = getStatus(a.qty, a.threshold, fields.qty);
    return (!search || a.name.toLowerCase().includes(search.toLowerCase()) || a.category.toLowerCase().includes(search.toLowerCase()))
      && (!filterCat || a.category === filterCat) && (!filterStatus || status === filterStatus)
      && matchesLocationFilter(a.location_path, locFilter)
      && (!supplierFilter || (a.supplier || "").toLowerCase().includes(supplierFilter.toLowerCase()))
      && (!referenceFilter || (a.reference || "").toLowerCase().includes(referenceFilter.toLowerCase()))
      && (!effectiveFilter || a.centre_id === effectiveFilter);
  }), [articles, search, filterCat, filterStatus, fieldConfig, locFilter, supplierFilter, referenceFilter, effectiveFilter]);

  const allSelected = filtered.length > 0 && filtered.every(a => selected.has(a.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(a => a.id)));
  };
  const toggleOne = (id) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const handleDeleteSelected = () => {
    const msg = lang === "ar" ? `حذف ${selected.size} عنصر؟` : `Supprimer ${selected.size} article(s) sélectionné(s) ?`;
    if (window.confirm(msg)) {
      onDeleteMany([...selected]);
      setSelected(new Set());
    }
  };

  const th = (label) => <th style={{ padding: "11px 14px", textAlign: t.dir === "rtl" ? "right" : "left", fontSize: 11, fontWeight: 700, color: "#6b7280", fontFamily: "'DM Sans',sans-serif", borderBottom: "1px solid #f3f4f6", textTransform: "uppercase", letterSpacing: "0.05em", }}>{label}</th>;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.articles.search}
          style={{ flex: 1, minWidth: 160, padding: "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ padding: "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 13, fontFamily: "'DM Sans',sans-serif", background: "#fff" }}>
          <option value="">{t.articles.filterCat}</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 13, fontFamily: "'DM Sans',sans-serif", background: "#fff" }}>
          <option value="">{t.articles.filterStatus}</option>
          <option value="ok">{t.articles.statusOk}</option>
          <option value="low">{t.articles.statusLow}</option>
          <option value="out">{t.articles.statusOut}</option>
        </select>
        <Btn onClick={() => { setEditArticle(null); setShowForm(true); }}>{t.articles.add}</Btn>
        <Btn variant="secondary" onClick={() => exportCSV(articles, locRows, locLevels, fieldConfig)} small>{t.io.export}</Btn>
        <Btn variant="secondary" onClick={() => fileRef.current.click()} small>{t.io.import}</Btn>
        <ColumnPicker t={t} lang={lang} visibleCols={visibleCols} onChange={onVisibleColsChange} />
        {selected.size > 0 && (
          <Btn variant="danger" small onClick={handleDeleteSelected}>
            {lang === "ar" ? `حذف المحدد (${selected.size})` : `Supprimer la sélection (${selected.size})`}
          </Btn>
        )}
        <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => onImport(ev.target.result); r.readAsText(f); e.target.value = ""; }} />
      </div>
      {showForm && (
        <Modal title={editArticle ? t.form.editTitle : t.form.addTitle} onClose={() => setShowForm(false)} dir={t.dir}
          confirmClose={lang === "ar" ? "هل أنت متأكد؟ ستفقد البيانات المدخلة." : "Fermer le formulaire ? Les données saisies seront perdues."}>
          <ArticleForm t={t} lang={lang} article={editArticle} locRows={locRows.filter(r => !effectiveFilter || r.centre_id === effectiveFilter)} locLevels={locLevels} categories={categories} fieldConfig={fieldConfig} userId={userId} hasActiveCentre={!!effectiveFilter} allArticles={articles}
            onSave={(form, customValues) => { onAdd(form, editArticle, customValues); setShowForm(false); }} onClose={() => setShowForm(false)} />
        </Modal>
      )}
      {transferArticle && (
        <Modal title={t.articles.transferTitle} onClose={() => setTransferArticle(null)} dir={t.dir}>
          <TransferForm t={t} lang={lang} article={transferArticle} locRows={locRows} centres={centresForTransfer?.length ? centresForTransfer : centres}
            onTransfer={(qty, destCentreId, bulletin, saison, note) => { onTransfer(transferArticle, qty, destCentreId, bulletin, null, note); setTransferArticle(null); }}
            onClose={() => setTransferArticle(null)} />
        </Modal>
      )}
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflowX: "auto", width: "100%" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th style={{ padding: "10px 12px", width: 36 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: "pointer" }} />
              </th>
              {th(t.articles.name)}
              {visibleCols.category && th(t.articles.category)}
              {(showCentreFilter || centresForTransfer?.length > 1) && th(lang === "ar" ? "المركز" : "Centre")}
              {visibleCols.location && th(t.articles.location)}
              {visibleCols.qty && th(t.articles.quantity)}
              {visibleCols.unit && th(t.articles.unit)}
              {visibleCols.threshold && th(t.articles.threshold)}
              {visibleCols.supplier && th(t.articles.supplier)}
              {visibleCols.reference && th(t.articles.reference)}
              {visibleCols.price && th(t.articles.price)}
              {visibleCols.buyer && th(t.articles.buyer)}
              {visibleCols.dateIn && th(t.articles.dateIn)}
              {visibleCols.dateOut && th(t.articles.dateOut)}
              {visibleCols.status && th(t.articles.status)}
              {cfDefs.map(d => th(lang === "ar" ? d.label_ar : d.label_fr))}
              {th(t.articles.actions)}
            </tr>
            <tr style={{ background: "#fff" }}>
              <th />
              <th />
              {visibleCols.category && <th />}
              {centresForTransfer?.length > 1 && (
                showCentreFilter ? (
                  <th style={{ padding: "6px 8px" }}>
                    <select value={centreFilter || ""} onChange={e => onCentreFilterChange && onCentreFilterChange(e.target.value || null)}
                      style={{ width: "100%", padding: "5px 6px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 11, fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff" }}>
                      <option value="">{lang === "ar" ? "الكل" : "Tous"}</option>
                      {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </th>
                ) : <th />
              )}
              {visibleCols.location && (
                <th style={{ padding: "6px 8px" }}>
                  <LocationFilterInline locRows={locRows} value={locFilter} onChange={setLocFilter} lang={lang} />
                </th>
              )}
              {visibleCols.qty && <th />}
              {visibleCols.unit && <th />}
              {visibleCols.threshold && <th />}
              {visibleCols.supplier && (
                <th style={{ padding: "6px 8px" }}>
                  <input value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)} placeholder="…"
                    style={{ width: "100%", padding: "5px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
                </th>
              )}
              {visibleCols.reference && (
                <th style={{ padding: "6px 8px" }}>
                  <input value={referenceFilter} onChange={e => setReferenceFilter(e.target.value)} placeholder="…"
                    style={{ width: "100%", padding: "5px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
                </th>
              )}
              {visibleCols.price && <th />}
              {visibleCols.buyer && <th />}
              {visibleCols.dateIn && <th />}
              {visibleCols.dateOut && <th />}
              {visibleCols.status && <th />}
              {cfDefs.map(d => <th key={d.id} />)}
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={20} style={{ padding: 32, textAlign: "center", color: "#9ca3af", fontFamily: "'DM Sans',sans-serif" }}>{t.articles.noResults}</td></tr>
              : filtered.map((a, i) => {
                const fields = getFieldsForCategory(a.category, fieldConfig);
                const status = getStatus(a.qty, a.threshold, fields.qty);
                const td = (content, extra = {}) => <td style={{ padding: "11px 14px", fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#374151", ...extra }}>{content}</td>;
                return (
                  <tr key={a.id} style={{ background: selected.has(a.id) ? "#eef2ff" : i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "10px 12px" }}>
                      <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleOne(a.id)} style={{ cursor: "pointer" }} />
                    </td>
                    <td style={{ padding: "10px 12px", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13, color: "#111827", }}>{a.name}</td>
                    {visibleCols.category && <td style={{ padding: "11px 14px" }}><span style={{ background: "#ede9fe", color: "#7c3aed", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>{a.category}</span></td>}
                    {centresForTransfer?.length > 1 && <td style={{ padding: "11px 14px" }}><span style={{ background: "#f0fdf4", color: "#166534", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>{(centresForTransfer || centres).find(c => c.id === a.centre_id)?.name || "—"}</span></td>}
                    {visibleCols.location && td(getPathLabel(locRows, a.location_path), { color: "#6b7280", whiteSpace: "nowrap" })}
                    {visibleCols.qty && <td style={{ padding: "11px 14px", fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 17, color: fields.qty ? STATUS_COLORS[status] : "#9ca3af" }}>{fields.qty ? a.qty : "—"}</td>}
                    {visibleCols.unit && td(a.unit || "—")}
                    {visibleCols.threshold && td(fields.threshold ? `${a.threshold} ${a.unit}` : "—", { color: "#9ca3af" })}
                    {visibleCols.supplier && td(fields.supplier ? (a.supplier || "—") : "—")}
                    {visibleCols.reference && td(fields.reference ? (a.reference || "—") : "—")}
                    {visibleCols.price && td(fields.price && a.price ? `${a.price} DT` : "—")}
                    {visibleCols.buyer && td(fields.buyer ? (a.buyer || "—") : "—")}
                    {visibleCols.dateIn && td(fields.dateIn ? (a.date_in || "—") : "—", { whiteSpace: "nowrap" })}
                    {visibleCols.dateOut && td(fields.dateOut ? (a.date_out || "—") : "—", { whiteSpace: "nowrap" })}
                    {visibleCols.status && <td style={{ padding: "11px 14px" }}>{fields.qty ? <StatusBadge status={status} t={t} /> : <span style={{ color: "#9ca3af", fontSize: 12 }}>—</span>}</td>}
                    {cfDefs.map(def => {
                      const raw = cfValues[a.id]?.[def.id] || "";
                      let display = raw || "—";
                      if (def.field_type === "list" && raw) {
                        const opt = (def.options || []).find(o => o.value === raw);
                        display = opt ? (lang === "ar" ? opt.label_ar : opt.label_fr) : raw;
                      }
                      if (def.field_type === "boolean") display = raw === "true" ? (lang === "ar" ? "نعم" : "Oui") : raw === "false" ? (lang === "ar" ? "لا" : "Non") : "—";
                      return td(display, { color: raw ? "#374151" : "#d1d5db" });
                    })}
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn variant="secondary" small onClick={() => { setEditArticle(a); setShowForm(true); }}>{t.articles.edit}</Btn>
                        <Btn variant="secondary" small onClick={() => setTransferArticle(a)} style={{ background: "#e0f2fe", color: "#0369a1" }}>{t.articles.transfer}</Btn>
                        <Btn variant="danger" small onClick={() => { if (window.confirm(t.articles.confirmDelete)) onDelete(a.id); }}>{t.articles.delete}</Btn>
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

// ─── LOCATIONS ────────────────────────────────────────────────
function LocationNode({ node, level, locLevels, articles, onAdd, onRename, onDelete, t, lang, readOnly }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [expanded, setExpanded] = useState(true);
  const artCount = articles.filter(a => (a.location_path || []).includes(node.id)).length;
  const canAddChild = level < locLevels.length - 1;
  return (
    <div style={{ marginLeft: level > 0 ? 20 : 0, marginBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 10, padding: "10px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        {(node.children || []).length > 0
          ? <button onClick={() => setExpanded(e => !e)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#6b7280", padding: 0, width: 16 }}>{expanded ? "▼" : "▶"}</button>
          : <div style={{ width: 16 }} />}
        <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", fontFamily: "'DM Sans',sans-serif", minWidth: 55 }}>{typeof locLevels[level] === "string" ? locLevels[level] : (lang === "ar" ? locLevels[level]?.label_ar : locLevels[level]?.label_fr) || ""}</span>
        {editing && !readOnly
          ? <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { onRename(node.id, editName); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
            style={{ flex: 1, padding: "4px 8px", border: "1.5px solid #6366f1", borderRadius: 6, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
          : <span style={{ flex: 1, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, color: "#111827" }}>{node.name}</span>
        }
        <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: "'DM Sans',sans-serif" }}>{artCount} {t.locations.itemCount}</span>
        {!readOnly && (
          <div style={{ display: "flex", gap: 4 }}>
            {canAddChild && <Btn small variant="secondary" onClick={() => setAdding(a => !a)}>+</Btn>}
            <Btn small variant="secondary" onClick={() => { setEditing(true); setEditName(node.name); }}>{t.locations.edit}</Btn>
            <Btn small variant="danger" onClick={() => { if (window.confirm(t.locations.confirmDeleteCascade)) onDelete(node.id); }}>{t.locations.delete}</Btn>
          </div>
        )}
      </div>
      {adding && !readOnly && (
        <div style={{ display: "flex", gap: 8, marginLeft: 20, marginTop: 6 }}>
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder={t.locations.namePh}
            onKeyDown={e => { if (e.key === "Escape") { setAdding(false); setNewName(""); } }}
            style={{ flex: 1, padding: "7px 11px", border: "1.5px solid #6366f1", borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
          <Btn small onClick={() => { if (newName.trim()) { onAdd(node.id, newName.trim()); setNewName(""); setAdding(false); } }}>
            {lang === "ar" ? "حفظ" : "Enregistrer"}
          </Btn>
          <Btn small variant="secondary" onClick={() => { setAdding(false); setNewName(""); }}>
            {lang === "ar" ? "إلغاء" : "Annuler"}
          </Btn>
        </div>
      )}
      {expanded && (node.children || []).map(child => (
        <LocationNode key={child.id} node={child} level={level + 1} locLevels={locLevels} articles={articles} onAdd={onAdd} onRename={onRename} onDelete={onDelete} t={t} lang={lang} readOnly={readOnly} />
      ))}
    </div>
  );
}

function Locations({ t, lang, locRows, locLevels, articles, onAdd, onRename, onDelete, readOnly }) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const tree = useMemo(() => buildTree(locRows), [locRows]);
  const level0Label = typeof locLevels[0] === "string" ? locLevels[0] : (lang === "ar" ? locLevels[0]?.label_ar : locLevels[0]?.label_fr) || "Niveau 1";
  return (
    <div style={{ maxWidth: 700 }}>
      {!readOnly && (
        <div style={{ marginBottom: 24 }}>
          {!adding
            ? <Btn onClick={() => setAdding(true)}>+ {level0Label}</Btn>
            : (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder={`${level0Label} — ${t.locations.namePh}`}
                  onKeyDown={e => { if (e.key === "Escape") { setAdding(false); setNewName(""); } }}
                  style={{ flex: 1, padding: "9px 13px", border: "1.5px solid #6366f1", borderRadius: 9, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
                <Btn onClick={() => { if (newName.trim()) { onAdd(null, newName.trim()); setNewName(""); setAdding(false); } }}>
                  {lang === "ar" ? "حفظ" : "Enregistrer"}
                </Btn>
                <Btn variant="secondary" onClick={() => { setAdding(false); setNewName(""); }}>
                  {lang === "ar" ? "إلغاء" : "Annuler"}
                </Btn>
              </div>
            )}
        </div>
      )}
      {tree.length === 0
        ? <div style={{ color: "#9ca3af", fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>{t.locations.noItems}</div>
        : tree.map(node => <LocationNode key={node.id} node={node} level={0} locLevels={locLevels} articles={articles} onAdd={onAdd} onRename={onRename} onDelete={onDelete} t={t} lang={lang} readOnly={readOnly} />)
      }
    </div>
  );
}

function History({ t, lang, history, articles, onAdd, centreFilter, centreId }) {
  const effectiveFilter = centreFilter || centreId || null;
  const filteredHistory = effectiveFilter
    ? history.filter(h => h.centre_id === effectiveFilter)
    : history;
  const [showForm, setShowForm] = useState(false);
  const artMap = Object.fromEntries(articles.map(a => [a.id, a.name]));
  const typeColors = { in: "#22c55e", out: "#ef4444", adjust: "#f59e0b", edit: "#6366f1" };
  const typeLabel = (type) => ({ in: t.history.in, out: t.history.out, adjust: t.history.adjust, edit: lang === "ar" ? "تعديل" : "Modification" })[type];
  return (
    <div>
      <div style={{ marginBottom: 20 }}><Btn onClick={() => setShowForm(true)}>{t.history.addMovement}</Btn></div>
      {showForm && (
        <Modal title={t.history.addMovement} onClose={() => setShowForm(false)} dir={t.dir}>
          <MovementForm t={t} articles={articles} onSave={(form) => { onAdd(form); setShowForm(false); }} onClose={() => setShowForm(false)} />
        </Modal>
      )}
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
        {filteredHistory.length === 0 ? <div style={{ padding: 32, textAlign: "center", color: "#9ca3af", fontFamily: "'DM Sans',sans-serif" }}>{t.history.noHistory}</div>
          : [...filteredHistory].reverse().map(h => {
            const isEdit = h.type === "edit";
            return (
              <div key={h.id} style={{ display: "flex", alignItems: isEdit ? "flex-start" : "center", padding: "13px 20px", borderBottom: "1px solid #f3f4f6", gap: 16 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: typeColors[h.type], flexShrink: 0, marginTop: isEdit ? 5 : 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, color: "#111827" }}>{artMap[h.article_id] || "—"}</div>
                  {h.note && <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: "'DM Sans',sans-serif" }}>{h.note}</div>}
                  {h.saison && <div style={{ fontSize: 11, color: "#6366f1", fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>📅 {h.saison}</div>}
                  {isEdit && h.changes && (
                    <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                      {Object.values(h.changes).map((c, idx) => (
                        <div key={idx} style={{ fontSize: 12, color: "#6b7280", fontFamily: "'DM Sans',sans-serif" }}>
                          <strong>{c.label}</strong> : {String(c.from) || "—"} → {String(c.to) || "—"}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {isEdit ? (
                  <span style={{ background: typeColors.edit + "20", color: typeColors.edit, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", flexShrink: 0 }}>✏️ {typeLabel("edit")}</span>
                ) : (
                  <>
                    <span style={{ background: typeColors[h.type] + "20", color: typeColors[h.type], borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>{typeLabel(h.type)}</span>
                    <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 17, color: typeColors[h.type] }}>{h.type === "out" ? "-" : "+"}{h.qty}</span>
                  </>
                )}
                <span style={{ fontSize: 12, color: "#9ca3af", fontFamily: "'DM Sans',sans-serif", textAlign: "right", flexShrink: 0 }}>{new Date(h.created_at).toLocaleDateString()}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────
// ─── CUSTOM FIELDS MANAGER ────────────────────────────────────
const FIELD_TYPES = [
  { value: "text",    labelFr: "Texte libre",      labelAr: "نص حر" },
  { value: "list",    labelFr: "Liste de choix",   labelAr: "قائمة" },
  { value: "number",  labelFr: "Nombre",           labelAr: "رقم" },
  { value: "date",    labelFr: "Date",             labelAr: "تاريخ" },
  { value: "boolean", labelFr: "Oui / Non",        labelAr: "نعم / لا" },
];

function CustomFieldsManager({ lang, module, userId }) {
  const [defs, setDefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editDef, setEditDef] = useState(null);

  const inp = { padding: "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: "none", width: "100%" };
  const labelFr = lang === "ar";

  useEffect(() => {
    supabase.from("custom_field_definitions")
      .select("*").eq("module", module).eq("active", true)
      .order("sort_order")
      .then(({ data }) => { setDefs(data || []); setLoading(false); });
  }, [userId, module]);

  const handleSave = async (form) => {
    const payload = {
      user_id: userId, module, scope: "global",
      field_key: form.field_key || form.label_fr.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
      label_fr: form.label_fr, label_ar: form.label_ar,
      field_type: form.field_type, options: form.options || [],
      required: form.required || false,
      sort_order: editDef ? editDef.sort_order : defs.length,
      active: true,
    };
    if (editDef) {
      const { data } = await supabase.from("custom_field_definitions").update(payload).eq("id", editDef.id).select().single();
      if (data) setDefs(prev => prev.map(d => d.id === editDef.id ? data : d));
    } else {
      const { data } = await supabase.from("custom_field_definitions").insert(payload).select().single();
      if (data) setDefs(prev => [...prev, data]);
    }
    setShowForm(false); setEditDef(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(lang === "ar" ? "حذف هذا الحقل؟" : "Supprimer ce champ ?")) return;
    await supabase.from("custom_field_definitions").update({ active: false }).eq("id", id);
    setDefs(prev => prev.filter(d => d.id !== id));
  };

  const moveUp = async (idx) => {
    if (idx === 0) return;
    const updated = [...defs];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    setDefs(updated);
    await Promise.all([
      supabase.from("custom_field_definitions").update({ sort_order: idx - 1 }).eq("id", updated[idx - 1].id),
      supabase.from("custom_field_definitions").update({ sort_order: idx }).eq("id", updated[idx].id),
    ]);
  };

  const moveDown = async (idx) => {
    if (idx === defs.length - 1) return;
    const updated = [...defs];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    setDefs(updated);
    await Promise.all([
      supabase.from("custom_field_definitions").update({ sort_order: idx }).eq("id", updated[idx].id),
      supabase.from("custom_field_definitions").update({ sort_order: idx + 1 }).eq("id", updated[idx + 1].id),
    ]);
  };

  if (loading) return <Spinner />;

  return (
    <div>
      {/* Field list */}
      {defs.length === 0
        ? <div style={{ color: "#9ca3af", fontSize: 13, fontFamily: "'DM Sans',sans-serif", marginBottom: 16 }}>
            {lang === "ar" ? "لا توجد حقول مخصصة بعد" : "Aucun champ personnalisé pour l'instant"}
          </div>
        : defs.map((d, idx) => (
          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f9fafb", borderRadius: 10, marginBottom: 8, flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, color: "#111827" }}>
                {lang === "ar" ? d.label_ar : d.label_fr}
                {d.required && <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>}
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "'DM Sans',sans-serif" }}>
                {FIELD_TYPES.find(f => f.value === d.field_type)?.[lang === "ar" ? "labelAr" : "labelFr"]}
                {d.field_type === "list" && ` · ${(d.options || []).length} valeurs`}
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => moveUp(idx)} style={{ padding: "4px 8px", background: "#e5e7eb", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>↑</button>
              <button onClick={() => moveDown(idx)} style={{ padding: "4px 8px", background: "#e5e7eb", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>↓</button>
              <Btn variant="secondary" small onClick={() => { setEditDef(d); setShowForm(true); }}>
                {lang === "ar" ? "تعديل" : "Modifier"}
              </Btn>
              <Btn variant="danger" small onClick={() => handleDelete(d.id)}>
                {lang === "ar" ? "حذف" : "Supprimer"}
              </Btn>
            </div>
          </div>
        ))}

      <Btn onClick={() => { setEditDef(null); setShowForm(true); }}>
        {lang === "ar" ? "+ إضافة حقل" : "+ Ajouter un champ"}
      </Btn>

      {showForm && (
        <Modal title={editDef ? (lang === "ar" ? "تعديل الحقل" : "Modifier le champ") : (lang === "ar" ? "حقل جديد" : "Nouveau champ")}
          onClose={() => { setShowForm(false); setEditDef(null); }} dir={lang === "ar" ? "rtl" : "ltr"}>
          <CustomFieldForm lang={lang} def={editDef} onSave={handleSave} onClose={() => { setShowForm(false); setEditDef(null); }} />
        </Modal>
      )}
    </div>
  );
}

function CustomFieldForm({ lang, def, onSave, onClose }) {
  const [form, setForm] = useState({
    label_fr: def?.label_fr || "",
    label_ar: def?.label_ar || "",
    field_type: def?.field_type || "text",
    required: def?.required || false,
    options: def?.options ? [...def.options] : [],
    field_key: def?.field_key || "",
  });
  const [newOptFr, setNewOptFr] = useState("");
  const [newOptAr, setNewOptAr] = useState("");

  const inp = { padding: "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: "none" };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addOption = () => {
    if (!newOptFr.trim()) return;
    const value = newOptFr.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    set("options", [...form.options, { value, label_fr: newOptFr.trim(), label_ar: newOptAr.trim() || newOptFr.trim() }]);
    setNewOptFr(""); setNewOptAr("");
  };

  const removeOption = (idx) => set("options", form.options.filter((_, i) => i !== idx));

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", fontFamily: "'DM Sans',sans-serif", display: "block", marginBottom: 5 }}>
            {lang === "ar" ? "الاسم (FR)" : "Nom (FR)"}
          </label>
          <input value={form.label_fr} onChange={e => set("label_fr", e.target.value)} style={{ ...inp, width: "100%" }} placeholder="ex: Matière" />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", fontFamily: "'DM Sans',sans-serif", display: "block", marginBottom: 5 }}>
            {lang === "ar" ? "الاسم (AR)" : "Nom (AR)"}
          </label>
          <input value={form.label_ar} onChange={e => set("label_ar", e.target.value)} style={{ ...inp, width: "100%" }} placeholder="ex: المادة" dir="rtl" />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", fontFamily: "'DM Sans',sans-serif", display: "block", marginBottom: 5 }}>
          {lang === "ar" ? "النوع" : "Type de champ"}
        </label>
        <select value={form.field_type} onChange={e => set("field_type", e.target.value)} style={{ ...inp, width: "100%" }}>
          {FIELD_TYPES.map(f => <option key={f.value} value={f.value}>{lang === "ar" ? f.labelAr : f.labelFr}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
        <input type="checkbox" checked={form.required} onChange={e => set("required", e.target.checked)} id="req-chk" style={{ cursor: "pointer" }} />
        <label htmlFor="req-chk" style={{ fontSize: 13, fontFamily: "'DM Sans',sans-serif", color: "#374151", cursor: "pointer" }}>
          {lang === "ar" ? "حقل إلزامي" : "Champ obligatoire"}
        </label>
      </div>

      {form.field_type === "list" && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", fontFamily: "'DM Sans',sans-serif", display: "block", marginBottom: 8 }}>
            {lang === "ar" ? "قيم القائمة" : "Valeurs de la liste"}
          </label>
          {form.options.map((opt, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ flex: 1, fontSize: 13, fontFamily: "'DM Sans',sans-serif", color: "#374151" }}>{opt.label_fr}</span>
              <span style={{ flex: 1, fontSize: 13, fontFamily: "'DM Sans',sans-serif", color: "#6b7280", direction: "rtl" }}>{opt.label_ar}</span>
              <button onClick={() => removeOption(idx)} style={{ padding: "2px 8px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>×</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input value={newOptFr} onChange={e => setNewOptFr(e.target.value)} placeholder="FR" style={{ ...inp, flex: 1 }}
              onKeyDown={e => e.key === "Enter" && addOption()} />
            <input value={newOptAr} onChange={e => setNewOptAr(e.target.value)} placeholder="AR" style={{ ...inp, flex: 1 }} dir="rtl"
              onKeyDown={e => e.key === "Enter" && addOption()} />
            <button onClick={addOption} style={{ padding: "9px 16px", background: "#e0e7ff", color: "#4f46e5", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <Btn variant="secondary" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Annuler"}</Btn>
        <Btn onClick={() => { if (!form.label_fr.trim()) return; onSave(form); }}>
          {lang === "ar" ? "حفظ" : "Enregistrer"}
        </Btn>
      </div>
    </div>
  );
}

function Settings({ t, lang, menuLabels, onSaveLabels, fieldConfig, onSaveFieldConfig, categories, locLevels, onSaveLocLevels, onResetData, userId, isSuperAdmin }) {
  const st = t.settings;
  const [labels, setLabels] = useState({ fr: { ...menuLabels.fr }, ar: { ...menuLabels.ar } });
  const [savedMsg, setSavedMsg] = useState("");
  const [localFieldConfig, setLocalFieldConfig] = useState({ global: { ...DEFAULT_FIELD_CONFIG.global, ...fieldConfig.global }, byCategory: { ...(fieldConfig.byCategory || {}) } });
  const [fieldSaved, setFieldSaved] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [levels, setLevels] = useState([...locLevels]);
  const [levelSaved, setLevelSaved] = useState("");
  const [resetConfirmText, setResetConfirmText] = useState("");
  const RESET_KEYWORD = lang === "ar" ? "حذف" : "SUPPRIMER";

  const flash = (set) => { set(st.saved); setTimeout(() => set(""), 2500); };
  const handleSaveLabels = () => { onSaveLabels(labels); flash(setSavedMsg); };
  const handleResetLabels = () => { const d = { fr: { ...DEFAULT_LABELS.fr }, ar: { ...DEFAULT_LABELS.ar } }; setLabels(d); onSaveLabels(d); flash(setSavedMsg); };
  const handleSaveFields = () => { onSaveFieldConfig(localFieldConfig); flash(setFieldSaved); };
  const handleResetFields = () => { const d = { global: { ...DEFAULT_FIELD_CONFIG.global }, byCategory: {} }; setLocalFieldConfig(d); onSaveFieldConfig(d); flash(setFieldSaved); };
  const handleSaveLevels = () => { onSaveLocLevels(levels); flash(setLevelSaved); };
  const handleResetLevels = () => { setLevels([...DEFAULT_LOC_LEVELS]); onSaveLocLevels([...DEFAULT_LOC_LEVELS]); flash(setLevelSaved); };
  const setGlobalField = (key, val) => setLocalFieldConfig(c => ({ ...c, global: { ...c.global, [key]: val } }));
  const setCatField = (cat, key, val) => setLocalFieldConfig(c => ({ ...c, byCategory: { ...c.byCategory, [cat]: { ...(c.byCategory[cat] || {}), [key]: val } } }));
  const getCatField = (cat, key) => { const cc = localFieldConfig.byCategory[cat]; return (cc && key in cc) ? cc[key] : localFieldConfig.global[key]; };
  const menuKeys = ["dashboard", "articles", "locations", "history"];
  const setLabel = (lng, key, val) => setLabels(l => ({ ...l, [lng]: { ...l[lng], [key]: val } }));
  const card = { background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: 20 };
  const sTitle = { fontFamily: "'Fraunces',serif", fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 5 };
  const sDesc = { fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#6b7280", marginBottom: 18 };

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Menu labels */}
      <div style={card}>
        <div style={sTitle}>{st.menuLabels}</div><div style={sDesc}>{st.menuLabelsDesc}</div>
        <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 1fr", gap: "10px 14px", alignItems: "center" }}>
          <div />
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 11, color: "#6b7280", textTransform: "uppercase" }}>{st.frLabel}</div>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 11, color: "#6b7280", textTransform: "uppercase" }}>{st.arLabel}</div>
          {menuKeys.map(key => (
            <React.Fragment key={key}>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#374151", fontWeight: 600 }}>{DEFAULT_LABELS.fr[key]}</div>
              <input value={labels.fr[key]} onChange={e => setLabel("fr", key, e.target.value)} style={{ padding: "8px 11px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: "none", width: "100%", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = "#6366f1"} onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
              <input value={labels.ar[key]} onChange={e => setLabel("ar", key, e.target.value)} dir="rtl" style={{ padding: "8px 11px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: "none", width: "100%", boxSizing: "border-box", textAlign: "right" }} onFocus={e => e.target.style.borderColor = "#6366f1"} onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
            </React.Fragment>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center" }}>
          <Btn onClick={handleSaveLabels}>{st.save}</Btn><Btn variant="secondary" onClick={handleResetLabels}>{st.reset}</Btn>
          {savedMsg && <span style={{ color: "#16a34a", fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600 }}>{savedMsg}</span>}
        </div>
      </div>

      {/* Global fields */}
      <div style={card}>
        <div style={sTitle}>{st.fieldsTitle}</div><div style={sDesc}>{st.fieldsDesc}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {OPTIONAL_FIELDS.map(f => (
            <div key={f.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f9fafb", borderRadius: 10 }}>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "#374151", fontWeight: 500 }}>{lang === "ar" ? f.labelAr : f.labelFr}</span>
              <Toggle checked={localFieldConfig.global[f.key]} onChange={val => setGlobalField(f.key, val)} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center" }}>
          <Btn onClick={handleSaveFields}>{st.save}</Btn><Btn variant="secondary" onClick={handleResetFields}>{st.reset}</Btn>
          {fieldSaved && <span style={{ color: "#16a34a", fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600 }}>{fieldSaved}</span>}
        </div>
      </div>

      {/* Fields by category */}
      <div style={card}>
        <div style={sTitle}>{st.fieldsByCategory}</div><div style={sDesc}>{st.fieldsByCategoryDesc}</div>
        {categories.length === 0 ? <div style={{ color: "#9ca3af", fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>{st.allCategories}</div>
          : <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setSelectedCat(selectedCat === cat ? "" : cat)}
                  style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13, background: selectedCat === cat ? "#4f46e5" : "#ede9fe", color: selectedCat === cat ? "#fff" : "#7c3aed" }}>
                  {cat}
                </button>
              ))}
            </div>
            {selectedCat && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {OPTIONAL_FIELDS.map(f => (
                  <div key={f.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f9fafb", borderRadius: 10 }}>
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "#374151", fontWeight: 500 }}>{lang === "ar" ? f.labelAr : f.labelFr}</span>
                    <Toggle checked={getCatField(selectedCat, f.key)} onChange={val => setCatField(selectedCat, f.key, val)} />
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center" }}>
              <Btn onClick={handleSaveFields}>{st.save}</Btn><Btn variant="secondary" onClick={handleResetFields}>{st.reset}</Btn>
              {fieldSaved && <span style={{ color: "#16a34a", fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600 }}>{fieldSaved}</span>}
            </div>
          </>
        }
      </div>

      {/* Champs personnalisés */}
      <div style={{ ...card }}>
        <div style={sTitle}>{lang === "ar" ? "الحقول المخصصة" : "Champs personnalisés"}</div>
        <div style={sDesc}>{lang === "ar" ? "أضف حقولاً إضافية تظهر في نماذج المنتجات" : "Ajoutez des champs supplémentaires qui apparaîtront dans les formulaires des articles"}</div>
        <CustomFieldsManager lang={lang} module="article" userId={userId} />
      </div>

      {/* Danger zone — superadmin only */}
      {isSuperAdmin && (
      <div style={{ ...card, border: "1.5px solid #fecaca" }}>
        <div style={{ ...sTitle, color: "#dc2626" }}>{lang === "ar" ? "منطقة الخطر" : "Zone dangereuse"}</div>
        <div style={sDesc}>
          {lang === "ar"
            ? "حذف جميع المنتجات والأماكن والسجل بشكل دائم. لا يمكن التراجع عن هذا الإجراء."
            : "Supprime définitivement tous les articles, emplacements et historique de ce module. Cette action est irréversible."}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input value={resetConfirmText} onChange={e => setResetConfirmText(e.target.value)}
            placeholder={lang === "ar" ? `اكتب "${RESET_KEYWORD}" للتأكيد` : `Tapez "${RESET_KEYWORD}" pour confirmer`}
            style={{ padding: "9px 13px", border: "1.5px solid #fecaca", borderRadius: 9, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none", minWidth: 220 }} />
          <Btn variant="danger" disabled={resetConfirmText !== RESET_KEYWORD}
            onClick={() => { if (resetConfirmText === RESET_KEYWORD) { onResetData(); setResetConfirmText(""); } }}
            style={{ opacity: resetConfirmText === RESET_KEYWORD ? 1 : 0.5, cursor: resetConfirmText === RESET_KEYWORD ? "pointer" : "not-allowed" }}>
            {lang === "ar" ? "حذف كل البيانات" : "Réinitialiser toutes les données"}
          </Btn>
        </div>
      </div>
      )}
    </div>
  );
}

// ─── TRASH VIEW ───────────────────────────────────────────────
function TrashView({ lang, items, type, locRows, onRestore, onDelete }) {
  const isAr = lang === "ar";
  return (
    <div>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🗑</span>
          <div>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 17, fontWeight: 700, color: "#111827" }}>
              {isAr ? "سلة المحذوفات" : "Corbeille"} ({items.length})
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: "'DM Sans',sans-serif" }}>
              {isAr ? "يمكنك استعادة العناصر أو حذفها نهائياً" : "Restaurez ou supprimez définitivement les éléments"}
            </div>
          </div>
        </div>
        {items.length === 0
          ? <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>
              {isAr ? "السلة فارغة" : "La corbeille est vide"}
            </div>
          : items.map(item => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", padding: "13px 20px", borderBottom: "1px solid #f3f4f6", gap: 14, opacity: 0.8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, color: "#6b7280", textDecoration: "line-through" }}>
                  {item.name}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "'DM Sans',sans-serif", marginTop: 2 }}>
                  {item.category || item.type || "—"} · {getPathLabel(locRows, item.location_path)}
                  {item.deleted_at && <> · {isAr ? "حُذف في" : "Supprimé le"} {new Date(item.deleted_at).toLocaleDateString()}</>}
                </div>
              </div>
              {type === "article" && item.qty !== undefined && (
                <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 16, color: "#9ca3af" }}>{item.qty} {item.unit}</span>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="secondary" small onClick={() => onRestore(item.id)}>
                  {isAr ? "♻ استعادة" : "♻ Restaurer"}
                </Btn>
                <Btn variant="danger" small onClick={() => onDelete(item.id)}>
                  {isAr ? "حذف نهائي" : "Supprimer définitivement"}
                </Btn>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ─── ADMIN PANEL (superadmin only) ───────────────────────────
function AdminPanel({ lang, userId, onLevelsUpdated }) {
  const [centres, setCentres] = useState([]);
  const [operators, setOperators] = useState([]);
  const [trashedOperators, setTrashedOperators] = useState([]);
  const [tab, setTab] = useState("centres");
  const [locCentreId, setLocCentreId] = useState("");
  const [locRowsAdmin, setLocRowsAdmin] = useState([]);
  const [locLevelsAdmin, setLocLevelsAdmin] = useState(DEFAULT_LOC_LEVELS);
  const [newCentreName, setNewCentreName] = useState("");
  const [newCentreAr, setNewCentreAr] = useState("");
  const [newOpEmail, setNewOpEmail] = useState("");
  const [newOpName, setNewOpName] = useState("");
  const [newOpCentre, setNewOpCentre] = useState("");
  const [newOpPassword, setNewOpPassword] = useState("");
  const [newOpRole, setNewOpRole] = useState("operator");
  const [showPwd, setShowPwd] = useState(false);
  const [msg, setMsg] = useState({ text: "", ok: true });
  const [loading, setLoading] = useState(false);
  const [editingCentre, setEditingCentre] = useState(null);
  const [editingOperator, setEditingOperator] = useState(null); // { user_id, display_name, centre_id, email, newPassword }

  const inp = { padding: "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: "none", width: "100%" };
  const flash = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg({ text: "", ok: true }), 4000); };

  const SUPABASE_URL = "https://kujjyecvnlyvedbwzuhw.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1amp5ZWN2bmx5dmVkYnd6dWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5NzI5MTMsImV4cCI6MjA2NTU0ODkxM30.GNKMb-ygaXMBFjAWFMJr1CZLGrFNMqm7zp9PTPVJBhE";

  const callEdge = async (body) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-operator`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}`, "apikey": SUPABASE_ANON_KEY },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const handleUpdateOperator = async () => {
    if (!editingOperator) return;
    setLoading(true);
    // Update profile (name + centre)
    const r1 = await callEdge({ action: "update_profile", user_id: editingOperator.user_id, display_name: editingOperator.display_name, centre_id: editingOperator.centre_id });
    if (!r1.success) { flash("Erreur : " + r1.error, false); setLoading(false); return; }
    // Reset password if filled
    if (editingOperator.newPassword?.trim()) {
      const r2 = await callEdge({ action: "reset_password", user_id: editingOperator.user_id, new_password: editingOperator.newPassword.trim() });
      if (!r2.success) { flash("Profil mis à jour mais erreur mot de passe : " + r2.error, false); setLoading(false); return; }
    }
    setOperators(prev => prev.map(o => o.user_id === editingOperator.user_id
      ? { ...o, display_name: editingOperator.display_name, centre_id: editingOperator.centre_id }
      : o
    ));
    setEditingOperator(null);
    flash("✅ " + (lang === "ar" ? "تم التحديث" : "Opérateur mis à jour"));
    setLoading(false);
  };

  const handleOpenEdit = async (op) => {
    setLoading(true);
    const result = await callEdge({ action: "get_email", user_id: op.user_id });
    setEditingOperator({ user_id: op.user_id, display_name: op.display_name || "", centre_id: op.centre_id || "", email: result.email || "—", newPassword: "", showPwd: false });
    setLoading(false);
  };

  const handleRenameCentre = async () => {
    if (!editingCentre?.name.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.from("centres")
      .update({ name: editingCentre.name.trim(), name_ar: editingCentre.name_ar.trim() })
      .eq("id", editingCentre.id).select().single();
    if (error) flash("Erreur : " + error.message, false);
    else {
      setCentres(prev => prev.map(c => c.id === editingCentre.id ? data : c));
      setEditingCentre(null);
      flash("✅ " + (lang === "ar" ? "تم التعديل" : "Centre renommé"));
    }
    setLoading(false);
  };

  useEffect(() => {
    supabase.from("centres").select("*").eq("active", true).order("name")
      .then(({ data }) => { setCentres(data || []); if (data?.length && !locCentreId) setLocCentreId(data[0].id); });
    supabase.from("profiles").select("*").in("role", ["operator", "admin"]).eq("active", true)
      .then(({ data }) => setOperators(data || []));
    supabase.from("profiles").select("*").in("role", ["operator", "admin"]).in("active", [false])
      .then(({ data }) => setTrashedOperators(data || []));
  }, []);

  // Load locations for selected centre
  useEffect(() => {
    if (!locCentreId) return;
    supabase.from("location_tree").select("*").eq("centre_id", locCentreId).order("sort_order")
      .then(({ data }) => setLocRowsAdmin(data || []));
    supabase.from("location_levels").select("*").eq("centre_id", locCentreId).order("level_num")
      .then(({ data }) => setLocLevelsAdmin(data?.length ? data : DEFAULT_LOC_LEVELS));
  }, [locCentreId]);

  const handleAddLocNodeAdmin = async (parentId, name) => {
    const { data } = await supabase.from("location_tree").insert({ parent_id: parentId, name, user_id: userId, centre_id: locCentreId }).select().single();
    if (data) setLocRowsAdmin(prev => [...prev, data]);
  };
  const handleRenameLocNodeAdmin = async (id, name) => {
    await supabase.from("location_tree").update({ name }).eq("id", id);
    setLocRowsAdmin(prev => prev.map(r => r.id === id ? { ...r, name } : r));
  };
  const handleDeleteLocNodeAdmin = async (id) => {
    await supabase.from("location_tree").delete().eq("id", id);
    setLocRowsAdmin(prev => prev.filter(r => r.id !== id));
  };

  const handleSaveLocLevelsAdmin = async (newLevels) => {
    if (!locCentreId) return;
    await Promise.all(newLevels.map((lv, i) =>
      supabase.from("location_levels").upsert({
        centre_id: locCentreId,
        level_num: lv.level_num || i + 1,
        label_fr: lv.label_fr || `Niveau ${i + 1}`,
        label_ar: lv.label_ar || `مستوى ${i + 1}`,
      }, { onConflict: "centre_id,level_num" })
    ));
    const maxLevel = newLevels.length;
    await supabase.from("location_levels").delete().eq("centre_id", locCentreId).gt("level_num", maxLevel);
    if (onLevelsUpdated) onLevelsUpdated();
  };

  const handleAddCentre = async () => {
    if (!newCentreName.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.from("centres")
      .insert({ name: newCentreName.trim(), name_ar: newCentreAr.trim(), created_by: userId })
      .select().single();
    if (error) flash("Erreur : " + error.message, false);
    else { setCentres(prev => [...prev, data]); setNewCentreName(""); setNewCentreAr(""); flash("✅ Centre créé"); }
    setLoading(false);
  };

  const handleDeleteCentre = async (id) => {
    if (!window.confirm(lang === "ar" ? "حذف هذا المركز؟" : "Supprimer ce centre ?")) return;
    await supabase.from("centres").update({ active: false }).eq("id", id);
    setCentres(prev => prev.filter(c => c.id !== id));
  };

  const handleAddOperator = async () => {
    if (!newOpEmail.trim() || !newOpPassword.trim()) {
      flash(lang === "ar" ? "يرجى ملء البريد وكلمة المرور" : "Email et mot de passe requis", false);
      return;
    }
    setLoading(true);
    try {
      const result = await callEdge({ action: "create", email: newOpEmail.trim(), password: newOpPassword.trim(), display_name: newOpName.trim(), centre_id: newOpCentre || null, role: newOpRole });
      if (!result.success) throw new Error(result.error);
      const centre = centres.find(c => c.id === newOpCentre);
      setOperators(prev => [...prev, { user_id: result.user_id, display_name: newOpName || newOpEmail, centre_id: newOpCentre || null, role: newOpRole, email: result.email }]);
      setNewOpEmail(""); setNewOpName(""); setNewOpPassword(""); setNewOpCentre("");
      flash("✅ " + (lang === "ar" ? "تم إنشاء الحساب" : "Opérateur créé avec succès"));
    } catch (err) { flash("Erreur : " + err.message, false); }
    setLoading(false);
  };

  const handleDeleteOperator = async (user_id) => {
    if (!window.confirm(lang === "ar" ? "نقل هذا المشغّل إلى سلة المحذوفات؟" : "Mettre cet opérateur dans la corbeille ?")) return;
    setLoading(true);
    const result = await callEdge({ action: "deactivate", user_id });
    if (!result.success) { flash("Erreur : " + result.error, false); setLoading(false); return; }
    const op = operators.find(o => o.user_id === user_id);
    setOperators(prev => prev.filter(o => o.user_id !== user_id));
    if (op) setTrashedOperators(prev => [...prev, { ...op, active: false }]);
    setLoading(false);
  };

  const handleRestoreOperator = async (user_id) => {
    setLoading(true);
    const result = await callEdge({ action: "reactivate", user_id });
    if (!result.success) { flash("Erreur : " + result.error, false); setLoading(false); return; }
    const op = trashedOperators.find(o => o.user_id === user_id);
    setTrashedOperators(prev => prev.filter(o => o.user_id !== user_id));
    if (op) setOperators(prev => [...prev, { ...op, active: true }]);
    setLoading(false);
  };

  const handlePermanentDelete = async (user_id) => {
    if (!window.confirm(lang === "ar" ? "حذف نهائي؟ لا يمكن التراجع" : "Suppression définitive ? Irréversible.")) return;
    setLoading(true);
    const result = await callEdge({ action: "permanent_delete", user_id });
    if (!result.success) { flash("Erreur : " + result.error, false); setLoading(false); return; }
    setTrashedOperators(prev => prev.filter(o => o.user_id !== user_id));
    setLoading(false);
  };

  const tabBtn = (key, label) => (
    <button onClick={() => setTab(key)} style={{ padding: "8px 18px", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13, background: tab === key ? "#4f46e5" : "#f3f4f6", color: tab === key ? "#fff" : "#374151" }}>{label}</button>
  );

  const card = { background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: 20 };

  return (
    <div>
      <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 900, color: "#1e1b4b", marginBottom: 20 }}>
        {lang === "ar" ? "إدارة المراكز والمستخدمين" : "Gestion des centres et opérateurs"}
      </h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {tabBtn("centres", lang === "ar" ? "المراكز" : "Centres")}
        {tabBtn("operators", lang === "ar" ? "المشغّلون" : "Opérateurs")}
        {tabBtn("locations", lang === "ar" ? "الأماكن" : "Emplacements")}
        {tabBtn("trash", lang === "ar" ? "🗑 سلة المحذوفات" : `🗑 Corbeille${trashedOperators.length ? ` (${trashedOperators.length})` : ""}`)}
      </div>

      {msg.text && (
        <div style={{ background: msg.ok ? "#f0fdf4" : "#fef2f2", border: `1px solid ${msg.ok ? "#86efac" : "#fca5a5"}`, borderRadius: 9, padding: "10px 16px", marginBottom: 16, fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: msg.ok ? "#16a34a" : "#dc2626" }}>
          {msg.text}
        </div>
      )}

      {tab === "centres" && (
        <div>
          <div style={card}>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 16 }}>
              {lang === "ar" ? "إضافة مركز" : "Ajouter un centre"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <input value={newCentreName} onChange={e => setNewCentreName(e.target.value)}
                placeholder="Nom en français" style={inp}
                onKeyDown={e => e.key === "Enter" && handleAddCentre()} />
              <input value={newCentreAr} onChange={e => setNewCentreAr(e.target.value)}
                placeholder="الاسم بالعربية" style={inp} dir="rtl"
                onKeyDown={e => e.key === "Enter" && handleAddCentre()} />
            </div>
            <Btn onClick={handleAddCentre} disabled={loading}>
              {lang === "ar" ? "إضافة" : "Ajouter"}
            </Btn>
          </div>

          <div style={card}>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 16 }}>
              {lang === "ar" ? "قائمة المراكز" : "Liste des centres"} ({centres.length})
            </div>
            {centres.length === 0
              ? <div style={{ color: "#9ca3af", fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>
                  {lang === "ar" ? "لا توجد مراكز" : "Aucun centre"}
                </div>
              : centres.map(c => (
                <div key={c.id} style={{ padding: "12px 0", borderBottom: "1px solid #f3f4f6" }}>
                  {editingCentre?.id === c.id ? (
                    <div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <input value={editingCentre.name} onChange={e => setEditingCentre(p => ({ ...p, name: e.target.value }))}
                          placeholder="Nom (FR)" style={inp} />
                        <input value={editingCentre.name_ar} onChange={e => setEditingCentre(p => ({ ...p, name_ar: e.target.value }))}
                          placeholder="الاسم (AR)" style={inp} dir="rtl" />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Btn onClick={handleRenameCentre} disabled={loading}>{lang === "ar" ? "حفظ" : "Enregistrer"}</Btn>
                        <Btn variant="secondary" onClick={() => setEditingCentre(null)}>{lang === "ar" ? "إلغاء" : "Annuler"}</Btn>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, color: "#111827" }}>{c.name}</div>
                        {c.name_ar && <div style={{ fontSize: 12, color: "#6b7280", direction: "rtl", textAlign: "right" }}>{c.name_ar}</div>}
                        <div style={{ fontSize: 10, color: "#d1d5db", fontFamily: "monospace", marginTop: 2 }}>{c.id}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn variant="secondary" small onClick={() => setEditingCentre({ id: c.id, name: c.name, name_ar: c.name_ar || "" })}>
                          {lang === "ar" ? "تعديل" : "Renommer"}
                        </Btn>
                        <Btn variant="danger" small onClick={() => handleDeleteCentre(c.id)}>
                          {lang === "ar" ? "حذف" : "Supprimer"}
                        </Btn>
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {tab === "operators" && (
        <div>

          <div style={card}>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 16 }}>
              {lang === "ar" ? "إضافة مشغّل" : "Créer un opérateur"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <input value={newOpName} onChange={e => setNewOpName(e.target.value)}
                placeholder={lang === "ar" ? "الاسم المعروض" : "Nom affiché"} style={inp} />
              <select value={newOpCentre} onChange={e => setNewOpCentre(e.target.value)}
                style={{ ...inp, background: "#fff" }}>
                <option value="">{lang === "ar" ? "كل المراكز" : "Tous les centres"}</option>
                {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input value={newOpEmail} onChange={e => setNewOpEmail(e.target.value)}
                placeholder="Email" style={inp} type="email" />
              <div style={{ position: "relative" }}>
                <input value={newOpPassword} onChange={e => setNewOpPassword(e.target.value)}
                  placeholder={lang === "ar" ? "كلمة المرور" : "Mot de passe"}
                  style={{ ...inp, paddingRight: 40 }} type={showPwd ? "text" : "password"} />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9ca3af" }}>
                  {showPwd ? "🙈" : "👁"}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", fontFamily: "'DM Sans',sans-serif", display: "block", marginBottom: 6 }}>
                {lang === "ar" ? "الدور" : "Rôle"}
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans',sans-serif", fontSize: 13, cursor: "pointer" }}>
                  <input type="radio" value="operator" checked={newOpRole === "operator"} onChange={() => setNewOpRole("operator")} />
                  {lang === "ar" ? "مشغّل (بدون إعدادات)" : "Opérateur (sans Paramètres)"}
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans',sans-serif", fontSize: 13, cursor: "pointer" }}>
                  <input type="radio" value="admin" checked={newOpRole === "admin"} onChange={() => setNewOpRole("admin")} />
                  {lang === "ar" ? "مدير مركز (مع إعدادات)" : "Admin centre (avec Paramètres)"}
                </label>
              </div>
            </div>
            <Btn onClick={handleAddOperator} disabled={loading}>
              {loading ? "..." : (lang === "ar" ? "إنشاء الحساب" : "Créer le compte")}
            </Btn>
          </div>

          {/* Edit operator modal */}
          {editingOperator && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
              onClick={() => setEditingOperator(null)}>
              <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
                onClick={e => e.stopPropagation()}>
                <div style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 20 }}>
                  {lang === "ar" ? "تعديل المشغّل" : "Modifier l'opérateur"}
                </div>

                {/* Email (readonly) */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 5, fontFamily: "'DM Sans',sans-serif" }}>Email</label>
                  <div style={{ padding: "9px 13px", background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 13, fontFamily: "monospace", color: "#374151" }}>
                    {editingOperator.email}
                  </div>
                </div>

                {/* Display name */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5, fontFamily: "'DM Sans',sans-serif" }}>
                    {lang === "ar" ? "الاسم المعروض" : "Nom affiché"}
                  </label>
                  <input value={editingOperator.display_name}
                    onChange={e => setEditingOperator(p => ({ ...p, display_name: e.target.value }))}
                    style={inp} />
                </div>

                {/* Centre */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5, fontFamily: "'DM Sans',sans-serif" }}>
                    {lang === "ar" ? "المركز" : "Centre"}
                  </label>
                  <select value={editingOperator.centre_id}
                    onChange={e => setEditingOperator(p => ({ ...p, centre_id: e.target.value }))}
                    style={{ ...inp, background: "#fff" }}>
                    <option value="">{lang === "ar" ? "اختر المركز" : "Choisir le centre"}</option>
                    {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* New password */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5, fontFamily: "'DM Sans',sans-serif" }}>
                    {lang === "ar" ? "كلمة مرور جديدة (اختياري)" : "Nouveau mot de passe (optionnel)"}
                  </label>
                  <div style={{ position: "relative" }}>
                    <input value={editingOperator.newPassword}
                      onChange={e => setEditingOperator(p => ({ ...p, newPassword: e.target.value }))}
                      type={editingOperator.showPwd ? "text" : "password"}
                      placeholder={lang === "ar" ? "اترك فارغاً للإبقاء على نفس كلمة المرور" : "Laisser vide pour ne pas changer"}
                      style={{ ...inp, paddingRight: 40 }} />
                    <button type="button" onClick={() => setEditingOperator(p => ({ ...p, showPwd: !p.showPwd }))}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9ca3af" }}>
                      {editingOperator.showPwd ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <Btn variant="secondary" onClick={() => setEditingOperator(null)}>{lang === "ar" ? "إلغاء" : "Annuler"}</Btn>
                  <Btn onClick={handleUpdateOperator} disabled={loading}>{loading ? "..." : (lang === "ar" ? "حفظ" : "Enregistrer")}</Btn>
                </div>
              </div>
            </div>
          )}

          <div style={card}>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 16 }}>
              {lang === "ar" ? "المشغّلون" : "Opérateurs"} ({operators.length})
            </div>
            {operators.length === 0
              ? <div style={{ color: "#9ca3af", fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>
                  {lang === "ar" ? "لا يوجد مشغّلون" : "Aucun opérateur enregistré"}
                </div>
              : operators.map(op => (
                <div key={op.user_id} style={{ display: "flex", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f3f4f6", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>👤</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, color: "#111827" }}>{op.display_name || "—"}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", fontFamily: "'DM Sans',sans-serif" }}>
                      {op.centre_id ? centres.find(c => c.id === op.centre_id)?.name || "—" : "—"}
                    </div>
                    {op.email && <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>{op.email}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn variant="secondary" small onClick={() => handleOpenEdit(op)} disabled={loading}>
                      {lang === "ar" ? "تعديل" : "Modifier"}
                    </Btn>
                    <Btn variant="danger" small onClick={() => handleDeleteOperator(op.user_id)}>
                      {lang === "ar" ? "🗑 حذف" : "🗑 Corbeille"}
                    </Btn>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {tab === "locations" && (
        <div>
          {/* Centre selector */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8, fontFamily: "'DM Sans',sans-serif" }}>
              {lang === "ar" ? "اختر المركز" : "Choisir le centre"}
            </label>
            <select value={locCentreId} onChange={e => setLocCentreId(e.target.value)}
              style={{ padding: "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff", minWidth: 240 }}>
              {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Levels renaming */}
          {locCentreId && (
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: 20 }}>
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 6 }}>
                {lang === "ar" ? "تسمية المستويات" : "Niveaux d'emplacement"}
              </div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
                {lang === "ar" ? "سمّ كل مستوى كما تريد" : "Renommez chaque niveau selon votre organisation"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr auto", gap: "8px 12px", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 11, color: "#6b7280", textTransform: "uppercase" }}>{lang === "ar" ? "المستوى" : "Niveau"}</div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 11, color: "#6b7280", textTransform: "uppercase" }}>FR</div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 11, color: "#6b7280", textTransform: "uppercase" }}>AR</div>
                <div />
                {locLevelsAdmin.map((lv, i) => (
                  <React.Fragment key={lv.level_num || i}>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600, color: "#374151" }}>
                      {lang === "ar" ? `مستوى ${lv.level_num || i + 1}` : `Niveau ${lv.level_num || i + 1}`}
                    </div>
                    <input value={typeof lv === "string" ? lv : lv.label_fr || ""}
                      onChange={e => {
                        const updated = locLevelsAdmin.map((l, j) => j === i ? { ...l, label_fr: e.target.value } : l);
                        setLocLevelsAdmin(updated);
                        handleSaveLocLevelsAdmin(updated);
                      }}
                      style={{ padding: "8px 11px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: "none", width: "100%", boxSizing: "border-box" }} />
                    <input value={typeof lv === "string" ? lv : lv.label_ar || ""}
                      onChange={e => {
                        const updated = locLevelsAdmin.map((l, j) => j === i ? { ...l, label_ar: e.target.value } : l);
                        setLocLevelsAdmin(updated);
                        handleSaveLocLevelsAdmin(updated);
                      }}
                      style={{ padding: "8px 11px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: "none", width: "100%", boxSizing: "border-box", direction: "rtl" }} />
                    {locLevelsAdmin.length > 1
                      ? <button onClick={() => { const updated = locLevelsAdmin.filter((_, j) => j !== i); setLocLevelsAdmin(updated); handleSaveLocLevelsAdmin(updated); }}
                          style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, cursor: "pointer", padding: "5px 9px", fontSize: 13 }}>✕</button>
                      : <div />}
                  </React.Fragment>
                ))}
              </div>
              <Btn small variant="secondary" onClick={() => {
                const updated = [...locLevelsAdmin, { level_num: locLevelsAdmin.length + 1, label_fr: `Niveau ${locLevelsAdmin.length + 1}`, label_ar: `مستوى ${locLevelsAdmin.length + 1}` }];
                setLocLevelsAdmin(updated);
                handleSaveLocLevelsAdmin(updated);
              }}>
                {lang === "ar" ? "+ إضافة مستوى" : "+ Ajouter un niveau"}
              </Btn>
            </div>
          )}

          {/* Location tree */}
          {locCentreId && (
            <Locations t={lang === "ar" ? T.ar : T.fr} lang={lang} locRows={locRowsAdmin} locLevels={locLevelsAdmin}
              articles={[]} onAdd={handleAddLocNodeAdmin} onRename={handleRenameLocNodeAdmin} onDelete={handleDeleteLocNodeAdmin} readOnly={false} />
          )}
        </div>
      )}

      {tab === "trash" && (
        <div style={card}>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 16 }}>
            {lang === "ar" ? "سلة المحذوفات" : "Corbeille"} ({trashedOperators.length})
          </div>
          {trashedOperators.length === 0
            ? <div style={{ color: "#9ca3af", fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>
                {lang === "ar" ? "السلة فارغة" : "Corbeille vide"}
              </div>
            : trashedOperators.map(op => (
              <div key={op.user_id} style={{ display: "flex", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f3f4f6", gap: 12, opacity: 0.7 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>👤</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, color: "#6b7280", textDecoration: "line-through" }}>{op.display_name || "—"}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "'DM Sans',sans-serif" }}>
                    {op.centre_id ? centres.find(c => c.id === op.centre_id)?.name || "—" : "—"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn variant="secondary" small onClick={() => handleRestoreOperator(op.user_id)}>
                    {lang === "ar" ? "♻ استعادة" : "♻ Restaurer"}
                  </Btn>
                  <Btn variant="danger" small onClick={() => handlePermanentDelete(op.user_id)}>
                    {lang === "ar" ? "حذف نهائي" : "Supprimer définitivement"}
                  </Btn>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [lang, setLang] = useState("fr");
  const [view, setView] = useState("dashboard");
  const [articleFilter, setArticleFilter] = useState(null);
  const [equipmentFilter, setEquipmentFilter] = useState(null);

  // Data state
  const [articles, setArticles] = useState([]);
  const [trashedArticles, setTrashedArticles] = useState([]);
  const [locRows, setLocRows] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [menuLabels, setMenuLabels] = useState(DEFAULT_LABELS);
  const [fieldConfig, setFieldConfig] = useState(DEFAULT_FIELD_CONFIG);
  const [locLevels, setLocLevels] = useState(DEFAULT_LOC_LEVELS);
  const [locLevelsVersion, setLocLevelsVersion] = useState(0);
  const [visibleCols, setVisibleCols] = useState(DEFAULT_VISIBLE_COLS);
  const [dataLoading, setDataLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [centres, setCentres] = useState([]);
  const [centresForTransfer, setCentresForTransfer] = useState([]);
  const [centreFilter, setCentreFilter] = useState(null); // superadmin filter (null = all)
  const [activeCentreId, setActiveCentreId] = useState(null); // operator's centre

  const t = T[lang];
  const userId = session?.user?.id;
  const isSuperAdmin = profile?.role === 'superadmin';
  const isAdmin = profile?.role === 'admin';
  const isOperator = profile?.role === 'operator';
  const isAllCentres = !isSuperAdmin && profile?.centre_id === null; // admin/operator with all centres
  const canAccessSettings = isSuperAdmin || isAdmin;
  // centreId null = load all data (superadmin or all-centres user)
  const centreId = isSuperAdmin ? centreFilter : (profile?.centre_id || null);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setAuthLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  // Load profile when logged in
  useEffect(() => {
    if (!userId) { setProfile(null); setCentres([]); setActiveModule("stock"); setView("dashboard"); return; }
    supabase.from("profiles").select("*").eq("user_id", userId).single()
      .then(({ data }) => {
        setProfile(data);
        setActiveModule("stock");
        setView("dashboard");
        if (data?.role === 'superadmin' || data?.centre_id === null) {
          supabase.from("centres").select("*").eq("active", true).order("name")
            .then(({ data: c }) => { setCentres(c || []); setCentresForTransfer(c || []); });
        } else {
          supabase.from("centres").select("*").eq("id", data?.centre_id).single()
            .then(({ data: c }) => { if (c) setCentres([c]); setActiveCentreId(data?.centre_id); });
          // Always load all centres for transfer purposes
          supabase.from("centres").select("*").eq("active", true).order("name")
            .then(({ data: c }) => setCentresForTransfer(c || []));
        }
      });
  }, [userId]);

  // Load all data - superadmin loads all, operator loads by centre
  useEffect(() => {
    if (!userId || !profile) return;
    const operatorCentreId = profile?.centre_id;
    const loadAll = isSuperAdmin || isAllCentres;
    if (!loadAll && !operatorCentreId) return;
    setDataLoading(true);
    const artQuery = loadAll
      ? supabase.from("articles").select("*").is("deleted_at", null).order("name")
      : supabase.from("articles").select("*").eq("centre_id", operatorCentreId).is("deleted_at", null).order("name");
    const artTrashQuery = loadAll
      ? supabase.from("articles").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false })
      : supabase.from("articles").select("*").eq("centre_id", operatorCentreId).not("deleted_at", "is", null).order("deleted_at", { ascending: false });
    const locQuery = loadAll
      ? supabase.from("location_tree").select("*").order("sort_order")
      : supabase.from("location_tree").select("*").eq("centre_id", operatorCentreId).order("sort_order");
    const histQuery = loadAll
      ? supabase.from("history").select("*").order("created_at", { ascending: false }).limit(500)
      : supabase.from("history").select("*").eq("centre_id", operatorCentreId).order("created_at", { ascending: false }).limit(200);

    Promise.all([
      artQuery, artTrashQuery, locQuery, histQuery,
      loadMenuLabels(userId, isSuperAdmin ? null : operatorCentreId, DEFAULT_LABELS),
      getConfig(userId, "fieldConfig", DEFAULT_FIELD_CONFIG),
      getConfig(userId, "visibleCols", DEFAULT_VISIBLE_COLS),
      getConfig(userId, "lang", "fr"),
    ]).then(([art, artTrash, loc, hist, ml, fc, vc, lg]) => {
      setArticles(art.data || []);
      setTrashedArticles(artTrash.data || []);
      setLocRows(loc.data || []);
      setHistoryItems(hist.data || []);
      setMenuLabels(ml);
      setFieldConfig(fc);
      setVisibleCols(vc);
      setLang(lg);
      setDataLoading(false);
    });
  }, [userId, profile, isSuperAdmin, isAllCentres]);

  // Reload locLevels fresh from DB whenever effective centre is known
  useEffect(() => {
    const effectiveCentre = (isSuperAdmin || isAllCentres) ? centreFilter : profile?.centre_id;
    if (!effectiveCentre) return;
    supabase.from("location_levels").select("*").eq("centre_id", effectiveCentre).order("level_num")
      .then(({ data }) => {
        if (data?.length) setLocLevels(data);
        else setLocLevels(DEFAULT_LOC_LEVELS);
      });
  }, [centreFilter, profile?.centre_id, isSuperAdmin, isAllCentres, locLevelsVersion, userId]);
  useEffect(() => {
    if (!isSuperAdmin || !userId) return;
    loadMenuLabels(userId, centreFilter || null, DEFAULT_LABELS).then(ml => setMenuLabels(ml));
  }, [centreFilter, isSuperAdmin, userId]);

  const navLabels = useMemo(() => ({
    dashboard: menuLabels[lang]?.dashboard || t.nav.dashboard,
    articles: menuLabels[lang]?.articles || t.nav.articles,
    locations: menuLabels[lang]?.locations || t.nav.locations,
    history: menuLabels[lang]?.history || t.nav.history,
    settings: t.nav.settings,
  }), [menuLabels, lang, t]);

  const categories = useMemo(() => [...new Set(articles.map(a => a.category))].sort(), [articles]);

  // ── Article handlers ──
  const findDuplicate = (name, category, excludeId) => articles.find(a =>
    a.id !== excludeId &&
    a.name.trim().toLowerCase() === name.trim().toLowerCase() &&
    a.category.trim().toLowerCase() === category.trim().toLowerCase()
  );

  const handleAddArticle = async (form, editing, customValues) => {
    const payload = {
      name: form.name,
      category: form.category,
      qty: form.qty || 0,
      unit: form.unit || "",
      threshold: form.threshold || 5,
      location_path: form.location_path || [],
      supplier: form.supplier || "",
      reference: form.reference || "",
      price: form.price ? Number(form.price) : null,
      buyer: form.buyer || "",
      date_in: form.date_in || null,
      date_out: form.date_out || null,
      source_type: form.source_type || "achat",
      fournisseur_etablissement: form.fournisseur_etablissement || "",
      donateur: form.donateur || "",
      num_facture: form.num_facture || "",
      date_facture: form.date_facture || null,
      num_bon_don: form.num_bon_don || "",
      num_enregistrement: form.num_enregistrement || "",
      date_enregistrement: form.date_enregistrement || null,
      user_id: userId,
      centre_id: centreId || centreFilter || centres.find(c => c.is_siege)?.id || centres[0]?.id,
    };
    // Check for duplicate (same name + category)
    const dup = findDuplicate(form.name, form.category, editing?.id);
    const targetId = editing ? editing.id : dup?.id;

    if (targetId) {
      const { data, error } = await supabase.from("articles").update(payload).eq("id", targetId).select().single();
      if (error) console.error("Update error:", error);
      if (data) setArticles(prev => prev.map(a => a.id === targetId ? data : a));
      if (customValues) await saveCustomFieldValues(userId, targetId, customValues, centreId);

      // Build a generic changes log comparing every tracked field
      if (editing && data) {
        const trackedFields = ["name", "category", "qty", "unit", "threshold", "location_path", "supplier", "fournisseur_etablissement", "donateur", "reference", "price", "buyer", "date_in", "date_out", "source_type", "num_facture", "date_facture", "num_bon_don", "num_enregistrement", "date_enregistrement"];
        const fieldLabels = {
          name: lang === "ar" ? "الاسم" : "Nom",
          category: lang === "ar" ? "الفئة" : "Catégorie",
          qty: lang === "ar" ? "الكمية" : "Quantité",
          unit: lang === "ar" ? "الوحدة" : "Unité",
          threshold: lang === "ar" ? "حد التنبيه" : "Seuil",
          location_path: lang === "ar" ? "الموقع" : "Emplacement",
          supplier: lang === "ar" ? "المورد" : "Fournisseur",
          fournisseur_etablissement: lang === "ar" ? "المؤسسة" : "Établissement",
          donateur: lang === "ar" ? "الواهب" : "Donateur",
          reference: lang === "ar" ? "المرجع" : "Référence",
          price: lang === "ar" ? "السعر" : "Prix",
          buyer: lang === "ar" ? "المشتري" : "Acheteur",
          date_in: lang === "ar" ? "تاريخ الدخول" : "Date d'entrée",
          date_out: lang === "ar" ? "تاريخ الخروج" : "Date de sortie",
          source_type: lang === "ar" ? "نوع المصدر" : "Type de source",
          num_facture: lang === "ar" ? "رقم الفاتورة" : "N° facture",
          date_facture: lang === "ar" ? "تاريخ الفاتورة" : "Date facture",
          num_bon_don: lang === "ar" ? "رقم وصل الهبة" : "N° bon don",
          num_enregistrement: lang === "ar" ? "رقم التضمين" : "N° enregistrement",
          date_enregistrement: lang === "ar" ? "تاريخ التضمين" : "Date enregistrement",
        };
        const changes = {};
        for (const f of trackedFields) {
          let before = editing[f];
          let after = payload[f];
          if (f === "location_path") {
            before = getPathLabel(locRows, before || []);
            after = getPathLabel(locRows, after || []);
          } else {
            before = before ?? "";
            after = after ?? "";
          }
          if (String(before) !== String(after)) {
            changes[f] = { label: fieldLabels[f], from: before, to: after };
          }
        }
        if (Object.keys(changes).length > 0) {
          const { data: hist } = await supabase.from("history").insert({
            article_id: targetId, type: "edit", changes, user_id: userId, centre_id: centreId,
          }).select().single();
          if (hist) setHistoryItems(prev => [hist, ...prev]);
        }
      }
    } else {
      const { data, error } = await supabase.from("articles").insert(payload).select().single();
      if (error) console.error("Insert error:", error);
      if (data) {
        setArticles(prev => [...prev, data]);
        if (customValues) await saveCustomFieldValues(userId, data.id, customValues, centreId);
      }
    }
  };


  const handleDeleteArticle = async (id) => {
    const now = new Date().toISOString();
    await supabase.from("articles").update({ deleted_at: now }).eq("id", id);
    setArticles(prev => prev.filter(a => a.id !== id));
    setTrashedArticles(prev => [...prev, { ...articles.find(a => a.id === id), deleted_at: now }].filter(Boolean));
  };

  const handleDeleteManyArticles = async (ids) => {
    const now = new Date().toISOString();
    await supabase.from("articles").update({ deleted_at: now }).in("id", ids);
    const toTrash = articles.filter(a => ids.includes(a.id)).map(a => ({ ...a, deleted_at: now }));
    setArticles(prev => prev.filter(a => !ids.includes(a.id)));
    setTrashedArticles(prev => [...prev, ...toTrash]);
  };

  const handleRestoreArticle = async (id) => {
    await supabase.from("articles").update({ deleted_at: null }).eq("id", id);
    const restored = trashedArticles.find(a => a.id === id);
    setTrashedArticles(prev => prev.filter(a => a.id !== id));
    if (restored) setArticles(prev => [...prev, { ...restored, deleted_at: null }]);
  };

  const handlePermanentDeleteArticle = async (id) => {
    if (!window.confirm(lang === "ar" ? "حذف نهائي لا يمكن التراجع عنه؟" : "Suppression définitive et irréversible ?")) return;
    await supabase.from("articles").delete().eq("id", id);
    setTrashedArticles(prev => prev.filter(a => a.id !== id));
  };

  const handleTransfer = async (sourceArticle, qty, destCentreId, bulletin, saison, note) => {
    const allCentres = centresForTransfer?.length ? centresForTransfer : centres;
    const fromCentre = allCentres.find(c => c.id === sourceArticle.centre_id);
    const toCentre = allCentres.find(c => c.id === destCentreId);
    const fromLabel = fromCentre?.name || "—";
    const toLabel = toCentre?.name || "—";
    const bulletinNote = bulletin ? ` [${bulletin}]` : "";

    // 1. Deduct qty from source
    const newSourceQty = sourceArticle.qty - qty;
    const { data: updatedSource } = await supabase.from("articles")
      .update({ qty: newSourceQty })
      .eq("id", sourceArticle.id)
      .select().single();
    if (updatedSource) setArticles(prev => prev.map(a => a.id === sourceArticle.id ? updatedSource : a));

    // 2. Log outgoing movement on source centre
    const noteOut = `${t.articles.transferNote} ${fromLabel} → ${toLabel}${bulletinNote}`;
    const { data: histOut } = await supabase.from("history").insert({
      article_id: sourceArticle.id, type: "out", qty, note: note || noteOut,
      user_id: userId, centre_id: sourceArticle.centre_id,
      saison: saison || null, dest_centre_id: destCentreId,
    }).select().single();
    if (histOut) setHistoryItems(prev => [histOut, ...prev]);

    // 3. Find existing article in destination centre (same name+category)
    const destArticle = articles.find(a =>
      a.id !== sourceArticle.id &&
      a.name.trim().toLowerCase() === sourceArticle.name.trim().toLowerCase() &&
      a.category.trim().toLowerCase() === sourceArticle.category.trim().toLowerCase() &&
      a.centre_id === destCentreId
    );

    const noteIn = `${t.articles.transferNote} ${fromLabel} → ${toLabel}${bulletinNote}`;

    if (destArticle) {
      const { data: updatedDest } = await supabase.from("articles")
        .update({ qty: destArticle.qty + qty })
        .eq("id", destArticle.id).select().single();
      if (updatedDest) setArticles(prev => prev.map(a => a.id === destArticle.id ? updatedDest : a));
      const { data: histIn } = await supabase.from("history").insert({
        article_id: destArticle.id, type: "in", qty, note: note || noteIn,
        user_id: userId, centre_id: destCentreId, saison: saison || null,
      }).select().single();
      if (histIn) setHistoryItems(prev => [histIn, ...prev]);
    } else {
      const payload = {
        name: sourceArticle.name, category: sourceArticle.category,
        qty, unit: sourceArticle.unit, threshold: sourceArticle.threshold,
        location_path: [], supplier: sourceArticle.supplier || "",
        reference: sourceArticle.reference || "", price: sourceArticle.price,
        buyer: sourceArticle.buyer || "", date_in: null, date_out: null,
        user_id: userId, centre_id: destCentreId,
      };
      const { data: newDest } = await supabase.from("articles").insert(payload).select().single();
      if (newDest) {
        setArticles(prev => [...prev, newDest]);
        const { data: histIn } = await supabase.from("history").insert({
          article_id: newDest.id, type: "in", qty, note: note || noteIn,
          user_id: userId, centre_id: destCentreId, saison: saison || null,
        }).select().single();
        if (histIn) setHistoryItems(prev => [histIn, ...prev]);
      }
    }
  };

  const handleImport = async (csv) => {
    try {
      const lines = csv.trim().split("\n");
      const nLevels = locLevels.length;
      const newArticles = lines.slice(1).map(line => {
        const cols = parseEquipmentCSVLine(line).map(s => s?.trim());
        // Order matches exportCSV: Nom, Catégorie, [locLevels...], Unité, Quantité, Seuil, Fournisseur, Référence, Prix, Acheteur, DateEntrée, DateSortie
        const name = cols[0];
        const category = cols[1];
        const unit = cols[2 + nLevels] || "";
        const qty = cols[3 + nLevels];
        const threshold = cols[4 + nLevels];
        const supplier = cols[5 + nLevels] || "";
        const reference = cols[6 + nLevels] || "";
        const price = cols[7 + nLevels];
        const buyer = cols[8 + nLevels] || "";
        const date_in = cols[9 + nLevels] || null;
        const date_out = cols[10 + nLevels] || null;
        return {
          name, category,
          qty: qty ? Number(qty) || 0 : 0,
          unit,
          threshold: threshold ? Number(threshold) || 5 : 5,
          location_path: [], supplier, reference,
          price: price ? Number(price) : null,
          buyer, date_in, date_out,
          user_id: userId,
        };
      }).filter(a => a.name);

      // Split into updates (existing name+category) and inserts (new)
      const toInsert = [];
      const toUpdate = [];
      for (const row of newArticles) {
        const dup = findDuplicate(row.name, row.category);
        if (dup) toUpdate.push({ ...row, id: dup.id });
        else toInsert.push(row);
      }

      let updatedRows = [];
      if (toUpdate.length) {
        const results = await Promise.all(toUpdate.map(({ id, ...payload }) =>
          supabase.from("articles").update(payload).eq("id", id).select().single()
        ));
        updatedRows = results.map(r => r.data).filter(Boolean);
        results.forEach(r => { if (r.error) console.error("Import update error:", r.error); });
      }

      let insertedRows = [];
      if (toInsert.length) {
        const { data, error } = await supabase.from("articles").insert(toInsert).select();
        if (error) console.error("Import insert error:", error);
        insertedRows = data || [];
      }

      if (updatedRows.length || insertedRows.length) {
        setArticles(prev => {
          const updatedMap = Object.fromEntries(updatedRows.map(r => [r.id, r]));
          const merged = prev.map(a => updatedMap[a.id] || a);
          return [...merged, ...insertedRows];
        });
      }
    } catch (e) { console.error("Import parse error:", e); alert(t.io.importError); }
  };

  // ── Location handlers ──
  const handleAddLocNode = async (parentId, name) => {
    const cid = isSuperAdmin ? (centreFilter || centres[0]?.id) : centreId;
    const { data } = await supabase.from("location_tree").insert({ parent_id: parentId, name, user_id: userId, centre_id: cid }).select().single();
    if (data) setLocRows(prev => [...prev, data]);
  };

  const handleRenameLocNode = async (id, name) => {
    await supabase.from("location_tree").update({ name }).eq("id", id);
    setLocRows(prev => prev.map(r => r.id === id ? { ...r, name } : r));
  };

  const handleDeleteLocNode = async (id) => {
    // Cascade handled by DB foreign key
    await supabase.from("location_tree").delete().eq("id", id);
    setLocRows(prev => prev.filter(r => r.id !== id));
  };

  // ── History handler ──
  const handleAddMovement = async (form) => {
    const { data } = await supabase.from("history").insert({ ...form, user_id: userId, centre_id: centreId }).select().single();
    if (data) setHistoryItems(prev => [data, ...prev]);
    // Update article qty
    const article = articles.find(a => a.id === form.article_id);
    if (!article) return;
    const delta = form.type === "out" ? -form.qty : form.type === "adjust" ? form.qty - article.qty : form.qty;
    const newQty = Math.max(0, article.qty + delta);
    await supabase.from("articles").update({ qty: newQty }).eq("id", article.id);
    setArticles(prev => prev.map(a => a.id === article.id ? { ...a, qty: newQty } : a));
  };

  // ── Config handlers ──
  const handleSaveLabels = async (labels) => {
    setMenuLabels(labels);
    // Save to menu_labels table with correct scope
    const targetCentreId = isSuperAdmin ? (centreFilter || null) : (profile?.centre_id || null);
    await saveMenuLabels(labels, targetCentreId);
  };
  const handleSaveFieldConfig = async (cfg) => { setFieldConfig(cfg); await setConfig(userId, "fieldConfig", cfg); };
  const handleSaveLocLevels = async (newLevels) => {
    setLocLevels(newLevels);
    // Save to location_levels table for current centre
    const cid = isSuperAdmin ? (centreFilter || centres[0]?.id) : profile?.centre_id;
    if (!cid) return;
    // Upsert each level
    await Promise.all(newLevels.map((lv, i) =>
      supabase.from("location_levels").upsert({
        centre_id: cid,
        level_num: lv.level_num || i + 1,
        label_fr: lv.label_fr || `Niveau ${i + 1}`,
        label_ar: lv.label_ar || `مستوى ${i + 1}`,
      }, { onConflict: "centre_id,level_num" })
    ));
    // Delete removed levels
    const maxLevel = newLevels.length;
    await supabase.from("location_levels").delete().eq("centre_id", cid).gt("level_num", maxLevel);
  };
  const handleVisibleColsChange = async (cols) => { setVisibleCols(cols); await setConfig(userId, "visibleCols", cols); };
  const handleLangChange = async () => {
    const newLang = lang === "fr" ? "ar" : "fr";
    setLang(newLang);
    if (userId) await setConfig(userId, "lang", newLang);
  };

  const handleResetStockData = async () => {
    await supabase.from("history").delete().eq("centre_id", centreId);
    await supabase.from("articles").delete().eq("centre_id", centreId);
    await supabase.from("location_tree").delete().eq("centre_id", centreId);
    setArticles([]);
    setLocRows([]);
    setHistoryItems([]);
  };

  const handleExportStockData = () => {
    downloadJSON({
      module: "stock",
      exported_at: new Date().toISOString(),
      articles,
      location_tree: locRows,
      history: historyItems,
      app_config: { menuLabels, fieldConfig, locLevels, visibleCols, lang },
    }, `stockbureau-stock-backup-${new Date().toISOString().slice(0, 10)}.json`);
  };

  const handleImportStockData = (file) => {
    readJSONFile(file, async (err, data) => {
      if (err || !data || data.module !== "stock") {
        alert(lang === "ar" ? "ملف غير صالح" : "Fichier invalide");
        return;
      }
      const confirmMsg = lang === "ar"
        ? "سيتم حذف جميع البيانات الحالية واستبدالها بمحتوى الملف. هل أنت متأكد؟"
        : "Toutes les données actuelles seront supprimées et remplacées par le contenu du fichier. Confirmer ?";
      if (!window.confirm(confirmMsg)) return;

      // 1. Wipe existing data
      await supabase.from("history").delete().eq("centre_id", centreId);
      await supabase.from("articles").delete().eq("centre_id", centreId);
      await supabase.from("location_tree").delete().eq("centre_id", centreId);

      // 2. Restore location_tree first (articles reference it via location_path)
      let restoredLocRows = [];
      if (data.location_tree?.length) {
        const rows = data.location_tree.map(r => ({ ...r, user_id: userId }));
        const { data: inserted, error } = await supabase.from("location_tree").insert(rows).select();
        if (error) console.error("Restore location_tree error:", error);
        restoredLocRows = inserted || [];
      }

      // 3. Restore articles
      let restoredArticles = [];
      if (data.articles?.length) {
        const rows = data.articles.map(({ id, created_at, updated_at, ...rest }) => ({ ...rest, user_id: userId }));
        const { data: inserted, error } = await supabase.from("articles").insert(rows).select();
        if (error) console.error("Restore articles error:", error);
        restoredArticles = inserted || [];
      }

      // 4. Restore history
      let restoredHistory = [];
      if (data.history?.length) {
        const rows = data.history.map(({ id, created_at, ...rest }) => ({ ...rest, user_id: userId }));
        const { data: inserted, error } = await supabase.from("history").insert(rows).select();
        if (error) console.error("Restore history error:", error);
        restoredHistory = inserted || [];
      }

      // 5. Restore app_config
      if (data.app_config) {
        const cfg = data.app_config;
        if (cfg.menuLabels) { setMenuLabels(cfg.menuLabels); await setConfig(userId, "menuLabels", cfg.menuLabels); }
        if (cfg.fieldConfig) { setFieldConfig(cfg.fieldConfig); await setConfig(userId, "fieldConfig", cfg.fieldConfig); }
        if (cfg.locLevels) { setLocLevels(cfg.locLevels); await setConfig(userId, "locLevels", cfg.locLevels); }
        if (cfg.visibleCols) { setVisibleCols(cfg.visibleCols); await setConfig(userId, "visibleCols", cfg.visibleCols); }
      }

      setLocRows(restoredLocRows);
      setArticles(restoredArticles);
      setHistoryItems(restoredHistory);
      alert(lang === "ar" ? "تمت الاستعادة بنجاح" : "Restauration terminée avec succès");
    });
  };

  const [activeModule, setActiveModule] = useState("stock");
  const [eqView, setEqView] = useState("dashboard");

  const moduleLabels = {
    stock: { fr: "Stock consommables", ar: "مخزون المستهلكات" },
    equipment: { fr: "Inventaire équipements", ar: "جرد التجهيزات" },
  };

  const stockNavItems = [
    { key: "dashboard", labelFr: navLabels.dashboard, labelAr: menuLabels.ar?.dashboard || t.nav.dashboard, icon: "◉" },
    { key: "articles", labelFr: navLabels.articles, labelAr: menuLabels.ar?.articles || t.nav.articles, icon: "☰" },
    { key: "history", labelFr: navLabels.history, labelAr: menuLabels.ar?.history || t.nav.history, icon: "↻" },
    { key: "trash", labelFr: `🗑 Corbeille${trashedArticles.length ? ` (${trashedArticles.length})` : ""}`, labelAr: `🗑 سلة المحذوفات${trashedArticles.length ? ` (${trashedArticles.length})` : ""}`, icon: "🗑" },
    ...(canAccessSettings ? [{ key: "settings", labelFr: "Paramètres", labelAr: "الإعدادات", icon: "⚙" }] : []),
  ];

  const eqNavItems = [
    { key: "dashboard", labelFr: navLabels.dashboard, labelAr: menuLabels.ar?.dashboard || t.nav.dashboard, icon: "◉" },
    { key: "list", labelFr: lang === "ar" ? "التجهيزات" : "Équipements", labelAr: "التجهيزات", icon: "🏢" },
    { key: "history", labelFr: navLabels.history, labelAr: menuLabels.ar?.history || t.nav.history, icon: "↻" },
    { key: "trash", labelFr: "🗑 Corbeille", labelAr: "🗑 سلة المحذوفات", icon: "🗑" },
    ...(canAccessSettings ? [{ key: "settings", labelFr: "Paramètres", labelAr: "الإعدادات", icon: "⚙" }] : []),
  ];

  const sidebarBg = activeModule === "equipment" ? "#0c4a6e" : "#1e1b4b";
  const sidebarAccent = activeModule === "equipment" ? "#0e7490" : "#4f46e5";
  const sidebarBorder = activeModule === "equipment" ? "rgba(255,255,255,0.08)" : "#2d2a5e";
  const sidebarText = activeModule === "equipment" ? "#a5f3fc" : "#a5b4fc";
  const sidebarSubtext = activeModule === "equipment" ? "#67e8f9" : "#818cf8";

  const currentView = activeModule === "stock" ? view : eqView;
  const currentNavItems = activeModule === "stock" ? stockNavItems : eqNavItems;

  const handleNavClick = (key) => {
    if (activeModule === "stock") setView(key);
    else setEqView(key);
  };

  const pageTitle = activeModule === "admin"
    ? (lang === "ar" ? "إدارة المراكز" : "Gestion des centres")
    : activeModule === "stock"
    ? (stockNavItems.find(n => n.key === view)?.[lang === "ar" ? "labelAr" : "labelFr"] || navLabels[view])
    : (eqNavItems.find(n => n.key === eqView)?.[lang === "ar" ? "labelAr" : "labelFr"] || "");

  if (authLoading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f4f0" }}><Spinner /></div>;
  if (!session) return <Login t={t} />;
  if (!profile) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f4f0" }}><Spinner /></div>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { width: 100%; min-height: 100vh; max-width: 100%; }
        body { background: #f5f4f0; }
        tr:hover td { background: #f0f0ff !important; }
        ::-webkit-scrollbar { width: 6px; height: 6px; } ::-webkit-scrollbar-track { background: #f3f4f6; } ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
      `}</style>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { width: 100%; min-height: 100vh; max-width: 100%; }
        body { background: #f5f4f0; overscroll-behavior-x: none; overscroll-behavior-y: auto; touch-action: pan-y; }
        html { overscroll-behavior-x: none; }
        * { touch-action: pan-y pinch-zoom; }
        table, .table-wrapper, input, select, button { touch-action: auto; }
        tr:hover td { background: #f0f0ff !important; }

        /* Visible scrollbars */
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: #e5e7eb; border-radius: 5px; }
        ::-webkit-scrollbar-thumb { background: #9ca3af; border-radius: 5px; border: 2px solid #e5e7eb; }
        ::-webkit-scrollbar-thumb:hover { background: #6b7280; }
        ::-webkit-scrollbar-corner { background: #e5e7eb; }

        /* Main content area — allow both scroll directions */
        .main-content {
          overflow-x: auto;
          overflow-y: auto;
          overscroll-behavior-x: contain;
        }

        /* Table wrappers — horizontal scroll with visible bar */
        .table-wrapper {
          overflow-x: auto;
          overflow-y: visible;
          overscroll-behavior-x: contain;
        }
      `}</style>
      <div style={{ display: "flex", minHeight: "100vh", direction: t.dir, fontFamily: "'DM Sans',sans-serif" }}>
        {/* UNIFIED SIDEBAR */}
        <div style={{ width: 250, background: sidebarBg, display: "flex", flexDirection: "column", flexShrink: 0, position: "fixed", top: 0, bottom: 0, overflowY: "auto", transition: "background 0.3s", [t.dir === "rtl" ? "right" : "left"]: 0 }}>

          {/* App name */}
          <div style={{ padding: "24px 20px 16px", borderBottom: `1px solid ${sidebarBorder}` }}>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>{t.appName}</div>
            <div style={{ fontSize: 12, color: sidebarSubtext, marginTop: 2, fontFamily: "'DM Sans',sans-serif" }}>{t.tagline}</div>
          </div>

          {/* Centre info */}
          <div style={{ padding: "10px 12px", borderBottom: `1px solid ${sidebarBorder}` }}>
            {isSuperAdmin ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", fontFamily: "'DM Sans',sans-serif" }}>{profile?.display_name || "Super Administrateur"}</div>
                  <div style={{ fontSize: 10, color: sidebarSubtext, fontFamily: "'DM Sans',sans-serif" }}>{lang === "ar" ? "مدير عام" : "Super Admin"}</div>
                </div>
              </div>
            ) : isAllCentres ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", fontFamily: "'DM Sans',sans-serif" }}>{profile?.display_name || "—"}</div>
                  <div style={{ fontSize: 10, color: sidebarSubtext, fontFamily: "'DM Sans',sans-serif" }}>{lang === "ar" ? "كل المراكز" : "Tous les centres"}</div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", fontFamily: "'DM Sans',sans-serif" }}>
                    {centres[0]?.name || "—"}
                  </div>
                  <div style={{ fontSize: 10, color: sidebarSubtext, fontFamily: "'DM Sans',sans-serif" }}>
                    {profile?.display_name || ""}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Module switcher */}
          <div style={{ padding: "12px 12px 8px" }}>
            <div style={{ fontSize: 10, color: sidebarSubtext, textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 4px", marginBottom: 8, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>
              {lang === "ar" ? "الوحدة" : "Module"}
            </div>
            <button onClick={() => { setActiveModule("stock"); setView("dashboard"); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, border: activeModule === "stock" ? "none" : `0.5px solid rgba(255,255,255,0.15)`, cursor: "pointer", marginBottom: 5, background: activeModule === "stock" ? "#4f46e5" : "rgba(255,255,255,0.05)", textAlign: t.dir === "rtl" ? "right" : "left", transition: "all 0.2s" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>📦</span>
              <div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, color: "#fff" }}>{moduleLabels.stock[lang]}</div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: activeModule === "stock" ? "#c7d2fe" : sidebarText }}>{lang === "ar" ? "ورق · قرطاسية" : "Bureautique · ménager"}</div>
              </div>
            </button>
            <button onClick={() => { setActiveModule("equipment"); setEqView("dashboard"); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, border: activeModule === "equipment" ? "none" : `0.5px solid rgba(255,255,255,0.15)`, cursor: "pointer", marginBottom: 4, background: activeModule === "equipment" ? "#0e7490" : "rgba(255,255,255,0.05)", textAlign: t.dir === "rtl" ? "right" : "left", transition: "all 0.2s" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>🏢</span>
              <div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, color: "#fff" }}>{moduleLabels.equipment[lang]}</div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: activeModule === "equipment" ? "#a5f3fc" : sidebarText }}>{lang === "ar" ? "أثاث · تجهيزات" : "Mobilier · matériel"}</div>
              </div>
            </button>
          </div>

          <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "4px 12px" }} />

          {/* Contextual nav — hidden when under Gérer les centres */}
          <nav style={{ flex: 1, padding: "8px 12px" }}>
            {activeModule !== "admin" && currentNavItems.map(item => (
              <button key={item.key} onClick={() => handleNavClick(item.key)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "10px 13px", borderRadius: 10, border: "none", cursor: "pointer", marginBottom: 3, background: currentView === item.key ? sidebarAccent : "transparent", color: currentView === item.key ? "#fff" : item.key === "settings" ? sidebarSubtext : sidebarText, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 15, transition: "all 0.15s", textAlign: t.dir === "rtl" ? "right" : "left" }}>
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                {lang === "ar" ? item.labelAr : item.labelFr}
              </button>
            ))}
          </nav>

          {/* Bottom */}
          <div style={{ padding: "12px 12px", borderTop: `1px solid ${sidebarBorder}`, display: "flex", flexDirection: "column", gap: 8 }}>
            {isSuperAdmin && (
              <button onClick={() => { setView("admin"); setActiveModule("admin"); }}
                style={{ width: "100%", padding: "9px 14px", borderRadius: 10, border: `1px solid rgba(255,255,255,0.15)`, background: activeModule === "admin" ? "#be185d" : "#db2777", color: "#fff", border: "1px solid #be185d", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                ⚙ {lang === "ar" ? "إدارة المراكز" : "Gérer les centres"}
              </button>
            )}
            <button onClick={handleLangChange}
              style={{ width: "100%", padding: "9px 14px", borderRadius: 10, border: `1px solid rgba(255,255,255,0.15)`, background: "transparent", color: sidebarText, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              🌐 {t.langSwitch}
            </button>
            <button onClick={() => supabase.auth.signOut()}
              style={{ width: "100%", padding: "9px 14px", borderRadius: 10, border: `1px solid rgba(255,255,255,0.15)`, background: "transparent", color: sidebarText, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              🔓 {t.auth.logout}
            </button>
          </div>
        </div>

        {/* MAIN */}
        <div style={{ [t.dir === "rtl" ? "marginRight" : "marginLeft"]: 250, flex: 1, minWidth: 0, padding: 28, minHeight: "100vh", overscrollBehaviorX: "contain", overflowX: "auto" }}>
          <div style={{ marginBottom: 24, width: "100%" }}>
            {(isSuperAdmin || isAllCentres) && activeModule !== "admin" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 14px", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#92400e", fontFamily: "'DM Sans',sans-serif", flexShrink: 0 }}>
                  {lang === "ar" ? "المركز :" : "Centre :"}
                </span>
                <select value={centreFilter || ""} onChange={e => setCentreFilter(e.target.value || null)}
                  style={{ padding: "5px 10px", border: "1px solid #fcd34d", borderRadius: 7, fontSize: 13, fontFamily: "'DM Sans',sans-serif", background: "#fff", cursor: "pointer", outline: "none" }}>
                  <option value="">{lang === "ar" ? "كل المراكز" : "Tous les centres"}</option>
                  {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {centreFilter && (
                  <button onClick={() => setCentreFilter(null)}
                    style={{ fontSize: 11, color: "#92400e", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                    ✕ {lang === "ar" ? "إلغاء الفلتر" : "Effacer"}
                  </button>
                )}
              </div>
            )}
            <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 26, fontWeight: 900, color: "#1e1b4b", letterSpacing: "-0.5px" }}>{pageTitle}</h1>
            <span style={{ display: "inline-block", marginTop: 5, background: activeModule === "equipment" ? "#cffafe" : "#ede9fe", color: activeModule === "equipment" ? "#0e7490" : "#5b21b6", padding: "3px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>
              {moduleLabels[activeModule]?.[lang]}
            </span>
          </div>
          {activeModule === "admin" && isSuperAdmin ? (
            <AdminPanel lang={lang} userId={userId} onLevelsUpdated={() => setLocLevelsVersion(v => v + 1)} />
          ) : activeModule === "admin" && !isSuperAdmin ? (
            <div style={{ padding: 40, color: "#ef4444", fontFamily: "'DM Sans',sans-serif" }}>Accès refusé</div>
          ) : dataLoading ? <Spinner /> : <>
            {activeModule === "stock" && view === "dashboard" && <Dashboard t={t} lang={lang} articles={articles} locRows={locRows} fieldConfig={fieldConfig} centreFilter={centreFilter} onNavigate={(filter) => { setArticleFilter({ ...filter, _nonce: Date.now() }); setView("articles"); }} />}
            {activeModule === "stock" && view === "articles" && <Articles t={t} lang={lang} articles={articles} locRows={locRows} locLevels={locLevels} categories={categories} onAdd={handleAddArticle} onDelete={handleDeleteArticle} onDeleteMany={handleDeleteManyArticles} onTransfer={handleTransfer} onImport={handleImport} fieldConfig={fieldConfig} visibleCols={visibleCols} onVisibleColsChange={handleVisibleColsChange} initialFilter={articleFilter} centreFilter={centreFilter} onCentreFilterChange={setCentreFilter} userId={userId} centres={centres} centresForTransfer={centresForTransfer} showCentreFilter={isSuperAdmin || isAllCentres} centreId={centreId} />}
            {activeModule === "stock" && view === "locations" && <Locations t={t} lang={lang} locRows={centreFilter ? locRows.filter(r => r.centre_id === centreFilter) : locRows} locLevels={locLevels} articles={articles} onAdd={handleAddLocNode} onRename={handleRenameLocNode} onDelete={handleDeleteLocNode} readOnly={isOperator} />}
            {activeModule === "stock" && view === "history" && <History t={t} lang={lang} history={historyItems} articles={articles} onAdd={handleAddMovement} centreFilter={centreFilter} centreId={centreId} />}
            {activeModule === "stock" && view === "settings" && <Settings t={t} lang={lang} menuLabels={menuLabels} onSaveLabels={handleSaveLabels} fieldConfig={fieldConfig} onSaveFieldConfig={handleSaveFieldConfig} categories={categories} locLevels={locLevels} onSaveLocLevels={handleSaveLocLevels} onResetData={handleResetStockData} userId={userId} isSuperAdmin={isSuperAdmin} />}
            {activeModule === "stock" && view === "trash" && (
              <TrashView lang={lang} items={trashedArticles} type="article" locRows={locRows}
                onRestore={handleRestoreArticle} onDelete={handlePermanentDeleteArticle} />
            )}
            {activeModule === "equipment" && (
              <EquipmentModule lang={lang} userId={userId} centreId={centreId} locRows={locRows} locLevels={locLevels} eqView={eqView} onEqViewChange={setEqView} onAddLocNode={handleAddLocNode} onRenameLocNode={handleRenameLocNode} onDeleteLocNode={handleDeleteLocNode} equipmentFilter={equipmentFilter} onEquipmentFilterChange={setEquipmentFilter} centres={centres} centreFilter={centreFilter} onCentreFilterChange={setCentreFilter} isSuperAdmin={isSuperAdmin} isOperator={isOperator} centresForTransfer={centresForTransfer} showCentreFilter={isSuperAdmin || isAllCentres} />
            )}
          </>}
        </div>
      </div>
      <ScrollNav />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// MODULE ÉQUIPEMENTS
// ═══════════════════════════════════════════════════════════════

// ─── EQUIPMENT TRANSLATIONS ───────────────────────────────────
const TE = {
  fr: {
    dashboard: { title: "Tableau de bord", total: "Total équipements", active: "En activité", broken: "En panne", other: "Autres", byType: "Répartition par type", byState: "Par état", recentInterventions: "Interventions récentes", noInterventions: "Aucune intervention enregistrée" },
    list: { title: "Équipements", add: "Ajouter", search: "Rechercher...", filterType: "Tous les types", filterState: "Tous les états", noResults: "Aucun équipement trouvé", name: "Désignation", type: "Type", state: "État", location: "Emplacement", responsible: "Responsable", serial: "N° série", brand: "Marque", model: "Modèle", ref: "Réf. interne", acquired: "Acquis le", price: "Prix achat", supplier: "Fournisseur", notes: "Notes", actions: "Actions", edit: "Modifier", delete: "Supprimer", confirmDelete: "Supprimer cet équipement ?", columns: "Colonnes", viewInterventions: "Interventions" },
    form: { addTitle: "Nouvel équipement", editTitle: "Modifier l'équipement", name: "Désignation", namePh: "Ex: Climatiseur Daikin 12000 BTU", type: "Type", typePh: "Ex: Climatiseur", state: "État", statePh: "Sélectionner un état", responsible: "Responsable", responsiblePh: "Ex: M. Drira", serial: "Numéro de série", serialPh: "Ex: DK-2023-041", ref: "Référence interne", refPh: "Ex: CLM-001", brand: "Marque", brandPh: "Ex: Daikin", model: "Modèle", modelPh: "Ex: FTXB35C", acquired: "Date d'acquisition", price: "Prix d'achat (DT)", supplier: "Fournisseur", supplierPh: "Ex: Climatec", notes: "Notes", notesPh: "Observations, historique...", location: "Emplacement", save: "Enregistrer", cancel: "Annuler", selectLevel: "Sélectionner" },
    interventions: { title: "Interventions", add: "Ajouter une intervention", date: "Date", type: "Type", typePh: "Ex: Maintenance préventive", technician: "Technicien", technicianPh: "Ex: M. Ben Salah", description: "Description", descriptionPh: "Détails de l'intervention...", cost: "Coût (DT)", save: "Enregistrer", cancel: "Annuler", noInterventions: "Aucune intervention", confirmDelete: "Supprimer cette intervention ?" },
    states: { title: "États des équipements", add: "Ajouter un état", namePh: "Nom de l'état", colorLabel: "Couleur", save: "Ajouter", edit: "Modifier", delete: "Supprimer", confirmDelete: "Supprimer cet état ?", noStates: "Aucun état défini" },
    settings: { title: "Paramètres équipements", statesTitle: "États", statesDesc: "Gérez les états possibles d'un équipement.", fieldsTitle: "Champs affichés", fieldsDesc: "Activez ou désactivez les colonnes du tableau.", save: "Enregistrer", saved: "Enregistré ✓", reset: "Réinitialiser" },
  },
  ar: {
    dashboard: { title: "لوحة التحكم", total: "إجمالي التجهيزات", active: "نشط", broken: "معطل", other: "أخرى", byType: "التوزيع حسب النوع", byState: "حسب الحالة", recentInterventions: "التدخلات الأخيرة", noInterventions: "لا توجد تدخلات مسجلة" },
    list: { title: "التجهيزات", add: "إضافة", search: "بحث...", filterType: "جميع الأنواع", filterState: "جميع الحالات", noResults: "لا توجد نتائج", name: "التسمية", type: "النوع", state: "الحالة", location: "المكان", responsible: "المسؤول", serial: "الرقم التسلسلي", brand: "العلامة", model: "الطراز", ref: "المرجع الداخلي", acquired: "تاريخ الاقتناء", price: "سعر الشراء", supplier: "المورد", notes: "ملاحظات", actions: "إجراءات", edit: "تعديل", delete: "حذف", confirmDelete: "هل تريد حذف هذا التجهيز؟", columns: "الأعمدة", viewInterventions: "التدخلات" },
    form: { addTitle: "تجهيز جديد", editTitle: "تعديل التجهيز", name: "التسمية", namePh: "مثال: مكيف دايكن", type: "النوع", typePh: "مثال: مكيف هواء", state: "الحالة", statePh: "اختر حالة", responsible: "المسؤول", responsiblePh: "مثال: السيد درة", serial: "الرقم التسلسلي", serialPh: "مثال: DK-2023-041", ref: "المرجع الداخلي", refPh: "", brand: "العلامة التجارية", brandPh: "", model: "الطراز", modelPh: "", acquired: "تاريخ الاقتناء", price: "سعر الشراء (د.ت)", supplier: "المورد", supplierPh: "", notes: "ملاحظات", notesPh: "تفاصيل...", location: "المكان", save: "حفظ", cancel: "إلغاء", selectLevel: "اختر" },
    interventions: { title: "التدخلات", add: "إضافة تدخل", date: "التاريخ", type: "النوع", typePh: "مثال: صيانة وقائية", technician: "التقني", technicianPh: "", description: "الوصف", descriptionPh: "تفاصيل التدخل...", cost: "التكلفة (د.ت)", save: "حفظ", cancel: "إلغاء", noInterventions: "لا توجد تدخلات", confirmDelete: "هل تريد حذف هذا التدخل؟" },
    states: { title: "حالات التجهيزات", add: "إضافة حالة", namePh: "اسم الحالة", colorLabel: "اللون", save: "إضافة", edit: "تعديل", delete: "حذف", confirmDelete: "هل تريد حذف هذه الحالة؟", noStates: "لا توجد حالات" },
    settings: { title: "إعدادات التجهيزات", statesTitle: "الحالات", statesDesc: "أدر الحالات الممكنة للتجهيز.", fieldsTitle: "الحقول المعروضة", fieldsDesc: "فعّل أو عطّل أعمدة الجدول.", save: "حفظ", saved: "تم الحفظ ✓", reset: "إعادة التعيين" },
  },
};

const EQ_COLUMNS = [
  { key: "type" }, { key: "state" }, { key: "location" }, { key: "responsible" },
  { key: "serial" }, { key: "brand" }, { key: "model" }, { key: "ref" },
  { key: "acquired" }, { key: "price" }, { key: "supplier" }, { key: "notes" },
];
const DEFAULT_EQ_COLS = {
  type: true, state: true, location: true, responsible: true,
  serial: false, brand: false, model: false, ref: false,
  acquired: false, price: false, supplier: false, notes: false,
};

// ─── EQUIPMENT CSV EXPORT/IMPORT ──────────────────────────────
function exportEquipmentCSV(equipments, states, locRows, locLevels) {
  const stateMap = Object.fromEntries(states.map(s => [s.id, s.label]));
  const header = ["Désignation", "Type", "État", ...locLevels, "Responsable", "N° série", "Référence interne", "Marque", "Modèle", "Date acquisition", "Prix achat", "Fournisseur", "Notes"].join(",");
  const esc = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const rows = equipments.map(e => {
    const pathParts = (e.location_path || []).map(id => locRows.find(r => r.id === id)?.name || "");
    while (pathParts.length < locLevels.length) pathParts.push("");
    return [
      e.name, e.type, e.state_id ? (stateMap[e.state_id] || "") : "",
      ...pathParts,
      e.responsible || "", e.serial_number || "", e.internal_ref || "",
      e.brand || "", e.model || "", e.date_acquired || "",
      e.purchase_price || "", e.supplier || "", e.notes || "",
    ].map(esc).join(",");
  });
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const el = document.createElement("a"); el.href = url; el.download = "equipements.csv"; el.click();
  URL.revokeObjectURL(url);
}

function parseEquipmentCSVLine(line) {
  // Simple CSV parser supporting quoted fields
  const result = [];
  let cur = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else cur += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { result.push(cur); cur = ""; }
      else cur += c;
    }
  }
  result.push(cur);
  return result;
}

// ─── FULL DATA EXPORT / IMPORT (JSON BACKUP) ──────────────────
function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const el = document.createElement("a"); el.href = url; el.download = filename; el.click();
  URL.revokeObjectURL(url);
}

function readJSONFile(file, callback) {
  const r = new FileReader();
  r.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      callback(null, data);
    } catch (e) {
      callback(e, null);
    }
  };
  r.readAsText(file);
}

// ─── EQUIPMENT DASHBOARD ──────────────────────────────────────
function EquipmentDashboard({ lang, equipments, states, interventions, locRows, onNavigate, centreFilter }) {
  const te = TE[lang].dashboard;
  const filteredEquipments = useMemo(() => equipments.filter(e =>
    !centreFilter || e.centre_id === centreFilter
  ), [equipments, centreFilter]);

  const total = filteredEquipments.length;
  const stateMap = Object.fromEntries(states.map(s => [s.id, s]));
  const activeState = states.find(s => s.label === "بصدد الإستعمال" || s.label === "En activité");
  const brokenState = states.find(s => s.label === "غير صالح للإستعمال" || s.label === "En panne");
  const active = activeState ? filteredEquipments.filter(e => e.state_id === activeState.id).length : 0;
  const broken = brokenState ? filteredEquipments.filter(e => e.state_id === brokenState.id).length : 0;
  const otherStateIds = states.filter(s => s.id !== activeState?.id && s.id !== brokenState?.id).map(s => s.id);
  const typeGroups = filteredEquipments.reduce((acc, e) => { acc[e.type] = (acc[e.type] || 0) + 1; return acc; }, {});
  const stateGroups = filteredEquipments.reduce((acc, e) => {
    const label = e.state_id ? (stateMap[e.state_id]?.label || "—") : "—";
    acc[label] = (acc[label] || 0) + 1; return acc;
  }, {});
  const maxType = Math.max(...Object.values(typeGroups), 1);
  const filteredIds = new Set(filteredEquipments.map(e => e.id));
  const filteredInterventions = interventions.filter(i => filteredIds.has(i.equipment_id));
  const eqMap = Object.fromEntries(filteredEquipments.map(e => [e.id, e.name]));
  const goTo = (filter) => onNavigate && onNavigate(filter);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 32 }}>
        <StatCard label={te.total} value={total} color="#0e7490" icon="🏢" onClick={() => goTo({})} />
        <StatCard label={te.active} value={active} color="#22c55e" icon="✅" onClick={activeState ? () => goTo({ stateId: activeState.id }) : undefined} />
        <StatCard label={te.broken} value={broken} color="#ef4444" icon="🚨" onClick={brokenState ? () => goTo({ stateId: brokenState.id }) : undefined} />
        <StatCard label={te.other} value={total - active - broken} color="#9ca3af" icon="📋" onClick={otherStateIds.length ? () => goTo({ stateIds: otherStateIds }) : undefined} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 20 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 16 }}>{te.byType}</div>
          {Object.keys(typeGroups).length === 0 ? <div style={{ color: "#9ca3af", fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>—</div>
            : Object.entries(typeGroups).map(([type, count]) => (
              <div key={type} onClick={() => goTo({ type })} style={{ marginBottom: 12, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#374151", marginBottom: 4 }}>
                  <span>{type}</span><span style={{ fontWeight: 600 }}>{count}</span>
                </div>
                <div style={{ background: "#f3f4f6", borderRadius: 99, height: 8 }}>
                  <div style={{ background: "#0e7490", borderRadius: 99, height: 8, width: `${(count / maxType) * 100}%` }} />
                </div>
              </div>
            ))}
        </div>
        <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 16 }}>{te.byState}</div>
          {Object.entries(stateGroups).map(([label, count]) => {
            const st = states.find(s => s.label === label);
            return (
              <div key={label} onClick={st ? () => goTo({ stateId: st.id }) : undefined} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f3f4f6", cursor: st ? "pointer" : "default" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: st?.color || "#9ca3af" }} />
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#374151" }}>{label}</span>
                </div>
                <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 17, color: st?.color || "#9ca3af" }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>


      <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <div style={{ fontFamily: "'Fraunces',serif", fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 16 }}>{te.recentInterventions}</div>
        {filteredInterventions.length === 0
          ? <div style={{ color: "#9ca3af", fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>{te.noInterventions}</div>
          : [...filteredInterventions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5).map(i => (
            <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, color: "#111827" }}>{eqMap[i.equipment_id] || "—"}</div>
                <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: "'DM Sans',sans-serif" }}>{i.type} {i.technician ? `· ${i.technician}` : ""}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: "'DM Sans',sans-serif" }}>{i.date}</div>
                {i.cost ? <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", fontFamily: "'DM Sans',sans-serif" }}>{i.cost} DT</div> : null}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ─── EQUIPMENT FORM ───────────────────────────────────────────
function EquipmentForm({ lang, equipment, states, locRows, locLevels, types, onSave, onClose, userId, allEquipments = [], hasActiveCentre = true }) {
  const te = TE[lang].form;
  const isAr = lang === "ar";
  const t = { dir: isAr ? "rtl" : "ltr", form: { selectLevel: te.selectLevel } };
  const [form, setForm] = useState({
    name: "", type: "", state_id: "", location_path: [], responsible: "",
    serial_number: "", internal_ref: "", brand: "", model: "",
    date_acquired: "", purchase_price: "", supplier: "", notes: "",
    source_type: "achat", fournisseur_etablissement: "", donateur: "",
    num_facture: "", date_facture: "", num_bon_don: "", num_enregistrement: "",
    date_enregistrement: "", num_cin: "",
    ...(equipment || {}),
  });
  const [typeInput, setTypeInput] = useState(equipment?.type || "");
  const [showTypeSugg, setShowTypeSugg] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const filteredTypes = types.filter(t => t.toLowerCase().includes(typeInput.toLowerCase()));
  const customValuesRef = useRef({});

  // Build suggestions from all equipments
  const eqSuggestions = {
    type: [...new Set(allEquipments.map(e => e.type).filter(Boolean))],
    responsible: [...new Set(allEquipments.map(e => e.responsible).filter(Boolean))],
    brand: [...new Set(allEquipments.map(e => e.brand).filter(Boolean))],
    model: [...new Set(allEquipments.map(e => e.model).filter(Boolean))],
    supplier: [...new Set(allEquipments.map(e => e.supplier).filter(Boolean))],
    fournisseur_etablissement: [...new Set(allEquipments.map(e => e.fournisseur_etablissement).filter(Boolean))],
    donateur: [...new Set(allEquipments.map(e => e.donateur).filter(Boolean))],
  };

  const sectionTitle = (title) => (
    <div style={{ fontFamily: "'Fraunces',serif", fontSize: 15, fontWeight: 700, color: "#0c4a6e", margin: "18px 0 10px", borderBottom: "2px solid #e5e7eb", paddingBottom: 6 }}>{title}</div>
  );

  const inp = (label, key, opts = {}) => (
    <div style={{ marginBottom: 13 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5, fontFamily: "'DM Sans',sans-serif" }}>{label}</label>
      <input value={form[key] || ""} placeholder={opts.ph || ""} type={opts.type || "text"} min={opts.min} step={opts.step}
        onChange={e => set(key, e.target.value)}
        style={{ width: "100%", padding: "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none", boxSizing: "border-box" }}
        onFocus={e => e.target.style.borderColor = "#0e7490"} onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
    </div>
  );

  return (
    <div>
      {inp(te.name, "name", { ph: te.namePh })}

      {/* Type with autocomplete */}
      <div style={{ marginBottom: 13, position: "relative" }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5, fontFamily: "'DM Sans',sans-serif" }}>{te.type}</label>
        <input value={typeInput} placeholder={te.typePh} onChange={e => { setTypeInput(e.target.value); set("type", e.target.value); setShowTypeSugg(true); }} onFocus={() => setShowTypeSugg(true)} onBlur={() => setTimeout(() => setShowTypeSugg(false), 150)}
          style={{ width: "100%", padding: "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none", boxSizing: "border-box" }} />
        {showTypeSugg && filteredTypes.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 9, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 1001, maxHeight: 130, overflowY: "auto" }}>
            {filteredTypes.map(t => <div key={t} onMouseDown={() => { setTypeInput(t); set("type", t); setShowTypeSugg(false); }} style={{ padding: "9px 13px", cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>{t}</div>)}
          </div>
        )}
      </div>

      {/* State */}
      <div style={{ marginBottom: 13 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5, fontFamily: "'DM Sans',sans-serif" }}>{te.state}</label>
        <select value={form.state_id || ""} onChange={e => set("state_id", e.target.value)}
          style={{ width: "100%", padding: "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff", boxSizing: "border-box" }}>
          <option value="">{te.statePh}</option>
          {states.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {hasActiveCentre
        ? <LocationPicker t={t} lang={lang} locRows={locRows} locLevels={locLevels} value={form.location_path} onChange={v => set("location_path", v)} />
        : <div data-centre-warning="true" style={{ marginBottom: 13, padding: "10px 14px", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 9, fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#92400e" }}>
            {lang === "ar" ? "اختر مركزاً من الشريط الأصفر لتحديد الأماكن" : "Sélectionnez un centre dans le bandeau jaune pour choisir un emplacement"}
          </div>
      }
      <AutocompleteInput label={te.responsible} value={form.responsible || ""} onChange={v => set("responsible", v)} suggestions={eqSuggestions.responsible} placeholder={te.responsiblePh} accentColor="#0e7490" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {inp(te.serial, "serial_number", { ph: te.serialPh })}
        {inp(te.ref, "internal_ref", { ph: te.refPh })}
        <AutocompleteInput label={te.brand} value={form.brand || ""} onChange={v => set("brand", v)} suggestions={eqSuggestions.brand} placeholder={te.brandPh} accentColor="#0e7490" />
        <AutocompleteInput label={te.model} value={form.model || ""} onChange={v => set("model", v)} suggestions={eqSuggestions.model} placeholder={te.modelPh} accentColor="#0e7490" />
        {inp(te.acquired, "date_acquired", { type: "date" })}
        {inp(te.price, "purchase_price", { type: "number", min: "0", step: "0.01" })}
      </div>

      {sectionTitle(isAr ? "مصدر التزويد" : "Source d'approvisionnement")}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8, fontFamily: "'DM Sans',sans-serif" }}>
          {isAr ? "نوع المصدر" : "Type de source"}
        </label>
        <div style={{ display: "flex", gap: 20 }}>
          {[["achat", isAr ? "شراء" : "Achat"], ["don", isAr ? "هبة" : "Don"]].map(([val, label]) => (
            <label key={val} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: form.source_type === val ? 700 : 400 }}>
              <input type="radio" value={val} checked={form.source_type === val} onChange={() => set("source_type", val)} style={{ cursor: "pointer", accentColor: "#0e7490" }} />
              {label}
            </label>
          ))}
        </div>
      </div>

      {form.source_type === "achat" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <AutocompleteInput label={isAr ? "اسم المزود" : "Nom du fournisseur"} value={form.supplier} onChange={v => set("supplier", v)} suggestions={eqSuggestions.supplier} accentColor="#0e7490" />
          <AutocompleteInput label={isAr ? "المؤسسة" : "Établissement"} value={form.fournisseur_etablissement} onChange={v => set("fournisseur_etablissement", v)} suggestions={eqSuggestions.fournisseur_etablissement} accentColor="#0e7490" />
          {inp(isAr ? "رقم الفاتورة" : "N° facture", "num_facture")}
          {inp(isAr ? "تاريخ الفاتورة" : "Date facture", "date_facture", { type: "date" })}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <AutocompleteInput label={isAr ? "اسم الواهب" : "Nom du donateur"} value={form.donateur} onChange={v => set("donateur", v)} suggestions={eqSuggestions.donateur} accentColor="#0e7490" />
          {inp(isAr ? "رقم بطاقة التعريف" : "Num CIN", "num_cin")}
          {inp(isAr ? "رقم وصل التسليم" : "N° bon de livraison", "num_bon_don")}
          {inp(isAr ? "رقم التضمين" : "N° enregistrement", "num_enregistrement")}
          {inp(isAr ? "تاريخ التضمين" : "Date enregistrement", "date_enregistrement", { type: "date" })}
        </div>
      )}

      <div style={{ marginBottom: 13, marginTop: 4 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5, fontFamily: "'DM Sans',sans-serif" }}>{te.notes}</label>
        <textarea value={form.notes || ""} placeholder={te.notesPh} onChange={e => set("notes", e.target.value)} rows={3}
          style={{ width: "100%", padding: "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
      </div>

      {userId && <CustomFieldsSection lang={lang} module="equipment" userId={userId} entityId={equipment?.id} valuesRef={customValuesRef} />}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: "10px 20px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 9, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>{te.cancel}</button>
        <button onClick={() => {
          if (!hasActiveCentre) {
            document.querySelector('[data-centre-warning]')?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
          }
          if (form.name && form.type && hasActiveCentre) onSave(form, customValuesRef.current);
        }}
          style={{ padding: "10px 20px", background: "#0e7490", color: "#fff", border: "none", borderRadius: 9, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>{te.save}</button>
      </div>
    </div>
  );
}

// ─── INTERVENTION FORM ────────────────────────────────────────
function InterventionForm({ lang, onSave, onClose }) {
  const te = TE[lang].interventions;
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], type: "", technician: "", description: "", cost: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inp = (label, key, opts = {}) => (
    <div style={{ marginBottom: 13 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5, fontFamily: "'DM Sans',sans-serif" }}>{label}</label>
      {opts.textarea
        ? <textarea value={form[key] || ""} placeholder={opts.ph || ""} onChange={e => set(key, e.target.value)} rows={3}
            style={{ width: "100%", padding: "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
        : <input value={form[key] || ""} placeholder={opts.ph || ""} type={opts.type || "text"} onChange={e => set(key, e.target.value)}
            style={{ width: "100%", padding: "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none", boxSizing: "border-box" }} />
      }
    </div>
  );
  return (
    <div>
      {inp(te.date, "date", { type: "date" })}
      {inp(te.type, "type", { ph: te.typePh })}
      {inp(te.technician, "technician", { ph: te.technicianPh })}
      {inp(te.description, "description", { ph: te.descriptionPh, textarea: true })}
      {inp(te.cost, "cost", { type: "number", min: "0", step: "0.01" })}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: "10px 20px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 9, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>{te.cancel}</button>
        <button onClick={() => { if (form.date) onSave(form); }}
          style={{ padding: "10px 20px", background: "#0e7490", color: "#fff", border: "none", borderRadius: 9, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>{te.save}</button>
      </div>
    </div>
  );
}

// ─── EQUIPMENT LIST ───────────────────────────────────────────
// ─── EQUIPMENT TRANSFER FORM ──────────────────────────────────
function EquipmentTransferForm({ lang, equipment, centres, onTransfer, onClose }) {
  const [destCentreId, setDestCentreId] = useState("");
  const [bulletin, setBulletin] = useState("");
  const destCentres = centres.filter(c => c.id !== equipment.centre_id);
  const inpStyle = { width: "100%", padding: "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none" };
  const row = (label, children) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
  return (
    <div>
      <div style={{ background: "#f3f4f6", borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#374151" }}>
        <strong>{equipment.name}</strong> — {equipment.type}
        <br /><span style={{ color: "#9ca3af", fontSize: 12 }}>{lang === "ar" ? "من" : "De"} : {centres.find(c => c.id === equipment.centre_id)?.name || "—"}</span>
      </div>
      {row(lang === "ar" ? "المركز المستقبِل" : "Centre destination",
        destCentres.length === 0
          ? <div style={{ color: "#ef4444", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>{lang === "ar" ? "لا توجد مراكز أخرى" : "Aucun autre centre"}</div>
          : <select value={destCentreId} onChange={e => setDestCentreId(e.target.value)} style={{ ...inpStyle, background: "#fff" }}>
              <option value="">{lang === "ar" ? "اختر المركز" : "Choisir le centre"}</option>
              {destCentres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
      )}
      {row(lang === "ar" ? "رقم وصل التحويل (اختياري)" : "N° Bulletin de transfert (optionnel)",
        <input value={bulletin} onChange={e => setBulletin(e.target.value)}
          placeholder="ex: BT-2026-001" style={inpStyle} />
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
        <Btn variant="secondary" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Annuler"}</Btn>
        <Btn onClick={() => {
          if (!destCentreId) { alert(lang === "ar" ? "اختر مركزاً" : "Choisissez un centre"); return; }
          onTransfer(destCentreId, bulletin);
        }}>{lang === "ar" ? "تحويل" : "Transférer"}</Btn>
      </div>
    </div>
  );
}

function EquipmentList({ lang, equipments, states, locRows, locLevels, types, onAdd, onDelete, onDeleteMany, onTransfer, onImport, visibleCols, onVisibleColsChange, onViewInterventions, initialFilter, userId, centres, centreFilter, onCentreFilterChange, centresForTransfer, showCentreFilter, centreId }) {
  const te = TE[lang].list;
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState(initialFilter?.type || "");
  const [filterState, setFilterState] = useState(initialFilter?.stateId || "");
  const [filterStateIds, setFilterStateIds] = useState(initialFilter?.stateIds || null);
  const [locFilter, setLocFilter] = useState({ centre: null, salle: null });
  const [responsibleFilter, setResponsibleFilter] = useState("");
  const [serialFilter, setSerialFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editEq, setEditEq] = useState(null);
  const [colOpen, setColOpen] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [transferEq, setTransferEq] = useState(null);
  const [cfDefs, setCfDefs] = useState([]);
  const [cfValues, setCfValues] = useState({});
  const colRef = useRef();
  const fileRef = useRef();
  const stateMap = Object.fromEntries(states.map(s => [s.id, s]));

  useEffect(() => {
    const h = e => { if (colRef.current && !colRef.current.contains(e.target)) setColOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  // Load custom field definitions for equipment
  useEffect(() => {
    if (!userId) return;
    supabase.from("custom_field_definitions")
      .select("*").eq("user_id", userId).eq("module", "equipment").eq("active", true)
      .order("sort_order")
      .then(({ data }) => setCfDefs(data || []));
  }, [userId]);

  // Load custom field values
  useEffect(() => {
    if (!cfDefs.length || !equipments.length) return;
    loadCustomFieldValues(userId, equipments.map(e => e.id))
      .then(map => setCfValues(map));
  }, [cfDefs, equipments, userId]);

  useEffect(() => {
    if (initialFilter) {
      setFilterType(initialFilter.type || "");
      setFilterState(initialFilter.stateId || "");
      setFilterStateIds(initialFilter.stateIds || null);
    }
  }, [initialFilter]);

  const eqEffectiveFilter = centreFilter || centreId || null;
  const filtered = useMemo(() => equipments.filter(e =>
    (!search || e.name.toLowerCase().includes(search.toLowerCase()) || e.type.toLowerCase().includes(search.toLowerCase()))
    && (!filterType || e.type === filterType)
    && (!filterState || e.state_id === filterState)
    && (!filterStateIds || filterStateIds.includes(e.state_id))
    && matchesLocationFilter(e.location_path, locFilter)
    && (!responsibleFilter || (e.responsible || "").toLowerCase().includes(responsibleFilter.toLowerCase()))
    && (!serialFilter || (e.serial_number || "").toLowerCase().includes(serialFilter.toLowerCase()))
    && (!eqEffectiveFilter || e.centre_id === eqEffectiveFilter)
  ), [equipments, search, filterType, filterState, filterStateIds, locFilter, responsibleFilter, serialFilter, eqEffectiveFilter]);

  const allSelected = filtered.length > 0 && filtered.every(e => selected.has(e.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(e => e.id)));
  };
  const toggleOne = (id) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const handleDeleteSelected = () => {
    const msg = lang === "ar" ? `حذف ${selected.size} عنصر؟` : `Supprimer ${selected.size} équipement(s) sélectionné(s) ?`;
    if (window.confirm(msg)) {
      onDeleteMany([...selected]);
      setSelected(new Set());
    }
  };

  const th = label => <th style={{ padding: "11px 14px", textAlign: lang === "ar" ? "right" : "left", fontSize: 11, fontWeight: 700, color: "#6b7280", fontFamily: "'DM Sans',sans-serif", borderBottom: "1px solid #f3f4f6", textTransform: "uppercase", letterSpacing: "0.05em", }}>{label}</th>;

  const colLabels = { type: lang === "ar" ? "النوع" : "Type", state: lang === "ar" ? "الحالة" : "État", location: lang === "ar" ? "المكان" : "Emplacement", responsible: lang === "ar" ? "المسؤول" : "Responsable", serial: lang === "ar" ? "الرقم التسلسلي" : "N° série", brand: lang === "ar" ? "العلامة" : "Marque", model: lang === "ar" ? "الطراز" : "Modèle", ref: lang === "ar" ? "المرجع" : "Réf.", acquired: lang === "ar" ? "تاريخ الاقتناء" : "Acquis le", price: lang === "ar" ? "السعر" : "Prix", supplier: lang === "ar" ? "المورد" : "Fournisseur", notes: lang === "ar" ? "ملاحظات" : "Notes" };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={te.search}
          style={{ flex: 1, minWidth: 160, padding: "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 13, fontFamily: "'DM Sans',sans-serif", background: "#fff" }}>
          <option value="">{te.filterType}</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterState} onChange={e => setFilterState(e.target.value)} style={{ padding: "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 13, fontFamily: "'DM Sans',sans-serif", background: "#fff" }}>
          <option value="">{te.filterState}</option>
          {states.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <button onClick={() => { setEditEq(null); setShowForm(true); }}
          style={{ padding: "10px 20px", background: "#0e7490", color: "#fff", border: "none", borderRadius: 9, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>{te.add}</button>

        <button onClick={() => exportEquipmentCSV(filtered, states, locRows, locLevels)}
          style={{ padding: "5px 11px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 9, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
          {lang === "ar" ? "تصدير CSV" : "Exporter CSV"}
        </button>
        <button onClick={() => fileRef.current.click()}
          style={{ padding: "5px 11px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 9, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
          {lang === "ar" ? "استيراد CSV" : "Importer CSV"}
        </button>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }}
          onChange={e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => onImport(ev.target.result); r.readAsText(f); e.target.value = ""; }} />

        {/* Column picker */}
        <div ref={colRef} style={{ position: "relative" }}>
          <button onClick={() => setColOpen(o => !o)} style={{ padding: "5px 11px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 9, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>⚙ {te.columns}</button>
          {colOpen && (
            <div style={{ position: "absolute", top: "100%", right: 0, background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, padding: 16, minWidth: 200, marginTop: 4 }}>
              {EQ_COLUMNS.map(col => (
                <div key={col.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#374151" }}>{colLabels[col.key]}</span>
                  <div onClick={() => onVisibleColsChange({ ...visibleCols, [col.key]: !visibleCols[col.key] })}
                    style={{ width: 38, height: 21, borderRadius: 99, background: visibleCols[col.key] ? "#0e7490" : "#d1d5db", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                    <div style={{ position: "absolute", top: 2.5, left: visibleCols[col.key] ? 19 : 2.5, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {selected.size > 0 && (
          <button onClick={handleDeleteSelected}
            style={{ padding: "5px 11px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 9, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
            {lang === "ar" ? `حذف المحدد (${selected.size})` : `Supprimer la sélection (${selected.size})`}
          </button>
        )}
      </div>

      {showForm && (
        <Modal title={editEq ? TE[lang].form.editTitle : TE[lang].form.addTitle}
          onClose={() => setShowForm(false)} dir={lang === "ar" ? "rtl" : "ltr"}
          confirmClose={lang === "ar" ? "هل أنت متأكد؟ ستفقد البيانات المدخلة." : "Fermer le formulaire ? Les données saisies seront perdues."}>
          <EquipmentForm lang={lang} equipment={editEq} states={states} locRows={locRows.filter(r => !eqEffectiveFilter || r.centre_id === eqEffectiveFilter)} locLevels={locLevels} types={types} userId={userId} allEquipments={equipments} hasActiveCentre={!!eqEffectiveFilter}
            onSave={(form, customValues) => { onAdd(form, editEq, customValues); setShowForm(false); }} onClose={() => setShowForm(false)} />
        </Modal>
      )}

      {transferEq && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setTransferEq(null)}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 24 }}>
              {lang === "ar" ? "تحويل تجهيز" : "Transférer un équipement"}
            </div>
            <EquipmentTransferForm lang={lang} equipment={transferEq} centres={centres}
              onTransfer={(destCentreId, bulletin) => { onTransfer(transferEq, destCentreId, bulletin); setTransferEq(null); }}
              onClose={() => setTransferEq(null)} />
          </div>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflowX: "auto", width: "100%" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th style={{ padding: "10px 12px", width: 36 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: "pointer" }} />
              </th>
              {th(te.name)}
              {(showCentreFilter || centresForTransfer?.length > 1) && th(lang === "ar" ? "المركز" : "Centre")}
              {visibleCols.type && th(te.type)}
              {visibleCols.state && th(te.state)}
              {visibleCols.location && th(te.location)}
              {visibleCols.responsible && th(te.responsible)}
              {visibleCols.serial && th(te.serial)}
              {visibleCols.brand && th(te.brand)}
              {visibleCols.model && th(te.model)}
              {visibleCols.ref && th(te.ref)}
              {visibleCols.acquired && th(te.acquired)}
              {visibleCols.price && th(te.price)}
              {visibleCols.supplier && th(te.supplier)}
              {visibleCols.notes && th(te.notes)}
              {cfDefs.map(d => th(lang === "ar" ? d.label_ar : d.label_fr))}
              {th(te.actions)}
            </tr>
            <tr style={{ background: "#fff" }}>
              <th />
              <th />
              {centresForTransfer?.length > 1 && (
                showCentreFilter ? (
                  <th style={{ padding: "6px 8px" }}>
                    <select value={centreFilter || ""} onChange={e => onCentreFilterChange && onCentreFilterChange(e.target.value || null)}
                      style={{ width: "100%", padding: "5px 6px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 11, fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff" }}>
                      <option value="">{lang === "ar" ? "الكل" : "Tous"}</option>
                      {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </th>
                ) : <th />
              )}
              {visibleCols.type && <th />}
              {visibleCols.state && <th />}
              {visibleCols.location && (
                <th style={{ padding: "6px 8px" }}>
                  <LocationFilterInline locRows={locRows} value={locFilter} onChange={setLocFilter} lang={lang} />
                </th>
              )}
              {visibleCols.responsible && (
                <th style={{ padding: "6px 8px" }}>
                  <input value={responsibleFilter} onChange={e => setResponsibleFilter(e.target.value)} placeholder="…"
                    style={{ width: "100%", padding: "5px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
                </th>
              )}
              {visibleCols.serial && (
                <th style={{ padding: "6px 8px" }}>
                  <input value={serialFilter} onChange={e => setSerialFilter(e.target.value)} placeholder="…"
                    style={{ width: "100%", padding: "5px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
                </th>
              )}
              {visibleCols.brand && <th />}
              {visibleCols.model && <th />}
              {visibleCols.ref && <th />}
              {visibleCols.acquired && <th />}
              {visibleCols.price && <th />}
              {visibleCols.supplier && <th />}
              {visibleCols.notes && <th />}
              {cfDefs.map(d => <th key={d.id} />)}
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={20} style={{ padding: 32, textAlign: "center", color: "#9ca3af", fontFamily: "'DM Sans',sans-serif" }}>{te.noResults}</td></tr>
              : filtered.map((eq, i) => {
                const st = stateMap[eq.state_id];
                const td = (content, extra = {}) => <td style={{ padding: "11px 14px", fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#374151", ...extra }}>{content}</td>;
                return (
                  <tr key={eq.id} style={{ background: selected.has(eq.id) ? "#e0f7fa" : i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "10px 12px" }}>
                      <input type="checkbox" checked={selected.has(eq.id)} onChange={() => toggleOne(eq.id)} style={{ cursor: "pointer" }} />
                    </td>
                    <td style={{ padding: "10px 12px", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13, color: "#111827", }}>{eq.name}</td>
                    {(showCentreFilter || centresForTransfer?.length > 1) && <td style={{ padding: "11px 14px" }}><span style={{ background: "#f0fdf4", color: "#166534", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>{(centresForTransfer?.length ? centresForTransfer : centres).find(c => c.id === eq.centre_id)?.name || "—"}</span></td>}
                    {visibleCols.type && <td style={{ padding: "11px 14px" }}><span style={{ background: "#cffafe", color: "#0e7490", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>{eq.type}</span></td>}
                    {visibleCols.state && <td style={{ padding: "11px 14px" }}>
                      {st ? <span style={{ background: st.color + "20", color: st.color, border: `1px solid ${st.color}30`, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>{st.label}</span> : <span style={{ color: "#9ca3af", fontSize: 12 }}>—</span>}
                    </td>}
                    {visibleCols.location && td(getPathLabel(locRows, eq.location_path), { color: "#6b7280", whiteSpace: "nowrap" })}
                    {visibleCols.responsible && td(eq.responsible || "—")}
                    {visibleCols.serial && td(eq.serial_number || "—", { color: "#6b7280" })}
                    {visibleCols.brand && td(eq.brand || "—")}
                    {visibleCols.model && td(eq.model || "—")}
                    {visibleCols.ref && td(eq.internal_ref || "—", { color: "#6b7280" })}
                    {visibleCols.acquired && td(eq.date_acquired || "—", { whiteSpace: "nowrap" })}
                    {visibleCols.price && td(eq.purchase_price ? `${eq.purchase_price} DT` : "—")}
                    {visibleCols.supplier && td(eq.supplier || "—")}
                    {visibleCols.notes && <td style={{ padding: "11px 14px", fontSize: 12, color: "#9ca3af", fontFamily: "'DM Sans',sans-serif", maxWidth: "10%", overflow: "hidden", textOverflow: "ellipsis", }}>{eq.notes || "—"}</td>}
                    {cfDefs.map(def => {
                      const raw = cfValues[eq.id]?.[def.id] || "";
                      let display = raw || "—";
                      if (def.field_type === "list" && raw) {
                        const opt = (def.options || []).find(o => o.value === raw);
                        display = opt ? (lang === "ar" ? opt.label_ar : opt.label_fr) : raw;
                      }
                      if (def.field_type === "boolean") display = raw === "true" ? (lang === "ar" ? "نعم" : "Oui") : raw === "false" ? (lang === "ar" ? "لا" : "Non") : "—";
                      return td(display, { color: raw ? "#374151" : "#d1d5db" });
                    })}
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 5 }}>
                        <button onClick={() => onViewInterventions(eq)} style={{ padding: "5px 10px", background: "#e0f2fe", color: "#0369a1", border: "none", borderRadius: 7, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>{te.viewInterventions}</button>
                        <button onClick={() => { setEditEq(eq); setShowForm(true); }} style={{ padding: "5px 10px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 7, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>{te.edit}</button>
                        {centres && centresForTransfer?.length > 1 && <button onClick={() => setTransferEq(eq)} style={{ padding: "5px 10px", background: "#e0f2fe", color: "#0369a1", border: "none", borderRadius: 7, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>{lang === "ar" ? "تحويل" : "Transférer"}</button>}
                        <button onClick={() => { if (window.confirm(te.confirmDelete)) onDelete(eq.id); }} style={{ padding: "5px 10px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 7, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>{te.delete}</button>
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

// ─── INTERVENTIONS VIEW ───────────────────────────────────────
function EquipmentInterventions({ lang, equipment, interventions, onAdd, onDelete, onBack }) {
  const te = TE[lang].interventions;
  const [showForm, setShowForm] = useState(false);
  const sorted = [...interventions].sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ padding: "8px 16px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 9, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>← {lang === "ar" ? "رجوع" : "Retour"}</button>
        <div>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 16, color: "#111827" }}>{equipment.name}</div>
          <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: "'DM Sans',sans-serif" }}>{equipment.type}</div>
        </div>
        <button onClick={() => setShowForm(true)} style={{ marginLeft: "auto", padding: "10px 20px", background: "#0e7490", color: "#fff", border: "none", borderRadius: 9, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>{te.add}</button>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowForm(false)}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 24 }}>{te.add}</div>
            <InterventionForm lang={lang} onSave={form => { onAdd({ ...form, equipment_id: equipment.id }); setShowForm(false); }} onClose={() => setShowForm(false)} />
          </div>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
        {sorted.length === 0
          ? <div style={{ padding: 32, textAlign: "center", color: "#9ca3af", fontFamily: "'DM Sans',sans-serif" }}>{te.noInterventions}</div>
          : sorted.map(inv => (
            <div key={inv.id} style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 13, color: "#0e7490" }}>{inv.date}</span>
                  {inv.type && <span style={{ background: "#cffafe", color: "#0e7490", borderRadius: 6, padding: "1px 8px", fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>{inv.type}</span>}
                  {inv.technician && <span style={{ fontSize: 12, color: "#9ca3af", fontFamily: "'DM Sans',sans-serif" }}>{inv.technician}</span>}
                </div>
                {inv.description && <div style={{ fontSize: 13, color: "#374151", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6 }}>{inv.description}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: 16 }}>
                {inv.cost ? <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 16, color: "#374151" }}>{inv.cost} DT</span> : null}
                <button onClick={() => { if (window.confirm(te.confirmDelete)) onDelete(inv.id); }} style={{ padding: "4px 10px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>✕</button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ─── EQUIPMENT SETTINGS ───────────────────────────────────────
function EquipmentStateRow({ state: s, ts, onDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(s.label);
  const save = async () => {
    if (label.trim() && label !== s.label) await onRename(s.id, label.trim());
    setEditing(false);
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#f9fafb", borderRadius: 10, marginBottom: 8 }}>
      <div style={{ width: 14, height: 14, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
      {editing
        ? <input autoFocus value={label} onChange={e => setLabel(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setLabel(s.label); setEditing(false); } }}
            onBlur={save}
            style={{ flex: 1, padding: "5px 10px", border: "1.5px solid #0e7490", borderRadius: 7, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
        : <span style={{ flex: 1, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, color: "#111827" }}>{s.label}</span>
      }
      <button onClick={() => setEditing(true)}
        style={{ padding: "4px 10px", background: "#e0f2fe", color: "#0369a1", border: "none", borderRadius: 6, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>
        {s.label === label ? (editing ? "..." : "Modifier") : "Modifier"}
      </button>
      <button onClick={() => { if (window.confirm(ts.confirmDelete)) onDelete(s.id); }}
        style={{ padding: "4px 10px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>{ts.delete}</button>
    </div>
  );
}

function EquipmentSettings({ lang, states, onAddState, onDeleteState, onResetData, userId, isSuperAdmin }) {
  const te = TE[lang].settings;
  const ts = TE[lang].states;
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#6b7280");
  const [resetConfirmText, setResetConfirmText] = useState("");
  const RESET_KEYWORD = lang === "ar" ? "حذف" : "SUPPRIMER";

  return (
    <div style={{ maxWidth: 660 }}>
      {isSuperAdmin && (
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: 20 }}>
        <div style={{ fontFamily: "'Fraunces',serif", fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 6 }}>{ts.title}</div>
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#6b7280", marginBottom: 20 }}>{te.statesDesc}</div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder={ts.namePh}
            onKeyDown={e => { if (e.key === "Enter" && newLabel.trim()) { onAddState(newLabel.trim(), newColor); setNewLabel(""); } }}
            style={{ flex: 1, padding: "9px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
          <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
            style={{ width: 44, height: 40, padding: 2, border: "1.5px solid #e5e7eb", borderRadius: 9, cursor: "pointer" }} />
          <button onClick={() => { if (newLabel.trim()) { onAddState(newLabel.trim(), newColor); setNewLabel(""); } }}
            style={{ padding: "10px 20px", background: "#0e7490", color: "#fff", border: "none", borderRadius: 9, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>{ts.save}</button>
        </div>

        {states.length === 0
          ? <div style={{ color: "#9ca3af", fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>{ts.noStates}</div>
          : states.map(s => <EquipmentStateRow key={s.id} state={s} ts={ts} onDelete={onDeleteState}
              onRename={async (id, label) => {
                await supabase.from("equipment_states").update({ label }).eq("id", id);
              }} />)}
      </div>
      )}

      {/* Champs personnalisés */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: 20 }}>
        <div style={{ fontFamily: "'Fraunces',serif", fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 5 }}>
          {lang === "ar" ? "الحقول المخصصة" : "Champs personnalisés"}
        </div>
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#6b7280", marginBottom: 18 }}>
          {lang === "ar" ? "أضف حقولاً إضافية تظهر في نماذج التجهيزات" : "Ajoutez des champs supplémentaires qui apparaîtront dans les formulaires des équipements"}
        </div>
        <CustomFieldsManager lang={lang} module="equipment" userId={userId} />
      </div>

      {/* Danger zone — superadmin only */}
      {isSuperAdmin && (
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", border: "1.5px solid #fecaca" }}>
        <div style={{ fontFamily: "'Fraunces',serif", fontSize: 17, fontWeight: 700, color: "#dc2626", marginBottom: 6 }}>{lang === "ar" ? "منطقة الخطر" : "Zone dangereuse"}</div>
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
          {lang === "ar"
            ? "حذف جميع التجهيزات والتدخلات بشكل دائم. لا يمكن التراجع عن هذا الإجراء."
            : "Supprime définitivement tous les équipements et interventions de ce module. Cette action est irréversible."}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input value={resetConfirmText} onChange={e => setResetConfirmText(e.target.value)}
            placeholder={lang === "ar" ? `اكتب "${RESET_KEYWORD}" للتأكيد` : `Tapez "${RESET_KEYWORD}" pour confirmer`}
            style={{ padding: "9px 13px", border: "1.5px solid #fecaca", borderRadius: 9, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none", minWidth: 220 }} />
          <button disabled={resetConfirmText !== RESET_KEYWORD}
            onClick={() => { if (resetConfirmText === RESET_KEYWORD) { onResetData(); setResetConfirmText(""); } }}
            style={{ padding: "10px 20px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 9, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, opacity: resetConfirmText === RESET_KEYWORD ? 1 : 0.5, cursor: resetConfirmText === RESET_KEYWORD ? "pointer" : "not-allowed" }}>
            {lang === "ar" ? "حذف كل البيانات" : "Réinitialiser toutes les données"}
          </button>
        </div>
      </div>
      )}
    </div>
  );
}

// ─── EQUIPMENT HISTORY ────────────────────────────────────────
function EquipmentHistory({ lang, history, equipments, centres, centreFilter, centreId }) {
  const isAr = lang === "ar";
  const effectiveFilter = centreFilter || centreId || null;
  const filtered = effectiveFilter ? history.filter(h => h.centre_id === effectiveFilter) : history;

  const eventIcon = (type) => ({ creation: "✨", modification: "✏️", transfert: "🔄", etat: "🔧", intervention: "🛠" }[type] || "📋");
  const eventLabel = (type) => ({
    creation: isAr ? "إضافة" : "Création",
    modification: isAr ? "تعديل" : "Modification",
    transfert: isAr ? "تحويل" : "Transfert",
    etat: isAr ? "تغيير الحالة" : "Changement d'état",
    intervention: isAr ? "تدخل" : "Intervention",
  }[type] || type);

  const renderChanges = (changes, eventType) => {
    if (!changes) return null;
    if (eventType === "transfert") {
      return <span style={{ color: "#6b7280", fontSize: 12 }}>{changes.from} → {changes.to}{changes.bulletin ? ` [${changes.bulletin}]` : ""}</span>;
    }
    if (eventType === "creation") {
      return <span style={{ color: "#6b7280", fontSize: 12 }}>{changes.name} ({changes.type})</span>;
    }
    return (
      <span style={{ color: "#6b7280", fontSize: 12 }}>
        {Object.entries(changes).map(([k, v]) => `${k}: ${v.from} → ${v.to}`).join(", ")}
      </span>
    );
  };

  return (
    <div>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 17, fontWeight: 700, color: "#111827" }}>
            {isAr ? "سجل التجهيزات" : "Historique des équipements"} ({filtered.length})
          </div>
        </div>
        {filtered.length === 0
          ? <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontFamily: "'DM Sans',sans-serif" }}>{isAr ? "لا يوجد سجل" : "Aucun historique"}</div>
          : filtered.map(h => {
            const eq = equipments.find(e => e.id === h.equipment_id);
            return (
              <div key={h.id} style={{ display: "flex", alignItems: "flex-start", padding: "14px 20px", borderBottom: "1px solid #f3f4f6", gap: 14 }}>
                <div style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{eventIcon(h.event_type)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 14, color: "#111827" }}>
                      {eq?.name || h.equipment_id}
                    </span>
                    <span style={{ background: "#e0f2fe", color: "#0369a1", borderRadius: 6, padding: "1px 8px", fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>
                      {eventLabel(h.event_type)}
                    </span>
                    {centres.find(c => c.id === h.centre_id) && (
                      <span style={{ background: "#f0fdf4", color: "#166534", borderRadius: 6, padding: "1px 8px", fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>
                        {centres.find(c => c.id === h.centre_id)?.name}
                      </span>
                    )}
                  </div>
                  {renderChanges(h.changes, h.event_type)}
                  {h.note && <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: "'DM Sans',sans-serif", marginTop: 2 }}>{h.note}</div>}
                </div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "#9ca3af", flexShrink: 0 }}>
                  {new Date(h.changed_at).toLocaleDateString(isAr ? "ar" : "fr", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ─── EQUIPMENT MODULE WRAPPER ─────────────────────────────────
export function EquipmentModule({ lang, userId, centreId, locRows, locLevels, eqView, onEqViewChange, onAddLocNode, onRenameLocNode, onDeleteLocNode, equipmentFilter, onEquipmentFilterChange, centres, centreFilter, onCentreFilterChange, isSuperAdmin, isOperator, centresForTransfer, showCentreFilter }) {
  const view = eqView || "dashboard";
  const setView = onEqViewChange || (() => {});
  const [equipments, setEquipments] = useState([]);
  const [trashedEquipments, setTrashedEquipments] = useState([]);
  const [states, setStates] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [eqHistory, setEqHistory] = useState([]);
  const [selectedEq, setSelectedEq] = useState(null);
  const [visibleCols, setVisibleCols] = useState(DEFAULT_EQ_COLS);
  const [loading, setLoading] = useState(true);

  const types = useMemo(() => [...new Set(equipments.map(e => e.type))].sort(), [equipments]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const isSuperAdmin = !centreId;
    const eqQuery = isSuperAdmin
      ? supabase.from("equipments").select("*").is("deleted_at", null).order("name")
      : supabase.from("equipments").select("*").eq("centre_id", centreId).is("deleted_at", null).order("name");
    const eqTrashQuery = isSuperAdmin
      ? supabase.from("equipments").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false })
      : supabase.from("equipments").select("*").eq("centre_id", centreId).not("deleted_at", "is", null).order("deleted_at", { ascending: false });
    const stQuery = supabase.from("equipment_states").select("*").order("sort_order");
    const invQuery = isSuperAdmin
      ? supabase.from("equipment_interventions").select("*").order("date", { ascending: false })
      : supabase.from("equipment_interventions").select("*").eq("centre_id", centreId).order("date", { ascending: false });
    const histQuery = isSuperAdmin
      ? supabase.from("equipment_history").select("*").order("changed_at", { ascending: false }).limit(500)
      : supabase.from("equipment_history").select("*").eq("centre_id", centreId).order("changed_at", { ascending: false }).limit(200);
    Promise.all([eqQuery, eqTrashQuery, stQuery, invQuery, histQuery]).then(([eq, eqTrash, st, inv, hist]) => {
      setEquipments(eq.data || []);
      setTrashedEquipments(eqTrash.data || []);
      setStates(st.data || []);
      setInterventions(inv.data || []);
      setEqHistory(hist.data || []);
      setLoading(false);
    });
  }, [userId, centreId]);

  const findDuplicateEquipment = (name, type, excludeId) => equipments.find(e =>
    e.id !== excludeId &&
    e.name.trim().toLowerCase() === name.trim().toLowerCase() &&
    (e.type || "").trim().toLowerCase() === (type || "").trim().toLowerCase()
  );

  const recordEqHistory = async (equipmentId, eventType, changes, eqCentreId) => {
    const { data } = await supabase.from("equipment_history").insert({
      equipment_id: equipmentId, user_id: userId, event_type: eventType,
      changes, centre_id: eqCentreId || centreId, changed_at: new Date().toISOString(),
    }).select().single();
    if (data) setEqHistory(prev => [data, ...prev]);
  };

  const centreFilterRef = useRef(centreFilter);
  useEffect(() => { centreFilterRef.current = centreFilter; }, [centreFilter]);

  const handleAddEquipment = async (form, editing, customValues) => {
    const effectiveCentreId = centreId || centreFilterRef.current || null;
    console.log("[DEBUG] centreId:", centreId, "centreFilter:", centreFilter, "centreFilterRef:", centreFilterRef.current, "effectiveCentreId:", effectiveCentreId);
    const payload = {
      name: form.name, type: form.type, state_id: form.state_id || null,
      location_path: form.location_path || [], responsible: form.responsible || "",
      serial_number: form.serial_number || "", internal_ref: form.internal_ref || "",
      brand: form.brand || "", model: form.model || "",
      date_acquired: form.date_acquired || null,
      purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
      supplier: form.supplier || "", notes: form.notes || "",
      source_type: form.source_type || "achat",
      fournisseur_etablissement: form.fournisseur_etablissement || "",
      donateur: form.donateur || "",
      num_facture: form.num_facture || "",
      date_facture: form.date_facture || null,
      num_bon_don: form.num_bon_don || "",
      num_enregistrement: form.num_enregistrement || "",
      date_enregistrement: form.date_enregistrement || null,
      num_cin: form.num_cin || "",
      user_id: userId, centre_id: effectiveCentreId,
    };
    const dup = findDuplicateEquipment(form.name, form.type, editing?.id);
    const targetId = editing ? editing.id : dup?.id;

    if (targetId) {
      const prev = equipments.find(e => e.id === targetId) || {};
      const { data, error } = await supabase.from("equipments").update(payload).eq("id", targetId).select().single();
      if (error) console.error("Update eq error:", error);
      if (data) {
        setEquipments(prev2 => prev2.map(e => e.id === targetId ? data : e));
        if (customValues) await saveCustomFieldValues(userId, targetId, customValues, centreId);
        // Track changes
        const changes = {};
        ["name","type","state_id","location_path","responsible","brand","model","supplier","notes"].forEach(k => {
          if (JSON.stringify(prev[k]) !== JSON.stringify(data[k])) changes[k] = { from: prev[k], to: data[k] };
        });
        if (Object.keys(changes).length > 0) await recordEqHistory(targetId, "modification", changes, data.centre_id);
      }
    } else {
      const { data, error } = await supabase.from("equipments").insert(payload).select().single();
      if (error) console.error("Insert eq error:", error);
      if (data) {
        setEquipments(prev => [...prev, data]);
        if (customValues) await saveCustomFieldValues(userId, data.id, customValues, centreId);
        await recordEqHistory(data.id, "creation", { name: data.name, type: data.type }, data.centre_id);
      }
    }
  };

  const handleDeleteEquipment = async (id) => {
    const now = new Date().toISOString();
    await supabase.from("equipments").update({ deleted_at: now }).eq("id", id);
    const eq = equipments.find(e => e.id === id);
    setEquipments(prev => prev.filter(e => e.id !== id));
    if (eq) setTrashedEquipments(prev => [...prev, { ...eq, deleted_at: now }]);
  };

  const handleDeleteManyEquipments = async (ids) => {
    const now = new Date().toISOString();
    await supabase.from("equipments").update({ deleted_at: now }).in("id", ids);
    const toTrash = equipments.filter(e => ids.includes(e.id)).map(e => ({ ...e, deleted_at: now }));
    setEquipments(prev => prev.filter(e => !ids.includes(e.id)));
    setTrashedEquipments(prev => [...prev, ...toTrash]);
  };

  const handleRestoreEquipment = async (id) => {
    await supabase.from("equipments").update({ deleted_at: null }).eq("id", id);
    const restored = trashedEquipments.find(e => e.id === id);
    setTrashedEquipments(prev => prev.filter(e => e.id !== id));
    if (restored) setEquipments(prev => [...prev, { ...restored, deleted_at: null }]);
  };

  const handlePermanentDeleteEquipment = async (id) => {
    if (!window.confirm(lang === "ar" ? "حذف نهائي لا يمكن التراجع عنه؟" : "Suppression définitive et irréversible ?")) return;
    await supabase.from("equipments").delete().eq("id", id);
    setTrashedEquipments(prev => prev.filter(e => e.id !== id));
  };

  const handleTransferEquipment = async (sourceEq, destCentreId, bulletin) => {
    const allCentres = centresForTransfer?.length ? centresForTransfer : centres;
    const fromCentre = allCentres.find(c => c.id === sourceEq.centre_id);
    const toCentre = allCentres.find(c => c.id === destCentreId);
    const bulletinNote = bulletin ? ` [${bulletin}]` : "";
    const { data: updated } = await supabase.from("equipments")
      .update({ centre_id: destCentreId, location_path: [] })
      .eq("id", sourceEq.id).select().single();
    if (updated) setEquipments(prev => prev.map(e => e.id === sourceEq.id ? updated : e));
    await recordEqHistory(sourceEq.id, "transfert", {
      from: fromCentre?.name || sourceEq.centre_id,
      to: toCentre?.name || destCentreId,
      bulletin: bulletin || null,
    }, destCentreId);
  };

  const handleAddIntervention = async (form) => {
    const { data, error } = await supabase.from("equipment_interventions").insert({ ...form, user_id: userId, centre_id: centreId, cost: form.cost ? Number(form.cost) : null }).select().single();
    if (error) console.error("Insert intervention error:", error);
    if (data) setInterventions(prev => [data, ...prev]);
  };

  const handleDeleteIntervention = async (id) => {
    await supabase.from("equipment_interventions").delete().eq("id", id);
    setInterventions(prev => prev.filter(i => i.id !== id));
  };

  const handleAddState = async (label, color) => {
    const { data } = await supabase.from("equipment_states").insert({ label, color, user_id: userId, centre_id: null, sort_order: states.length + 1 }).select().single();
    if (data) setStates(prev => [...prev, data]);
  };

  const handleDeleteState = async (id) => {
    await supabase.from("equipment_states").delete().eq("id", id);
    setStates(prev => prev.filter(s => s.id !== id));
  };

  const handleResetEquipmentData = async () => {
    await supabase.from("equipment_interventions").delete().eq("centre_id", centreId);
    await supabase.from("equipment_history").delete().eq("centre_id", centreId);
    await supabase.from("equipments").delete().eq("centre_id", centreId);
    setEquipments([]);
    setInterventions([]);
  };

  const handleImportEquipment = async (csv) => {
    try {
      const lines = csv.trim().split("\n");
      const stateByLabel = Object.fromEntries(states.map(s => [s.label.toLowerCase(), s.id]));
      const newEquipments = lines.slice(1).map(line => {
        const cols = parseEquipmentCSVLine(line).map(s => s?.trim());
        const [name, type, stateLabel, ...rest] = cols;
        // remaining columns: locLevels..., responsible, serial, ref, brand, model, acquired, price, supplier, notes
        const tailCount = 8; // responsible, serial, ref, brand, model, acquired, price, supplier... notes is last
        const responsible = cols[cols.length - 9] || "";
        const serial_number = cols[cols.length - 8] || "";
        const internal_ref = cols[cols.length - 7] || "";
        const brand = cols[cols.length - 6] || "";
        const model = cols[cols.length - 5] || "";
        const date_acquired = cols[cols.length - 4] || null;
        const purchase_price = cols[cols.length - 3] ? Number(cols[cols.length - 3]) : null;
        const supplier = cols[cols.length - 2] || "";
        const notes = cols[cols.length - 1] || "";
        return {
          name, type: type || "",
          state_id: stateLabel ? (stateByLabel[stateLabel.toLowerCase()] || null) : null,
          location_path: [], responsible, serial_number, internal_ref, brand, model,
          date_acquired: date_acquired || null, purchase_price, supplier, notes,
          user_id: userId,
        };
      }).filter(e => e.name);

      const toInsert = [];
      const toUpdate = [];
      for (const row of newEquipments) {
        const dup = findDuplicateEquipment(row.name, row.type);
        if (dup) toUpdate.push({ ...row, id: dup.id });
        else toInsert.push(row);
      }

      let updatedRows = [];
      if (toUpdate.length) {
        const results = await Promise.all(toUpdate.map(({ id, ...payload }) =>
          supabase.from("equipments").update(payload).eq("id", id).select().single()
        ));
        updatedRows = results.map(r => r.data).filter(Boolean);
        results.forEach(r => { if (r.error) console.error("Import update eq error:", r.error); });
      }

      let insertedRows = [];
      if (toInsert.length) {
        const { data, error } = await supabase.from("equipments").insert(toInsert).select();
        if (error) console.error("Import equipment error:", error);
        insertedRows = data || [];
      }

      if (updatedRows.length || insertedRows.length) {
        setEquipments(prev => {
          const updatedMap = Object.fromEntries(updatedRows.map(r => [r.id, r]));
          const merged = prev.map(e => updatedMap[e.id] || e);
          return [...merged, ...insertedRows];
        });
      }
    } catch (e) {
      console.error("Import parse error:", e);
      alert(lang === "ar" ? "خطأ في الاستيراد" : "Erreur lors de l'import");
    }
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div style={{ width: 36, height: 36, border: "3px solid #e5e7eb", borderTopColor: "#0e7490", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /></div>;

  const eqInterventions = selectedEq ? interventions.filter(i => i.equipment_id === selectedEq.id) : [];

  if (view === "interventions" && selectedEq) {
    return <EquipmentInterventions lang={lang} equipment={selectedEq} interventions={eqInterventions} onAdd={handleAddIntervention} onDelete={handleDeleteIntervention} onBack={() => { setView("list"); setSelectedEq(null); }} />;
  }

  return (
    <div>
      {view === "dashboard" && <EquipmentDashboard lang={lang} equipments={equipments} states={states} interventions={interventions} locRows={locRows} centreFilter={centreFilter} onNavigate={(filter) => { if (onEquipmentFilterChange) onEquipmentFilterChange({ ...filter, _nonce: Date.now() }); setView("list"); }} />}
      {view === "list" && <EquipmentList lang={lang} equipments={equipments} states={states} locRows={locRows} locLevels={locLevels} types={types} onAdd={handleAddEquipment} onDelete={handleDeleteEquipment} onDeleteMany={handleDeleteManyEquipments} onTransfer={handleTransferEquipment} onImport={handleImportEquipment} visibleCols={visibleCols} onVisibleColsChange={setVisibleCols} onViewInterventions={eq => { setSelectedEq(eq); setView("interventions"); }} initialFilter={equipmentFilter} userId={userId} centres={centres || []} centreFilter={centreFilter} onCentreFilterChange={onCentreFilterChange} centresForTransfer={centresForTransfer} showCentreFilter={showCentreFilter} centreId={centreId} />}
      {view === "locations" && <Locations t={T[lang]} lang={lang} locRows={centreFilter ? locRows.filter(r => r.centre_id === centreFilter) : locRows} locLevels={locLevels} articles={equipments} onAdd={onAddLocNode} onRename={onRenameLocNode} onDelete={onDeleteLocNode} readOnly={isOperator} />}
      {view === "settings" && <EquipmentSettings lang={lang} states={states} onAddState={handleAddState} onDeleteState={handleDeleteState} onResetData={handleResetEquipmentData} userId={userId} isSuperAdmin={isSuperAdmin} />}
      {view === "history" && <EquipmentHistory lang={lang} history={eqHistory} equipments={equipments} centres={centresForTransfer?.length ? centresForTransfer : centres} centreFilter={centreFilter} centreId={centreId} />}
      {view === "trash" && (
        <TrashView lang={lang} items={trashedEquipments} type="equipment" locRows={locRows}
          onRestore={handleRestoreEquipment} onDelete={handlePermanentDeleteEquipment} />
      )}
    </div>
  );
}
