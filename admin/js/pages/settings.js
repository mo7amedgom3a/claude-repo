import { tr, fmtNum } from "../i18n.js";
import { esc, pageHead, card, btn, badge, field, drawer, toast, avatar, alert, validate, confirmDialog } from "../components/ui.js";
import { icon } from "../components/icons.js";
import { dataTable } from "../components/data-table.js";
import { adminUsers, auditLog, byId, COLORS } from "../data/db.js";
import { date } from "./common.js";
import { ROLES, can, currentRole } from "../permissions.js";

export function generalPage() {
  return {
    title: tr("الإعدادات العامة", "General settings"),
    render(el) {
      el.innerHTML = `${pageHead({ title: tr("الإعدادات العامة", "General settings") })}
        <form class="ma-stack" style="max-width:860px" data-form>
          ${card(tr("الأكاديمية", "Academy"), `<div class="ma-form-grid">${field({ id: "nm", label: tr("الاسم بالعربية", "Arabic name"), value: "ماستري أكاديمي", required: true })}${field({ id: "ne", label: tr("الاسم بالإنجليزية", "English name"), value: "Mastery Academy", attrs: 'dir="ltr"' })}${field({ id: "em", label: tr("بريد الدعم", "Support email"), type: "email", value: "support@example.com", attrs: 'dir="ltr"' })}${field({ id: "tz", label: tr("المنطقة الزمنية", "Time zone"), value: "Asia/Riyadh", options: [["Asia/Riyadh", "Asia/Riyadh (GMT+3)"], ["Africa/Cairo", "Africa/Cairo (GMT+2)"]] })}</div>`)}
          ${card(tr("المتجر", "Store"), `<div class="ma-form-grid">${field({ id: "cur", label: tr("العملة", "Currency"), value: "SAR", options: [["SAR", tr("ريال سعودي", "Saudi riyal")]] })}${field({ id: "vat", label: tr("ضريبة القيمة المضافة %", "VAT %"), type: "number", value: "15" })}${field({ id: "vn", label: tr("الرقم الضريبي", "VAT number"), value: "300000000000003", attrs: 'dir="ltr"' })}</div>`)}
          <div class="ma-cluster"><span class="ma-spacer"></span>${btn(tr("حفظ الإعدادات", "Save settings"), { kind: "primary", attrs: "data-save" })}</div>
        </form>`;
      el.querySelector("[data-save]").addEventListener("click", () => {
        if (!validate(el, { nm: (v) => (!v ? tr("مطلوب", "Required") : null) })) return;
        toast(tr("تم حفظ الإعدادات", "Settings saved"));
      });
    },
  };
}

// The 10 legacy permission roots, mapped to new scope strings.
export const SCOPE_GROUPS = [
  { legacy: "Courses", label: { ar: "الدورات", en: "Courses" }, area: "courses", actions: ["read", "create", "update", "publish"] },
  { legacy: "Courses", label: { ar: "الحزم", en: "Packages" }, area: "packages", actions: ["read", "create", "update"] },
  { legacy: "Consultancies", label: { ar: "الاستشارات", en: "Consultations" }, area: "consultations", actions: ["read", "create", "update"] },
  { legacy: "Coupons", label: { ar: "الكوبونات", en: "Coupons" }, area: "coupons", actions: ["read", "create", "update"] },
  { legacy: "Reports", label: { ar: "الطلبات", en: "Orders" }, area: "orders", actions: ["read", "update"] },
  { legacy: "Reports", label: { ar: "الاستردادات", en: "Refunds" }, area: "refunds", actions: ["read", "request", "create"] },
  { legacy: "Affiliates", label: { ar: "المسوقون", en: "Affiliates" }, area: "affiliates", actions: ["read", "update"] },
  { legacy: "Users", label: { ar: "العملاء", en: "Customers" }, area: "customers", actions: ["read", "update"] },
  { legacy: "CustomerService", label: { ar: "التذاكر", en: "Tickets" }, area: "tickets", actions: ["read", "create", "update"] },
  { legacy: "Reports", label: { ar: "التقارير", en: "Reports" }, area: "reports", actions: ["sales", "products", "coupons", "customers"] },
  { legacy: "Settings", label: { ar: "الإعدادات", en: "Settings" }, area: "settings", actions: ["read", "update"] },
  { legacy: "Admin", label: { ar: "الفريق والأدوار", en: "Team & roles" }, area: "admin", actions: ["read", "update"] },
];
const ACTION = { read: { ar: "عرض", en: "View" }, create: { ar: "إنشاء", en: "Create" }, update: { ar: "تعديل", en: "Edit" }, publish: { ar: "نشر", en: "Publish" }, request: { ar: "طلب", en: "Request" }, sales: { ar: "المبيعات", en: "Sales" }, products: { ar: "المنتجات", en: "Products" }, coupons: { ar: "الكوبونات", en: "Coupons" }, customers: { ar: "العملاء", en: "Customers" } };

