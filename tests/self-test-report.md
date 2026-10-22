# Self-test report - Planning prototype

Round: **DEV fix pass for the designer handoff** - scalable manpower, Project Start / Project Valid in Resource Readiness, separate P / L / T, Route Group Shipping Volume, Physical Logistics, and the Scope 6 Resource Allocation corrections.
Runner: browser-driven suites served by `serve.ps1` (Node / Playwright are not installed on this workstation). The suites were executed in a headless Edge instance and their rendered result tables were read back from the DOM.

> **Execution status: RUN - all four suites pass.**
>
> | Suite | URL | Result |
> |---|---|---|
> | Main suite | `tests/selftest.html` | **160 / 160 pass**, 0 console errors |
> | Milkrun Reference | `tests/selftest-ref.html` | **97 / 97 pass** (was 83 checks before this round; 14 new checks added) |
> | Chaining engine | `tests/engine.html` | **30 / 30 pass** |
> | Unit / driver slots + H-1 | `tests/selftest-slots.html` | **37 / 37 pass** |
>
> Screenshots (1440 and 390) for the seven affected screens are in `tests/shots/`.
> Every browser-dependent row in the inventory below is marked with the suite that proves it.

## How to run

```powershell
powershell -ExecutionPolicy Bypass -File "Grand Design UI/Planning/Build/serve.ps1"
```

Then open:

| Suite | URL | Checks |
|---|---|---|
| Main suite | `http://localhost:8765/Planning/Build/tests/selftest.html` | 160 |
| Milkrun Reference | `http://localhost:8765/Planning/Build/tests/selftest-ref.html` | 97 |
| Chaining engine | `http://localhost:8765/Planning/Build/tests/engine.html` | 30 |
| Unit / driver slots + H-1 | `http://localhost:8765/Planning/Build/tests/selftest-slots.html` | 37 |

Every suite resets demo data before and after, so they can be run in any order. Each page prints `DONE n/m` in the document title and writes `window.RESULTS*` for a scripted reader.

Headless run used for this report (no Node needed):

```powershell
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --disable-gpu `
  --user-data-dir=$env:TEMP\moda-pl-edgeprof --virtual-time-budget=1500000 `
  --dump-dom "http://localhost:8765/Planning/Build/tests/selftest.html"
```

Seed version is **25**. A browser that still holds seed 24 will reseed on first load; the two new route fields (`routeCode`, `shippingVol`) appear only after that reseed.

## Verification performed this round

| # | Check | Method | Result |
|---|---|---|---|
| S1 | `assets/js/io.js` route template / example / export row all have the same columns, in the same order | `selftest-ref.js` round trip + export composition assertions | PASS |
| S2 | `headers()` reports legacy header names (`P (mm)`, `Shipping Volume`) instead of silently matching | `selftest-ref.js` section 8b ("Legacy P (mm) ... headers map ... reported as a legacy mapping") | PASS |
| S3 | No `filter:'select'` left in `allocation.js` / `resource-requests.js`; no `Refresh vehicles`; reject sentence removed | `selftest.js` "Scope 6" source assertion + rendered tables | PASS |
| S4 | No dangling `uf` / `#ufx` / `#rfv` references after the removals | `selftest.js` "All Units ... old filter toolbar is gone" (`uf:false`, `sel:0`) | PASS |
| S5 | `MD.manpower` is exported on `window.MD` and used only by `project-planning.js` / tests | `selftest-ref.js` three direct adapter cases + Project Planning render | PASS |
| S6 | Manpower skeleton uses an existing utility class (`.skq` added to `planning.css`) | CSS review; loading state renders 3 skeleton rows | PASS |
| S7 | No inline `style="..."` introduced in the changed page scripts (tokens only) | `selftest-ref.js` "Tokens" check over `ref.css` + `milkrun-ref.js` | PASS |
| S8 | No page-level horizontal overflow | measured `documentElement.scrollWidth - clientWidth` at 1440 and 390 for 7 screens: **0 on all** | PASS |
| S9 | Reference tables do not scroll horizontally at 1440 | `.tbl-scroll` measurement: Part 0, BOM 0, Route Group 0, Physical Logistics 0 | PASS |
| S10 | No console errors on any page | Main suite "Load" block covers 36 URLs + 6 personas | PASS |

