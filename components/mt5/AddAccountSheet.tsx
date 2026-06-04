'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

type Step = 'idle' | 'connecting' | 'polling' | 'importing' | 'done' | 'error'

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export function AddAccountSheet() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('idle')
  const [form, setForm] = useState({ name: '', login: '', password: '', server: '' })
  const [imported, setImported] = useState(0)

  function handleClose(v: boolean) {
    if (!v && (step === 'connecting' || step === 'polling' || step === 'importing')) return
    setOpen(v)
    if (!v) { setStep('idle'); setForm({ name: '', login: '', password: '', server: '' }) }
  }

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
        body: JSON.stringify({
          name: form.name || `MT5-${form.login}`,
          login: form.login,
          investorPassword: form.password,
          server: form.server,
        }),
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

  const inputStyle = { background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} style={{ background: 'var(--accent)', color: 'white' }} className="gap-1.5">
        <Plus size={14} /> Add Account
      </Button>

      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="right" className="w-[420px] overflow-y-auto"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
          <SheetHeader>
            <SheetTitle style={{ color: 'var(--text-primary)' }}>Connecter MetaTrader 5</SheetTitle>
          </SheetHeader>

          {(step === 'connecting' || step === 'polling' || step === 'importing') ? (
            <div className="flex flex-col items-center gap-4 mt-16 text-center">
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                {step === 'connecting' ? 'Connexion à MetaAPI...'
                  : step === 'polling' ? 'Connexion à MT5 (~2 min)...'
                  : 'Import des trades...'}
              </p>
            </div>
          ) : step === 'done' ? (
            <div className="flex flex-col items-center gap-4 mt-16 text-center">
              <CheckCircle2 size={32} style={{ color: '#22c55e' }} />
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{imported} trades importés !</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              <div className="space-y-1">
                <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Nom du compte</Label>
                <Input placeholder="Ex: FTMO Demo" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Login MT5 *</Label>
                <Input placeholder="12345678" value={form.login}
                  onChange={e => setForm(f => ({ ...f, login: e.target.value }))} style={inputStyle} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Investor Password *</Label>
                <Input type="password" placeholder="Mot de passe lecture seule" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} style={inputStyle} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Serveur broker *</Label>
                <Input placeholder="Ex: FTMO-Demo" value={form.server}
                  onChange={e => setForm(f => ({ ...f, server: e.target.value }))} style={inputStyle} />
              </div>
              <Button type="submit" className="w-full" style={{ background: 'var(--accent)', color: 'white' }}>
                Connecter
              </Button>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
