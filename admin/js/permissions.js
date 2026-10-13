import { load, save } from "./store.js";

// Demo roles. Scopes mirror the planned b2c admin_role_scopes strings.
// Hiding navigation is NOT authorization: the backend must enforce every scope.
export const ROLES = [
  { id: "super", name: { ar: "مدير عام", en: "Super admin" }, scopes: ["*"] },
  {
    id: "sales",
    name: { ar: "فريق المبيعات", en: "Sales team" },
    scopes: ["dashboard.read", "orders.*", "payments.read", "refunds.*", "invoices.read", "coupons.*", "pricing.*", "customers.read", "reports.sales", "reports.coupons", "affiliates.read"],
  },
  {
    id: "content",
    name: { ar: "فريق المحتوى", en: "Content team" },
    scopes: ["dashboard.read", "courses.*", "packages.*", "categories.*", "consultations.*", "instructors.*", "certificates.*", "qa.*", "reports.products", "reports.ratings", "reports.certificates"],
  },
  {
    id: "support",
    name: { ar: "خدمة العملاء", en: "Customer support" },
    scopes: ["dashboard.read", "customers.*", "tickets.*", "orders.read", "refunds.request", "courses.read", "certificates.read", "qa.*"],
  },
];

let roleId = load("role", "super");

export function currentRole() {
  return ROLES.find((r) => r.id === roleId) ?? ROLES[0];
}

export function setRole(id) {
  roleId = id;
  save("role", id);
}

/** can("orders.read") — supports "*" and "area.*" wildcards. */
export function can(permission) {
  if (!permission) return true;
  const [area] = permission.split(".");
  return currentRole().scopes.some((s) => s === "*" || s === permission || s === `${area}.*`);
}
