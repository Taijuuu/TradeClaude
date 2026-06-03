# MetaApi MT5 Sync — Design Spec

**Date:** 2026-06-03
**Scope:** Sync MT5 deals from MetaApi into Supabase trades table, triggered manually and via Vercel cron.

---

## Context

One MT5 account already connected to MetaApi:
- Name: `Gold`
- Login: `1513583407`
- Broker: FTMO-Demo
- Account ID: `9a9d9570-3bb5-4432-b00c-1c12001aece6`
- Region: `london`

MetaApi token stored in `METAAPI_TOKEN` env var.

---

## Architecture

```
[Vercel Cron, 15min]  ──┐
                         ├──▶  POST /api/mt5/sync
[Button "Sync MT5"]   ──┘         │
                                   │  1. Read last_mt5_sync_at from settings
                                   │  2. GET MetaApi deals (from → now)
                                   │  3. Filter BUY/SELL only, group by positionId
                                   │  4. Upsert into trades (key: mt5_deal_id)
                                   │  5. Update last_mt5_sync_at in settings
                                   ▼
                             Supabase trades
```

**No SDK.** Pure REST calls to MetaApi. Zero new npm dependencies.

---

## MetaApi Endpoints Used

```
GET https://mt-client-api-v1.london.agiliumtrade.ai
  /users/current/accounts/{accountId}/history-deals/time/{startIso}/{endIso}
  Headers: auth-token: {METAAPI_TOKEN}
```

Response: array of deal objects. Filtered to `DEAL_TYPE_BUY` and `DEAL_TYPE_SELL` only (excludes `DEAL_TYPE_BALANCE`, `DEAL_TYPE_CREDIT`, etc.).

---

## Deal Grouping Logic

MetaApi deals come in pairs per position:
- `entryType = DEAL_ENTRY_IN` → opening deal (entry_price, entry_date, symbol, side, volume)
- `entryType = DEAL_ENTRY_OUT` → closing deal (exit_price, exit_date, profit, commission, swap)

Group deals by `positionId`. Each group = one trade record.

Positions with only an IN deal (no OUT yet) → imported as `status = 'open'`.

---

## Field Mapping

### From deal IN (entry):
| MetaApi field | Supabase trades column |
|---|---|
| `id` | `mt5_deal_id` |
| `positionId` | `mt5_position_id` |
| `symbol` | `symbol` |
| `type == DEAL_TYPE_BUY` | `side = 'long'` |
| `type == DEAL_TYPE_SELL` | `side = 'short'` |
| `price` | `entry_price` |
| `time` | `entry_date` |
| `volume` | `quantity` |
| `commission` | `commission` |

### From deal OUT (exit):
| MetaApi field | Supabase trades column |
|---|---|
| `price` | `exit_price` |
| `time` | `exit_date` |
| `profit` | `gross_pnl` |
| `profit - commission - swap` | `net_pnl` |
| `'closed'` | `status` |

---

## Schema Changes

### `trades` table — new columns:
```sql
ALTER TABLE trades ADD COLUMN mt5_deal_id text;
ALTER TABLE trades ADD COLUMN mt5_position_id text;
CREATE UNIQUE INDEX trades_mt5_deal_id_user_idx ON trades(user_id, mt5_deal_id)
  WHERE mt5_deal_id IS NOT NULL;
```

### `settings` table — new columns:
```sql
ALTER TABLE settings ADD COLUMN last_mt5_sync_at timestamptz;
ALTER TABLE settings ADD COLUMN mt5_account_id text;
```

---

## Delta Sync Logic

1. Read `last_mt5_sync_at` from `settings` for the current user
2. If null → use `2026-01-01T00:00:00.000Z` as start
3. Fetch deals from `last_mt5_sync_at` to `now()`
4. After successful upsert → update `last_mt5_sync_at` to the timestamp of the most recent deal processed

---

## API Route

### `POST /api/mt5/sync`

Response:
```json
{ "inserted": 3, "updated": 1, "skipped": 0, "lastSyncAt": "2026-06-03T16:30:00Z" }
```

Errors:
- `401` if user not authenticated
- `500` with `{ error: string }` on MetaApi or Supabase failure

### `GET /api/mt5/status`
Returns `{ lastSyncAt, accountName, accountId }` — used by the UI to show "Last sync: X min ago".

---

## Vercel Cron

In `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/mt5/sync",
    "schedule": "*/15 * * * *"
  }]
}
```

The cron calls the route as an unauthenticated POST. The route detects cron calls via `x-vercel-cron: 1` header and uses the `SUPABASE_SERVICE_ROLE_KEY` to sync all users who have `mt5_account_id` set.

---

## UI

**Trades page header** — next to "Nouveau trade" button:
- Button `↻ Sync MT5` → calls `POST /api/mt5/sync`, shows spinner while pending
- On success: toast "X trades importés"
- Below button: small text `Dernière sync : il y a X min` (from `/api/mt5/status`)

No dedicated MT5 settings page for now. Account ID is hardcoded from env var initially.

---

## Environment Variables

```
METAAPI_TOKEN=<token>
METAAPI_ACCOUNT_ID=9a9d9570-3bb5-4432-b00c-1c12001aece6
```

---

## Out of Scope (deferred)

- Multi-account support (UI to pick which MT5 account)
- Real-time streaming via WebSocket
- MT5 settings page in the app
- Importing open orders (only deals/closed+open positions)
