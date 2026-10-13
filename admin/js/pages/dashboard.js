import { tr, fmtNum, fmtMoney, fmtCompact } from "../i18n.js";
import { esc, pageHead, kpi, card, bars, btn, badge } from "../components/ui.js";
import { icon } from "../components/icons.js";
import { areaChart, wireCharts } from "../components/chart.js";
import { dailySales, kpis, ops, courses, orders, refunds, tickets, payouts, applications, qa, COLORS, REFUND_STATUS, TICKET_PRIORITY } from "../data/db.js";
import { customerCell, orderItemsLabel, orderStatus, money, date, rangeSelect, courseOf } from "./common.js";
import { load, save } from "../store.js";
import { can } from "../permissions.js";

export function salesSummary(days) {
  const cur = dailySales.slice(-days);
  const prev = dailySales.slice(-days * 2, -days);
  const sum = (a) => a.reduce((s, d) => s + d.amount, 0);
  const cnt = (a) => a.reduce((s, d) => s + d.orders, 0);
  const pct = (a, b) => (b ? Math.round(((a - b) / b) * 100) : 0);
  return {
    cur,
    prev,
    revenue: sum(cur),
    orders: cnt(cur),
    aov: sum(cur) / Math.max(cnt(cur), 1),
    dRevenue: pct(sum(cur), sum(prev)),
    dOrders: pct(cnt(cur), cnt(prev)),
    dAov: pct(sum(cur) / Math.max(cnt(cur), 1), sum(prev) / Math.max(cnt(prev), 1)),
  };
}

export function inboxItems() {
  return [
    { n: ops.refunds, ic: "refund", label: tr("استردادات بانتظار الموافقة", "Refunds awaiting approval"), href: "/sales/refunds", perm: "refunds.read" },
    { n: ops.tickets, ic: "ticket", label: tr("تذاكر دعم مفتوحة", "Open support tickets"), href: "/customers/tickets", perm: "tickets.read" },
    { n: ops.qa, ic: "message", label: tr("أسئلة متدربين بدون رد", "Unanswered trainee questions"), href: "/learning/qa", perm: "qa.read" },
    { n: ops.payouts, ic: "card", label: tr("طلبات صرف عمولات", "Affiliate payout requests"), href: "/marketing/payouts", perm: "affiliates.read" },
    { n: ops.applications, ic: "user", label: tr("طلبات مدربين جديدة", "New instructor applications"), href: "/learning/applications", perm: "instructors.read" },
  ].filter((x) => can(x.perm));
}

function inboxList() {
  return `<ul class="adm-list">${inboxItems()
    .map(
      (x) => `<li>${icon(x.ic)}<div class="adm-list__main"><a class="adm-list__title" href="#${x.href}">${esc(x.label)}</a></div>
      <strong class="adm-num">${fmtNum(x.n)}</strong>${icon("chevronEnd", "adm-icon-dir")}</li>`,
    )
    .join("")}</ul>`;
}

