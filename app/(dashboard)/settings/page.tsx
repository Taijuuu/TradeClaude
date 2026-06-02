'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type DisplayMode = 'dollar' | 'percentage' | 'r_multiple'

interface SettingsData {
  default_commission: number
  breakeven_range: number
  currency: string
  timezone: string
  display_mode: DisplayMode
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    default_commission: 0,
    breakeven_range: 0,
    currency: 'USD',
    timezone: 'Europe/Paris',
    display_mode: 'dollar',
  })
  const [apiKey, setApiKey] = useState('')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.settings) setSettings(d.settings)
        setHasApiKey(d.hasApiKey ?? false)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    const body: Record<string, unknown> = { ...settings }
    if (apiKey.trim()) body.anthropic_api_key = apiKey.trim()
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('Paramètres sauvegardés')
      if (apiKey.trim()) { setHasApiKey(true); setApiKey('') }
    } else {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  if (loading) {
    return (
      <main className="flex-1 overflow-auto p-6">
        <span style={{ color: 'var(--text-muted)' }}>Chargement...</span>
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-auto p-6">
      <div className="max-w-lg space-y-6">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Settings</h2>

        {/* Section Général */}
        <div className="rounded-lg p-5 space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Général</h3>

          <div className="space-y-1">
            <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Commission par défaut</Label>
            <Input
              type="number"
              value={settings.default_commission}
              onChange={e => setSettings(s => ({ ...s, default_commission: parseFloat(e.target.value) || 0 }))}
              step="0.01"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Plage breakeven</Label>
            <Input
              type="number"
              value={settings.breakeven_range}
              onChange={e => setSettings(s => ({ ...s, breakeven_range: parseFloat(e.target.value) || 0 }))}
              step="0.01"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Devise</Label>
            <Select value={settings.currency} onValueChange={v => setSettings(s => ({ ...s, currency: v }))}>
              <SelectTrigger style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD — Dollar américain</SelectItem>
                <SelectItem value="EUR">EUR — Euro</SelectItem>
                <SelectItem value="GBP">GBP — Livre sterling</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Fuseau horaire</Label>
            <Select value={settings.timezone} onValueChange={v => setSettings(s => ({ ...s, timezone: v }))}>
              <SelectTrigger style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Europe/Paris">Europe/Paris (UTC+1/+2)</SelectItem>
                <SelectItem value="Europe/London">Europe/London (UTC+0/+1)</SelectItem>
                <SelectItem value="America/New_York">America/New_York (UTC−5/−4)</SelectItem>
                <SelectItem value="America/Chicago">America/Chicago (UTC−6/−5)</SelectItem>
                <SelectItem value="Asia/Tokyo">Asia/Tokyo (UTC+9)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Mode d'affichage</Label>
            <div className="flex gap-2 flex-wrap">
              {(['dollar', 'percentage', 'r_multiple'] as DisplayMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setSettings(s => ({ ...s, display_mode: mode }))}
                  className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                  style={{
                    background: settings.display_mode === mode ? 'var(--accent)' : 'var(--bg-hover)',
                    color: settings.display_mode === mode ? 'white' : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {mode === 'dollar' ? '$ Dollar' : mode === 'percentage' ? '% Pourcentage' : 'R Multiple'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section AI */}
        <div className="rounded-lg p-5 space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>AI & Clé API</h3>
          <div className="space-y-1">
            <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Clé API Anthropic
              {hasApiKey && <span className="ml-2" style={{ color: '#22c55e' }}>✓ Configurée</span>}
            </Label>
            <Input
              type="password"
              placeholder={hasApiKey ? '••••••••••••••••' : 'sk-ant-...'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Nécessaire pour l'onglet AI Insights. La clé n'est jamais exposée côté client.
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </div>
    </main>
  )
}
