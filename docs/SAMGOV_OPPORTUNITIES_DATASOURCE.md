# SAM.gov Contract Opportunities – Data Source & Logic

## What is the data source?

The **Contract Opportunities** (and related) views pull from the **SAM.gov Get Opportunities Public API v2**:

- **API base:** `https://api.sam.gov/opportunities/v2/search`
- **Docs:** [Get Opportunities Public API | GSA Open Technology](https://open.gsa.gov/api/get-opportunities-public-api/)
- **Auth:** Requires a valid `SAM_GOV_API_KEY` in the backend environment (`.env`).

So the data is **live federal contract opportunities** from SAM.gov (solicitations, presolicitations, sources sought, etc.), not a static or pre-filtered snapshot.

---

## What is being pulled?

Each request returns **opportunity notices** in the selected time window. The backend:

1. Calls the SAM.gov search API with the parameters below.
2. Maps each opportunity to a flat row with these fields (and a few extras):

| Field | Source | Description |
|-------|--------|-------------|
| `noticeId` | API | Unique notice ID |
| `title` | API | Opportunity title |
| `solicitationNumber` | API | Solicitation number |
| `postedDate` | API | Date posted |
| `updatedDate` | API (or fallback) | Best-effort “last updated” (API does not expose a true updated date) |
| `responseDeadLine` | API | Response deadline |
| `type` / `baseType` | API | Notice type (e.g. Solicitation, Presolicitation, Sources Sought) |
| `organization` | API | Issuing office – shortened from `fullParentPathName` (last segment) for display |
| `naicsCode` | API | NAICS code associated with the opportunity (when present) |
| `classificationCode` | API | PSC / classification code |
| `setAside` | API | Set-aside type (e.g. small business) |
| `state` | API | Place of performance state (normalized) |
| `uiLink` | API | Link to the notice on SAM.gov |
| `award_amount` | API | Award amount when applicable |
| `opportunity_count` | Derived | Always `1` per row |

No extra “group” or aggregation is applied server-side; each row is one opportunity. Grouping by organization, base type, etc. is done in the app (dashboard/filters/charts).

---

## NAICS code – what group and what logic?

- **There is no default NAICS filter.**  
  The app does **not** restrict by NAICS unless the caller explicitly passes a NAICS-based parameter.

- **How NAICS is used in the API:**
  - SAM.gov’s search API supports an **`ncode`** parameter (NAICS-based filter).
  - In this codebase, **`ncode` is only sent if the client (or another caller) passes it** as a query parameter to the backend.  
  - The dashboard UI (e.g. “Contract Opportunities” load, date range, keyword search) does **not** send `ncode`. So in normal use, **all NAICS codes** are included in the results.

- **Logic in code:**
  - Backend reads: `ncode = (req.query.ncode || '').toString().trim() || undefined`
  - It is only added to the SAM.gov request when present: `...(ncode ? { ncode } : {})`
  - So:
    - **No `ncode` in the request** → API returns opportunities from **all NAICS** (within the other filters).
    - **With `ncode`** (e.g. from a future filter or external integration) → API restricts to that NAICS (per SAM.gov’s behavior).

- **NAICS on the rows:**  
  Each opportunity can have a **`naicsCode`** in the response. The backend passes it through as-is (`naicsCode: o.naicsCode || ''`). So you see whatever NAICS SAM.gov returns for each notice; there is no server-side grouping or filtering by NAICS unless you add a call that sends `ncode`.

**Summary:**  
- **Data source:** SAM.gov Get Opportunities Public API v2 (live).  
- **What’s pulled:** Opportunity notices in the requested date range (and optional keyword/state/ptype), with no default NAICS filter.  
- **NAICS:** No fixed “group” of NAICS; all NAICS are included unless you pass `ncode`. The logic is: “if `ncode` is provided, send it to SAM.gov; otherwise do not filter by NAICS.”

---

## Request logic (what actually gets sent to SAM.gov)

1. **Required**
   - **postedFrom** / **postedTo** – Date range (MM/dd/yyyy).  
     Default if not provided: last 30 days (or last 364 days when “updated” filter is used).

2. **Optional (only if provided)**
   - **title** – Keyword search (from dashboard keyword or intent expansion).
   - **state** – Place of performance state.
   - **ptype** – Notice type filter (e.g. `o` for solicitation).
   - **ncode** – NAICS filter (not set by the current dashboard UI).
   - **rdlfrom** / **rdlto** – Response deadline range.

3. **Pagination**
   - **limit** – Page size (capped, e.g. up to 1000).
   - **offset** – Skip.

4. **After the API response**
   - Optional **“updated” filter** (updatedWithinDays or updatedFrom/updatedTo) is applied **in the backend** on the returned rows (by parsed date), because the public API does not support “updated” in the request.
   - Organization display name is shortened from the full hierarchy for the UI.

So: the **data source** is SAM.gov live opportunities; the **logic** is date range + optional keyword/state/ptype/ncode; and **NAICS** is “all” unless you explicitly pass `ncode`.
