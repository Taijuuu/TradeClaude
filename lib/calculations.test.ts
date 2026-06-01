import { describe, it, expect } from 'vitest'
import {
  calcGrossPnl,
  calcNetPnl,
  calcRMultiple,
  calcProfitFactor,
  calcWinRate,
  calcExpectancy,
  calcMaxDrawdown,
  calcPerformanceScore,
} from './calculations'
import type { Trade } from '@/types'

const makeTrade = (overrides: Partial<Trade>): Trade =>
  ({
    id: '1',
    user_id: 'u1',
    account_id: null,
    symbol: 'EURUSD',
    side: 'long',
    status: 'closed',
    asset_class: 'forex',
    entry_date: '2024-01-01T09:00:00Z',
    exit_date: '2024-01-01T10:00:00Z',
    entry_price: 1.1,
    exit_price: 1.11,
    quantity: 10000,
    stop_loss: 1.09,
    take_profit: 1.12,
    gross_pnl: 100,
    net_pnl: 95,
    commission: 5,
    r_multiple: 1,
    risk_amount: 100,
    rating: 4,
    emotion: 'confident',
    notes: null,
    setup_notes: null,
    mistake_notes: null,
    screenshots: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  } as Trade)

describe('calcGrossPnl', () => {
  it('long win: positive pnl', () => {
    expect(calcGrossPnl('long', 1.1, 1.11, 10000)).toBeCloseTo(100)
  })
  it('long loss: negative pnl', () => {
    expect(calcGrossPnl('long', 1.11, 1.1, 10000)).toBeCloseTo(-100)
  })
  it('short win: positive pnl', () => {
    expect(calcGrossPnl('short', 1.11, 1.1, 10000)).toBeCloseTo(100)
  })
  it('short loss: negative pnl', () => {
    expect(calcGrossPnl('short', 1.1, 1.11, 10000)).toBeCloseTo(-100)
  })
})

describe('calcNetPnl', () => {
  it('subtracts commission', () => {
    expect(calcNetPnl(100, 5)).toBe(95)
  })
})

describe('calcRMultiple', () => {
  it('1R win long', () => {
    expect(calcRMultiple('long', 1.1, 1.11, 1.09)).toBeCloseTo(1)
  })
  it('1R win short', () => {
    expect(calcRMultiple('short', 1.11, 1.1, 1.12)).toBeCloseTo(1)
  })
  it('returns 0 if no stop loss risk', () => {
    expect(calcRMultiple('long', 1.1, 1.11, 1.1)).toBe(0)
  })
})

describe('calcProfitFactor', () => {
  it('basic win/loss ratio', () => {
    const trades = [
      makeTrade({ net_pnl: 200, status: 'closed' }),
      makeTrade({ net_pnl: -100, status: 'closed' }),
    ]
    expect(calcProfitFactor(trades)).toBeCloseTo(2)
  })
  it('returns Infinity when no losses', () => {
    const trades = [makeTrade({ net_pnl: 100, status: 'closed' })]
    expect(calcProfitFactor(trades)).toBe(Infinity)
  })
  it('returns 0 when no wins', () => {
    const trades = [makeTrade({ net_pnl: -100, status: 'closed' })]
    expect(calcProfitFactor(trades)).toBe(0)
  })
})

describe('calcWinRate', () => {
  it('50% win rate', () => {
    const trades = [
      makeTrade({ net_pnl: 100, status: 'closed' }),
      makeTrade({ net_pnl: -50, status: 'closed' }),
    ]
    expect(calcWinRate(trades, 0)).toBeCloseTo(0.5)
  })
  it('ignores open trades', () => {
    const trades = [
      makeTrade({ net_pnl: 100, status: 'closed' }),
      makeTrade({ net_pnl: null, status: 'open' }),
    ]
    expect(calcWinRate(trades, 0)).toBe(1)
  })
})

describe('calcExpectancy', () => {
  it('average net pnl of closed trades', () => {
    const trades = [
      makeTrade({ net_pnl: 100, status: 'closed' }),
      makeTrade({ net_pnl: -50, status: 'closed' }),
    ]
    expect(calcExpectancy(trades)).toBeCloseTo(25)
  })
})

describe('calcMaxDrawdown', () => {
  it('returns negative max drawdown', () => {
    const trades = [
      makeTrade({ net_pnl: 100, exit_date: '2024-01-01T10:00:00Z', status: 'closed' }),
      makeTrade({ net_pnl: -200, exit_date: '2024-01-02T10:00:00Z', status: 'closed' }),
      makeTrade({ net_pnl: 50, exit_date: '2024-01-03T10:00:00Z', status: 'closed' }),
    ]
    expect(calcMaxDrawdown(trades)).toBeCloseTo(-200)
  })
})
