'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Loader2, CheckCircle2, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

type Tab = 'ea' | 'metaapi'
type Step = 'idle' | 'connecting' | 'polling' | 'importing' | 'done' | 'error'

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ── EA Tab ────────────────────────────────────────────────────────────────────
function EASetup() {
  const [key, setKey]       = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/mt5/webhook-key')
      .then(r => r.json())
      .then(d => setKey(d.key))
      .catch(() => {})
  }, [])

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/mt5/webhook`
    : 'https://tradeclaude.vercel.app/api/mt5/webhook'

  const mql5 = key ? `//+------------------------------------------------------------------+
//| TradeClaude — Auto-sync EA                                      |
//+------------------------------------------------------------------+
#property copyright "TradeClaude"
#property version   "1.00"

input string WebhookURL = "${webhookUrl}";
input string UserKey    = "${key}";

void OnTradeTransaction(
   const MqlTradeTransaction& trans,
   const MqlTradeRequest&,
   const MqlTradeResult&
) {
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD) return;

   ulong dealTicket = trans.deal;
   if(!HistoryDealSelect(dealTicket)) return;

   ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
   if(entry != DEAL_ENTRY_OUT) return;

   string   symbol     = HistoryDealGetString(dealTicket,  DEAL_SYMBOL);
   int      dealType   = (int)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
   double   volume     = HistoryDealGetDouble(dealTicket,  DEAL_VOLUME);
   double   closePrice = HistoryDealGetDouble(dealTicket,  DEAL_PRICE);
   double   profit     = HistoryDealGetDouble(dealTicket,  DEAL_PROFIT);
   double   commission = HistoryDealGetDouble(dealTicket,  DEAL_COMMISSION);
   double   swap       = HistoryDealGetDouble(dealTicket,  DEAL_SWAP);
   datetime closeTime  = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
   ulong    posId      = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);

   double   openPrice  = 0;
   datetime openTime   = 0;
   HistorySelectByPosition(posId);
   for(int i = 0; i < HistoryDealsTotal(); i++) {
      ulong t = HistoryDealGetTicket(i);
      if((ENUM_DEAL_ENTRY)HistoryDealGetInteger(t, DEAL_ENTRY) == DEAL_ENTRY_IN) {
         openPrice   = HistoryDealGetDouble(t, DEAL_PRICE);
         openTime    = (datetime)HistoryDealGetInteger(t, DEAL_TIME);
         commission += HistoryDealGetDouble(t, DEAL_COMMISSION);
         break;
      }
   }

   string side = (dealType == DEAL_TYPE_BUY) ? "long" : "short";

   string json = StringFormat(
      "{\\"key\\":\\"%s\\",\\"ticket\\":\\"%d\\",\\"symbol\\":\\"%s\\",\\"side\\":\\"%s\\"," +
      "\\"volume\\":%.2f,\\"openPrice\\":%.5f,\\"closePrice\\":%.5f," +
      "\\"openTime\\":\\"%s\\",\\"closeTime\\":\\"%s\\"," +
      "\\"profit\\":%.2f,\\"commission\\":%.2f,\\"swap\\":%.2f}",
      UserKey, posId, symbol, side,
      volume, openPrice, closePrice,
      TimeToString(openTime,  TIME_DATE|TIME_SECONDS),
      TimeToString(closeTime, TIME_DATE|TIME_SECONDS),
      profit, commission, swap
   );

   char   data[], res_data[];
   string res_headers;
   StringToCharArray(json, data, 0, StringLen(json));
   int code = WebRequest("POST", WebhookURL,
                         "Content-Type: application/json\\r\\n",
                         5000, data, res_data, res_headers);
   if(code == -1) Print("TradeClaude error: ", GetLastError());
   else           Print("TradeClaude: trade synced (", symbol, " ", side, ")");
}` : '// Chargement...'

  function copyCode() {
    navigator.clipboard.writeText(mql5).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="rounded-lg p-3 space-y-1" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Comment installer :</p>
        <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: 'var(--text-muted)' }}>
          <li>Copie le code MQL5 ci-dessous</li>
          <li>Dans MT5 : <strong>Outils → Éditeur MetaQuotes</strong></li>
          <li>Nouveau fichier → Expert Advisor → colle le code</li>
          <li>Compile (F7) puis glisse l'EA sur n'importe quel graphique</li>
          <li>Active <strong>"Autoriser les WebRequests"</strong> dans les paramètres de l'EA</li>
          <li>Ajoute l'URL : <code className="text-[10px]">{webhookUrl}</code></li>
        </ol>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Code MQL5 à copier</Label>
          <button
            onClick={copyCode}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copié !' : 'Copier'}
          </button>
        </div>
        <div
          className="rounded p-3 text-[10px] font-mono overflow-auto"
          style={{
            background: '#0a0a0f',
            border: '1px solid var(--border)',
            color: '#22c55e',
            maxHeight: 280,
            whiteSpace: 'pre',
          }}
        >
          {mql5}
        </div>
      </div>

      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
        Chaque trade fermé sur MT5 apparaîtra automatiquement dans ton journal.
      </p>
    </div>
  )
}

// ── MetaAPI Tab ───────────────────────────────────────────────────────────────
function MetaApiForm() {
  const [step, setStep] = useState<Step>('idle')
  const [form, setForm] = useState({ name: '', login: '', password: '', server: '' })
  const [imported, setImported] = useState(0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.login || !form.password || !form.server) {
      toast.error('Login, mot de passe et serveur requis'); return
    }
    try {
      setStep('connecting')
      const connectRes = await fetch('/api/mt5/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name || `MT5-${form.login}`, login: form.login, investorPassword: form.password, server: form.server }),
      })
      const connectData = await connectRes.json()
      if (!connectRes.ok) throw new Error(connectData.error ?? 'Erreur connexion')

      setStep('polling')
      let deployed = false
      for (let i = 0; i < 36; i++) {
        await sleep(5000)
        const s = await fetch(`/api/mt5/status?metaapiAccountId=${connectData.metaapiAccountId}`).then(r => r.json())
        if (s.state === 'DEPLOYED') { deployed = true; break }
        if (s.state === 'DEPLOY_FAILED') throw new Error('Déploiement échoué — vérifiez vos identifiants')
      }
      if (!deployed) throw new Error('Timeout de connexion (3 min)')

      setStep('importing')
      const importRes = await fetch('/api/mt5/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metaapiAccountId: connectData.metaapiAccountId }),
      })
      const importData = await importRes.json()
      if (!importRes.ok) throw new Error(importData.error ?? 'Erreur import')

      setImported(importData.imported ?? 0)
      setStep('done')
      toast.success(`${importData.imported ?? 0} trades importés`)
      setTimeout(() => window.location.reload(), 2000)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur inconnue')
      setStep('error')
    }
  }

  if (step === 'connecting' || step === 'polling' || step === 'importing') {
    const msg = step === 'connecting' ? 'Connexion à MetaAPI...' : step === 'polling' ? 'Connexion à MT5 (~2 min)...' : 'Import des trades...'
    return (
      <div className="flex flex-col items-center gap-4 mt-16 text-center">
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{msg}</p>
      </div>
    )
  }
  if (step === 'done') return (
    <div className="flex flex-col items-center gap-4 mt-16 text-center">
      <CheckCircle2 size={32} style={{ color: '#22c55e' }} />
      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{imported} trades importés !</p>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="space-y-1">
        <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Nom du compte</Label>
        <Input placeholder="Ex: IC Markets Live" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Login MT5 *</Label>
        <Input placeholder="12345678" value={form.login} onChange={e => setForm(f => ({ ...f, login: e.target.value }))}
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Investor Password *</Label>
        <Input type="password" placeholder="Mot de passe lecture seule" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Serveur broker *</Label>
        <Input placeholder="Ex: ICMarketsSC-Demo02" value={form.server} onChange={e => setForm(f => ({ ...f, server: e.target.value }))}
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
      </div>
      <Button type="submit" className="w-full" style={{ background: 'var(--accent)', color: 'white' }}>
        Connecter
      </Button>
    </form>
  )
}

// ── Main Sheet ────────────────────────────────────────────────────────────────
export function AddAccountSheet() {
  const [open, setOpen] = useState(false)
  const [tab, setTab]   = useState<Tab>('ea')

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} style={{ background: 'var(--accent)', color: 'white' }} className="gap-1.5">
        <Plus size={14} /> Add Account
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[460px] overflow-y-auto"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
          <SheetHeader>
            <SheetTitle style={{ color: 'var(--text-primary)' }}>Connecter MetaTrader 5</SheetTitle>
          </SheetHeader>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 p-1 rounded-lg" style={{ background: 'var(--bg-hover)' }}>
            {([['ea', 'Expert Advisor (gratuit)'], ['metaapi', 'MetaAPI']] as [Tab, string][]).map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-1.5 rounded text-xs font-medium transition-colors"
                style={{
                  background: tab === t ? 'var(--accent)' : 'transparent',
                  color: tab === t ? 'white' : 'var(--text-muted)',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'ea' ? <EASetup /> : <MetaApiForm />}
        </SheetContent>
      </Sheet>
    </>
  )
}
