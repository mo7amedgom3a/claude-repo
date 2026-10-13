import { tr, fmtNum, fmtDuration } from "../i18n.js";
import { esc, card, btn, badge, tabs, alert, field, drawer, toast, validate, empty } from "../components/ui.js";
import { icon } from "../components/icons.js";
import { courses, customers, curriculumFor, byId, COLORS } from "../data/db.js";
import { customerCell, date, COURSE_STATUS } from "./common.js";
import { can } from "../permissions.js";

const KIND = {
  video: { ic: "video", label: { ar: "فيديو", en: "Video" } },
  file: { ic: "file", label: { ar: "ملف", en: "File" } },
  quiz: { ic: "quiz", label: { ar: "اختبار", en: "Quiz" } },
  assignment: { ic: "clipboard", label: { ar: "واجب", en: "Assignment" } },
  live: { ic: "calendar", label: { ar: "جلسة مباشرة", en: "Live session" } },
};

// Curriculum edits are kept per course for the session so drag-and-drop feels real.
const cache = new Map();
const outlineFor = (c) => (cache.has(c.id) ? cache.get(c.id) : cache.set(c.id, curriculumFor(c)).get(c.id));

const SECTIONS = () => [
  ["curriculum", tr("المنهج", "Curriculum")],
  ["quizzes", tr("الاختبارات", "Quizzes")],
  ["assignments", tr("الواجبات", "Assignments")],
  ["live-sessions", tr("الجلسات المباشرة", "Live sessions")],
  ["forum", tr("المنتدى", "Forum")],
  ["wiki", tr("الويكي", "Wiki")],
  ["glossary", tr("المصطلحات", "Glossary")],
  ["gradebook", tr("سجل الدرجات", "Gradebook")],
];

export function studioPage({ id, section = "curriculum" }) {
  const c = byId(courses, id);
  if (!c) return null;
  const base = `/learning/courses/${c.id}/studio`;
  const editable = can("courses.update");
  const label = SECTIONS().find(([k]) => k === section)?.[1] ?? "";
  return {
    title: `${tr("الاستوديو", "Studio")} · ${tr(c.title)}`,
    crumbs: [[tr(c.title), `/learning/courses/${c.id}`], [tr("الاستوديو", "Studio"), `${base}/curriculum`], ...(section !== "curriculum" ? [[label]] : [])],
    focus: true,
    wide: true,
    render(el) {
      el.innerHTML = `
        <div class="ma-studio-head">
          <a class="ma-back" style="margin:0" href="#/learning/courses/${c.id}">${icon("arrowBack", "ma-icon-dir")}${esc(tr("تفاصيل الدورة", "Course details"))}</a>
          <span class="ma-thumb" style="background:${c.color};margin:0"></span>
          <h1 style="font-size:20px">${esc(tr(c.title))}</h1>${badge(COURSE_STATUS[c.status])}
          <span class="ma-spacer"></span>
          <span class="ma-muted ma-cluster" style="font-size:13px">${icon("refresh")}${esc(tr("متزامن مع نظام التعلم منذ دقيقتين", "Synced with the LMS 2 min ago"))}</span>
          ${btn(tr("معاينة كمتدرب", "Preview as student"), { ic: "eye" })}
          ${editable ? btn(tr("نشر التغييرات", "Publish changes"), { kind: "primary", attrs: "data-publish" }) : ""}
        </div>
        ${tabs(base, SECTIONS(), section)}
        <div data-body></div>`;
      const body = el.querySelector("[data-body]");
      ({ curriculum, quizzes, assignments, "live-sessions": live, forum, wiki, glossary, gradebook }[section] ?? curriculum)(body, c, editable);
      el.querySelector("[data-publish]")?.addEventListener("click", () => toast(tr("أُرسلت التغييرات إلى نظام التعلم. ستظهر للمتدربين بعد اكتمال المزامنة.", "Changes sent to the LMS. Students see them once the sync completes."), "refresh"));
    },
  };
}

