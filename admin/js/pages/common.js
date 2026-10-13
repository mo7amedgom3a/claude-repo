import { tr, fmtMoney, fmtDate } from "../i18n.js";
import { esc, badge, avatar } from "../components/ui.js";
import { customers, courses, byId, ORDER_STATUS, GATEWAY_LABEL, COLORS } from "../data/db.js";

export const customerOf = (id) => byId(customers, id);
export const courseOf = (id) => byId(courses, id);

export function customerCell(id) {
  const c = customerOf(id);
  if (!c) return "—";
  return `<span class="ma-cell-flex">${avatar(c.initials, COLORS[c.id % COLORS.length])}<span><a class="ma-cell-main" href="#/customers/${c.id}">${esc(tr(c.name))}</a><span class="ma-cell-sub ma-ltr">${esc(c.email)}</span></span></span>`;
}

export function orderItemsLabel(o) {
  const first = tr(o.items[0].title);
  return `${esc(first)}${o.items.length > 1 ? ` <span class="ma-muted">+${o.items.length - 1}</span>` : ""}`;
}

export const orderStatus = (o) => badge(ORDER_STATUS[o.status]);
export const gateway = (g) => esc(tr(GATEWAY_LABEL[g]));
export const money = (n) => `<span class="ma-num">${esc(fmtMoney(n))}</span>`;
export const date = (d, t = false) => `<span class="ma-num">${esc(fmtDate(d, t))}</span>`;

export function onOff(active) {
  return badge(active ? { label: { ar: "نشط", en: "Active" }, tone: "success" } : { label: { ar: "متوقف", en: "Inactive" }, tone: "neutral" });
}

export const COURSE_STATUS = {
  published: { label: { ar: "منشورة", en: "Published" }, tone: "success" },
  draft: { label: { ar: "مسودة", en: "Draft" }, tone: "warning" },
  archived: { label: { ar: "مؤرشفة", en: "Archived" }, tone: "neutral" },
};

export function rangeSelect(value, attrs = "data-range") {
  const opts = [
    [7, tr("آخر 7 أيام", "Last 7 days")],
    [30, tr("آخر 30 يومًا", "Last 30 days")],
    [90, tr("آخر 90 يومًا", "Last 90 days")],
  ];
  return `<label class="ma-sr" for="range">${esc(tr("الفترة", "Period"))}</label><select id="range" class="ma-select" style="width:auto" ${attrs}>${opts
    .map(([v, l]) => `<option value="${v}"${v === value ? " selected" : ""}>${esc(l)}</option>`)
    .join("")}</select>`;
}
