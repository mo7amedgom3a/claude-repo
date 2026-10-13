import { tr, fmtNum, fmtMoney } from "../i18n.js";
import { esc, pageHead, kpi, card, btn, badge, tabs, dl, alert, field, drawer, toast, validate, avatar, empty, unconfirmed } from "../components/ui.js";
import { icon } from "../components/icons.js";
import { dataTable } from "../components/data-table.js";
import { customers, orders, tickets, coupons, courses, byId, COLORS, TICKET_STATUS, TICKET_PRIORITY } from "../data/db.js";
import { customerCell, customerOf, courseOf, orderStatus, orderItemsLabel, money, date } from "./common.js";
import { can } from "../permissions.js";

const SEGMENT = {
  new: { label: { ar: "جديد", en: "New" }, tone: "info" },
  loyal: { label: { ar: "مخلص", en: "Loyal" }, tone: "success" },
  atRisk: { label: { ar: "معرض للفقد", en: "At risk" }, tone: "warning" },
  corporate: { label: { ar: "موظف شركة", en: "Corporate" }, tone: "neutral" },
};
const ACCOUNT = {
  active: { label: { ar: "نشط", en: "Active" }, tone: "success" },
  suspended: { label: { ar: "موقوف", en: "Suspended" }, tone: "danger" },
};

export function customersPage() {
  return {
    title: tr("العملاء", "Customers"),
    render(el) {
      el.innerHTML = `${pageHead({ title: tr("العملاء", "Customers"), sub: esc(tr("ابحث بالاسم أو البريد أو الجوال. ملف العميل يجمع الطلبات والتسجيلات والتذاكر وإجراءات الدعم.", "Search by name, email or phone. The customer 360 brings orders, enrolments, tickets and support actions together.")) })}<div data-t></div>`;
      dataTable(el.querySelector("[data-t]"), {
        id: "customers",
        label: tr("العملاء", "Customers"),
        rows: customers,
        rowHref: (c) => `/customers/${c.id}`,
        search: (c) => `${c.name.ar} ${c.name.en} ${c.email} ${c.phone}`,
        searchPlaceholder: tr("الاسم، البريد، الجوال…", "Name, email, phone…"),
        columns: [
          { key: "n", label: tr("العميل", "Customer"), sort: (c) => tr(c.name), render: (c) => customerCell(c.id) },
          { key: "o", label: tr("الطلبات", "Orders"), num: true, sort: (c) => c.orders, render: (c) => fmtNum(c.orders) },
          { key: "s", label: tr("الإنفاق", "Spent"), num: true, sort: (c) => c.spent, render: (c) => money(c.spent) },
          { key: "e", label: tr("التسجيلات", "Enrolments"), num: true, sort: (c) => c.enrollments.length, render: (c) => fmtNum(c.enrollments.length) },
          { key: "j", label: tr("تاريخ الانضمام", "Joined"), sort: (c) => c.joinedAt, render: (c) => date(c.joinedAt) },
          { key: "g", label: tr("الشريحة", "Segment"), render: (c) => badge(SEGMENT[c.segment]) },
          { key: "a", label: tr("الحساب", "Account"), render: (c) => `${badge(ACCOUNT[c.status])}${c.confirmed ? "" : ` <span class="ma-tag ma-tag--soft">${esc(tr("بريد غير مؤكد", "Email unconfirmed"))}</span>`}` },
        ],
        filters: [
          { key: "seg", label: tr("الشريحة", "Segment"), options: Object.entries(SEGMENT).map(([k, v]) => [k, tr(v.label)]), test: (c, v) => c.segment === v },
          { key: "conf", label: tr("البريد", "Email"), options: [["1", tr("مؤكد", "Confirmed")], ["0", tr("غير مؤكد", "Unconfirmed")]], test: (c, v) => String(Number(c.confirmed)) === v },
        ],
        views: [
          { id: "unconfirmed", label: tr("بريد غير مؤكد", "Unconfirmed email"), filters: { conf: "0" } },
          { id: "atrisk", label: tr("معرضون للفقد", "At risk"), filters: { seg: "atRisk" } },
        ],
      });
    },
  };
}

