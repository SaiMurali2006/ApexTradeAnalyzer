# ApexTradeAnalyzer — CLAUDE.md

> **Purpose.** This is the canonical spec for **ApexTradeAnalyzer**, a local-first web app that ingests trade-log data and renders a TradesViz-class analytics experience — PnL calendar, equity curves, 70+ interactive charts, and ~100 statistics — wrapped in the **Apex design language** (ported from the desktop spec in `otherCLAUDE.md`).
>
> Treat this file as a contract. The product target is *TradesViz feature parity for a single local user*; the visual target is *Apex, verbatim, translated to the web*. If you ship something that drifts from either, you've drifted.
>
> **Ignore everything in `otherCLAUDE.md` except its UI/UX design system** (color/typography/shape/border/spacing/animation/component rules). That document describes a different application (a WPF desktop authenticator/password manager); only its *design language* carries over here. The WPF/XAML/C# implementation details do **not** — we re-express the same design language in CSS/TS for the web (see §6).

---

## 1. Product Goal

A user drops in trade-log data (CSV export from a broker, or manual entry) and immediately sees a beautiful, dense, interactive analytics dashboard that explains their trading edge. No accounts, no cloud, no telemetry. Everything runs locally in the browser; data never leaves the machine.

Three pillars, in priority order:

1. **Ingest** — robust CSV import that reconstructs *trades* from raw *executions* (fills), plus manual add/edit.
2. **Analyze** — the full TradesViz-style metric and chart surface (§4, §5).
3. **Delight** — the Apex design language (§6): accent-threaded neutral surfaces, light/dark/system theming, and bouncy-on-interaction motion.

Non-goals (for now): live broker auto-sync, real-time quotes, multi-user, server persistence, social features, paid tiers.

---

## 2. Tech Stack

Local-first, zero-backend by default. The entire app is a static SPA that can be opened from `file://` or served by `vite preview`.

| Layer | Choice | Why |
|---|---|---|
| Build/dev | **Vite** | Fast HMR, trivial static build for local use |
| Language | **TypeScript** (strict) | Type-safe trade math; no silent unit/sign bugs |
| UI | **React 18** | Component model fits the widget-heavy dashboard |
| Charts | **Apache ECharts** (via `echarts-for-react`) | Covers all required chart types (candles, calendar heatmap, box plots, distributions, equity curves), themeable, performant on large datasets |
| Calendar heatmap | ECharts `calendar` series (primary) | Native PnL-calendar coloring + tooltips |
| CSV parsing | **PapaParse** | Streaming parse of large broker exports |
| Local storage | **IndexedDB** via **Dexie** | Persist trades/executions/tags/settings on-device; survives reload |
| State | **Zustand** | Light global store (theme, filters, active dataset) |
| Dates | **dayjs** (UTC plugin) | All trade timestamps handled in UTC, displayed in user TZ |
| Money math | integer **cents/ticks** + a tiny `Money` helper | Never do PnL math in floating-point dollars |
| Routing | **React Router** | `/dashboard`, `/calendar`, `/trades`, `/charts`, `/import`, `/settings` |

> If a Node backend is ever needed (e.g. SQLite for very large datasets), keep it optional and additive — the client-only path must always work. Prefer **DuckDB-WASM** over a server for heavy aggregation before reaching for Node.

**Conventions**
- Strict TS. No `any` in domain code (trade math, stats, importers).
- All money as integer minor units; format only at the view boundary.
- All timestamps stored UTC ISO-8601; convert at display time.
- Pure functions for every statistic (input: `Trade[]` → output: number). Each stat is independently unit-tested.
- No comments except for non-obvious finance math (R-value sign conventions, futures tick value, options multiplier).

---

## 3. Domain Model

The core import problem: brokers export **executions** (individual fills); users think in **trades** (round-trips). The importer groups executions into trades.

```ts
// Models/types.ts
type AssetType = 'stock' | 'future' | 'option' | 'forex' | 'crypto' | 'index';
type Side = 'long' | 'short';

interface Execution {
  id: string;
  symbol: string;
  assetType: AssetType;
  account: string;
  timestamp: string;        // UTC ISO-8601
  action: 'buy' | 'sell';
  quantity: number;         // contracts/shares (always positive)
  price: number;            // minor units (cents) or ticks
  commission: number;       // minor units
  fees: number;             // minor units
  raw?: Record<string, string>; // original CSV row, for audit
}

interface Trade {
  id: string;
  symbol: string;
  assetType: AssetType;
  account: string;
  side: Side;
  openDate: string;         // UTC ISO
  closeDate: string | null; // null if still open
  executions: Execution[];
  // derived (computed, cached):
  qty: number;              // max position size
  avgEntry: number;
  avgExit: number | null;
  grossPnl: number;         // minor units
  netPnl: number;           // gross − commission − fees
  commission: number;
  fees: number;
  returnPct: number;
  durationMs: number | null;
  // optional / user-supplied risk inputs:
  stopLoss?: number;
  profitTarget?: number;
  rValue?: number;          // netPnl / risk(stop)
  // intratrade analytics (require price series; optional):
  priceMAE?: number;        // max adverse excursion
  priceMFE?: number;        // max favorable excursion
  maxRunningPnl?: number;
  minRunningPnl?: number;
  // qualitative:
  tags: string[];
  setup?: string;
  mistakes?: string[];
  notes?: string;
  rating?: number;          // 1–5 self-grade
}
```

