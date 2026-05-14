# Mobile Gen Dashboard — Deployment Guide

## What this is
A live React dashboard that reads from your Google Sheet automatically.
Every time the Apps Script updates the sheet (triggered by the Verizon email),
anyone with the Vercel URL sees the new data on their next page load.

---

## Step 1 — Set up your Google Sheet

1. Create a new Google Sheet
2. Create **5 tabs** named exactly:
   - `Companies`
   - `Regions`
   - `Districts`
   - `Stores`
   - `Log`

3. The Apps Script will populate these automatically. Column headers are written
   by the script on first run — you don't need to add them manually.

4. **Publish the sheet:** File → Share → Publish to web → Entire Document → CSV → Publish

5. Copy your **Sheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/THIS_PART_HERE/edit`

6. Click each tab and note the **GID** from the URL (`#gid=XXXXXX`)

---

## Step 2 — Install the Apps Script

1. In your Google Sheet: **Extensions → Apps Script**
2. Delete all existing code and paste the contents of `MobileGenAutoUpdater.gs`
3. Click the **+** next to Services → add **Google Drive API**
4. Save the script
5. Select `firstTimeSetup` in the function dropdown → click ▶ Run
6. Approve all permissions
7. Done — it will check Gmail every 30 min from 6am–3pm automatically

---

## Step 3 — Deploy to Vercel

1. Go to **github.com** and create a free account
2. Create a **New Repository** named `mobilegen-dashboard` (Public)
3. Upload all the files from this zip into the repository
4. Go to **vercel.com** → Sign up with GitHub → **Add New Project**
5. Import your `mobilegen-dashboard` repository
6. **Before clicking Deploy**, click **Environment Variables** and add:

   | Key | Value |
   |-----|-------|
   | `REACT_APP_SHEET_ID` | your Sheet ID from Step 1 |
   | `REACT_APP_GID_COMPANIES` | gid for Companies tab |
   | `REACT_APP_GID_REGIONS` | gid for Regions tab |
   | `REACT_APP_GID_DISTRICTS` | gid for Districts tab |
   | `REACT_APP_GID_STORES` | gid for Stores tab |

7. Click **Deploy** — takes about 2 minutes
8. You get a permanent URL like `mobilegen-dashboard.vercel.app`

---

## Daily workflow (after everything is set up)

**Nothing to do.** When the Verizon email arrives:
1. Apps Script detects it within 30 minutes
2. Parses the Excel attachment
3. Updates the Google Sheet
4. Anyone who opens your Vercel URL sees the fresh data

That's it. Share the URL with your team once and they bookmark it forever.

---

## Troubleshooting

**Dashboard shows "Could not load data"**
- Make sure the Sheet is published to the web (Step 1, point 4)
- Double-check the SHEET_ID and GID values in Vercel environment variables
- Redeploy on Vercel after changing environment variables

**Apps Script not finding emails**
- Check the Log tab in your Google Sheet for error messages
- Make sure the Gmail label `MobileGen-Processed` exists
- Run `runNow()` manually in Apps Script to force an immediate check

**Delta panel shows no changes**
- The previous-day data is a static snapshot baked into the code
- It updates automatically each time you drop a new file here and I update it
- Once you're fully on the Google Sheets flow, deltas will compute live