export function customerDetailPage({ id, tab = "overview" }) {
  const c = byId(customers, id);
  if (!c) return null;
  const base = `/customers/${c.id}`;
  const myOrders = orders.filter((o) => o.customerId === c.id);
  const myTickets = tickets.filter((t) => t.customerId === c.id);
  const enrolled = c.enrollments.map(courseOf).filter(Boolean);
  return {
    title: tr(c.name),
    crumbs: [[tr(c.name)]],
    render(el) {
      let body;
      if (tab === "overview") {
        body = `<div class="ma-cols ma-cols--main-side">
          <div class="ma-stack">
            <div class="ma-cols ma-cols--3">
              ${kpi({ label: tr("إجمالي الإنفاق", "Lifetime spend"), value: esc(fmtMoney(c.spent)), field: "var(--sky)" })}
              ${kpi({ label: tr("الطلبات", "Orders"), value: fmtNum(c.orders) })}
              ${kpi({ label: tr("الدورات", "Courses"), value: fmtNum(enrolled.length), meta: esc(tr(`${c.certificates} شهادة`, `${c.certificates} certificates`)) })}
            </div>
            ${card(tr("آخر الطلبات", "Latest orders"), ordersTable(myOrders.slice(0, 5)), { flush: true, actions: btn(tr("كل الطلبات", "All orders"), { href: `${base}/orders`, sm: true }) })}
          </div>
          <div class="ma-stack">
            ${card(tr("بيانات الاتصال", "Contact"), dl([
              [tr("البريد", "Email"), `<span class="ma-ltr">${esc(c.email)}</span> ${c.confirmed ? badge({ label: { ar: "مؤكد", en: "Confirmed" }, tone: "success" }) : badge({ label: { ar: "غير مؤكد", en: "Unconfirmed" }, tone: "warning" })}`],
              [tr("الجوال", "Phone"), `<span class="ma-ltr">${esc(c.phone)}</span>`],
              [tr("الدولة", "Country"), c.country],
              [tr("انضم", "Joined"), date(c.joinedAt)],
              [tr("آخر ظهور", "Last seen"), date(c.lastSeen)],
            ]))}
            ${card(tr("إجراءات الدعم", "Support actions"), `<div class="ma-stack" style="gap:8px">${supportActions()}</div>`)}
          </div>
        </div>`;
      } else if (tab === "orders") body = card(tr("الطلبات", "Orders"), myOrders.length ? ordersTable(myOrders) : empty(tr("لا توجد طلبات", "No orders yet")), { flush: true });
      else if (tab === "enrollments")
        body = card(
          tr("الدورات المسجلة", "Enrolled courses"),
          enrolled.length
            ? `<div class="ma-table-wrap"><table class="ma-table"><thead><tr><th>${esc(tr("الدورة", "Course"))}</th><th class="is-num">${esc(tr("التقدم", "Progress"))}</th><th>${esc(tr("الوصول حتى", "Access until"))}</th><th></th></tr></thead><tbody>${enrolled
                .map((co) => `<tr><td><a class="ma-cell-main" href="#/learning/courses/${co.id}">${esc(tr(co.title))}</a></td><td class="is-num">${(c.id + co.id) % 100}%</td><td>${date("2027-10-01")}</td><td>${can("customers.update") ? `<span class="ma-cluster">${btn(tr("تمديد", "Extend"), { sm: true, attrs: `data-extend="${co.id}"` })}${btn(tr("إلغاء الوصول", "Revoke"), { sm: true, kind: "danger", attrs: `data-revoke="${co.id}"` })}</span>` : ""}</td></tr>`)
                .join("")}</tbody></table></div>`
            : empty(tr("غير مسجل في أي دورة", "Not enrolled in any course")),
          { flush: true, actions: can("customers.update") ? btn(tr("تسجيل في دورة", "Enrol in course"), { sm: true, ic: "plus", attrs: "data-act=enrol" }) : "" },
        );
      else if (tab === "certificates")
        body = card(tr("الشهادات", "Certificates"), c.certificates ? `<ul class="ma-list">${enrolled.slice(0, c.certificates).map((co) => `<li>${icon("award")}<div class="ma-list__main"><strong>${esc(tr(co.title))}</strong><span class="ma-list__sub">${esc(tr("الاسم على الشهادة", "Name on certificate"))}: ${esc(tr(c.name))}</span></div>${btn(tr("تنزيل", "Download"), { sm: true, ic: "download" })}</li>`).join("") || `<li>${esc(tr(`${c.certificates} شهادة من دورات سابقة`, `${c.certificates} certificates from earlier courses`))}</li>`}</ul>` : empty(tr("لا توجد شهادات", "No certificates")), { actions: can("customers.update") ? btn(tr("تعديل الاسم على الشهادة", "Change certificate name"), { sm: true, attrs: "data-act=rename" }) : "" });
      else if (tab === "tickets")
        body = card(tr("التذاكر", "Tickets"), myTickets.length ? `<ul class="ma-list">${myTickets.map((t) => `<li>${icon("ticket")}<div class="ma-list__main"><a class="ma-list__title" href="#/customers/tickets/${t.id}">⁦#${t.id}⁩ · ${esc(tr(t.subject))}</a><span class="ma-list__sub">${date(t.createdAt)}</span></div>${badge(TICKET_STATUS[t.status])}</li>`).join("")}</ul>` : empty(tr("لا توجد تذاكر", "No tickets")));
      else
        body = card(tr("النشاط", "Activity"), `<ol class="ma-timeline">${[
          [tr("سجّل الدخول", "Signed in"), c.lastSeen],
          ...myOrders.slice(0, 3).map((o) => [tr(`أنشأ الطلب ⁦#${o.number}⁩`, `Placed order ⁦#${o.number}⁩`), o.createdAt]),
          [tr("أنشأ الحساب", "Created account"), c.joinedAt],
        ].map(([t, d]) => `<li><strong>${esc(t)}</strong><div class="ma-muted">${date(d, true)}</div></li>`).join("")}</ol>`);

      el.innerHTML = `${pageHead({
        title: tr(c.name),
        status: badge(ACCOUNT[c.status]) + " " + badge(SEGMENT[c.segment]),
        sub: `<span class="ma-ltr">${esc(c.email)}</span> · ${esc(tr("رقم العميل", "Customer ID"))} ${c.id}`,
        back: { href: "/customers", label: tr("العملاء", "Customers") },
        actions: can("customers.update") ? btn(tr("تسجيل في دورة", "Enrol in course"), { kind: "primary", ic: "plus", attrs: "data-act=enrol" }) + `<span class="ma-menu">${btn(tr("المزيد", "More"), { ic: "more", attrs: 'data-more aria-haspopup="true" aria-expanded="false"' })}<div class="ma-menu__pop" hidden role="menu">
            <button class="ma-menu__item" role="menuitem" data-act="rename">${icon("edit")}${esc(tr("تعديل الاسم أو البريد", "Edit name or email"))}</button>
            <button class="ma-menu__item" role="menuitem" data-act="coupon">${icon("tag")}${esc(tr("منح كوبون", "Give a coupon"))}</button>
            <button class="ma-menu__item" role="menuitem" data-act="reset">${icon("key")}${esc(tr("إرسال رابط إعادة تعيين كلمة المرور", "Send password reset link"))}</button>
            <button class="ma-menu__item" role="menuitem" data-act="suspend">${icon("lock")}${esc(c.status === "suspended" ? tr("إلغاء الإيقاف", "Unsuspend") : tr("إيقاف الحساب", "Suspend account"))}</button>
          </div></span>` : "",
      })}
      <div style="display:flex;align-items:center;gap:12px;margin:-8px 0 16px">${avatar(c.initials, COLORS[c.id % 8], true)}<span class="ma-muted">${esc(tr("ملف العميل 360", "Customer 360"))}</span></div>
      ${tabs(base, [["overview", tr("نظرة عامة", "Overview")], ["orders", tr("الطلبات", "Orders")], ["enrollments", tr("التسجيلات", "Enrolments")], ["certificates", tr("الشهادات", "Certificates")], ["tickets", tr("التذاكر", "Tickets")], ["activity", tr("النشاط", "Activity")]], tab)}
      ${body}`;

      const rerender = () => customerDetailPage({ id, tab }).render(el);
      const more = el.querySelector("[data-more]");
      more?.addEventListener("click", () => {
        const pop = more.nextElementSibling;
        pop.hidden = !pop.hidden;
        more.setAttribute("aria-expanded", String(!pop.hidden));
        if (!pop.hidden) pop.querySelector("button").focus();
      });
      el.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => act(b.dataset.act)));
      el.querySelectorAll("[data-revoke]").forEach((b) =>
        b.addEventListener("click", () => {
          c.enrollments = c.enrollments.filter((x) => String(x) !== b.dataset.revoke);
          toast(tr("تم إلغاء الوصول", "Access revoked"));
          rerender();
        }),
      );
      el.querySelectorAll("[data-extend]").forEach((b) => b.addEventListener("click", () => toast(tr("تم تمديد الوصول 3 أشهر", "Access extended by 3 months"), "calendar")));

      function act(kind) {
        if (kind === "enrol")
          drawer({
            title: tr("تسجيل في دورة", "Enrol in course"),
            body: `<div class="ma-form">${alert("info", tr("تسجيل يدوي", "Manual enrolment"), esc(tr("يمنح الوصول دون إنشاء طلب مدفوع. يُسجل في سجل التدقيق.", "Grants access without a paid order. Recorded in the audit log.")))}
              ${field({ id: "ec", label: tr("الدورة", "Course"), required: true, options: [["", tr("اختر…", "Choose…")], ...courses.filter((x) => !c.enrollments.includes(x.id)).map((x) => [x.id, tr(x.title)])] })}
              ${field({ id: "ed", label: tr("مدة الوصول", "Access duration"), options: [["12", tr("12 شهرًا", "12 months")], ["6", tr("6 أشهر", "6 months")], ["0", tr("مدى الحياة", "Lifetime")]] })}
              ${field({ id: "er", label: tr("السبب", "Reason"), type: "textarea", required: true, hint: tr("مثال: تحويل بنكي مؤكد، تعويض عن مشكلة تقنية.", "e.g. confirmed bank transfer, compensation for a technical issue.") })}</div>`,
            foot: `${btn(tr("إلغاء", "Cancel"), { attrs: "data-close" })}${btn(tr("تسجيل", "Enrol"), { kind: "primary", attrs: "data-ok" })}`,
            onMount(p, close) {
              p.querySelector("[data-ok]").addEventListener("click", () => {
                if (!validate(p, { ec: (v) => (!v ? tr("اختر دورة", "Pick a course") : null), er: (v) => (!v ? tr("السبب مطلوب للتدقيق", "A reason is required for the audit log") : null) })) return;
                c.enrollments.push(Number(p.querySelector("#ec").value));
                close();
                toast(tr("تم التسجيل في الدورة", "Enrolled in course"));
                rerender();
              });
            },
          });
        else if (kind === "rename")
          drawer({
            title: tr("تعديل الاسم أو البريد", "Edit name or email"),
            body: `<div class="ma-form">${field({ id: "rn", label: tr("الاسم (يظهر على الشهادات)", "Name (printed on certificates)"), value: tr(c.name), required: true })}${field({ id: "re", label: tr("البريد", "Email"), type: "email", value: c.email, required: true, attrs: 'dir="ltr"' })}
              <label class="ma-check"><input type="checkbox" id="rc" checked> ${esc(tr("إعادة إصدار الشهادات السابقة بالاسم الجديد", "Reissue earlier certificates with the new name"))}</label></div>`,
            foot: `${btn(tr("إلغاء", "Cancel"), { attrs: "data-close" })}${btn(tr("حفظ", "Save"), { kind: "primary", attrs: "data-ok" })}`,
            onMount(p, close) {
              p.querySelector("[data-ok]").addEventListener("click", () => {
                if (!validate(p, { rn: (v) => (!v ? tr("مطلوب", "Required") : null), re: (v) => (!/.+@.+\..+/.test(v) ? tr("بريد غير صحيح", "Invalid email") : null) })) return;
                const n = p.querySelector("#rn").value;
                c.name = { ar: n, en: n };
                c.email = p.querySelector("#re").value;
                close();
                toast(tr("تم الحفظ", "Saved"));
                rerender();
              });
            },
          });
        else if (kind === "coupon")
          drawer({
            title: tr("منح كوبون", "Give a coupon"),
            body: `<div class="ma-form">${field({ id: "cc", label: tr("الكوبون", "Coupon"), options: coupons.filter((x) => x.active).slice(0, 15).map((x) => [x.id, `${x.code} · ${x.percent}%`]) })}<label class="ma-check"><input type="checkbox" checked> ${esc(tr("إرسال بريد للعميل", "Email the customer"))}</label></div>`,
            foot: `${btn(tr("إلغاء", "Cancel"), { attrs: "data-close" })}${btn(tr("منح الكوبون", "Give coupon"), { kind: "primary", attrs: "data-ok" })}`,
            onMount(p, close) {
              p.querySelector("[data-ok]").addEventListener("click", () => {
                close();
                toast(tr("تم منح الكوبون", "Coupon given"), "tag");
              });
            },
          });
        else if (kind === "reset") toast(tr("تم إرسال رابط إعادة التعيين", "Reset link sent"), "send");
        else if (kind === "suspend") {
          c.status = c.status === "suspended" ? "active" : "suspended";
          toast(c.status === "suspended" ? tr("تم إيقاف الحساب", "Account suspended") : tr("تم إلغاء الإيقاف", "Account unsuspended"), "lock");
          rerender();
        }
      }
    },
  };

  function supportActions() {
    if (!can("customers.update")) return `<p class="ma-muted">${esc(tr("لا تملك صلاحية التعديل.", "You don't have edit access."))}</p>`;
    return [
      btn(tr("تسجيل في دورة", "Enrol in course"), { ic: "plus", attrs: "data-act=enrol" }),
      btn(tr("تعديل الاسم على الشهادة", "Change certificate name"), { ic: "edit", attrs: "data-act=rename" }),
      btn(tr("منح كوبون", "Give a coupon"), { ic: "tag", attrs: "data-act=coupon" }),
      btn(tr("إعادة تعيين كلمة المرور", "Send password reset"), { ic: "key", attrs: "data-act=reset" }),
    ].join("");
  }
}

function ordersTable(list) {
  return `<div class="ma-table-wrap"><table class="ma-table"><thead><tr><th>${esc(tr("الطلب", "Order"))}</th><th>${esc(tr("المنتجات", "Products"))}</th><th class="is-num">${esc(tr("الإجمالي", "Total"))}</th><th>${esc(tr("الحالة", "Status"))}</th></tr></thead><tbody>${list
    .map((o) => `<tr><td><a class="ma-cell-main" href="#/sales/orders/${o.id}">⁦#${o.number}⁩</a><span class="ma-cell-sub">${date(o.createdAt)}</span></td><td>${orderItemsLabel(o)}</td><td class="is-num">${money(o.total)}</td><td>${orderStatus(o)}</td></tr>`)
    .join("")}</tbody></table></div>`;
}

/* ---------------- Segments ---------------- */
export function segmentsPage() {
  return {
    title: tr("الشرائح", "Segments"),
    render(el) {
      const seg = Object.entries(SEGMENT).map(([k, v], i) => ({ k, v, n: customers.filter((c) => c.segment === k).length * 389, color: COLORS[i] }));
      el.innerHTML = `${pageHead({ title: tr("الشرائح", "Segments"), sub: esc(tr("مجموعات عملاء ديناميكية تُستخدم في الحملات والتقارير.", "Dynamic customer groups used in campaigns and reports.")), actions: btn(tr("شريحة جديدة", "New segment"), { kind: "primary", ic: "plus" }) })}
        <div class="ma-cols ma-cols--2">${seg
          .map((s) => `<section class="ma-panel"><div class="ma-fieldblock" style="background:${s.color};margin:-20px -20px 16px;border-radius:var(--radius-card) var(--radius-card) 0 0"><div class="ma-kpi"><span class="ma-kpi__label">${esc(tr(s.v.label))}</span><span class="ma-kpi__value">${fmtNum(s.n)}</span></div></div>
            <p class="ma-muted">${esc(tr({ new: "انضموا خلال آخر 30 يومًا", loyal: "3 طلبات مدفوعة أو أكثر", atRisk: "لم يدخلوا منذ 60 يومًا مع تسجيلات غير مكتملة", corporate: "حسابات مرتبطة بشركة" }[s.k], { new: "Joined in the last 30 days", loyal: "3 or more paid orders", atRisk: "Inactive 60 days with unfinished courses", corporate: "Accounts linked to a company" }[s.k]))}</p>
            <div class="ma-cluster ma-section-gap">${btn(tr("عرض العملاء", "View customers"), { href: "/customers", sm: true })}${btn(tr("تصدير", "Export"), { sm: true, ic: "download" })}</div></section>`)
          .join("")}</div>`;
    },
  };
}

/* ---------------- Tickets ---------------- */
const ttype = (t) => `${esc(tr(t.subject))}${unconfirmed()}`;

export function ticketsPage() {
  return {
    title: tr("التذاكر", "Tickets"),
    render(el) {
      el.innerHTML = `${pageHead({ title: tr("تذاكر الدعم", "Support tickets"), sub: esc(tr("تسميات النوع والحالة والأولوية مأخوذة من أرقام النظام القديم وتحتاج تأكيدًا.", "Type, status and priority labels are read from legacy numeric codes and still need confirming.")), actions: can("tickets.create") ? btn(tr("تذكرة جديدة", "New ticket"), { kind: "primary", ic: "plus" }) : "" })}<div data-t></div>`;
      dataTable(el.querySelector("[data-t]"), {
        id: "tickets",
        label: tr("التذاكر", "Tickets"),
        rows: tickets,
        rowHref: (t) => `/customers/tickets/${t.id}`,
        search: (t) => `${t.id} ${tr(t.subject)} ${tr(customerOf(t.customerId).name)}`,
        columns: [
          { key: "id", label: tr("التذكرة", "Ticket"), sort: (t) => t.id, render: (t) => `<a class="ma-cell-main" href="#/customers/tickets/${t.id}">⁦#${t.id}⁩</a><span class="ma-cell-sub">${date(t.createdAt)}</span>` },
          { key: "s", label: tr("الموضوع", "Subject"), render: ttype },
          { key: "c", label: tr("العميل", "Customer"), render: (t) => customerCell(t.customerId) },
          { key: "p", label: tr("الأولوية", "Priority"), sort: (t) => t.priority, render: (t) => badge(TICKET_PRIORITY[t.priority]) },
          { key: "a", label: tr("المسؤول", "Assignee"), render: (t) => (t.assignee ? esc(tr(t.assignee)) : `<span class="ma-muted">${esc(tr("غير مسند", "Unassigned"))}</span>`) },
          { key: "st", label: tr("الحالة", "Status"), render: (t) => badge(TICKET_STATUS[t.status]) },
        ],
        filters: [
          { key: "st", label: tr("الحالة", "Status"), options: Object.entries(TICKET_STATUS).map(([k, v]) => [k, tr(v.label)]), test: (t, v) => String(t.status) === v },
          { key: "p", label: tr("الأولوية", "Priority"), options: Object.entries(TICKET_PRIORITY).map(([k, v]) => [k, tr(v.label)]), test: (t, v) => String(t.priority) === v },
        ],
        views: [
          { id: "open", label: tr("مفتوحة", "Open"), filters: { st: "1" } },
          { id: "high", label: tr("أولوية عالية", "High priority"), filters: { p: "4" } },
        ],
        bulk: [{ label: tr("إسناد لي", "Assign to me"), onClick: (ids) => (ids.forEach((id) => (byId(tickets, id).assignee = { ar: "أنا", en: "Me" })), toast(tr("تم الإسناد", "Assigned"))) }],
      });
    },
  };
}