const has = (role, scope) => {
  const [area] = scope.split(".");
  return role.scopes.some((s) => s === "*" || s === scope || s === `${area}.*`);
};

export function teamPage() {
  return {
    title: tr("الفريق والأدوار", "Team & roles"),
    render(el) {
      el.innerHTML = `${pageHead({ title: tr("الفريق والأدوار", "Team & roles"), sub: esc(tr("الأدوار تجمع الصلاحيات (scopes). الخادم يتحقق من كل صلاحية؛ إخفاء القائمة للتسهيل فقط.", "Roles group scopes. The API checks every scope; hiding menu items is only a convenience.")), actions: can("admin.update") || currentRole().id === "super" ? btn(tr("دعوة عضو", "Invite member"), { kind: "primary", ic: "plus", attrs: "data-invite" }) : "" })}
        <div class="ma-cols ma-cols--2" style="margin-bottom:16px">${ROLES.map(
          (r, i) => `<a class="ma-panel" style="text-decoration:none;display:flex;gap:12px;align-items:center" href="#/settings/team/${r.id}">
            <span class="ma-avatar" style="background:${COLORS[i]}">${icon("shield")}</span>
            <span style="flex:1"><strong>${esc(tr(r.name))}</strong><span class="ma-cell-sub">${r.scopes.includes("*") ? esc(tr("كل الصلاحيات", "All scopes")) : `${fmtNum(r.scopes.length)} ${esc(tr("صلاحية", "scopes"))}`} · ${fmtNum(adminUsers.filter((u) => u.role === r.id).length)} ${esc(tr("أعضاء", "members"))}</span></span>
            ${icon("chevronEnd", "ma-icon-dir")}</a>`,
        ).join("")}</div>
        <div data-t></div>`;
      dataTable(el.querySelector("[data-t]"), {
        id: "team",
        label: tr("أعضاء الفريق", "Team members"),
        rows: adminUsers,
        views: false,
        search: (u) => `${u.name.ar} ${u.name.en} ${u.email}`,
        columns: [
          { key: "n", label: tr("العضو", "Member"), render: (u) => `<span class="ma-cell-flex">${avatar(u.initials, COLORS[u.id % 8])}<span><span class="ma-cell-main">${esc(tr(u.name))}</span><span class="ma-cell-sub ma-ltr">${esc(u.email)}</span></span></span>` },
          { key: "r", label: tr("الدور", "Role"), render: (u) => `<a href="#/settings/team/${u.role}">${esc(tr(ROLES.find((r) => r.id === u.role).name))}</a>` },
          { key: "l", label: tr("آخر نشاط", "Last active"), sort: (u) => u.lastActive, render: (u) => date(u.lastActive) },
          { key: "m", label: tr("التحقق الثنائي", "2FA"), render: (u) => (u.id % 3 ? badge({ label: { ar: "مفعل", en: "On" }, tone: "success" }) : badge({ label: { ar: "غير مفعل", en: "Off" }, tone: "warning" })) },
        ],
      });
      el.querySelector("[data-invite]")?.addEventListener("click", () =>
        drawer({
          title: tr("دعوة عضو فريق", "Invite a team member"),
          body: `<div class="ma-form">${field({ id: "ie", label: tr("البريد", "Email"), type: "email", required: true, attrs: 'dir="ltr"' })}${field({ id: "ir", label: tr("الدور", "Role"), options: ROLES.map((r) => [r.id, tr(r.name)]) })}${alert("info", tr("تسجيل الدخول برمز لمرة واحدة", "One-time code sign-in"), esc(tr("يصل للعضو رابط دعوة ويُطلب منه تفعيل التحقق الثنائي.", "The member receives an invite link and is asked to turn on 2FA.")))}</div>`,
          foot: `${btn(tr("إلغاء", "Cancel"), { attrs: "data-close" })}${btn(tr("إرسال الدعوة", "Send invite"), { kind: "primary", attrs: "data-ok" })}`,
          onMount(p, close) {
            p.querySelector("[data-ok]").addEventListener("click", () => {
              if (!validate(p, { ie: (v) => (!/.+@.+\..+/.test(v) ? tr("بريد غير صحيح", "Invalid email") : null) })) return;
              close();
              toast(tr("تم إرسال الدعوة", "Invite sent"), "send");
            });
          },
        }),
      );
    },
  };
}

