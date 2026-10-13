import { tr, fmtNum, fmtMoney } from "../i18n.js";
import { esc, pageHead, kpi, card, btn, badge, tabs, dl, alert, field, drawer, toast, confirmDialog, validate, unconfirmed, empty } from "../components/ui.js";
import { icon } from "../components/icons.js";
import { dataTable } from "../components/data-table.js";
import { wizard } from "../components/wizard.js";
import { areaChart, wireCharts, donut } from "../components/chart.js";
import { orders, refunds, coupons, priceLists, offers, categories, courses, packages, affiliates, byId, ORDER_STATUS, REFUND_STATUS, GATEWAY_LABEL, PRODUCT_TYPE, COUPON_REASON, OFFER_TYPE, COLORS } from "../data/db.js";
import { customerCell, customerOf, orderItemsLabel, orderStatus, gateway, money, date, onOff, rangeSelect } from "./common.js";
import { salesSummary } from "./dashboard.js";
import { can } from "../permissions.js";
import { navigate } from "../router.js";
import { load, save } from "../store.js";

/* ---------------- Overview ---------------- */
export function salesOverviewPage() {
  return {
    title: tr("نظرة عامة على المبيعات", "Sales overview"),
    render(el) {
      const days = load("salesRange", 30);
      const s = salesSummary(days);
      const paid = orders.filter((o) => o.status === "paid");
      const byGw = Object.keys(GATEWAY_LABEL).map((g, i) => ({ g, value: paid.filter((o) => o.gateway === g).reduce((a, o) => a + o.total, 0), color: COLORS[i % COLORS.length] })).filter((x) => x.value);
      const abandoned = orders.filter((o) => o.status === "pending");
      el.innerHTML = `${pageHead({ title: tr("نظرة عامة على المبيعات", "Sales overview"), actions: rangeSelect(days) + btn(tr("تقرير المبيعات", "Sales report"), { href: "/analytics/sales", ic: "chart" }) })}
        <div class="adm-grid adm-grid--3">
          ${kpi({ label: tr("الإيرادات", "Revenue"), value: esc(fmtMoney(s.revenue)), delta: s.dRevenue, field: "var(--coral)" })}
          ${kpi({ label: tr("الطلبات المدفوعة", "Paid orders"), value: fmtNum(s.orders), delta: s.dOrders })}
          ${kpi({ label: tr("سلات غير مكتملة", "Abandoned checkouts"), value: fmtNum(abandoned.length), meta: `<a href="#/sales/orders?view=abandoned">${esc(tr("عرضها", "View them"))}</a>` })}
        </div>
        <div class="adm-grid adm-grid--main-side adm-section-gap">
          ${card(tr("الإيرادات اليومية", "Daily revenue"), areaChart(s.cur, { label: tr("الإيرادات اليومية", "Daily revenue") }))}
          ${card(
            tr("حسب وسيلة الدفع", "By payment method"),
            `<div class="adm-row" style="justify-content:center">${donut(byGw.map((x) => ({ value: x.value, color: x.color })))}</div>
            <ul class="adm-list">${byGw.map((x) => `<li><span class="adm-tag" style="background:${x.color}">&nbsp;</span><span class="adm-list__main">${gateway(x.g)}</span>${money(x.value)}</li>`).join("")}</ul>`,
          )}
        </div>
        <div class="adm-section-gap">${card(tr("آخر الاستردادات", "Recent refunds"), refundRows(refunds.slice(0, 5)), { flush: true, actions: btn(tr("كل الاستردادات", "All refunds"), { href: "/sales/refunds", sm: true }) })}</div>`;
      wireCharts(el, [s.cur]);
      el.querySelector("[data-range]").addEventListener("change", (e) => {
        save("salesRange", Number(e.target.value));
        salesOverviewPage().render(el);
      });
    },
  };
}

function refundRows(list) {
  return `<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>${esc(tr("الطلب", "Order"))}</th><th>${esc(tr("السبب", "Reason"))}</th><th>${esc(tr("طلبه", "Requested by"))}</th><th class="is-num">${esc(tr("المبلغ", "Amount"))}</th><th>${esc(tr("الحالة", "Status"))}</th></tr></thead>
  <tbody>${list.map((r) => `<tr><td><a class="adm-cell-main" href="#/sales/orders/${r.orderId}">⁦#ORD-${r.orderId}⁩</a><span class="adm-cell-sub">${date(r.requestedAt)}</span></td><td>${esc(tr(r.reason))}</td><td>${esc(tr(r.requestedBy))}</td><td class="is-num">${money(r.amount)}</td><td>${badge(REFUND_STATUS[r.status])}</td></tr>`).join("")}</tbody></table></div>`;
}

