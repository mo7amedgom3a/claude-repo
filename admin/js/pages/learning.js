import { tr, fmtNum, fmtMoney } from "../i18n.js";
import { esc, pageHead, kpi, card, btn, badge, tabs, dl, alert, field, drawer, toast, validate, bars, avatar, empty, confirmDialog } from "../components/ui.js";
import { icon } from "../components/icons.js";
import { dataTable } from "../components/data-table.js";
import { wizard } from "../components/wizard.js";
import { courses, categories, instructors, packages, customers, orders, consultants, applications, certificateTemplates, qa, priceLists, byId, COLORS } from "../data/db.js";
import { customerCell, customerOf, courseOf, money, date, onOff, COURSE_STATUS, orderStatus } from "./common.js";
import { can } from "../permissions.js";

const catName = (id) => tr(byId(categories, id)?.name ?? { ar: "—", en: "—" });
const insOf = (id) => byId(instructors, id);
const TYPE = { course: { ar: "دورة", en: "Course" }, diploma: { ar: "دبلوم", en: "Diploma" }, free: { ar: "مجانية", en: "Free" } };
const thumb = (c) => `<span class="adm-thumb" style="background:${c.color}" aria-hidden="true"></span>`;

/* ---------------- Courses list ---------------- */
export function coursesPage() {
  return {
    title: tr("الدورات", "Courses"),
    render(el) {
      el.innerHTML = `${pageHead({
        title: tr("الدورات", "Courses"),
        sub: esc(tr("الكتالوج والتسعير والنشر. محتوى الدروس يُدار من استوديو الدورة.", "Catalog, pricing and publishing. Lesson content is managed in each course's studio.")),
        actions: can("courses.create") ? btn(tr("إنشاء دورة", "Create course"), { href: "/learning/courses/new", kind: "primary", ic: "plus" }) : "",
      })}<div data-t></div>`;
      dataTable(el.querySelector("[data-t]"), {
        id: "courses",
        label: tr("الدورات", "Courses"),
        rows: courses,
        rowHref: (c) => `/learning/courses/${c.id}`,
        search: (c) => `${c.title.ar} ${c.title.en} ${c.id}`,
        searchPlaceholder: tr("اسم الدورة أو رقمها…", "Course name or ID…"),
        columns: [
          { key: "t", label: tr("الدورة", "Course"), sort: (c) => tr(c.title), render: (c) => `<span class="adm-cell-flex">${thumb(c)}<span><a class="adm-cell-main" href="#/learning/courses/${c.id}">${esc(tr(c.title))}</a><span class="adm-cell-sub">${esc(catName(c.categoryId))} · ${esc(tr(TYPE[c.type]))}</span></span></span>` },
          { key: "i", label: tr("المدرب", "Instructor"), render: (c) => esc(tr(insOf(c.instructorId).name)) },
          { key: "p", label: tr("السعر", "Price"), num: true, sort: (c) => c.price, render: (c) => (c.price ? money(c.price) : esc(tr("مجانية", "Free"))) },
          { key: "s", label: tr("المتدربون", "Students"), num: true, sort: (c) => c.students, render: (c) => fmtNum(c.students) },
          { key: "r", label: tr("التقييم", "Rating"), num: true, sort: (c) => Number(c.rating), render: (c) => `${icon("star")} ${c.rating}` },
          { key: "st", label: tr("الحالة", "Status"), render: (c) => badge(COURSE_STATUS[c.status]) },
        ],
        filters: [
          { key: "status", label: tr("الحالة", "Status"), options: Object.entries(COURSE_STATUS).map(([k, v]) => [k, tr(v.label)]), test: (c, v) => c.status === v },
          { key: "cat", label: tr("التصنيف", "Category"), options: categories.map((x) => [x.id, tr(x.name)]), test: (c, v) => String(c.categoryId) === v },
          { key: "type", label: tr("النوع", "Type"), options: Object.entries(TYPE).map(([k, v]) => [k, tr(v)]), test: (c, v) => c.type === v },
        ],
        views: [
          { id: "drafts", label: tr("المسودات", "Drafts"), filters: { status: "draft" } },
          { id: "diplomas", label: tr("الدبلومات", "Diplomas"), filters: { type: "diploma" } },
          { id: "free", label: tr("المجانية", "Free"), filters: { type: "free" } },
        ],
        bulk: can("courses.update")
          ? [
              { label: tr("نشر", "Publish"), onClick: (ids) => (ids.forEach((id) => (byId(courses, id).status = "published")), toast(tr("تم النشر", "Published"))) },
              { label: tr("أرشفة", "Archive"), onClick: (ids) => (ids.forEach((id) => (byId(courses, id).status = "archived")), toast(tr("تمت الأرشفة", "Archived"))) },
            ]
          : [],
      });
    },
  };
}

/* ---------------- Course details ---------------- */
export const COURSE_TABS = () => [
  ["overview", tr("نظرة عامة", "Overview")],
  ["pricing", tr("التسعير", "Pricing")],
  ["media", tr("الوسائط", "Media")],
  ["students", tr("المتدربون", "Students")],
  ["revenue", tr("الإيرادات", "Revenue")],
  ["ratings", tr("التقييمات", "Ratings")],
  ["certificates", tr("الشهادات", "Certificates")],
  ["rules", tr("قواعد الإتمام", "Completion rules")],
];