export function rolePage({ roleId }) {
  const role = ROLES.find((r) => r.id === roleId);
  if (!role) return null;
  return {
    title: tr(role.name),
    crumbs: [[tr(role.name)]],
    render(el) {
      const editable = currentRole().id === "super" && role.id !== "super";
      const allActions = [...new Set(SCOPE_GROUPS.flatMap((g) => g.actions))];
      el.innerHTML = `${pageHead({ title: tr(role.name), sub: esc(tr("مصفوفة الصلاحيات. العمود الأخير يوضح الوحدة المقابلة في اللوحة القديمة.", "Scope matrix. The last column shows the matching legacy panel module.")), back: { href: "/settings/team", label: tr("الفريق والأدوار", "Team & roles") }, actions: editable ? btn(tr("حفظ الصلاحيات", "Save scopes"), { kind: "primary", attrs: "data-save" }) : "" })}
        ${role.id === "super" ? alert("info", tr("دور المدير العام", "Super admin role"), esc(tr("يملك كل الصلاحيات ولا يمكن تعديله.", "Has every scope and can't be edited."))) : ""}
        <div class="ma-section-gap">${card(
          "",
          `<div class="ma-table-wrap"><table class="ma-table ma-matrix"><caption class="ma-sr">${esc(tr("مصفوفة الصلاحيات", "Scope matrix"))}</caption><thead><tr><th scope="col">${esc(tr("المجال", "Area"))}</th>${allActions.map((a) => `<th scope="col">${esc(tr(ACTION[a]))}</th>`).join("")}<th scope="col">${esc(tr("الوحدة القديمة", "Legacy module"))}</th></tr></thead><tbody>
          ${SCOPE_GROUPS.map(
            (g) => `<tr><th scope="row">${esc(tr(g.label))}<span class="ma-cell-sub ma-ltr">${g.area}.*</span></th>${allActions
              .map((a) => (g.actions.includes(a) ? `<td><input type="checkbox" data-scope="${g.area}.${a}" aria-label="${esc(tr(g.label))}: ${esc(tr(ACTION[a]))}" ${has(role, `${g.area}.${a}`) ? "checked" : ""} ${editable ? "" : "disabled"}></td>` : "<td></td>"))
              .join("")}<td class="ma-muted ma-ltr">${g.legacy}</td></tr>`,
          ).join("")}
          </tbody></table></div>`,
          { flush: true },
        )}</div>`;
      el.querySelector("[data-save]")?.addEventListener("click", () => {
        role.scopes = [...el.querySelectorAll("[data-scope]:checked")].map((c) => c.dataset.scope).concat("dashboard.read");
        toast(tr("تم حفظ الصلاحيات وتسجيل التغيير في سجل التدقيق", "Scopes saved and recorded in the audit log"), "shield");
      });
    },
  };
}

const INTEGRATIONS = [
  { id: "stripe", name: "Stripe", kind: { ar: "مدفوعات", en: "Payments" }, ok: true, color: "var(--lilac)" },
  { id: "tamara", name: "Tamara", kind: { ar: "تقسيط", en: "Instalments" }, ok: true, color: "var(--green)" },
  { id: "zoom", name: "Zoom", kind: { ar: "جلسات مباشرة", en: "Live sessions" }, ok: true, color: "var(--sky)" },
  { id: "bbb", name: "BigBlueButton", kind: { ar: "جلسات مباشرة", en: "Live sessions" }, ok: false, color: "var(--purple)" },
  { id: "bunny", name: "Bunny Stream", kind: { ar: "فيديو", en: "Video" }, ok: true, color: "var(--yellow)" },
  { id: "ac", name: "ActiveCampaign", kind: { ar: "بريد تسويقي", en: "Email marketing" }, ok: true, color: "var(--pink)" },
];