/* ---------------- Orders ---------------- */
export function ordersPage() {
  return {
    title: tr("الطلبات", "Orders"),
    render(el) {
      const view = new URLSearchParams(location.hash.split("?")[1] ?? "").get("view");
      el.innerHTML = `${pageHead({ title: tr("الطلبات", "Orders"), sub: esc(tr("ابحث برقم الطلب أو اسم العميل أو بريده. افتح الطلب لإدارة المدفوعات والاسترداد.", "Search by order number, customer name or email. Open an order to manage payments and refunds.")) })}<div data-table></div>`;
      dataTable(el.querySelector("[data-table]"), {
        id: "orders",
        label: tr("الطلبات", "Orders"),
        rows: orders,
        rowHref: (o) => `/sales/orders/${o.id}`,
        search: (o) => `${o.number} ${o.id} ${tr(customerOf(o.customerId).name)} ${customerOf(o.customerId).email}`,
        searchPlaceholder: tr("رقم الطلب، اسم العميل، البريد…", "Order no., customer, email…"),
        columns: [
          { key: "id", label: tr("الطلب", "Order"), sort: (o) => o.id, render: (o) => `<a class="adm-cell-main" href="#/sales/orders/${o.id}">⁦#${o.number}⁩</a><span class="adm-cell-sub">${date(o.createdAt, true)}</span>` },
          { key: "customer", label: tr("العميل", "Customer"), render: (o) => customerCell(o.customerId) },
          { key: "items", label: tr("المنتجات", "Products"), render: orderItemsLabel },
          { key: "gateway", label: tr("الدفع", "Payment"), render: (o) => gateway(o.gateway) },
          { key: "total", label: tr("الإجمالي", "Total"), num: true, sort: (o) => o.total, render: (o) => money(o.total) },
          { key: "status", label: tr("الحالة", "Status"), render: orderStatus },
        ],
        filters: [
          { key: "status", label: tr("الحالة", "Status"), options: Object.entries(ORDER_STATUS).map(([k, v]) => [k, tr(v.label)]), test: (o, v) => o.status === v },
          { key: "gateway", label: tr("الدفع", "Payment"), options: Object.entries(GATEWAY_LABEL).map(([k, v]) => [k, tr(v)]), test: (o, v) => o.gateway === v },
          { key: "type", label: tr("نوع المنتج", "Product type"), options: Object.entries(PRODUCT_TYPE).map(([k, v]) => [k, tr(v)]), test: (o, v) => o.items.some((i) => String(i.productType) === v) },
        ],
        views: [
          { id: "abandoned", label: tr("غير مكتملة", "Not completed"), filters: { status: "pending" } },
          { id: "tamara", label: tr("تمارا", "Tamara"), filters: { gateway: "tamara" } },
          { id: "packages", label: tr("الحزم", "Packages"), filters: { type: "6" } },
        ],
        initialFilters: view === "abandoned" ? { status: "pending" } : undefined,
        bulk: [
          { label: tr("إرسال تذكير بالدفع", "Send payment reminder"), onClick: (ids) => toast(tr(`تمت جدولة ${ids.length} تذكير`, `${ids.length} reminders scheduled`), "send") },
          { label: tr("تصدير المحدد", "Export selected"), onClick: (ids) => toast(tr(`جارٍ تصدير ${ids.length} طلب`, `Exporting ${ids.length} orders`), "download") },
        ],
      });
    },
  };
}

