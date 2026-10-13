import { icon } from "./icons.js";
import { tr } from "../i18n.js";

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Status always carries a word, never colour alone. */
export function badge(def, extra = "") {
  if (!def) return "";
  return `<span class="adm-badge adm-badge--${def.tone ?? "neutral"}">${esc(tr(def.label))}${extra}</span>`;
}

export function unconfirmed() {
  return ` <span class="adm-flag" title="${esc(tr("التسمية غير مؤكدة من الأعمال", "Label not yet confirmed by the business"))}">${icon("alert")}<span class="adm-sr">${esc(tr("غير مؤكد", "unconfirmed"))}</span></span>`;
}

export function avatar(initials, color = "var(--yellow)", lg = false) {
  return `<span class="adm-avatar${lg ? " adm-avatar--lg" : ""}" style="background:${color}" aria-hidden="true">${esc(initials)}</span>`;
}

export function btn(label, { href, kind = "", ic, attrs = "", sm = false } = {}) {
  const cls = `adm-btn${kind ? ` adm-btn--${kind}` : ""}${sm ? " adm-btn--sm" : ""}`;
  const inner = `${ic ? icon(ic) : ""}<span>${esc(label)}</span>`;
  return href ? `<a class="${cls}" href="#${href}" ${attrs}>${inner}</a>` : `<button type="button" class="${cls}" ${attrs}>${inner}</button>`;
}

export function iconBtn(ic, label, attrs = "", dirIcon = false) {
  return `<button type="button" class="adm-btn adm-btn--bare" aria-label="${esc(label)}" title="${esc(label)}" ${attrs}>${icon(ic, dirIcon ? "adm-icon-dir" : "")}</button>`;
}

/** Shared page header: back link, title + status, subtitle, actions (one primary per view). */
export function pageHead({ title, status = "", sub = "", actions = "", back }) {
  return `<header class="adm-page-head">
    <div class="adm-page-head__text">
      ${back ? `<a class="adm-back" href="#${back.href}">${icon("arrowBack", "adm-icon-dir")}${esc(back.label)}</a>` : ""}
      <h1>${esc(title)} ${status}</h1>
      ${sub ? `<p class="adm-page-head__sub">${sub}</p>` : ""}
    </div>
    ${actions ? `<div class="adm-page-head__actions">${actions}</div>` : ""}
  </header>`;
}

/** Contextual entity tabs (routes, not sidebar entries). */
export function tabs(base, list, active) {
  return `<nav class="adm-tabs" aria-label="${esc(tr("أقسام الصفحة", "Page sections"))}">${list
    .map(([slug, label]) => {
      const href = slug ? `${base}/${slug}` : base;
      return `<a href="#${href}"${slug === active ? ' aria-current="page"' : ""}>${esc(label)}</a>`;
    })
    .join("")}</nav>`;
}

export function kpi({ label, value, meta = "", delta, ic, field }) {
  const d = delta == null ? "" : `<span class="adm-kpi__delta--${delta >= 0 ? "up" : "down"}">${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}%</span> `;
  const inner = `<div class="adm-kpi">
    <span class="adm-kpi__label">${ic ? icon(ic) : ""}${esc(label)}</span>
    <span class="adm-kpi__value">${value}</span>
    ${meta || d ? `<span class="adm-kpi__meta">${d}${meta}</span>` : ""}
  </div>`;
  return field ? `<div class="adm-field-block" style="background:${field}">${inner}</div>` : `<div class="adm-card">${inner}</div>`;
}

export function card(title, body, { actions = "", flush = false, id = "" } = {}) {
  return `<section class="adm-card${flush ? " adm-card--flush" : ""}" ${id ? `id="${id}"` : ""} ${title ? `aria-label="${esc(title)}"` : ""}>
    ${title || actions ? `<div class="adm-card__head"><h2 class="adm-card__title">${esc(title)}</h2>${actions}</div>` : ""}
    ${body}
  </section>`;
}

export function dl(rows) {
  return `<dl class="adm-dl">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join("")}</dl>`;
}

export function empty(text, ic = "inbox", action = "") {
  return `<div class="adm-empty">${icon(ic)}<p>${esc(text)}</p>${action}</div>`;
}

export function alert(kind, title, body = "", ic = "info") {
  return `<div class="adm-alert adm-alert--${kind}" role="${kind === "danger" ? "alert" : "note"}">${icon(ic)}<div><p class="adm-alert__title">${esc(title)}</p>${body ? `<p class="adm-muted">${body}</p>` : ""}</div></div>`;
}

