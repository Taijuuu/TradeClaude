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

  let lastError = ''
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 3000 * attempt))

    const res = await fetch(url, {
      headers: { 'auth-token': TOKEN },
      cache: 'no-store',
    })

    if (res.ok) {
      const deals: MetaApiDeal[] = await res.json()
      return deals.filter(d => d.type === 'DEAL_TYPE_BUY' || d.type === 'DEAL_TYPE_SELL')
    }

    const text = await res.text()
    lastError = `MetaApi ${res.status}: ${text}`
    // Only retry on 504 (broker not ready yet)
    if (res.status !== 504) break
  }

  throw new Error(lastError)
}

// Clôture d'une position dont le deal d'entrée est hors de la fenêtre de fetch
// (position ouverte lors d'une sync précédente). La route de sync s'en sert
// pour fermer le trade 'open' existant en base.
export interface PositionClose {
  mt5_position_id: string
  exit_price: number
  exit_date: string
  gross_pnl: number
  out_commission: number  // valeur absolue, à ajouter à la commission d'entrée
  swap: number
}

export interface GroupedDeals {
  trades: MappedTrade[]
  closes: PositionClose[]
}

// Agrège les deals OUT d'une position (gère les clôtures partielles) :
// prix de sortie pondéré par volume, profits/commissions/swaps sommés.
function aggregateOuts(outs: MetaApiDeal[]) {
  const volume = outs.reduce((s, d) => s + (d.volume ?? 0), 0)
  const exitPrice = volume > 0
    ? outs.reduce((s, d) => s + d.price * (d.volume ?? 0), 0) / volume
    : outs[outs.length - 1].price
  return {
    volume,
    exitPrice,
    exitDate: outs.reduce((max, d) => d.time > max ? d.time : max, outs[0].time),
    profit: outs.reduce((s, d) => s + (d.profit ?? 0), 0),
    commission: outs.reduce((s, d) => s + (d.commission ?? 0), 0),
    swap: outs.reduce((s, d) => s + (d.swap ?? 0), 0),
  }
}

export function groupDealsToTrades(deals: MetaApiDeal[]): GroupedDeals {
  const groups = new Map<string, { in?: MetaApiDeal; outs: MetaApiDeal[] }>()

  for (const deal of deals) {
    const group = groups.get(deal.positionId) ?? { outs: [] }
    if (deal.entryType === 'DEAL_ENTRY_IN') group.in = deal
    // DEAL_ENTRY_INOUT (reversal) clôture la position courante : traité comme une sortie
    else if (deal.entryType === 'DEAL_ENTRY_OUT' || deal.entryType === 'DEAL_ENTRY_INOUT') group.outs.push(deal)
    groups.set(deal.positionId, group)
  }

  const trades: MappedTrade[] = []
  const closes: PositionClose[] = []

  for (const [positionId, { in: inDeal, outs }] of groups) {
    if (!inDeal) {
      // Deal d'entrée hors fenêtre : la position a été ouverte avant cette sync.
      if (outs.length === 0) continue
      const agg = aggregateOuts(outs)
      closes.push({
        mt5_position_id: positionId,
        exit_price: agg.exitPrice,
        exit_date: agg.exitDate,
        gross_pnl: agg.profit,
        out_commission: Math.abs(agg.commission),
        swap: agg.swap,
      })
      continue
    }

    const agg = outs.length > 0 ? aggregateOuts(outs) : null
    // Fermé seulement si tout le volume d'entrée est sorti (tolérance flottants)
    const isClosed = agg != null && agg.volume >= inDeal.volume - 1e-9
    const totalCommission = Math.abs((inDeal.commission ?? 0) + (agg?.commission ?? 0))
    const grossPnl = isClosed ? agg!.profit : null
    const netPnl = grossPnl != null
      ? grossPnl + (inDeal.commission ?? 0) + agg!.commission + agg!.swap
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
      exit_price: isClosed ? agg!.exitPrice : null,
      exit_date: isClosed ? agg!.exitDate : null,
      gross_pnl: grossPnl,
      net_pnl: netPnl,
    })
  }

  return { trades, closes }
}