export function courseDetailPage({ id, tab = "overview" }) {
  const c = byId(courses, id);
  if (!c) return null;
  const base = `/learning/courses/${c.id}`;
  const ins = insOf(c.instructorId);
  const enrolled = customers.filter((x) => x.enrollments.includes(c.id));
  const courseOrders = orders.filter((o) => o.items.some((i) => i.productType === 1 && i.productId === c.id));
  return {
    title: tr(c.title),
    crumbs: [[tr(c.title)]],
    render(el) {
      const ready = [
        [!!c.price || c.type === "free", tr("السعر محدد", "Price set")],
        [true, tr("صورة الدورة مرفوعة", "Course image uploaded")],
        [c.units > 0, tr("المنهج يحتوي وحدات منشورة", "Curriculum has published units")],
        [c.id % 4 !== 1, tr("قالب شهادة مرتبط", "Certificate template linked")],
      ];
      let body = "";
      if (tab === "overview") {
        body = `<div class="adm-grid adm-grid--main-side">
          <div class="adm-stack">
            <div class="adm-grid adm-grid--3">
              ${kpi({ label: tr("المتدربون", "Students"), value: fmtNum(c.students), field: c.color })}
              ${kpi({ label: tr("الإيرادات", "Revenue"), value: esc(fmtMoney(c.revenue)) })}
              ${kpi({ label: tr("التقييم", "Rating"), value: c.rating, meta: esc(tr(`${c.ratings} تقييم`, `${c.ratings} ratings`)) })}
            </div>
            ${card(tr("تفاصيل الدورة", "Course details"), dl([
              [tr("العنوان بالعربية", "Arabic title"), esc(c.title.ar)],
              [tr("العنوان بالإنجليزية", "English title"), `<span dir="ltr">${esc(c.title.en)}</span>`],
              [tr("التصنيف", "Category"), esc(catName(c.categoryId))],
              [tr("النوع", "Type"), esc(tr(TYPE[c.type]))],
              [tr("المدرب", "Instructor"), esc(tr(ins.name))],
              [tr("لغة الدورة", "Course language"), c.language === "ar" ? "العربية" : "English"],
              [tr("المحتوى", "Content"), esc(tr(`${c.units} وحدات · ${c.lessons} درسًا · ${c.hours} ساعة`, `${c.units} units · ${c.lessons} lessons · ${c.hours} hours`))],
              [tr("آخر تحديث", "Last updated"), date(c.updatedAt)],
            ]), { actions: can("courses.update") ? btn(tr("تعديل", "Edit"), { sm: true, ic: "edit", attrs: "data-edit" }) : "" })}
          </div>
          <div class="adm-stack">
            ${card(tr("جاهزية النشر", "Publishing readiness"), `<ul class="adm-list">${ready.map(([ok, l]) => `<li>${ok ? `<span style="color:var(--success)">${icon("check")}</span>` : `<span style="color:var(--warning)">${icon("alert")}</span>`}<span class="adm-list__main">${esc(l)}</span><span class="adm-sr">${ok ? tr("مكتمل", "done") : tr("ناقص", "missing")}</span></li>`).join("")}</ul>`)}
            ${card(tr("المحتوى التعليمي", "Learning content"), `<p class="adm-muted" style="margin-bottom:12px">${esc(tr("الوحدات والاختبارات والواجبات والجلسات المباشرة تُدار في الاستوديو.", "Units, quizzes, assignments and live sessions are managed in the studio."))}</p>${btn(tr("فتح استوديو الدورة", "Open course studio"), { href: `${base}/studio/curriculum`, kind: "ink", ic: "layers" })}`)}
          </div>
        </div>`;
      } else if (tab === "pricing") {
        const rows = [
          { name: tr("السعر الأساسي", "Main price"), price: c.price, original: c.originalPrice, window: tr("دائم", "Always"), main: true },
          ...priceLists.slice(0, 2).map((p) => ({ name: tr(p.name), price: Math.round(c.price * (1 - p.discount / 100)), original: c.price, window: `${date(p.startsAt)} – ${date(p.endsAt)}`, main: false })),
        ];
        body = card(tr("الأسعار", "Prices"), `<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>${esc(tr("السعر", "Price"))}</th><th>${esc(tr("الفترة", "Window"))}</th><th class="is-num">${esc(tr("قبل الخصم", "Was"))}</th><th class="is-num">${esc(tr("الآن", "Now"))}</th><th></th></tr></thead><tbody>
          ${rows.map((r) => `<tr><td><strong>${esc(r.name)}</strong> ${r.main ? `<span class="adm-tag adm-tag--plain">${esc(tr("رئيسي", "Main"))}</span>` : ""}</td><td>${r.window}</td><td class="is-num">${r.original && r.original !== r.price ? `<s class="adm-muted">${esc(fmtMoney(r.original))}</s>` : "—"}</td><td class="is-num">${money(r.price)}</td><td>${can("courses.update") ? btn(tr("تعديل", "Edit"), { sm: true }) : ""}</td></tr>`).join("")}
        </tbody></table></div>`, { flush: true, actions: can("courses.update") ? btn(tr("إضافة سعر", "Add price"), { sm: true, ic: "plus", attrs: "data-price" }) : "" });
      } else if (tab === "media") {
        body = `<div class="adm-grid adm-grid--3">
          ${card(tr("الصورة المربعة", "Square image"), `<div style="aspect-ratio:1;border-radius:var(--radius-soft);background:${c.color}"></div><div class="adm-row adm-section-gap">${btn(tr("استبدال", "Replace"), { sm: true, ic: "upload" })}</div>`)}
          ${card(tr("البانر", "Banner"), `<div style="aspect-ratio:16/7;border-radius:var(--radius-soft);background:${c.color}"></div><div class="adm-row adm-section-gap">${btn(tr("استبدال", "Replace"), { sm: true, ic: "upload" })}${btn(tr("إزالة", "Remove"), { sm: true, kind: "danger" })}</div>`)}
          ${card(tr("فيديو تعريفي", "Intro video"), `<div class="adm-video">${icon("play")}</div><div class="adm-row adm-section-gap">${btn(tr("استبدال", "Replace"), { sm: true, ic: "upload" })}</div>`)}
        </div>`;
      } else if (tab === "students") {
        body = `<div data-t></div>`;
      } else if (tab === "revenue") {
        const paid = courseOrders.filter((o) => o.status === "paid");
        body = `<div class="adm-grid adm-grid--3">${kpi({ label: tr("الإيرادات", "Revenue"), value: esc(fmtMoney(c.revenue)), field: "var(--coral)" })}${kpi({ label: tr("طلبات مدفوعة", "Paid orders"), value: fmtNum(Math.round(c.revenue / Math.max(c.price, 1))) })}${kpi({ label: tr("تسجيلات مجانية", "Free enrolments"), value: fmtNum(Math.round(c.students * 0.18)) })}</div>
          <div class="adm-section-gap">${card(tr("الطلبات في هذه العينة", "Orders in this sample"), paid.length ? `<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>${esc(tr("الطلب", "Order"))}</th><th>${esc(tr("العميل", "Customer"))}</th><th class="is-num">${esc(tr("المدفوع", "Paid"))}</th><th class="is-num">${esc(tr("رسوم البوابة", "Gateway fee"))}</th><th>${esc(tr("الحالة", "Status"))}</th></tr></thead><tbody>${courseOrders.slice(0, 12).map((o) => `<tr><td><a href="#/sales/orders/${o.id}">⁦#${o.number}⁩</a><span class="adm-cell-sub">${date(o.createdAt)}</span></td><td>${customerCell(o.customerId)}</td><td class="is-num">${money(o.total)}</td><td class="is-num">${money(o.fee)}</td><td>${orderStatus(o)}</td></tr>`).join("")}</tbody></table></div>` : empty(tr("لا توجد طلبات في العينة", "No orders in this sample")), { flush: true })}</div>`;
      } else if (tab === "ratings") {
        const dist = [5, 4, 3, 2, 1].map((s, i) => ({ label: `${s} ★`, value: Math.round(c.ratings * [0.62, 0.24, 0.08, 0.04, 0.02][i]), color: "var(--yellow)" }));
        body = `<div class="adm-grid adm-grid--main-side">${card(tr("التعليقات", "Reviews"), `<ul class="adm-list">${customers.slice(c.id % 20, (c.id % 20) + 4).map((u, i) => `<li style="align-items:flex-start">${avatar(u.initials, COLORS[i])}<div class="adm-list__main"><strong>${esc(tr(u.name))}</strong> <span class="adm-muted">${"★".repeat(5 - (i % 2))}</span><p>${esc(tr(["دورة ممتازة ومنظمة، استفدت كثيرًا من الأمثلة العملية.", "المحتوى قوي لكن أتمنى المزيد من التمارين.", "المدرب رائع والشرح واضح.", "مفيدة جدًا لعملي اليومي."][i], ["Excellent, well-structured course. The practical examples helped a lot.", "Strong content, but I'd like more exercises.", "Great instructor, clear explanations.", "Very useful for my day-to-day work."][i]))}</p></div>${btn(tr("رد", "Reply"), { sm: true })}</li>`).join("")}</ul>`)}
          ${card(tr("التوزيع", "Distribution"), `<p class="adm-kpi__value">${c.rating}</p><p class="adm-muted" style="margin-bottom:12px">${fmtNum(c.ratings)} ${esc(tr("تقييم", "ratings"))}</p>${bars(dist, { fmt: fmtNum })}`)}</div>`;
      } else if (tab === "certificates") {
        const t = certificateTemplates[c.id % certificateTemplates.length];
        body = `<div class="adm-grid adm-grid--main-side">${card(tr("قالب الشهادة", "Certificate template"), `<div class="adm-row"><div style="width:160px;aspect-ratio:1.4;border-radius:var(--radius-soft);background:${t.color}"></div><div><strong>${esc(tr(t.name))}</strong><p class="adm-muted">${esc(tr("يُصدر عند استيفاء قواعد الإتمام", "Issued when completion rules are met"))}</p></div></div>`, { actions: can("courses.update") ? btn(tr("تغيير القالب", "Change template"), { sm: true }) : "" })}
          ${card(tr("الإصدار", "Issued"), `<p class="adm-kpi__value">${fmtNum(c.certificates)}</p><p class="adm-muted" style="margin-bottom:12px">${esc(tr("شهادة ممنوحة", "certificates granted"))}</p>${can("certificates.grant") ? btn(tr("منح شهادة يدويًا", "Grant manually"), { sm: true, ic: "award", attrs: "data-grant" }) : ""}`)}</div>`;
      } else if (tab === "rules") {
        const rules = [
          [tr("مشاهدة الفيديوهات", "Watch videos"), tr("80% على الأقل من مدة الفيديو في كل درس", "At least 80% of each lesson video")],
          [tr("اجتياز الاختبارات", "Pass quizzes"), tr("درجة 60% أو أكثر في كل اختبار", "Score 60% or more on every quiz")],
          [tr("الواجبات", "Assignments"), tr("تسليم الواجب النهائي وتقييمه", "Final assignment submitted and graded")],
        ];
        body = card(tr("قواعد الإتمام", "Completion rules"), `<ol class="adm-list">${rules.map(([t, d], i) => `<li><span class="adm-avatar" style="background:${COLORS[i]}">${i + 1}</span><div class="adm-list__main"><strong>${esc(t)}</strong><span class="adm-list__sub">${esc(d)}</span></div>${can("courses.update") ? btn(tr("تعديل", "Edit"), { sm: true }) : ""}</li>`).join("")}</ol>`, { actions: can("courses.update") ? btn(tr("إضافة قاعدة", "Add rule"), { sm: true, ic: "plus" }) : "" });
      }
      const actions = [
        btn(tr("معاينة على الموقع", "Preview on site"), { ic: "eye" }),
        btn(tr("الاستوديو", "Studio"), { href: `${base}/studio/curriculum`, ic: "layers" }),
        c.status !== "published" && can("courses.publish") ? btn(tr("نشر الدورة", "Publish course"), { kind: "primary", attrs: "data-publish" }) : "",
      ].join("");
      el.innerHTML = `${pageHead({ title: tr(c.title), status: badge(COURSE_STATUS[c.status]), sub: `${esc(catName(c.categoryId))} · ${esc(tr(ins.name))} · ${c.price ? money(c.price) : esc(tr("مجانية", "Free"))}`, back: { href: "/learning/courses", label: tr("الدورات", "Courses") }, actions })}
        ${tabs(base, COURSE_TABS(), tab)}${body}`;

      if (tab === "students") {
        dataTable(el.querySelector("[data-t]"), {
          id: "course-students",
          label: tr("المتدربون", "Students"),
          rows: enrolled.length ? enrolled : customers.slice(0, 12),
          rowHref: (u) => `/customers/${u.id}`,
          search: (u) => `${u.name.ar} ${u.name.en} ${u.email}`,
          views: false,
          columns: [
            { key: "n", label: tr("المتدرب", "Student"), render: (u) => customerCell(u.id) },
            { key: "p", label: tr("التقدم", "Progress"), num: true, sort: (u) => (u.id * 7) % 100, render: (u) => `${(u.id * 7) % 100}%` },
            { key: "l", label: tr("آخر نشاط", "Last active"), sort: (u) => u.lastSeen, render: (u) => date(u.lastSeen) },
            { key: "c", label: tr("الشهادة", "Certificate"), render: (u) => ((u.id * 7) % 100 > 80 ? badge({ label: { ar: "صادرة", en: "Issued" }, tone: "success" }) : "—") },
          ],
        });
      }
      el.querySelector("[data-publish]")?.addEventListener("click", () =>
        confirmDialog({
          title: tr("نشر الدورة", "Publish course"),
          body: esc(tr("ستظهر الدورة في الكتالوج ويمكن شراؤها فورًا.", "The course appears in the catalog and can be bought right away.")),
          confirm: tr("نشر الآن", "Publish now"),
          onConfirm() {
            c.status = "published";
            toast(tr("تم نشر الدورة", "Course published"));
            courseDetailPage({ id, tab }).render(el);
          },
        }),
      );
      el.querySelector("[data-edit]")?.addEventListener("click", () =>
        drawer({
          title: tr("تعديل تفاصيل الدورة", "Edit course details"),
          body: `<form class="adm-form">${field({ id: "ta", label: tr("العنوان بالعربية", "Arabic title"), value: c.title.ar, required: true, attrs: 'dir="rtl"' })}${field({ id: "te", label: tr("العنوان بالإنجليزية", "English title"), value: c.title.en, attrs: 'dir="ltr"' })}${field({ id: "cat", label: tr("التصنيف", "Category"), value: c.categoryId, options: categories.map((x) => [x.id, tr(x.name)]) })}${field({ id: "ins", label: tr("المدرب", "Instructor"), value: c.instructorId, options: instructors.map((x) => [x.id, tr(x.name)]) })}</form>`,
          foot: `${btn(tr("إلغاء", "Cancel"), { attrs: "data-close" })}${btn(tr("حفظ التغييرات", "Save changes"), { kind: "primary", attrs: "data-save" })}`,
          onMount(p, close) {
            p.querySelector("[data-save]").addEventListener("click", () => {
              if (!validate(p, { ta: (v) => (!v ? tr("مطلوب", "Required") : null) })) return;
              c.title = { ar: p.querySelector("#ta").value, en: p.querySelector("#te").value };
              c.categoryId = Number(p.querySelector("#cat").value);
              c.instructorId = Number(p.querySelector("#ins").value);
              close();
              toast(tr("تم الحفظ", "Saved"));
              courseDetailPage({ id, tab }).render(el);
            });
          },
        }),
      );
      el.querySelector("[data-price]")?.addEventListener("click", () =>
        drawer({
          title: tr("إضافة سعر", "Add price"),
          body: `<div class="adm-form">${field({ id: "pp", label: tr("السعر (ر.س)", "Price (SAR)"), type: "number", required: true })}${field({ id: "pl", label: tr("قائمة الأسعار", "Price list"), options: [["", tr("بدون", "None")], ...priceLists.map((p) => [p.id, tr(p.name)])] })}<div class="adm-form-grid">${field({ id: "ps", label: tr("يبدأ", "Starts"), type: "date" })}${field({ id: "pe", label: tr("ينتهي", "Ends"), type: "date" })}</div></div>`,
          foot: `${btn(tr("إلغاء", "Cancel"), { attrs: "data-close" })}${btn(tr("إضافة السعر", "Add price"), { kind: "primary", attrs: "data-ok" })}`,
          onMount(p, close) {
            p.querySelector("[data-ok]").addEventListener("click", () => {
              if (!validate(p, { pp: (v) => (!v || Number(v) < 0 ? tr("أدخل سعرًا صحيحًا", "Enter a valid price") : null) })) return;
              close();
              toast(tr("تمت إضافة السعر", "Price added"));
            });
          },
        }),
      );
      el.querySelector("[data-grant]")?.addEventListener("click", () =>
        drawer({
          title: tr("منح شهادة", "Grant certificate"),
          body: `<div class="adm-form">${field({ id: "gc", label: tr("بريد المتدرب", "Student email"), type: "email", required: true, attrs: 'dir="ltr"' })}${field({ id: "gn", label: tr("الاسم على الشهادة", "Name on certificate"), required: true })}</div>`,
          foot: `${btn(tr("إلغاء", "Cancel"), { attrs: "data-close" })}${btn(tr("منح الشهادة", "Grant certificate"), { kind: "primary", attrs: "data-ok" })}`,
          onMount(p, close) {
            p.querySelector("[data-ok]").addEventListener("click", () => {
              if (!validate(p, { gc: (v) => (!/.+@.+\..+/.test(v) ? tr("بريد غير صحيح", "Invalid email") : null), gn: (v) => (!v ? tr("مطلوب", "Required") : null) })) return;
              close();
              toast(tr("تم إصدار الشهادة", "Certificate issued"), "award");
            });
          },
        }),
      );
    },
  };
}

