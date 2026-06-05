import { describe, expect, it } from 'vitest';
import { parseTradeRepublic } from './parseTradeRepublic';

const HEADER =
  'datetime,date,account_type,category,type,asset_class,name,symbol,shares,price,amount,fee,tax,currency,original_amount,original_currency,fx_rate,description,transaction_id,counterparty_name,counterparty_iban,payment_reference,mcc_code';

const row = (parts: Partial<Record<string, string>>) => {
  const base: Record<string, string> = {
    datetime: '2024-08-08T12:08:06.483Z', date: '2024-08-08', account_type: 'DEFAULT', category: 'TRADING',
    type: 'BUY', asset_class: 'STOCK', name: 'Starbucks', symbol: 'US8552441094', shares: '5.0', price: '70.62',
    amount: '-353.1', fee: '-1.0', tax: '', currency: 'EUR', original_amount: '', original_currency: '', fx_rate: '',
    description: 'Buy trade', transaction_id: 'tx1', counterparty_name: '', counterparty_iban: '', payment_reference: '', mcc_code: '',
  };
  const r = { ...base, ...parts };
  return [r.datetime, r.date, r.account_type, r.category, r.type, r.asset_class, r.name, r.symbol, r.shares, r.price, r.amount, r.fee, r.tax, r.currency, '', '', '', '"' + r.description + '"', r.transaction_id, '', '', '', ''].join(',');
};

describe('parseTradeRepublic', () => {
  it('parses buy/sell rows into executions with ISIN symbol + EUR cents', () => {
    const text = [HEADER, row({ type: 'BUY', symbol: 'US8552441094', shares: '5.0', price: '70.62', fee: '-1.0' })].join('\n');
    const { executions } = parseTradeRepublic(text);
    expect(executions).toHaveLength(1);
    expect(executions[0]).toMatchObject({
      symbol: 'US8552441094',
      assetType: 'stock',
      action: 'buy',
      quantity: 5,
      price: 7062, // cents
      commission: 100,
      account: 'Trade Republic',
    });
  });

  it('derivatives map to a x1 asset (not option) so PnL stays exact', () => {
    const text = [HEADER, row({ asset_class: 'DERIVATIVE', symbol: 'DE000VD0YFG5', shares: '15.0', price: '6.61' })].join('\n');
    expect(parseTradeRepublic(text).executions[0].assetType).toBe('stock');
  });

  it('crypto maps to crypto; sell sign handled', () => {
    const text = [HEADER, row({ asset_class: 'CRYPTO', type: 'SELL', shares: '-2.0', price: '100', symbol: 'BTC' })].join('\n');
    const e = parseTradeRepublic(text).executions[0];
    expect(e.assetType).toBe('crypto');
    expect(e.action).toBe('sell');
    expect(e.quantity).toBe(2);
  });

  it('skips non-trade rows (cancellations / deposits) with a warning', () => {
    const text = [HEADER, row({ type: 'BUY_CANCELLED' }), row({ category: 'CASH', type: 'DEPOSIT' })].join('\n');
    const { executions, warnings } = parseTradeRepublic(text);
    expect(executions).toHaveLength(0);
    expect(warnings.some((w) => w.includes('non-trade'))).toBe(true);
  });
});
