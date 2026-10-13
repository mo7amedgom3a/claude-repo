import { tr, fmtNum, fmtMoney } from "../i18n.js";
import { esc, pageHead, kpi, card, btn, badge, tabs, dl, alert, field, drawer, toast, confirmDialog, avatar, validate } from "../components/ui.js";
import { icon } from "../components/icons.js";
import { dataTable } from "../components/data-table.js";
import { affiliates, commissions, payouts, coupons, orders, announcements, banners, byId, COLORS, AFFILIATE_STATUS, PAYOUT_STATUS } from "../data/db.js";
import { courseOf, money, date, onOff, customerCell, orderStatus } from "./common.js";
import { can } from "../permissions.js";

const affCell = (a) => `<span class="adm-cell-flex">${avatar(a.initials, COLORS[a.id % 8])}<span><a class="adm-cell-main" href="#/marketing/affiliates/${a.id}">${esc(tr(a.name))}</a><span class="adm-cell-sub adm-ltr">${esc(a.code)}</span></span></span>`;

export function affiliatesPage() {
  return {
    title: tr("المسوقون بالعمولة", "Affiliates"),
    render(el) {
      el.innerHTML = `${pageHead({ title: tr("المسوقون بالعمولة", "Affiliates"), sub: esc(tr("المسوقون المعتمدون وطلبات الانضمام. عمولة ثابتة لكل دورة.", "Approved affiliates and join requests. Fixed commission per course.")) })}<div data-t></div>`;
      dataTable(el.querySelector("[data-t]"), {
        id: "affiliates",
        label: tr("المسوقون", "Affiliates"),
        rows: affiliates,
        rowHref: (a) => `/marketing/affiliates/${a.id}`,
        search: (a) => `${a.name.ar} ${a.name.en} ${a.code} ${a.email}`,
        columns: [
          { key: "n", label: tr("المسوق", "Affiliate"), sort: (a) => tr(a.name), render: affCell },
          { key: "s", label: tr("المبيعات", "Sales"), num: true, sort: (a) => a.sales, render: (a) => fmtNum(a.sales) },
          { key: "r", label: tr("الإيرادات", "Revenue"), num: true, sort: (a) => a.revenue, render: (a) => money(a.revenue) },
          { key: "u", label: tr("عمولة مستحقة", "Unpaid"), num: true, sort: (a) => a.unpaid, render: (a) => money(a.unpaid) },
          { key: "j", label: tr("انضم", "Joined"), sort: (a) => a.joinedAt, render: (a) => date(a.joinedAt) },
          { key: "st", label: tr("الحالة", "Status"), render: (a) => badge(AFFILIATE_STATUS[a.status]) },
        ],
        filters: [{ key: "st", label: tr("الحالة", "Status"), options: Object.entries(AFFILIATE_STATUS).map(([k, v]) => [k, tr(v.label)]), test: (a, v) => String(a.status) === v }],
        views: [{ id: "pending", label: tr("بانتظار المراجعة", "Pending review"), filters: { st: "0" } }],
        bulk: can("affiliates.update") ? [{ label: tr("اعتماد", "Approve"), onClick: (ids) => (ids.forEach((id) => (byId(affiliates, id).status = 2)), toast(tr("تم الاعتماد", "Approved"))) }] : [],
      });
    },
  };
}