/* ---------------- Create course wizard ---------------- */
export function courseNewPage() {
  if (!can("courses.create")) return { forbidden: true };
  return {
    title: tr("إنشاء دورة", "Create course"),
    crumbs: [[tr("دورة جديدة", "New course")]],
    render(el) {
      el.innerHTML = `${pageHead({ title: tr("إنشاء دورة جديدة", "Create new course"), back: { href: "/learning/courses", label: tr("الدورات", "Courses") } })}<div data-w style="max-width:900px"></div>`;
      wizard(el.querySelector("[data-w]"), {
        id: "course-new",
        data: { language: "ar", pricing: "paid", access: "12", visibility: "draft", units: "" },
        cancelHref: "/learning/courses",
        submitLabel: tr("إنشاء الدورة", "Create course"),
        steps: [
          {
            key: "basic",
            label: tr("المعلومات الأساسية", "Basic info"),
            render: (d) => `<div class="adm-form-grid">
                ${field({ id: "titleAr", label: tr("العنوان بالعربية", "Arabic title"), value: d.titleAr ?? "", required: true, attrs: 'dir="rtl"' })}
                ${field({ id: "titleEn", label: tr("العنوان بالإنجليزية", "English title"), value: d.titleEn ?? "", attrs: 'dir="ltr"' })}
                ${field({ id: "categoryId", label: tr("التصنيف", "Category"), value: d.categoryId ?? "", required: true, options: [["", tr("اختر…", "Choose…")], ...categories.map((x) => [x.id, tr(x.name)])] })}
                ${field({ id: "instructorId", label: tr("المدرب", "Instructor"), value: d.instructorId ?? "", required: true, options: [["", tr("اختر…", "Choose…")], ...instructors.map((x) => [x.id, tr(x.name)])] })}
                ${field({ id: "language", label: tr("لغة الدورة", "Course language"), value: d.language, options: [["ar", "العربية"], ["en", "English"]] })}
              </div>
              ${field({ id: "description", label: tr("الوصف", "Description"), type: "textarea", value: d.description ?? "", hint: tr("يظهر في صفحة الدورة. 300 حرف على الأقل يساعد في الظهور بمحركات البحث.", "Shown on the course page. 300+ characters helps search visibility.") })}`,
            validate: (f) =>
              validate(f, {
                titleAr: (v) => (v.length < 4 ? tr("أدخل عنوانًا من 4 أحرف على الأقل", "Enter a title of at least 4 characters") : null),
                categoryId: (v) => (!v ? tr("اختر تصنيفًا", "Pick a category") : null),
                instructorId: (v) => (!v ? tr("اختر مدربًا", "Pick an instructor") : null),
              }),
          },
          {
            key: "curriculum",
            label: tr("المنهج", "Curriculum"),
            render: (d) => `${alert("info", tr("هيكل أولي فقط", "Outline only"), esc(tr("أضف أسماء الوحدات الآن. الدروس والفيديوهات والاختبارات تُضاف لاحقًا من استوديو الدورة.", "Add unit names now. Lessons, videos and quizzes are added later in the course studio.")))}
              ${field({ id: "units", label: tr("الوحدات (وحدة في كل سطر)", "Units (one per line)"), type: "textarea", value: d.units, rows: 6, required: true })}`,
            validate: (f) => validate(f, { units: (v) => (!v.split("\n").filter((x) => x.trim()).length ? tr("أضف وحدة واحدة على الأقل", "Add at least one unit") : null) }),
          },
          {
            key: "pricing",
            label: tr("التسعير", "Pricing"),
            render: (d) => `<fieldset style="border:0;padding:0;margin:0" class="adm-form"><legend class="adm-label">${esc(tr("نوع الوصول", "Access type"))}</legend>
                <label class="adm-check"><input type="radio" name="pricing" value="paid" ${d.pricing === "paid" ? "checked" : ""}> ${esc(tr("مدفوعة", "Paid"))}</label>
                <label class="adm-check"><input type="radio" name="pricing" value="free" ${d.pricing === "free" ? "checked" : ""}> ${esc(tr("مجانية", "Free"))}</label></fieldset>
              <div class="adm-form-grid" data-paid ${d.pricing === "free" ? "hidden" : ""}>
                ${field({ id: "price", label: tr("السعر (ر.س)", "Price (SAR)"), type: "number", value: d.price ?? "", required: true, attrs: 'min="1" inputmode="decimal"' })}
                ${field({ id: "originalPrice", label: tr("السعر قبل الخصم", "Compare-at price"), type: "number", value: d.originalPrice ?? "" })}
              </div>
              ${field({ id: "access", label: tr("مدة الوصول", "Access duration"), value: d.access, options: [["6", tr("6 أشهر", "6 months")], ["12", tr("12 شهرًا", "12 months")], ["0", tr("مدى الحياة", "Lifetime")]] })}`,
            mount(f) {
              f.querySelectorAll('[name="pricing"]').forEach((r) => r.addEventListener("change", () => (f.querySelector("[data-paid]").hidden = r.value === "free" && r.checked)));
            },
            validate: (f, d) => d.pricing === "free" || validate(f, { price: (v) => (!v || Number(v) <= 0 ? tr("أدخل سعرًا أكبر من صفر", "Enter a price above zero") : null), originalPrice: (v) => (v && Number(v) < Number(f.querySelector("#price").value) ? tr("يجب أن يكون أعلى من السعر", "Must be higher than the price") : null) }),
          },
          {
            key: "publishing",
            label: tr("النشر", "Publishing"),
            render: (d) => `${field({ id: "visibility", label: tr("الحالة بعد الإنشاء", "Status after creation"), value: d.visibility, options: [["draft", tr("مسودة (موصى به حتى يكتمل المحتوى)", "Draft (recommended until content is ready)")], ["publish", tr("نشر فورًا", "Publish now")]] })}
              ${field({ id: "certificate", label: tr("قالب الشهادة", "Certificate template"), value: d.certificate ?? "", options: [["", tr("بدون شهادة", "No certificate")], ...certificateTemplates.map((t) => [t.id, tr(t.name)])] })}
              ${dl([
                [tr("العنوان", "Title"), esc(d.titleAr ?? "")],
                [tr("التصنيف", "Category"), esc(d.categoryId ? catName(Number(d.categoryId)) : "—")],
                [tr("الوحدات", "Units"), fmtNum((d.units ?? "").split("\n").filter((x) => x.trim()).length)],
                [tr("السعر", "Price"), d.pricing === "free" ? esc(tr("مجانية", "Free")) : money(Number(d.price || 0))],
              ])}
              ${can("courses.publish") ? "" : alert("warning", tr("تحتاج صلاحية النشر", "Publishing permission needed"), esc(tr("ستُنشأ كمسودة ويُطلب من مسؤول النشر مراجعتها.", "It will be created as a draft and sent to a publisher for review.")))}`,
          },
          {
            key: "done",
            label: tr("تم", "Done"),
            final: true,
            render: () => `${alert("success", tr("تم إنشاء الدورة", "Course created"), esc(tr("الخطوة التالية: أضف الدروس والفيديوهات من الاستوديو.", "Next: add lessons and videos in the studio.")), "check")}
              <div class="adm-row adm-section-gap">${btn(tr("فتح الاستوديو", "Open studio"), { href: `/learning/courses/${courses[0].id}/studio/curriculum`, kind: "ink", ic: "layers" })}${btn(tr("صفحة الدورة", "Course page"), { href: `/learning/courses/${courses[0].id}` })}</div>`,
          },
        ],
        onSubmit(d) {
          const id = Math.max(...courses.map((c) => c.id)) + 1;
          courses.unshift({
            id,
            title: { ar: d.titleAr, en: d.titleEn || d.titleAr },
            categoryId: Number(d.categoryId),
            type: d.pricing === "free" ? "free" : "course",
            price: d.pricing === "free" ? 0 : Number(d.price),
            originalPrice: Number(d.originalPrice) || 0,
            status: d.visibility === "publish" && can("courses.publish") ? "published" : "draft",
            instructorId: Number(d.instructorId),
            students: 0,
            revenue: 0,
            rating: "—",
            ratings: 0,
            units: d.units.split("\n").filter((x) => x.trim()).length,
            lessons: 0,
            hours: 0,
            certificates: 0,
            updatedAt: new Date().toISOString(),
            color: COLORS[id % COLORS.length],
            language: d.language,
          });
        },
      });
    },
  };
}

