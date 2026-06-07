<div align="center">

# 📈 ApexTradeAnalyzer

**A local-first, privacy-respecting trading journal & analytics suite — a TradesViz-class experience that runs entirely in your browser.**

Drop in a broker export and instantly get a beautiful, dense analytics workspace: a PnL calendar, equity/balance curve, interactive charts, ~35 statistics, open-position tracking, and multi-currency support — wrapped in the bouncy, accent-themed **Apex design language**.

*No accounts · no cloud · no telemetry · your data never leaves your machine.*

`Vite` · `React 18` · `TypeScript (strict)` · `ECharts` · `Dexie/IndexedDB` · `Zustand` · `50 unit tests`

</div>

---

## ✨ Highlights

- 🗓️ **PnL Calendar** — month grid + year heatmap; click any day for a slide-in drawer of that day's trades & cash flows → drill into any trade's executions
- 📊 **Customizable dashboard** — add / remove / **drag-reorder / resize** widgets (smooth FLIP motion); layout persists locally
- 💹 **Open Positions** — live exposure, long/short split, days held, per-position detail
- 🫧 **Symbol bubble chart** + PnL distribution, drawdown, day-of-week / hour / symbol / asset breakdowns — click to filter the whole app
- 💱 **Multi-currency** — USD `.tlg` + EUR Trade Republic trades unified via a **fetched daily EUR/USD rate** (cached, manually overridable); view everything in USD or EUR
- 💰 **Cash flows** — deposits/withdrawals with per-entry currency + locked rate; seeds an account-balance curve, marked on the equity chart & calendar
- 🧮 **Toggle commission & fees** — every metric, chart, and calendar recompute instantly
- 🕐 **Exchange-time aware** — day/week bucketing in Nasdaq/NYSE time (configurable)
- 🎨 **Light / Dark / System** + a user-pick **accent** that re-skins the whole UI (charts included) live
- 📱 **Fully responsive** — hover-expand icon rail on desktop, off-canvas drawer on mobile
- 🔒 **100% local** — IndexedDB persistence, JSON export, granular wipe

---

## 🖼️ Views

| View | What it does |
|---|---|
| **Dashboard** | Customizable widget grid: hero stat tiles, equity/account-balance curve (with deposit/withdrawal markers), Overall Statistics, recent trades — all filterable |
| **Calendar** | Month grid (green/red day tints, weekly summaries) + year heatmap; cash-flow badges; click a day → drawer of that day's trades & flows |
| **Trades** | Sortable, filterable table → row opens a detail drawer with every execution |
| **Positions** | Open positions: exposure, long/short, avg held, per-position metrics |
| **Charts** | Symbol bubble, PnL distribution, drawdown, day-of-week / hour / symbol / asset — click to filter |
| **Import** | Drag-drop `.tlg`, generic CSV, or **Trade Republic CSV**; preview + warnings; dedupe; commit |
| **Settings** | Display currency + live/manual FX rate, timezone, starting balance, commission/fee toggles, futures point-values, cash-flow CRUD, JSON export, granular wipe |

---

## 📐 Metrics

Pure functions over your (filtered, cost-adjusted, currency-converted) trades:

**Performance** — Net/Gross PnL · commission · fees · win rate · profit factor · expectancy · win/loss & adjusted win/loss ratio · gain-to-pain · avg/largest win & loss · best/worst symbol

**Risk-adjusted** — Sharpe · Sortino (proper downside deviation) · Calmar · Omega · recovery factor · Kelly criterion · System Quality Number (SQN) · tail ratio

**Drawdown & volatility** — max drawdown ($ and %) · std dev · max consecutive wins/losses

**Duration** — avg hold (all / winners / losers)

---

## 🧱 Tech Stack

| Layer | Choice |
|---|---|
| Build / language | **Vite** · **TypeScript** (strict, no `any` in domain) |
| UI / routing | **React 18** · **React Router** |
| Charts | **Apache ECharts** (runtime-themed from CSS tokens) |
| Storage | **IndexedDB** via **Dexie** (trades, executions, cash flows, FX rates) |
| State | **Zustand** (data, filters, settings, rates, dashboard layout) |
| Parsing / dates | **PapaParse** · **dayjs** (+ timezone) |
| FX rates | **Frankfurter** (ECB daily, free, no key) |
| Tests | **Vitest** (50 passing) |

Money is handled in **integer minor units** (never floating-point dollars); timestamps stored **UTC**, bucketed in the exchange timezone; each record carries its **native currency**.

---

## 🚀 Getting Started

```bash
npm install
npm run dev        # http://localhost:8080  (auto-opens)
```

```bash
npm run build      # type-check + production build → dist/
npm run preview    # serve the build locally
npm run test       # Vitest suite
```

