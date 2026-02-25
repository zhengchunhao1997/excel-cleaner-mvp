# excelMerge (Extension) User Guide

Last updated: 2026-02-05

## 1. When to use it

- You have multiple Excel/CSV exports with inconsistent headers (e.g. Phone / Mobile / 电话)
- You want a unified schema and a single cleaned export
- You need either:
  - Append (union) rows into one table, or
  - Join by a key into one row per entity

## 2. Privacy & data flow

- File contents are read, merged, and exported locally
- Only file name + headers are sent to the API for mapping suggestions

## 3. Quick start (4 Steps)

1) Home Page: Click "Get Started Free" to enter the file processing workspace.
2) Upload: drop .xlsx / .csv files (MVP: first sheet only).
3) Set header row: each file has a “Header row” selector (1-based). If your sheet has title/notes above the actual headers, set it to the correct row.
4) Analyze & Map: generate a unified schema, then click any mapping cell to adjust.

## 4. AI Intelligent Cleaning (New)

- **AI Cleaning (Beta)**: Enter instructions in the prompt box at the bottom (e.g., "Identify mobile operators and add a new column", "Convert all amounts to USD").
- **Automatic Transformation**: AI understands your intent and updates the schema. Upon export, the system automatically fills data based on AI logic (e.g., auto-detecting China Mobile/Unicom/Telecom).
- **Custom Toasts**: All AI results and system alerts use a consistent dark-themed UI with auto-wrapping and center alignment.

## 4. Mapping

- Leftmost column is the unified schema field
- Each file gets its own column; each cell is the original header mapped to that unified field
- Click a cell to change mapping; choose “Unmapped” to set null

## 5. Export (Append / Join)

### 5.1 Append

- Appends all rows into a single table (union)
- Output: cleaned_data_append.xlsx
- Adds `_source_file` for provenance

### 5.2 Join

- Merges rows by your selected join key into one row per entity (best-effort)
- Select “Join” and choose a join key (e.g. customer_id / phone_number / serial_number)
- Output: cleaned_data_join.xlsx
- Adds `_source_files` for provenance
- If any file is missing the join key mapping, export is blocked with an error message

## 6. Troubleshooting

### 6.1 My header is not on row 1

- Change “Header row” to the actual header row (1-based)
- The file will be re-parsed and previous mapping will be cleared to avoid misalignment

### 6.2 Analyze fails

- Ensure the API server is reachable (dev default: http://localhost:3000; production can be configured via VITE_API_BASE)
- If DEEPSEEK_API_KEY is not set or the model request fails, the server falls back to a rule-based mapping (still usable)

### 6.3 Conflicts in Join

- Current strategy: “first wins, later fills blanks” (no overwrite)
- If you need overwrite/concat/latest, we can add a conflict policy option

## 7. Update policy (important)

- Any feature change must update this guide
- File: extension/src/docs/USAGE.en.md

## 8. Analytics dashboard & feedback

### 8.1 Admin dashboard

- Open: API origin + /admin (dev default: http://localhost:3000/admin)
- If ADMIN_TOKEN is set, open /admin?token=... or send x-admin-token
- Day / week / month stats:
  - unique clients (by clientId)
  - uploads, analyze success/failure, exports (Join/Append)
  - latest feedback + rating distribution

### 8.2 Feedback & suggestions

- Use the “Feedback” button in the top-right area of the extension
- Feedback is stored locally on the API server under data/ for product iteration