/* ---------------- Packages ---------------- */
export function packagesPage() {
  return {
    title: tr("الحزم والدبلومات", "Packages & diplomas"),
    render(el) {
      el.innerHTML = `${pageHead({ title: tr("الحزم والدبلومات", "Packages & diplomas"), sub: esc(tr("مجموعات دورات تُباع بسعر واحد.", "Course bundles sold at one price.")), actions: can("packages.create") ? btn(tr("إنشاء حزمة", "Create package"), { kind: "primary", ic: "plus" }) : "" })}<div data-t></div>`;
      dataTable(el.querySelector("[data-t]"), {
        id: "packages",
        label: tr("الحزم", "Packages"),
        rows: packages,
        rowHref: (p) => `/learning/packages/${p.id}`,
        search: (p) => `${p.title.ar} ${p.title.en}`,
        views: false,
        columns: [
          { key: "t", label: tr("الحزمة", "Package"), render: (p) => `<span class="adm-cell-flex">${thumb(p)}<span><a class="adm-cell-main" href="#/learning/packages/${p.id}">${esc(tr(p.title))}</a><span class="adm-cell-sub">${esc(p.isDiploma ? tr("دبلوم", "Diploma") : tr("حزمة", "Bundle"))}</span></span></span>` },
          { key: "c", label: tr("الدورات", "Courses"), num: true, render: (p) => fmtNum(p.courseIds.length) },
          { key: "p", label: tr("السعر", "Price"), num: true, sort: (p) => p.price, render: (p) => `${money(p.price)} <s class="adm-muted adm-cell-sub">${esc(fmtMoney(p.coursesPrice))}</s>` },
          { key: "s", label: tr("المتدربون", "Students"), num: true, sort: (p) => p.students, render: (p) => fmtNum(p.students) },
          { key: "r", label: tr("الإيرادات", "Revenue"), num: true, sort: (p) => p.revenue, render: (p) => money(p.revenue) },
          { key: "st", label: tr("الحالة", "Status"), render: (p) => badge(COURSE_STATUS[p.status]) },
        ],
      });
    },
  };
}