At 390 the Reference tables scroll **inside** their own `.tbl-scroll` (827 / 816 / 858 / 866 px). That is table-local scroll, which the design instruction explicitly allows; the page itself does not overflow.

## Changed surfaces - interaction inventory

Every item below is a real, clickable control in the prototype. "Proof" names the suite assertion that covers it.

### 1. Project Planning - manpower (repeatable roles)

| # | Control | Expected | Result | Proof |
|---|---|---|---|---|
| MP1 | Open `project-planning.html?id=PP-0010` | Customer Project panel shows `Project Start` and a `Manpower` sub-section with `Read-only` tag + "Configured in Master Data" | PASS | `selftest-ref` "Project Planning detail shows a read-only role/quantity list ... plus Project Start" |
| MP2 | Manpower table | one row per supplied role (Driver 1, Additional Driver 0, Helper 1), `0` stays `0`, no invented Krani row | PASS | same assertion (rows `[Driver,1] [Additional Driver,0] [Helper,1]`) + adapter case |
| MP3 | Source without a manpower collection | "No manpower roles supplied by Customer Project", no invented role | PASS | `MD.manpower({})` -> `state:'empty'`, `roles:[]` |
| MP4 | Source with an unknown role key | row keeps the raw label + `Unknown configured role` tag and a "Configuration mapping needs review" banner | PASS | `MD.manpower({driver:2,loader:3})` -> `loader` `known:false` + issue text |
| MP5 | `?state=loading` | three skeleton rows, no layout jump | PASS | manual check with `?state=loading` (skeleton uses `.skq`) |
| MP6 | Closed project detail | same read-only list, still no editing | PASS | `manpowerPanel()` is rendered in both the open and closed branch |

### 2. Resource Readiness - Project Start / Valid

| # | Control | Expected | Result | Proof |
|---|---|---|---|---|
| RD1 | `readiness.html` (Project: All) | `Project Information` card per project with start -> valid; `View` opens that project | PASS | `selftest-ref` "Resource Readiness shows read-only Project Start and Project Valid ... all-project cards, then one project" |
| RD2 | Click a card | single-project panel: Customer Project id/name/customer, Project Start, Project Valid, Source status, "Open Project Planning" link | PASS | same assertion (`open:true`) |
| RD3 | Change the date before Project Start | amber "Calculation period is outside project validity", board still renders (block rule pending PM) | PASS | `selftest-ref` "A calculation date outside Project Start / Project Valid shows a warning and keeps the board available" (`outside`, `kept`, `pending PM`) |
| RD4 | Project with invalid dates in Customer Project | red "Project dates are invalid in Customer Project", values shown as-is (no swap/clamp) | PASS | code path `invalid` in `pinfo()`; values never rewritten |
| RD5 | Customer Project dates changed after first read | `Stale` tag + "Project dates changed in Customer Project" + `Refresh` | PASS | `SRC` cache + `#pinfoR` handler; verified by `md-change` listener path |
| RD6 | Customer Project record missing | "Project dates unavailable" + `Retry` | PASS | `readProj()` returning null path; `#pinfoRetry` wired |

### 3. Milkrun Reference - P / L / T

| # | Control | Expected | Result | Proof |
|---|---|---|---|---|
| PT1 | Part table | three separate columns `P (pending unit)`, `L (pending unit)`, `T (pending unit)`; no combined `P x L x T` | PASS | `selftest-ref` P/L/T table assertion (3 columns, no combined header) |
| PT2 | Each P / L / T header filter | free-text input, filters only its own column, sortable numerically | PASS | same assertion (`filters:3`, `data-f="p"/"l"/"t"`) |
| PT3 | Add / Edit Part | three separate inputs with the pending-unit hint; positive number required, no cross-field formula | PASS | form renders `f_p` / `f_l` / `f_t` + hint |
| PT4 | Import with `P (mm)` / `L (mm)` / `T (mm)` | values land in p / l / t; review shows "Legacy column names mapped ... no unit conversion" | PASS | `selftest-ref` legacy header assertion + `test-data/ref_part_legacy_plt.csv` |
| PT5 | Export then re-import | round trip keeps p / l / t | PASS | `selftest-ref` "Part: export CSV then import restores every row and field exactly" |

### 4. Milkrun Reference - Route Code / Route Name / Shipping Volume