**Trade reconstruction rules**
- Group executions by `(symbol, account, assetType)`, ordered by timestamp.
- A trade opens when position goes from flat → nonzero, and closes when it returns to flat. A reversal (long→short in one fill) closes the old trade and opens a new one.
- `side` = direction of the opening fill.
- Net PnL accounts for the asset multiplier: stocks ×1, options ×100 (configurable per contract), futures × tick-value (per-symbol table). **This is the #1 place to get sign/scale wrong — unit-test it per asset type.**

---

## 4. Statistics Surface (TradesViz parity)

All single-number stats live in an **Overall Statistics** panel and are also available as dashboard widgets. Every stat is a pure function over a (filtered) `Trade[]`. Group them exactly like TradesViz:

**Performance**
- Net PnL, Gross PnL, Total commission, Total fees
- Win rate (hit ratio), Loss rate, Breakeven count
- Profit factor = gross profit / gross loss
- Trading expectancy = (avgWin × winRate) − (avgLoss × lossRate)
- Win/loss ratio = avgWinner / avgLoser
- Adjusted win/loss ratio = (avgWinner × %winners) / (avgLoser × %losers)
- Gain-to-pain ratio
- Avg win, Avg loss, Largest win, Largest loss, Avg trade PnL
- Total trades, Total volume, Trades/month, Volume/month
- Best/worst ticker by PnL

**Risk-adjusted (daily-PnL series based)**
- Sharpe ratio (annualized), Sortino ratio, Calmar ratio
- Omega ratio, Ulcer Performance Index, Recovery factor
- CAGR

**Volatility & drawdown**
- Max drawdown (peak-to-trough on equity curve), drawdown duration
- Std dev of PnL / profit / loss
- Max consecutive wins, Max consecutive losses
- Kelly criterion, System Quality Number (SQN), Tail ratio
- R-Value (Van Tharp; needs stop), Unrealized R-Value

**Duration / activity**
- Avg hold time (all / winners / losers), total win/loss duration
- Positive PnL time vs negative PnL time

> Reference for exact definitions: TradesViz statistics docs. Keep a `STATS.md` mapping each metric → formula → unit test once implemented.

---

## 5. Views & Charts

Routes and what each must contain.

### 5.1 `/dashboard` — Overview
Customizable widget grid (start with a sensible default layout; allow add/remove/rearrange later). Default widgets:
- Net PnL (big number) + sparkline, win rate gauge, profit factor, expectancy, # trades.
- **Equity curve** (cumulative net PnL over time) with optional benchmark index overlay and max-drawdown shading.
- Mini PnL calendar (current month).
- Top tags / setups by PnL.
- Recent trades table (last 10).

### 5.2 `/calendar` — PnL Calendar  *(headline feature)*
- Month grid; each day cell colored by net PnL (green gradient profit, red gradient loss, neutral flat), showing PnL amount + trade count.
- Click a day → drill into that day's trades.
- Week summary column (weekly PnL) on the right.
- Year heatmap view toggle (ECharts calendar series).
- Honors the active accent: profit/loss use semantic green/red, but selection/hover/focus rings use `--accent`.

### 5.3 `/trades` — Trades Table
- Dense, sortable, filterable table with the TradesViz column set (symbol, open/close, side, qty, avg entry/exit, gross/net PnL, %return, commission, fees, duration, R-value, MAE/MFE, best-exit, tags, rating, notes).
- Column show/hide + persisted layout.
- Row click → **trade detail drawer**: execution list, per-trade chart (price with entry/exit markers if a price series is available), running-PnL curve, MAE/MFE, notes/tags editor.
- Global filter bar (date range, symbol, account, asset type, side, tags, win/loss) — drives every view.

### 5.4 `/charts` — Analytics
Interactive, click-to-filter charts. Minimum set:
- PnL distribution (histogram), Returns distribution (R-multiples histogram).
- PnL by day-of-week, by hour-of-day, by month (bar).
- PnL by tag / setup / symbol / account (bar, sortable).
- Win rate vs hold time (scatter/box).
- **MAE/MFE scatter** (price excursion vs outcome) — a TradesViz signature chart.
- Cumulative PnL by symbol (small multiples).
- Drawdown curve.
- Duration box plots (winners vs losers).
All charts: hover tooltip, click a series/segment to push a filter into the global filter bar.

