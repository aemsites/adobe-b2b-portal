# Integration guide: event tabs & event membership

**Audience:** engineers of the upstream system that writes content into the
`aemsites/summit-portal` DA repository.

**Goal:** add, update, and retire event portal tabs in the Summit Portal customer
picker — and mark which reports belong to an event — **entirely from content, with
no code change or deploy on the portal side**.

This replaces the previous arrangement, where each event tab was hardcoded in
`blocks/customer-picker/customer-picker.js` and a new event needed a PR.

---

## 1. The two files you write

| File | Answers | Size |
|---|---|---|
| [`/data/event-tabs.json`](https://da.live/sheet#/aemsites/summit-portal/data/event-tabs) | *Which event tabs exist, in what order, under what label* | one row per event |
| [`/data/insights-list.json`](https://da.live/sheet#/aemsites/summit-portal/data/insights-list) | *Which reports are in each event, and what to call them there* | one row per report (~4,200) |

They are joined by a single string: the **column name**. A row in `event-tabs.json`
names a column; that column in `insights-list.json` holds the membership.

```
event-tabs.json                          insights-list.json
┌─────────────────────────┐              ┌──────────────────────────────────┐
│ Column: "Munich Summit  │─────────────▶│ …, "Munich Summit 2026": "Bosch" │
│          2026"          │   must match │ …, "Munich Summit 2026": ""      │
│ Label:  "Munich Summit  │   EXACTLY    │ …  (key absent = not a member)   │
│          2026"          │              └──────────────────────────────────┘
└─────────────────────────┘
```

The match is **exact** — case, spacing, and punctuation all count. A typo produces
a tab with zero cards, not an error.

---

## 2. `/data/event-tabs.json` — the tab registry

One row per tab. Columns:

| Column | Required | Meaning |
|---|---|---|
| `Column` | **yes** | The `insights-list` column this tab reads. Must match exactly. |
| `Label` | no | Tab text in the UI. Defaults to `Column` if blank. |
| `Active` | no | Opt-**out**. Only `false`, `no`, `0`, `off`, `n` (case-insensitive, trimmed) hide the tab. **Blank means visible.** |
| `Id` | no | Stable internal id. Defaults to a slug of `Column`. |

### Rules

- **Row order is tab order.** The tabs render left-to-right in sheet row order,
  after the three built-in tabs (Accounts, Insight Reports, Summit 26 Portal).
- **A row is dropped** if `Column` is blank, if its `Id` duplicates an earlier row,
  or if its `Id` collides with a built-in mode (`accounts`, `insights`, `portal`).
- **`Id` must never change for an existing tab.** It backs the per-tab
  "Recently viewed" list (`localStorage` key `cp-recent-<id>`). Changing it silently
  empties every user's recents for that tab. If you only want to rename the tab,
  change `Label` and leave `Id` and `Column` alone.
- The `Id` slug rule, when you omit `Id`: lowercase, every run of non-alphanumeric
  characters becomes `-`, leading/trailing `-` trimmed.
  `"Summit Mumbai 2026"` → `summit-mumbai-2026`.

### Current contents

```json
{
  "total": 6, "limit": 6, "offset": 0,
  "data": [
    { "Id": "cannes",    "Column": "Cannes 2026",           "Label": "Cannes 2026 Portal",    "Active": "true" },
    { "Id": "sydney",    "Column": "Sydney Summit 2026",    "Label": "Sydney Summit 2026",    "Active": "true" },
    { "Id": "london",    "Column": "Summit London 2026",    "Label": "Summit London 2026",    "Active": "true" },
    { "Id": "munich",    "Column": "Munich Summit 2026",    "Label": "Munich Summit 2026",    "Active": "true" },
    { "Id": "singapore", "Column": "Summit Singapore 2026", "Label": "Summit Singapore 2026", "Active": "true" },
    { "Id": "mumbai",    "Column": "Summit Mumbai 2026",    "Label": "Summit Mumbai 2026",    "Active": "true" }
  ],
  ":sheetname": "data", ":type": "sheet"
}
```

The short `Id` values (`cannes`, not `cannes-2026`) are historical — they preserve
recents from before tabs were content-driven. **Do not "tidy" them.** New events can
simply omit `Id` and take the slug default.

---

## 3. `/data/insights-list.json` — event membership

Each row is one report. To put a report into an event, set the event's column on
that row.

### Semantics

- **Non-empty cell = the report is in that event.** Empty string, whitespace, or an
  absent key all mean "not in this event".
- **The cell value is the card label** shown in that tab — i.e. the event-specific
  company name. This is deliberately *not* the same as `Customers`: the same
  account can be branded differently per event.
- **A `;` splits one row into several cards.** `"EY; EY Studio+"` produces two cards,
  both linking to the same page. Use this when two companies share one portal page.
  8 rows currently do this.
- **`Folder` is the link target.** The card links to that row's `Folder`; a trailing
  slash is normalized for you.
- **One card per flagged row.** Event tabs deliberately do *not* collapse by website
  the way the Insight Reports tab does — so the same company may appear in several
  events, and co-located companies each keep a distinct card.
- Cards are sorted by label, and the A–Z nav groups on the first character
  (leading digits group under `0-9`).

### Reserved column names

Never use these as an event column — they are the row's own data and are skipped
by the tab machinery:

```
Report    Customers    Folder    Created    Report Notice
```

Any *other* column is treated as an event flag.

### Sparse vs. dense columns — both are fine

The existing data uses two styles, and the portal handles both identically:

| Style | Columns using it | Key present on |
|---|---|---|
| Dense — write `""` on non-members | Cannes 2026, Sydney Summit 2026, Summit London 2026 | 3,004 of 4,230 rows |
| Sparse — write the key only on members | Munich Summit 2026, Summit Singapore 2026, Summit Mumbai 2026 | 405 / 118 / 382 rows |

**Prefer sparse.** It is smaller, and a reader that only sets member rows cannot
accidentally clear another event's cell. Do not feel obliged to backfill `""`.

> Consequence worth knowing: because rows carry different key sets, **column order
> cannot be reliably recovered from this file.** That is precisely why tab order
> lives in `event-tabs.json` and not here.

---

## 4. The write API

Base: `https://admin.da.live/source/aemsites/summit-portal/<path>`
Auth: `Authorization: Bearer <IMS token>` — the same token works for the publish
endpoints in §5.

| Verb | Effect | Status |
|---|---|---|
| `GET` | Returns the whole sheet JSON | `200` |
| `POST` | **Replaces the whole file** — multipart form, field `data`, type `application/json` | `201` create / `200` update |
| `DELETE` | Removes the file | `204` |

### ⚠️ POST is whole-file replace — you must read-modify-write

There is no partial or per-row update. A `POST` that omits a row **deletes that row**.
Verified: posting `[{Id:"b"},{Id:"c"}]` over a file containing `[{Id:"a"}]` leaves
exactly `b` and `c` — `a` is gone with no warning.

So every mutation is:

1. `GET` the current file.
2. Mutate the parsed `data` array in memory.
3. Recompute `total` and `limit` to match `data.length`.
4. `POST` the whole document back.
5. Publish (§5).

Re-`GET` immediately before the `POST` to keep the window small, and **serialize
your writes** — two concurrent writers on `insights-list.json` will silently lose
one side's changes.

### Envelope to preserve

```json
{
  "total": <data.length>,
  "limit": <data.length>,
  "offset": 0,
  "data": [ ... ],
  ":sheetname": "data",
  ":type": "sheet"
}
```

`:colWidths` is optional and only affects the DA sheet editor's presentation.
The portal reads **only** the `data` array.

---

## 5. Publishing (do not skip)

A write to DA is invisible to the portal until it is published to **both** stages:

```
POST https://admin.hlx.page/preview/aemsites/summit-portal/main/<path>
POST https://admin.hlx.page/live/aemsites/summit-portal/main/<path>
```

Preview first, then live. Both return `200`.

`<path>` here is `data/event-tabs.json` or `data/insights-list.json` — no leading slash.

**The single most common failure is a correct DA write that was never published.**
The sheet looks right in da.live and the portal shows nothing.

---

## 6. Adding a new event — order of operations

Do these in order. The order matters: it avoids a window where the tab exists but
is empty.

**Step 1 — membership first.** Add the event column to the member rows in
`insights-list.json` (read-modify-write), then publish it.

**Step 2 — then the tab.** Append a row to `event-tabs.json` naming that column,
then publish it.

The tab appears on the next page load. No deploy.

### Worked example — "Summit Tokyo 2027"

```bash
BASE=https://admin.da.live/source/aemsites/summit-portal
PUB=https://admin.hlx.page
AUTH="Authorization: Bearer $DA_TOKEN"

# --- Step 1: membership ---
curl -s -H "$AUTH" $BASE/data/insights-list.json > insights.json
# mutate: for each member row, set row["Summit Tokyo 2027"] = "<event-facing name>"
# recompute total/limit; leave every other key untouched
curl -s -X POST -H "$AUTH" -F "data=@insights.json;type=application/json" \
  $BASE/data/insights-list.json
curl -s -X POST -H "$AUTH" $PUB/preview/aemsites/summit-portal/main/data/insights-list.json
curl -s -X POST -H "$AUTH" $PUB/live/aemsites/summit-portal/main/data/insights-list.json

# --- Step 2: the tab ---
curl -s -H "$AUTH" $BASE/data/event-tabs.json > tabs.json
# mutate: append { "Column": "Summit Tokyo 2027", "Label": "Summit Tokyo 2027", "Active": "true" }
#         (omit Id — it slugs to summit-tokyo-2027); recompute total/limit
curl -s -X POST -H "$AUTH" -F "data=@tabs.json;type=application/json" \
  $BASE/data/event-tabs.json
curl -s -X POST -H "$AUTH" $PUB/preview/aemsites/summit-portal/main/data/event-tabs.json
curl -s -X POST -H "$AUTH" $PUB/live/aemsites/summit-portal/main/data/event-tabs.json
```

### Other operations

| Task | Do this |
|---|---|
| Rename a tab | Change `Label` only. Leave `Id` and `Column` alone. |
| Reorder tabs | Reorder the rows in `event-tabs.json`. |
| Retire a finished event | Set `Active` to `false`. **Keep the row and keep the column data** — it stays recoverable and the history is intact. |
| Add a company to a live event | Set that event's column on its `insights-list` row; republish `insights-list.json` only. |
| Remove a company from an event | Set its cell to `""` (or drop the key); republish. |
| Two companies on one page | One row, cell = `"Name A; Name B"`. |

Deleting an `event-tabs.json` row also works to remove a tab, but `Active: false`
is preferred — it is reversible and self-documenting.

---

## 7. Failure modes & the safety net

If `event-tabs.json` is missing, unpublished, malformed, or yields no usable rows,
the portal **falls back** to deriving one tab per non-reserved `insights-list`
column that has at least one non-empty cell, labelled by the column header.

This means tabs degrade rather than disappear — but in **arbitrary order**, with
raw column names as labels and **no way to hide a retired event**. Treat the
fallback as a safety net, never as the intended path.

| Symptom | Most likely cause |
|---|---|
| Tab missing entirely | `event-tabs.json` not published to *live* |
| Tab present, zero cards | `Column` doesn't exactly match the `insights-list` header |
| Tab shows raw column names, wrong order | Fallback is active — `event-tabs.json` is unreachable or has no valid rows |
| Another event's cards vanished | A `POST` without read-modify-write clobbered rows |
| Users lost their "Recently viewed" | An existing tab's `Id` was changed |
| Card links 404 | The row's `Folder` doesn't point at a published page |

### Access note

`/data/**` sits behind a closed user group (`adobe.com`, `semrush.com`). Both files
return `401` to anonymous requests — that is expected and correct, not a
misconfiguration. Any new file you add under `/data/` inherits the same protection
automatically.

---

## 8. Pre-flight checklist

- [ ] Read-modify-write used — the `POST` body contains **every** pre-existing row
- [ ] `total` and `limit` equal `data.length`
- [ ] `:sheetname` and `:type` preserved
- [ ] `Column` in `event-tabs.json` matches the `insights-list` header **byte for byte**
- [ ] `Id` unchanged for every pre-existing tab
- [ ] `Column` is not one of the reserved names
- [ ] Membership published **before** the tab row
- [ ] Both files published to **preview *and* live**
- [ ] Spot-check: the new tab appears, card count matches the number of flagged rows
      (remember `;` cells produce more cards than rows)

---

## 9. Reference — how the portal consumes this

`blocks/customer-picker/customer-picker.js`:

- `parseEventModes(configRows, insightRows)` — resolves `event-tabs.json` rows into
  the tab list; falls back to `deriveEventModes` when nothing usable survives.
- `deriveEventModes(insightRows)` — the fallback described in §7.
- `buildEventCompanies(insightRows, column)` — builds the cards for one tab.
- `slugifyModeId(value)` — the `Id` default rule.

All four are exported and unit-tested in `test/blocks/customer-picker.test.js`.
