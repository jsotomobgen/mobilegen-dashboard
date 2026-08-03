// ── Scoring constants & helpers ───────────────────────────────────────────────
export const TARGETS = {
  pga:   1.00,
  vhi:   1.00,
  perks: 0.70,   // was 0.69
  pull:  0.14,   // was 0.23
  vmp:   0.54,   // was 0.55
  prem:  0.68,   // was 0.67
};
export const METRICS = [
  { key:"pga",   label:"Phone Gross Adds", abbr:"PGA",   weight:40, max:60   },
  { key:"vhi",   label:"VHI Gross Adds",   abbr:"VHI",   weight:20, max:30   },
  { key:"perks", label:"Perks / Line",      abbr:"PERKS", weight:15, max:22.5 },
  { key:"pull",  label:"Pull Through",      abbr:"PULL",  weight:10, max:15   },
  { key:"vmp",   label:"Premium VMP",       abbr:"VMP",   weight:10, max:15   },
  { key:"prem",  label:"Premium Mix",       abbr:"PREM",  weight:5,  max:7.5  },
];
export const MAX_PTS = 150;
// score(vals) → { pga, vhi, ..., total, pga_pct, vhi_pct, ... }
export function score(vals) {
  const s = {}; let tot = 0;
  for (const m of METRICS) {
    const v = vals[m.key];
    if (v == null || isNaN(v) || v < 0) { s[m.key]=null; s[m.key+"_pct"]=null; continue; }
    const ratio = v / TARGETS[m.key];
    const pts = parseFloat(Math.min(ratio * m.weight, m.max).toFixed(2));
    s[m.key] = pts;
    s[m.key+"_pct"] = parseFloat((ratio * 100).toFixed(1));
    tot += pts;
  }
  s.total = parseFloat(tot.toFixed(2));
  return s;
}
export function scoreAndSort(items) {
  return items
    .map(item => ({ ...item, scores: score(item.vals) }))
    .sort((a, b) => b.scores.total - a.scores.total);
}
export function calcDeltas(curr, prev) {
  if (!prev) return null;
  const d = {};
  for (const m of METRICS) {
    const c = curr[m.key], p = prev[m.key];
    d[m.key] = (c != null && p != null) ? parseFloat((c - p).toFixed(2)) : null;
  }
  d.total = parseFloat((curr.total - prev.total).toFixed(2));
  return d;
}