export function integrationsPage() {
  return {
    title: tr("التكاملات", "Integrations"),
    render(el) {
      el.innerHTML = `${pageHead({ title: tr("التكاملات", "Integrations"), sub: esc(tr("الأسرار تُحفظ في مخزن الأسرار ولا تُعاد إلى المتصفح أبدًا. يمكنك استبدالها فقط.", "Secrets live in the secret store and are never sent back to the browser. You can only replace them.")) })}
        <div class="ma-cols ma-cols--3">${INTEGRATIONS.map(
          (i) => `<section class="ma-panel"><div class="ma-panel__head"><span class="ma-avatar" style="background:${i.color}">${esc(i.name[0])}</span><h2 class="ma-panel__title ma-ltr">${esc(i.name)}</h2>${i.ok ? badge({ label: { ar: "متصل", en: "Connected" }, tone: "success" }) : badge({ label: { ar: "خطأ في الاتصال", en: "Connection error" }, tone: "danger" })}</div>
            <p class="ma-muted" style="margin-bottom:12px">${esc(tr(i.kind))}</p>
            ${field({ id: `k-${i.id}`, label: tr("المفتاح السري", "Secret key"), value: "", attrs: `placeholder="•••••••• ${i.id.slice(0, 2)}${i.id.length}x9" disabled dir="ltr"` })}
            <div class="ma-cluster ma-section-gap">${btn(tr("استبدال المفتاح", "Replace key"), { sm: true, ic: "key", attrs: `data-replace="${i.id}"` })}${btn(tr("اختبار الاتصال", "Test connection"), { sm: true, attrs: `data-test="${i.id}"` })}</div></section>`,
        ).join("")}</div>`;
      el.querySelectorAll("[data-replace]").forEach((b) =>
        b.addEventListener("click", () =>
          drawer({
            title: tr("استبدال المفتاح السري", "Replace secret key"),
            body: `<div class="ma-form">${alert("warning", tr("لا يمكن عرض المفتاح الحالي", "The current key can't be shown"), esc(tr("الصق المفتاح الجديد. سيتوقف المفتاح القديم فور الحفظ.", "Paste the new key. The old key stops working as soon as you save.")))}${field({ id: "nk", label: tr("المفتاح الجديد", "New key"), type: "password", required: true, attrs: 'dir="ltr" autocomplete="off"' })}</div>`,
            foot: `${btn(tr("إلغاء", "Cancel"), { attrs: "data-close" })}${btn(tr("حفظ المفتاح", "Save key"), { kind: "primary", attrs: "data-ok" })}`,
            onMount(p, close) {
              p.querySelector("[data-ok]").addEventListener("click", () => {
                if (!validate(p, { nk: (v) => (v.length < 8 ? tr("المفتاح قصير جدًا", "Key looks too short") : null) })) return;
                close();
                toast(tr("تم حفظ المفتاح في مخزن الأسرار", "Key saved to the secret store"), "lock");
              });
            },
          }),
        ),
      );
      el.querySelectorAll("[data-test]").forEach((b) => b.addEventListener("click", () => toast(b.dataset.test === "bbb" ? tr("فشل الاتصال: تحقق من الرابط والمفتاح", "Connection failed: check the URL and key") : tr("الاتصال يعمل", "Connection works"), b.dataset.test === "bbb" ? "alert" : "check")));
    },
  };
}

