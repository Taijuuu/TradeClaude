const PROV_URL = 'https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai'
const TOKEN = process.env.METAAPI_TOKEN!

function headers() {
  return { 'Content-Type': 'application/json', 'auth-token': TOKEN }
}

export interface MetaApiAccount {
  id: string
  state: string
  connectionStatus: string
  region: string
  name: string
  login: string
  server: string
}

export async function createMetaApiAccount(
  name: string,
  login: string,
  password: string,
  server: string
): Promise<MetaApiAccount> {
  const res = await fetch(`${PROV_URL}/users/current/accounts`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      name,
      type: 'cloud',
      login,
      password,
      server,
      platform: 'mt5',
      magic: 0,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `MetaAPI error ${res.status}`)
  }
  return res.json()
}

export async function getMetaApiAccount(accountId: string): Promise<MetaApiAccount> {
  const res = await fetch(`${PROV_URL}/users/current/accounts/${accountId}`, {
    headers: headers(),
  })
  if (!res.ok) throw new Error(`MetaAPI error ${res.status}`)
  return res.json()
}

export async function deployMetaApiAccount(accountId: string): Promise<void> {
  await fetch(`${PROV_URL}/users/current/accounts/${accountId}/deploy`, {
    method: 'POST',
    headers: headers(),
  })
}

export async function deleteMetaApiAccount(accountId: string): Promise<void> {
  await fetch(`${PROV_URL}/users/current/accounts/${accountId}`, {
    method: 'DELETE',
    headers: headers(),
  })
}

export interface MetaApiDeal {
  id: string
  positionId: string
  type: string        // DEAL_TYPE_BUY | DEAL_TYPE_SELL
  entryType: string   // DEAL_ENTRY_IN | DEAL_ENTRY_OUT
  symbol: string
  volume: number
  price: number
  profit: number
  commission: number
  swap: number
  time: string        // ISO datetime
  platform: string
}

export async function fetchDeals(
  accountId: string,
  region: string,
  startTime: string,
  endTime: string
): Promise<MetaApiDeal[]> {
  const clientUrl = `https://mt-client-api-v1.${region}.agiliumtrade.agiliumtrade.ai`
  const start = encodeURIComponent(startTime)
  const end   = encodeURIComponent(endTime)

  const res = await fetch(
    `${clientUrl}/users/current/accounts/${accountId}/history-deals/time/${start}/${end}`,
    { headers: headers() }
  )
  if (!res.ok) {
    // region might differ — try generic
    const fallback = await fetch(
      `https://mt-client-api-v1.vint-hill.agiliumtrade.agiliumtrade.ai/users/current/accounts/${accountId}/history-deals/time/${start}/${end}`,
      { headers: headers() }
    )
    if (!fallback.ok) return []
    const d = await fallback.json()
    return d.deals ?? d ?? []
  }
  const d = await res.json()
  return d.deals ?? d ?? []
}

export interface MappedTrade {
  symbol: string
  side: 'long' | 'short'
  status: 'closed'
  asset_class: 'forex'
  entry_date: string
  exit_date: string
  entry_price: number
  exit_price: number
  quantity: number
  gross_pnl: number
  commission: number
  net_pnl: number
  mt5_ticket: string
}

export function dealsToTrades(deals: MetaApiDeal[]): MappedTrade[] {
  // Group by positionId
  const positions = new Map<string, { in?: MetaApiDeal; out?: MetaApiDeal }>()

  for (const deal of deals) {
    if (!deal.positionId) continue
    if (!positions.has(deal.positionId)) positions.set(deal.positionId, {})
    const pos = positions.get(deal.positionId)!
    if (deal.entryType === 'DEAL_ENTRY_IN')  pos.in  = deal
    if (deal.entryType === 'DEAL_ENTRY_OUT') pos.out = deal
  }

  const trades: MappedTrade[] = []
  for (const [positionId, pos] of positions.entries()) {
    if (!pos.in || !pos.out) continue

    const commission = (pos.in.commission ?? 0) + (pos.out.commission ?? 0)
    const swap       = pos.out.swap ?? 0
    const grossPnl   = pos.out.profit ?? 0
    const netPnl     = grossPnl + commission + swap

    trades.push({
      symbol:       pos.in.symbol,
      side:         pos.in.type === 'DEAL_TYPE_BUY' ? 'long' : 'short',
      status:       'closed',
      asset_class:  'forex',
      entry_date:   pos.in.time,
      exit_date:    pos.out.time,
      entry_price:  pos.in.price,
      exit_price:   pos.out.price,
      quantity:     pos.in.volume,
      gross_pnl:    parseFloat(grossPnl.toFixed(4)),
      commission:   parseFloat(commission.toFixed(4)),
      net_pnl:      parseFloat(netPnl.toFixed(4)),
      mt5_ticket:   positionId,
    })
  }

  return trades
}