export function orderDetailPage({ id, tab = "overview" }) {
  const o = byId(orders, id);
  if (!o) return null;
  const c = customerOf(o.customerId);
  const base = `/sales/orders/${o.id}`;
  const refundable = (o.status === "paid" || o.status === "partially_refunded") && o.total > 0;
  const orderRefunds = refunds.filter((r) => r.orderId === o.id);
  return {
    title: `⁦#${o.number}⁩`,
    crumbs: [[`⁦#${o.number}⁩`]],
    render(el) {
      const actions = [
        btn(tr("إرسال الفاتورة", "Resend invoice"), { ic: "send", attrs: "data-invoice" }),
        can("orders.update") ? btn(tr("تغيير الحالة", "Change status"), { ic: "edit", attrs: "data-status" }) : "",
        refundable && can("refunds.create") ? btn(tr("إصدار استرداد", "Issue refund"), { href: `${base}/refund`, kind: "primary", ic: "refund" }) : "",
        refundable && !can("refunds.create") && can("refunds.request") ? btn(tr("طلب استرداد", "Request refund"), { href: `${base}/refund`, kind: "primary", ic: "refund" }) : "",
      ].join("");
      let body = "";
      if (tab === "overview") {
        body = `<div class="adm-grid adm-grid--main-side">
          <div class="adm-stack">
            ${card(tr("ملخص الطلب", "Order summary"), dl([
              [tr("التاريخ", "Date"), date(o.createdAt, true)],
              [tr("الحالة", "Status"), orderStatus(o) + ` <span class="adm-muted" style="font-size:12px">(legacy status ${o.legacyStatus})</span>`],
              [tr("وسيلة الدفع", "Payment method"), gateway(o.gateway)],
              [tr("المجموع الفرعي", "Subtotal"), money(o.subtotal)],
              [tr("الخصم", "Discount"), o.discount ? `− ${money(o.discount)} ${o.couponId ? `<a href="#/sales/coupons/${o.couponId}" class="adm-tag adm-tag--plain">${esc(byId(coupons, o.couponId).code)}</a>` : ""}` : "—"],
              [tr("الإجمالي", "Total"), `<strong>${money(o.total)}</strong>`],
              [tr("رسوم البوابة", "Gateway fee"), money(o.fee)],
              [tr("الصافي", "Net"), money(o.total - o.fee)],
              [tr("مسوق بالعمولة", "Affiliate"), o.affiliateId ? `<a href="#/marketing/affiliates/${o.affiliateId}">${esc(tr(byId(affiliates, o.affiliateId).name))}</a>` : "—"],
            ]))}
            ${card(tr("المنتجات", "Items"), itemsTable(o), { flush: true })}
          </div>
          <div class="adm-stack">
            ${card(tr("العميل", "Customer"), `${customerCell(c.id)}<div class="adm-section-gap">${dl([[tr("الجوال", "Phone"), `<span class="adm-ltr">${esc(c.phone)}</span>`], [tr("الطلبات", "Orders"), fmtNum(c.orders)], [tr("إجمالي الإنفاق", "Lifetime spend"), money(c.spent)]])}</div>`, { actions: btn(tr("ملف العميل", "Customer 360"), { href: `/customers/${c.id}`, sm: true }) })}
            ${orderRefunds.length ? card(tr("الاستردادات", "Refunds"), `<ul class="adm-list">${orderRefunds.map((r) => `<li><div class="adm-list__main"><span class="adm-list__title">${money(r.amount)}</span><span class="adm-list__sub">${esc(tr(r.reason))}</span></div>${badge(REFUND_STATUS[r.status])}</li>`).join("")}</ul>`) : ""}
            ${o.status === "pending" ? alert("warning", tr("لم يكتمل الدفع", "Payment not completed"), esc(tr("العميل لم يكمل الدفع. يمكنك إرسال رابط دفع جديد.", "The customer didn't finish checkout. You can send a new payment link."))) : ""}
          </div>
        </div>`;
      } else if (tab === "items") {
        body = card(tr("المنتجات والوصول", "Items and access"), itemsTable(o, true), { flush: true });
      } else if (tab === "payments") {
        body = card(
          tr("المعاملات", "Transactions"),
          `<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>${esc(tr("المعرّف", "ID"))}</th><th>${esc(tr("النوع", "Type"))}</th><th>${esc(tr("البوابة", "Gateway"))}</th><th>${esc(tr("التاريخ", "Date"))}</th><th class="is-num">${esc(tr("المبلغ", "Amount"))}</th><th>${esc(tr("الحالة", "Status"))}</th></tr></thead><tbody>
          <tr><td class="adm-ltr">pi_${o.id}A7x</td><td>${esc(tr("دفع", "Charge"))}</td><td>${gateway(o.gateway)}</td><td>${date(o.createdAt, true)}</td><td class="is-num">${money(o.total)}</td><td>${o.status === "pending" ? badge({ label: { ar: "لم يكتمل", en: "Incomplete" }, tone: "warning" }) : o.status === "failed" ? badge({ label: { ar: "مرفوض", en: "Declined" }, tone: "danger" }) : badge({ label: { ar: "ناجح", en: "Succeeded" }, tone: "success" })}</td></tr>
          ${orderRefunds.map((r) => `<tr><td class="adm-ltr">re_${r.id}Kq2</td><td>${esc(tr("استرداد", "Refund"))}</td><td>${gateway(r.gateway)}</td><td>${date(r.requestedAt, true)}</td><td class="is-num">− ${money(r.amount)}</td><td>${badge(REFUND_STATUS[r.status])}</td></tr>`).join("")}
          </tbody></table></div>`,
          { flush: true },
        );
      } else {
        body = card(tr("سجل النشاط", "Activity"), `<ol class="adm-timeline">
          ${orderRefunds.map((r) => `<li><strong>${esc(tr("طلب استرداد", "Refund requested"))}</strong> ${money(r.amount)}<div class="adm-muted">${esc(tr(r.requestedBy))} · ${date(r.requestedAt, true)}</div></li>`).join("")}
          ${o.status !== "pending" && o.status !== "failed" ? `<li><strong>${esc(tr("تم منح الوصول للمحتوى", "Access granted"))}</strong><div class="adm-muted">${esc(tr("النظام", "System"))} · ${date(o.createdAt, true)}</div></li><li><strong>${esc(tr("تم الدفع", "Payment captured"))}</strong><div class="adm-muted">${gateway(o.gateway)} · ${date(o.createdAt, true)}</div></li>` : ""}
          <li><strong>${esc(tr("تم إنشاء الطلب", "Order created"))}</strong><div class="adm-muted">${esc(tr(c.name))} · ${date(o.createdAt, true)}</div></li>
        </ol>`);
      }
      el.innerHTML = `${pageHead({ title: `⁦#${o.number}⁩`, status: orderStatus(o), sub: `${esc(tr(c.name))} · ${date(o.createdAt, true)}`, actions, back: { href: "/sales/orders", label: tr("الطلبات", "Orders") } })}
        ${tabs(base, [["overview", tr("نظرة عامة", "Overview")], ["items", tr("المنتجات", "Items")], ["payments", tr("المدفوعات", "Payments")], ["activity", tr("النشاط", "Activity")]], tab)}
        ${body}`;
      el.querySelector("[data-invoice]")?.addEventListener("click", () => toast(tr(`تم إرسال الفاتورة إلى ${c.email}`, `Invoice sent to ${c.email}`), "send"));
      el.querySelector("[data-status]")?.addEventListener("click", () =>
        drawer({
          title: tr("تغيير حالة الطلب", "Change order status"),
          body: `<div class="adm-form">${alert("info", tr("إجراء سريع", "Quick action"), esc(tr("للاسترداد استخدم «إصدار استرداد» حتى تُعالج البوابة المبلغ.", "For money back use Issue refund so the gateway processes it.")))}
            ${field({ id: "st", label: tr("الحالة الجديدة", "New status"), value: o.status, options: Object.entries(ORDER_STATUS).filter(([k]) => !k.includes("refund")).map(([k, v]) => [k, tr(v.label)]) })}
            ${field({ id: "note", label: tr("ملاحظة داخلية", "Internal note"), type: "textarea", hint: tr("تظهر في سجل النشاط وسجل التدقيق.", "Shown in the activity and audit logs.") })}</div>`,
          foot: `${btn(tr("إلغاء", "Cancel"), { attrs: "data-close" })}${btn(tr("حفظ الحالة", "Save status"), { kind: "primary", attrs: "data-save" })}`,
          onMount(p, close) {
            p.querySelector("[data-save]").addEventListener("click", () => {
              o.status = p.querySelector("#st").value;
              close();
              toast(tr("تم تحديث الحالة", "Status updated"));
              orderDetailPage({ id, tab }).render(el);
            });
          },
        }),
      );
    },
  };
}

function itemsTable(o, access = false) {
  return `<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>${esc(tr("المنتج", "Product"))}</th><th>${esc(tr("النوع", "Type"))}</th>${access ? `<th>${esc(tr("الوصول", "Access"))}</th>` : ""}<th class="is-num">${esc(tr("السعر", "Price"))}</th></tr></thead><tbody>
    ${o.items
      .map((i) => {
        const href = i.productType === 1 ? `/learning/courses/${i.productId}` : i.productType === 6 ? `/learning/packages/${i.productId}` : "/learning/consultations";
        const acc = o.status === "paid" || o.status === "partially_refunded" ? badge({ label: { ar: "مفعل حتى 12/2027", en: "Active until 12/2027" }, tone: "success" }) : o.status === "refunded" ? badge({ label: { ar: "أُلغي", en: "Revoked" }, tone: "neutral" }) : "—";
        return `<tr><td><a class="adm-cell-main" href="#${href}">${esc(tr(i.title))}</a></td><td>${esc(tr(PRODUCT_TYPE[i.productType]))}</td>${access ? `<td>${acc}</td>` : ""}<td class="is-num">${money(i.price)}</td></tr>`;
      })
      .join("")}
  </tbody></table></div>`;
}

/* Refund wizard: Amount → Review → Result. Submitting is a request; the gateway completes it later. */
export function refundPage({ id }) {
  const o = byId(orders, id);
  if (!o) return null;
  if (!can("refunds.create") && !can("refunds.request")) return { forbidden: true };
  const approve = can("refunds.create");
  const c = customerOf(o.customerId);
  return {
    title: tr("إصدار استرداد", "Issue refund"),
    crumbs: [[`⁦#${o.number}⁩`, `/sales/orders/${o.id}`], [tr("استرداد", "Refund")]],
    render(el) {
      el.innerHTML = `${pageHead({ title: tr(`استرداد للطلب ⁦#${o.number}⁩`, `Refund for ⁦#${o.number}⁩`), sub: `${esc(tr(c.name))} · ${tr("المدفوع", "Paid")} ${money(o.total)} · ${gateway(o.gateway)}`, back: { href: `/sales/orders/${o.id}`, label: `⁦#${o.number}⁩` } })}<div data-w style="max-width:860px"></div>`;
      wizard(el.querySelector("[data-w]"), {
        id: `refund-${o.id}`,
        data: { kind: "full", amount: String(o.total), reason: "customer", revoke: true },
        cancelHref: `/sales/orders/${o.id}`,
        submitLabel: approve ? tr("تأكيد الاسترداد", "Confirm refund") : tr("إرسال للموافقة", "Send for approval"),
        steps: [
          {
            key: "amount",
            label: tr("المبلغ", "Amount"),
            render: (d) => `
              <fieldset class="adm-form" style="border:0;padding:0;margin:0"><legend class="adm-label">${esc(tr("نوع الاسترداد", "Refund type"))}</legend>
                <label class="adm-check"><input type="radio" name="kind" value="full" ${d.kind === "full" ? "checked" : ""}> ${esc(tr("كامل", "Full"))} (${esc(fmtMoney(o.total))})</label>
                <label class="adm-check"><input type="radio" name="kind" value="partial" ${d.kind === "partial" ? "checked" : ""}> ${esc(tr("جزئي", "Partial"))}</label>
              </fieldset>
              ${field({ id: "amount", label: tr("المبلغ المسترد (ر.س)", "Refund amount (SAR)"), type: "number", value: d.amount, required: true, hint: tr(`الحد الأقصى ${fmtMoney(o.total)}`, `Maximum ${fmtMoney(o.total)}`), attrs: `min="1" max="${o.total}" inputmode="decimal"` })}
              ${field({ id: "reason", label: tr("السبب", "Reason"), value: d.reason, options: [["customer", tr("طلب العميل", "Customer request")], ["duplicate", tr("دفع مكرر", "Duplicate payment")], ["technical", tr("مشكلة تقنية", "Technical issue")], ["other", tr("أخرى", "Other")]] })}
              ${field({ id: "note", label: tr("ملاحظة داخلية", "Internal note"), type: "textarea", value: d.note ?? "" })}
              <label class="adm-check"><input type="checkbox" name="revoke" ${d.revoke ? "checked" : ""}> ${esc(tr("إلغاء وصول العميل إلى المحتوى المرتبط", "Revoke the customer's access to related content"))}</label>`,
            mount(form) {
              const amt = form.querySelector("#amount");
              form.querySelectorAll('[name="kind"]').forEach((r) => r.addEventListener("change", () => r.value === "full" && r.checked && (amt.value = o.total)));
            },
            validate: (form) =>
              validate(form, {
                amount: (v) => (!v || Number(v) <= 0 ? tr("أدخل مبلغًا أكبر من صفر", "Enter an amount above zero") : Number(v) > o.total ? tr("لا يمكن أن يتجاوز المبلغ المدفوع", "Can't exceed the amount paid") : null),
              }),
          },
          {
            key: "review",
            label: tr("المراجعة", "Review"),
            render: (d) => `
              ${dl([
                [tr("الطلب", "Order"), `⁦#${o.number}⁩`],
                [tr("العميل", "Customer"), esc(tr(c.name))],
                [tr("المبلغ", "Amount"), `<strong>${money(Number(d.amount))}</strong>`],
                [tr("إلى", "To"), gateway(o.gateway)],
                [tr("الوصول", "Access"), d.revoke ? esc(tr("سيُلغى", "Will be revoked")) : esc(tr("يبقى كما هو", "Unchanged"))],
              ])}
              ${o.gateway === "tamara" ? alert("warning", tr("تمارا", "Tamara"), esc(tr("الاسترداد عبر تمارا قد يستغرق حتى 14 يوم عمل، ويُعدَّل جدول أقساط العميل.", "Tamara refunds can take up to 14 business days and adjust the customer's instalment plan."))) : ""}
              ${o.gateway === "bank" ? alert("warning", tr("تحويل بنكي", "Bank transfer"), esc(tr("يحتاج فريق المالية لتنفيذ التحويل يدويًا بعد الموافقة.", "Finance must send the transfer manually after approval."))) : ""}
              ${approve ? "" : alert("info", tr("يحتاج موافقة", "Needs approval"), esc(tr("سيُرسل الطلب لفريق المبيعات للموافقة.", "This goes to the sales team for approval.")))}`,
          },
          {
            key: "result",
            label: tr("النتيجة", "Result"),
            final: true,
            render: (d) => `
              ${alert("success", approve ? tr("تم إرسال طلب الاسترداد إلى البوابة", "Refund request sent to the gateway") : tr("أُرسل طلب الاسترداد للموافقة", "Refund sent for approval"), esc(tr("إرسال الطلب لا يعني اكتمال الاسترداد. سنحدّث الحالة عند تأكيد البوابة.", "Sending the request is not the same as the money arriving. We'll update the status when the gateway confirms.")), "check")}
              <ol class="adm-timeline adm-section-gap">
                <li><strong>${esc(tr("تم الطلب", "Requested"))}</strong> · ${money(Number(d.amount))}</li>
                <li><strong>${esc(approve ? tr("أُرسل إلى البوابة", "Sent to gateway") : tr("بانتظار الموافقة", "Awaiting approval"))}</strong></li>
                <li class="adm-muted">${esc(tr("تأكيد البوابة — قيد الانتظار", "Gateway confirmation — pending"))}</li>
              </ol>
              <div class="adm-row adm-section-gap">${btn(tr("العودة للطلب", "Back to order"), { href: `/sales/orders/${o.id}`, kind: "ink" })}${btn(tr("كل الاستردادات", "All refunds"), { href: "/sales/refunds" })}</div>`,
          },
        ],
        onSubmit(d) {
          refunds.unshift({ id: 200 + refunds.length, orderId: o.id, amount: Number(d.amount), reason: { ar: "طلب العميل", en: "Customer request" }, status: approve ? "processing" : "requested", gateway: o.gateway, requestedAt: new Date().toISOString(), requestedBy: { ar: "أنت", en: "You" } });
        },
      });
    },
  };
}

/* ---------------- Payments / refunds / invoices ---------------- */
export function paymentsPage() {
  return {
    title: tr("المدفوعات", "Payments"),
    render(el) {
      const rows = orders.filter((o) => o.total > 0 && o.status !== "pending").map((o) => ({ ...o, id: o.id }));
      el.innerHTML = `${pageHead({ title: tr("المدفوعات", "Payments"), sub: esc(tr("كل عمليات الدفع عبر البوابات. الرسوم والصافي لكل معاملة.", "Every gateway charge, with fees and net per transaction.")) })}<div data-t></div>`;
      dataTable(el.querySelector("[data-t]"), {
        id: "payments",
        label: tr("المدفوعات", "Payments"),
        rows,
        rowHref: (o) => `/sales/orders/${o.id}/payments`,
        search: (o) => `${o.number} pi_${o.id}`,
        columns: [
          { key: "tx", label: tr("المعاملة", "Transaction"), render: (o) => `<span class="adm-ltr adm-cell-main">pi_${o.id}A7x</span><span class="adm-cell-sub">${date(o.createdAt, true)}</span>` },
          { key: "order", label: tr("الطلب", "Order"), render: (o) => `<a href="#/sales/orders/${o.id}">⁦#${o.number}⁩</a>` },
          { key: "gw", label: tr("البوابة", "Gateway"), render: (o) => gateway(o.gateway) },
          { key: "amount", label: tr("المبلغ", "Amount"), num: true, sort: (o) => o.total, render: (o) => money(o.total) },
          { key: "fee", label: tr("الرسوم", "Fee"), num: true, render: (o) => money(o.fee) },
          { key: "net", label: tr("الصافي", "Net"), num: true, sort: (o) => o.total - o.fee, render: (o) => money(o.total - o.fee) },
          { key: "st", label: tr("الحالة", "Status"), render: (o) => (o.status === "failed" ? badge({ label: { ar: "مرفوض", en: "Declined" }, tone: "danger" }) : badge({ label: { ar: "ناجح", en: "Succeeded" }, tone: "success" })) },
        ],
        filters: [{ key: "gw", label: tr("البوابة", "Gateway"), options: Object.entries(GATEWAY_LABEL).filter(([k]) => k !== "free").map(([k, v]) => [k, tr(v)]), test: (o, v) => o.gateway === v }],
      });
    },
  };
}

