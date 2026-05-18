import { useState, useEffect } from "react";

const SHEET_ID      = "1cFnQ7vMyjlGGhtZNyLMVoOaRmB0YfCsOw7kQKIrNsSk";
const GID_COMPANIES = "0";
const GID_REGIONS   = "458299654";
const GID_DISTRICTS = "1987599027";
const GID_STORES    = "409419510";
const GID_PREV      = "1115887413";

function csvUrl(gid) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
}

function parseCsv(text) {
  const lines = text.trim().split("\n").map(l => {
    const cells = [];
    let cur = "", inQ = false;
    for (let i = 0; i < l.length; i++) {
      const ch = l[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { cells.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    cells.push(cur.trim());
    return cells;
  });
  const headers = lines[0];
  return lines.slice(1)
    .filter(row => row.length >= headers.length && row[0] !== "")
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });
}

function toFloat(v) {
  if (v === "" || v === null || v === undefined) return null;
  const f = parseFloat(v);
  return isNaN(f) || f < 0 ? null : f;
}

function toVals(row) {
  return {
    pga:   toFloat(row.pga),
    vhi:   toFloat(row.vhi),
    prem:  toFloat(row.prem),
    perks: toFloat(row.perks),
    vmp:   toFloat(row.vmp),
    pull:  toFloat(row.pull),
  };
}

async function fetchTab(gid) {
  const res = await fetch(csvUrl(gid));
  if (!res.ok) throw new Error(`Failed to load sheet tab (gid=${gid}): ${res.status}`);
  return parseCsv(await res.text());
}

// Parse Prev tab into lookup maps keyed by section+key
// Returns { companies: {type: vals}, regions: {name: vals}, districts: {name: vals}, stores: {name: vals}, day: string }
function parsePrev(rows) {
  // Figure out today's day name to find matching prev rows
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const todayDay = days[new Date().getDay()];

  // Filter rows matching today's day
  const todayRows = rows.filter(r => r.day === todayDay);

  // If no rows for today yet, fall back to most recent available day
  const useRows = todayRows.length > 0 ? todayRows : rows;

  // Get the day label for display
  const dayLabel = useRows.length > 0 ? useRows[0].day : null;
  const dateLabel = useRows.length > 0 ? useRows[0].lastUpdated : null;

  const companies = {};
  const regions   = {};
  const districts = {};
  const stores    = {};

  useRows.forEach(r => {
    const vals = toVals(r);
    if (r.section === 'Companies') companies[r.key] = vals;
    else if (r.section === 'Regions')   regions[r.key]   = vals;
    else if (r.section === 'Districts') districts[r.key] = vals;
    else if (r.section === 'Stores')    stores[r.key]    = vals;
  });

  return { companies, regions, districts, stores, day: dayLabel, date: dateLabel };
}

export function useSheetData() {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [compRows, regRows, distRows, storeRows, prevRows] = await Promise.all([
        fetchTab(GID_COMPANIES),
        fetchTab(GID_REGIONS),
        fetchTab(GID_DISTRICTS),
        fetchTab(GID_STORES),
        fetchTab(GID_PREV),
      ]);

      const companies = compRows.map(r => ({
        mtdRank: parseInt(r.mtdRank) || 0,
        type:    r.type || "Unknown",
        vals:    toVals(r),
      }));

      const regions = regRows.map(r => ({
        name:  r.name,
        area:  r.area  || "",
        doors: parseInt(r.doors) || 0,
        vals:  toVals(r),
      }));

      const districts = distRows.map(r => ({
        name:  r.name,
        doors: parseInt(r.doors) || 0,
        vals:  toVals(r),
      }));

      const stores = storeRows.map(r => ({
        name:     r.name,
        district: r.district || "",
        region:   r.region   || "",
        divested: r.divested === "true",
        vals:     toVals(r),
      }));

      const prev = parsePrev(prevRows);

      setData({ companies, regions, districts, stores, prev });
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  return { data, loading, error, lastUpdated, refresh: load };
}
