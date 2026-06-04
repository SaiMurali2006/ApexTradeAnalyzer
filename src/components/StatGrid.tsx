// Overall Statistics panel (CLAUDE.md §4). Dense grouped table of every metric.
import type { OverallStats } from '@/stats/overall';
import { formatMoney, formatPct } from '@/domain/money';
import { Card } from './Card';

const num = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : '∞');
const ms = (x: number) => {
  const m = Math.round(x / 60000);
  if (m < 60) return `${m}m`;
  const h = m / 60;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
};

export function StatGrid({ s }: { s: OverallStats }) {
  const groups: { title: string; rows: [string, string][] }[] = [
    {
      title: 'Performance',
      rows: [
        ['Net PnL', formatMoney(s.netPnl, { signed: true })],
        ['Gross PnL', formatMoney(s.grossPnl, { signed: true })],
        ['Commission', formatMoney(s.commission)],
        ['Fees', formatMoney(s.fees)],
        ['Total trades', String(s.totalTrades)],
        ['Win rate', formatPct(s.winRate)],
        ['Wins / Losses', `${s.wins} / ${s.losses}`],
        ['Avg win', formatMoney(s.avgWin)],
        ['Avg loss', formatMoney(-s.avgLoss)],
        ['Avg trade', formatMoney(s.avgTrade, { signed: true })],
        ['Largest win', formatMoney(s.largestWin)],
        ['Largest loss', formatMoney(-s.largestLoss)],
        ['Profit factor', num(s.profitFactor)],
        ['Expectancy', formatMoney(s.expectancy, { signed: true })],
        ['Win/Loss ratio', num(s.winLossRatio)],
        ['Adj win/loss ratio', num(s.adjustedWinLossRatio)],
        ['Gain-to-pain', num(s.gainToPain)],
      ],
    },
    {
      title: 'Risk-adjusted',
      rows: [
        ['Sharpe', num(s.sharpe)],
        ['Sortino', num(s.sortino)],
        ['Calmar', num(s.calmar)],
        ['Omega', num(s.omega)],
        ['Recovery factor', num(s.recoveryFactor)],
        ['Kelly criterion', formatPct(s.kelly)],
        ['SQN', num(s.sqn)],
        ['Tail ratio', num(s.tailRatio)],
      ],
    },
    {
      title: 'Drawdown & volatility',
      rows: [
        ['Max drawdown', formatMoney(-s.maxDrawdown)],
        ['Max drawdown %', formatPct(s.maxDrawdownPct)],
        ['Std dev (PnL)', formatMoney(Math.round(s.stdDevPnl))],
        ['Max consec wins', String(s.maxConsecWins)],
        ['Max consec losses', String(s.maxConsecLosses)],
      ],
    },
    {
      title: 'Duration & activity',
      rows: [
        ['Avg hold', ms(s.avgHoldMs)],
        ['Avg hold (win)', ms(s.avgHoldWinMs)],
        ['Avg hold (loss)', ms(s.avgHoldLossMs)],
        ['Best symbol', s.bestSymbol ?? '—'],
        ['Worst symbol', s.worstSymbol ?? '—'],
      ],
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
      {groups.map((g) => (
        <Card key={g.title}>
          <div style={{ fontSize: '0.625rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>
            {g.title}
          </div>
          <table className="mono" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <tbody>
              {g.rows.map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '5px 0', color: 'var(--muted)', fontWeight: 700 }}>{k}</td>
                  <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 800 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}
    </div>
  );
}