export function refundsPage() {
  return {
    title: tr("الاستردادات", "Refunds"),
    render(el) {
      el.innerHTML = `${pageHead({ title: tr("الاستردادات", "Refunds"), sub: esc(tr("يبدأ الاسترداد من صفحة الطلب. هنا تتابع الموافقات وحالة البوابة.", "Refunds start from the order page. Track approvals and gateway status here.")) })}<div data-t></div>`;
      const render = () =>
        dataTable(el.querySelector("[data-t]"), {
          id: "refunds",
          label: tr("الاستردادات", "Refunds"),
          rows: refunds,
          rowHref: (r) => `/sales/orders/${r.orderId}`,
          search: (r) => `ORD-${r.orderId}`,
          columns: [
            { key: "order", label: tr("الطلب", "Order"), render: (r) => `<a class="adm-cell-main" href="#/sales/orders/${r.orderId}">⁦#ORD-${r.orderId}⁩</a><span class="adm-cell-sub">${date(r.requestedAt)}</span>` },
            { key: "reason", label: tr("السبب", "Reason"), render: (r) => esc(tr(r.reason)) },
            { key: "by", label: tr("طلبه", "Requested by"), render: (r) => esc(tr(r.requestedBy)) },
            { key: "gw", label: tr("البوابة", "Gateway"), render: (r) => gateway(r.gateway) },
            { key: "amount", label: tr("المبلغ", "Amount"), num: true, sort: (r) => r.amount, render: (r) => money(r.amount) },
            { key: "st", label: tr("الحالة", "Status"), render: (r) => badge(REFUND_STATUS[r.status]) },
            { key: "act", label: "", render: (r) => (r.status === "requested" && can("refunds.create") ? btn(tr("موافقة", "Approve"), { sm: true, attrs: `data-approve="${r.id}"` }) : "") },
          ],
          filters: [{ key: "st", label: tr("الحالة", "Status"), options: Object.entries(REFUND_STATUS).map(([k, v]) => [k, tr(v.label)]), test: (r, v) => r.status === v }],
          views: [{ id: "awaiting", label: tr("بانتظار الموافقة", "Awaiting approval"), filters: { st: "requested" } }],
        });
      render();
      el.addEventListener("click", (e) => {
        const b = e.target.closest("[data-approve]");
        if (!b) return;
        const r = byId(refunds, b.dataset.approve);
        confirmDialog({
          title: tr("الموافقة على الاسترداد", "Approve refund"),
          body: esc(tr(`سيُرسل ${fmtMoney(r.amount)} إلى البوابة. لا يمكن التراجع بعد التنفيذ.`, `${fmtMoney(r.amount)} will be sent to the gateway. This can't be undone once processed.`)),
          confirm: tr("الموافقة والإرسال", "Approve and send"),
          onConfirm() {
            r.status = "processing";
            render();
            toast(tr("أُرسل الاسترداد للبوابة", "Refund sent to the gateway"));
          },
        });
      });
    },
  };
}

