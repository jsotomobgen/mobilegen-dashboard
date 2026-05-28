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
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const todayDay = days[new Date().getDay()];
  const today = new Date();
  today.setHours(0,0,0,0);

  // Filter rows matching today's day name AND at least 6 days old
// The new filter is just the age check:
const validRows = rows.filter(r => {
  const parts = r.lastUpdated.split('/');
  if (parts.length < 3) return false;
  const rowDate = new Date(parts[2], parts[0]-1, parts[1]);
  rowDate.setHours(0,0,0,0);
  const daysDiff = Math.round((today - rowDate) / (1000*60*60*24));
  return daysDiff >= 6;
}); 
    // Parse the date from lastUpdated (format: M/D/YYYY)
    const parts = r.lastUpdated.split('/');
    if (parts.length < 3) return false;
    const rowDate = new Date(parts[2], parts[0]-1, parts[1]);
    rowDate.setHours(0,0,0,0);
    const daysDiff = Math.round((today - rowDate) / (1000*60*60*24));
    return daysDiff >= 6;
  });

  const useRows = validRows.length > 0 ? validRows : [];
  const dayLabel = useRows.length > 0 ? useRows[0].day : null;
  const dateLabel = useRows.length > 0 ? useRows[0].lastUpdated : null;

  const companies = {};
  const regions   = {};
  const districts = {};
  const stores    = {};

  useRows.forEach(r => {
    const vals = toVals(r);
    if (r.section === 'Companies')      companies[r.key] = vals;
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
