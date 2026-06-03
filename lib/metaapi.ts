const PROV_URL = 'https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai'
const BASE = 'https://mt-client-api-v1.london.agiliumtrade.ai'
const TOKEN = process.env.METAAPI_TOKEN!

function headers() {
  return { 'Content-Type': 'application/json', 'auth-token': TOKEN }
}

// ── Provisioning API ──────────────────────────────────────────

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
      reliability: 'regular',
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

// ── Deal sync API ─────────────────────────────────────────────

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
  const url = `${BASE}/users/current/accounts/${accountId}/history-deals/time/${from}/${to}`

  const res = await fetch(url, {
    headers: { 'auth-token': TOKEN },
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
    const totalCommission = Math.abs((inDeal.commission ?? 0) + (outDeal?.commission ?? 0))
    const grossPnl = isClosed ? (outDeal!.profit ?? 0) : null
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
