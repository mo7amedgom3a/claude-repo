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

  const rail = `<nav class="ma-rail" aria-label="${esc(tr("المجالات", "Domains"))}">
    <a class="ma-rail__logo" href="#/dashboard" aria-label="${esc(tr("ماستري أكاديمي - الرئيسية", "Mastery Academy home"))}">
      <svg class="ma-logo" width="44" height="19" aria-hidden="true"><use href="#ma-mark"></use></svg>
    </a>
    ${nav
      .map((m) => {
        const first = m.sections[0]?.items[0]?.href ?? m.href;
        const badge = m.disabled ? 0 : moduleBadge(m);
        const cur = m.id === activeModule.id;
        return `<a class="ma-rail__item${m.disabled ? " is-disabled" : ""}" href="#${first}" data-module="${m.id}" ${cur ? 'aria-current="true"' : ""} title="${esc(tr(m.title))}${m.note ? " — " + esc(tr(m.note)) : ""}">
          ${icon(m.icon)}<span>${esc(tr(m.title))}</span>
          ${badge ? `<span class="ma-rail__dot" aria-label="${fmtNum(badge)} ${esc(tr("بانتظارك", "waiting"))}">${fmtNum(badge)}</span>` : ""}
        </a>`;
      })
      .join("")}
    <span class="ma-rail__spacer"></span>
    ${iconBtn("panel", tr("إظهار/إخفاء القائمة الجانبية", "Toggle sidebar"), 'data-toggle-sidebar aria-keyshortcuts="Control+B"')}
  </nav>`;

  const sidebar = `<nav class="ma-sidebar" data-sidebar aria-label="${esc(tr(activeModule.title))}">${sidebarInner(activeModule, active, collapsedSections)}</nav>`;

  const role = currentRole();
  const topbar = `<header class="ma-topbar">
    <span class="ma-topbar__mobile">${iconBtn("menu", tr("فتح القائمة", "Open menu"), "data-open-nav")}</span>
    <nav class="ma-topbar__crumbs ma-breadcrumbs" aria-label="${esc(tr("مسار التنقل", "Breadcrumb"))}">
      <ol>${crumbs
        .map(([label, href], i) => {
          const last = i === crumbs.length - 1;
          return `<li>${i ? icon("chevronEnd", "ma-icon-dir") : ""}${last || !href ? `<span ${last ? 'aria-current="page"' : ""}>${esc(label)}</span>` : `<a href="#${href}">${esc(label)}</a>`}</li>`;
        })
        .join("")}</ol>
    </nav>
    <button type="button" class="ma-btn ma-btn--soft ma-btn--sm" data-open-palette aria-keyshortcuts="Control+K Meta+K">${icon("search")}<span class="ma-topbar__desktop">${esc(tr("بحث أو أمر", "Search or jump to"))}</span> <span class="ma-kbd ma-topbar__desktop">Ctrl K</span></button>
    ${iconBtn("globe", lang === "ar" ? "English" : "العربية", `data-lang lang="${lang === "ar" ? "en" : "ar"}"`)}
    ${iconBtn(document.documentElement.dataset.theme === "dark" ? "sun" : "moon", tr("تبديل المظهر", "Toggle theme"), "data-theme-toggle")}
    <div class="ma-menu">
      <button type="button" class="ma-btn ma-btn--bare ma-btn--icon" data-user-menu aria-haspopup="true" aria-expanded="false" aria-label="${esc(tr("حسابي", "My account"))}"><span class="ma-avatar" style="background:var(--yellow);margin:0">MA</span></button>
      <div class="ma-menu__pop" hidden role="menu">
        <p class="ma-menu__label">${esc(tr("عرض كـ (تجريبي)", "View as (demo)"))}</p>
        ${ROLES.map((r) => `<button type="button" class="ma-menu__item" role="menuitemradio" aria-checked="${r.id === role.id}" data-role="${r.id}">${r.id === role.id ? icon("check") : `<span style="width:20px"></span>`}${esc(tr(r.name))}</button>`).join("")}
        <p class="ma-menu__label">${esc(tr("إخفاء العناصر ليس صلاحية: الخادم يتحقق من كل عملية.", "Hiding items is not authorization: the API checks every call."))}</p>
        <a class="ma-menu__item" role="menuitem" href="#/settings/audit">${icon("history")}${esc(tr("سجل التدقيق", "Audit log"))}</a>
        <button type="button" class="ma-menu__item" role="menuitem" data-signout>${icon("logout")}${esc(tr("تسجيل الخروج", "Sign out"))}</button>
      </div>
    </div>
  </header>`;

  app.innerHTML = `
    <div class="ma-nav-drawer" id="nav-drawer">${rail}${sidebar}</div>
    <div class="ma-scrim" data-close-nav></div>
    <div class="ma-main">
      ${topbar}
      <main id="main" class="ma-content" tabindex="-1"></main>
    </div>`;

  wireShell(app);
  wirePreview(app, nav, active, activeModule);
  return app.querySelector("#main");
}

