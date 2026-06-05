import { useEffect } from 'react';
import type { CashFlow, Trade } from '@/domain/types';
import type { DayCell } from '@/stats/calendar';
import { formatMoney, formatPct } from '@/domain/money';
import { Button } from './Button';
import './TradeDrawer.css';
import './DayDrawer.css';

// Right-side slide-in panel for a calendar day: day summary, cash flows, and the
// day's trades as clickable rows. Picking a trade opens the TradeDrawer (executions)
// on top — mirroring the Trades-table → drawer flow, scoped to one day.
interface Props {
  day: DayCell | null;
  flows: CashFlow[];
  onClose: () => void;
  onPickTrade: (t: Trade) => void;
}

export function DayDrawer({ day, flows, onClose, onPickTrade }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!day) return null;
  const tone = day.pnl >= 0 ? 'var(--profit)' : 'var(--danger)';

  return (
    <div className="apex-drawer-scrim" onClick={onClose}>
      <aside className="apex-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="apex-drawer__head">
          <div>
            <div className="apex-drawer__sym mono">{day.date}</div>
            <div className="apex-drawer__meta">{day.count} trade{day.count === 1 ? '' : 's'}</div>
          </div>
          <Button variant="icon" onClick={onClose} aria-label="Close">✕</Button>
        </div>

        <div className="apex-drawer__pnl mono" style={{ color: tone }}>
          {formatMoney(day.pnl, { signed: true })}
          <span className="apex-drawer__pnlsub">net for the day</span>
        </div>

        {flows.length > 0 && (
          <>
            <div className="apex-drawer__label">CASH FLOWS</div>
            <div className="apex-day__flows">
              {flows.map((cf) => (
                <div key={cf.id} className="apex-day__flow mono" style={{ borderColor: cf.type === 'deposit' ? 'var(--profit)' : 'var(--danger)' }}>
                  <span>{cf.type === 'deposit' ? '▲ Deposit' : '▼ Withdrawal'}</span>
                  <span style={{ color: cf.type === 'deposit' ? 'var(--profit)' : 'var(--danger)' }}>{formatMoney(cf.amount)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="apex-drawer__label">TRADES ({day.trades.length})</div>
        <div className="apex-day__trades">
          {day.trades.map((t) => (
            <button key={t.id} className="apex-day__trade mono" onClick={() => onPickTrade(t)}>
              <span className="apex-day__sym">{t.symbol}</span>
              <span className={t.side === 'long' ? 'apex-day__long' : 'apex-day__short'}>{t.side}</span>
              <span className="apex-day__qty">{t.qty}</span>
              <span className="apex-day__ret">{formatPct(t.returnPct)}</span>
              <span style={{ color: t.netPnl >= 0 ? 'var(--profit)' : 'var(--danger)', textAlign: 'right' }}>
                {formatMoney(t.netPnl, { signed: true })}
              </span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