export function packageDetailPage({ id, tab = "overview" }) {
  const p = byId(packages, id);
  if (!p) return null;
  const base = `/learning/packages/${p.id}`;
  const list = p.courseIds.map(courseOf);
  return {
    title: tr(p.title),
    crumbs: [[tr(p.title)]],
    render(el) {
      let body;
      if (tab === "overview")
        body = `<div class="adm-grid adm-grid--3">${kpi({ label: tr("السعر الحالي", "Current price"), value: esc(fmtMoney(p.price)), meta: `${esc(tr("مجموع أسعار الدورات", "Courses total"))} ${esc(fmtMoney(p.coursesPrice))}`, field: p.color })}${kpi({ label: tr("الإيرادات", "Revenue"), value: esc(fmtMoney(p.revenue)) })}${kpi({ label: tr("المتدربون", "Students"), value: fmtNum(p.students) })}</div>
          <div class="adm-section-gap">${alert("info", tr("التوفير للعميل", "Customer saving"), esc(tr(`يوفر العميل ${fmtMoney(p.coursesPrice - p.price)} (${Math.round((1 - p.price / p.coursesPrice) * 100)}%) مقارنة بشراء الدورات منفردة.`, `Customers save ${fmtMoney(p.coursesPrice - p.price)} (${Math.round((1 - p.price / p.coursesPrice) * 100)}%) versus buying courses separately.`)))}</div>`;
      else if (tab === "courses")
        body = card(tr("دورات الحزمة", "Courses in this package"), `<ol class="adm-list">${list.map((c, i) => `<li><span class="adm-grip" title="${esc(tr("اسحب لإعادة الترتيب", "Drag to reorder"))}">${icon("grip")}</span><span class="adm-num adm-muted">${i + 1}</span>${thumb(c)}<a class="adm-list__main adm-list__title" href="#/learning/courses/${c.id}">${esc(tr(c.title))}</a>${money(c.price)}${can("packages.update") ? `<button class="adm-btn adm-btn--bare" aria-label="${esc(tr("إزالة", "Remove"))}">${icon("x")}</button>` : ""}</li>`).join("")}</ol>`, { actions: can("packages.update") ? btn(tr("إضافة دورة", "Add course"), { sm: true, ic: "plus" }) : "" });
      else if (tab === "pricing") body = card(tr("الأسعار", "Prices"), dl([[tr("السعر الحالي", "Current price"), money(p.price)], [tr("السعر الأصلي", "Original price"), money(Math.round(p.coursesPrice * 0.95))], [tr("مجموع الدورات", "Courses total"), money(p.coursesPrice)]]));
      else if (tab === "rules") body = card(tr("قواعد الإتمام", "Completion rules"), `<p>${esc(tr("إتمام جميع الدورات في الحزمة بنسبة 100%.", "Complete every course in the package at 100%."))}</p>`);
      else body = card(tr("الشهادات", "Certificates"), `<p>${esc(tr("شهادة دبلوم موحدة بعد إتمام الحزمة، بالإضافة إلى شهادات الدورات.", "One diploma certificate after completing the package, plus per-course certificates."))}</p>`);
      el.innerHTML = `${pageHead({ title: tr(p.title), status: badge(COURSE_STATUS[p.status]), back: { href: "/learning/packages", label: tr("الحزم", "Packages") }, actions: btn(tr("معاينة على الموقع", "Preview on site"), { ic: "eye" }) })}
        ${tabs(base, [["overview", tr("نظرة عامة", "Overview")], ["courses", tr("الدورات", "Courses")], ["pricing", tr("التسعير", "Pricing")], ["rules", tr("قواعد الإتمام", "Completion rules")], ["certificates", tr("الشهادات", "Certificates")]], tab)}${body}`;
    },
  };
}

