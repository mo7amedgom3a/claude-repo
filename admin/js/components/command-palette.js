import { flatItems } from "../config/navigation.js";
import { visibleNav } from "./shell.js";
import { icon } from "./icons.js";
import { esc } from "./ui.js";
import { tr } from "../i18n.js";
import { can } from "../permissions.js";
import { navigate } from "../router.js";
import { orders, courses, customers, tickets, coupons } from "../data/db.js";

// Actions are not sidebar destinations; they are reachable here and from page headers.
const ACTIONS = [
  { label: { ar: "إنشاء دورة", en: "Create course" }, href: "/learning/courses/new", permission: "courses.create", ic: "plus" },
  { label: { ar: "إنشاء كوبون", en: "Create coupon" }, href: "/sales/coupons/new", permission: "coupons.create", ic: "plus" },
  { label: { ar: "إصدار استرداد لطلب", en: "Issue a refund" }, href: "/sales/orders", permission: "refunds.create", ic: "refund", hint: { ar: "اختر الطلب ثم «استرداد»", en: "Pick the order, then Refund" } },
  { label: { ar: "الرد على أسئلة المتدربين", en: "Answer trainee questions" }, href: "/learning/qa", permission: "qa.read", ic: "message" },
  { label: { ar: "مراجعة طلبات الصرف", en: "Review payout requests" }, href: "/marketing/payouts", permission: "affiliates.read", ic: "card" },
  { label: { ar: "دعوة عضو فريق", en: "Invite a team member" }, href: "/settings/team", permission: "settings.read", ic: "users" },
];

function buildIndex(q) {
  const ql = q.trim().toLowerCase();
  const groups = [];
  const match = (...texts) => !ql || texts.some((t) => String(t).toLowerCase().includes(ql));

  const pages = flatItems(visibleNav())
    .filter((i) => match(tr(i.title), i.title.en, i.title.ar, tr(i.module.title)))
    .slice(0, ql ? 8 : 6)
    .map((i) => ({ label: tr(i.title), path: `${tr(i.module.title)} / ${tr(i.section.title)}`, href: i.href, ic: i.module.icon }));
  if (pages.length) groups.push([tr("الصفحات", "Pages"), pages]);

  const acts = ACTIONS.filter((a) => can(a.permission) && match(tr(a.label), a.label.en)).map((a) => ({ label: tr(a.label), path: a.hint ? tr(a.hint) : "", href: a.href, ic: a.ic }));
  if (acts.length) groups.push([tr("إجراءات", "Actions"), acts]);

  if (ql.length >= 2) {
    const num = ql.replace(/[^0-9]/g, "");
    const rec = [];
    if (can("orders.read"))
      orders.filter((o) => (num && String(o.id).includes(num)) || o.number.toLowerCase().includes(ql)).slice(0, 4)
        .forEach((o) => rec.push({ label: `⁦#${o.number}⁩`, path: tr("طلب", "Order"), href: `/sales/orders/${o.id}`, ic: "receipt" }));
    if (can("courses.read"))
      courses.filter((c) => match(c.title.ar, c.title.en)).slice(0, 4)
        .forEach((c) => rec.push({ label: tr(c.title), path: tr("دورة", "Course"), href: `/learning/courses/${c.id}`, ic: "book" }));
    if (can("customers.read"))
      customers.filter((c) => match(c.name.ar, c.name.en, c.email)).slice(0, 4)
        .forEach((c) => rec.push({ label: tr(c.name), path: c.email, href: `/customers/${c.id}`, ic: "user" }));
    if (can("tickets.read"))
      tickets.filter((t) => num && String(t.id).includes(num)).slice(0, 2)
        .forEach((t) => rec.push({ label: `${tr("تذكرة", "Ticket")} ⁦#${t.id}⁩`, path: tr(t.subject), href: `/customers/tickets/${t.id}`, ic: "ticket" }));
    if (can("coupons.read"))
      coupons.filter((c) => c.code.toLowerCase().includes(ql)).slice(0, 3)
        .forEach((c) => rec.push({ label: c.code, path: tr("كوبون", "Coupon"), href: `/sales/coupons/${c.id}`, ic: "tag" }));
    if (rec.length) groups.push([tr("السجلات", "Records"), rec]);
  }
  return groups;
}

let open = false;

export function openPalette() {
  if (open) return;
  open = true;
  const opener = document.activeElement;
  const root = document.getElementById("overlay-root");
  const wrap = document.createElement("div");
  wrap.className = "adm-backdrop";
  wrap.innerHTML = `<div class="adm-palette" role="dialog" aria-modal="true" aria-label="${esc(tr("البحث الشامل", "Command search"))}">
    <input class="adm-palette__input" type="text" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list"
      placeholder="${esc(tr("اكتب صفحة أو إجراء أو رقم طلب أو اسم عميل…", "Type a page, action, order number or customer…"))}">
    <ul class="adm-palette__list" id="pal-list" role="listbox"></ul>
    <div class="adm-palette__foot"><span><span class="adm-kbd">↑↓</span> ${esc(tr("تنقل", "move"))}</span><span><span class="adm-kbd">Enter</span> ${esc(tr("فتح", "open"))}</span><span><span class="adm-kbd">Esc</span> ${esc(tr("إغلاق", "close"))}</span></div>
  </div>`;
  root.append(wrap);
  const input = wrap.querySelector("input");
  const list = wrap.querySelector("ul");
  let flat = [];
  let sel = 0;

  const close = () => {
    open = false;
    wrap.remove();
    if (opener && document.contains(opener)) opener.focus();
  };
  const go = (href) => {
    close();
    navigate(href);
  };
  const paint = () => {
    const groups = buildIndex(input.value);
    flat = groups.flatMap(([, items]) => items);
    sel = Math.min(sel, Math.max(0, flat.length - 1));
    let n = 0;
    list.innerHTML = flat.length
      ? groups
          .map(
            ([g, items]) =>
              `<li role="presentation" class="adm-palette__group">${esc(g)}</li>` +
              items
                .map((it) => {
                  const i = n++;
                  return `<li role="option" id="pal-${i}" class="adm-palette__item" data-i="${i}" aria-selected="${i === sel}">${icon(it.ic)}<span>${esc(it.label)}</span><span class="adm-palette__path">${esc(it.path)}</span></li>`;
                })
                .join(""),
          )
          .join("")
      : `<li class="adm-palette__group" role="presentation">${esc(tr("لا نتائج", "No results"))}</li>`;
    input.setAttribute("aria-activedescendant", flat.length ? `pal-${sel}` : "");
    list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  };

  input.addEventListener("input", () => {
    sel = 0;
    paint();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") (sel = (sel + 1) % Math.max(flat.length, 1)), paint(), e.preventDefault();
    else if (e.key === "ArrowUp") (sel = (sel - 1 + flat.length) % Math.max(flat.length, 1)), paint(), e.preventDefault();
    else if (e.key === "Enter" && flat[sel]) go(flat[sel].href);
    else if (e.key === "Escape") close();
    else if (e.key === "Tab") e.preventDefault();
  });
  list.addEventListener("click", (e) => {
    const li = e.target.closest("[data-i]");
    if (li) go(flat[Number(li.dataset.i)].href);
  });
  wrap.addEventListener("mousedown", (e) => e.target === wrap && close());
  paint();
  input.focus();
}