export function dashboardPage() {
  return {
    title: tr("لوحة المؤشرات", "Dashboard"),
    module: "dashboard",
    render(el) {
      const days = load("dashRange", 30);
      const s = salesSummary(days);
      const top = [...courses].sort((a, b) => b.revenue - a.revenue).slice(0, 6);
      const recent = orders.slice(0, 6);
      el.innerHTML = `
        ${pageHead({
          title: tr("صباح الخير", "Good morning"),
          sub: esc(tr("ملخص أداء المنصة وما ينتظرك اليوم.", "How the academy is doing, and what needs you today.")),
          actions: rangeSelect(days) + (can("courses.create") ? btn(tr("إنشاء دورة", "Create course"), { href: "/learning/courses/new", ic: "plus", kind: "primary" }) : ""),
        })}
        <div class="adm-grid adm-grid--3">
          ${kpi({ label: tr("الإيرادات المدفوعة", "Paid revenue"), value: esc(fmtMoney(s.revenue)), delta: s.dRevenue, meta: esc(tr("مقارنة بالفترة السابقة", "vs previous period")), field: "var(--coral)" })}
          ${kpi({ label: tr("الطلبات المدفوعة", "Paid orders"), value: fmtNum(s.orders), delta: s.dOrders, meta: esc(tr("مقارنة بالفترة السابقة", "vs previous period")) })}
          ${kpi({ label: tr("متوسط قيمة الطلب", "Average order value"), value: esc(fmtMoney(Math.round(s.aov))), delta: s.dAov, meta: esc(tr("مقارنة بالفترة السابقة", "vs previous period")) })}
        </div>
        <div class="adm-grid adm-grid--main-side adm-section-gap">
          ${card(
            tr("الإيرادات اليومية", "Daily revenue"),
            `<div class="adm-legend" style="margin-bottom:8px"><span style="--c:var(--coral)">${esc(tr("الفترة الحالية", "This period"))}</span><span style="--c:var(--purple)">${esc(tr("الفترة السابقة", "Previous period"))}</span></div>
            ${areaChart(s.cur, { compare: s.prev, label: tr("مخطط الإيرادات اليومية", "Daily revenue chart") })}`,
            { actions: btn(tr("تقرير المبيعات", "Sales report"), { href: "/analytics/sales", sm: true }) },
          )}
          ${card(tr("بانتظارك", "Needs you"), inboxList(), { actions: btn(tr("صندوق المهام", "Ops inbox"), { href: "/dashboard/inbox", sm: true }) })}
        </div>
        <div class="adm-grid adm-grid--3 adm-section-gap">
          ${kpi({ label: tr("المتدربون", "Trainees"), value: fmtNum(kpis.trainees), meta: esc(tr(`${fmtNum(kpis.activeToday)} نشط اليوم`, `${fmtNum(kpis.activeToday)} active today`)), ic: "users", field: "var(--yellow)" })}
          ${kpi({ label: tr("الشهادات الممنوحة", "Certificates granted"), value: fmtNum(kpis.certificates), meta: esc(tr("منذ الإطلاق", "all time")), ic: "award" })}
          ${kpi({ label: tr("الدورات المنشورة", "Published courses"), value: fmtNum(kpis.coursesPublished), meta: esc(tr(`${fmtNum(kpis.coursesUnpublished)} غير منشورة`, `${fmtNum(kpis.coursesUnpublished)} unpublished`)), ic: "book" })}
        </div>
        <div class="adm-grid adm-grid--2 adm-section-gap">
          ${card(tr("الدورات الأعلى إيرادًا", "Top courses by revenue"), bars(top.map((c, i) => ({ label: tr(c.title), value: c.revenue, color: COLORS[i % COLORS.length] })), { fmt: (v) => esc(fmtMoney(v)) }), { actions: btn(tr("كل الدورات", "All courses"), { href: "/learning/courses", sm: true }) })}
          ${card(
            tr("المنصة بالأرقام", "Platform at a glance"),
            `<dl class="adm-dl">
              <dt>${esc(tr("المستخدمون المؤكدون", "Confirmed users"))}</dt><dd class="adm-num">${fmtNum(kpis.usersConfirmed)} <span class="adm-muted">/ ${fmtNum(kpis.usersUnconfirmed)} ${esc(tr("غير مؤكد", "unconfirmed"))}</span></dd>
              <dt>${esc(tr("التسجيلات المجانية", "Free enrolments"))}</dt><dd class="adm-num">${fmtNum(kpis.freeEnrollments)}</dd>
              <dt>${esc(tr("الكوبونات المستخدمة", "Coupons used"))}</dt><dd class="adm-num">${fmtNum(kpis.couponsUsed)}</dd>
              <dt>${esc(tr("المسوقون المعتمدون", "Approved affiliates"))}</dt><dd class="adm-num">${fmtNum(kpis.affiliates)}</dd>
              <dt>${esc(tr("مكتبة الفيديو", "Video library"))}</dt><dd class="adm-num">${fmtNum(kpis.videos)} <span class="adm-muted">· ${fmtCompact(Math.round(kpis.videoSeconds / 3600))} ${esc(tr("ساعة", "hours"))}</span></dd>
              <dt>${esc(tr("طلبات المدربين", "Instructor applications"))}</dt><dd class="adm-num">${fmtNum(kpis.trainerApplications)}</dd>
            </dl>`,
          )}
        </div>
        <div class="adm-section-gap">
          ${card(
            tr("أحدث الطلبات", "Latest orders"),
            `<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>${esc(tr("الطلب", "Order"))}</th><th>${esc(tr("العميل", "Customer"))}</th><th>${esc(tr("المنتج", "Product"))}</th><th class="is-num">${esc(tr("الإجمالي", "Total"))}</th><th>${esc(tr("الحالة", "Status"))}</th></tr></thead>
            <tbody>${recent.map((o) => `<tr><td><a class="adm-cell-main" href="#/sales/orders/${o.id}">⁦#${o.number}⁩</a><span class="adm-cell-sub">${date(o.createdAt, true)}</span></td><td>${customerCell(o.customerId)}</td><td>${orderItemsLabel(o)}</td><td class="is-num">${money(o.total)}</td><td>${orderStatus(o)}</td></tr>`).join("")}</tbody></table></div>`,
            { flush: true, actions: btn(tr("كل الطلبات", "All orders"), { href: "/sales/orders", sm: true }) },
          )}
        </div>
        <p class="adm-muted adm-section-gap" style="font-size:13px">${esc(tr("تُحمَّل هذه المؤشرات من طلب ملخص واحد بدلًا من نحو 30 طلبًا في اللوحة القديمة.", "These figures load from one summary request instead of the ~30 the legacy panel fires."))}</p>`;
      wireCharts(el, [s.cur]);
      el.querySelector("[data-range]").addEventListener("change", (e) => {
        save("dashRange", Number(e.target.value));
        dashboardPage().render(el);
      });
    },
  };
}

