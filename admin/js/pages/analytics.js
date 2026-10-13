import { tr, fmtNum, fmtMoney } from "../i18n.js";
import { esc, pageHead, kpi, card, btn, bars, toast } from "../components/ui.js";
import { areaChart, wireCharts } from "../components/chart.js";
import { courses, packages, coupons, customers, affiliates, dailySales, certificateTemplates, COLORS, COUPON_REASON } from "../data/db.js";
import { money, customerCell } from "./common.js";
import { load, save } from "../store.js";

/** Analytics template: date range → KPI row → chart/breakdown → detail table → export. */
function template(el, { title, sub, kpis, chart, side, table }) {
  el.innerHTML = `${pageHead({
    title,
    sub: esc(sub),
    actions: `<label class="ma-sr" for="rf">${esc(tr("من", "From"))}</label><input id="rf" class="ma-input" type="date" style="width:auto" value="${load("reportFrom", "2026-09-13")}" data-from>
      <label class="ma-sr" for="rt">${esc(tr("إلى", "To"))}</label><input id="rt" class="ma-input" type="date" style="width:auto" value="${load("reportTo", "2026-10-13")}" data-to>
      ${btn(tr("تصدير", "Export"), { ic: "download", attrs: "data-export" })}`,
  })}
  <div class="ma-cols ma-cols--3">${kpis.join("")}</div>
  ${chart || side ? `<div class="ma-cols ${chart && side ? "ma-cols--main-side" : ""} ma-section-gap">${chart ?? ""}${side ?? ""}</div>` : ""}
  <div class="ma-section-gap">${table}</div>`;
  el.querySelector("[data-from]").addEventListener("change", (e) => save("reportFrom", e.target.value));
  el.querySelector("[data-to]").addEventListener("change", (e) => save("reportTo", e.target.value));
  el.querySelector("[data-export]").addEventListener("click", () => toast(tr("يتم تجهيز التقرير وسيصلك بالبريد", "Report is being prepared; we'll email it to you"), "download"));
}