/* ---------------- Categories (tree, keyboard reorder) ---------------- */
export function categoriesPage() {
  return {
    title: tr("التصنيفات", "Categories"),
    render(el) {
      const roots = categories.filter((c) => !c.parentId);
      const row = (c, depth, i, siblings) => `<li style="padding-inline-start:${depth * 28}px">
        ${depth ? `<span class="adm-muted">${icon("chevronEnd", "adm-icon-dir")}</span>` : icon("folder")}
        <div class="adm-list__main"><strong>${esc(tr(c.name))}</strong><span class="adm-list__sub">${fmtNum(c.courses)} ${esc(tr("دورة", "courses"))}</span></div>
        ${can("categories.update") ? `<button class="adm-btn adm-btn--bare" data-move="${c.id}" data-dir="-1" aria-label="${esc(tr("تحريك لأعلى", "Move up"))}: ${esc(tr(c.name))}" ${i === 0 ? "disabled" : ""}>${icon("chevron")}</button>
        <button class="adm-btn adm-btn--bare" data-move="${c.id}" data-dir="1" aria-label="${esc(tr("تحريك لأسفل", "Move down"))}: ${esc(tr(c.name))}" ${i === siblings - 1 ? "disabled" : ""}><span style="display:inline-flex;transform:rotate(180deg)">${icon("chevron")}</span></button>` : ""}
      </li>`;
      const tree = roots
        .map((r, i) => row(r, 0, i, roots.length) + categories.filter((c) => c.parentId === r.id).map((c, k, arr) => row(c, 1, k, arr.length)).join(""))
        .join("");
      el.innerHTML = `${pageHead({ title: tr("التصنيفات", "Categories"), sub: esc(tr("الترتيب هنا هو ترتيب الظهور في الموقع.", "The order here is the order on the website.")), actions: can("categories.create") ? btn(tr("إضافة تصنيف", "Add category"), { kind: "primary", ic: "plus", attrs: "data-add" }) : "" })}
        ${card("", `<ul class="adm-list" style="margin-top:-8px">${tree}</ul>`)}`;
      el.querySelectorAll("[data-move]").forEach((b) =>
        b.addEventListener("click", () => {
          const c = byId(categories, b.dataset.move);
          const sibs = categories.filter((x) => x.parentId === c.parentId);
          const i = sibs.indexOf(c);
          const j = i + Number(b.dataset.dir);
          const a = categories.indexOf(sibs[i]);
          const z = categories.indexOf(sibs[j]);
          [categories[a], categories[z]] = [categories[z], categories[a]];
          categoriesPage().render(el);
          el.querySelector(`[data-move="${c.id}"][data-dir="${b.dataset.dir}"]`)?.focus();
          toast(tr("تم تحديث الترتيب", "Order updated"));
        }),
      );
      el.querySelector("[data-add]")?.addEventListener("click", () =>
        drawer({
          title: tr("إضافة تصنيف", "Add category"),
          body: `<div class="adm-form">${field({ id: "na", label: tr("الاسم بالعربية", "Arabic name"), required: true })}${field({ id: "ne", label: tr("الاسم بالإنجليزية", "English name"), attrs: 'dir="ltr"' })}${field({ id: "pa", label: tr("التصنيف الأب", "Parent"), options: [["", tr("بدون (رئيسي)", "None (top level)")], ...roots.map((r) => [r.id, tr(r.name)])] })}</div>`,
          foot: `${btn(tr("إلغاء", "Cancel"), { attrs: "data-close" })}${btn(tr("إضافة", "Add"), { kind: "primary", attrs: "data-ok" })}`,
          onMount(p, close) {
            p.querySelector("[data-ok]").addEventListener("click", () => {
              if (!validate(p, { na: (v) => (!v ? tr("مطلوب", "Required") : null) })) return;
              categories.push({ id: 100 + categories.length, name: { ar: p.querySelector("#na").value, en: p.querySelector("#ne").value || p.querySelector("#na").value }, parentId: Number(p.querySelector("#pa").value) || null, courses: 0 });
              close();
              categoriesPage().render(el);
              toast(tr("تمت الإضافة", "Added"));
            });
          },
        }),
      );
    },
  };
}