export function ticketDetailPage({ id }) {
  const t = byId(tickets, id);
  if (!t) return null;
  const c = customerOf(t.customerId);
  const msgs = [
    { staff: false, text: tr(`السلام عليكم، ${tr(t.subject)}. أرجو المساعدة.`, `Hello, ${tr(t.subject).toLowerCase()}. Please help.`), at: t.createdAt },
    ...(t.messages > 1 ? [{ staff: true, text: tr("أهلًا بك، نراجع طلبك الآن وسنعود إليك قريبًا.", "Hi, we're looking into this and will get back to you shortly."), at: t.createdAt }] : []),
    ...(t.messages > 2 ? [{ staff: false, text: tr("شكرًا لكم، بانتظار ردكم.", "Thanks, waiting for your reply."), at: t.createdAt }] : []),
  ];
  return {
    title: `⁦#${t.id}⁩`,
    crumbs: [[`⁦#${t.id}⁩`]],
    render(el) {
      el.innerHTML = `${pageHead({ title: `${tr("تذكرة", "Ticket")} ⁦#${t.id}⁩`, status: badge(TICKET_STATUS[t.status]), sub: ttype(t), back: { href: "/customers/tickets", label: tr("التذاكر", "Tickets") } })}
        <div class="ma-cols ma-cols--main-side">
          ${card(tr("المحادثة", "Conversation"), `<div class="ma-chat">${msgs.map((m) => `<div class="ma-msg${m.staff ? " ma-msg--staff" : ""}"><p class="ma-msg__meta">${m.staff ? esc(tr("فريق الدعم", "Support team")) : esc(tr(c.name))} · ${date(m.at, true)}</p>${esc(m.text)}</div>`).join("")}</div>
            ${can("tickets.update") ? `<form class="ma-form ma-section-gap" data-reply>${field({ id: "msg", label: tr("ردك", "Your reply"), type: "textarea", required: true })}
              <div class="ma-cluster"><label class="ma-check"><input type="checkbox" id="close"> ${esc(tr("إغلاق التذكرة بعد الرد", "Close the ticket after replying"))}</label><span class="ma-spacer"></span>${btn(tr("إرسال الرد", "Send reply"), { kind: "primary", ic: "send", attrs: "data-send" })}</div></form>` : ""}`)}
          <div class="ma-stack">
            ${card(tr("التفاصيل", "Details"), `<div class="ma-form">
              ${field({ id: "tst", label: tr("الحالة", "Status"), value: t.status, options: Object.entries(TICKET_STATUS).map(([k, v]) => [k, tr(v.label)]), attrs: can("tickets.update") ? "" : "disabled" })}
              ${field({ id: "tpr", label: tr("الأولوية", "Priority"), value: t.priority, options: Object.entries(TICKET_PRIORITY).map(([k, v]) => [k, tr(v.label)]), attrs: can("tickets.update") ? "" : "disabled" })}
              ${field({ id: "tas", label: tr("المسؤول", "Assignee"), value: t.assignee?.en ?? "", options: [["", tr("غير مسند", "Unassigned")], ["Sara", tr("سارة", "Sara")], ["Youssef", tr("يوسف", "Youssef")], ["Me", tr("أنا", "Me")]], attrs: can("tickets.update") ? "" : "disabled" })}
            </div>`)}
            ${card(tr("العميل", "Customer"), `${customerCell(c.id)}<div class="ma-section-gap">${dl([[tr("الطلبات", "Orders"), fmtNum(c.orders)], [tr("الدورات", "Courses"), fmtNum(c.enrollments.length)]])}</div>`, { actions: btn(tr("ملف العميل", "Customer 360"), { href: `/customers/${c.id}`, sm: true }) })}
            ${t.type === 1 ? card(tr("إجراء مقترح", "Suggested action"), `<p class="ma-muted" style="margin-bottom:12px">${esc(tr("طلب تعديل اسم الشهادة: يمكنك تنفيذه من ملف العميل.", "Certificate name change: you can do it from the customer 360."))}</p>${btn(tr("تعديل الاسم على الشهادة", "Change certificate name"), { href: `/customers/${c.id}/certificates`, sm: true, kind: "ink" })}`) : ""}
          </div>
        </div>`;
      el.querySelectorAll("#tst,#tpr,#tas").forEach((s) =>
        s.addEventListener("change", () => {
          t.status = Number(el.querySelector("#tst").value);
          t.priority = Number(el.querySelector("#tpr").value);
          const a = el.querySelector("#tas").value;
          t.assignee = a ? { ar: a === "Me" ? "أنا" : a === "Sara" ? "سارة" : "يوسف", en: a } : null;
          toast(tr("تم التحديث", "Updated"));
        }),
      );
      el.querySelector("[data-send]")?.addEventListener("click", () => {
        const f = el.querySelector("[data-reply]");
        if (!validate(f, { msg: (v) => (!v ? tr("اكتب ردًا", "Write a reply") : null) })) return;
        t.messages++;
        if (f.querySelector("#close").checked) t.status = 4;
        toast(tr("تم إرسال الرد", "Reply sent"), "send");
        ticketDetailPage({ id }).render(el);
      });
    },
  };
}
