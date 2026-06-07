// Settings: currency, exchange timezone, starting balance, commission/fee toggles,
// futures point-value overrides, cash-flow management, and JSON export / data wipe.
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { PageHeader } from './PageHeader';
import { CURRENCIES, TIMEZONES, useSettings } from '@/store/useSettings';
import { useRates } from '@/store/useRates';
import { FUTURES_POINT_VALUE } from '@/domain/multipliers';
import { useData } from '@/store/useData';
import { allExecutions, allRates } from '@/store/db';
import { formatMoney, toMajor, toMinor } from '@/domain/money';
import { netDeposits } from '@/stats/cashflow';
import { convertCashFlows } from '@/domain/currency';
import type { CashFlowType, Currency } from '@/domain/types';
import './Settings.css';

export function Settings() {
  const s = useSettings();
  const eurUsd = useRates((st) => st.eurUsd);
  const rateDate = useRates((st) => st.date);
  const rateLoading = useRates((st) => st.loading);
  const refreshRate = useRates((st) => st.refresh);
  const setManualRate = useRates((st) => st.setManual);
  const isManual = useRates((st) => st.manual != null);
  const wipe = useData((st) => st.wipe);
  const wipeTrades = useData((st) => st.wipeTrades);
  const wipeCashFlows = useData((st) => st.wipeCashFlows);
  const reload = useData((st) => st.load);
  const trades = useData((st) => st.trades);
  const cashFlows = useData((st) => st.cashFlows);
  const addCashFlow = useData((st) => st.addCashFlow);
  const removeCashFlow = useData((st) => st.removeCashFlow);

  const displayCcy: Currency = s.currency === 'EUR' ? 'EUR' : 'USD';
  const cashFlowsCcy = convertCashFlows(cashFlows, displayCcy, eurUsd);

  const [newRoot, setNewRoot] = useState('');
  const [newVal, setNewVal] = useState('');
  const [confirmKind, setConfirmKind] = useState<'trades' | 'cashflows' | 'all' | null>(null);
  const [rateInput, setRateInput] = useState(eurUsd.toFixed(4));
  useEffect(() => setRateInput(eurUsd.toFixed(4)), [eurUsd]);

  // cash flow form
  const [cfDate, setCfDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cfType, setCfType] = useState<CashFlowType>('deposit');
  const [cfAmount, setCfAmount] = useState('');
  const [cfCurrency, setCfCurrency] = useState<Currency>(displayCcy);
  const [cfRate, setCfRate] = useState('');
  const [cfNote, setCfNote] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  const resetCfForm = useCallback(() => {
    setEditId(null);
    setCfAmount('');
    setCfRate('');
    setCfNote('');
    setCfType('deposit');
  }, []);

  const submitCashFlow = useCallback(() => {
    const amt = Number(cfAmount);
    if (!cfDate || !Number.isFinite(amt) || amt <= 0) return;
    // lock the rate used to convert this flow: explicit input, else the current rate
    const lockedRate = Number(cfRate) > 0 ? Number(cfRate) : eurUsd;
    void addCashFlow({
      // reuse the id when editing (putCashFlow upserts), else a fresh one
      id: editId ?? `cf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      date: new Date(`${cfDate}T00:00:00Z`).toISOString(),
      type: cfType,
      amount: toMinor(amt),
      account: '',
      currency: cfCurrency,
      eurUsd: lockedRate,
      note: cfNote.trim() || undefined,
    });
    resetCfForm();
  }, [cfDate, cfType, cfAmount, cfCurrency, cfRate, eurUsd, cfNote, editId, addCashFlow, resetCfForm]);

  const startEditCashFlow = useCallback((id: string) => {
    const cf = cashFlows.find((x) => x.id === id);
    if (!cf) return;
    setEditId(cf.id);
    setCfDate(cf.date.slice(0, 10));
    setCfType(cf.type);
    setCfAmount(String(toMajor(cf.amount)));
    setCfCurrency(cf.currency ?? 'USD');
    setCfRate(cf.eurUsd && cf.eurUsd > 0 ? String(cf.eurUsd) : '');
    setCfNote(cf.note ?? '');
  }, [cashFlows]);

  const exportJson = useCallback(async () => {
    const [executions, rates] = await Promise.all([allExecutions(), allRates()]);
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), settings: { currency: s.currency, timezone: s.timezone, startingBalance: s.startingBalance }, executions, trades, cashFlows, rates }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apex-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [s.currency, s.timezone, s.startingBalance, trades, cashFlows]);

  const doWipe = useCallback(async (kind: 'trades' | 'cashflows' | 'all') => {
    if (kind === 'trades') await wipeTrades();
    else if (kind === 'cashflows') await wipeCashFlows();
    else await wipe();
    await reload();
    setConfirmKind(null);
  }, [wipe, wipeTrades, wipeCashFlows, reload]);

  const overrides = Object.entries(s.futuresOverrides);

  return (
    <>
      <PageHeader eyebrow="Configuration" title="Settings" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
        <Card>
          <div className="apex-set-label">GENERAL</div>
          <Row label="Display currency">
            <select className="apex-field" value={s.currency} onChange={(e) => s.set({ currency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Row>
          <Row label="EUR / USD rate">
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="apex-field mono"
                type="number"
                step="0.0001"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setManualRate(Number(rateInput) || null)}
                onBlur={() => Number(rateInput) > 0 && Number(rateInput) !== eurUsd && setManualRate(Number(rateInput))}
                style={{ width: 96 }}
              />
              <Button onClick={() => void refreshRate()} disabled={rateLoading} title="Fetch live rate (clears manual override)">{rateLoading ? '…' : 'Auto'}</Button>
            </span>
          </Row>
          <p className="apex-set-note" style={{ marginTop: 0 }}>
            {isManual ? 'Manual rate' : `Live rate · ${rateDate === 'fallback' ? 'offline' : rateDate}`} · 1 EUR = {eurUsd.toFixed(4)} USD. Edit to override; Auto re-fetches.
          </p>
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
          <p className="apex-set-note">Display currency converts all values via the EUR/USD rate. Starting balance is in that currency. Timezone drives day/week bucketing. Hover any field for details.</p>
        </Card>

        <Card>
          <div className="apex-set-label">FUTURES POINT VALUE</div>
          <p className="apex-set-note" style={{ marginTop: 0 }}>Override dollars-per-point for a futures root (defaults: {Object.keys(FUTURES_POINT_VALUE).slice(0, 6).join(', ')}…). Re-import to recompute affected trades.</p>
          <div className="apex-cf-add">
            <div className="apex-cf-line">
              <input className="apex-field mono" placeholder="Root (e.g. ES)" value={newRoot} onChange={(e) => setNewRoot(e.target.value)} style={{ flex: 1, minWidth: 100 }} title="Futures root symbol" />
              <input className="apex-field mono" placeholder="$ / point" type="number" value={newVal} onChange={(e) => setNewVal(e.target.value)} style={{ width: 96 }} title="Dollars per 1.0 point move per contract" />
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
          </div>
          {overrides.length > 0 && (
            <div className="apex-cf-list">
              {overrides.map(([root, val]) => (
                <div key={root} className="apex-cf-item" style={{ cursor: 'default' }}>
                  <span className="mono" style={{ fontWeight: 900, minWidth: 60 }}>{root}</span>
                  <span className="apex-cf-note" style={{ flex: 1 }}>per point</span>
                  <span className="mono apex-cf-amt" style={{ fontWeight: 800 }}>${val}</span>
                  <button className="apex-cf-del" onClick={() => s.removeFuture(root)} aria-label={`Remove ${root}`} title="Remove">✕</button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="apex-set-label">CASH FLOWS</div>
          <p className="apex-set-note" style={{ marginTop: 0 }}>
            Net deposited: <span className="mono" style={{ fontWeight: 800, color: 'var(--text)' }}>{formatMoney(netDeposits(cashFlowsCcy), { signed: true })}</span>
          </p>
          <div className="apex-cf-add">
            <div className="apex-cf-line">
              <input className="apex-field" type="date" value={cfDate} onChange={(e) => setCfDate(e.target.value)} title="Date of the deposit/withdrawal" />
              <select className="apex-field" value={cfType} onChange={(e) => setCfType(e.target.value as CashFlowType)} title="Deposit adds funds, withdrawal removes them">
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
              </select>
            </div>
            <div className="apex-cf-line">
              <input className="apex-field mono" type="number" placeholder="Amount" value={cfAmount} onChange={(e) => setCfAmount(e.target.value)} style={{ flex: 1, minWidth: 90 }} title="Amount in the chosen currency" />
              <select className="apex-field" value={cfCurrency} onChange={(e) => setCfCurrency(e.target.value as Currency)} title="Currency this entry is denominated in">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
              <input
                className="apex-field mono"
                type="number"
                step="0.0001"
                placeholder={eurUsd.toFixed(4)}
                title="EUR/USD rate locked for this entry (defaults to the current rate)"
                value={cfRate}
                onChange={(e) => setCfRate(e.target.value)}
                style={{ width: 90 }}
              />
            </div>
            <div className="apex-cf-line">
              <input className="apex-field" placeholder="Note (optional)" value={cfNote} onChange={(e) => setCfNote(e.target.value)} style={{ flex: 1, minWidth: 110 }} />
              <Button variant="primary" disabled={!cfDate || !(Number(cfAmount) > 0)} onClick={submitCashFlow}>{editId ? 'Update' : 'Add'}</Button>
              {editId && <Button onClick={resetCfForm}>Cancel</Button>}
            </div>
          </div>
          {cashFlows.length > 0 && (
            <div className="apex-cf-list">
              {[...cashFlows].reverse().map((cf) => {
                const positive = cf.type === 'deposit';
                return (
                  <div
                    key={cf.id}
                    className={`apex-cf-item ${editId === cf.id ? 'is-editing' : ''}`}
                    onClick={() => startEditCashFlow(cf.id)}
                    title="Click to edit"
                  >
                    <div className="apex-cf-when">
                      <span className="mono apex-cf-date">{cf.date.slice(0, 10)}</span>
                      <span style={{ color: positive ? 'var(--profit)' : 'var(--danger)' }}>{positive ? 'Deposit' : 'Withdrawal'}</span>
                    </div>
                    {cf.note && <span className="apex-cf-note">{cf.note}</span>}
                    <div className="apex-cf-amt">
                      <span className="mono" style={{ color: positive ? 'var(--profit)' : 'var(--danger)', fontWeight: 800 }}>
                        {positive ? '+' : '−'}{formatMoney(cf.amount, { currency: cf.currency ?? 'USD' })}
                      </span>
                      <span className="mono apex-cf-rate">@{(cf.eurUsd && cf.eurUsd > 0 ? cf.eurUsd : eurUsd).toFixed(4)}</span>
                    </div>
                    <button
                      className="apex-cf-del"
                      onClick={(e) => { e.stopPropagation(); void removeCashFlow(cf.id); }}
                      aria-label="Delete"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <p className="apex-set-note">Deposits/withdrawals seed the account-balance curve and are marked on the dashboard equity chart and the calendar. They are excluded from PnL/profit.</p>
        </Card>

        <Card>
          <div className="apex-set-label">DATA</div>
          <Row label="Trades stored">
            <span className="mono" style={{ fontWeight: 800 }}>{trades.length}</span>
          </Row>
          <Row label="Cash flows stored">
            <span className="mono" style={{ fontWeight: 800 }}>{cashFlows.length}</span>
          </Row>
          <div style={{ marginTop: 12 }}>
            <Button onClick={() => void exportJson()}>Export JSON</Button>
          </div>

          <div className="apex-wipe-grid">
            <WipeButton label="Wipe trades" hint="Removes executions + trades. Keeps cash flows." active={confirmKind === 'trades'} onArm={() => setConfirmKind('trades')} onCancel={() => setConfirmKind(null)} onConfirm={() => void doWipe('trades')} />
            <WipeButton label="Wipe cash flows" hint="Removes deposits/withdrawals. Keeps trades." active={confirmKind === 'cashflows'} onArm={() => setConfirmKind('cashflows')} onCancel={() => setConfirmKind(null)} onConfirm={() => void doWipe('cashflows')} />
            <WipeButton label="Wipe everything" hint="Removes all trades AND cash flows." active={confirmKind === 'all'} onArm={() => setConfirmKind('all')} onCancel={() => setConfirmKind(null)} onConfirm={() => void doWipe('all')} />
          </div>
          <p className="apex-set-note">Export downloads executions, trades, cash flows + cached rates as JSON. Wipes are permanent and independent — cached FX rates are always kept.</p>
        </Card>
      </div>
    </>
  );
}

function WipeButton({ label, hint, active, onArm, onCancel, onConfirm }: { label: string; hint: string; active: boolean; onArm: () => void; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="apex-wipe-row">
      {active ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, fontSize: '0.8125rem' }}>Sure?</span>
          <Button className="apex-danger" onClick={onConfirm}>Confirm</Button>
          <Button onClick={onCancel}>Cancel</Button>
        </div>
      ) : (
        <>
          <Button className="apex-danger" onClick={onArm}>{label}</Button>
          <span className="apex-wipe-hint">{hint}</span>
        </>
      )}
    </div>
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
