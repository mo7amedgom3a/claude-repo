import { load, save } from "./store.js";

let lang = load("lang", "ar");

export function getLang() {
  return lang;
}

export function setLang(next) {
  lang = next === "en" ? "en" : "ar";
  save("lang", lang);
  applyLang();
}

export function applyLang() {
  const root = document.documentElement;
  root.lang = lang;
  root.dir = lang === "ar" ? "rtl" : "ltr";
}

/** Pick the current-language string: tr("عربي", "English") or tr({ ar, en }). */
export function tr(ar, en) {
  if (ar && typeof ar === "object") return ar[lang] ?? ar.en ?? ar.ar;
  return lang === "ar" ? ar : en ?? ar;
}

// Gregorian calendar and Latin digits in Arabic, matching how the team reads dates and amounts.
const locale = () => (lang === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-US");

export function fmtNum(n, opts = {}) {
  return new Intl.NumberFormat(locale(), opts).format(n);
}

export function fmtMoney(n) {
  const v = new Intl.NumberFormat(locale(), { maximumFractionDigits: 2, minimumFractionDigits: n % 1 ? 2 : 0 }).format(n);
  return lang === "ar" ? `${v} ر.س` : `SAR ${v}`;
}

export function fmtCompact(n) {
  return new Intl.NumberFormat(locale(), { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function fmtDate(d, withTime = false) {
  const date = d instanceof Date ? d : new Date(d);
  const opts = { year: "numeric", month: "short", day: "numeric" };
  if (withTime) Object.assign(opts, { hour: "2-digit", minute: "2-digit" });
  return new Intl.DateTimeFormat(locale(), opts).format(date);
}

export function fmtDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h ? tr(`${h} س ${m} د`, `${h}h ${m}m`) : tr(`${m} د`, `${m}m`);
}
