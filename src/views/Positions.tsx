// Open Positions: the broker-reported snapshot (.tlg LOT section), NOT positions
// derived from reconstructed trades. Shows cost-basis exposure per holding.
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/store/useData';
import { useSettings } from '@/store/useSettings';
import { useRates } from '@/store/useRates';
import { convertPositions } from '@/domain/currency';
import { formatMoney, toMajor } from '@/domain/money';
import type { Currency, Position } from '@/domain/types';
import { Card, StatCard } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { IconPositions } from '@/components/Icon';
import { PageHeader } from './PageHeader';
import './Trades.css';

const DAY = 86_400_000;
const fmtPrice = (minor: number) => toMajor(minor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const heldDays = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY)) : null);
const exposureOf = (p: Position) => Math.round(p.avgEntry * Math.abs(p.qty) * p.multiplier);

export function Positions() {
  const allPositions = useData((s) => s.positions);
  const hasAnyTrades = useData((s) => s.trades.length > 0);
  const currency = useSettings((s) => s.currency);
  const eurUsd = useRates((s) => s.eurUsd);
  const displayCcy: Currency = currency === 'EUR' ? 'EUR' : 'USD';
  const nav = useNavigate();

  const positions = useMemo(
    () => convertPositions(allPositions, displayCcy, eurUsd).slice().sort((a, b) => exposureOf(b) - exposureOf(a)),
    [allPositions, displayCcy, eurUsd],
  );

  const totalExposure = useMemo(() => positions.reduce((s, p) => s + exposureOf(p), 0), [positions]);
  const longs = positions.filter((p) => p.qty > 0).length;
  const shorts = positions.length - longs;
  const dated = positions.map((p) => heldDays(p.openDate)).filter((d): d is number => d !== null);
  const avgHeld = dated.length ? Math.round(dated.reduce((s, d) => s + d, 0) / dated.length) : 0;

  return (
    <>
      <PageHeader
        eyebrow="Live"
        title="Open Positions"
        actions={<span className="mono" style={{ color: 'var(--muted)' }}>{positions.length} open</span>}
      />

      {positions.length === 0 ? (
        <EmptyState
          icon={<IconPositions size={26} />}
          title={hasAnyTrades ? 'No open positions' : 'No data yet'}
          body={
            hasAnyTrades
              ? 'This import had no open-position snapshot. Open positions come straight from the broker file (IB .tlg LOT section); CSV / Trade Republic exports don’t include one.'
              : 'Import an IB .tlg file to see the open positions it reports.'
          }
          action={hasAnyTrades ? undefined : <Button variant="primary" onClick={() => nav('/import')}>Import trades</Button>}
        />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 12 }}>
            <StatCard label="Open positions" value={String(positions.length)} sub={`${longs} long / ${shorts} short`} hint="Holdings reported open by the broker at export time." />
            <StatCard label="Total exposure" value={formatMoney(totalExposure)} sub="cost basis" hint="Sum of cost basis (avg cost × qty × multiplier). Not live market value — the app has no quote feed." />
            <StatCard label="Avg held" value={dated.length ? `${avgHeld}d` : '—'} hint="Average days held, for positions whose open date the broker provided." />
            <StatCard label="Symbols" value={String(new Set(positions.map((p) => p.symbol)).size)} hint="Distinct symbols held." />
          </div>

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div className="apex-table-wrap">
              <table className="apex-table mono">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th className="num">Qty</th>
                    <th className="num">Avg cost</th>
                    <th className="num">Exposure</th>
                    <th>Opened</th>
                    <th className="num">Held</th>
                    <th>Account</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => {
                    const held = heldDays(p.openDate);
                    return (
                      <tr key={p.id}>
                        <td>{p.symbol}</td>
                        <td className={p.qty > 0 ? 'long' : 'short'}>{p.qty > 0 ? 'long' : 'short'}</td>
                        <td className="num">{Math.abs(p.qty)}</td>
                        <td className="num">{fmtPrice(p.avgEntry)}</td>
                        <td className="num">{formatMoney(exposureOf(p))}</td>
                        <td>{p.openDate ? p.openDate.slice(0, 10) : '—'}</td>
                        <td className="num">{held === null ? '—' : `${held}d`}</td>
                        <td>{p.account}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
