import { navigation, flatItems, matchActive } from "../config/navigation.js";
import { icon } from "./icons.js";
import { esc, iconBtn } from "./ui.js";
import { tr, getLang, fmtNum } from "../i18n.js";
import { can, ROLES, currentRole } from "../permissions.js";
import { load, save } from "../store.js";
import { ops } from "../data/db.js";

/** Navigation filtered by the viewer's scopes (presentation only; the API enforces access). */
export function visibleNav() {
  return navigation
    .map((m) => ({ ...m, sections: m.sections.map((s) => ({ ...s, items: s.items.filter((i) => can(i.permission)) })).filter((s) => s.items.length) }))
    .filter((m) => m.disabled || m.sections.length);
}

function moduleBadge(m) {
  if (m.id === "dashboard") return ops.inbox;
  const counts = m.sections.flatMap((s) => s.items).map((i) => (i.badge ? ops[i.badge] ?? 0 : 0));
  return counts.reduce((a, b) => a + b, 0);
}

export function renderShell(app, { path, crumbs, moduleId }) {
  const nav = visibleNav();
  const items = flatItems(nav);
  const active = matchActive(path, items);
  const activeModule = nav.find((m) => m.id === (active?.module.id ?? moduleId)) ?? nav[0];
  const collapsedSections = load("collapsedSections", {});
  const lang = getLang();

  const rail = `<nav class="adm-rail" aria-label="${esc(tr("المجالات", "Domains"))}">
    <a class="adm-rail__logo" href="#/dashboard" aria-label="${esc(tr("ماستري أكاديمي - الرئيسية", "Mastery Academy home"))}">
      <svg viewBox="0 0 36 36" aria-hidden="true"><use href="#ma-mark"></use><rect x="4" y="4" width="28" height="28" fill="currentColor" class="adm-mark-fallback"/></svg>
    </a>
    ${nav
      .map((m) => {
        const first = m.sections[0]?.items[0]?.href ?? m.href;
        const badge = m.disabled ? 0 : moduleBadge(m);
        const cur = m.id === activeModule.id;
        return `<a class="adm-rail__item${m.disabled ? " is-disabled" : ""}" href="#${first}" data-module="${m.id}" ${cur ? 'aria-current="true"' : ""} title="${esc(tr(m.title))}${m.note ? " — " + esc(tr(m.note)) : ""}">
          ${icon(m.icon)}<span>${esc(tr(m.title))}</span>
          ${badge ? `<span class="adm-rail__dot" aria-label="${fmtNum(badge)} ${esc(tr("بانتظارك", "waiting"))}">${fmtNum(badge)}</span>` : ""}
        </a>`;
      })
      .join("")}
    <span class="adm-rail__spacer"></span>
    ${iconBtn("panel", tr("إظهار/إخفاء القائمة الجانبية", "Toggle sidebar"), 'data-toggle-sidebar aria-keyshortcuts="Control+B"')}
  </nav>`;

  const sidebar = `<nav class="adm-sidebar" aria-label="${esc(tr(activeModule.title))}">
    <div class="adm-sidebar__head"><h2 class="adm-sidebar__title">${esc(tr(activeModule.title))}</h2></div>
    ${activeModule.disabled ? "" : `<div class="adm-sidebar__search"><div class="adm-search">${icon("search")}
      <input class="adm-input adm-input--search" type="search" data-nav-filter placeholder="${esc(tr("ابحث في الصفحات", "Search pages"))}" aria-label="${esc(tr("ابحث في صفحات هذا القسم", "Search pages in this domain"))}">
    </div></div>`}
    <div class="adm-sidebar__nav">
      ${activeModule.sections
        .map((s, si) => {
          const key = `${activeModule.id}:${si}`;
          // The section holding the active page is always revealed.
          const holdsActive = s.items.some((i) => i.href === active?.href);
          const open = holdsActive || !collapsedSections[key];
          return `<div class="adm-sidebar__section" data-section>
            <button type="button" class="adm-sidebar__section-btn" aria-expanded="${open}" aria-controls="sec-${si}" data-sec="${key}">${icon("chevron")}${esc(tr(s.title))}</button>
            <ul class="adm-sidebar__list" id="sec-${si}" ${open ? "" : "hidden"}>
              ${s.items
                .map((i) => {
                  const n = i.badge ? ops[i.badge] : 0;
                  return `<li data-item="${esc(tr(i.title).toLowerCase())} ${esc(i.title.en.toLowerCase())}"><a class="adm-sidebar__link" href="#${i.href}" ${i.href === active?.href ? 'aria-current="page"' : ""}>
                    <span>${esc(tr(i.title))}</span>${n ? `<span class="adm-sidebar__count">${fmtNum(n)}</span>` : ""}</a></li>`;
                })
                .join("")}
            </ul>
          </div>`;
        })
        .join("")}
      <p class="adm-sidebar__empty" data-nav-empty hidden>${esc(tr("لا توجد صفحة بهذا الاسم. جرّب البحث الشامل (Ctrl K).", "No page by that name. Try global search (Ctrl K)."))}</p>
    </div>
  </nav>`;

  const role = currentRole();
  const topbar = `<header class="adm-topbar">
    <span class="adm-topbar__mobile">${iconBtn("menu", tr("فتح القائمة", "Open menu"), "data-open-nav")}</span>
    <nav class="adm-topbar__crumbs adm-breadcrumbs" aria-label="${esc(tr("مسار التنقل", "Breadcrumb"))}">
      <ol>${crumbs
        .map(([label, href], i) => {
          const last = i === crumbs.length - 1;
          return `<li>${i ? icon("chevronEnd", "adm-icon-dir") : ""}${last || !href ? `<span ${last ? 'aria-current="page"' : ""}>${esc(label)}</span>` : `<a href="#${href}">${esc(label)}</a>`}</li>`;
        })
        .join("")}</ol>
    </nav>
    <button type="button" class="adm-btn adm-btn--sm" data-open-palette aria-keyshortcuts="Control+K Meta+K">${icon("search")}<span class="adm-topbar__desktop">${esc(tr("بحث أو أمر", "Search or jump to"))}</span> <span class="adm-kbd adm-topbar__desktop">Ctrl K</span></button>
    ${iconBtn("globe", lang === "ar" ? "English" : "العربية", `data-lang lang="${lang === "ar" ? "en" : "ar"}"`)}
    ${iconBtn(document.documentElement.dataset.theme === "dark" ? "sun" : "moon", tr("تبديل المظهر", "Toggle theme"), "data-theme-toggle")}
    <div class="adm-menu">
      <button type="button" class="adm-btn adm-btn--bare" data-user-menu aria-haspopup="true" aria-expanded="false" aria-label="${esc(tr("حسابي", "My account"))}"><span class="adm-avatar" style="background:var(--yellow);margin:0">MA</span></button>
      <div class="adm-menu__pop" hidden role="menu">
        <p class="adm-menu__label">${esc(tr("عرض كـ (تجريبي)", "View as (demo)"))}</p>
        ${ROLES.map((r) => `<button type="button" class="adm-menu__item" role="menuitemradio" aria-checked="${r.id === role.id}" data-role="${r.id}">${r.id === role.id ? icon("check") : `<span style="width:20px"></span>`}${esc(tr(r.name))}</button>`).join("")}
        <p class="adm-menu__label">${esc(tr("إخفاء العناصر ليس صلاحية: الخادم يتحقق من كل عملية.", "Hiding items is not authorization: the API checks every call."))}</p>
        <a class="adm-menu__item" role="menuitem" href="#/settings/audit">${icon("history")}${esc(tr("سجل التدقيق", "Audit log"))}</a>
        <button type="button" class="adm-menu__item" role="menuitem" data-signout>${icon("logout")}${esc(tr("تسجيل الخروج", "Sign out"))}</button>
      </div>
    </div>
  </header>`;

  app.innerHTML = `
    <div class="adm-nav-drawer" id="nav-drawer">${rail}${sidebar}</div>
    <div class="adm-scrim" data-close-nav></div>
    <div class="adm-main">
      ${topbar}
      <main id="main" class="adm-content" tabindex="-1"></main>
    </div>`;

  // Placeholder block until the kit sprite provides #ma-mark (the logo is never redrawn here).
  // Hide it when the kit's sprite provides #ma-mark.
  if (document.getElementById("ma-mark")) app.querySelector(".adm-mark-fallback")?.remove();

  wireShell(app);
  return app.querySelector("#main");
}