export function affiliateDetailPage({ id, tab = "overview" }) {
  const a = byId(affiliates, id);
  if (!a) return null;
  const base = `/marketing/affiliates/${a.id}`;
  const myOrders = orders.filter((o) => o.affiliateId === a.id);
  return {
    title: tr(a.name),
    crumbs: [[tr(a.name)]],
    render(el) {
      let body;
      if (tab === "overview")
        body = `<div class="adm-grid adm-grid--3">${kpi({ label: tr("الإيرادات المحققة", "Revenue driven"), value: esc(fmtMoney(a.revenue)), field: "var(--green)" })}${kpi({ label: tr("عمولة مستحقة", "Unpaid commission"), value: esc(fmtMoney(a.unpaid)) })}${kpi({ label: tr("عمولة مدفوعة", "Paid commission"), value: esc(fmtMoney(a.paid)) })}</div>
          <div class="adm-section-gap">${card(tr("طلبات عبر هذا المسوق", "Orders via this affiliate"), myOrders.length ? `<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>${esc(tr("الطلب", "Order"))}</th><th>${esc(tr("العميل", "Customer"))}</th><th class="is-num">${esc(tr("الإجمالي", "Total"))}</th><th>${esc(tr("الحالة", "Status"))}</th></tr></thead><tbody>${myOrders.map((o) => `<tr><td><a href="#/sales/orders/${o.id}">⁦#${o.number}⁩</a></td><td>${customerCell(o.customerId)}</td><td class="is-num">${money(o.total)}</td><td>${orderStatus(o)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="adm-muted" style="padding:0 20px 20px">${esc(tr("لا توجد طلبات في العينة", "No orders in this sample"))}</p>`, { flush: true })}</div>`;
      else if (tab === "commissions") body = card(tr("العمولات لكل دورة", "Commission per course"), commissionTable(commissions.slice(0, 8)), { flush: true });
      else if (tab === "payouts") body = card(tr("طلبات الصرف", "Payout requests"), payoutTable(payouts.filter((p) => p.affiliateId === a.id).concat(payouts.slice(0, 2))), { flush: true });
      else if (tab === "coupons") body = card(tr("كوبونات المسوق", "Affiliate coupons"), `<ul class="adm-list">${coupons.filter((c) => c.affiliateId === a.id).concat(coupons.slice(0, 1)).map((c) => `<li>${icon("tag")}<a class="adm-list__main adm-list__title adm-ltr" href="#/sales/coupons/${c.id}">${esc(c.code)}</a><span>${c.percent}%</span><span class="adm-muted">${fmtNum(c.used)} ${esc(tr("استخدام", "uses"))}</span></li>`).join("")}</ul>`);
      else body = card(tr("البيانات البنكية", "Bank details"), `${alert("info", tr("بيانات حساسة", "Sensitive data"), esc(tr("يظهر آخر 4 أرقام فقط. العرض الكامل يتطلب صلاحية المالية ويُسجل في التدقيق.", "Only the last 4 digits are shown. Full view needs finance scope and is audited.")))}<div class="adm-section-gap">${dl([[tr("البنك", "Bank"), tr("مصرف الراجحي", "Al Rajhi Bank")], ["IBAN", `<span class="adm-ltr adm-secret">SA•• •••• •••• •••• ${String(4000 + a.id).slice(-4)}</span>`], [tr("اسم المستفيد", "Beneficiary"), esc(tr(a.name))]])}</div>`);
      el.innerHTML = `${pageHead({ title: tr(a.name), status: badge(AFFILIATE_STATUS[a.status]), sub: `<span class="adm-ltr">${esc(a.email)}</span> · ${esc(a.code)}`, back: { href: "/marketing/affiliates", label: tr("المسوقون", "Affiliates") }, actions: a.status === 0 && can("affiliates.update") ? btn(tr("اعتماد المسوق", "Approve affiliate"), { kind: "primary", attrs: "data-approve" }) : "" })}
        ${tabs(base, [["overview", tr("نظرة عامة", "Overview")], ["commissions", tr("العمولات", "Commissions")], ["payouts", tr("طلبات الصرف", "Payouts")], ["coupons", tr("الكوبونات", "Coupons")], ["bank", tr("البيانات البنكية", "Bank details")]], tab)}${body}`;
      el.querySelector("[data-approve]")?.addEventListener("click", () => {
        a.status = 2;
        toast(tr("تم اعتماد المسوق", "Affiliate approved"));
        affiliateDetailPage({ id, tab }).render(el);
      });
    },
  };
}

function commissionTable(list) {
  return `<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>${esc(tr("الدورة", "Course"))}</th><th class="is-num">${esc(tr("السعر", "Price"))}</th><th class="is-num">${esc(tr("العمولة", "Commission"))}</th></tr></thead><tbody>${list
    .map((c) => {
      const co = courseOf(c.courseId);
      return `<tr><td><a href="#/learning/courses/${co.id}">${esc(tr(co.title))}</a></td><td class="is-num">${money(co.price)}</td><td class="is-num"><strong>${money(c.amount)}</strong></td></tr>`;
    })
    .join("")}</tbody></table></div>`;
}

function payoutTable(list) {
  return `<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>#</th><th>${esc(tr("المسوق", "Affiliate"))}</th><th>${esc(tr("التاريخ", "Requested"))}</th><th class="is-num">${esc(tr("المبلغ", "Amount"))}</th><th>${esc(tr("الحالة", "Status"))}</th><th></th></tr></thead><tbody>${list
    .map((p) => `<tr><td>${p.id}</td><td>${affCell(byId(affiliates, p.affiliateId))}</td><td>${date(p.requestedAt)}</td><td class="is-num">${money(p.amount)}</td><td>${badge(PAYOUT_STATUS[p.status])}</td><td>${p.status === 1 && can("affiliates.update") ? `<span class="adm-row">${btn(tr("تأكيد الدفع", "Mark paid"), { sm: true, attrs: `data-pay="${p.id}"` })}${btn(tr("رفض", "Reject"), { sm: true, kind: "danger", attrs: `data-reject="${p.id}"` })}</span>` : ""}</td></tr>`)
    .join("")}</tbody></table></div>`;
}

export function commissionsPage() {
  return {
    title: tr("العمولات", "Commissions"),
    render(el) {
      el.innerHTML = `${pageHead({ title: tr("العمولات", "Commissions"), sub: esc(tr("مبلغ ثابت لكل دورة يُستحق عند اكتمال الطلب.", "A fixed amount per course, earned when the order is paid.")), actions: can("affiliates.update") ? btn(tr("إضافة عمولة", "Add commission"), { kind: "primary", ic: "plus", attrs: "data-add" }) : "" })}${card("", commissionTable(commissions), { flush: true })}`;
      el.querySelector("[data-add]")?.addEventListener("click", () =>
        drawer({
          title: tr("إضافة عمولة", "Add commission"),
          body: `<div class="adm-form">${field({ id: "cc", label: tr("الدورة", "Course"), options: commissions.map((c) => [c.courseId, tr(courseOf(c.courseId).title)]) })}${field({ id: "ca", label: tr("مبلغ العمولة (ر.س)", "Commission (SAR)"), type: "number", required: true })}</div>`,
          foot: `${btn(tr("إلغاء", "Cancel"), { attrs: "data-close" })}${btn(tr("حفظ", "Save"), { kind: "primary", attrs: "data-ok" })}`,
          onMount(p, close) {
            p.querySelector("[data-ok]").addEventListener("click", () => {
              if (!validate(p, { ca: (v) => (!v || Number(v) <= 0 ? tr("أدخل مبلغًا", "Enter an amount") : null) })) return;
              close();
              toast(tr("تم الحفظ", "Saved"));
            });
          },
        }),
      );
    },
  };
}

export function payoutsPage() {
  return {
    title: tr("طلبات الصرف", "Payout requests"),
    render(el) {
      const paint = () => {
        el.innerHTML = `${pageHead({ title: tr("طلبات الصرف", "Payout requests"), sub: esc(tr("تأكيد الدفع يعني أن المالية حوّلت المبلغ فعلًا.", "Mark paid only after finance has actually sent the transfer.")) })}${card("", payoutTable(payouts), { flush: true })}`;
        el.querySelectorAll("[data-pay]").forEach((b) =>
          b.addEventListener("click", () => {
            const p = byId(payouts, b.dataset.pay);
            confirmDialog({
              title: tr("تأكيد الدفع", "Mark as paid"),
              body: esc(tr(`هل حوّلت ${fmtMoney(p.amount)} إلى حساب المسوق؟`, `Have you transferred ${fmtMoney(p.amount)} to the affiliate's account?`)),
              confirm: tr("نعم، تم التحويل", "Yes, transferred"),
              onConfirm() {
                p.status = 2;
                paint();
                toast(tr("تم تسجيل الدفع", "Payout recorded"));
              },
            });
          }),
        );
        el.querySelectorAll("[data-reject]").forEach((b) =>
          b.addEventListener("click", () => {
            byId(payouts, b.dataset.reject).status = 3;
            paint();
            toast(tr("تم الرفض", "Rejected"));
          }),
        );
      };
      paint();
    },
  };
}

