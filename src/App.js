import { useState } from "react";
import { useSheetData } from "./useSheetData";
import { METRICS, TARGETS, MAX_PTS, score, calcDeltas } from "./scoring";

// ── Previous day data — MTD 5/11/2026 (for delta comparison) ─────────────────
const PREV_COMPANIES_RAW = [
  { type:"Mid-Major",  vals:{pga:1.0157,vhi:1.2725,prem:0.6614,perks:0.5793,vmp:0.5958,pull:0.3057}},
  { type:"Mobile Gen", vals:{pga:1.0910,vhi:1.0890,prem:0.6677,perks:0.6262,vmp:0.4931,pull:0.3483}},
  { type:"Mid-Major",  vals:{pga:1.0700,vhi:1.1954,prem:0.6497,perks:0.4721,vmp:0.5111,pull:0.1737}},
  { type:"Mid-Major",  vals:{pga:0.9411,vhi:1.2854,prem:0.6497,perks:0.6664,vmp:0.4958,pull:0.1898}},
  { type:"Major",      vals:{pga:1.0326,vhi:1.0068,prem:0.6128,perks:0.5345,vmp:0.4966,pull:0.2270}},
  { type:"Major",      vals:{pga:0.9463,vhi:0.9886,prem:0.7424,perks:0.5696,vmp:0.5637,pull:0.1813}},
  { type:"Major",      vals:{pga:0.9659,vhi:1.0038,prem:0.6912,perks:0.4222,vmp:0.5849,pull:0.1881}},
  { type:"Major",      vals:{pga:0.9579,vhi:1.0217,prem:0.6444,perks:0.5647,vmp:0.5217,pull:0.1756}},
  { type:"Major",      vals:{pga:0.9101,vhi:1.0362,prem:0.6538,perks:0.5385,vmp:0.5258,pull:0.1981}},
  { type:"Mid-Major",  vals:{pga:0.9980,vhi:0.8379,prem:0.5692,perks:0.5045,vmp:0.5049,pull:0.1861}},
  { type:"Mid-Major",  vals:{pga:0.7950,vhi:1.1299,prem:0.6046,perks:0.7384,vmp:0.4840,pull:0.1598}},
  { type:"Mid-Major",  vals:{pga:0.8940,vhi:1.0255,prem:0.6054,perks:0.5388,vmp:0.4730,pull:0.1596}},
  { type:"Mid-Major",  vals:{pga:0.6912,vhi:1.0746,prem:0.5709,perks:0.5825,vmp:0.3113,pull:0.1979}},
];
const PREV_REGIONS_RAW = [
  {name:"Chicago Metro",               vals:{pga:1.0885,vhi:1.2745,prem:0.6734,perks:0.7123,vmp:0.5425,pull:0.2288}},
  {name:"Central Midwest & Southeast", vals:{pga:0.9423,vhi:1.0275,prem:0.6384,perks:0.6502,vmp:0.5000,pull:0.3179}},
  {name:"Tri-State",                   vals:{pga:1.3264,vhi:1.0236,prem:0.7071,perks:0.5121,vmp:0.4530,pull:0.5013}},
];
const PREV_DISTRICTS_RAW = [
  {name:"Chicago North",     vals:{pga:1.3743,vhi:1.7325,prem:0.6593,perks:0.7950,vmp:0.6264,pull:0.2485}},
  {name:"Wisconsin Madison", vals:{pga:1.6848,vhi:1.5493,prem:0.7229,perks:0.4673,vmp:0.3725,pull:0.7176}},
  {name:"Wisconsin North",   vals:{pga:1.5832,vhi:1.3029,prem:0.6474,perks:0.5816,vmp:0.5065,pull:0.4032}},
  {name:"South/Indiana",     vals:{pga:1.2077,vhi:0.8235,prem:0.5984,perks:0.7295,vmp:0.4946,pull:0.2687}},
  {name:"Chicago West",      vals:{pga:1.1941,vhi:0.9530,prem:0.7143,perks:0.6034,vmp:0.4607,pull:0.1800}},
  {name:"Illinois Central",  vals:{pga:0.9951,vhi:1.2143,prem:0.6164,perks:0.5135,vmp:0.5714,pull:0.4182}},
  {name:"West Suburbs",      vals:{pga:0.6878,vhi:1.1849,prem:0.7000,perks:0.7644,vmp:0.5714,pull:0.3780}},
  {name:"Atlanta",           vals:{pga:0.8077,vhi:2.1413,prem:0.6375,perks:0.5410,vmp:0.4286,pull:0.2821}},
  {name:"Kentucky",          vals:{pga:1.9112,vhi:0.5020,prem:0.6667,perks:0.3030,vmp:0.5102,pull:0.1897}},
  {name:"Chicago South",     vals:{pga:1.1718,vhi:0.1794,prem:0.6465,perks:0.6782,vmp:0.4216,pull:0.1700}},
  {name:"Northwest Suburbs", vals:{pga:0.5216,vhi:0.9250,prem:0.5833,perks:0.7600,vmp:0.5312,pull:0.3333}},
  {name:"Illinois North",    vals:{pga:0.5738,vhi:0.7264,prem:0.8788,perks:0.5714,vmp:0.4035,pull:0.7647}},
];

// Score previous data and build lookup maps keyed by type/name
const PREV_COMPANIES = PREV_COMPANIES_RAW.map(c=>({...c,scores:score(c.vals)})).sort((a,b)=>b.scores.total-a.scores.total);
const PREV_REGIONS   = Object.fromEntries(PREV_REGIONS_RAW.map(r=>  [r.name, score(r.vals)]));
const PREV_DISTRICTS = Object.fromEntries(PREV_DISTRICTS_RAW.map(d=>[d.name, score(d.vals)]));
const PREV_MG        = PREV_COMPANIES.find(c=>c.type==="Mobile Gen");
const PREV_MG_RANK   = PREV_COMPANIES.findIndex(c=>c.type==="Mobile Gen")+1;