function wireShell(app) {
  app.querySelector("[data-nav-filter]")?.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    let any = false;
    app.querySelectorAll("[data-section]").forEach((sec) => {
      let secAny = false;
      sec.querySelectorAll("li[data-item]").forEach((li) => {
        const hit = !q || li.dataset.item.includes(q);
        li.hidden = !hit;
        secAny ||= hit;
      });
      sec.hidden = !secAny;
      if (q && secAny) {
        sec.querySelector("ul").hidden = false;
        sec.querySelector("button").setAttribute("aria-expanded", "true");
      }
      any ||= secAny;
    });
    app.querySelector("[data-nav-empty]").hidden = any;
  });

  app.querySelectorAll("[data-sec]").forEach((b) =>
    b.addEventListener("click", () => {
      const open = b.getAttribute("aria-expanded") === "true";
      b.setAttribute("aria-expanded", String(!open));
      b.nextElementSibling.hidden = open;
      const state = load("collapsedSections", {});
      state[b.dataset.sec] = open;
      save("collapsedSections", state);
    }),
  );

  const menuBtn = app.querySelector("[data-user-menu]");
  const pop = menuBtn.nextElementSibling;
  menuBtn.addEventListener("click", () => {
    pop.hidden = !pop.hidden;
    menuBtn.setAttribute("aria-expanded", String(!pop.hidden));
    if (!pop.hidden) pop.querySelector("button")?.focus();
  });
  pop.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      pop.hidden = true;
      menuBtn.focus();
    }
  });
}
