import { esc, btn, toast, modal } from "./ui.js";
import { icon } from "./icons.js";
import { tr, fmtNum } from "../i18n.js";
import { load, save } from "../store.js";
import { navigate } from "../router.js";

/**
 * List-page table: search, filters, sorting, paging, saved views and bulk actions.
 * Paging is shaped like the planned server contract ({ page, pageSize, total }) — the
 * prototype slices locally, the real admin asks the API for one page at a time.
 */
export function dataTable(el, cfg) {
  const savedKey = `views:${cfg.id}`;
  const builtIn = [{ id: "all", label: tr("الكل", "All"), filters: {} }, ...(Array.isArray(cfg.views) ? cfg.views : [])];
  const state = { q: "", filters: {}, sort: cfg.defaultSort ?? null, page: 1, pageSize: cfg.pageSize ?? 10, view: "all", selected: new Set() };

  const userViews = () => load(savedKey, []);
  const allViews = () => [...builtIn, ...userViews()];

  function applyView(id) {
    const v = allViews().find((x) => x.id === id) ?? builtIn[0];
    state.view = v.id;
    state.filters = { ...v.filters };
    state.q = v.q ?? "";
    state.page = 1;
  }

  function filtered() {
    let rows = cfg.rows;
    const q = state.q.toLowerCase();
    if (q && cfg.search) rows = rows.filter((r) => cfg.search(r).toLowerCase().includes(q));
    for (const f of cfg.filters ?? []) {
      const v = state.filters[f.key];
      if (v != null && v !== "") rows = rows.filter((r) => f.test(r, v));
    }
    if (state.sort) {
      const col = cfg.columns.find((c) => c.key === state.sort.key);
      if (col?.sort) {
        const dir = state.sort.dir === "asc" ? 1 : -1;
        rows = [...rows].sort((a, b) => {
          const x = col.sort(a);
          const y = col.sort(b);
          return (x > y ? 1 : x < y ? -1 : 0) * dir;
        });
      }
    }
    return rows;
  }

  function render() {
    const rows = filtered();
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / state.pageSize));
    state.page = Math.min(state.page, pages);
    const pageRows = rows.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
    const bulk = cfg.bulk?.length;
    const allOnPage = pageRows.length && pageRows.every((r) => state.selected.has(r.id));

    el.innerHTML = `<section class="ma-panel ma-panel--flush" aria-label="${esc(cfg.label ?? "")}">
      ${cfg.views !== false ? `<div class="ma-views" role="group" aria-label="${esc(tr("طرق العرض المحفوظة", "Saved views"))}">
        ${allViews()
          .map((v) => `<button type="button" class="ma-chip" data-view="${esc(v.id)}" aria-pressed="${v.id === state.view}">${esc(v.label)}${v.user ? ` <span data-del-view="${esc(v.id)}" role="button" aria-label="${esc(tr("حذف العرض", "Delete view"))}" tabindex="0">${icon("x")}</span>` : ""}</button>`)
          .join("")}
        <button type="button" class="ma-chip" data-save-view>${icon("plus")}${esc(tr("حفظ العرض الحالي", "Save current view"))}</button>
      </div>` : ""}
      <div class="ma-toolbar">
        ${cfg.search ? `<div class="ma-search">${icon("search")}<input class="ma-input ma-input--search" type="search" data-q value="${esc(state.q)}" placeholder="${esc(cfg.searchPlaceholder ?? tr("بحث…", "Search…"))}" aria-label="${esc(tr("بحث في الجدول", "Search table"))}"></div>` : ""}
        ${(cfg.filters ?? [])
          .map(
            (f) => `<select class="ma-select" data-filter="${f.key}" aria-label="${esc(f.label)}">
              <option value="">${esc(f.label)}: ${esc(tr("الكل", "All"))}</option>
              ${f.options.map(([v, l]) => `<option value="${esc(v)}"${String(state.filters[f.key] ?? "") === String(v) ? " selected" : ""}>${esc(l)}</option>`).join("")}
            </select>`,
          )
          .join("")}
        <span class="ma-spacer"></span>
        ${cfg.exportable !== false ? btn(tr("تصدير CSV", "Export CSV"), { ic: "download", sm: true, attrs: "data-export" }) : ""}
      </div>
      ${bulk && state.selected.size ? `<div class="ma-bulkbar"><strong>${fmtNum(state.selected.size)} ${esc(tr("محدد", "selected"))}</strong>
        ${cfg.bulk.map((b, i) => btn(b.label, { sm: true, attrs: `data-bulk="${i}"` })).join("")}
        ${btn(tr("إلغاء التحديد", "Clear selection"), { sm: true, attrs: "data-clear" })}</div>` : ""}
      ${total ? `<div class="ma-table-wrap"><table class="ma-table">
        <caption class="ma-sr">${esc(cfg.label ?? "")}</caption>
        <thead><tr>
          ${bulk ? `<th scope="col" style="width:40px"><input type="checkbox" data-all aria-label="${esc(tr("تحديد الصفحة", "Select page"))}" ${allOnPage ? "checked" : ""}></th>` : ""}
          ${cfg.columns
            .map((c) => {
              const sorted = state.sort?.key === c.key;
              const aria = sorted ? ` aria-sort="${state.sort.dir === "asc" ? "ascending" : "descending"}"` : "";
              const label = c.sort ? `<button type="button" data-sort="${c.key}">${esc(c.label)}${icon("sort")}</button>` : esc(c.label);
              return `<th scope="col"${aria} class="${c.num ? "is-num" : ""}">${label}</th>`;
            })
            .join("")}
        </tr></thead>
        <tbody>
          ${pageRows
            .map(
              (r) => `<tr${cfg.rowHref ? ` class="is-link" data-href="${esc(cfg.rowHref(r))}"` : ""}>
              ${bulk ? `<td><input type="checkbox" data-sel="${esc(r.id)}" ${state.selected.has(r.id) ? "checked" : ""} aria-label="${esc(tr("تحديد", "Select"))} ${esc(r.id)}"></td>` : ""}
              ${cfg.columns.map((c) => `<td class="${c.num ? "is-num" : ""}">${c.render(r)}</td>`).join("")}
            </tr>`,
            )
            .join("")}
        </tbody>
      </table></div>
      <div class="ma-pager">
        <span>${esc(tr("عرض", "Showing"))} ${fmtNum((state.page - 1) * state.pageSize + 1)}–${fmtNum(Math.min(state.page * state.pageSize, total))} ${esc(tr("من", "of"))} ${fmtNum(total)}</span>
        <span class="ma-spacer"></span>
        <label class="ma-cluster">${esc(tr("لكل صفحة", "Per page"))}
          <select class="ma-select" data-size>${[10, 25, 50].map((n) => `<option${n === state.pageSize ? " selected" : ""}>${n}</option>`).join("")}</select></label>
        <button type="button" class="ma-btn ma-btn--bare ma-btn--icon" data-page="-1" aria-label="${esc(tr("السابق", "Previous"))}" ${state.page === 1 ? "disabled" : ""}>${icon("chevronStart", "ma-icon-dir")}</button>
        <span class="ma-num">${fmtNum(state.page)} / ${fmtNum(pages)}</span>
        <button type="button" class="ma-btn ma-btn--bare ma-btn--icon" data-page="1" aria-label="${esc(tr("التالي", "Next"))}" ${state.page === pages ? "disabled" : ""}>${icon("chevronEnd", "ma-icon-dir")}</button>
      </div>` : `<div class="ma-empty">${icon("search")}<p>${esc(cfg.emptyText ?? tr("لا توجد نتائج مطابقة. جرّب تغيير البحث أو الفلاتر.", "No matching results. Try changing the search or filters."))}</p></div>`}
    </section>`;
    wire();
  }

  function wire() {
    const q = el.querySelector("[data-q]");
    q?.addEventListener("input", () => {
      state.q = q.value;
      state.page = 1;
      state.view = "";
      const pos = q.selectionStart;
      render();
      const nq = el.querySelector("[data-q]");
      nq.focus();
      nq.setSelectionRange(pos, pos);
    });
    el.querySelectorAll("[data-filter]").forEach((s) =>
      s.addEventListener("change", () => {
        state.filters[s.dataset.filter] = s.value;
        state.page = 1;
        state.view = "";
        render();
      }),
    );
    el.querySelectorAll("[data-sort]").forEach((b) =>
      b.addEventListener("click", () => {
        const k = b.dataset.sort;
        state.sort = state.sort?.key === k ? { key: k, dir: state.sort.dir === "asc" ? "desc" : "asc" } : { key: k, dir: "desc" };
        render();
        el.querySelector(`[data-sort="${k}"]`)?.focus();
      }),
    );
    el.querySelectorAll("[data-page]").forEach((b) =>
      b.addEventListener("click", () => {
        state.page += Number(b.dataset.page);
        render();
      }),
    );
    el.querySelector("[data-size]")?.addEventListener("change", (e) => {
      state.pageSize = Number(e.target.value);
      state.page = 1;
      render();
    });
    el.querySelectorAll("[data-view]").forEach((b) =>
      b.addEventListener("click", (e) => {
        const del = e.target.closest("[data-del-view]");
        if (del) {
          save(savedKey, userViews().filter((v) => v.id !== del.dataset.delView));
          applyView("all");
        } else applyView(b.dataset.view);
        render();
      }),
    );
    el.querySelector("[data-save-view]")?.addEventListener("click", () => {
      modal({
        title: tr("حفظ العرض", "Save view"),
        body: `<div class="ma-field"><label class="ma-label" for="view-name">${esc(tr("اسم العرض", "View name"))}</label><input class="ma-input" id="view-name" placeholder="${esc(tr("مثال: طلبات تمارا غير المكتملة", "e.g. Unpaid Tamara orders"))}"></div>
          <p class="ma-muted ma-section-gap">${esc(tr("يحفظ البحث والفلاتر الحالية على هذا الجهاز.", "Saves the current search and filters on this device."))}</p>`,
        foot: `${btn(tr("إلغاء", "Cancel"), { attrs: "data-close" })}${btn(tr("حفظ العرض", "Save view"), { kind: "primary", attrs: "data-ok" })}`,
        onMount(panel, close) {
          panel.querySelector("[data-ok]").addEventListener("click", () => {
            const name = panel.querySelector("#view-name").value.trim();
            if (!name) return panel.querySelector("#view-name").focus();
            const v = { id: `u${Date.now()}`, label: name, filters: { ...state.filters }, q: state.q, user: true };
            save(savedKey, [...userViews(), v]);
            state.view = v.id;
            close();
            render();
            toast(tr("تم حفظ العرض", "View saved"));
          });
        },
      });
    });
    el.querySelector("[data-all]")?.addEventListener("change", (e) => {
      const rows = filtered().slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
      rows.forEach((r) => (e.target.checked ? state.selected.add(r.id) : state.selected.delete(r.id)));
      render();
    });
    el.querySelectorAll("[data-sel]").forEach((c) =>
      c.addEventListener("change", () => {
        const id = cfg.rows.find((r) => String(r.id) === c.dataset.sel)?.id;
        c.checked ? state.selected.add(id) : state.selected.delete(id);
        render();
      }),
    );
    el.querySelector("[data-clear]")?.addEventListener("click", () => {
      state.selected.clear();
      render();
    });
    el.querySelectorAll("[data-bulk]").forEach((b) =>
      b.addEventListener("click", () => {
        cfg.bulk[Number(b.dataset.bulk)].onClick([...state.selected]);
        state.selected.clear();
        render();
      }),
    );
    el.querySelector("[data-export]")?.addEventListener("click", () => toast(tr("سيتم تجهيز الملف وإرساله إلى بريدك (تجريبي)", "Export queued; you'll get an email when it's ready (demo)"), "download"));
    el.querySelectorAll("tr[data-href]").forEach((tr_) =>
      tr_.addEventListener("click", (e) => {
        if (e.target.closest("a,button,input,select,label")) return;
        navigate(tr_.dataset.href);
      }),
    );
  }

  applyView("all");
  if (cfg.initialFilters) Object.assign(state.filters, cfg.initialFilters), (state.view = "");
  render();
}