function simpleTable(head, rows) {
  return `<div class="ma-table-wrap"><table class="ma-table"><thead><tr>${head.map((h) => `<th class="${h.num ? "is-num" : ""}">${esc(h.l)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${head[i].num ? "is-num" : ""}">${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

const REPORTS = {
  sales: () => ({
    title: tr("تقرير المبيعات", "Sales report"),
    sub: tr("الإيرادات المدفوعة يوميًا (الطلبات بالحالة 3).", "Daily paid revenue (orders with status 3)."),
    build(el) {
      const s = dailySales.slice(-30);
      const total = s.reduce((a, d) => a + d.amount, 0);
      template(el, {
        title: this.title,
        sub: this.sub,
        kpis: [
          kpi({ label: tr("الإيرادات الإجمالية", "Gross sales"), value: esc(fmtMoney(total)), field: "var(--coral)" }),
          kpi({ label: tr("رسوم البوابات", "Gateway fees"), value: esc(fmtMoney(Math.round(total * 0.0275))) }),
          kpi({ label: tr("صافي المبيعات", "Net sales"), value: esc(fmtMoney(Math.round(total * 0.9725))) }),
        ],
        chart: card(tr("الإيرادات اليومية", "Daily revenue"), areaChart(s, { label: tr("الإيرادات اليومية", "Daily revenue") })),
        table: card(tr("حسب اليوم", "By day"), simpleTable([{ l: tr("اليوم", "Day") }, { l: tr("الطلبات", "Orders"), num: true }, { l: tr("الإيرادات", "Revenue"), num: true }], [...s].reverse().slice(0, 14).map((d) => [d.date, fmtNum(d.orders), money(d.amount)])), { flush: true }),
      });
      wireCharts(el, [s]);
    },
  }),
  products: () => ({
    title: tr("تقرير المنتجات", "Products report"),
    sub: tr("المنتج، الطلبات، المبيعات، الرسوم، الخصم، الصافي.", "Product, orders, gross, gateway fee, discount, net."),
    build(el) {
      const rows = [...courses].sort((a, b) => b.revenue - a.revenue).slice(0, 15);
      template(el, {
        title: this.title,
        sub: this.sub,
        kpis: [kpi({ label: tr("منتجات مباعة", "Products sold"), value: fmtNum(courses.length + packages.length), field: "var(--yellow)" }), kpi({ label: tr("الأكثر مبيعًا", "Best seller"), value: `<span style="font-size:18px">${esc(tr(rows[0].title))}</span>` }), kpi({ label: tr("إيرادات الحزم", "Package revenue"), value: esc(fmtMoney(packages.reduce((s, p) => s + p.revenue, 0))) })],
        side: card(tr("حسب التصنيف", "By category"), bars(rows.slice(0, 6).map((c, i) => ({ label: tr(c.title), value: c.revenue, color: COLORS[i] })), { fmt: (v) => esc(fmtMoney(v)) })),
        table: card(tr("تفصيل المنتجات", "Product breakdown"), simpleTable([{ l: tr("المنتج", "Product") }, { l: tr("الطلبات", "Orders"), num: true }, { l: tr("السعر", "Price"), num: true }, { l: tr("الإجمالي", "Gross"), num: true }, { l: tr("الرسوم", "Fee"), num: true }, { l: tr("الخصم", "Discount"), num: true }, { l: tr("الصافي", "Net"), num: true }], rows.map((c) => {
          const n = Math.round(c.revenue / Math.max(c.price, 1));
          return [`<a href="#/learning/courses/${c.id}/revenue">${esc(tr(c.title))}</a>`, fmtNum(n), money(c.price), money(c.revenue), money(Math.round(c.revenue * 0.0275)), money(Math.round(c.revenue * 0.08)), money(Math.round(c.revenue * 0.8925))];
        })), { flush: true }),
      });
    },
  }),
  coupons: () => ({
    title: tr("تقرير الكوبونات", "Coupons report"),
    sub: tr("الاستخدام والخصم حسب الكوبون والسبب.", "Usage and discount by coupon and reason."),
    build(el) {
      const top = [...coupons].sort((a, b) => b.used - a.used).slice(0, 12);
      template(el, {
        title: this.title,
        sub: this.sub,
        kpis: [kpi({ label: tr("كوبونات مستخدمة", "Coupons used"), value: fmtNum(3777), field: "var(--pink)" }), kpi({ label: tr("إجمالي الخصم", "Total discount"), value: esc(fmtMoney(184320)) }), kpi({ label: tr("متوسط الخصم", "Average discount"), value: "22%" })],
        side: card(tr("حسب السبب", "By reason"), bars(Object.entries(COUPON_REASON).slice(0, 3).map(([k, v], i) => ({ label: tr(v.label), value: coupons.filter((c) => String(c.reason) === k).reduce((s, c) => s + c.used, 0), color: COLORS[i] })), { fmt: fmtNum })),
        table: card(tr("الأكثر استخدامًا", "Most used"), simpleTable([{ l: tr("الرمز", "Code") }, { l: tr("الخصم", "Discount"), num: true }, { l: tr("الاستخدام", "Uses"), num: true }], top.map((c) => [`<a class="ma-ltr" href="#/sales/coupons/${c.id}">${esc(c.code)}</a>`, `${c.percent}%`, fmtNum(c.used)])), { flush: true }),
      });
    },
  }),
  customers: () => ({
    title: tr("تقرير العملاء", "Customers report"),
    sub: tr("العملاء الأكثر شراءً وتعلمًا وإنجازًا.", "Top buyers, learners and achievers."),
    build(el) {
      const top = [...customers].sort((a, b) => b.spent - a.spent).slice(0, 10);
      template(el, {
        title: this.title,
        sub: this.sub,
        kpis: [kpi({ label: tr("عملاء جدد", "New customers"), value: fmtNum(1843), delta: 6, field: "var(--sky)" }), kpi({ label: tr("عملاء متكررون", "Returning customers"), value: fmtNum(612), delta: 3 }), kpi({ label: tr("سلات متروكة", "Abandoned carts"), value: fmtNum(52941), meta: esc(tr("طلبات بالحالة 1", "orders with status 1")) })],
        table: card(tr("الأكثر إنفاقًا", "Top spenders"), simpleTable([{ l: tr("العميل", "Customer") }, { l: tr("الطلبات", "Orders"), num: true }, { l: tr("الإنفاق", "Spent"), num: true }], top.map((c) => [customerCell(c.id), fmtNum(c.orders), money(c.spent)])), { flush: true }),
      });
    },
  }),
  affiliates: () => ({
    title: tr("تقرير المسوقين", "Affiliates report"),
    sub: tr("أفضل المسوقين أداءً وحالة الطلبات.", "Top affiliates and application status."),
    build(el) {
      const top = [...affiliates].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
      template(el, {
        title: this.title,
        sub: this.sub,
        kpis: [kpi({ label: tr("معتمدون", "Approved"), value: fmtNum(432), field: "var(--green)" }), kpi({ label: tr("طلبات انضمام", "Applications"), value: fmtNum(86) }), kpi({ label: tr("مرفوضون", "Refused"), value: fmtNum(41) })],
        table: card(tr("الأعلى مبيعًا", "Top sellers"), simpleTable([{ l: tr("المسوق", "Affiliate") }, { l: tr("المبيعات", "Sales"), num: true }, { l: tr("الإيرادات", "Revenue"), num: true }], top.map((a) => [`<a href="#/marketing/affiliates/${a.id}">${esc(tr(a.name))}</a>`, fmtNum(a.sales), money(a.revenue)])), { flush: true }),
      });
    },
  }),
  ratings: () => ({
    title: tr("تقرير التقييمات", "Ratings report"),
    sub: tr("تقييمات الدورات من المتدربين.", "Course ratings from trainees."),
    build(el) {
      const rows = [...courses].sort((a, b) => b.ratings - a.ratings).slice(0, 12);
      template(el, {
        title: this.title,
        sub: this.sub,
        kpis: [kpi({ label: tr("متوسط التقييم", "Average rating"), value: "4.6", field: "var(--yellow)" }), kpi({ label: tr("عدد التقييمات", "Ratings"), value: fmtNum(courses.reduce((s, c) => s + c.ratings, 0)) }), kpi({ label: tr("بدون رد", "Unanswered"), value: fmtNum(37) })],
        table: card(tr("حسب الدورة", "By course"), simpleTable([{ l: tr("الدورة", "Course") }, { l: tr("التقييم", "Rating"), num: true }, { l: tr("العدد", "Count"), num: true }], rows.map((c) => [`<a href="#/learning/courses/${c.id}/ratings">${esc(tr(c.title))}</a>`, c.rating, fmtNum(c.ratings)])), { flush: true }),
      });
    },
  }),
  certificates: () => ({
    title: tr("تقرير الشهادات", "Certificates report"),
    sub: tr("الشهادات الممنوحة حسب الدورة والقالب.", "Certificates granted by course and template."),
    build(el) {
      const rows = [...courses].sort((a, b) => b.certificates - a.certificates).slice(0, 12);
      template(el, {
        title: this.title,
        sub: this.sub,
        kpis: [kpi({ label: tr("شهادات ممنوحة", "Granted"), value: fmtNum(26202), field: "var(--lilac)" }), kpi({ label: tr("هذا الشهر", "This month"), value: fmtNum(1184) }), kpi({ label: tr("قوالب نشطة", "Active templates"), value: fmtNum(certificateTemplates.length) })],
        table: card(tr("حسب الدورة", "By course"), simpleTable([{ l: tr("الدورة", "Course") }, { l: tr("المتدربون", "Students"), num: true }, { l: tr("الشهادات", "Certificates"), num: true }, { l: tr("نسبة الإتمام", "Completion"), num: true }], rows.map((c) => [`<a href="#/learning/courses/${c.id}/certificates">${esc(tr(c.title))}</a>`, fmtNum(c.students), fmtNum(c.certificates), `${Math.round((c.certificates / c.students) * 100)}%`])), { flush: true }),
      });
    },
  }),
};

export function reportPage({ report }) {
  const r = REPORTS[report]?.();
  if (!r) return null;
  return { title: r.title, render: (el) => r.build(el) };
}