export function invoicesPage() {
  return {
    title: tr("الفواتير", "Invoices"),
    render(el) {
      const rows = orders.filter((o) => o.status !== "pending" && o.status !== "failed");
      el.innerHTML = `${pageHead({ title: tr("الفواتير", "Invoices"), sub: esc(tr("فواتير ضريبية مبسطة لكل طلب مدفوع.", "Simplified tax invoices for every paid order.")) })}<div data-t></div>`;
      dataTable(el.querySelector("[data-t]"), {
        id: "invoices",
        label: tr("الفواتير", "Invoices"),
        rows,
        search: (o) => `INV-${o.id} ${o.number}`,
        columns: [
          { key: "inv", label: tr("الفاتورة", "Invoice"), render: (o) => `<span class="adm-cell-main adm-ltr">INV-2026-${o.id}</span>` },
          { key: "order", label: tr("الطلب", "Order"), render: (o) => `<a href="#/sales/orders/${o.id}">⁦#${o.number}⁩</a>` },
          { key: "cust", label: tr("العميل", "Customer"), render: (o) => customerCell(o.customerId) },
          { key: "date", label: tr("التاريخ", "Date"), sort: (o) => o.createdAt, render: (o) => date(o.createdAt) },
          { key: "vat", label: tr("الضريبة 15%", "VAT 15%"), num: true, render: (o) => money(Math.round(o.total * 0.15 * 100 / 115) ) },
          { key: "total", label: tr("الإجمالي", "Total"), num: true, sort: (o) => o.total, render: (o) => money(o.total) },
          { key: "dl", label: "", render: () => btn("PDF", { sm: true, ic: "download" }) },
        ],
      });
    },
  };
}

