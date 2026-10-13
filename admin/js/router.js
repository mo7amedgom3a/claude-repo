// Minimal hash router: "#/sales/orders/1042/payments" → handler({ params: { id: "1042", tab: "payments" } }).
const routes = [];
let onChange = () => {};
let leaveGuard = null;
let lastHash = "";

/** define("/sales/orders/:id/:tab?", handler) — a trailing "?" makes a segment optional. */
export function define(pattern, handler) {
  const segs = pattern.split("/").filter(Boolean);
  routes.push({ pattern, segs, handler });
}

export function resolve(path) {
  const parts = path.split("/").filter(Boolean);
  for (const r of routes) {
    const params = {};
    let ok = true;
    const required = r.segs.filter((s) => !s.endsWith("?")).length;
    if (parts.length < required || parts.length > r.segs.length) continue;
    for (let i = 0; i < r.segs.length; i++) {
      const s = r.segs[i];
      const p = parts[i];
      if (s.startsWith(":")) {
        const name = s.slice(1).replace("?", "");
        if (p === undefined) {
          if (!s.endsWith("?")) ok = false;
          break;
        }
        params[name] = decodeURIComponent(p);
      } else if (s !== p) {
        ok = false;
        break;
      }
    }
    if (ok) return { route: r, params };
  }
  return null;
}

export function currentPath() {
  const h = location.hash.replace(/^#/, "");
  return h.split("?")[0] || "/dashboard";
}

export function navigate(path) {
  location.hash = "#" + path;
}

/** Register a check that returns a message when there is unsaved work; null clears it. */
export function setLeaveGuard(fn) {
  leaveGuard = fn;
}

export function start(handler) {
  onChange = handler;
  window.addEventListener("hashchange", () => {
    if (leaveGuard) {
      const msg = leaveGuard();
      if (msg && !window.confirm(msg)) {
        history.replaceState(null, "", lastHash || "#/dashboard");
        return;
      }
    }
    leaveGuard = null;
    lastHash = location.hash;
    onChange(currentPath());
  });
  window.addEventListener("beforeunload", (e) => {
    if (leaveGuard?.()) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  if (!location.hash) history.replaceState(null, "", "#/dashboard");
  lastHash = location.hash;
  onChange(currentPath());
}
