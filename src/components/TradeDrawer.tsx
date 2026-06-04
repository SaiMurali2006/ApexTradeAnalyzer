import { useEffect } from 'react';
import type { Trade } from '@/domain/types';
import { formatMoney, formatPct, toMajor } from '@/domain/money';
import { Button } from './Button';
import './TradeDrawer.css';

// Right-side slide-in panel showing a single trade in full: PnL, return, entry/exit,
// costs, duration, and every constituent execution. Close on scrim/Escape.
function fmtPrice(minor: number) {
  return toMajor(minor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}
function fmtDuration(ms: number | null) {
  if (ms === null) return 'open';
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export function TradeDrawer({ trade, onClose }: { trade: Trade | null; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!trade) return null;
  const tone = trade.netPnl >= 0 ? 'var(--profit)' : 'var(--danger)';

  return (
    <div className="apex-drawer-scrim" onClick={onClose}>
      <aside className="apex-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="apex-drawer__head">
          <div>
            <div className="apex-drawer__sym mono">{trade.symbol}</div>
            <div className="apex-drawer__meta">
              {trade.side} · {trade.assetType} · {trade.account}
            </div>
          </div>
          <Button variant="icon" onClick={onClose} aria-label="Close">✕</Button>
        </div>

        <div className="apex-drawer__pnl mono" style={{ color: tone }}>
          {formatMoney(trade.netPnl, { signed: true })}
          <span className="apex-drawer__pnlsub">{formatPct(trade.returnPct)} return</span>
        </div>

        <div className="apex-drawer__grid">
          <Stat label="Qty" v={String(trade.qty)} />
          <Stat label="Avg entry" v={fmtPrice(trade.avgEntry)} />
          <Stat label="Avg exit" v={trade.avgExit === null ? '—' : fmtPrice(trade.avgExit)} />
          <Stat label="Gross PnL" v={formatMoney(trade.grossPnl, { signed: true })} />
          <Stat label="Commission" v={formatMoney(trade.commission)} />
          <Stat label="Fees" v={formatMoney(trade.fees)} />
          <Stat label="Duration" v={fmtDuration(trade.durationMs)} />
          <Stat label="Open" v={trade.openDate.replace('T', ' ').slice(0, 16)} />
          <Stat label="Close" v={trade.closeDate ? trade.closeDate.replace('T', ' ').slice(0, 16) : 'open'} />
        </div>

        <div className="apex-drawer__label">EXECUTIONS ({trade.executions.length})</div>
        <div className="apex-drawer__execs">
          <table className="mono">
            <thead>
              <tr>
                <th>Time</th><th>Action</th><th>Qty</th><th>Price</th><th>Comm</th>
              </tr>
            </thead>
            <tbody>
              {trade.executions.map((e) => (
                <tr key={e.id}>
                  <td>{e.timestamp.replace('T', ' ').slice(0, 19)}</td>
                  <td style={{ color: e.action === 'buy' ? 'var(--profit)' : 'var(--danger)' }}>{e.action}</td>
                  <td>{e.quantity}</td>
                  <td>{fmtPrice(e.price)}</td>
                  <td>{formatMoney(e.commission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <div className="apex-drawer__statlabel">{label}</div>
      <div className="apex-drawer__statval mono">{v}</div>
    </div>
  );
}