/* ---------------- Coupons ---------------- */
const couponReason = (r) => `${esc(tr(COUPON_REASON[r].label))}${COUPON_REASON[r].confirmed ? "" : unconfirmed()}`;
const couponState = (c) => {
  const now = new Date("2026-10-13");
  if (!c.active) return badge({ label: { ar: "متوقف", en: "Disabled" }, tone: "neutral" });
  if (new Date(c.endsAt) < now) return badge({ label: { ar: "منتهي", en: "Expired" }, tone: "danger" });
  if (c.usageLimit && c.used >= c.usageLimit) return badge({ label: { ar: "استُنفد", en: "Used up" }, tone: "warning" });
  return badge({ label: { ar: "فعّال", en: "Live" }, tone: "success" });
};
const SCOPE = { all: { ar: "كل المنتجات", en: "All products" }, category: { ar: "تصنيف", en: "Category" }, course: { ar: "دورات محددة", en: "Specific courses" }, package: { ar: "حزم", en: "Packages" } };

export function couponsPage() {
  return {
    title: tr("الكوبونات", "Coupons"),
    render(el) {
      el.innerHTML = `${pageHead({ title: tr("الكوبونات", "Coupons"), sub: esc(tr("كل الكوبونات مع الاستخدام الفعلي. (اللوحة القديمة كانت تعرض أول 3,000 فقط.)", "All coupons with real usage. (The legacy panel capped this list at 3,000.)")), actions: can("coupons.create") ? btn(tr("إنشاء كوبون", "Create coupon"), { href: "/sales/coupons/new", kind: "primary", ic: "plus" }) : "" })}<div data-t></div>`;
      dataTable(el.querySelector("[data-t]"), {
        id: "coupons",
        label: tr("الكوبونات", "Coupons"),
        rows: coupons,
        rowHref: (c) => `/sales/coupons/${c.id}`,
        search: (c) => c.code,
        searchPlaceholder: tr("رمز الكوبون…", "Coupon code…"),
        columns: [
          { key: "code", label: tr("الرمز", "Code"), sort: (c) => c.code, render: (c) => `<a class="adm-cell-main adm-ltr" href="#/sales/coupons/${c.id}">${esc(c.code)}</a>` },
          { key: "pct", label: tr("الخصم", "Discount"), num: true, sort: (c) => c.percent, render: (c) => `${fmtNum(c.percent)}%` },
          { key: "reason", label: tr("السبب", "Reason"), render: (c) => couponReason(c.reason) },
          { key: "scope", label: tr("النطاق", "Scope"), render: (c) => esc(tr(SCOPE[c.scope])) },
          { key: "valid", label: tr("الصلاحية", "Valid"), sort: (c) => c.endsAt, render: (c) => `${date(c.startsAt)} – ${date(c.endsAt)}` },
          { key: "used", label: tr("الاستخدام", "Usage"), num: true, sort: (c) => c.used, render: (c) => `${fmtNum(c.used)}${c.usageLimit ? ` / ${fmtNum(c.usageLimit)}` : ""}` },
          { key: "st", label: tr("الحالة", "Status"), render: couponState },
        ],
        filters: [
          { key: "reason", label: tr("السبب", "Reason"), options: Object.entries(COUPON_REASON).map(([k, v]) => [k, tr(v.label)]), test: (c, v) => String(c.reason) === v },
          { key: "scope", label: tr("النطاق", "Scope"), options: Object.entries(SCOPE).map(([k, v]) => [k, tr(v)]), test: (c, v) => c.scope === v },
          { key: "active", label: tr("التفعيل", "Enabled"), options: [["1", tr("مفعل", "Enabled")], ["0", tr("متوقف", "Disabled")]], test: (c, v) => String(Number(c.active)) === v },
        ],
        views: [{ id: "affiliate", label: tr("كوبونات المسوقين", "Affiliate coupons"), filters: { reason: "1" } }],
        bulk: [{ label: tr("إيقاف", "Disable"), onClick: (ids) => (ids.forEach((id) => (byId(coupons, id).active = false)), toast(tr("تم الإيقاف", "Disabled"))) }],
      });
    },
  };
}