> Local-first: the production build is a static SPA — open it from `file://` or any static host. The only network call is the daily FX rate (optional; cached + manually overridable offline).

---

## 📥 Importing Trades

| Source | Notes |
|---|---|
| **Interactive Brokers `.tlg`** | Performance & Reports → Third-Party Reports → TradeLog. Pipe-delimited; USD. |
| **Trade Republic CSV** | Dedicated drop zone. ISIN symbols, EUR, fees; derivatives priced 1:1. |
| **Generic broker CSV** | Auto-maps common headers (symbol, date, side, qty, price, commission, fees). |

The importer reconstructs round-trip **trades** from raw **executions** with an average-cost engine (scaling in/out, reversals, per-asset multipliers: stocks ×1, options ×100, futures by point value). It previews before commit and **dedupes** on re-import via a content+broker-id hash, so re-importing the same file adds nothing.

---

## 💱 Multi-Currency

Mixed-broker data is unified. Each trade/cash flow is tagged with its **native currency**; views convert everything to your chosen **display currency** (USD/EUR) using the **daily EUR/USD rate** (Frankfurter, cached in IndexedDB + a localStorage seed for instant/offline paint). The rate is **manually overridable** in Settings, and each cash flow can lock the **rate at its own time**.

---

## 🎨 Design Language

The whole app follows the **Apex design language** — neutral surfaces that thread the user's accent through, bouncy-on-interaction motion, a strict shape/spacing/type scale, live theming via CSS `color-mix()`. The portable spec lives in [`Design.md`](Design.md) — hand it to build a sibling app with an identical look and feel (it even documents the widget-grid drag/resize/FLIP pattern and the ECharts token-resolution gotcha).

---

## 🗂️ Project Structure

```
src/
├─ theme/        # color-mix token system, ThemeProvider, ECharts theme
├─ components/   # AppShell, Button, Card, ChartCard, FilterBar, EmptyState,
│                # TradeDrawer, DayDrawer, LogoBadge+ThemePopover, Icon
├─ views/        # Dashboard, Calendar, Trades, Positions, Charts, Import, Settings
├─ domain/       # types, money, multipliers, costs, currency, reconstructTrades
├─ stats/        # series, overall, calendar, breakdowns, cashflow
├─ store/        # Dexie db + Zustand stores (data, filters, settings, rates, dashboard)
└─ lib/          # timezone-aware dates, FX rate service
```

See [`CLAUDE.md`](CLAUDE.md) for the full architecture spec and the detailed roadmap.

---

## 🔒 Privacy & Data

Everything is on-device — trades/executions/cash flows/FX rates in IndexedDB, theme/settings/layout in `localStorage`. Settings offers **JSON export** (executions, trades, cash flows, rates) and **granular, independent wipes**: trades only, cash flows only, or everything (cached FX rates are kept). `.gitignore` keeps `*.tlg`, `*.csv`, and exports out of version control.

---

## 🧪 Status

Core product complete and verified: all 7 views live, full import → analytics → multi-currency pipeline, **50 passing unit tests** (trade reconstruction, money/currency math, parsers, statistics, dedupe, cash flows).

---

## 🛣️ Roadmap / Ideas

Tracked in detail in [`CLAUDE.md` §8b](CLAUDE.md). Highlights:

**Analytics accuracy**
- Risk ratios over *all* trading days (fill flat 0-PnL gaps) — currently active-days-only, which reads high
- True annualized **Calmar / CAGR**; return-based (not cash-PnL) Sharpe
- Distinguish **Omega** from gain-to-pain (configurable MAR); cap **SQN** at N=100 (Van Tharp)

**Live data & positions**
- **Live quotes** → real unrealized PnL, MAE/MFE, and running-PnL on the Positions page
- **Benchmark overlay** (SPY/QQQ) on the equity curve
- Per-trade **historical** FX conversion (use each trade's date rate, not just the latest)

**Analytics depth**
- Rolling win-rate / expectancy / Sharpe; underwater (drawdown-duration) chart
- R-multiple analytics (needs stops); **leak finder** by setup & mistake tag
- TradesViz-style **pivot table** (PnL/win-rate by symbol/tag/day/hour)

**Workflow**
- **Editable trades** (stop/target/tags/notes/rating) + tag analytics
- Undo / soft-delete; per-import "undo last import"; import history log
- More broker presets (Schwab, Webull, Tastytrade, IBKR Flex, Binance)
- Command palette (⌘K), saved filter presets, keyboard nav

**Engineering**
- Code-split ECharts (drop the >500 kB bundle warning); virtualized trades table
- Property-based reconstruction test; PWA / offline install

---

<div align="center">
<sub>Built for traders who want their edge in their own hands — locally.</sub>
</div>