// ── Design tokens ─────────────────────────────────────────────────────────────
const DARK = {
  bg:      "#0D1117",
  surface: "#161B22",
  raised:  "#1C2230",
  border:  "#21262D",
  accent:  "#58A6FF",
  gold:    "#E3B341",
  textHi:  "#F0F6FC",
  textMid: "#8B949E",
  textLow: "#484F58",
  good:    "#16A34A",
  warn:    "#E3B341",
  bad:     "#F85149",
  barBg:   "#21262D",
};
const LIGHT = {
  bg:      "#F6F8FA",
  surface: "#FFFFFF",
  raised:  "#F0F2F5",
  border:  "#D0D7DE",
  accent:  "#0969DA",
  gold:    "#B45309",
  textHi:  "#1F2328",
  textMid: "#656D76",
  textLow: "#9CA3AF",
  good:    "#16A34A",
  warn:    "#B45309",
  bad:     "#CF222E",
  barBg:   "#E5E7EB",
};
// C is set at render time inside Dashboard — see useTheme()
let C = DARK;

function ptsColor(t) {
  if (t >= 100) return C.good;
  if (t >= 90)  return C.warn;
  return C.bad;
}
function metricColor(pct, capped) {
  if (capped)    return C.warn;
  if (pct >= 100) return C.good;
  return C.bad;
}

// ── Primitives ────────────────────────────────────────────────────────────────
function PBar({ value, max, capped, h=4 }) {
  if (value==null) return <div style={{height:h,background:C.barBg,borderRadius:h}}/>;
  return (
    <div style={{height:h,background:C.barBg,borderRadius:h,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${Math.min((value/max)*100,100)}%`,background:capped?C.warn:C.accent,borderRadius:h,transition:"width .35s ease"}}/>
    </div>
  );
}

function TBar({ total, h=5 }) {
  return (
    <div style={{height:h,background:C.barBg,borderRadius:h,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${Math.min((total/MAX_PTS)*100,100)}%`,background:C.accent,borderRadius:h,transition:"width .4s ease"}}/>
    </div>
  );
}

// ── Compact metric strip ──────────────────────────────────────────────────────
function MetricStrip({ scores, vals }) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:"4px 6px",marginTop:7}}>
      {METRICS.map(m => {
        const pts    = scores[m.key];
        const pct    = scores[m.key+"_pct"];
        const raw    = vals?.[m.key];
        const capped = pts!=null && pts>=m.max;
        const col    = metricColor(pct, capped);
        const rawStr = raw==null ? "—" : (raw*100).toFixed(0)+"%";
        return (
          <div key={m.key} style={{display:"flex",flexDirection:"column",gap:2}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:9,fontWeight:700,color:C.textLow,letterSpacing:".04em"}}>{m.abbr}</span>
              <span style={{fontSize:10,fontWeight:800,color:pts==null?C.textLow:capped?C.warn:C.textHi}}>
                {pts==null?"—":pts.toFixed(0)}{capped?"⚡":""}
              </span>
            </div>
            <div style={{fontSize:11,fontWeight:800,color:col,textAlign:"right",lineHeight:1}}>{rawStr}</div>
            <PBar value={pts} max={m.max} capped={capped} h={3}/>
          </div>
        );
      })}
    </div>
  );
}

// ── Row card — compact ────────────────────────────────────────────────────────
function Card({ rank, label, sublabel, scores, vals, isMG, selected, onClick }) {
  const tot  = scores.total;
  const tCol = ptsColor(tot);
  return (
    <div onClick={onClick} style={{
      background: C.surface,
      border:`1px solid ${selected?C.accent:isMG?C.gold:C.border}`,
      borderLeft:`3px solid ${isMG?C.gold:tCol}`,
      borderRadius:7,
      padding:"9px 11px",
      cursor:"pointer",
      transition:"border-color .12s",
      boxShadow:selected?`0 0 0 2px ${C.accent}33`:"none",
    }}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        {/* rank */}
        <span style={{
          fontSize:rank<=3?15:10, fontWeight:900, flexShrink:0,
          color:rank<=3?["#E3B341","#8B949E","#6E7681"][rank-1]:C.textLow,
          width:18, textAlign:"center", lineHeight:1,
        }}>
          {rank<=3?["🥇","🥈","🥉"][rank-1]:rank}
        </span>
        {/* name */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{
            fontSize:12,fontWeight:700,lineHeight:1.2,
            color:isMG?C.gold:selected?C.accent:C.textHi,
            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
          }}>{label}</div>
          {sublabel && <div style={{fontSize:9,color:C.textLow,marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sublabel}</div>}
        </div>
        {/* pts */}
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:18,fontWeight:900,color:tCol,lineHeight:1}}>{tot.toFixed(1)}</div>
          <div style={{fontSize:8,color:C.textLow,fontWeight:600}}>/ 150</div>
        </div>
      </div>
      <TBar total={tot} h={4}/>
      <MetricStrip scores={scores} vals={vals}/>
    </div>
  );
}

