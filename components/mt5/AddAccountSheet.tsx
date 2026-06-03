'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

type Step = 'idle' | 'connecting' | 'polling' | 'importing' | 'done' | 'error'

export function AddAccountSheet() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('idle')
  const [form, setForm] = useState({ name: '', login: '', password: '', server: '' })
  const [imported, setImported] = useState(0)

  function reset() {
    setStep('idle')
    setForm({ name: '', login: '', password: '', server: '' })
    setImported(0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.login || !form.password || !form.server) {
      toast.error('Login, mot de passe et serveur requis')
      return
    }

    try {
      // Step 1 — Create MetaAPI account
      setStep('connecting')
      const connectRes = await fetch('/api/mt5/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name || `MT5-${form.login}`,
          login: form.login,
          investorPassword: form.password,
          server: form.server,
        }),
      })
      const connectData = await connectRes.json()
      if (!connectRes.ok) throw new Error(connectData.error ?? 'Erreur connexion')

      const metaapiAccountId: string = connectData.metaapiAccountId

      // Step 2 — Poll until DEPLOYED
      setStep('polling')
      let deployed = false
      let region = 'vint-hill'
      for (let i = 0; i < 36; i++) {  // max 3 min (36 × 5s)
        await sleep(5000)
        const statusRes = await fetch(`/api/mt5/status?metaapiAccountId=${metaapiAccountId}`)
        const statusData = await statusRes.json()
        if (statusData.state === 'DEPLOYED') {
          deployed = true
          region = statusData.region || 'vint-hill'
          break
        }
        if (statusData.state === 'DEPLOY_FAILED') throw new Error('Déploiement échoué — vérifiez vos identifiants')
      }
      if (!deployed) throw new Error('Timeout de connexion (3 min). Réessayez.')

      // Step 3 — Import trades
      setStep('importing')
      const importRes = await fetch('/api/mt5/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metaapiAccountId, region }),
      })
      const importData = await importRes.json()
      if (!importRes.ok) throw new Error(importData.error ?? 'Erreur import')

      setImported(importData.imported ?? 0)
      setStep('done')
      toast.success(`${importData.imported ?? 0} trades importés depuis MT5`)

      // Reload page after 2s to refresh trades list
      setTimeout(() => { window.location.reload() }, 2000)

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      toast.error(msg)
      setStep('error')
    }
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => { reset(); setOpen(true) }}
        style={{ background: 'var(--accent)', color: 'white' }}
        className="gap-1.5"
      >
        <Plus size={14} />
        Add Account
      </Button>

      <Sheet open={open} onOpenChange={v => { if (!v) reset(); setOpen(v) }}>
        <SheetContent
          side="right"
          className="w-[420px]"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
        >
          <SheetHeader>
            <SheetTitle style={{ color: 'var(--text-primary)' }}>Connecter MetaTrader 5</SheetTitle>
          </SheetHeader>

          {step === 'idle' || step === 'error' ? (
            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              <div className="space-y-1">
                <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Nom du compte (optionnel)</Label>
                <Input
                  placeholder="Ex: IC Markets Live"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Login MT5 *</Label>
                <Input
                  placeholder="Ex: 12345678"
                  value={form.login}
                  onChange={e => setForm(f => ({ ...f, login: e.target.value }))}
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Investor Password *</Label>
                <Input
                  type="password"
                  placeholder="Mot de passe lecture seule"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Dans MT5 : Outils → Paramètres → Serveur → Mot de passe investisseur
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Serveur broker *</Label>
                <Input
                  placeholder="Ex: ICMarketsSC-Demo02"
                  value={form.server}
                  onChange={e => setForm(f => ({ ...f, server: e.target.value }))}
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Visible dans MT5 en bas à droite ou dans Fichier → Ouvrir un compte
                </p>
              </div>
              <Button
                type="submit"
                className="w-full mt-2"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                Connecter
              </Button>
            </form>
          ) : step === 'connecting' ? (
            <StatusView icon={<Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />}
              title="Connexion à MetaAPI..."
              desc="Création du compte, patientez quelques secondes." />
          ) : step === 'polling' ? (
            <StatusView icon={<Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />}
              title="Connexion à MT5 en cours..."
              desc="MetaAPI se connecte à votre terminal. Cela peut prendre jusqu'à 3 minutes." />
          ) : step === 'importing' ? (
            <StatusView icon={<Loader2 size={32} className="animate-spin" style={{ color: '#22c55e' }} />}
              title="Import des trades..."
              desc="Récupération de l'historique des 2 dernières années." />
          ) : (
            <StatusView icon={<CheckCircle2 size={32} style={{ color: '#22c55e' }} />}
              title="Compte connecté !"
              desc={`${imported} trades importés. La page va se recharger automatiquement.`} />
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

function StatusView({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 mt-20 text-center px-4">
      {icon}
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
    </div>
  )
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
