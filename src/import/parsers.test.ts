import { describe, expect, it } from 'vitest';
import { parseTlg } from './parseTlg';
import { autoMap, csvHeaders, parseCsv } from './parseCsv';
import { detectFileType } from './detectFileType';

describe('parseTlg', () => {
  // real IB layout: 0 rectype 1 id 2 symbol 3 desc 4 exch 5 action 6 code
  //   7 date 8 time 9 ccy 10 shares 11 mult 12 price 13 proceeds 14 comm 15 fx
  const row = (id: string, sym: string, action: string, code: string, date: string, time: string, sh: number, px: number, comm: number) =>
    ['STK_TRD', id, sym, 'DESC', 'IEX', action, code, date, time, 'USD', String(sh), '1.00', String(px), '0', String(comm), '0.85'].join('|');

  it('parses BUY/SELL rows with separate date+time columns', () => {
    const text = [
      'ACCOUNT_INFORMATION',
      'ACT_INF|U12345678|Name|Individual|Addr',
      'STOCK_TRANSACTIONS',
      row('1', 'AAPL', 'BUYTOOPEN', 'O', '20260414', '14:58:43', 54, 257.97, -1.0),
      row('2', 'AAPL', 'SELLTOCLOSE', 'C', '20260414', '15:21:03', -54, 258.46, -1.3),
    ].join('\n');
    const { executions } = parseTlg(text);
    expect(executions).toHaveLength(2);
    expect(executions[0]).toMatchObject({ symbol: 'AAPL', action: 'buy', quantity: 54, price: 25797, commission: 100 });
    expect(executions[0].timestamp).toBe('2026-04-14T14:58:43.000Z');
    expect(executions[1].action).toBe('sell');
    expect(executions[1].quantity).toBe(54);
  });

  it('treats C;IA (close with adjustment) as a normal closing fill', () => {
    const text = ['STOCK_TRANSACTIONS', row('9', 'AAPL', 'SELLTOCLOSE', 'C;IA', '20260414', '15:21:03', -54, 258.46, -1.3)].join('\n');
    const { executions, warnings } = parseTlg(text);
    expect(executions).toHaveLength(1);
    expect(executions[0].action).toBe('sell');
    expect(warnings).toHaveLength(0);
  });
});

describe('parseCsv', () => {
  const csv = [
    'Symbol,Date,Side,Qty,Price,Commission',
    'AAPL,2026-01-01T10:00:00Z,Buy,100,150.00,1.00',
    'AAPL,2026-01-01T11:00:00Z,Sell,100,155.00,1.00',
  ].join('\n');

  it('auto-maps standard headers', () => {
    const map = autoMap(csvHeaders(csv));
    expect(map.symbol).toBe('Symbol');
    expect(map.action).toBe('Side');
    expect(map.quantity).toBe('Qty');
  });

  it('parses rows into executions', () => {
    const { executions } = parseCsv(csv, autoMap(csvHeaders(csv)));
    expect(executions).toHaveLength(2);
    expect(executions[0]).toMatchObject({ symbol: 'AAPL', action: 'buy', quantity: 100, price: 15000 });
  });
});

describe('detectFileType', () => {
  it('detects by extension', () => {
    expect(detectFileType('x.tlg', '')).toBe('tlg');
    expect(detectFileType('x.csv', '')).toBe('csv');
  });
  it('sniffs pipe-heavy content as tlg', () => {
    const pipey = 'a|b|c|d|e|f|g|h|i|j|k|l\n1|2|3|4|5|6|7|8|9|10|11|12';
    expect(detectFileType('unknown.txt', pipey)).toBe('tlg');
  });
});