export function bars(rows, { max, fmt = (v) => v } = {}) {
  const m = max ?? Math.max(...rows.map((r) => r.value), 1);
  return `<div class="adm-bars">${rows
    .map(
      (r, i) => `<div class="adm-bar"><span>${esc(r.label)}</span><span class="adm-num">${fmt(r.value)}</span>
      <div class="adm-bar__track"><div class="adm-bar__fill" style="width:${Math.max(2, (r.value / m) * 100)}%;background:${r.color ?? "var(--coral)"}"></div></div></div>`,
    )
    .join("")}</div>`;
}

export function field({ id, label, type = "text", value = "", hint = "", options, required = false, attrs = "", rows }) {
  let control;
  if (options) {
    control = `<select class="adm-select" id="${id}" name="${id}" ${required ? "required" : ""} ${attrs}>${options
      .map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value) ? " selected" : ""}>${esc(l)}</option>`)
      .join("")}</select>`;
  } else if (type === "textarea") {
    control = `<textarea class="adm-textarea" id="${id}" name="${id}" rows="${rows ?? 4}" ${required ? "required" : ""} ${attrs}>${esc(value)}</textarea>`;
  } else {
    control = `<input class="adm-input" id="${id}" name="${id}" type="${type}" value="${esc(value)}" ${required ? "required" : ""} ${attrs}>`;
  }
  return `<div class="adm-field" data-field="${id}">
    <label for="${id}">${esc(label)}${required ? ' <span aria-hidden="true" style="color:var(--danger)">*</span>' : ""}</label>
    ${control}
    ${hint ? `<span class="adm-field__hint">${esc(hint)}</span>` : ""}
    <span class="adm-field__error" hidden></span>
  </div>`;
}

export function toast(message, ic = "check") {
  const root = document.getElementById("toast-root");
  const el = document.createElement("div");
  el.className = "adm-toast";
  el.innerHTML = `${icon(ic)}<span>${esc(message)}</span>`;
  root.append(el);
  setTimeout(() => el.remove(), 3600);
}

/** Accessible overlay (drawer or modal) with focus trap, Esc to close and focus restore. */
function overlay(kind, { title, body, foot = "", onMount, wide = false }) {
  const root = document.getElementById("overlay-root");
  const opener = document.activeElement;
  const wrap = document.createElement("div");
  wrap.className = "adm-backdrop";
  const cls = kind === "drawer" ? "adm-drawer" : "adm-modal";
  wrap.innerHTML = `<div class="${cls}" role="dialog" aria-modal="true" aria-labelledby="ov-title" ${wide ? 'style="width:min(720px,100vw)"' : ""}>
    <div class="${cls}__head"><h2 id="ov-title">${esc(title)}</h2>${iconBtn("x", tr("إغلاق", "Close"), 'data-close')}</div>
    <div class="${cls}__body">${body}</div>
    ${foot ? `<div class="${cls}__foot">${foot}</div>` : ""}
  </div>`;
  root.append(wrap);
  const panel = wrap.firstElementChild;
  const close = () => {
    wrap.remove();
    document.removeEventListener("keydown", onKey, true);
    if (opener && document.contains(opener)) opener.focus();
  };
  const onKey = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    }
    if (e.key === "Tab") {
      const f = [...panel.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  document.addEventListener("keydown", onKey, true);
  wrap.addEventListener("mousedown", (e) => e.target === wrap && close());
  wrap.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
  onMount?.(panel, close);
  (panel.querySelector("input,select,textarea") ?? panel.querySelector("button"))?.focus();
  return close;
}

export const drawer = (opts) => overlay("drawer", opts);
export const modal = (opts) => overlay("modal", opts);

/** Confirmation dialog for destructive or irreversible actions. */
export function confirmDialog({ title, body, confirm, danger = false, onConfirm }) {
  modal({
    title,
    body: `<p>${body}</p>`,
    foot: `${btn(tr("إلغاء", "Cancel"), { attrs: "data-close" })}${btn(confirm, { kind: danger ? "ink" : "primary", attrs: "data-ok" })}`,
    onMount(panel, close) {
      panel.querySelector("[data-ok]").addEventListener("click", () => {
        close();
        onConfirm();
      });
    },
  });
}

/** Simple validation helper for forms built with field(). Returns true when valid. */
export function validate(root, rules) {
  let ok = true;
  for (const [id, check] of Object.entries(rules)) {
    const wrap = root.querySelector(`[data-field="${id}"]`);
    const input = root.querySelector(`#${id}`);
    if (!wrap || !input) continue;
    const msg = check(input.value.trim());
    const err = wrap.querySelector(".adm-field__error");
    wrap.classList.toggle("is-invalid", !!msg);
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    err.hidden = !msg;
    err.textContent = msg || "";
    if (msg && ok) input.focus();
    if (msg) ok = false;
  }
  return ok;
}