### 5.5 `/import` — Importer
- Drag-drop **CSV** and **`.tlg`** (TradeLog) files. Auto-detect file type by extension + content sniff, then route to the matching parser (§5.5.1, §5.5.2).
- CSV: auto-detect common broker layouts; fall back to a column-mapping UI (map CSV columns → `Execution` fields).
- Preview reconstructed trades before commit; show parse warnings (unmatched fills, missing close).
- Persist a saved mapping per broker so re-imports are one click.
- Support multiple accounts; dedupe on re-import by execution hash.

#### 5.5.1 TradeLog `.tlg` format
`.tlg` is the **Interactive Brokers "Third-Party TradeLog"** export (IB → *Performance & Reports → Third-Party Reports → TradeLog*). It is a single-export-per-365-days file consumed by TradeLog Software; we parse it into our `Execution[]`.

Structure (verified against the IB layout):
- **Delimiter:** pipe `|`. One record per line. **16 columns** (indices 0–15).
- **Skip rows:** first ~5 lines are header/metadata sections; the final line is a footer/trailer. Don't trust a fixed skip count blindly — detect the data rows by the presence of a symbol in col 2 and a valid record `Code` in col 6, and skip everything else (header sections such as `ACCOUNT_INFORMATION` / `ACT_INF`, the `STK_TRD` / `STOCK_TRANSACTIONS` / `OPTION` section markers, and the trailer).
- **Columns we keep** (0-based index → field):

  | Idx | Field | → `Execution` |
  |---|---|---|
  | 1  | `ID`       | `id` (broker execution id; use for dedupe) |
  | 2  | `Symb`     | `symbol` |
  | 6  | `Code`     | record type (see below) |
  | 8  | `DateTime` | `timestamp` (parse to UTC ISO-8601) |
  | 10 | `Shares`   | `quantity` (sign encodes buy/sell — see below) |
  | 12 | `Price`    | `price` (→ minor units) |
  | 13 | `Pos`      | resulting position (sanity-check reconstruction) |
  | 14 | `Comm`     | `commission` (→ minor units; usually negative in file) |

  Indices `0,3,4,5,7,9,11,15` are discarded.

- **Record-type `Code` (col 6):**
  - `O` — opening execution.
  - `C` — closing execution.
  - `C;O` — a single fill that *closes* the current position and *opens* a new one (reversal). **Split this into two `Execution`s** (one close, one open) so §3 trade reconstruction stays clean.
- **Action / side:** derive `action` (`buy`/`sell`) from the sign of `Shares` (and corroborate with `Code` + `Pos`): positive shares = buy, negative = sell. Store `quantity` as the absolute value.
- **Asset class:** infer from the active section marker (`STK_TRD`/`STOCK_TRANSACTIONS` → `stock`, `OPTION` → `option`, etc.) and/or symbol shape; default `stock` if ambiguous, flag a warning.
- **Caveats:** values are floats in the file → convert to integer minor units immediately (§2 money rule). Commissions are typically signed; normalize to a positive magnitude in `commission`. A `.tlg` already represents *matched* trades, but we still reconstruct from executions ourselves (don't trust the file's matching) so a single code path serves both CSV and `.tlg`.

Parser lives at `src/import/parseTlg.ts`; it emits `Execution[]` + warnings, identical shape to the CSV parser output, then flows through the same `reconstructTrades` → preview → persist pipeline.

#### 5.5.2 Generic CSV
PapaParse → column-mapping UI / broker auto-detect → `Execution[]`. Same downstream pipeline as `.tlg`.

### 5.6 `/settings`
- Theme (mode + accent — see §6.2), base currency, timezone, asset multipliers / futures tick-value table, default starting balance (for %-return and equity curve), data export/wipe (download JSON / clear IndexedDB).

---

## 6. Apex Design Language (Web Port)

This is `otherCLAUDE.md` §§1–10 re-expressed for the web. Same *feel*, web-native *mechanism*. Philosophy is unchanged:

1. **Surfaces are neutral; the accent threads through.** Every surface is a *mix of the user's accent with a neutral base* — never a hardcoded hue. The unmixed accent is reserved for interactive elements: primary buttons, links, focus rings, active states, key numeric values, progress/equity highlights, the logo badge.
2. **Light / Dark / System + a user-configurable accent**, persisted locally.
3. **Quiet by default, alive on interaction.** Resting state is calm; hover/press/commit earn springy motion with a tiny overshoot. Bounce is the Apex signature.

### 6.1 Mechanism: CSS custom properties + `color-mix()`

The desktop `Surface(accentPct, lift)` formula maps **exactly** onto CSS `color-mix()`. Define everything from two inputs: `--accent` and the active mode's `--base` / `--inverse`.

