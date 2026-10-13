import { applyLang, setLang, getLang, tr } from "./i18n.js";
import { start, resolve, currentPath, setLeaveGuard } from "./router.js";
import { renderShell, visibleNav } from "./components/shell.js";
import { openPalette } from "./components/command-palette.js";
import { flatItems, matchActive } from "./config/navigation.js";
import { setRole } from "./permissions.js";
import { load, save } from "./store.js";
import { toast, empty, btn } from "./components/ui.js";
import "./config/routes.js";

const app = document.getElementById("app");
let firstRender = true;

function applyTheme() {
  const t = load("theme", "system");
  if (t === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
}

function effectiveTheme() {
  const t = document.documentElement.dataset.theme;
  if (t) return t;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Base breadcrumbs come from the sidebar config; pages append their contextual crumbs. */
function baseCrumbs(path) {
  const item = matchActive(path, flatItems(visibleNav()));
  if (!item) return [];
  const moduleHref = item.module.sections[0].items[0].href;
  const crumbs = [[tr(item.module.title), moduleHref]];
  if (item.href !== moduleHref || path !== item.href) crumbs.push([tr(item.title), item.href]);
  return crumbs;
}

function render(path) {
  const match = resolve(path);
  let page;
  try {
    page = match ? match.route.handler(match.params) : null;
  } catch (err) {
    console.error(err);
    page = null;
  }
  if (!page) {
    page = {
      title: tr("الصفحة غير موجودة", "Page not found"),
      render: (el) => (el.innerHTML = empty(tr("لم نجد هذه الصفحة. ربما نُقلت أو أنك لا تملك صلاحية الوصول إليها.", "We couldn't find this page. It may have moved, or you may not have access."), "search", btn(tr("العودة للرئيسية", "Back to dashboard"), { href: "/dashboard", kind: "ink" }))),
    };
  }
  if (page.forbidden) {
    const msg = tr("ليست لديك صلاحية لهذه الصفحة. اطلب الوصول من مدير النظام.", "You don't have access to this page. Ask an administrator for access.");
    page = { title: tr("لا تملك صلاحية", "No access"), render: (el) => (el.innerHTML = empty(msg, "lock")) };
  }

  const crumbs = [...(page.baseCrumbs ?? baseCrumbs(path)), ...(page.crumbs ?? [])];
  if (!crumbs.length) crumbs.push([page.title]);
  const main = renderShell(app, { path, crumbs, moduleId: page.module });

  app.classList.toggle("is-sidebar-collapsed", load("sidebarCollapsed", false));
  app.classList.toggle("is-focus", !!page.focus && !load("studioSidebar", false));
  app.classList.remove("is-nav-open");
  main.classList.toggle("adm-content--wide", !!page.wide);
  document.title = `${page.title} · ${tr("إدارة ماستري", "Mastery Admin")}`;
  document.querySelector(".adm-skip").textContent = tr("تخطي إلى المحتوى", "Skip to content");

  page.render(main);
  if (!firstRender) {
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
  firstRender = false;
}

function rerender() {
  setLeaveGuard(null);
  render(currentPath());
}

// One set of delegated listeners for shell controls (the shell re-renders on every route).
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-toggle-sidebar],[data-open-nav],[data-close-nav],[data-lang],[data-theme-toggle],[data-role],[data-signout],[data-open-palette]");
  if (!e.target.closest(".adm-menu")) {
    document.querySelectorAll(".adm-menu__pop").forEach((p) => (p.hidden = true));
    document.querySelectorAll("[data-user-menu]").forEach((b) => b.setAttribute("aria-expanded", "false"));
  }
  if (!t) return;
  if (t.matches("[data-toggle-sidebar]")) {
    if (app.classList.contains("is-focus")) {
      save("studioSidebar", true);
      app.classList.remove("is-focus");
    } else {
      const next = !app.classList.contains("is-sidebar-collapsed");
      save("sidebarCollapsed", next);
      app.classList.toggle("is-sidebar-collapsed", next);
    }
  } else if (t.matches("[data-open-nav]")) {
    app.classList.add("is-nav-open");
    app.querySelector(".adm-sidebar a, .adm-rail a")?.focus();
  } else if (t.matches("[data-close-nav]")) {
    app.classList.remove("is-nav-open");
  } else if (t.matches("[data-lang]")) {
    setLang(getLang() === "ar" ? "en" : "ar");
    rerender();
  } else if (t.matches("[data-theme-toggle]")) {
    const next = effectiveTheme() === "dark" ? "light" : "dark";
    save("theme", next);
    applyTheme();
    rerender();
  } else if (t.matches("[data-role]")) {
    setRole(t.dataset.role);
    rerender();
    toast(tr("تم تغيير الدور التجريبي: القائمة مفلترة حسب الصلاحيات", "Demo role changed: navigation is filtered by scopes"), "shield");
  } else if (t.matches("[data-signout]")) {
    toast(tr("هذا نموذج تجريبي: لا توجد جلسة حقيقية", "This is a prototype: there is no real session"), "info");
  } else if (t.matches("[data-open-palette]")) {
    openPalette();
  }
});

document.addEventListener("keydown", (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === "k") {
    e.preventDefault();
    openPalette();
  } else if (mod && e.key.toLowerCase() === "b") {
    e.preventDefault();
    document.querySelector("[data-toggle-sidebar]")?.click();
  } else if (e.key === "Escape" && app.classList.contains("is-nav-open")) {
    app.classList.remove("is-nav-open");
    document.querySelector("[data-open-nav]")?.focus();
  } else if (e.key === "/" && !e.target.closest("input,textarea,select,[contenteditable]")) {
    const f = document.querySelector("[data-nav-filter]");
    if (f && f.offsetParent) {
      e.preventDefault();
      f.focus();
    }
  }
});

async function loadSprite() {
  try {
    const res = await fetch("design-system/sprite.svg");
    if (!res.ok) return;
    const svg = await res.text();
    if (!svg.includes("<svg")) return;
    document.getElementById("sprite").innerHTML = svg;
    rerender();
  } catch {
    /* kit not installed yet: placeholder mark stays */
  }
}

applyTheme();
applyLang();
start(render);
loadSprite();
