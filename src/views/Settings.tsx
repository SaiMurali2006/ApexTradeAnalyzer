import { useCallback, useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { PageHeader } from './PageHeader';
import { CURRENCIES, TIMEZONES, useSettings } from '@/store/useSettings';
import { FUTURES_POINT_VALUE } from '@/domain/multipliers';
import { useData } from '@/store/useData';
import { allExecutions } from '@/store/db';
import './Settings.css';

export function Settings() {
  const s = useSettings();
  const wipe = useData((st) => st.wipe);
  const reload = useData((st) => st.load);
  const trades = useData((st) => st.trades);

  const [newRoot, setNewRoot] = useState('');
  const [newVal, setNewVal] = useState('');
  const [confirmWipe, setConfirmWipe] = useState(false);

  const exportJson = useCallback(async () => {
    const executions = await allExecutions();
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), settings: { currency: s.currency, timezone: s.timezone, startingBalance: s.startingBalance }, executions, trades }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apex-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [s.currency, s.timezone, s.startingBalance, trades]);

  const doWipe = useCallback(async () => {
    await wipe();
    await reload();
    setConfirmWipe(false);
  }, [wipe, reload]);

  const overrides = Object.entries(s.futuresOverrides);

  return (
    <>
      <PageHeader eyebrow="Configuration" title="Settings" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
        <Card>
          <div className="apex-set-label">GENERAL</div>
          <Row label="Base currency">
            <select className="apex-field" value={s.currency} onChange={(e) => s.set({ currency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Row>
          <Row label="Timezone">
            <select className="apex-field" value={s.timezone} onChange={(e) => s.set({ timezone: e.target.value })}>
              {TIMEZONES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Row>
          <Row label="Starting balance">
            <input
              className="apex-field mono"
              type="number"
              value={s.startingBalance || ''}
              placeholder="0"
              onChange={(e) => s.set({ startingBalance: Number(e.target.value) || 0 })}
              style={{ width: 130 }}
            />
          </Row>
          <Row label="Include commission">
            <Toggle on={s.includeCommission} onChange={(v) => s.set({ includeCommission: v })} />
          </Row>
          <Row label="Include fees">
            <Toggle on={s.includeFees} onChange={(v) => s.set({ includeFees: v })} />
          </Row>
          <p className="apex-set-note">Currency changes the display symbol only — PnL math is unit-agnostic. Timezone drives day/week bucketing across the calendar, equity curve, and time-of-day charts (defaults to America/New_York — Nasdaq/NYSE exchange time). Toggling commission/fees off shows gross-of-cost PnL everywhere — metrics, calendar, and charts recompute instantly.</p>
        </Card>

        <Card>
          <div className="apex-set-label">FUTURES POINT VALUE</div>
          <p className="apex-set-note">Override dollars-per-point for a futures root. Defaults: {Object.keys(FUTURES_POINT_VALUE).slice(0, 8).join(', ')}…</p>
          <div className="apex-fut-add">
            <input className="apex-field mono" placeholder="Root (e.g. ES)" value={newRoot} onChange={(e) => setNewRoot(e.target.value)} style={{ width: 110 }} />
            <input className="apex-field mono" placeholder="Value" type="number" value={newVal} onChange={(e) => setNewVal(e.target.value)} style={{ width: 90 }} />
            <Button
              variant="primary"
              disabled={!newRoot.trim() || !Number(newVal)}
              onClick={() => {
                s.setFuture(newRoot.trim(), Number(newVal));
                setNewRoot('');
                setNewVal('');
              }}
            >
              Add
            </Button>
          </div>
          {overrides.length > 0 && (
            <table className="mono apex-fut-table">
              <tbody>
                {overrides.map(([root, val]) => (
                  <tr key={root}>
                    <td>{root}</td>
                    <td style={{ textAlign: 'right' }}>${val}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Button variant="icon" onClick={() => s.removeFuture(root)} aria-label={`Remove ${root}`}>✕</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="apex-set-note">Re-import after changing to recompute affected futures trades.</p>
        </Card>

        <Card>
          <div className="apex-set-label">DATA</div>
          <Row label="Trades stored">
            <span className="mono" style={{ fontWeight: 800 }}>{trades.length}</span>
          </Row>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Button onClick={() => void exportJson()}>Export JSON</Button>
            {confirmWipe ? (
              <>
                <Button className="apex-danger" onClick={() => void doWipe()}>Confirm wipe</Button>
                <Button onClick={() => setConfirmWipe(false)}>Cancel</Button>
              </>
            ) : (
              <Button className="apex-danger" onClick={() => setConfirmWipe(true)}>Wipe all data</Button>
            )}
          </div>
          <p className="apex-set-note">Export downloads all executions + trades as JSON. Wipe clears the local database permanently.</p>
        </Card>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="apex-set-row">
      <span>{label}</span>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      className={`apex-toggle ${on ? 'is-on' : ''}`}
      onClick={() => onChange(!on)}
    >
      <span className="apex-toggle__knob" />
    </button>
  );
}