```css
:root {
  /* user inputs */
  --accent: #7C73FF;                /* persisted; default Apex violet */

  /* dark mode bases (default) */
  --base: #0A0B10;
  --inverse: #ffffff;

  /* Surface(accentPct, lift): mix accent into base, then lift toward inverse.
     Implemented as a 2-stage color-mix. accentPct & lift are per-token. */
  /* token = color-mix(in srgb, var(--inverse) <lift%>,
                          color-mix(in srgb, var(--accent) <accentPct%>, var(--base))) */

  --bg:            color-mix(in srgb, var(--inverse)  0%, color-mix(in srgb, var(--accent) 3%,  var(--base)));
  --bg-alt:        color-mix(in srgb, var(--inverse)  0%, color-mix(in srgb, var(--accent) 2%,  var(--base)));
  --panel:         color-mix(in srgb, var(--inverse)  3%, color-mix(in srgb, var(--accent) 5%,  var(--base)));
  --card:          color-mix(in srgb, var(--inverse)  4%, color-mix(in srgb, var(--accent) 4%,  var(--base)));
  --card-hover:    color-mix(in srgb, var(--inverse)  8%, color-mix(in srgb, var(--accent) 8%,  var(--base)));
  --input:         color-mix(in srgb, var(--inverse)  0%, color-mix(in srgb, var(--accent) 3%,  var(--base)));
  --line:          color-mix(in srgb, var(--inverse)  8%, color-mix(in srgb, var(--accent) 8%,  var(--base)));
  --line-soft:     color-mix(in srgb, var(--inverse)  5%, color-mix(in srgb, var(--accent) 5%,  var(--base)));

  /* accent-derived */
  --accent-alt:    color-mix(in srgb, white 18%, var(--accent));     /* lifted accent: outlines/glow */
  --accent-soft:   color-mix(in srgb, var(--inverse) 4%, color-mix(in srgb, var(--accent) 18%, var(--base)));
  --accent-subtle: color-mix(in srgb, var(--inverse) 2%, color-mix(in srgb, var(--accent) 8%,  var(--base)));

  /* fixed-per-theme text/semantic */
  --text:   #F1F3F8;
  --muted:  #8C90A2;
  --danger: #FF5C78;            /* also used for losses */
  --danger-soft: #361822;
  --profit: #34D399;            /* semantic green for PnL up; loss uses --danger */
  --profit-soft: #0E2A22;

  /* shape, motion, type tokens (see below) */
}

:root[data-mode='light'] {
  --base: #ffffff;
  --inverse: #14151F;
  --panel:  color-mix(in srgb, var(--inverse) 0%, color-mix(in srgb, var(--accent) 0%, var(--base))); /* pure white */
  --card:   color-mix(in srgb, var(--inverse) 0%, color-mix(in srgb, var(--accent) 0%, var(--base)));
  --bg:     color-mix(in srgb, var(--inverse) 3%, color-mix(in srgb, var(--accent) 7%, var(--base)));
  --text:  #16171F;
  --muted: #6E7188;
  --danger:#D63255;  --danger-soft:#FBE3E9;
  --profit:#0E9F6E;  --profit-soft:#E3F9F0;
}
```

> **`color-mix` weight note:** the desktop formula `mix(a, b, bWeight=0.96)` = "96% b, 4% a". In CSS `color-mix(in srgb, A x%, B)` puts `x%` of A and `(100−x)%` of B. The token table values above already translate the desktop §3.2 `Surface(accentPct, lift)` numbers into CSS percentages. Keep the **same nesting**: accent-into-base first, then lift toward inverse.

**Auto-contrast (`--on-accent`).** Never hardcode white text on the accent — the user may pick amber/mint. Compute per-accent:
```
luminance = 0.299·R + 0.587·G + 0.114·B
--on-accent = luminance ≥ 150 ? #10111A : #ffffff
```
Apply to primary-button text, logo glyph, active-segment text, anything drawn directly on `--accent`. Same idea for `--on-danger` / `--on-profit`.

### 6.2 Theme system (web)
- Modes `light | dark | system`; accent = 6-digit hex. Persist `{ mode, accent }` to `localStorage` (`apex.theme`).
- `system` follows `window.matchMedia('(prefers-color-scheme: dark)')` and re-applies on `change`.
- Theme is applied by setting `data-mode` on `<html>` and `--accent` inline on `:root`; all tokens recompute automatically because they're `var()`-derived. No JS palette recomputation needed beyond `--accent` and `--on-*`.
- Entry point: the **logo badge** in the top-left of the app shell opens a theme popover — segmented mode control + 8 preset accent swatches (violet, azure, teal, green, amber, coral, magenta, neutral) + hex input.

