import { esc, btn, alert, toast } from "./ui.js";
import { icon } from "./icons.js";
import { tr, fmtDate } from "../i18n.js";
import { load, save, remove } from "../store.js";
import { setLeaveGuard, navigate } from "../router.js";

/**
 * Wizard template: stepper, per-step validation, draft autosave + restore, leave-page warning.
 * steps: [{ key, label, render(data) → html, collect?(root, data), validate?(root, data) → bool, final? }]
 * A step with `final: true` is the result screen (no back/next).
 */
export function wizard(el, { id, steps, data: initial = {}, onSubmit, cancelHref, submitLabel, draft = true }) {
  const key = `draft:${id}`;
  const stored = draft ? load(key, null) : null;
  let data = { ...initial };
  let i = 0;
  let dirty = false;
  let savedAt = null;
  let offerRestore = !!stored;

  setLeaveGuard(() => (dirty && !steps[i].final ? tr("لديك تغييرات غير محفوظة. هل تريد مغادرة الصفحة؟ (المسودة محفوظة على هذا الجهاز)", "You have unsaved changes. Leave this page? (A draft is kept on this device)") : null));

  function persist() {
    if (!draft) return;
    savedAt = new Date();
    save(key, { data, step: i, at: savedAt.toISOString() });
    const ind = el.querySelector("[data-draft]");
    if (ind) ind.innerHTML = `${icon("check")} ${esc(tr("تم حفظ المسودة", "Draft saved"))} ${savedAt.toLocaleTimeString()}`;
  }

  function render() {
    const s = steps[i];
    const visible = steps.filter((x) => !x.final);
    el.innerHTML = `
      ${offerRestore ? `<div class="ma-section-gap" style="margin:0 0 16px">${alert("info", tr("وجدنا مسودة غير مكتملة", "We found an unfinished draft"), `${esc(tr("آخر حفظ", "Last saved"))} ${esc(fmtDate(stored.at, true))}. <span class="ma-cluster" style="margin-top:8px">${btn(tr("استعادة المسودة", "Restore draft"), { sm: true, kind: "ink", attrs: "data-restore" })}${btn(tr("البدء من جديد", "Start over"), { sm: true, attrs: "data-discard" })}</span>`)}</div>` : ""}
      <ol class="ma-stepper" aria-label="${esc(tr("خطوات العملية", "Steps"))}">
        ${visible
          .map((x, k) => {
            const done = k < i || s.final;
            return `<li ${k === i && !s.final ? 'aria-current="step"' : ""} class="${done ? "is-done" : ""}"><span class="ma-stepper__n">${done ? icon("check") : k + 1}</span>${esc(x.label)}<span class="ma-sr">${done ? tr("مكتملة", "complete") : ""}</span></li>`;
          })
          .join("")}
      </ol>
      <section class="ma-panel" aria-labelledby="wiz-step-title">
        <h2 id="wiz-step-title" class="ma-panel__title" style="margin-bottom:4px">${esc(s.label)}</h2>
        ${s.final ? "" : `<p class="ma-muted" style="margin-bottom:16px">${esc(tr(`الخطوة ${i + 1} من ${visible.length}`, `Step ${i + 1} of ${visible.length}`))}</p>`}
        <form class="ma-form" data-step novalidate>${s.render(data)}</form>
        ${s.final ? "" : `<div class="ma-wizard__foot">
          ${i > 0 ? btn(tr("السابق", "Back"), { attrs: "data-back" }) : cancelHref ? btn(tr("إلغاء", "Cancel"), { href: cancelHref }) : ""}
          ${draft ? `<span class="ma-draft" data-draft aria-live="polite">${savedAt ? `${icon("check")} ${esc(tr("تم حفظ المسودة", "Draft saved"))}` : esc(tr("يتم حفظ المسودة تلقائيًا", "Drafts save automatically"))}</span>` : ""}
          <span class="ma-spacer"></span>
          ${btn(steps[i + 1]?.final || i === steps.length - 1 ? submitLabel : tr("الخطوة التالية", "Next step"), { kind: "primary", attrs: "data-next" })}
        </div>`}
      </section>`;
    wire();
    el.querySelector("#wiz-step-title")?.setAttribute("tabindex", "-1");
  }

  function collect() {
    const form = el.querySelector("[data-step]");
    form.querySelectorAll("input,select,textarea").forEach((f) => {
      if (!f.name) return;
      if (f.type === "checkbox") {
        if (f.dataset.multi) {
          data[f.name] = [...form.querySelectorAll(`input[name="${f.name}"]:checked`)].map((x) => x.value);
        } else data[f.name] = f.checked;
      } else if (f.type === "radio") {
        if (f.checked) data[f.name] = f.value;
      } else data[f.name] = f.value;
    });
    steps[i].collect?.(form, data);
  }

  function wire() {
    const form = el.querySelector("[data-step]");
    let t;
    form.addEventListener("input", () => {
      dirty = true;
      clearTimeout(t);
      t = setTimeout(() => {
        collect();
        persist();
      }, 500);
    });
    form.addEventListener("submit", (e) => e.preventDefault());
    steps[i].mount?.(form, data);
    el.querySelector("[data-back]")?.addEventListener("click", () => {
      collect();
      i--;
      persist();
      render();
      el.querySelector("#wiz-step-title").focus();
    });
    el.querySelector("[data-next]")?.addEventListener("click", async () => {
      collect();
      if (steps[i].validate && !steps[i].validate(form, data)) return;
      if (steps[i + 1]?.final || i === steps.length - 1) {
        const result = await onSubmit?.(data);
        if (result === false) return;
        dirty = false;
        if (draft) remove(key);
        setLeaveGuard(null);
        if (steps[i + 1]?.final) {
          i++;
          render();
        }
        return;
      }
      i++;
      persist();
      render();
      el.querySelector("#wiz-step-title").focus();
    });
    el.querySelector("[data-restore]")?.addEventListener("click", () => {
      data = { ...data, ...stored.data };
      i = Math.min(stored.step ?? 0, steps.length - 1);
      if (steps[i].final) i = 0;
      offerRestore = false;
      dirty = true;
      render();
      toast(tr("تمت استعادة المسودة", "Draft restored"));
    });
    el.querySelector("[data-discard]")?.addEventListener("click", () => {
      remove(key);
      offerRestore = false;
      render();
    });
  }

  render();
  return { go: (href) => navigate(href) };
}
