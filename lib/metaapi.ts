const BASE = 'https://mt-client-api-v1.london.agiliumtrade.ai'

export interface MetaApiDeal {
  id: string
  positionId: string
  platform: string
  type: string        // 'DEAL_TYPE_BUY' | 'DEAL_TYPE_SELL' | 'DEAL_TYPE_BALANCE' | ...
  entryType: string   // 'DEAL_ENTRY_IN' | 'DEAL_ENTRY_OUT' | 'DEAL_ENTRY_INOUT'
  symbol: string
  time: string        // ISO 8601
  price: number
  volume: number
  profit: number
  commission: number  // negative value (cost)
  swap: number
  comment?: string
}

export interface MappedTrade {
  mt5_deal_id: string
  mt5_position_id: string
  symbol: string
  side: 'long' | 'short'
  entry_price: number
  entry_date: string
  quantity: number
  commission: number   // stored as positive
  status: 'open' | 'closed'
  exit_price: number | null
  exit_date: string | null
  gross_pnl: number | null
  net_pnl: number | null
}

export async function fetchDeals(from: string, to: string): Promise<MetaApiDeal[]> {
  const accountId = process.env.METAAPI_ACCOUNT_ID!
  const token = process.env.METAAPI_TOKEN!
  const url = `${BASE}/users/current/accounts/${accountId}/history-deals/time/${from}/${to}`

  const res = await fetch(url, {
    headers: { 'auth-token': token },
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`MetaApi ${res.status}: ${text}`)
  }

  const deals: MetaApiDeal[] = await res.json()
  return deals.filter(d => d.type === 'DEAL_TYPE_BUY' || d.type === 'DEAL_TYPE_SELL')
}

export function groupDealsToTrades(deals: MetaApiDeal[]): MappedTrade[] {
  const groups = new Map<string, { in?: MetaApiDeal; out?: MetaApiDeal }>()

  for (const deal of deals) {
    const group = groups.get(deal.positionId) ?? {}
    if (deal.entryType === 'DEAL_ENTRY_IN') group.in = deal
    else if (deal.entryType === 'DEAL_ENTRY_OUT') group.out = deal
    groups.set(deal.positionId, group)
  }

  const trades: MappedTrade[] = []

  for (const [, { in: inDeal, out: outDeal }] of groups) {
    if (!inDeal) continue

    const isClosed = !!outDeal
    // commission from MetaApi is negative — store as positive in DB
    const totalCommission = Math.abs((inDeal.commission ?? 0) + (outDeal?.commission ?? 0))
    const grossPnl = isClosed ? (outDeal!.profit ?? 0) : null
    // net = gross + raw commissions (negative) + swap (pos/neg)
    const netPnl = grossPnl != null
      ? grossPnl + (inDeal.commission ?? 0) + (outDeal!.commission ?? 0) + (outDeal!.swap ?? 0)
      : null

    trades.push({
      mt5_deal_id: inDeal.id,
      mt5_position_id: inDeal.positionId,
      symbol: inDeal.symbol,
      side: inDeal.type === 'DEAL_TYPE_BUY' ? 'long' : 'short',
      entry_price: inDeal.price,
      entry_date: inDeal.time,
      quantity: inDeal.volume,
      commission: totalCommission,
      status: isClosed ? 'closed' : 'open',
      exit_price: isClosed ? outDeal!.price : null,
      exit_date: isClosed ? outDeal!.time : null,
      gross_pnl: grossPnl,
      net_pnl: netPnl,
    })
  }

  return trades
}
