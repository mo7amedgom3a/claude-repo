// Route table. Sidebar destinations come from navigation.js; everything else here is a
// contextual route (detail tabs, studio, wizards) that highlights its parent sidebar item.
import { define } from "../router.js";
import { can } from "../permissions.js";
import { dashboardPage, inboxPage } from "../pages/dashboard.js";
import * as sales from "../pages/sales.js";
import * as learning from "../pages/learning.js";
import { studioPage } from "../pages/studio.js";
import * as customers from "../pages/customers.js";
import * as marketing from "../pages/marketing.js";
import { reportPage } from "../pages/analytics.js";
import * as settings from "../pages/settings.js";

/** Presentation-level guard; the API still authorizes every request. */
const guard = (permission, handler) => (params) => (can(permission) ? handler(params) : { forbidden: true });

define("/dashboard", guard("dashboard.read", dashboardPage));
define("/dashboard/inbox", guard("dashboard.read", inboxPage));

define("/sales/overview", guard("orders.read", sales.salesOverviewPage));
define("/sales/orders", guard("orders.read", sales.ordersPage));
define("/sales/orders/:id/refund", guard("orders.read", sales.refundPage));
define("/sales/orders/:id/:tab?", guard("orders.read", sales.orderDetailPage));
define("/sales/payments", guard("payments.read", sales.paymentsPage));
define("/sales/refunds", guard("refunds.read", sales.refundsPage));
define("/sales/invoices", guard("invoices.read", sales.invoicesPage));
define("/sales/coupons", guard("coupons.read", sales.couponsPage));
define("/sales/coupons/new", guard("coupons.create", sales.couponNewPage));
define("/sales/coupons/:id/:tab?", guard("coupons.read", sales.couponDetailPage));
define("/sales/price-lists", guard("pricing.read", sales.priceListsPage));
define("/sales/offers", guard("pricing.read", sales.offersPage));

define("/learning/courses", guard("courses.read", learning.coursesPage));
define("/learning/courses/new", guard("courses.create", learning.courseNewPage));
define("/learning/courses/:id/studio/:section?", guard("courses.read", studioPage));
define("/learning/courses/:id/:tab?", guard("courses.read", learning.courseDetailPage));
define("/learning/packages", guard("packages.read", learning.packagesPage));
define("/learning/packages/:id/:tab?", guard("packages.read", learning.packageDetailPage));
define("/learning/categories", guard("categories.read", learning.categoriesPage));
define("/learning/consultations", guard("consultations.read", learning.consultationsPage));
define("/learning/instructors", guard("instructors.read", learning.instructorsPage));
define("/learning/applications", guard("instructors.read", learning.applicationsPage));
define("/learning/certificates", guard("certificates.read", learning.certificatesPage));
define("/learning/qa", guard("qa.read", learning.qaPage));

define("/customers", guard("customers.read", customers.customersPage));
define("/customers/segments", guard("customers.read", customers.segmentsPage));
define("/customers/tickets", guard("tickets.read", customers.ticketsPage));
define("/customers/tickets/:id", guard("tickets.read", customers.ticketDetailPage));
define("/customers/:id/:tab?", guard("customers.read", customers.customerDetailPage));

define("/marketing/affiliates", guard("affiliates.read", marketing.affiliatesPage));
define("/marketing/affiliates/:id/:tab?", guard("affiliates.read", marketing.affiliateDetailPage));
define("/marketing/commissions", guard("affiliates.read", marketing.commissionsPage));
define("/marketing/payouts", guard("affiliates.read", marketing.payoutsPage));
define("/marketing/announcements", guard("marketing.read", marketing.announcementsPage));
define("/marketing/banners", guard("marketing.read", marketing.bannersPage));

define("/analytics/:report", (p) => (can(`reports.${p.report}`) ? reportPage(p) : { forbidden: true }));

define("/settings/general", guard("settings.read", settings.generalPage));
define("/settings/team", guard("settings.read", settings.teamPage));
define("/settings/team/:roleId", guard("settings.read", settings.rolePage));
define("/settings/integrations", guard("settings.read", settings.integrationsPage));
define("/settings/notifications", guard("settings.read", settings.notificationsPage));
define("/settings/audit", guard("settings.read", settings.auditPage));

define("/b2b", settings.b2bPage);