/* ---------------- Consultations ---------------- */
export function consultationsPage() {
  return {
    title: tr("الاستشارات", "Consultations"),
    render(el) {
      el.innerHTML = `${pageHead({ title: tr("الاستشارات", "Consultations"), sub: esc(tr("المستشارون وخدماتهم والحجوزات القادمة.", "Consultants, their services and upcoming bookings.")), actions: can("consultations.create") ? btn(tr("إضافة مستشار", "Add consultant"), { kind: "primary", ic: "plus" }) : "" })}<div data-t></div>`;
      dataTable(el.querySelector("[data-t]"), {
        id: "consultants",
        label: tr("المستشارون", "Consultants"),
        rows: consultants,
        views: false,
        search: (c) => `${c.name.ar} ${c.name.en}`,
        columns: [
          { key: "n", label: tr("المستشار", "Consultant"), render: (c, i) => `<span class="adm-cell-flex">${avatar(c.initials, COLORS[c.id % 8])}<span class="adm-cell-main">${esc(tr(c.name))}</span></span>` },
          { key: "t", label: tr("المجال", "Topic"), render: (c) => esc(tr(c.topic)) },
          { key: "s", label: tr("الجلسات", "Sessions"), num: true, sort: (c) => c.sessions, render: (c) => fmtNum(c.sessions) },
          { key: "p", label: tr("المدفوعات", "Payments"), num: true, sort: (c) => c.payments, render: (c) => money(c.payments) },
          { key: "x", label: tr("أقرب موعد متاح", "Next free slot"), render: (c) => date(c.nextSlot, true) },
          { key: "a", label: tr("الحالة", "Status"), render: (c) => onOff(c.active) },
        ],
      });
    },
  };
}

/* ---------------- Instructors & applications ---------------- */
export function instructorsPage() {
  return {
    title: tr("المدربون", "Instructors"),
    render(el) {
      el.innerHTML = `${pageHead({ title: tr("المدربون", "Instructors"), actions: can("instructors.create") ? btn(tr("إضافة مدرب", "Add instructor"), { kind: "primary", ic: "plus" }) : "" })}<div data-t></div>`;
      dataTable(el.querySelector("[data-t]"), {
        id: "instructors",
        label: tr("المدربون", "Instructors"),
        rows: instructors,
        views: false,
        search: (c) => `${c.name.ar} ${c.name.en}`,
        columns: [
          { key: "n", label: tr("المدرب", "Instructor"), render: (c) => `<span class="adm-cell-flex">${avatar(c.initials, COLORS[c.id % 8])}<span><span class="adm-cell-main">${esc(tr(c.name))}</span><span class="adm-cell-sub">${esc(tr(c.title))}</span></span></span>` },
          { key: "c", label: tr("الدورات", "Courses"), num: true, sort: (c) => c.courses, render: (c) => fmtNum(c.courses) },
          { key: "s", label: tr("المتدربون", "Students"), num: true, sort: (c) => c.students, render: (c) => fmtNum(c.students) },
          { key: "r", label: tr("التقييم", "Rating"), num: true, sort: (c) => Number(c.rating), render: (c) => `${icon("star")} ${c.rating}` },
          { key: "a", label: tr("الحالة", "Status"), render: (c) => onOff(c.active) },
        ],
      });
    },
  };
}

