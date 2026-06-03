# MetaTrader 5 Integration — Design Spec
**Date:** 2026-06-03  
**Service:** MetaAPI (metaapi.cloud)

---

## Goal
Automatically import MT5 trades into TradeClaude without any manual input. When a trade is closed on MT5, it appears in the journal within seconds.

---

## UI Changes

### "Add Account" button
- Replaces the reset button in `GlobalFilters` (top right)
- Opens a right-side Sheet with a form

### Form fields
| Field | Type | Description |
|---|---|---|
| Account Name | text | Label shown in the app |
| MT5 Login | number | MT5 account number |
| Investor Password | password | Read-only MT5 password |
| Broker Server | text | e.g. `ICMarketsSC-Demo02` |

### Connection states
- **Idle** — form empty, submit button active
- **Connecting** — spinner, button disabled, "Connexion en cours (~2 min)..."
- **Connected** — green dot + "Connecté", account visible in the account selector
- **Error** — toast error with MetaAPI message

---

## API Routes

### `POST /api/mt5/connect`
**Body:** `{ name, login, investorPassword, server, accountId? }`  
**Flow:**
1. Call MetaAPI to create account deployment
2. Poll until state = DEPLOYED (max 3 min)
3. Fetch full trade history from MetaAPI
4. Map MT5 trades → TradeClaude trades, upsert avoiding duplicates (by `mt5_ticket`)
5. Configure MetaAPI webhook → `https://tradeclaude.vercel.app/api/mt5/webhook`
6. Save `metaapi_account_id` + `mt5_login` to `accounts` table
7. Return `{ ok: true, account }`

### `POST /api/mt5/webhook`
**Called by MetaAPI on every trade event.**  
**Flow:**
1. Verify event type = `DEAL_TYPE_SELL` or closed position
2. Map MT5 deal → Trade row
3. Upsert to `trades` table (skip if `mt5_ticket` already exists)
4. Return 200

### `DELETE /api/mt5/disconnect/[id]`
**Flow:**
1. Get `metaapi_account_id` from account row
2. Call MetaAPI to undeploy + delete account
3. Clear `metaapi_account_id` from `accounts` table
4. Return `{ ok: true }`

---

## Trade Mapping (MT5 → TradeClaude)

| MT5 field | TradeClaude field | Notes |
|---|---|---|
| symbol | symbol | direct |
| type | side | BUY → long, SELL → short |
| openPrice | entry_price | |
| closePrice | exit_price | |
| openTime | entry_date | ISO string |
| closeTime | exit_date | ISO string |
| profit + commission + swap | net_pnl | sum |
| profit | gross_pnl | |
| commission | commission | |
| volume | quantity | lots |
| ticket (string) | mt5_ticket | dedup key |

Status = `closed` if closeTime exists, else `open`.

---

## DB Changes

Add to `accounts` table:
- `metaapi_account_id` text nullable
- `mt5_login` text nullable

Add to `trades` table:
- `mt5_ticket` text nullable unique — prevents duplicate imports

---

## Environment Variables

| Variable | Description |
|---|---|
| `METAAPI_TOKEN` | MetaAPI REST API token (from metaapi.cloud dashboard) |
| `NEXT_PUBLIC_APP_URL` | Already set — used for webhook URL |

---

## Error Handling
- MetaAPI connection timeout (>3 min) → toast error "Connexion timeout, vérifiez vos identifiants"
- Invalid credentials → MetaAPI returns 401 → toast "Identifiants incorrects"
- Duplicate trade (mt5_ticket exists) → silently skip (upsert with `on_conflict = ignore`)
- Webhook called before account exists → return 200 (ignore)