const PLACE = { home: { ar: "الرئيسية", en: "Home page" }, course: { ar: "صفحة الدورة", en: "Course page" }, checkout: { ar: "الدفع", en: "Checkout" } };

export function announcementsPage() {
  return {
    title: tr("أشرطة الإعلانات", "Announcement bars"),
    render(el) {
      el.innerHTML = `${pageHead({ title: tr("أشرطة الإعلانات", "Announcement bars"), sub: esc(tr("شريط واحد نشط لكل موضع في الموقع.", "One active bar per website placement.")), actions: can("marketing.create") ? btn(tr("شريط جديد", "New bar"), { kind: "primary", ic: "plus" }) : "" })}
        <div class="adm-stack">${announcements
          .map((a) => `<section class="adm-card adm-card--flush"><div style="background:${a.color};color:var(--ink);padding:12px 20px;font-weight:700">${esc(tr(a.text))}</div>
            <div class="adm-row" style="padding:12px 20px"><span class="adm-tag adm-tag--plain">${esc(tr(PLACE[a.place]))}</span>${onOff(a.active)}<span class="adm-spacer"></span>${btn(tr("تعديل", "Edit"), { sm: true, ic: "edit" })}</div></section>`)
          .join("")}</div>`;
    },
  };
}

export function bannersPage() {
  return {
    title: tr("البانرات والسلايدر", "Banners & sliders"),
    render(el) {
      const paint = () => {
        const list = (kind) =>
          banners
            .filter((b) => b.kind === kind)
            .sort((x, y) => x.order - y.order)
            .map((b, i, arr) => `<li><span style="width:96px;aspect-ratio:16/7;border-radius:var(--radius-tag);background:${b.color};flex:none"></span>
              <div class="adm-list__main"><strong>${esc(tr(b.title))}</strong><span class="adm-list__sub">${esc(tr("الرابط", "Links to"))}: ${esc(tr(b.target))}</span></div>${onOff(b.active)}
              <button class="adm-btn adm-btn--bare" data-up="${b.id}" ${i === 0 ? "disabled" : ""} aria-label="${esc(tr("تحريك لأعلى", "Move up"))}">${icon("chevron")}</button>
              <button class="adm-btn adm-btn--bare" data-down="${b.id}" ${i === arr.length - 1 ? "disabled" : ""} aria-label="${esc(tr("تحريك لأسفل", "Move down"))}"><span style="display:inline-flex;transform:rotate(180deg)">${icon("chevron")}</span></button></li>`)
            .join("");
        el.innerHTML = `${pageHead({ title: tr("البانرات والسلايدر", "Banners & sliders"), actions: can("marketing.create") ? btn(tr("إضافة بانر", "Add banner"), { kind: "primary", ic: "plus" }) : "" })}
          <div class="adm-grid adm-grid--2">${card(tr("السلايدر الرئيسي", "Home slider"), `<ul class="adm-list">${list("slider")}</ul>`)}${card(tr("البانرات", "Banners"), `<ul class="adm-list">${list("banner")}</ul>`)}</div>`;
        const swap = (id, d) => {
          const b = byId(banners, id);
          const sib = banners.filter((x) => x.kind === b.kind).sort((x, y) => x.order - y.order);
          const j = sib.indexOf(b) + d;
          [b.order, sib[j].order] = [sib[j].order, b.order];
          paint();
          toast(tr("تم تحديث الترتيب", "Order updated"));
        };
        el.querySelectorAll("[data-up]").forEach((b) => b.addEventListener("click", () => swap(b.dataset.up, -1)));
        el.querySelectorAll("[data-down]").forEach((b) => b.addEventListener("click", () => swap(b.dataset.down, 1)));
      };
      paint();
    },
  };
}