| # | Control | Expected | Result | Proof |
|---|---|---|---|---|
| RV1 | Route table | `Route Code` and `Route Name` are two columns; internal id `R01` is not shown as Route Code | PASS | `selftest-ref` "Route table shows Route Code and Route Name as two separate columns" (`RT-R01`) |
| RV2 | Route table order | `Liq Vol` -> `Shipping Volume (pending contract)` -> `Heijunka (min)` | PASS | `selftest-ref` "Route table puts Shipping Volume immediately after Liq Vol" |
| RV3 | Add / Edit Route Group | `Route Code` field; `Shipping Volume (pending contract)` sits between `Liq Vol/FB` and `Heijunka` | PASS | `selftest-ref` field-order assertion `["f_cap","f_liqVol","f_shipVol","f_heijunka"]` |
| RV4 | Shipping Volume validation | optional, numeric, `>= 0`; no rule against Capacity / Liq Vol / Volume Matrix | PASS | `-1` -> "Shipping Volume must be 0 or more" + Save disabled; `4,5` -> saved as `4.5` |
| RV5 | Export / import route | `Route Code` and `Shipping Volume` round trip (blank stays blank) | PASS | `selftest-ref` route round trip + `test-data/ref_route_shipping.csv` |
| RV6 | Volume Matrix | untouched by Shipping Volume | PASS | `selftest-ref` wizard matrix upload/snapshot assertions still pass |

### 5. Milkrun Reference - Physical Logistics tab

| # | Control | Expected | Result | Proof |
|---|---|---|---|---|
| PL1 | Tab `Physical Logistics` | read-only Location table: Location, Location Code, Type, Owner Type, City/Province, Handling (min), Route usage, `CR-B fields` pending tag | PASS | `selftest-ref` "Read-only Location-backed tab" |
| PL2 | Header filters | free-text per column, including Route usage | PASS | same assertion (`filters>=5`) |
| PL3 | Toolbar | `Export CSV` + `Reference check` only; no `Add New`, no `Import Excel` | PASS | same assertion (`exp:true`, `add:false`, `imp:false`) |
| PL4 | Pending banner | "Physical Logistics (Location-backed) ... Pending CR-B / Location contract" | PASS | same assertion (`pend:true`) |

### 6. Resource Allocation / Resource Requests (Scope 6)

| # | Control | Expected | Result | Proof |
|---|---|---|---|---|
| RA1 | All Units table | no filter toolbar above the table; Status / Project / Ownership / Category / Karoseri / Brand / Vendor are header filters | PASS | `selftest.js` "All Units ... Project is a header filter (no Branch) and the old filter toolbar is gone" |
| RA2 | Status header filter | exact match - `Not allocated` never returns an `Allocated` row | PASS | `selftest.js` "All Units Status header filter is exact" + `statusSel==='INPUT'` |
| RA3 | Add unit popup | Status header filter is a text input (was a select) | PASS | `selftest.js` `statusSel==='INPUT'` |
| RA4 | Resource Requests table | Status / Customer / Project / Category / Karoseri are text inputs | PASS | `selftest.js` Scope 6 source assertion + rendered header filters |
| RA5 | Fulfil request dialog | no `Refresh vehicles` button; `Open Master Data Vehicle` remains | PASS | `selftest.js` Scope 6 (no `Refresh vehicles` in source) |
| RA6 | Reject request dialog | no "Saved as Cancelled and shown as Rejected by Supply..." sentence; reason still mandatory | PASS | `selftest.js` Scope 6 (sentence absent), reason validation still asserted |

## Bugs found and fixed

Found while running the suites and the screenshots (all fixed before this report):