const APP_STATUS = {
  new: { label: { ar: "جديد", en: "New" }, tone: "warning" },
  shortlisted: { label: { ar: "في القائمة المختصرة", en: "Shortlisted" }, tone: "info" },
  rejected: { label: { ar: "مرفوض", en: "Rejected" }, tone: "neutral" },
};
export function applicationsPage() {
  return {
    title: tr("طلبات المدربين", "Instructor applications"),
    render(el) {
      el.innerHTML = `${pageHead({ title: tr("طلبات المدربين", "Instructor applications"), sub: esc(tr("907 طلبًا في اللوحة القديمة. هنا تُراجع وتُصنف.", "907 applications in the legacy panel. Review and triage them here.")) })}<div data-t></div>`;
      const render = () =>
        dataTable(el.querySelector("[data-t]"), {
          id: "applications",
          label: tr("الطلبات", "Applications"),
          rows: applications,
          search: (a) => `${a.name.ar} ${a.name.en}`,
          columns: [
            { key: "n", label: tr("المتقدم", "Applicant"), render: (a) => `<span class="adm-cell-flex">${avatar(a.initials, COLORS[a.id % 8])}<span class="adm-cell-main">${esc(tr(a.name))}</span></span>` },
            { key: "f", label: tr("المجال", "Field"), render: (a) => esc(tr(a.field)) },
            { key: "y", label: tr("سنوات الخبرة", "Experience"), num: true, sort: (a) => a.years, render: (a) => fmtNum(a.years) },
            { key: "d", label: tr("تاريخ التقديم", "Submitted"), sort: (a) => a.submittedAt, render: (a) => date(a.submittedAt) },
            { key: "s", label: tr("الحالة", "Status"), render: (a) => badge(APP_STATUS[a.status]) },
            { key: "x", label: "", render: (a) => (a.status === "new" && can("instructors.update") ? `<span class="adm-row">${btn(tr("قائمة مختصرة", "Shortlist"), { sm: true, attrs: `data-app="${a.id}" data-to="shortlisted"` })}${btn(tr("رفض", "Reject"), { sm: true, kind: "danger", attrs: `data-app="${a.id}" data-to="rejected"` })}</span>` : "") },
          ],
          filters: [{ key: "s", label: tr("الحالة", "Status"), options: Object.entries(APP_STATUS).map(([k, v]) => [k, tr(v.label)]), test: (a, v) => a.status === v }],
          views: [{ id: "new", label: tr("جديدة", "New"), filters: { s: "new" } }],
        });
      render();
      el.addEventListener("click", (e) => {
        const b = e.target.closest("[data-app]");
        if (!b) return;
        byId(applications, b.dataset.app).status = b.dataset.to;
        render();
        toast(tr("تم التحديث", "Updated"));
      });
    },
  };
}

/* ---------------- Certificates ---------------- */
export function certificatesPage() {
  return {
    title: tr("الشهادات", "Certificates"),
    render(el) {
      el.innerHTML = `${pageHead({ title: tr("قوالب الشهادات", "Certificate templates"), sub: esc(tr("محرك إصدار الشهادات يبقى في نظام التعلم؛ هنا عرض القوالب والأعداد.", "The certificate engine stays in the LMS; this shows templates and counts.")) })}
        <div class="adm-grid adm-grid--3">${certificateTemplates
          .map((t) => `<section class="adm-card"><div style="aspect-ratio:1.4;border-radius:var(--radius-soft);background:${t.color};margin-bottom:12px"></div><h2 style="font-size:17px">${esc(tr(t.name))}</h2><p class="adm-muted">${fmtNum(t.courses)} ${esc(tr("دورة", "courses"))} · ${fmtNum(t.granted)} ${esc(tr("ممنوحة", "granted"))}</p></section>`)
          .join("")}</div>`;
    },
  };
}

/* ---------------- Q&A inbox ---------------- */
export function qaPage() {
  return {
    title: tr("أسئلة المتدربين", "Q&A inbox"),
    render(el) {
      el.innerHTML = `${pageHead({ title: tr("أسئلة المتدربين", "Q&A inbox"), sub: esc(tr("أسئلة الدروس من نظام التعلم. الرد يظهر للمتدرب داخل الدرس.", "Lesson questions from the LMS. Replies appear to the trainee inside the lesson.")) })}<div data-t></div>`;
      const render = () =>
        dataTable(el.querySelector("[data-t]"), {
          id: "qa",
          label: tr("الأسئلة", "Questions"),
          rows: qa,
          search: (q) => `${tr(q.comment)} ${tr(courseOf(q.courseId).title)}`,
          columns: [
            { key: "q", label: tr("السؤال", "Question"), render: (q) => `<span class="adm-cell-main">${esc(tr(q.comment))}</span><span class="adm-cell-sub">${esc(tr(courseOf(q.courseId).title))} · ${esc(tr(q.lecture))}</span>` },
            { key: "u", label: tr("المتدرب", "Trainee"), render: (q) => customerCell(q.customerId) },
            { key: "d", label: tr("التاريخ", "Date"), sort: (q) => q.at, render: (q) => date(q.at) },
            { key: "s", label: tr("الحالة", "Status"), render: (q) => (q.replied ? badge({ label: { ar: "تم الرد", en: "Answered" }, tone: "success" }) : badge({ label: { ar: "بانتظار الرد", en: "Awaiting reply" }, tone: "warning" })) },
            { key: "x", label: "", render: (q) => (q.replied ? "" : btn(tr("رد", "Reply"), { sm: true, attrs: `data-reply="${q.id}"` })) },
          ],
          filters: [{ key: "s", label: tr("الحالة", "Status"), options: [["0", tr("بانتظار الرد", "Awaiting reply")], ["1", tr("تم الرد", "Answered")]], test: (q, v) => String(Number(q.replied)) === v }],
          initialFilters: { s: "0" },
        });
      render();
      el.addEventListener("click", (e) => {
        const b = e.target.closest("[data-reply]");
        if (!b) return;
        const q = byId(qa, b.dataset.reply);
        drawer({
          title: tr("الرد على سؤال", "Reply to question"),
          body: `<div class="adm-chat"><div class="adm-msg"><p class="adm-msg__meta">${esc(tr(customerOf(q.customerId).name))} · ${esc(tr(q.lecture))}</p>${esc(tr(q.comment))}</div></div>
            <div class="adm-form adm-section-gap">${field({ id: "rep", label: tr("ردك", "Your reply"), type: "textarea", required: true })}</div>`,
          foot: `${btn(tr("إلغاء", "Cancel"), { attrs: "data-close" })}${btn(tr("إرسال الرد", "Send reply"), { kind: "primary", attrs: "data-ok" })}`,
          onMount(p, close) {
            p.querySelector("[data-ok]").addEventListener("click", () => {
              if (!validate(p, { rep: (v) => (!v ? tr("اكتب ردًا", "Write a reply") : null) })) return;
              q.replied = true;
              close();
              render();
              toast(tr("تم إرسال الرد", "Reply sent"), "send");
            });
          },
        });
      });
    },
  };
}

