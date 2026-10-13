import { esc } from "./ui.js";
import { fmtCompact, fmtDate, fmtMoney, fmtNum } from "../i18n.js";

/** Area/line chart as inline SVG with hover + keyboard-free tooltip and a data table fallback. */
export function areaChart(series, { height = 240, compare, label = "" } = {}) {
  const W = 720;
  const H = height;
  const pad = { t: 12, r: 12, b: 28, l: 44 };
  const values = series.map((d) => d.amount);
  const raw = Math.max(...values, ...(compare ?? []).map((d) => d.amount), 1);
  // Round the axis to a readable step (1, 2, 2.5 or 5 × 10^n).
  const mag = 10 ** Math.floor(Math.log10(raw / 4));
  const stepV = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s * 4 >= raw);
  const max = stepV * 4;
  const x = (i) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(series.length - 1, 1);
  const y = (v) => H - pad.b - (v / max) * (H - pad.t - pad.b);
  const path = (arr) => arr.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.amount).toFixed(1)}`).join("");
  const line = path(series);
  const area = `${line}L${x(series.length - 1)},${H - pad.b}L${x(0)},${H - pad.b}Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const step = Math.ceil(series.length / 6);
  // Time axes stay left-to-right in both languages, like the numbers on them.

  return `<div class="adm-chart-box" data-chart style="direction:ltr">
    <svg class="adm-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" style="direction:ltr">
      ${ticks.map((t) => `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${pad.l - 6}" y="${y(t) + 4}" text-anchor="end">${fmtCompact(t)}</text>`).join("")}
      ${series.map((d, i) => (i % step === 0 ? `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${fmtDate(d.date).replace(/,? \d{4}$/, "").replace(/ \d{4}$/, "")}</text>` : "")).join("")}
      ${compare ? `<path class="line2" d="${path(compare)}"/>` : ""}
      <path class="area" d="${area}"/>
      <path class="line" d="${line}"/>
      ${series.map((d, i) => `<rect class="hit" x="${x(i) - (W / series.length) / 2}" y="${pad.t}" width="${W / series.length}" height="${H - pad.t - pad.b}" data-i="${i}"/>`).join("")}
      <circle class="dot" r="4" cx="0" cy="0" opacity="0" data-dot/>
    </svg>
    <div class="adm-chart-tip" dir="auto" hidden></div>
  </div>`;
}

export function wireCharts(root, seriesById) {
  root.querySelectorAll("[data-chart]").forEach((box, idx) => {
    const series = seriesById[idx];
    if (!series) return;
    const svg = box.querySelector("svg");
    const tip = box.querySelector(".adm-chart-tip");
    const dot = box.querySelector("[data-dot]");
    svg.addEventListener("mousemove", (e) => {
      const r = e.target.closest("[data-i]");
      if (!r) return;
      const d = series[Number(r.dataset.i)];
      const bx = svg.getBoundingClientRect();
      const cx = Number(r.getAttribute("x")) + Number(r.getAttribute("width")) / 2;
      const vb = svg.viewBox.baseVal;
      dot.setAttribute("cx", cx);
      dot.setAttribute("opacity", "1");
      const line = svg.querySelector(".line").getAttribute("d").split(/[ML]/).filter(Boolean)[Number(r.dataset.i)];
      dot.setAttribute("cy", line.split(",")[1]);
      tip.hidden = false;
      const px = (cx / vb.width) * bx.width;
      tip.style.left = `${px}px`;
      tip.style.top = `${(Number(line.split(",")[1]) / vb.height) * bx.height}px`;
      tip.innerHTML = `${esc(fmtDate(d.date))}<br><strong>${esc(fmtMoney(d.amount))}</strong>${d.orders != null ? ` · ${fmtNum(d.orders)}` : ""}`;
    });
    svg.addEventListener("mouseleave", () => {
      tip.hidden = true;
      dot.setAttribute("opacity", "0");
    });
  });
}

/** Small donut for shares (e.g. payment gateways). */
export function donut(parts, size = 140) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const r = 52;
  const c = 2 * Math.PI * r;
  let off = 0;
  return `<svg viewBox="0 0 140 140" width="${size}" height="${size}" role="img" aria-hidden="true">
    ${parts
      .map((p) => {
        const len = (p.value / total) * c;
        const s = `<circle cx="70" cy="70" r="${r}" fill="none" stroke="${p.color}" stroke-width="22" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"/>`;
        off += len;
        return s;
      })
      .join("")}
  </svg>`;
}