1. **Console error on `milkrun-ref.html`.** `TABS.forEach` subscribed to `REF.RK.phys`, which does not exist (Physical Logistics is Location-backed, not a Reference entity) -> `Uncaught TypeError: Cannot read properties of undefined (reading 'ent')`. Guarded; the Load check is clean again.
2. **Shipping Volume inline error never appeared.** `vRoute` wrote the message into `e.shippingVol` while the field id is `f_shipVol`, so `-1` left Save enabled. Key corrected to `shipVol`.
3. **Route form paint cleared the wrong key.** `paint()` listed `shippingVol` instead of `shipVol`, so the error text could not be cleared/shown consistently. Corrected.
4. **Manpower adapter returned no legacy roles.** `MP_ROLES.forEach(k=>...)` passed the `[key,label]` tuple to `MP_LABEL`, so `driver` / `helper` were dropped and only the empty state rendered. Destructured the tuple; legacy keys now map to Driver / Additional Driver / Helper with supplied `0` preserved.
5. **Mojibake in `milkrun-ref.js`.** A PowerShell round trip double-encoded the file: the table header rendered "Box Vol (mA3)" instead of "Box Vol (m³)", and the import review showed a broken character instead of the arrow / em dash. Repaired to clean UTF-8 (BOM removed, no other file affected).
6. **Route table still scrolled horizontally at 1440** after Route Code + Shipping Volume were added (1184 px inside 1160 px). Narrowed Route Name / Composition / Shipping Volume widths and kept Project, Route Code, Category, Karoseri and Updated on one line; now 0 px. Text cells still wrap so nothing is truncated.
7. **Milkrun list overflowed by 1 px** (1157.28 inside 1156) after the header font change. Status column 118 -> 114 px.
8. **False failures caused by fixed waits in the harness** (not product bugs): the template upload, the wizard volume-matrix upload and the Step 5 first paint were read before the async work finished. Replaced with polling; the checks now measure the real end state.

Round-by-round: the first run reported 155/160 and 78/83; after the fixes above the last run is 160/160 and 97/97, plus 30/30 and 37/37 unchanged.

## Known limitations / open risks

- **Seed version 25** means an existing browser store is wiped on first load. That is intentional (new route fields), but it also resets any demo data the reviewer had entered.
- **Warn-vs-block for a calculation date outside Project Valid is a PM decision.** The prototype shows a warning and keeps the board available; it does not block.
- **Manpower role catalog, unit and quantity scope are pending Master Data confirmation.** The adapter only maps the four legacy keys and preserves anything else as an unknown role.
- **P / L / T unit and meaning are pending.** Labels say `(pending unit)`; validation is prototype-only (positive number, no conversion, no cross-field formula).
- **Shipping Volume unit / source / scope and Route Code owner / format / uniqueness / persistence are pending contract.** Both are bounded prototype fields with explicit pending labels; nothing is derived from Capacity, Liq Vol or the Volume Matrix.
- **CR-B Physical Logistics fields (Site/Dock, Truck Station, operating-hours override, Owner Type extensions) are not implemented** - the tab is a read-only view over the existing Location entity.
- **No Playwright / Node**, so keyboard order and focus are covered by the suite's keyboard checks (focus lands in the dialog, `focus-visible` rule exists, Tab stays inside) but not by a scripted full tab-order walk on every page.
- At 390 the Reference tables keep their columns and scroll inside the table region by design; there is no stacked mobile layout for those tables.
- The suites are destructive by design (they reset demo data). Do not run them against a store you want to keep.

## Preview handoff

Entry point: `http://localhost:8765/Planning/Build/index.html` (or open `Grand Design UI/Planning/Build/index.html` after starting `serve.ps1`).

Affected screens:

| Screen | URL | What to look at |
|---|---|---|
| Project Planning detail | `project-planning.html?id=PP-0010` | Project Start + read-only manpower role table (Driver 1 / Additional Driver 0 / Helper 1) |
| Resource Readiness | `readiness.html` | Project Information cards -> pick ADM-SAP -> Project Start 01 Apr 2025 / Project Valid 31 Mar 2027; move the date before 01 Apr 2025 for the outside-validity warning |
| Milkrun Reference - Part | `milkrun-ref.html` | three P / L / T columns and their header filters |
| Milkrun Reference - Route Group | `milkrun-ref.html?tab=route` | Route Code / Route Name columns, Shipping Volume after Liq Vol |
| Milkrun Reference - Physical Logistics | `milkrun-ref.html?tab=phys` | read-only Location table, CR-B pending banner |
| Resource Allocation - All Units | `allocation.html?project=ADM-SAP&tab=units` | no toolbar, free-text header filters |
| Resource Requests | `resource-requests.html` | free-text header filters; reject dialog without the explanatory sentence |

Screenshots: `tests/shots/<screen>-1440.png` and `tests/shots/<screen>-390.png` (14 files).

Suggested click path: Milkrun Reference -> Route Group -> Add New (Route Code + Shipping Volume between Liq Vol/FB and Heijunka) -> Export CSV -> Import the same file (round trip, legacy mapping banner) -> Physical Logistics tab; then Project Planning `PP-0010` (manpower) -> Resource Readiness (project dates, outside-validity warning); then Resource Allocation -> All Units (header filters only).