// ── Detail drawer ─────────────────────────────────────────────────────────────
function Detail({ item, rank, title, sub1, sub2, compareTo }) {
  const { scores, vals } = item;
  const mgS = MG?.scores;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:1}}>
      {/* summary */}
      <div style={{background:C.raised,border:`1px solid ${C.border}`,borderRadius:8,padding:"13px 14px",marginBottom:8}}>
        <div style={{fontSize:9,fontWeight:700,color:C.textLow,letterSpacing:".14em",marginBottom:5}}>{title}</div>
        <div style={{fontSize:14,fontWeight:800,color:C.textHi,lineHeight:1.25,marginBottom:sub1?3:0}}>{item.name||item.type}</div>
        {sub1 && <div style={{fontSize:10,color:C.textMid,marginBottom:1}}>{sub1}</div>}
        {sub2 && <div style={{fontSize:10,color:C.textMid}}>{sub2}</div>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",margin:"10px 0 7px"}}>
          <div>
            <div style={{fontSize:9,color:C.textLow,fontWeight:600,letterSpacing:".08em"}}>RANK</div>
            <div style={{fontSize:26,fontWeight:900,color:C.textHi,lineHeight:1}}>#{rank}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:9,color:C.textLow,fontWeight:600,letterSpacing:".08em"}}>TOTAL PTS</div>
            <div style={{fontSize:26,fontWeight:900,color:ptsColor(scores.total),lineHeight:1}}>{scores.total.toFixed(1)}</div>
            <div style={{fontSize:9,color:C.textMid}}>{((scores.total/MAX_PTS)*100).toFixed(1)}% of 150</div>
          </div>
        </div>
        <TBar total={scores.total} h={6}/>
      </div>

      <div style={{fontSize:9,fontWeight:700,color:C.textLow,letterSpacing:".12em",padding:"2px 2px 5px"}}>
        METRICS{compareTo?" — vs MG":""}
      </div>

      {METRICS.map(m => {
        const v     = scores[m.key];
        const pct   = scores[m.key+"_pct"];
        const raw   = vals?.[m.key];
        const mgV   = compareTo?mgS?.[m.key]:null;
        const capped = v!=null&&v>=m.max;
        const col    = metricColor(pct, capped);
        const rawStr = raw==null?"—":(raw*100).toFixed(1)+"%";
        const ahead  = mgV!=null&&v!=null&&v>mgV;
        return (
          <div key={m.key} style={{background:C.surface,border:`1px solid ${capped?C.warn+"44":C.border}`,borderRadius:7,padding:"9px 11px",marginBottom:4}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.textHi}}>{m.label}</div>
                <div style={{display:"flex",gap:5,marginTop:3,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{fontSize:10,fontWeight:800,padding:"1px 5px",borderRadius:3,background:col+"22",color:col}}>
                    {pct!=null?`${pct}%`:"—"}
                  </span>
                  <span style={{fontSize:10,fontWeight:700,color:col}}>{rawStr}</span>
                  <span style={{fontSize:9,color:C.textLow}}>tgt {TARGETS[m.key]} · {m.weight}w · cap {m.max}</span>
                  {capped&&<span style={{fontSize:9,fontWeight:800,color:C.warn}}>⚡</span>}
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:16,fontWeight:900,color:capped?C.warn:v!=null?C.textHi:C.textLow,lineHeight:1}}>{v!=null?v.toFixed(1):"—"}</div>
                <div style={{fontSize:9,color:C.textLow}}>/ {m.max}</div>
              </div>
            </div>
            <PBar value={v} max={m.max} capped={capped} h={5}/>
            {compareTo&&mgV!=null&&(
              <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                <span style={{fontSize:8,color:C.textLow,width:18,flexShrink:0}}>MG</span>
                <div style={{flex:1,height:3,background:C.barBg,borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${Math.min((mgV/m.max)*100,100)}%`,background:C.gold+"88",borderRadius:2}}/>
                </div>
                <span style={{fontSize:8,color:ahead?C.good:C.bad,fontWeight:700,flexShrink:0}}>{mgV.toFixed(1)} {ahead?"▲":"▼"}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


// ── Scoreboard view ───────────────────────────────────────────────────────────
function Scoreboard() {
  const sections = [
    {
      title: "🏢 Companies",
      items: COMPANIES,
      getLabel: (c) => c.type + (c.type === "Mobile Gen" ? " ★" : ""),
      getSub:   (c) => "MTD #" + c.mtdRank,
      isMG:     (c) => c.type === "Mobile Gen",
    },
    {
      title: "🗺️ Regions",
      items: REGIONS,
      getLabel: (r) => r.name,
      getSub:   (r) => r.area + " · " + r.doors + " doors",
      isMG:     ()  => false,
    },
    {
      title: "📍 Districts",
      items: DISTRICTS,
      getLabel: (d) => d.name,
      getSub:   (d) => d.doors + " doors",
      isMG:     ()  => false,
    },
    {
      title: "🏪 Stores",
      items: STORES,
      getLabel: (s) => s.name,
      getSub:   (s) => s.district,
      isMG:     ()  => false,
    },
  ];

  return (
    <div style={{ padding: "10px 14px 60px" }}>
      {sections.map((sec) => (
        <div key={sec.title} style={{ marginBottom: 20 }}>

          {/* Section header */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.textHi, letterSpacing: ".03em" }}>
              {sec.title}
            </div>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          {/* Column headers */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "26px minmax(80px,1fr) repeat(6,44px) 52px",
            gap: "0 3px", padding: "3px 6px", marginBottom: 2,
          }}>
            <span />
            <span style={{ fontSize: 8, fontWeight: 700, color: C.textLow, letterSpacing: ".06em" }}>NAME</span>
            {METRICS.map((m) => (
              <span key={m.key} style={{ fontSize: 8, fontWeight: 700, color: C.textLow, textAlign: "center" }}>
                {m.abbr}
              </span>
            ))}
            <span style={{ fontSize: 8, fontWeight: 700, color: C.textLow, textAlign: "right" }}>PTS</span>
          </div>

          {/* Data rows */}
          {sec.items.map((item, i) => {
            const { scores, vals } = item;
            const mg     = sec.isMG(item);
            const medal  = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
            return (
              <div key={i} style={{
                display: "grid",
                gridTemplateColumns: "26px minmax(80px,1fr) repeat(6,44px) 52px",
                gap: "0 3px", padding: "5px 6px", borderRadius: 5, marginBottom: 2,
                alignItems: "center",
                background: mg ? C.gold + "11" : i % 2 === 0 ? C.surface : "transparent",
                border: mg ? "1px solid " + C.gold + "33" : "1px solid transparent",
              }}>

                {/* Rank */}
                <span style={{
                  fontSize: medal ? 14 : 10, fontWeight: 900,
                  color: C.textLow, textAlign: "center", lineHeight: 1,
                }}>
                  {medal !== null ? medal : i + 1}
                </span>

                {/* Name + subtitle */}
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 11, fontWeight: mg ? 800 : 600,
                    color: mg ? C.gold : C.textHi,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {sec.getLabel(item)}
                  </div>
                  <div style={{
                    fontSize: 8, color: C.textLow,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {sec.getSub(item)}
                  </div>
                </div>

                {/* Per-metric cells */}
                {METRICS.map((m) => {
                  const pct    = scores[m.key + "_pct"];
                  const pts    = scores[m.key];
                  const capped = pts != null && pts >= m.max;
                  const over   = pct != null && pct >= 100;
                  const col    = pct == null ? C.textLow : capped ? C.warn : over ? C.good : C.bad;
                  const rawStr = vals && vals[m.key] != null
                    ? (vals[m.key] * 100).toFixed(0) + "%"
                    : "—";
                  return (
                    <div key={m.key} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: col, lineHeight: 1 }}>
                        {rawStr}
                      </div>
                      <div style={{ fontSize: 8, color: C.textLow, marginTop: 1 }}>
                        {pts != null ? pts.toFixed(0) : "—"}{capped ? "⚡" : ""}
                      </div>
                    </div>
                  );
                })}

                {/* Total points */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: ptsColor(scores.total), lineHeight: 1 }}>
                    {scores.total.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 8, color: C.textLow }}>/ 150</div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}


// ── Delta Panel ───────────────────────────────────────────────────────────────
function DeltaPanel({ title, items, prevMap, getPrevKey, isMGonly }) {
  const rows = items
    .map((item, i) => {
      if (isMGonly && item.type !== "Mobile Gen") return null;
      // For company tab, match by type; for others, match by name key
      let prev = null;
      if (isMGonly) {
        const prevItem = PREV_COMPANIES.find(p => p.type === item.type);
        prev = prevItem ? prevItem.scores : null;
      } else {
        const key = getPrevKey(item);
        prev = prevMap ? prevMap[key] : null;
      }
      if (!prev) return null;
      const deltas = calcDeltas(item.scores, prev);
      if (!deltas) return null;
      return { item, rank: i+1, deltas };
    })
    .filter(Boolean);

  if (rows.length === 0) return null;

  const arrow = (d) => d == null ? "" : d > 0.05 ? "▲" : d < -0.05 ? "▼" : "–";
  const dCol  = (d) => d == null ? C.textLow : d > 0.05 ? C.good : d < -0.05 ? C.bad : C.textMid;

  return (
    <div style={{margin:"10px 14px 6px",border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
      {/* header */}
      <div style={{background:C.raised,padding:"7px 12px",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:10,fontWeight:800,color:C.textMid,letterSpacing:".1em"}}>
          DAY-OVER-DAY CHANGES — {title}
        </span>
        <span style={{fontSize:9,color:C.textLow}}>5/11 → 5/13</span>
      </div>

      {/* column headers */}
      <div style={{
        display:"grid",
        gridTemplateColumns:"20px 1fr repeat(6,52px) 64px",
        gap:"0 2px", padding:"4px 10px",
        background:C.surface, borderBottom:`1px solid ${C.border}`,
      }}>
        <span/>
        <span style={{fontSize:8,fontWeight:700,color:C.textLow,letterSpacing:".06em"}}>NAME</span>
        {METRICS.map(m=>(
          <span key={m.key} style={{fontSize:8,fontWeight:700,color:C.textLow,textAlign:"center"}}>{m.abbr}</span>
        ))}
        <span style={{fontSize:8,fontWeight:700,color:C.textLow,textAlign:"right"}}>TOTAL</span>
      </div>

      {/* delta rows */}
      {rows.map(({item, rank, deltas}, i) => {
        const isMG = item.type === "Mobile Gen";
        const totalD = deltas.total;
        return (
          <div key={i} style={{
            display:"grid",
            gridTemplateColumns:"20px 1fr repeat(6,52px) 64px",
            gap:"0 2px", padding:"6px 10px", alignItems:"center",
            background: isMG ? C.gold+"11" : i%2===0 ? C.surface : "transparent",
            borderBottom:`1px solid ${C.border}`,
          }}>
            {/* rank */}
            <span style={{fontSize:9,color:C.textLow,textAlign:"center"}}>{rank}</span>
            {/* name */}
            <div style={{minWidth:0}}>
              <div style={{fontSize:11,fontWeight:isMG?800:600,color:isMG?C.gold:C.textHi,
                whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                {item.name || item.type}{isMG?" ★":""}
              </div>
            </div>
            {/* per-metric deltas */}
            {METRICS.map(m => {
              const d = deltas[m.key];
              return (
                <div key={m.key} style={{textAlign:"center"}}>
                  <div style={{fontSize:11,fontWeight:800,color:dCol(d),lineHeight:1}}>
                    {arrow(d)}
                  </div>
                  <div style={{fontSize:9,fontWeight:700,color:dCol(d)}}>
                    {d==null?"—":( (d>0?"+":"")+d.toFixed(1) )}
                  </div>
                </div>
              );
            })}
            {/* total delta */}
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:13,fontWeight:900,color:dCol(totalD),lineHeight:1}}>
                {totalD==null?"—":((totalD>0?"+":"")+totalD.toFixed(1))}
              </div>
              <div style={{fontSize:9,color:C.textLow}}>pts</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ── Main ──────────────────────────────────────────────────────────────────────
// ── Loading / Error screens ──────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      height:"100vh",background:DARK.bg,gap:16}}>
      <div style={{width:40,height:40,border:`3px solid ${DARK.border}`,borderTop:`3px solid ${DARK.accent}`,
        borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
      <div style={{fontSize:13,color:DARK.textMid,fontWeight:600}}>Loading dashboard data…</div>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}
function ErrorScreen({ message, onRetry }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      height:"100vh",background:DARK.bg,gap:12,padding:32}}>
      <div style={{fontSize:32}}>⚠️</div>
      <div style={{fontSize:14,color:"#EF4444",fontWeight:700}}>Could not load data</div>
      <div style={{fontSize:12,color:DARK.textMid,textAlign:"center",maxWidth:400}}>{message}</div>
      <div style={{fontSize:11,color:DARK.textLow,textAlign:"center",maxWidth:400}}>
        Make sure your Google Sheet is published and REACT_APP_SHEET_ID is set in Vercel.
      </div>
      <button onClick={onRetry} style={{marginTop:8,padding:"8px 20px",background:DARK.accent,
        border:"none",borderRadius:6,color:"#FFF",fontWeight:700,cursor:"pointer",fontSize:12}}>
        Retry
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { data, loading, error, lastUpdated, refresh } = useSheetData();

  const [view,    setView]    = useState("company");
  const [selCo,   setSelCo]   = useState(0);
  const [selReg,  setSelReg]  = useState(0);
  const [selDist, setSelDist] = useState(0);
  const [selSt,   setSelSt]   = useState(0);
  const [distF,   setDistF]   = useState("All");
  const [drawer,  setDrawer]  = useState(false);
  const [copied,  setCopied]  = useState(false);
  const [light,   setLight]   = useState(false);

  // Apply theme globally before any render
  C = light ? LIGHT : DARK;

  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorScreen message={error} onRetry={refresh} />;
  if (!data)   return null;

  // Score + sort live data from Google Sheet
  const COMPANIES = data.companies.map(c=>({...c,scores:score(c.vals)})).sort((a,b)=>b.scores.total-a.scores.total);
  const REGIONS   = data.regions.map(r=>({...r,scores:score(r.vals)})).sort((a,b)=>b.scores.total-a.scores.total);
  const DISTRICTS = data.districts.map(d=>({...d,scores:score(d.vals)})).sort((a,b)=>b.scores.total-a.scores.total);
  const STORES    = data.stores.map(s=>({...s,scores:score(s.vals)})).sort((a,b)=>b.scores.total-a.scores.total);
  const MG        = COMPANIES.find(c=>c.type==="Mobile Gen");
  const MG_RANK   = COMPANIES.findIndex(c=>c.type==="Mobile Gen")+1;

  const filtered = distF==="All"?STORES:STORES.filter(s=>s.district===distF);
  const mgPct    = MG?(MG.scores.total/MAX_PTS)*100:0;

  // when a card is clicked, open drawer on mobile
  function pick(setter, val) { setter(val); setDrawer(true); }

  const views = [
    {id:"scoreboard",label:"📊 Board", n:null},
    {id:"company",  label:"Co.",      n:COMPANIES.length},
    {id:"region",   label:"Region",   n:REGIONS.length},
    {id:"district", label:"District", n:DISTRICTS.length},
    {id:"store",    label:"Store",    n:STORES.length},
  ];

  const tabStyle = (on) => ({
    flex:1, border:"none", borderBottom:`2px solid ${on?C.accent:"transparent"}`,
    background:"none", cursor:"pointer", padding:"9px 4px",
    fontSize:11, fontWeight:700, color:on?C.accent:C.textMid,
    transition:"color .12s, border-color .12s",
  });

  const chipStyle = (on) => ({
    border:`1px solid ${on?C.accent:C.border}`,cursor:"pointer",borderRadius:4,
    fontWeight:700,fontSize:9,padding:"3px 7px",
    background:on?C.accent+"22":"transparent",color:on?C.accent:C.textMid,
    whiteSpace:"nowrap",
  });

  const detailItem = view==="company"?COMPANIES[selCo]:view==="region"?REGIONS[selReg]:view==="district"?DISTRICTS[selDist]:view==="store"?STORES[selSt]:null;
  const detailRank = view==="company"?selCo+1:view==="region"?selReg+1:view==="district"?selDist+1:selSt+1;

  return (
    <div style={{fontFamily:"'DM Sans','Helvetica Neue',sans-serif",background:C.bg,minHeight:"100vh",color:C.textHi,maxWidth:900,margin:"0 auto",transition:"background .2s, color .2s"}}>

      {/* ── Header ── */}
      <div style={{borderBottom:`1px solid ${C.border}`,padding:"14px 14px 10px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
          <div>
            {lastUpdated && <div style={{fontSize:9,fontWeight:700,color:C.textMid,letterSpacing:".16em",marginBottom:3}}>MTD · Updated {lastUpdated.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} <button onClick={refresh} style={{fontSize:9,color:C.accent,background:'none',border:'none',cursor:'pointer',fontWeight:700}}>↻</button></div>}
            <div style={{fontSize:18,fontWeight:900,color:C.textHi,letterSpacing:"-.02em",lineHeight:1}}>Points Leaderboard</div>
            <div style={{fontSize:10,color:C.textLow,marginTop:3}}>{COMPANIES.length} cos · {DISTRICTS.length} dists · {STORES.length} stores</div>
          </div>
          {MG && (
            <div style={{border:`1px solid ${C.gold}44`,borderRadius:7,padding:"8px 12px",textAlign:"center",flexShrink:0}}>
              <div style={{fontSize:8,fontWeight:700,color:C.gold,letterSpacing:".12em"}}>MOBILE GEN</div>
              <div style={{fontSize:8,color:C.textLow,marginBottom:2}}>Rank #{MG_RANK} / 14</div>
              <div style={{fontSize:22,fontWeight:900,color:C.gold,lineHeight:1}}>{MG.scores.total.toFixed(1)}</div>
              <div style={{fontSize:8,color:C.textLow,marginTop:1}}>of 150 pts</div>
              <div style={{marginTop:5,height:3,background:C.barBg,borderRadius:2,overflow:"hidden",width:80}}>
                <div style={{height:"100%",width:`${mgPct}%`,background:C.gold,borderRadius:2}}/>
              </div>
            </div>
          )}

          {/* Light / Dark toggle */}
          <button
            onClick={()=>setLight(l=>!l)}
            title={light?"Switch to dark mode":"Switch to light mode"}
            style={{
              flexShrink:0, alignSelf:"flex-start",
              background: light ? "#E5E7EB" : "#21262D",
              border: `1px solid ${C.border}`,
              borderRadius:20, cursor:"pointer",
              padding:"5px 10px", display:"flex", alignItems:"center", gap:6,
              transition:"background .2s, border-color .2s",
            }}>
            <span style={{fontSize:14,lineHeight:1}}>{light?"🌙":"☀️"}</span>
            <span style={{fontSize:10,fontWeight:700,color:C.textMid,letterSpacing:".04em"}}>
              {light?"Dark":"Light"}
            </span>
          </button>
        </div>

        {/* metric legend — single row, tiny */}
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:10}}>
          {METRICS.map(m=>(
            <div key={m.key} style={{border:`1px solid ${C.border}`,borderRadius:3,padding:"1px 6px",display:"flex",alignItems:"center",gap:3}}>
              <span style={{fontSize:8,color:C.textLow}}>{m.label}</span>
              <span style={{fontSize:8,color:C.accent,fontWeight:800}}>{m.weight}w</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick Reference Summary Strip ── */}
      <div style={{borderBottom:`1px solid ${C.border}`,padding:"8px 14px",display:"flex",gap:6,overflowX:"auto",background:C.bg}}>
        {[
          { label:"Companies", items: COMPANIES.slice(0,3).map((c,i)=>({rank:i+1, name: c.type==="Mobile Gen"?"Mobile Gen ★": `#${c.mtdRank} ${c.type}`, pts: c.scores.total, isMG: c.type==="Mobile Gen"})), id:"company", extra: `MG #${MG_RANK} · ${MG?.scores.total.toFixed(1)}pts` },
          { label:"Regions",   items: REGIONS.slice(0,3).map((r,i)=>({rank:i+1, name: r.name.replace("Central Midwest & Southeast","CM&SE"), pts: r.scores.total})), id:"region",  extra:null },
          { label:"Districts", items: DISTRICTS.slice(0,3).map((d,i)=>({rank:i+1, name: d.name, pts: d.scores.total})), id:"district", extra:null },
          { label:"Stores",    items: STORES.slice(0,3).map((s,i)=>({rank:i+1, name: s.name, pts: s.scores.total})), id:"store", extra:null },
        ].map(section => (
          <div key={section.id} onClick={()=>{setView(section.id);setDrawer(false);}} style={{
            flex:"0 0 auto", minWidth:140, background: view===section.id ? C.raised : C.surface,
            border:`1px solid ${view===section.id ? C.accent : C.border}`,
            borderRadius:7, padding:"7px 10px", cursor:"pointer",
            transition:"border-color .12s",
          }}>
            {/* section label */}
            <div style={{fontSize:9,fontWeight:800,color:view===section.id?C.accent:C.textMid,letterSpacing:".1em",marginBottom:5}}>{section.label.toUpperCase()}</div>
            {/* top 3 rows */}
            {section.items.map((item,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
                <span style={{fontSize:9,color:C.textLow,width:12,flexShrink:0,textAlign:"center"}}>
                  {i===0?"🥇":i===1?"🥈":"🥉"}
                </span>
                <span style={{
                  fontSize:10, fontWeight: item.isMG ? 800 : 600,
                  color: item.isMG ? C.gold : C.textHi,
                  flex:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                }}>{item.name}</span>
                <span style={{fontSize:10,fontWeight:800,color:ptsColor(item.pts),flexShrink:0}}>{item.pts.toFixed(0)}</span>
              </div>
            ))}
            {/* MG callout for company tab */}
            {section.extra && (
              <div style={{marginTop:5,paddingTop:5,borderTop:`1px solid ${C.border}`,fontSize:9,fontWeight:700,color:C.gold}}>{section.extra}</div>
            )}
          </div>
        ))}
      </div>

      {/* ── Tabs + Copy button ── */}
      <div style={{borderBottom:`1px solid ${C.border}`,padding:"0 14px",display:"flex",alignItems:"center",background:C.bg}}>
        {views.map(v=>(
          <button key={v.id} onClick={()=>{setView(v.id);setDrawer(false);}} style={tabStyle(view===v.id)}>
            {v.label} <span style={{fontSize:9,color:C.textLow}}>({v.n})</span>
          </button>
        ))}
        <div style={{marginLeft:"auto",flexShrink:0}}>
          <button onClick={()=>{
            const date = "MTD 5/13/2026";

            // ── HTML table builder ──────────────────────────────────────────
            const tdStyle = (col, bold) =>
              `style="padding:5px 8px;font-size:12px;font-family:Arial,sans-serif;white-space:nowrap;${bold?"font-weight:700;":""}color:${col};"`;
            const ptCol = (t) => t>=100?"#16a34a":t>=90?"#d97706":"#dc2626";
            const metCol = (pct, capped) => pct==null?"#9ca3af":capped?"#d97706":pct>=100?"#16a34a":"#dc2626";

            const metricHeaderRow = () =>
              `<tr style="background:#1e293b;">
                <th style="padding:5px 8px;font-size:11px;font-family:Arial,sans-serif;color:#94a3b8;text-align:left;font-weight:700;">#</th>
                <th style="padding:5px 8px;font-size:11px;font-family:Arial,sans-serif;color:#94a3b8;text-align:left;font-weight:700;">Name</th>
                ${METRICS.map(m=>`<th style="padding:5px 8px;font-size:11px;font-family:Arial,sans-serif;color:#94a3b8;text-align:center;font-weight:700;">${m.abbr}<br/><span style="font-size:9px;color:#475569;">${m.weight}w</span></th>`).join("")}
                <th style="padding:5px 8px;font-size:11px;font-family:Arial,sans-serif;color:#94a3b8;text-align:right;font-weight:700;">Points</th>
              </tr>`;

            const itemRow = (item, rankLabel, nameLabel, subLabel, isMG, i) => {
              const { scores, vals } = item;
              const bg = isMG ? light?"#fefce8":C.surface : i%2===0 ? C.surface : C.bg;
              const metCells = METRICS.map(m => {
                const pct = scores[m.key+"_pct"];
                const pts = scores[m.key];
                const capped = pts!=null && pts>=m.max;
                const col = metCol(pct, capped);
                const rawStr = vals&&vals[m.key]!=null ? (vals[m.key]*100).toFixed(0)+"%" : "—";
                const ptsStr = pts!=null ? pts.toFixed(0)+(capped?"⚡":"") : "—";
                return `<td style="padding:5px 8px;text-align:center;background:${bg};">
                  <div style="font-size:12px;font-weight:800;color:${col};font-family:Arial,sans-serif;">${rawStr}</div>
                  <div style="font-size:10px;color:#6b7280;font-family:Arial,sans-serif;">${ptsStr}</div>
                </td>`;
              }).join("");
              return `<tr>
                <td style="padding:5px 8px;font-size:12px;font-family:Arial,sans-serif;color:#6b7280;text-align:center;background:${bg};">${rankLabel}</td>
                <td style="padding:5px 8px;background:${bg};border-left:3px solid ${isMG?"#e3b341":ptCol(scores.total)};">
                  <div style="font-size:12px;font-weight:${isMG?800:600};color:${isMG?"#e3b341":"#f0f6fc"};font-family:Arial,sans-serif;white-space:nowrap;">${nameLabel}</div>
                  ${subLabel?`<div style="font-size:10px;color:#6b7280;font-family:Arial,sans-serif;">${subLabel}</div>`:""}
                </td>
                ${metCells}
                <td style="padding:5px 8px;text-align:right;background:${bg};">
                  <div style="font-size:14px;font-weight:900;color:${ptCol(scores.total)};font-family:Arial,sans-serif;">${scores.total.toFixed(1)}</div>
                  <div style="font-size:10px;color:#6b7280;font-family:Arial,sans-serif;">/ 150</div>
                </td>
              </tr>`;
            };

            const buildTable = (title, items, getLabel, getSub, isMGfn) => {
              const rows = items.map((item, i) => {
                const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":String(i+1);
                return itemRow(item, medal, getLabel(item), getSub(item), isMGfn(item), i);
              }).join("");
              return `<h3 style="font-family:Arial,sans-serif;color:#f0f6fc;margin:20px 0 8px;font-size:14px;">${title}</h3>
                <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;background:#0d1117;border-radius:8px;overflow:hidden;">
                  ${metricHeaderRow()}${rows}
                </table>`;
            };

            let sections = [];
            if (view==="scoreboard" || view==="company") {
              sections.push(buildTable("🏢 Companies", COMPANIES,
                c=>c.type+(c.type==="Mobile Gen"?" ★":""), c=>"MTD #"+c.mtdRank, c=>c.type==="Mobile Gen"));
            }
            if (view==="scoreboard" || view==="region") {
              sections.push(buildTable("🗺️ Regions", REGIONS,
                r=>r.name, r=>r.area+" · "+r.doors+" doors", ()=>false));
            }
            if (view==="scoreboard" || view==="district") {
              sections.push(buildTable("📍 Districts", DISTRICTS,
                d=>d.name, d=>d.doors+" doors", ()=>false));
            }
            if (view==="scoreboard" || view==="store") {
              const list = view==="store"&&distF!=="All" ? STORES.filter(s=>s.district===distF) : STORES;
              sections.push(buildTable("🏪 Stores", list,
                s=>s.name, s=>s.district+" · "+s.region, ()=>false));
            }

            const html = `<div style="background:#0d1117;padding:16px;max-width:900px;">
              <div style="font-family:Arial,sans-serif;color:#58a6ff;font-size:11px;font-weight:700;letter-spacing:.12em;margin-bottom:4px;">MOBILE GEN · ${date}</div>
              <div style="font-family:Arial,sans-serif;color:#f0f6fc;font-size:20px;font-weight:900;margin-bottom:4px;">Points Leaderboard</div>
              <div style="font-family:Arial,sans-serif;color:#6b7280;font-size:11px;margin-bottom:4px;">
                Company Rank: <strong style="color:#e3b341;">#${MG_RANK} of ${COMPANIES.length}</strong> &nbsp;·&nbsp;
                Points: <strong style="color:#e3b341;">${MG?.scores.total.toFixed(1)} / 150</strong>
              </div>
              <div style="font-family:Arial,sans-serif;color:#475569;font-size:10px;margin-bottom:16px;">
                🔴 below goal &nbsp;🟢 at/above goal &nbsp;⚡ capped at 150%
              </div>
              ${sections.join("")}
            </div>`;

            try {
              const blob = new Blob([html], { type: "text/html" });
              const item = new ClipboardItem({ "text/html": blob });
              navigator.clipboard.write([item]).then(()=>{
                setCopied(true);
                setTimeout(()=>setCopied(false), 2500);
              });
            } catch(e) {
              // fallback
              navigator.clipboard.writeText("Mobile Gen " + date + " — MG Rank #" + MG_RANK + " · " + MG?.scores.total.toFixed(1) + " pts");
              setCopied(true);
              setTimeout(()=>setCopied(false), 2500);
            }
          }} style={{
            border:`1px solid ${copied?C.good:C.border}`,
            borderRadius:5, background: copied?C.good+"22":"transparent",
            cursor:"pointer", padding:"5px 10px",
            fontSize:10, fontWeight:700,
            color: copied?C.good:C.textMid,
            transition:"all .2s", display:"flex", alignItems:"center", gap:5,
          }}>
            {copied ? "✓ Copied!" : "📋 Copy for Email"}
          </button>
        </div>
      </div>

      {/* ── Body: side-by-side on wide, stacked on narrow ── */}
      <div style={{display:"flex",gap:0,alignItems:"flex-start",position:"relative"}}>

        {/* Scoreboard full-width view */}
        {view==="scoreboard" && <Scoreboard onNavigate={(v)=>{setView(v);setDrawer(false);}} />}

        {/* List panel — hidden on scoreboard */}
        {view!=="scoreboard" && (
        <div style={{
          flex:1, minWidth:0, padding:"10px 14px",
          display: drawer ? "none" : "block",
        }}>
          {/* MG benchmark */}
          {MG&&(
            <div style={{border:`1px solid ${C.border}`,borderRadius:6,padding:"6px 10px",marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:8,fontWeight:700,color:C.gold,letterSpacing:".08em",flexShrink:0}}>MG LINE</span>
              <div style={{flex:1,position:"relative",height:3,background:C.barBg,borderRadius:2}}>
                <div style={{position:"absolute",left:`${mgPct}%`,top:-4,transform:"translateX(-50%)",width:2,height:11,background:C.gold,borderRadius:1}}/>
                <div style={{height:"100%",width:`${mgPct}%`,background:C.gold+"33",borderRadius:2}}/>
              </div>
              <span style={{fontSize:11,fontWeight:900,color:C.gold,flexShrink:0}}>{MG.scores.total.toFixed(1)}</span>
            </div>
          )}

          {/* District filter */}
          {view==="store"&&(
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8,alignItems:"center"}}>
              <span style={{fontSize:9,color:C.textMid,fontWeight:600,flexShrink:0}}>District:</span>
              {["All",...DISTRICTS.map(d=>d.name)].map(f=>(
                <button key={f} onClick={()=>setDistF(f)} style={chipStyle(distF===f)}>{f}</button>
              ))}
            </div>
          )}

          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {view==="company"&&COMPANIES.map((item,i)=>(
              <Card key={i} rank={i+1}
                label={item.type+(item.type==="Mobile Gen"?" ★":"")}
                sublabel={`MTD Rank #${item.mtdRank}`}
                scores={item.scores} vals={item.vals}
                isMG={item.type==="Mobile Gen"}
                selected={selCo===i}
                onClick={()=>pick(setSelCo,i)}/>
            ))}
            {view==="region"&&REGIONS.map((item,i)=>(
              <Card key={i} rank={i+1}
                label={item.name} sublabel={`${item.area} · ${item.doors} doors`}
                scores={item.scores} vals={item.vals}
                selected={selReg===i} onClick={()=>pick(setSelReg,i)}/>
            ))}
            {view==="district"&&DISTRICTS.map((item,i)=>(
              <Card key={i} rank={i+1}
                label={item.name} sublabel={`${item.doors} doors`}
                scores={item.scores} vals={item.vals}
                selected={selDist===i} onClick={()=>pick(setSelDist,i)}/>
            ))}
            {view==="store"&&filtered.map(item=>{
              const gr=STORES.findIndex(s=>s===item)+1;
              return(
                <Card key={item.name} rank={gr}
                  label={item.name+(item.divested?" ⚑":"")} sublabel={item.district+(item.divested?" · Divested":"")}
                  scores={item.scores} vals={item.vals}
                  selected={selSt===STORES.indexOf(item)}
                  onClick={()=>pick(setSelSt,STORES.indexOf(item))}/>
              );
            })}
          </div>

          {/* ── Delta panels ── */}
          {view==="company" && !drawer && (
            <DeltaPanel
              title="MOBILE GEN"
              items={COMPANIES}
              prevMap={null}
              getPrevKey={()=>null}
              isMGonly={true}
            />
          )}
          {view==="region" && !drawer && (
            <DeltaPanel
              title="ALL REGIONS"
              items={REGIONS}
              prevMap={PREV_REGIONS}
              getPrevKey={(item)=>item.name}
              isMGonly={false}
            />
          )}
          {view==="district" && !drawer && (
            <DeltaPanel
              title="ALL DISTRICTS"
              items={DISTRICTS}
              prevMap={PREV_DISTRICTS}
              getPrevKey={(item)=>item.name}
              isMGonly={false}
            />
          )}
        </div>
        )}

        {/* Detail panel — hidden on scoreboard */}
        {view!=="scoreboard" && (
        <div style={{
          width: drawer ? "100%" : 280,
          flexShrink: 0,
          position: drawer ? "fixed" : "sticky",
          top: drawer ? 0 : 14,
          left: drawer ? 0 : "auto",
          right: drawer ? 0 : "auto",
          bottom: drawer ? 0 : "auto",
          background: drawer ? C.bg : "transparent",
          zIndex: drawer ? 100 : "auto",
          overflowY: drawer ? "auto" : "visible",
          padding: drawer ? "14px 14px 80px" : "10px 14px 10px 0",
          display: !drawer && typeof window !== "undefined" && window.innerWidth < 640 ? "none" : "block",
        }}>
          {drawer&&(
            <button onClick={()=>setDrawer(false)} style={{
              display:"flex",alignItems:"center",gap:6,marginBottom:12,
              background:"none",border:"none",cursor:"pointer",
              color:C.accent,fontSize:12,fontWeight:700,padding:0,
            }}>
              ← Back to list
            </button>
          )}
          <div style={{fontSize:9,fontWeight:700,color:C.textLow,letterSpacing:".14em",marginBottom:6}}>DETAIL</div>
          {detailItem&&(
            <Detail
              item={detailItem} rank={detailRank}
              title={view==="company"?"COMPANY":view==="region"?"REGION":view==="district"?"DISTRICT":"STORE"}
              sub1={view==="company"?`Type: ${detailItem.type} · MTD #${detailItem.mtdRank}`:view==="region"?`${detailItem.area} · ${detailItem.doors} doors`:view==="district"?`${detailItem.doors} doors`:detailItem.district}
              sub2={view==="store"?detailItem.region:null}
              compareTo={!(view==="company"&&detailItem.type==="Mobile Gen")}
            />
          )}
        </div>
        )}
      </div>

      {/* Mobile tap hint (only shown when drawer is closed) */}
      {!drawer&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,padding:"8px 14px",background:C.surface,borderTop:`1px solid ${C.border}`,textAlign:"center",fontSize:10,color:C.textLow}}>
          Tap any card to see full breakdown
        </div>
      )}
    </div>
  );
}
