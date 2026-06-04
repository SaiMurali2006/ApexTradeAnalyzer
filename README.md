<div align="center">

# 📈 ApexTradeAnalyzer

**A local-first, privacy-respecting trading journal & analytics suite — a TradesViz-class experience that runs entirely in your browser.**

Drop in a broker export, get a beautiful dashboard: PnL calendar, equity curve, 7 interactive charts, and ~35 performance metrics — wrapped in the bouncy, accent-themed **Apex design language**.

*No accounts · no cloud · no telemetry · your data never leaves your machine.*

</div>

---

## ✨ Highlights

- 🗓️ **PnL Calendar** — month grid + year heatmap, daily/weekly P&L, click any day to drill into its trades
- 📊 **Equity curve** with drawdown shading and a full ~35-metric statistics panel
- 🫧 **Symbol-performance bubble chart** — size = trade count, green = profit, red = loss
- 📥 **One-drop import** — Interactive Brokers `.tlg` and any broker CSV, with live preview
- 🎨 **Light / Dark / System** themes + a **user-pick accent color** that re-skins the *entire* UI (charts included) live
- 🧮 **Toggle commission & fees** on/off — every metric, chart, and the calendar recompute instantly
- 🕐 **Exchange-time aware** — defaults to Nasdaq/NYSE (`America/New_York`), changeable in Settings
- 📱 **Fully responsive** — hover-expand icon rail on desktop, off-canvas drawer on mobile
- 🔒 **100% local** — trades persist in IndexedDB; export/wipe anytime

---

## 🖼️ Views

| View | What it does |
|---|---|
| **Dashboard** | Hero stats (Net PnL, win rate, profit factor, expectancy, max drawdown), equity curve, and the full Overall Statistics grid — all filterable |
| **Calendar** | Month grid with green/red day tints + per-day P&L and trade count, weekly summary column, year heatmap toggle, click-to-drill day detail |
| **Trades** | Sortable, filterable table (symbol, side, dates, qty, return, net PnL) → click a row for a detail drawer with every execution |
| **Charts** | Symbol bubble chart, PnL distribution, drawdown curve, PnL by day-of-week / hour / symbol / asset — click a bar or bubble to filter the whole app |
| **Import** | Drag-drop `.tlg` / CSV, auto-detect, reconstruct trades, preview with warnings, dedupe, commit |
| **Settings** | Currency, timezone, starting balance, futures point-value overrides, commission/fee toggles, JSON export, data wipe |

---

## 📐 Metrics

Computed as pure functions over your (filtered) trades:

**Performance** — Net/Gross PnL · commission · fees · win rate · profit factor · expectancy · win/loss & adjusted win/loss ratio · gain-to-pain · avg/largest win & loss · best/worst symbol

**Risk-adjusted** — Sharpe · Sortino · Calmar · Omega · recovery factor · Kelly criterion · System Quality Number (SQN) · tail ratio

**Drawdown & volatility** — max drawdown ($ and %) · std dev · max consecutive wins/losses

**Duration** — avg hold (all / winners / losers)

---

## 🧱 Tech Stack

| | |
|---|---|
| Build | **Vite** + **TypeScript** (strict) |
| UI | **React 18** + **React Router** |
| Charts | **Apache ECharts** |
| Storage | **IndexedDB** via **Dexie** |
| State | **Zustand** |
| CSV | **PapaParse** · Dates **dayjs** (+ timezone) |
| Tests | **Vitest** |

Money is handled in **integer minor units** (never floating-point dollars); timestamps stored **UTC**, bucketed in your exchange timezone.

---

## 🚀 Getting Started

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # type-check + production build to dist/
npm run preview    # serve the build locally
npm run test       # run the Vitest suite
```

> Local-first: the production build is a static SPA — open it from `file://` or any static host. Nothing phones home.

---

## 📥 Importing Trades

**Interactive Brokers `.tlg`** — *Performance & Reports → Third-Party Reports → TradeLog*. Drop the file on the Import page.

**Any broker CSV** — the importer auto-maps common headers (symbol, date, side, quantity, price, commission, fees). Buy/sell verbs like `BUYTOOPEN` / `STC` are understood.

The importer reconstructs round-trip **trades** from raw **executions** (fills) using an average-cost engine that handles scaling in/out, reversals, and per-asset multipliers (stocks ×1, options ×100, futures by point value). It previews everything before you commit, and dedupes on re-import.

---

## 🎨 Design Language

The whole app follows the **Apex design language** — neutral surfaces that thread the user's accent through, bouncy-on-interaction motion, a strict shape/spacing/type scale, and live theming via CSS `color-mix()`. The portable spec lives in [`Design.md`](Design.md) — hand it to build a sibling app with an identical look and feel.

---

## 🗂️ Project Structure

```
src/
├─ theme/        # token system (color-mix), ThemeProvider, ECharts theme
├─ components/   # AppShell, Button, Card, ChartCard, FilterBar, TradeDrawer, ...
├─ views/        # Dashboard, Calendar, Trades, Charts, Import, Settings
├─ domain/       # types, money, multipliers, trade reconstruction, cost adjust
├─ stats/        # series, overall metrics, calendar, breakdowns
├─ store/        # Dexie db + Zustand stores (data, filters, settings)
└─ lib/          # timezone-aware date helpers
```

See [`CLAUDE.md`](CLAUDE.md) for the full architecture spec and roadmap.

---

## 🔒 Privacy

Everything is on-device. Trades live in your browser's IndexedDB; settings/theme in `localStorage`. The Settings page can export all data to JSON or wipe it. `.gitignore` keeps `*.tlg` and exports out of version control.

---

## 🧪 Status

Core product complete: all 6 views live, import → analytics pipeline working end-to-end, 30 passing unit tests covering trade reconstruction, money math, parsers, and statistics.

See the **Roadmap** in [`CLAUDE.md`](CLAUDE.md) for what's next (Trade Republic import, cash flows on the equity curve, and more).

---

<div align="center">
<sub>Built for traders who want their edge in their own hands — locally.</sub>
</div>
