// Overall Statistics panel (CLAUDE.md §4). Renders the full metric set as four
// grouped cards: Performance, Risk-adjusted, Drawdown & volatility, Duration.
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
  const HINTS: Record<string, string> = {
    'Net PnL': 'Total realized profit/loss after commission & fees, over the filtered closed trades.',
    'Gross PnL': 'Realized profit/loss before commission & fees.',
    Commission: 'Total broker commission across the filtered trades.',
    Fees: 'Total exchange/regulatory fees across the filtered trades.',
    'Total trades': 'Number of closed round-trip trades in the current filter.',
    'Win rate': 'Share of closed trades with positive net PnL.',
    'Wins / Losses': 'Count of winning vs losing trades (breakeven excluded).',
    'Avg win': 'Average net PnL of winning trades.',
    'Avg loss': 'Average net PnL of losing trades.',
    'Avg trade': 'Average net PnL per closed trade (= Net PnL ÷ trades).',
    'Largest win': 'Best single-trade net PnL.',
    'Largest loss': 'Worst single-trade net PnL.',
    'Profit factor': 'Gross profit ÷ gross loss. >1 is profitable; ∞ means no losing trades.',
    Expectancy: 'Average expected PnL per trade: winRate·avgWin − lossRate·avgLoss.',
    'Win/Loss ratio': 'Average winner ÷ average loser (size only).',
    'Adj win/loss ratio': 'Win/loss ratio weighted by win/loss frequency.',
    'Gain-to-pain': 'Sum of positive daily PnL ÷ sum of |negative daily PnL|.',
    Sharpe: 'Mean daily PnL ÷ its std dev, annualized (×√252). Active trading days only.',
    Sortino: 'Like Sharpe but only penalizes downside deviation (shortfalls below 0).',
    Calmar: 'Net PnL ÷ max drawdown (not yet annualized).',
    Omega: 'Probability-weighted gains ÷ losses at a 0 threshold.',
    'Recovery factor': 'Net PnL ÷ max drawdown — how well profits recover risk taken.',
    'Kelly criterion': 'Suggested fraction of capital per bet from win rate & win/loss ratio.',
    SQN: 'System Quality Number: mean trade PnL ÷ std dev × √N.',
    'Tail ratio': '95th percentile daily PnL ÷ |5th percentile| — upside vs downside tails.',
    'Max drawdown': 'Largest peak-to-trough drop on the cumulative equity curve.',
    'Max drawdown %': 'Max drawdown as a fraction of the equity peak.',
    'Std dev (PnL)': 'Standard deviation of per-trade net PnL (volatility).',
    'Max consec wins': 'Longest streak of consecutive winning trades.',
    'Max consec losses': 'Longest streak of consecutive losing trades.',
    'Avg hold': 'Average time a position was held (all trades).',
    'Avg hold (win)': 'Average hold time of winning trades.',
    'Avg hold (loss)': 'Average hold time of losing trades.',
    'Best symbol': 'Symbol with the highest total net PnL.',
    'Worst symbol': 'Symbol with the lowest total net PnL.',
  };

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
                <tr key={k} title={HINTS[k]}>
                  <td style={{ padding: '5px 0', color: 'var(--muted)', fontWeight: 700, cursor: HINTS[k] ? 'help' : 'default' }}>{k}</td>
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