export function inboxPage() {
  return {
    title: tr("صندوق المهام", "Ops inbox"),
    module: "dashboard",
    render(el) {
      const pendingRefunds = refunds.filter((r) => r.status === "requested");
      const openTickets = tickets.filter((t) => t.status === 1);
      const sec = (title, href, rows) =>
        card(title, rows.length ? `<ul class="adm-list">${rows.join("")}</ul>` : `<p class="adm-muted">${esc(tr("لا شيء هنا", "All clear"))}</p>`, { actions: btn(tr("عرض الكل", "View all"), { href, sm: true }) });
      el.innerHTML = `${pageHead({ title: tr("صندوق المهام", "Ops inbox"), sub: esc(tr("كل ما ينتظر قرارًا من الفريق، في مكان واحد.", "Everything waiting on a team decision, in one place.")) })}
        <div class="adm-grid adm-grid--2">
          ${can("refunds.read") ? sec(tr("استردادات بانتظار الموافقة", "Refunds awaiting approval"), "/sales/refunds", pendingRefunds.map((r) => `<li>${icon("refund")}<div class="adm-list__main"><a class="adm-list__title" href="#/sales/orders/${r.orderId}">⁦#ORD-${r.orderId}⁩</a><span class="adm-list__sub">${esc(tr(r.reason))} · ${esc(tr(r.requestedBy))}</span></div>${money(r.amount)} ${badge(REFUND_STATUS[r.status])}</li>`)) : ""}
          ${can("tickets.read") ? sec(tr("تذاكر مفتوحة", "Open tickets"), "/customers/tickets", openTickets.slice(0, 6).map((t) => `<li>${icon("ticket")}<div class="adm-list__main"><a class="adm-list__title" href="#/customers/tickets/${t.id}">⁦#${t.id}⁩ · ${esc(tr(t.subject))}</a><span class="adm-list__sub">${date(t.createdAt)}</span></div>${badge(TICKET_PRIORITY[t.priority])}</li>`)) : ""}
          ${can("qa.read") ? sec(tr("أسئلة بدون رد", "Unanswered questions"), "/learning/qa", qa.filter((q) => !q.replied).slice(0, 5).map((q) => `<li>${icon("message")}<div class="adm-list__main"><span class="adm-list__title">${esc(tr(q.comment))}</span><span class="adm-list__sub">${esc(tr(courseOf(q.courseId).title))}</span></div></li>`)) : ""}
          ${can("affiliates.read") ? sec(tr("طلبات صرف", "Payout requests"), "/marketing/payouts", payouts.filter((p) => p.status === 1).map((p) => `<li>${icon("card")}<div class="adm-list__main"><span class="adm-list__title">#${p.id}</span><span class="adm-list__sub">${date(p.requestedAt)}</span></div>${money(p.amount)}</li>`)) : ""}
          ${can("instructors.read") ? sec(tr("طلبات مدربين جديدة", "New instructor applications"), "/learning/applications", applications.filter((a) => a.status === "new").slice(0, 5).map((a) => `<li>${icon("user")}<div class="adm-list__main"><span class="adm-list__title">${esc(tr(a.name))}</span><span class="adm-list__sub">${esc(tr(a.field))} · ${fmtNum(a.years)} ${esc(tr("سنة خبرة", "yrs experience"))}</span></div></li>`)) : ""}
        </div>`;
    },
  };
}