/* ---------- Curriculum: outline + item editor, drag-and-drop with keyboard alternative ---------- */
function curriculum(el, c, editable) {
  const units = outlineFor(c);
  let selected = units[0]?.items[0]?.id;

  const find = (itemId) => {
    for (const u of units) {
      const i = u.items.findIndex((x) => x.id === itemId);
      if (i >= 0) return { unit: u, index: i, item: u.items[i] };
    }
    return null;
  };

  function paint() {
    const sel = find(selected);
    const totalVideo = units.flatMap((u) => u.items).reduce((s, x) => s + (x.duration ?? 0), 0);
    el.innerHTML = `<div class="ma-studio">
      <aside class="ma-panel ma-outline" aria-label="${esc(tr("هيكل الدورة", "Course outline"))}" style="padding:12px">
        <div class="ma-cluster" style="padding:0 4px 8px"><strong>${esc(tr("الهيكل", "Outline"))}</strong><span class="ma-spacer"></span><span class="ma-muted" style="font-size:13px">${fmtNum(units.length)} ${esc(tr("وحدات", "units"))} · ${esc(fmtDuration(totalVideo))}</span></div>
        ${units
          .map(
            (u, ui) => `<div class="ma-outline__unit">
            <div class="ma-outline__unit-head">${icon("folder")}<span style="flex:1">${esc(tr(u.title))}</span></div>
            <ul class="ma-outline__items" data-unit="${ui}">
              ${u.items
                .map(
                  (it) => `<li draggable="${editable}" data-item="${it.id}">
                  <button type="button" class="ma-outline__item" data-select="${it.id}" aria-current="${it.id === selected}">
                    ${editable ? `<span class="ma-grip" aria-hidden="true">${icon("grip")}</span>` : ""}${icon(KIND[it.kind].ic)}<span style="flex:1">${esc(tr(it.title))}</span>
                    ${it.published ? "" : `<span class="ma-tag ma-tag--soft">${esc(tr("مخفي", "Hidden"))}</span>`}
                  </button></li>`,
                )
                .join("")}
            </ul>
            ${editable ? `<button type="button" class="ma-btn ma-btn--soft ma-btn--sm" style="margin:0 0 10px" data-add-item="${ui}">${icon("plus")}${esc(tr("إضافة عنصر", "Add item"))}</button>` : ""}
          </div>`,
          )
          .join("")}
        ${editable ? `<div class="ma-section-gap">${btn(tr("إضافة وحدة", "Add unit"), { ic: "plus", sm: true, attrs: "data-add-unit" })}</div>` : ""}
      </aside>
      <section class="ma-stack" aria-live="polite">
        ${alert("info", tr("المحتوى يعيش في نظام التعلم", "Content lives in the LMS"), esc(tr("التعديلات هنا تُرسل عبر lms_integration ولا تُنسخ إلى قاعدة بيانات المتجر.", "Edits here go through lms_integration; they are not copied into the commerce database.")))}
        ${sel ? editor(sel, editable) : card("", empty(tr("اختر عنصرًا من الهيكل لتعديله", "Pick an item in the outline to edit it"), "layers"))}
      </section>
    </div>`;
    wire();
  }

  function editor({ unit, index, item }, canEdit) {
    const dis = canEdit ? "" : "disabled";
    let kindBody = "";
    if (item.kind === "video")
      kindBody = `<div class="ma-video" role="img" aria-label="${esc(tr("معاينة الفيديو", "Video preview"))}">${icon("play")}</div>
        <div class="ma-cluster ma-section-gap"><span class="ma-muted">${esc(tr("المدة", "Duration"))}: ${esc(fmtDuration(item.duration ?? 0))} · Bunny Stream</span><span class="ma-spacer"></span>${canEdit ? btn(tr("استبدال الفيديو", "Replace video"), { sm: true, ic: "upload" }) : ""}</div>`;
    else if (item.kind === "quiz") kindBody = `<p>${esc(tr("10 أسئلة · درجة النجاح 60% · 3 محاولات", "10 questions · pass mark 60% · 3 attempts"))}</p><div class="ma-section-gap">${btn(tr("تحرير الأسئلة", "Edit questions"), { href: `/learning/courses/${c.id}/studio/quizzes`, sm: true })}</div>`;
    else if (item.kind === "assignment") kindBody = `<p>${esc(tr("واجب تطبيقي يُقيّمه المدرب يدويًا.", "Applied assignment graded manually by the instructor."))}</p><div class="ma-section-gap">${btn(tr("عرض التسليمات", "View submissions"), { href: `/learning/courses/${c.id}/studio/assignments`, sm: true })}</div>`;
    else if (item.kind === "live") kindBody = `<p>${esc(tr("جلسة Zoom مرتبطة بهذا الدرس.", "A Zoom session linked to this lesson."))}</p><div class="ma-section-gap">${btn(tr("إدارة الجلسات", "Manage sessions"), { href: `/learning/courses/${c.id}/studio/live-sessions`, sm: true })}</div>`;
    else kindBody = `<div class="ma-cluster">${icon("file")}<span>unit-summary.pdf · 1.2 MB</span><span class="ma-spacer"></span>${canEdit ? btn(tr("استبدال", "Replace"), { sm: true, ic: "upload" }) : ""}</div>`;
    return card(
      tr(item.title),
      `<form class="ma-form" data-editor>
        <div class="ma-form-grid">
          ${field({ id: "it-title", label: tr("العنوان", "Title"), value: tr(item.title), required: true, attrs: dis })}
          ${field({ id: "it-kind", label: tr("النوع", "Type"), value: item.kind, options: Object.entries(KIND).map(([k, v]) => [k, tr(v.label)]), attrs: dis })}
        </div>
        ${kindBody}
        <label class="ma-check"><input type="checkbox" id="it-pub" ${item.published ? "checked" : ""} ${dis}> ${esc(tr("ظاهر للمتدربين", "Visible to students"))}</label>
        <label class="ma-check"><input type="checkbox" ${dis} ${item.kind === "video" ? "checked" : ""}> ${esc(tr("درس مجاني للمعاينة", "Free preview lesson"))}</label>
        ${canEdit ? `<div class="ma-cluster">
          <span class="ma-muted" style="font-size:13px">${esc(tr("الموضع", "Position"))}: ${esc(tr(unit.title))} · ${index + 1}</span><span class="ma-spacer"></span>
          ${btn(tr("تحريك لأعلى", "Move up"), { sm: true, attrs: "data-move=-1" })}${btn(tr("تحريك لأسفل", "Move down"), { sm: true, attrs: "data-move=1" })}
          ${btn(tr("حذف", "Delete"), { sm: true, kind: "danger", ic: "trash", attrs: "data-delete" })}
          ${btn(tr("حفظ العنصر", "Save item"), { sm: true, kind: "ink", attrs: "data-save" })}
        </div>` : ""}
      </form>`,
    );
  }

  function wire() {
    el.querySelectorAll("[data-select]").forEach((b) =>
      b.addEventListener("click", () => {
        selected = b.dataset.select;
        paint();
        el.querySelector(`[data-select="${selected}"]`)?.focus();
      }),
    );
    const ed = el.querySelector("[data-editor]");
    ed?.querySelector("[data-save]")?.addEventListener("click", () => {
      if (!validate(ed, { "it-title": (v) => (!v ? tr("العنوان مطلوب", "Title is required") : null) })) return;
      const { item } = find(selected);
      const v = ed.querySelector("#it-title").value;
      item.title = { ar: v, en: v };
      item.kind = ed.querySelector("#it-kind").value;
      item.published = ed.querySelector("#it-pub").checked;
      paint();
      toast(tr("تم حفظ العنصر", "Item saved"));
    });
    ed?.querySelectorAll("[data-move]").forEach((b) =>
      b.addEventListener("click", () => {
        const { unit, index } = find(selected);
        const j = index + Number(b.dataset.move);
        if (j < 0 || j >= unit.items.length) return;
        [unit.items[index], unit.items[j]] = [unit.items[j], unit.items[index]];
        paint();
        el.querySelector(`[data-move="${b.dataset.move}"]`)?.focus();
      }),
    );
    ed?.querySelector("[data-delete]")?.addEventListener("click", () => {
      const { unit, index } = find(selected);
      unit.items.splice(index, 1);
      selected = unit.items[0]?.id ?? units[0]?.items[0]?.id;
      paint();
      toast(tr("تم حذف العنصر", "Item deleted"), "trash");
    });
    el.querySelector("[data-add-unit]")?.addEventListener("click", () => {
      const n = units.length + 1;
      units.push({ id: `${c.id}-u${n}-${Date.now()}`, title: { ar: `الوحدة ${n}: وحدة جديدة`, en: `Unit ${n}: new unit` }, items: [] });
      paint();
    });
    el.querySelectorAll("[data-add-item]").forEach((b) =>
      b.addEventListener("click", () =>
        drawer({
          title: tr("إضافة عنصر", "Add item"),
          body: `<div class="ma-form">${field({ id: "ni-title", label: tr("العنوان", "Title"), required: true })}${field({ id: "ni-kind", label: tr("النوع", "Type"), options: Object.entries(KIND).map(([k, v]) => [k, tr(v.label)]) })}</div>`,
          foot: `${btn(tr("إلغاء", "Cancel"), { attrs: "data-close" })}${btn(tr("إضافة", "Add"), { kind: "primary", attrs: "data-ok" })}`,
          onMount(p, close) {
            p.querySelector("[data-ok]").addEventListener("click", () => {
              if (!validate(p, { "ni-title": (v) => (!v ? tr("مطلوب", "Required") : null) })) return;
              const v = p.querySelector("#ni-title").value;
              const it = { id: `${c.id}-n${Date.now()}`, kind: p.querySelector("#ni-kind").value, title: { ar: v, en: v }, duration: 0, published: false };
              units[Number(b.dataset.addItem)].items.push(it);
              selected = it.id;
              close();
              paint();
            });
          },
        }),
      ),
    );

    // Pointer drag-and-drop across units; buttons above give the keyboard path.
    let dragId = null;
    el.querySelectorAll("li[data-item]").forEach((li) => {
      li.addEventListener("dragstart", (e) => {
        dragId = li.dataset.item;
        li.classList.add("ma-dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      li.addEventListener("dragend", () => li.classList.remove("ma-dragging"));
      li.addEventListener("dragover", (e) => {
        e.preventDefault();
        li.classList.add("ma-drop-target");
      });
      li.addEventListener("dragleave", () => li.classList.remove("ma-drop-target"));
      li.addEventListener("drop", (e) => {
        e.preventDefault();
        if (!dragId || dragId === li.dataset.item) return;
        const from = find(dragId);
        from.unit.items.splice(from.index, 1);
        const to = find(li.dataset.item);
        to.unit.items.splice(to.index, 0, from.item);
        dragId = null;
        paint();
        toast(tr("تم تحديث الترتيب", "Order updated"));
      });
    });
  }

  paint();
}

/* ---------- Other studio sections ---------- */
function table(head, rows) {
  return `<div class="ma-table-wrap"><table class="ma-table"><thead><tr>${head.map((h) => `<th class="${h.num ? "is-num" : ""}">${esc(h.l ?? h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}

function quizzes(el, c, editable) {
  const units = outlineFor(c);
  const qz = units.map((u, i) => ({ id: i + 1, unit: u, title: { ar: `اختبار ${tr(u.title).split(":")[0]}`, en: `Quiz — ${u.title.en.split(":")[0]}` }, questions: 6 + ((c.id + i) % 9), pass: 60, attempts: 2 + (i % 3), avg: 58 + ((c.id * (i + 3)) % 35) }));
  el.innerHTML = card(
    tr("الاختبارات", "Quizzes"),
    table([tr("الاختبار", "Quiz"), { l: tr("الأسئلة", "Questions"), num: true }, { l: tr("درجة النجاح", "Pass mark"), num: true }, { l: tr("المحاولات", "Attempts"), num: true }, { l: tr("متوسط الدرجات", "Average score"), num: true }, ""], qz.map((q) => `<tr><td><strong>${esc(tr(q.title))}</strong><span class="ma-cell-sub">${esc(tr(q.unit.title))}</span></td><td class="is-num">${q.questions}</td><td class="is-num">${q.pass}%</td><td class="is-num">${q.attempts}</td><td class="is-num">${q.avg}%</td><td>${btn(editable ? tr("تحرير الأسئلة", "Edit questions") : tr("عرض", "View"), { sm: true, attrs: `data-quiz="${q.id}"` })}</td></tr>`)),
    { flush: true, actions: editable ? btn(tr("إضافة اختبار", "Add quiz"), { sm: true, ic: "plus" }) : "" },
  );
  el.querySelectorAll("[data-quiz]").forEach((b) =>
    b.addEventListener("click", () => {
      const q = qz[Number(b.dataset.quiz) - 1];
      drawer({
        title: tr(q.title),
        wide: true,
        body: `<ol class="ma-list">${Array.from({ length: q.questions }, (_, i) => `<li><span class="ma-avatar" style="background:${COLORS[i % 8]}">${i + 1}</span><div class="ma-list__main"><strong>${esc(tr(["ما الهدف الأساسي من هذا الأسلوب؟", "أي مما يلي يُعد مثالًا صحيحًا؟", "رتب الخطوات التالية بالترتيب الصحيح.", "صواب أم خطأ: يجب تطبيق الأسلوب في كل الحالات."][i % 4], ["What is the main goal of this approach?", "Which of these is a correct example?", "Put these steps in the right order.", "True or false: always apply this approach."][i % 4]))}</strong><span class="ma-list__sub">${esc(tr(["اختيار من متعدد", "اختيار من متعدد", "ترتيب", "صواب/خطأ"][i % 4], ["Multiple choice", "Multiple choice", "Ordering", "True/false"][i % 4]))}</span></div>${editable ? btn(tr("تعديل", "Edit"), { sm: true }) : ""}</li>`).join("")}</ol>`,
        foot: editable ? `${btn(tr("إضافة سؤال", "Add question"), { ic: "plus" })}${btn(tr("تم", "Done"), { kind: "primary", attrs: "data-close" })}` : "",
      });
    }),
  );
}

function assignments(el, c, editable) {
  const subs = customers.slice(c.id % 30, (c.id % 30) + 8);
  el.innerHTML = `<div class="ma-cols ma-cols--main-side">
    ${card(tr("تسليمات بانتظار التقييم", "Submissions to grade"), table([tr("المتدرب", "Student"), tr("الواجب", "Assignment"), tr("التسليم", "Submitted"), ""], subs.slice(0, 5).map((u, i) => `<tr><td>${customerCell(u.id)}</td><td>${esc(tr(`الواجب ${i + 1}`, `Assignment ${i + 1}`))}</td><td>${date(u.lastSeen)}</td><td>${editable || can("courses.grade") ? btn(tr("تقييم", "Grade"), { sm: true, attrs: `data-grade="${u.id}"` }) : ""}</td></tr>`)), { flush: true, actions: editable ? btn(tr("تقييم الكل كمكتمل", "Mark all complete"), { sm: true }) : "" })}
    ${card(tr("الواجبات", "Assignments"), `<ul class="ma-list">${[1, 2, 3].map((n) => `<li>${icon("clipboard")}<div class="ma-list__main"><strong>${esc(tr(`الواجب ${n}`, `Assignment ${n}`))}</strong><span class="ma-list__sub">${fmtNum(20 + n * 13)} ${esc(tr("تسليم", "submissions"))}</span></div></li>`).join("")}</ul>`)}
  </div>`;
  el.querySelectorAll("[data-grade]").forEach((b) =>
    b.addEventListener("click", () =>
      drawer({
        title: tr("تقييم التسليم", "Grade submission"),
        body: `<div class="ma-form"><div class="ma-cluster">${icon("file")}<span>submission.pdf</span><span class="ma-spacer"></span>${btn(tr("فتح", "Open"), { sm: true, ic: "eye" })}</div>${field({ id: "gr", label: tr("الدرجة من 100", "Score out of 100"), type: "number", required: true, attrs: 'min="0" max="100"' })}${field({ id: "fb", label: tr("ملاحظات للمتدرب", "Feedback for the student"), type: "textarea" })}</div>`,
        foot: `${btn(tr("إلغاء", "Cancel"), { attrs: "data-close" })}${btn(tr("حفظ الدرجة", "Save grade"), { kind: "primary", attrs: "data-ok" })}`,
        onMount(p, close) {
          p.querySelector("[data-ok]").addEventListener("click", () => {
            if (!validate(p, { gr: (v) => (v === "" || Number(v) < 0 || Number(v) > 100 ? tr("بين 0 و 100", "Between 0 and 100") : null) })) return;
            close();
            b.closest("tr").remove();
            toast(tr("تم حفظ الدرجة", "Grade saved"));
          });
        },
      }),
    ),
  );
}

function live(el, c, editable) {
  const sessions = [3, 10, 17, -4, -11].map((d, i) => ({ id: i, at: new Date(Date.now() + d * 864e5).toISOString(), provider: i % 2 ? "BigBlueButton" : "Zoom", attendees: d < 0 ? 40 + i * 9 : null, title: { ar: `جلسة مباشرة ${i + 1}: أسئلة وأجوبة`, en: `Live session ${i + 1}: Q&A` } }));
  el.innerHTML = card(
    tr("الجلسات المباشرة", "Live sessions"),
    table([tr("الجلسة", "Session"), tr("الموعد", "When"), tr("المزود", "Provider"), { l: tr("الحضور", "Attended"), num: true }, ""], sessions.map((s) => `<tr><td><strong>${esc(tr(s.title))}</strong></td><td>${date(s.at, true)}</td><td>${s.provider}</td><td class="is-num">${s.attendees ? fmtNum(s.attendees) : "—"}</td><td>${s.attendees ? badge({ label: { ar: "انتهت", en: "Ended" }, tone: "neutral" }) : btn(tr("بدء الجلسة", "Start session"), { sm: true, ic: "video" })}</td></tr>`)),
    { flush: true, actions: editable ? btn(tr("جدولة جلسة", "Schedule session"), { sm: true, ic: "plus", attrs: "data-new" }) : "" },
  );
  el.querySelector("[data-new]")?.addEventListener("click", () =>
    drawer({
      title: tr("جدولة جلسة مباشرة", "Schedule live session"),
      body: `<div class="ma-form">${field({ id: "st", label: tr("العنوان", "Title"), required: true })}${field({ id: "sd", label: tr("الموعد", "Date and time"), type: "datetime-local", required: true })}${field({ id: "sp", label: tr("المزود", "Provider"), options: [["zoom", "Zoom"], ["bbb", "BigBlueButton"]] })}<label class="ma-check"><input type="checkbox" checked> ${esc(tr("إرسال تذكير للمتدربين قبل ساعة", "Remind students one hour before"))}</label></div>`,
      foot: `${btn(tr("إلغاء", "Cancel"), { attrs: "data-close" })}${btn(tr("جدولة", "Schedule"), { kind: "primary", attrs: "data-ok" })}`,
      onMount(p, close) {
        p.querySelector("[data-ok]").addEventListener("click", () => {
          if (!validate(p, { st: (v) => (!v ? tr("مطلوب", "Required") : null), sd: (v) => (!v ? tr("حدد الموعد", "Pick a time") : null) })) return;
          close();
          toast(tr("تمت جدولة الجلسة", "Session scheduled"), "calendar");
        });
      },
    }),
  );
}

function forum(el, c) {
  el.innerHTML = card(tr("مواضيع المنتدى", "Forum topics"), `<ul class="ma-list">${customers.slice(c.id % 40, (c.id % 40) + 5).map((u, i) => `<li>${icon("message")}<div class="ma-list__main"><strong>${esc(tr(["تجاربكم في تطبيق الأسلوب", "مصادر إضافية مقترحة", "سؤال حول الوحدة الثالثة", "مشاركة دراسة حالة", "نصائح للاختبار النهائي"][i], ["Your experience applying this", "Suggested extra resources", "Question on unit 3", "Sharing a case study", "Final quiz tips"][i]))}</strong><span class="ma-list__sub">${esc(tr(u.name))} · ${fmtNum(3 + i * 4)} ${esc(tr("رد", "replies"))}</span></div>${btn(tr("فتح", "Open"), { sm: true })}</li>`).join("")}</ul>`);
}

function wiki(el) {
  el.innerHTML = card(tr("مقالات الويكي", "Wiki articles"), `<ul class="ma-list">${["مقدمة الدورة", "أدوات العمل", "قوالب قابلة للتحميل"].map((t, i) => `<li>${icon("wiki")}<div class="ma-list__main"><strong>${esc(tr(t, ["Course introduction", "Working tools", "Downloadable templates"][i]))}</strong></div>${btn(tr("تعديل", "Edit"), { sm: true })}</li>`).join("")}</ul>`, { actions: btn(tr("مقال جديد", "New article"), { sm: true, ic: "plus" }) });
}

function glossary(el) {
  const terms = [["KPI", "مؤشر الأداء الرئيسي", "Key performance indicator"], ["OKR", "الأهداف والنتائج الرئيسية", "Objectives and key results"], ["ROI", "العائد على الاستثمار", "Return on investment"], ["SWOT", "تحليل نقاط القوة والضعف والفرص والتهديدات", "Strengths, weaknesses, opportunities, threats"]];
  el.innerHTML = card(tr("المصطلحات", "Glossary"), table([tr("المصطلح", "Term"), tr("التعريف", "Definition")], terms.map(([t, ar, en]) => `<tr><td><strong class="ma-ltr">${t}</strong></td><td>${esc(tr(ar, en))}</td></tr>`)), { flush: true, actions: btn(tr("إضافة مصطلح", "Add term"), { sm: true, ic: "plus" }) });
}

function gradebook(el, c) {
  const rows = customers.slice(c.id % 25, (c.id % 25) + 12);
  el.innerHTML = card(
    tr("سجل الدرجات", "Gradebook"),
    table([tr("المتدرب", "Student"), { l: tr("التقدم", "Progress"), num: true }, { l: tr("متوسط الاختبارات", "Quiz average"), num: true }, { l: tr("الواجبات", "Assignments"), num: true }, tr("الشهادة", "Certificate")], rows.map((u) => {
      const p = (u.id * 7) % 100;
      return `<tr><td>${customerCell(u.id)}</td><td class="is-num">${p}%</td><td class="is-num">${50 + (u.id % 50)}%</td><td class="is-num">${u.id % 4}/3</td><td>${p > 80 ? badge({ label: { ar: "صادرة", en: "Issued" }, tone: "success" }) : badge({ label: { ar: "لم تُستحق", en: "Not yet" }, tone: "neutral" })}</td></tr>`;
    })),
    { flush: true, actions: btn(tr("تصدير", "Export"), { sm: true, ic: "download" }) },
  );
}