### 6.3 Typography
- Font stack: `"Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, sans-serif`. Monospace (numbers, prices, symbols, hex): `"Cascadia Code", "Cascadia Mono", Consolas, ui-monospace, monospace`. **Do not introduce other fonts** (no Inter/Roboto/SF).
- **Body is bold by default**; hierarchy steps *up* in weight, never down. Map the desktop weight scale: body `700`, section/eyebrow labels `800` (uppercased), card titles & key values `800`, dialog/page titles & empty-state headings `900`. Never use `400`/`300`.
- Size scale (rem, 16px root): `0.625` (eyebrow chips), `0.6875` (tagline), `0.75` (card label / segmented), `0.8125` (toast/body small), `0.875` (inputs/buttons), `1.125` (app/section title), `1.1875` (dialog title), `1.375` (page/empty-state heading), `1.625` (hero numeric value — big PnL, equity figure, monospace).
- **All numeric/financial values render in the monospace stack** with `font-variant-numeric: tabular-nums` so columns align.

### 6.4 Shape (border-radius)
Strict scale — never invent radii. `18` app shell / outer; `14` panels, cards, dialogs, chart cards; `12` buttons, inputs, table containers, toast, logo badge; `10` icon buttons, segmented container, swatches-row; `8` pills/chips/segments/color swatches; `6` progress/equity track. **Nesting rule:** inner radius < parent radius.

