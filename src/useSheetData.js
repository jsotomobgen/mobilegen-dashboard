import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// useSheetData — fetches all four tabs from your Google Sheet as CSV
//
// Fill in your Sheet ID and tab GIDs in your .env file:
//   REACT_APP_SHEET_ID=your_sheet_id_here
//   REACT_APP_GID_COMPANIES=0
//   REACT_APP_GID_REGIONS=1
//   REACT_APP_GID_DISTRICTS=2
//   REACT_APP_GID_STORES=3
//
// Your Sheet ID is the long string in the URL:
//   https://docs.google.com/spreadsheets/d/SHEET_ID/edit
//
// Each tab's GID is the number after #gid= in the URL when that tab is open.
// ─────────────────────────────────────────────────────────────────────────────

const SHEET_ID        = "1cFnQ7vMyjlGGhtZNyLMVoOaRmB0YfCsOw7kQKIrNsSk";
const GID_COMPANIES   = "0";
const GID_REGIONS     = "458299654";
const GID_DISTRICTS   = "1987599027";
const GID_STORES      = "409419510";

function csvUrl(gid) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
}

function parseCsv(text) {
  const lines = text.trim().split("\n").map(l =>
    l.split(",").map(c => c.trim().replace(/^"|"$/g, ""))
  );
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

export function useSheetData() {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [compRows, regRows, distRows, storeRows] = await Promise.all([
        fetchTab(GID_COMPANIES),
        fetchTab(GID_REGIONS),
        fetchTab(GID_DISTRICTS),
        fetchTab(GID_STORES),
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

      setData({ companies, regions, districts, stores });
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