export function couponDetailPage({ id, tab = "overview" }) {
  const c = byId(coupons, id);
  if (!c) return null;
  const base = `/sales/coupons/${c.id}`;
  const used = orders.filter((o) => o.couponId === c.id);
  return {
    title: c.code,
    crumbs: [[c.code]],
    render(el) {
      let body;
      if (tab === "overview") {
        body = `<div class="adm-grid adm-grid--3">${kpi({ label: tr("مرات الاستخدام", "Times used"), value: fmtNum(c.used), field: "var(--yellow)" })}${kpi({ label: tr("إجمالي الخصم", "Total discount"), value: esc(fmtMoney(used.reduce((s, o) => s + o.discount, 0) + c.used * 37)) })}${kpi({ label: tr("إيرادات الطلبات", "Order revenue"), value: esc(fmtMoney(used.reduce((s, o) => s + o.total, 0) + c.used * 210)) })}</div>
        <div class="adm-section-gap">${card(tr("الشروط", "Conditions"), dl([
          [tr("الخصم", "Discount"), `${fmtNum(c.percent)}%`],
          [tr("السبب", "Reason"), couponReason(c.reason)],
          [tr("يبدأ", "Starts"), date(c.startsAt)],
          [tr("ينتهي", "Ends"), date(c.endsAt)],
          [tr("الحد الأدنى للطلب", "Minimum order"), c.minTotal ? money(c.minTotal) : "—"],
          [tr("أقصى خصم", "Maximum discount"), c.maxDiscount ? money(c.maxDiscount) : "—"],
          [tr("حد الاستخدام", "Usage limit"), c.usageLimit ? fmtNum(c.usageLimit) : tr("غير محدود", "Unlimited")],
          [tr("مسوق مرتبط", "Linked affiliate"), c.affiliateId ? `<a href="#/marketing/affiliates/${c.affiliateId}">${esc(tr(byId(affiliates, c.affiliateId).name))}</a>` : "—"],
        ]))}</div>`;
      } else if (tab === "scope") {
        const list = c.scope === "category" ? categories.slice(0, 2).map((x) => tr(x.name)) : c.scope === "course" ? courses.slice(c.id % 10, (c.id % 10) + 4).map((x) => tr(x.title)) : c.scope === "package" ? packages.slice(0, 2).map((x) => tr(x.title)) : [];
        body = card(tr("ينطبق على", "Applies to"), list.length ? `<ul class="adm-list">${list.map((x) => `<li>${icon("tag")}<span class="adm-list__main">${esc(x)}</span></li>`).join("")}</ul>` : `<p>${esc(tr("كل المنتجات", "All products"))}</p>`, { actions: can("coupons.update") ? btn(tr("تعديل النطاق", "Edit scope"), { sm: true }) : "" });
      } else {
        body = card(tr("الطلبات التي استخدمته", "Orders that used it"), used.length ? `<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>${esc(tr("الطلب", "Order"))}</th><th>${esc(tr("العميل", "Customer"))}</th><th class="is-num">${esc(tr("الخصم", "Discount"))}</th><th class="is-num">${esc(tr("الإجمالي", "Total"))}</th></tr></thead><tbody>${used.map((o) => `<tr><td><a href="#/sales/orders/${o.id}">⁦#${o.number}⁩</a></td><td>${customerCell(o.customerId)}</td><td class="is-num">${money(o.discount)}</td><td class="is-num">${money(o.total)}</td></tr>`).join("")}</tbody></table></div>` : empty(tr("لا توجد طلبات في هذه العينة", "No orders in this sample")), { flush: true });
      }
      el.innerHTML = `${pageHead({ title: c.code, status: couponState(c), sub: esc(tr(`خصم ${c.percent}%`, `${c.percent}% off`)), back: { href: "/sales/coupons", label: tr("الكوبونات", "Coupons") }, actions: can("coupons.update") ? btn(c.active ? tr("إيقاف", "Disable") : tr("تفعيل", "Enable"), { attrs: "data-toggle" }) + btn(tr("نسخ", "Duplicate"), { ic: "copy" }) : "" })}
        ${tabs(base, [["overview", tr("نظرة عامة", "Overview")], ["scope", tr("النطاق", "Scope")], ["usage", tr("الاستخدام", "Usage")]], tab)}${body}`;
      el.querySelector("[data-toggle]")?.addEventListener("click", () => {
        c.active = !c.active;
        couponDetailPage({ id, tab }).render(el);
        toast(c.active ? tr("تم التفعيل", "Enabled") : tr("تم الإيقاف", "Disabled"));
      });
    },
  };
}

export function couponNewPage() {
  if (!can("coupons.create")) return { forbidden: true };
  return {
    title: tr("إنشاء كوبون", "Create coupon"),
    crumbs: [[tr("كوبون جديد", "New coupon")]],
    render(el) {
      el.innerHTML = `${pageHead({ title: tr("إنشاء كوبون", "Create coupon"), back: { href: "/sales/coupons", label: tr("الكوبونات", "Coupons") } })}<div data-w style="max-width:860px"></div>`;
      wizard(el.querySelector("[data-w]"), {
        id: "coupon-new",
        data: { percent: "20", reason: "3", scope: "all" },
        cancelHref: "/sales/coupons",
        submitLabel: tr("إنشاء الكوبون", "Create coupon"),
        steps: [
          {
            key: "basics",
            label: tr("الأساسيات", "Basics"),
            render: (d) => `<div class="adm-form-grid">
              ${field({ id: "code", label: tr("الرمز", "Code"), value: d.code ?? "", required: true, hint: tr("أحرف إنجليزية وأرقام، بدون مسافات.", "Latin letters and digits, no spaces."), attrs: 'dir="ltr" autocomplete="off"' })}
              ${field({ id: "percent", label: tr("نسبة الخصم %", "Discount %"), type: "number", value: d.percent, required: true, attrs: 'min="1" max="100"' })}
              ${field({ id: "reason", label: tr("السبب", "Reason"), value: d.reason, options: Object.entries(COUPON_REASON).filter(([, v]) => v.confirmed).map(([k, v]) => [k, tr(v.label)]) })}
            </div>`,
            validate: (f) =>
              validate(f, {
                code: (v) => (!/^[A-Za-z0-9_-]{3,20}$/.test(v) ? tr("3–20 حرفًا إنجليزيًا أو رقمًا", "3–20 Latin letters or digits") : coupons.some((c) => c.code.toLowerCase() === v.toLowerCase()) ? tr("هذا الرمز مستخدم", "That code already exists") : null),
                percent: (v) => (Number(v) < 1 || Number(v) > 100 ? tr("بين 1 و 100", "Between 1 and 100") : null),
              }),
          },
          {
            key: "conditions",
            label: tr("الشروط", "Conditions"),
            render: (d) => `<div class="adm-form-grid">
              ${field({ id: "startsAt", label: tr("يبدأ", "Starts"), type: "date", value: d.startsAt ?? "2026-10-13", required: true })}
              ${field({ id: "endsAt", label: tr("ينتهي", "Ends"), type: "date", value: d.endsAt ?? "", required: true })}
              ${field({ id: "minTotal", label: tr("الحد الأدنى للطلب", "Minimum order"), type: "number", value: d.minTotal ?? "" })}
              ${field({ id: "maxDiscount", label: tr("أقصى خصم", "Maximum discount"), type: "number", value: d.maxDiscount ?? "" })}
              ${field({ id: "usageLimit", label: tr("حد الاستخدام", "Usage limit"), type: "number", value: d.usageLimit ?? "", hint: tr("اتركه فارغًا لعدم التقييد", "Leave empty for unlimited") })}
            </div>`,
            validate: (f) => validate(f, { endsAt: (v) => (!v ? tr("حدد تاريخ الانتهاء", "Pick an end date") : v < f.querySelector("#startsAt").value ? tr("يجب أن يكون بعد تاريخ البدء", "Must be after the start date") : null) }),
          },
          {
            key: "scope",
            label: tr("النطاق", "Scope"),
            render: (d) => `${field({ id: "scope", label: tr("ينطبق على", "Applies to"), value: d.scope, options: Object.entries(SCOPE).map(([k, v]) => [k, tr(v)]) })}
              <fieldset style="border:0;padding:0;margin:0" data-courses ${d.scope === "course" ? "" : "hidden"}><legend class="adm-label">${esc(tr("اختر الدورات", "Choose courses"))}</legend>
              ${courses.slice(0, 8).map((c) => `<label class="adm-check"><input type="checkbox" data-multi="1" name="courseIds" value="${c.id}" ${(d.courseIds ?? []).includes(String(c.id)) ? "checked" : ""}> ${esc(tr(c.title))}</label>`).join("")}</fieldset>`,
            mount(f) {
              f.querySelector("#scope").addEventListener("change", (e) => (f.querySelector("[data-courses]").hidden = e.target.value !== "course"));
            },
          },
          {
            key: "review",
            label: tr("المراجعة", "Review"),
            render: (d) => dl([
              [tr("الرمز", "Code"), `<strong class="adm-ltr">${esc(d.code)}</strong>`],
              [tr("الخصم", "Discount"), `${esc(d.percent)}%`],
              [tr("الصلاحية", "Valid"), `${esc(d.startsAt)} → ${esc(d.endsAt)}`],
              [tr("النطاق", "Scope"), esc(tr(SCOPE[d.scope]))],
              [tr("حد الاستخدام", "Usage limit"), esc(d.usageLimit || tr("غير محدود", "Unlimited"))],
            ]),
          },
        ],
        onSubmit(d) {
          const c = { id: 6000 + coupons.length, code: d.code.toUpperCase(), percent: Number(d.percent), reason: Number(d.reason), active: true, startsAt: d.startsAt, endsAt: d.endsAt, minTotal: Number(d.minTotal) || 0, maxDiscount: Number(d.maxDiscount) || null, usageLimit: Number(d.usageLimit) || null, used: 0, scope: d.scope, affiliateId: null };
          coupons.unshift(c);
          toast(tr("تم إنشاء الكوبون", "Coupon created"));
          setTimeout(() => navigate(`/sales/coupons/${c.id}`));
        },
      });
    },
  };
}

/* ---------------- Price lists and offers ---------------- */
export function priceListsPage() {
  return {
    title: tr("قوائم الأسعار", "Price lists"),
    render(el) {
      el.innerHTML = `${pageHead({ title: tr("قوائم الأسعار", "Price lists"), sub: esc(tr("حملات تسعير مؤقتة تُطبق على مجموعة دورات.", "Time-boxed pricing campaigns applied to a set of courses.")), actions: can("pricing.create") ? btn(tr("قائمة أسعار جديدة", "New price list"), { kind: "primary", ic: "plus", attrs: "data-new" }) : "" })}<div data-t></div>`;
      dataTable(el.querySelector("[data-t]"), {
        id: "pricelists",
        label: tr("قوائم الأسعار", "Price lists"),
        rows: priceLists,
        views: false,
        columns: [
          { key: "n", label: tr("الاسم", "Name"), render: (p) => `<span class="adm-cell-main">${esc(tr(p.name))}</span>` },
          { key: "c", label: tr("الدورات", "Courses"), num: true, render: (p) => fmtNum(p.courses) },
          { key: "d", label: tr("الخصم", "Discount"), num: true, render: (p) => `${p.discount}%` },
          { key: "w", label: tr("الفترة", "Window"), render: (p) => `${date(p.startsAt)} – ${date(p.endsAt)}` },
          { key: "s", label: tr("الحالة", "Status"), render: (p) => onOff(p.active) },
          { key: "a", label: "", render: () => btn(tr("معاينة الأسعار", "Preview prices"), { sm: true, ic: "eye" }) },
        ],
      });
      el.querySelector("[data-new]")?.addEventListener("click", () =>
        drawer({
          title: tr("قائمة أسعار جديدة", "New price list"),
          body: `<div class="adm-form">${field({ id: "pl", label: tr("الاسم", "Name"), required: true })}${field({ id: "pd", label: tr("الخصم %", "Discount %"), type: "number", value: "20" })}<div class="adm-form-grid">${field({ id: "ps", label: tr("يبدأ", "Starts"), type: "date" })}${field({ id: "pe", label: tr("ينتهي", "Ends"), type: "date" })}</div></div>`,
          foot: `${btn(tr("إلغاء", "Cancel"), { attrs: "data-close" })}${btn(tr("حفظ كمسودة", "Save as draft"), { kind: "primary", attrs: "data-close" })}`,
        }),
      );
    },
  };
}

export function offersPage() {
  return {
    title: tr("العروض", "Offers"),
    render(el) {
      el.innerHTML = `${pageHead({ title: tr("العروض", "Offers"), sub: esc(tr("قواعد خصم تلقائية في السلة، بدون رمز.", "Automatic cart rules, no code needed.")), actions: can("pricing.create") ? btn(tr("عرض جديد", "New offer"), { kind: "primary", ic: "plus" }) : "" })}
        <div class="adm-grid adm-grid--2">${offers
          .map((o, i) => `<section class="adm-card"><div class="adm-card__head"><span class="adm-tag" style="background:${COLORS[i]}">${esc(tr(OFFER_TYPE[o.type]))}</span><span class="adm-spacer"></span>${onOff(o.active)}</div>
            <h2 style="font-size:20px">${esc(tr(o.name))}</h2><p class="adm-muted">${fmtNum(o.uses)} ${esc(tr("استخدام", "uses"))}</p></section>`)
          .join("")}</div>`;
    },
  };
}