/** Sidebar content for one domain. Used for the current domain and for rail hover previews. */
function sidebarInner(module, active, collapsedSections = load("collapsedSections", {})) {
  if (module.disabled) {
    return `<div class="ma-sidebar__head"><h2 class="ma-sidebar__title">${esc(tr(module.title))}</h2></div>
      <p class="ma-sidebar__empty">${esc(tr(module.note ?? { ar: "", en: "" }))}</p>`;
  }
  return `<div class="ma-sidebar__head"><h2 class="ma-sidebar__title">${esc(tr(module.title))}</h2></div>
    <div class="ma-sidebar__search"><div class="ma-search">${icon("search")}
      <input class="ma-input ma-input--search" type="search" data-nav-filter placeholder="${esc(tr("ابحث في الصفحات", "Search pages"))}" aria-label="${esc(tr("ابحث في صفحات هذا القسم", "Search pages in this domain"))}">
    </div></div>
    <div class="ma-sidebar__nav">
      ${module.sections
        .map((s, si) => {
          const key = `${module.id}:${si}`;
          // The section holding the active page is always revealed.
          const holdsActive = s.items.some((i) => i.href === active?.href);
          const open = holdsActive || !collapsedSections[key];
          return `<div class="ma-sidebar__section" data-section>
            <button type="button" class="ma-sidebar__section-btn" aria-expanded="${open}" aria-controls="sec-${si}" data-sec="${key}">${icon("chevron")}${esc(tr(s.title))}</button>
            <ul class="ma-sidebar__list" id="sec-${si}" ${open ? "" : "hidden"}>
              ${s.items
                .map((i) => {
                  const n = i.badge ? ops[i.badge] : 0;
                  return `<li data-item="${esc(tr(i.title).toLowerCase())} ${esc(i.title.en.toLowerCase())}"><a class="ma-sidebar__link" href="#${i.href}" ${i.href === active?.href ? 'aria-current="page"' : ""}>
                    <span>${esc(tr(i.title))}</span>${n ? `<span class="ma-sidebar__count">${fmtNum(n)}</span>` : ""}</a></li>`;
                })
                .join("")}
            </ul>
          </div>`;
        })
        .join("")}
      <p class="ma-sidebar__empty" data-nav-empty hidden>${esc(tr("لا توجد صفحة بهذا الاسم. جرّب البحث الشامل (Ctrl K).", "No page by that name. Try global search (Ctrl K)."))}</p>
    </div>`;
}

/**
 * Rail preview: hovering or focusing a domain shows its feature links in the sidebar without
 * navigating; leaving the navigation area restores the current domain. With the sidebar collapsed
 * (or in the studio) the preview opens as a fly-out. In the mobile drawer a tap previews instead
 * of navigating, because touch has no hover.
 */
function wirePreview(app, nav, active, activeModule) {
  const drawer = app.querySelector(".ma-nav-drawer");
  const side = app.querySelector("[data-sidebar]");
  const rail = app.querySelector(".ma-rail");
  let shown = activeModule.id;
  let enterTimer;
  let leaveTimer;

  const show = (id) => {
    if (id === shown) return;
    const m = nav.find((x) => x.id === id);
    if (!m) return;
    shown = id;
    side.innerHTML = sidebarInner(m, active);
    side.setAttribute("aria-label", tr(m.title));
    side.classList.toggle("is-preview", id !== activeModule.id);
    rail.querySelectorAll("[data-module]").forEach((a) => a.classList.toggle("is-previewed", a.dataset.module === id && id !== activeModule.id));
    wireSidebar(app);
  };
  const peekOpen = () => app.classList.contains("is-sidebar-collapsed") || app.classList.contains("is-studio");
  const restore = () => {
    show(activeModule.id);
    app.classList.remove("is-peek");
  };

  rail.querySelectorAll("[data-module]").forEach((a) => {
    const preview = () => {
      clearTimeout(leaveTimer);
      clearTimeout(enterTimer);
      // A short delay keeps the sidebar steady while the pointer travels across the rail.
      enterTimer = setTimeout(() => {
        show(a.dataset.module);
        if (peekOpen() && matchMedia("(min-width: 1024px)").matches) app.classList.add("is-peek");
      }, 90);
    };
    a.addEventListener("mouseenter", preview);
    a.addEventListener("focus", preview);
    a.addEventListener("click", (e) => {
      // Touch drawer: first tap shows the domain's links; the links themselves navigate.
      if (app.classList.contains("is-nav-open") && a.dataset.module !== shown) {
        e.preventDefault();
        clearTimeout(enterTimer);
        show(a.dataset.module);
      }
    });
  });
  rail.addEventListener("mouseleave", () => clearTimeout(enterTimer));
  drawer.addEventListener("mouseleave", () => {
    clearTimeout(enterTimer);
    leaveTimer = setTimeout(() => {
      if (!app.classList.contains("is-nav-open")) restore();
    }, 250);
  });
  drawer.addEventListener("mouseenter", () => clearTimeout(leaveTimer));
  drawer.addEventListener("focusout", (e) => {
    if (!drawer.contains(e.relatedTarget) && !app.classList.contains("is-nav-open")) restore();
  });
  drawer.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && shown !== activeModule.id) {
      restore();
      rail.querySelector(`[data-module="${activeModule.id}"]`)?.focus();
    }
  });
}

/** Sidebar filter and collapsible sections; re-run whenever the sidebar content is swapped. */
function wireSidebar(app) {
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
}

function wireShell(app) {
  wireSidebar(app);

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
