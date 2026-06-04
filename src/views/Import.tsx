import { useCallback, useRef, useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { PageHeader } from './PageHeader';
import { detectFileType } from '@/import/detectFileType';
import { parseTlg, type ParseResult } from '@/import/parseTlg';
import { autoMap, csvHeaders, parseCsv } from '@/import/parseCsv';
import { reconstructTrades } from '@/domain/reconstructTrades';
import { useData } from '@/store/useData';
import { formatMoney } from '@/domain/money';
import type { Trade } from '@/domain/types';

interface Preview {
  fileName: string;
  parse: ParseResult;
  trades: Trade[];
}

export function Import() {
  const commit = useData((s) => s.commitExecutions);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setStatus(null);
    const text = await file.text();
    const kind = detectFileType(file.name, text.slice(0, 4000));
    const parse = kind === 'tlg' ? parseTlg(text) : parseCsv(text, autoMap(csvHeaders(text)));
    const { trades } = reconstructTrades(parse.executions);
    setPreview({ fileName: file.name, parse, trades });
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const doCommit = useCallback(async () => {
    if (!preview) return;
    const added = await commit(preview.parse.executions);
    setStatus(`Imported ${added} new execution(s) from ${preview.fileName}. ${preview.trades.length} trade(s) reconstructed.`);
    setPreview(null);
  }, [preview, commit]);

  return (
    <>
      <PageHeader eyebrow="Data" title="Import" />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `1.5px dashed ${drag ? 'var(--accent)' : 'var(--line)'}`,
          borderRadius: 'var(--r-panel)',
          background: drag ? 'var(--accent-soft)' : 'var(--card)',
          padding: 40,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'background .18s ease, border-color .18s ease',
        }}
      >
        <div style={{ fontWeight: 900, fontSize: '1.125rem', marginBottom: 6 }}>Drop a .tlg or .csv file</div>
        <div style={{ color: 'var(--muted)', fontWeight: 700 }}>
          IB TradeLog (.tlg) or any broker CSV — or click to browse
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".tlg,.csv,text/csv"
          hidden
          onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])}
        />
      </div>

      {status && (
        <Card style={{ marginTop: 12, borderColor: 'var(--accent)' }}>
          <span style={{ fontWeight: 700 }}>{status}</span>
        </Card>
      )}

      {preview && (
        <Card style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 900 }}>Preview — {preview.fileName}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={() => setPreview(null)}>Cancel</Button>
              <Button variant="primary" onClick={() => void doCommit()} disabled={preview.trades.length === 0}>
                Import {preview.trades.length} trade(s)
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 18, color: 'var(--muted)', fontWeight: 700, marginBottom: 12 }}>
            <span className="mono">{preview.parse.executions.length} executions</span>
            <span className="mono">{preview.trades.length} trades</span>
          </div>

          {preview.parse.warnings.length > 0 && (
            <ul style={{ color: 'var(--danger)', fontSize: '0.8125rem', margin: '0 0 12px', paddingLeft: 18 }}>
              {preview.parse.warnings.slice(0, 8).map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}

          <div style={{ overflow: 'auto', maxHeight: 320 }}>
            <table className="mono" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ color: 'var(--muted)', textAlign: 'left' }}>
                  {['Symbol', 'Side', 'Open', 'Close', 'Qty', 'Net PnL'].map((h) => (
                    <th key={h} style={{ padding: '6px 10px', borderBottom: '1px solid var(--line-soft)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.trades.slice(0, 50).map((t) => (
                  <tr key={t.id}>
                    <td style={cell}>{t.symbol}</td>
                    <td style={cell}>{t.side}</td>
                    <td style={cell}>{t.openDate.slice(0, 10)}</td>
                    <td style={cell}>{t.closeDate?.slice(0, 10) ?? 'open'}</td>
                    <td style={cell}>{t.qty}</td>
                    <td style={{ ...cell, color: t.netPnl >= 0 ? 'var(--profit)' : 'var(--danger)' }}>
                      {formatMoney(t.netPnl, { signed: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

const cell: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid var(--line-soft)' };
