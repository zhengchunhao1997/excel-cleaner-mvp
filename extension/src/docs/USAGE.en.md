# excelMerge (Extension) User Guide

Last updated: 2026-02-25

## 1. When to use it

- You have multiple Excel/CSV exports with inconsistent headers (e.g. Phone / Mobile / 电话)
- You want a unified schema and a single cleaned export
- You need either:
  - Append (union) rows into one table, or
  - Join by a key into one row per entity

## 2. Privacy & data flow

- File contents are read, merged, and exported locally
- Only file name + headers are sent to the API for mapping suggestions
- Mapping templates are saved locally in your browser (not uploaded): headers + unified schema + mapping rules for reuse

## 3. Quick start (4 Steps)

1) Home Page: Click "Get Started Free" to enter the file processing workspace.
2) Upload: drop .xlsx / .csv files (MVP: first sheet only).
3) Set header row: each file has a “Header row” selector (1-based). If your sheet has title/notes above the actual headers, set it to the correct row.
4) Analyze & Map: generate a unified schema, then click any mapping cell to adjust.

## 4. AI Intelligent Cleaning (New)

- **AI Cleaning (Beta)**: Enter instructions in the prompt box at the bottom (e.g., "Identify mobile operators and add a new column", "Convert all amounts to USD").
- **Automatic Transformation**: AI understands your intent and updates the schema. Upon export, the system automatically fills data based on AI logic (e.g., auto-detecting China Mobile/Unicom/Telecom).
- **Custom Toasts**: All AI results and system alerts use a consistent dark-themed UI with auto-wrapping and center alignment.

## 5. Mapping

- Leftmost column is the unified schema field
- Each file gets its own column; each cell is the original header mapped to that unified field
- Click a cell to change mapping; choose “Unmapped” to set null

## 6. Mapping templates

For high-frequency workflows (e.g. joining two exports), save your mapping as a template so the next run can reuse it without re-analyzing.

### 6.1 Save a template

- Complete “Analyze & Map” (and optionally adjust mapping)
- Click “Save template” in the top-right of the mapping panel and name it

### 6.2 Match & apply

- When you upload files with the same header structure again, the app will show “Template found”
- Click “Apply template” to reuse it, or “Analyze” to run AI again

### 6.3 Storage & clearing

- Stored in browser Local Storage, reusable on the same device/browser
- Templates may be lost if you clear site data/cache, use private mode, reinstall the browser, or switch devices
- To clear: use the browser site settings to clear local data for this app/site
- Stored content includes template name, headers, unified fields, mappings, and optional transformation logic; no cell data is stored
- Limit: keeps up to 50 templates; older ones are auto-removed based on “most recently used”

## 7. Export (Append / Join)

### 7.1 Append

- Appends all rows into a single table (union)
- Output: cleaned_data_append.xlsx
- Adds `_source_file` for provenance

### 7.2 Join

- Merges rows by your selected join key into one row per entity (best-effort)
- Select “Join” and choose a join key (e.g. customer_id / phone_number / serial_number)
- Output: cleaned_data_join.xlsx
- Adds `_source_files` for provenance
- If any file is missing the join key mapping, export is blocked with an error message

## 8. Troubleshooting

### 8.1 My header is not on row 1

- Change “Header row” to the actual header row (1-based)
- The file will be re-parsed and previous mapping will be cleared to avoid misalignment

### 8.2 Analyze fails

- Ensure the API server is reachable (dev default: http://localhost:3000; production can be configured via VITE_API_BASE)
- If DEEPSEEK_API_KEY is not set or the model request fails, the server falls back to a rule-based mapping (still usable)

### 8.3 Conflicts in Join

- Current strategy: “first wins, later fills blanks” (no overwrite)
- If you need overwrite/concat/latest, we can add a conflict policy option

## 9. Update policy (important)

- Any feature change must update this guide
- File: extension/src/docs/USAGE.en.md

## 10. Analytics dashboard & feedback

### 10.1 Admin dashboard

- Open: API origin + `/admin` (dev default: http://localhost:3000/admin)
- Auth methods (any one works):
  - **Static admin token**: set `ADMIN_TOKEN`, then open `/admin?token=<ADMIN_TOKEN>` (or send `x-admin-token`)
  - **Default admin account**: set `ADMIN_DEFAULT_EMAIL` + `ADMIN_DEFAULT_PASSWORD` (server creates a `plan=admin` user on startup)
  - **Admin email allowlist**: set `ADMIN_EMAILS` (comma/space separated). When those emails log in, the server upgrades them to `plan=admin` and the UI shows the Admin entry.
- Day / week / month stats:
  - unique clients (by clientId)
  - uploads, analyze success/failure, exports (Join/Append)
  - latest feedback + rating distribution

### 10.2 Feedback & suggestions

- Use the “Feedback” button in the top-right area of the extension
- Feedback is stored in the server database (feedback table) for product iteration
