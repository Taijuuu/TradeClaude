import { describe, it, expect } from 'vitest'
import { groupDealsToTrades, type MetaApiDeal } from './metaapi'

function deal(partial: Partial<MetaApiDeal>): MetaApiDeal {
  return {
    id: '1',
    positionId: 'pos1',
    platform: 'mt5',
    type: 'DEAL_TYPE_BUY',
    entryType: 'DEAL_ENTRY_IN',
    symbol: 'EURUSD',
    time: '2026-06-01T10:00:00.000Z',
    price: 1.1,
    volume: 1,
    profit: 0,
    commission: 0,
    swap: 0,
    ...partial,
  }
}

describe('groupDealsToTrades', () => {
  it('crée un trade ouvert avec un deal IN seul', () => {
    const { trades, closes } = groupDealsToTrades([deal({ id: 'in1' })])
    expect(trades).toHaveLength(1)
    expect(closes).toHaveLength(0)
    expect(trades[0].status).toBe('open')
    expect(trades[0].net_pnl).toBeNull()
  })

  it('crée un trade fermé avec IN + OUT et calcule le net P&L', () => {
    const { trades } = groupDealsToTrades([
      deal({ id: 'in1', commission: -3 }),
      deal({ id: 'out1', entryType: 'DEAL_ENTRY_OUT', type: 'DEAL_TYPE_SELL', price: 1.2, profit: 100, commission: -3, swap: -1, time: '2026-06-01T12:00:00.000Z' }),
    ])
    expect(trades).toHaveLength(1)
    expect(trades[0].status).toBe('closed')
    expect(trades[0].gross_pnl).toBe(100)
    // net = 100 - 3 - 3 - 1
    expect(trades[0].net_pnl).toBe(93)
    expect(trades[0].commission).toBe(6)
    expect(trades[0].exit_price).toBe(1.2)
  })

  it('agrège les clôtures partielles (prix pondéré, profits sommés)', () => {
    const { trades } = groupDealsToTrades([
      deal({ id: 'in1', volume: 2 }),
      deal({ id: 'out1', entryType: 'DEAL_ENTRY_OUT', price: 1.2, volume: 1, profit: 50, time: '2026-06-01T11:00:00.000Z' }),
      deal({ id: 'out2', entryType: 'DEAL_ENTRY_OUT', price: 1.3, volume: 1, profit: 80, time: '2026-06-01T12:00:00.000Z' }),
    ])
    expect(trades).toHaveLength(1)
    expect(trades[0].status).toBe('closed')
    expect(trades[0].gross_pnl).toBe(130)
    expect(trades[0].exit_price).toBeCloseTo(1.25)
    expect(trades[0].exit_date).toBe('2026-06-01T12:00:00.000Z')
  })

  it('garde le trade ouvert si la clôture est partielle', () => {
    const { trades } = groupDealsToTrades([
      deal({ id: 'in1', volume: 2 }),
      deal({ id: 'out1', entryType: 'DEAL_ENTRY_OUT', price: 1.2, volume: 1, profit: 50 }),
    ])
    expect(trades[0].status).toBe('open')
    expect(trades[0].net_pnl).toBeNull()
  })

  it('retourne une PositionClose quand le deal IN est hors fenêtre', () => {
    const { trades, closes } = groupDealsToTrades([
      deal({ id: 'out1', entryType: 'DEAL_ENTRY_OUT', price: 1.25, profit: 75, commission: -2, swap: -1 }),
    ])
    expect(trades).toHaveLength(0)
    expect(closes).toHaveLength(1)
    expect(closes[0].mt5_position_id).toBe('pos1')
    expect(closes[0].gross_pnl).toBe(75)
    expect(closes[0].out_commission).toBe(2)
    expect(closes[0].swap).toBe(-1)
  })

  it('traite DEAL_ENTRY_INOUT (reversal) comme une sortie', () => {
    const { trades } = groupDealsToTrades([
      deal({ id: 'in1' }),
      deal({ id: 'rev1', entryType: 'DEAL_ENTRY_INOUT', price: 1.15, volume: 2, profit: 40 }),
    ])
    expect(trades[0].status).toBe('closed')
    expect(trades[0].gross_pnl).toBe(40)
  })

  it('détecte le côté short depuis DEAL_TYPE_SELL', () => {
    const { trades } = groupDealsToTrades([deal({ type: 'DEAL_TYPE_SELL' })])
    expect(trades[0].side).toBe('short')
  })
})