### 6.5 Border hierarchy (3-tier)
- **Defining** `--line`: app shell outer, dialog shell, input focus (focus → `--accent`).
- **Subtle** `--line-soft`: cards, panels, chart cards, table rows, any nested surface.
- **None**: inner containers that rely on `--input`/background contrast (don't nest 3 visible borders).
- **Accent** `--accent`: toasts, focused inputs, active calendar day. **Accent-soft** `--accent-soft`: card hover. A child border is always softer than its parent's, or none.

### 6.6 Spacing
Scale in px: `2` hairline · `4` micro · `6` · `8` card gap / label→title · `12` shell outer / header padding · `14` panel padding · `16` toast/dialog content · `18` · `20` dialog shell · `22` hero card padding. Rule: outer surfaces 12–14, content padding 18–22, micro-gaps 2–8.

### 6.7 Motion (the Apex signature)
Bouncy release; snappy press. No linear easing, no overshoot > ~520ms. Define reusable easings:
```css
:root {
  --ease-press: cubic-bezier(0.4, 0, 1, 1);          /* press-down, ~70–80ms */
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);  /* BackEase-like single overshoot */
  /* ElasticEase has no CSS cubic-bezier equivalent → use Web Animations API keyframes
     for window/dialog/toast/card entrances when a two-oscillation spring is wanted. */
}
```
- **Buttons:** press scales to `0.9` (icon buttons `0.8–0.85`) on `--ease-press`, springs back on `--ease-bounce` (~360ms).
- **Cards:** hover lifts `translateY(-3px)` (`--ease-bounce`, 260ms); entrance fades + slides up 14px with a two-oscillation spring (~520ms via WAAPI); on data refresh a key value pulses opacity `1→0.25→1` + scale `1→1.14→1`.
- **Dialogs / toasts:** scale `0.86→1` + fade, spring settle ~500ms; toast bottom-center, auto-dismiss ~1.6s.
- **Calendar/chart cells:** subtle hover lift + accent ring; no twitch at rest.
- Respect `prefers-reduced-motion: reduce` → drop transforms, keep instant opacity. **Every interactive element animates; a static interactive element feels broken in Apex.**

### 6.8 Focus & scrollbars
- **Focus ring:** 1.5px dashed `--accent` at ~3px offset, radius 14, opacity 0.85 — on every focusable control. Never the browser default outline.
- **Scrollbars:** slim 10px, transparent track, thumb = `--line` @ 0.75 opacity, radius 4, 2px inset; hover → `--accent` @ 0.9; active → `--accent-alt`. Style via `::-webkit-scrollbar*` and `scrollbar-color` for Firefox.

### 6.9 Iconography
Stroke-based vector SVG only — never Unicode glyphs. Design on a 16×16 viewBox, `stroke-width: 1.5`, round caps/joins, `fill: none`, `stroke: currentColor` so icons follow theme via text color. Display 14–16px in chrome buttons, 28px+ in empty states. App identity badge: solid `--accent` rounded square (r≈12), 1.4px `--accent-alt` ring, faint top highlight, the letter **A** centered in `--on-accent`.

### 6.10 Component checklist (build these as themed React components)
`AppShell` (outer r18 + web header), `LogoBadge` + `ThemePopover`, `Card` / `StatCard` (hero numeric value variant), `GhostButton` / `PrimaryButton` / `IconButton`, `Input` / `Select` with accent focus + in-field `InlineIconButton`, `Pill`/`Chip` (eyebrow + tags), `Dialog` (`DialogBase` equivalent), `Toast`, `SegmentedControl`, `DataTable` (sticky header, themed scrollbar), `ChartCard` (wraps ECharts with an Apex theme), `EmptyState`. All consume CSS tokens only.

### 6.11 ECharts theming
Register one Apex ECharts theme that reads the CSS tokens at runtime (`getComputedStyle(document.documentElement)`): axis/grid lines → `--line-soft`, text → `--text`/`--muted`, default series → `--accent` / `--accent-alt`, profit/loss → `--profit`/`--danger`, tooltip surface → `--panel` with `--line` border and r14, font = the Apex stacks. Re-apply the theme on theme change (mode/accent swap) so charts follow the palette.

### 6.12 Anti-patterns (don't ship these)
- ❌ Hardcoding a hex color in a component (`#7C73FF`, `background:#fff`). Use a token.
- ❌ `color: white` on an accent surface — use `--on-accent`.
- ❌ Three nested visible borders.
- ❌ A radius outside `{18,14,12,10,8,6}`.
- ❌ A new font family, or `font-weight` below `700` for body.
- ❌ Linear-eased or >600ms animations; static interactive elements.
- ❌ PnL math in floating-point dollars, or ignoring asset multiplier / sign.
- ❌ Sending data anywhere off-device.
- ❌ Unicode-glyph icons.

---

## 7. Project Layout

```
ApexTradeAnalyzer/
├─ index.html
├─ vite.config.ts
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx                  # router + AppShell
│  ├─ theme/
│  │  ├─ tokens.css            # §6.1 CSS custom properties (light/dark)
│  │  ├─ ThemeProvider.tsx     # mode/accent state, persistence, system listener
│  │  ├─ onAccent.ts           # luminance auto-contrast
│  │  └─ echartsApexTheme.ts   # §6.11
│  ├─ components/              # §6.10 themed primitives
│  ├─ views/
│  │  ├─ Dashboard.tsx  Calendar.tsx  Trades.tsx  Charts.tsx  Import.tsx  Settings.tsx
│  ├─ domain/
│  │  ├─ types.ts              # §3 models
│  │  ├─ reconstructTrades.ts  # executions → trades (unit-tested per asset type)
│  │  ├─ multipliers.ts        # stock×1 / option×100 / futures tick table
│  │  └─ money.ts              # integer-minor-unit helpers + formatting
│  ├─ stats/                   # §4 — one pure fn per metric + *.test.ts
│  ├─ import/
│  │  ├─ parseCsv.ts           # PapaParse wrapper → Execution[]
│  │  ├─ parseTlg.ts           # IB TradeLog .tlg (pipe-delimited) → Execution[] (§5.5.1)
│  │  ├─ mappings.ts           # saved per-broker column maps
│  │  ├─ detectFileType.ts     # ext + content sniff → csv | tlg
│  │  └─ detectBroker.ts
│  ├─ store/                   # Dexie (IndexedDB) + Zustand filter/UI state
│  └─ lib/                     # dates, formatting, hashing (dedupe)
├─ CLAUDE.md
└─ STATS.md                    # metric → formula → test (created during build)
```

**Code conventions:** strict TS, pure stat functions, integer money, UTC storage, no `any` in `domain/`/`stats/`/`import/`, comments only for non-obvious finance math. Every statistic and the trade reconstructor ship with unit tests before they're wired into a view.

---

## 8. Build Order (suggested)

1. Scaffold Vite+React+TS; drop in `theme/tokens.css` + `ThemeProvider` + `LogoBadge`/`ThemePopover`. Verify light/dark/system + accent swatch all recolor the shell live.
2. Domain: `types`, `money`, `multipliers`, `reconstructTrades` + tests.
3. Import view: CSV → executions → trades preview → persist to IndexedDB.
4. Trades table + global filter bar + trade detail drawer.
5. Stats library (§4) + Overall Statistics panel; `STATS.md`.
6. Equity curve + Dashboard widget grid.
7. PnL Calendar (month + year heatmap, drill-in).
8. Charts view (distributions, time-of-day/day-of-week, tag/setup, MAE/MFE scatter, drawdown).
9. Apex motion polish pass (entrances, hover lifts, press springs, value-refresh pulse) + ECharts Apex theme + reduced-motion.
10. Settings (currency, TZ, tick-value table, export/wipe).

---

## 8b. Roadmap / Planned Goals

Beyond the shipped core (steps 1–10), these are the next intended features. Keep the same conventions: integer money, UTC storage + exchange-tz bucketing, pure stat functions, token-only styling, local-first.

### High priority (requested)

1. **Trade Republic import.** Add a TR importer alongside `.tlg`/CSV. TR exports are PDF account statements (and per-execution data) rather than a clean fills CSV — so:
   - Parse the TR statement/CSV into `Execution[]` (symbol via ISIN→ticker mapping, EUR amounts → minor units, buy/sell, qty, price, order fee).
   - Handle TR specifics: ISIN identifiers (maintain an ISIN→symbol map; fall back to ISIN as the symbol), EUR base currency, fractional shares, and TR's `Sparplan`/savings-plan executions.
   - Route through `detectFileType` → `parseTradeRepublic.ts` → existing `reconstructTrades` → preview → persist pipeline. Save a per-broker column/field mapping like the CSV path.

2. **Cash flows: deposits & withdrawals.** Introduce a `CashFlow` record (`{ id, date, type: 'deposit'|'withdrawal', amount, account, note }`, amount in minor units, UTC date) persisted in its own Dexie table.
   - **Starting balance becomes the seed** of an *account-balance* curve = startingBalance + Σ(cash flows) + Σ(realized PnL) over time.
   - **Mark deposits/withdrawals on the equity/balance curve** as ECharts `markPoint`/`markLine` annotations (green ▲ deposit, amber ▼ withdrawal) with tooltips.
   - Surface them everywhere relevant: on the **PnL calendar** (a small cash-flow badge on the day), in **Settings** (manage cash flows: add/edit/delete + import from broker), and in **% return / CAGR / drawdown** math (true time-weighted vs simple return — offer both; deposits must not count as "profit").
   - Add a dedicated **Cash flow** view or a section in Settings to CRUD them, plus auto-detect deposits/withdrawals from broker imports where present.

3. **True return metrics with external flows.** Once cash flows exist, compute **time-weighted return (TWR)** and **money-weighted return (IRR/XIRR)** so deposits/withdrawals don't distort performance. Show account balance over time (not just cumulative trade PnL), and base drawdown % on balance.

### Medium priority (worth doing)

4. **Tags / setups / notes editing** in the trade drawer, with persistence — then **tag & setup analytics** (PnL/win-rate by tag, already stubbed in `breakdowns.byTag`). Per-trade rating (1–5) and mistake tags feed a "leak finder" report.
5. **Benchmark overlay** — compare the equity curve against an index (e.g. SPY/QQQ) to see if you're beating the market. Needs an optional price-series source (manual paste or a local CSV of index closes to stay offline-friendly).
6. **MAE/MFE analytics** — the TradesViz signature scatter. Requires intratrade price data (per-trade OHLC around the hold). Add an optional price-series import so `priceMAE`/`priceMFE`/running-PnL can populate the drawer chart and the MAE/MFE scatter.
7. **Goals & targets** — daily/weekly/monthly P&L or win-rate goals with progress widgets on the dashboard and a streak tracker.
8. **Reports** — monthly/weekly summary cards; printable/exportable PDF or PNG of the dashboard.
9. **Multi-account / consolidated view** — per-account filtering exists; add a combined net-worth/balance roll-up across accounts.
10. **More broker presets** — saved auto-detect mappings for common brokers (Schwab, IBKR Flex CSV, Webull, Tastytrade, Binance) so import is one click.

### Lower priority / nice-to-have

11. **PWA / offline install** — installable app, offline cache (already local-first; add a manifest + service worker).
12. **CSV/Excel export** of trades & stats (JSON export already exists).
13. **Trade screenshots/attachments** stored in IndexedDB (chart snapshots per trade).
14. **Position-sizing & risk calculator** (R-based) and a risk-of-ruin estimate.
15. **Underwater (drawdown duration) chart** and rolling-metric charts (rolling win rate / expectancy).
16. **Timezone-correct table & filters** — make the Trades table dates and the date-range filter use the exchange tz (currently UTC slices) for full consistency with calendar/charts.
17. **Theme/responsive spec sync** — keep `Design.md` updated as the family's design (toggle component, bubble/visualMap pattern, off-canvas nav) evolves.

> When implementing any of these, add a Changelog row and update the relevant `§5` view spec.

### Analytics accuracy (found in math audit — refinements, not sign/scale bugs)

The core math is verified correct (PnL reconstruction, profit factor, expectancy, win/loss & adjusted ratios, Kelly, SQN, drawdown, dedupe, calendar/cashflow buckets). These are accuracy/labelling improvements:

18. **Risk-adjusted ratios use active-days-only series.** `equityCurve` emits only days that *had* closed trades, so Sharpe/Sortino/gain-to-pain/Omega are computed over active days and read high vs. the standard (which includes flat 0-PnL trading days). Fix: build the daily series across every trading day in the filtered range (fill gaps with 0) before computing mean/σ/downside.
19. **Calmar is not annualized.** `calmar = netPnl / maxDrawdown` currently equals `recoveryFactor`. True Calmar = *annualized* return / |maxDD| (needs the date span + starting balance). Implement once cash-flow-aware balances/time span land (ties into TWR/CAGR, item 3).
20. **CAGR (`cagrLike`) is a hardcoded 0 placeholder.** Compute real CAGR from starting balance + first/last dates (and net deposits) and surface it; or remove the field until then.
21. **Omega duplicates gain-to-pain.** Omega at MAR=0 is exactly Σpos/Σ|neg|, so the two cards show the same number. Either drive Omega from a configurable MAR (≠0) or drop one.
22. **SQN is uncapped.** Van Tharp caps the trade count at 100 (`√min(N,100)`); current `√N` inflates SQN for large samples. Optional: apply the cap.
23. **Sharpe/Sortino are PnL-based, not return-based.** They use cash-PnL per day (scale-invariant ratio, then ×√252). For a true % Sharpe, base the daily series on returns over account balance (needs balances from cash flows). Document the convention either way.

### Analytics depth

24. **Rolling-metric charts** — 30/90-day rolling win rate, expectancy, and Sharpe over time.
25. **Underwater / drawdown-duration chart** — time spent below the prior equity peak.
26. **R-multiple analytics** — once stops exist, R-distribution histogram + expectancy in R.
27. **Leak finder** — expectancy/win-rate by setup and by mistake tag, ranked, to surface losing patterns.
28. **Pivot table** — TradesViz-style sortable aggregate grid (PnL/win-rate/count by symbol, tag, setup, day-of-week, hour) with drag-to-group.

### Workflow & data

29. **Editable trades** — edit stop loss, profit target, tags, setup, notes, rating in the trade drawer; persist to IndexedDB and feed tag/setup analytics (extends §8b item 4).
30. **Undo / soft-delete** — confirm + undo on wipe; "undo last import" that removes just the executions added by the most recent import (use the dedupe hashes).
31. **Import history log** — record each import (filename, timestamp, executions added, broker) in its own table; show on the Import page; allow re-sync.
32. **More broker presets** — saved auto-detect column maps for Schwab, Webull, Tastytrade, IBKR Flex CSV, Binance (extends §8b item 10).

### UX

33. **Customizable dashboard widget grid** — add/remove/rearrange widgets on `/dashboard` (the §5.1 spec already calls for this); persist layout locally. **← next up.**
34. **Command palette (⌘K)** — fuzzy nav across views + quick filter actions.
35. **Saved filter presets** — name and recall global filter-bar combinations; date-range quick presets (MTD / YTD / last 30 / last 90).
36. **Keyboard navigation** — j/k + arrow keys to move through the trades table and open/close the drawer.

### Robustness & engineering

37. **Property-based reconstruction test** — random fill sequences; assert position returns to flat, Σ realized PnL invariants, and no NaN.
38. **Code-split ECharts** — dynamic-import the charts so the main bundle drops under the 500 kB warning.
39. **Virtualized trades table** — windowed rows for very large datasets (10k+ trades).
40. **PWA / offline install** — manifest + service worker (already local-first; extends §8b item 11).
41. **Timezone-correct table & filters** — make the Trades table dates and the date-range filter use the exchange tz instead of UTC slices (extends §8b item 16).

> When implementing any of these, add a Changelog row and update the relevant `§5` view spec.

---

## 9. Changelog

| Date (UTC) | Change |
|---|---|
| 2026-06-04 | **Roadmap added (§8b).** Planned goals: Trade Republic import (ISIN/EUR), cash flows (deposit/withdrawal as a `CashFlow` table) marked on the equity/balance curve + calendar + return math, TWR/IRR, tag/notes editing + analytics, benchmark overlay, MAE/MFE via optional price data, goals/streaks, reports, multi-account roll-up, broker presets, PWA, exports, and tz-correct table/filters. Shipped since initial spec: commission/fee toggles, symbol bubble chart, hover-rail + mobile drawer nav, exchange-tz (Nasdaq) bucketing, README + Design.md. |
| 2026-06-04 | **`.tlg` import.** Added IB TradeLog `.tlg` support: pipe-delimited, skip header sections + trailer, 16 cols (kept 1/2/6/8/10/12/13/14), record codes `O`/`C`/`C;O` (split reversals), sign-of-shares → action, floats → integer minor units. New `parseTlg.ts` + `detectFileType.ts`; same reconstruct→preview→persist pipeline as CSV (§5.5.1). |
| 2026-06-04 | Initial spec. Defined product goal (local-first TradesViz-parity trade analyzer), zero-backend stack (Vite/React/TS/ECharts/Dexie), domain model (executions→trades), the ~100-metric statistics surface, six views (dashboard/calendar/trades/charts/import/settings), and the full Apex design-language web port (CSS `color-mix()` token system mirroring the desktop `Surface(accentPct,lift)` formula, light/dark/system + accent, typography/shape/border/spacing/motion scales, focus/scrollbar/icon rules, ECharts theming, anti-patterns). Design language ported from `otherCLAUDE.md` §§1–10; that file's non-UI/WPF content explicitly out of scope. |