export function notificationsPage() {
  const rows = [
    [tr("طلب جديد مدفوع", "New paid order"), true, false],
    [tr("طلب استرداد", "Refund requested"), true, true],
    [tr("تذكرة دعم جديدة", "New support ticket"), true, true],
    [tr("طلب مدرب جديد", "New instructor application"), false, true],
    [tr("طلب صرف عمولة", "Payout request"), true, false],
  ];
  return {
    title: tr("الإشعارات", "Notifications"),
    render(el) {
      el.innerHTML = `${pageHead({ title: tr("الإشعارات", "Notifications"), sub: esc(tr("من يُبلَّغ وكيف عند كل حدث.", "Who gets told, and how, for each event.")) })}
        ${card("", `<div class="ma-table-wrap"><table class="ma-table"><thead><tr><th>${esc(tr("الحدث", "Event"))}</th><th>${esc(tr("البريد", "Email"))}</th><th>${esc(tr("داخل اللوحة", "In-app"))}</th></tr></thead><tbody>${rows.map(([l, e, a], i) => `<tr><td>${esc(l)}</td><td><input type="checkbox" aria-label="${esc(l)}: ${esc(tr("البريد", "Email"))}" ${e ? "checked" : ""} data-n="${i}"></td><td><input type="checkbox" aria-label="${esc(l)}: ${esc(tr("داخل اللوحة", "In-app"))}" ${a ? "checked" : ""} data-n="${i}"></td></tr>`).join("")}</tbody></table></div>`, { flush: true })}`;
      el.querySelectorAll("[data-n]").forEach((c) => c.addEventListener("change", () => toast(tr("تم الحفظ", "Saved"))));
    },
  };
}

const TARGET_HREF = { course: "/learning/courses/", order: "/sales/orders/", coupon: "/sales/coupons", customer: "/customers", role: "/settings/team", ticket: "/customers/tickets" };

export function auditPage() {
  return {
    title: tr("سجل التدقيق", "Audit log"),
    render(el) {
      el.innerHTML = `${pageHead({ title: tr("سجل التدقيق", "Audit log"), sub: esc(tr("كل عملية كتابة من اللوحة تُسجل مع المستخدم والوقت.", "Every write from the admin is recorded with who and when.")) })}<div data-t></div>`;
      dataTable(el.querySelector("[data-t]"), {
        id: "audit",
        label: tr("سجل التدقيق", "Audit log"),
        rows: auditLog,
        pageSize: 25,
        search: (a) => `${tr(a.action)} ${tr(byId(adminUsers, a.userId).name)} ${a.target} ${a.targetId}`,
        columns: [
          { key: "at", label: tr("الوقت", "When"), sort: (a) => a.at, render: (a) => date(a.at, true) },
          { key: "u", label: tr("المستخدم", "User"), render: (a) => esc(tr(byId(adminUsers, a.userId).name)) },
          { key: "a", label: tr("الإجراء", "Action"), render: (a) => esc(tr(a.action)) },
          { key: "t", label: tr("الهدف", "Target"), render: (a) => `<a class="ma-ltr" href="#${TARGET_HREF[a.target]}${a.target === "course" || a.target === "order" ? (a.target === "order" ? 1042 - (a.targetId % 300) : 380 + (a.targetId % 36)) : ""}">${a.target} #${a.targetId}</a>` },
          { key: "ip", label: "IP", render: (a) => `<span class="ma-ltr ma-muted">${a.ip}</span>` },
        ],
        filters: [{ key: "u", label: tr("المستخدم", "User"), options: adminUsers.map((u) => [u.id, tr(u.name)]), test: (a, v) => String(a.userId) === v }],
      });
    },
  };
}

export function b2bPage() {
  return {
    title: tr("الشركات (B2B)", "B2B"),
    module: "b2b",
    baseCrumbs: [[tr("الشركات (B2B)", "B2B")]],
    render(el) {
      el.innerHTML = `${pageHead({ title: tr("الشركات (B2B)", "B2B") })}
        ${alert("info", tr("خارج نطاق اللوحة الجديدة", "Outside the new admin's scope"), esc(tr("اشتراكات الشركات والأقسام ومكتبة B2B تبقى في اللوحة القديمة حسب قواعد حدود النظام.", "Company subscriptions, departments and the B2B library stay in the legacy panel under the system boundary rules.")))}
        <div class="ma-section-gap">${btn(tr("فتح اللوحة القديمة", "Open legacy panel"), { kind: "ink", ic: "link", attrs: 'data-legacy' })}</div>`;
      el.querySelector("[data-legacy]").addEventListener("click", () => confirmDialog({ title: tr("مغادرة اللوحة", "Leave the admin"), body: esc(tr("سيتم فتح اللوحة القديمة في تبويب جديد (غير مفعّل في النموذج التجريبي).", "The legacy panel opens in a new tab (disabled in this prototype).")), confirm: tr("حسنًا", "OK"), onConfirm() {} }));
    },
  };
}
