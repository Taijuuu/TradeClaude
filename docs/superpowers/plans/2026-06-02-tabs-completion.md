# Tabs Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 5 stub pages (Settings, Strategies, Notebook, Reports, AI Insights) with fully functional UIs, without touching the existing design.

**Architecture:** Each page is independent. All backend API routes already exist except `strategies/[id]` (Task 1). Pages use existing CSS variables, UI components from `@/components/ui/`, and the `toast` (sonner) notification pattern established in TradeForm.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase, Recharts 3.x, shadcn/ui components, Zustand (filtersStore for Reports).

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `app/api/strategies/[id]/route.ts` | **Create** | PUT + DELETE for individual strategy |
| `app/(dashboard)/settings/page.tsx` | **Replace stub** | Settings form |
| `app/(dashboard)/strategies/page.tsx` | **Replace stub** | Strategies list + CRUD drawer |
| `app/(dashboard)/notebook/page.tsx` | **Replace stub** | Notebook entries list + CRUD drawer |
| `app/(dashboard)/reports/page.tsx` | **Replace stub** | Equity curve + monthly P&L + stats table |
| `app/(dashboard)/ai-insights/page.tsx` | **Replace stub** | AI analysis with preset prompts |

---

## Task 1: Strategies API Route [id]

**Files:**
- Create: `app/api/strategies/[id]/route.ts`

This route is missing. Without it, the Strategies page cannot update or delete individual strategies.

- [ ] **Create `app/api/strategies/[id]/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, description, asset_class, entry_rules, exit_rules, risk_rules, checklist } = body

  const { data, error } = await supabase
    .from('strategies')
    .update({
      name,
      description: description || null,
      asset_class: asset_class || null,
      entry_rules: entry_rules || null,
      exit_rules: exit_rules || null,
      risk_rules: risk_rules || null,
      checklist: checklist ?? [],
    } as any)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ strategy: data })
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('strategies')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
```

- [ ] **Commit**

```bash
git add app/api/strategies/\[id\]/route.ts
git commit -m "feat: add PUT/DELETE route for strategies/[id]"
```

---

## Task 2: Settings Page

**Files:**
- Modify: `app/(dashboard)/settings/page.tsx`

Replaces the stub with a functional form. Uses `GET /api/settings` and `PUT /api/settings`.

- [ ] **Replace `app/(dashboard)/settings/page.tsx`**

```tsx
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
```

- [ ] **Commit**

```bash
git add "app/(dashboard)/settings/page.tsx"
git commit -m "feat: implement Settings page"
```

---

## Task 3: Strategies Page

**Files:**
- Modify: `app/(dashboard)/strategies/page.tsx`

Uses `GET/POST /api/strategies` and `PUT/DELETE /api/strategies/[id]` (created in Task 1).

- [ ] **Replace `app/(dashboard)/strategies/page.tsx`**

```tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Strategy } from '@/types'

const ASSET_CLASS_LABELS: Record<string, string> = {
  forex: 'Forex', stocks: 'Actions', crypto: 'Crypto',
  futures: 'Futures', options: 'Options',
}

interface FormState {
  name: string
  description: string
  asset_class: string
  entry_rules: string
  exit_rules: string
  risk_rules: string
  checklist: string[]
}

const EMPTY_FORM: FormState = {
  name: '', description: '', asset_class: '', entry_rules: '',
  exit_rules: '', risk_rules: '', checklist: [],
}

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Strategy | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [newCheckItem, setNewCheckItem] = useState('')

  const loadStrategies = useCallback(() => {
    setLoading(true)
    fetch('/api/strategies')
      .then(r => r.json())
      .then(d => setStrategies(d.strategies ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadStrategies() }, [loadStrategies])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setNewCheckItem('')
    setDrawerOpen(true)
  }

  function openEdit(s: Strategy) {
    setEditing(s)
    setForm({
      name: s.name,
      description: s.description ?? '',
      asset_class: s.asset_class ?? '',
      entry_rules: s.entry_rules ?? '',
      exit_rules: s.exit_rules ?? '',
      risk_rules: s.risk_rules ?? '',
      checklist: (s.checklist as { label: string }[]).map(c => c.label),
    })
    setNewCheckItem('')
    setDrawerOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Le nom est requis'); return }
    setSaving(true)
    const body = {
      name: form.name.trim(),
      description: form.description || null,
      asset_class: form.asset_class || null,
      entry_rules: form.entry_rules || null,
      exit_rules: form.exit_rules || null,
      risk_rules: form.risk_rules || null,
      checklist: form.checklist.map((label, i) => ({ id: String(i), label, checked: false })),
    }
    const url = editing ? `/api/strategies/${editing.id}` : '/api/strategies'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) {
      toast.success(editing ? 'Stratégie mise à jour' : 'Stratégie créée')
      setDrawerOpen(false)
      loadStrategies()
    } else {
      const d = await res.json()
      toast.error(d.error ?? 'Erreur')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette stratégie ?')) return
    const res = await fetch(`/api/strategies/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Stratégie supprimée')
      loadStrategies()
    } else {
      toast.error('Erreur lors de la suppression')
    }
  }

  function addCheckItem() {
    const label = newCheckItem.trim()
    if (!label) return
    setForm(f => ({ ...f, checklist: [...f.checklist, label] }))
    setNewCheckItem('')
  }

  function removeCheckItem(i: number) {
    setForm(f => ({ ...f, checklist: f.checklist.filter((_, idx) => idx !== i) }))
  }

  return (
    <main className="flex-1 overflow-auto flex flex-col">
      {/* Sub-header */}
      <div
        className="px-6 py-3 flex items-center justify-between border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {strategies.length} stratégie{strategies.length !== 1 ? 's' : ''}
        </span>
        <Button
          size="sm"
          onClick={openCreate}
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <Plus size={14} className="mr-1" /> New Strategy
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Chargement...</p>
        ) : strategies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucune stratégie</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Clique sur + New Strategy pour commencer</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {strategies.map(s => (
              <div
                key={s.id}
                className="rounded-lg p-4 flex flex-col gap-2"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(s)}
                      className="p-1 rounded hover:bg-[var(--bg-hover)]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1 rounded hover:bg-[var(--bg-hover)]"
                      style={{ color: '#ef4444' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {s.asset_class && (
                  <Badge style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--accent)', border: 'none', fontSize: 10, width: 'fit-content' }}>
                    {ASSET_CLASS_LABELS[s.asset_class] ?? s.asset_class}
                  </Badge>
                )}
                {s.description && (
                  <p className="text-xs line-clamp-2" style={{ color: 'var(--text-muted)' }}>{s.description}</p>
                )}
                {(s.checklist as { label: string }[]).length > 0 && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {(s.checklist as { label: string }[]).length} règles checklist
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="w-[480px] overflow-y-auto"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
        >
          <SheetHeader>
            <SheetTitle style={{ color: 'var(--text-primary)' }}>
              {editing ? 'Modifier la stratégie' : 'Nouvelle stratégie'}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Nom *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Breakout H4"
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Asset class</Label>
              <Select value={form.asset_class || 'none'} onValueChange={v => setForm(f => ({ ...f, asset_class: v === 'none' ? '' : v }))}>
                <SelectTrigger style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  <SelectValue placeholder="Tous les marchés" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tous les marchés</SelectItem>
                  <SelectItem value="forex">Forex</SelectItem>
                  <SelectItem value="stocks">Actions</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="futures">Futures</SelectItem>
                  <SelectItem value="options">Options</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Règles d'entrée</Label>
              <Textarea
                value={form.entry_rules}
                onChange={e => setForm(f => ({ ...f, entry_rules: e.target.value }))}
                rows={3}
                placeholder="Ex: Attendre la cassure du niveau clé..."
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Règles de sortie</Label>
              <Textarea
                value={form.exit_rules}
                onChange={e => setForm(f => ({ ...f, exit_rules: e.target.value }))}
                rows={3}
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Règles de risk</Label>
              <Textarea
                value={form.risk_rules}
                onChange={e => setForm(f => ({ ...f, risk_rules: e.target.value }))}
                rows={2}
                placeholder="Ex: Max 1% du capital par trade"
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Checklist</Label>
              {form.checklist.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs flex-1" style={{ color: 'var(--text-primary)' }}>{item}</span>
                  <button onClick={() => removeCheckItem(i)} style={{ color: 'var(--text-muted)' }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newCheckItem}
                  onChange={e => setNewCheckItem(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCheckItem() } }}
                  placeholder="Ajouter une règle..."
                  className="text-xs"
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <Button size="sm" variant="ghost" onClick={addCheckItem} style={{ color: 'var(--text-muted)' }}>
                  <Plus size={14} />
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                {saving ? 'Sauvegarde...' : editing ? 'Mettre à jour' : 'Créer'}
              </Button>
              <Button variant="ghost" onClick={() => setDrawerOpen(false)} style={{ color: 'var(--text-muted)' }}>
                Annuler
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  )
}
```

- [ ] **Commit**

```bash
git add "app/(dashboard)/strategies/page.tsx"
git commit -m "feat: implement Strategies page with CRUD"
```

---

## Task 4: Notebook Page

**Files:**
- Modify: `app/(dashboard)/notebook/page.tsx`

Uses `GET/POST /api/notebook` and `PUT/DELETE /api/notebook/[id]`.

- [ ] **Replace `app/(dashboard)/notebook/page.tsx`**

```tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { NotebookEntry } from '@/types'

type NoteType = 'daily' | 'weekly' | 'plan' | 'recap' | 'custom'

const TYPE_LABELS: Record<NoteType, string> = {
  daily: 'Daily', weekly: 'Weekly', plan: 'Plan', recap: 'Recap', custom: 'Custom',
}

const TYPE_COLORS: Record<NoteType, string> = {
  daily: 'rgba(34,197,94,0.15)',
  weekly: 'rgba(99,102,241,0.15)',
  plan: 'rgba(234,179,8,0.15)',
  recap: 'rgba(239,68,68,0.15)',
  custom: 'rgba(124,58,237,0.15)',
}

const TYPE_TEXT: Record<NoteType, string> = {
  daily: '#22c55e', weekly: '#6366f1', plan: '#eab308', recap: '#ef4444', custom: 'var(--accent)',
}

const ALL_FILTERS = ['all', 'daily', 'weekly', 'plan', 'recap', 'custom'] as const

interface FormState {
  title: string
  type: NoteType
  trade_date: string
  content: string
}

const EMPTY_FORM: FormState = { title: '', type: 'custom', trade_date: '', content: '' }

export default function NotebookPage() {
  const [entries, setEntries] = useState<NotebookEntry[]>([])
  const [filter, setFilter] = useState<'all' | NoteType>('all')
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<NotebookEntry | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const loadEntries = useCallback((type?: string) => {
    setLoading(true)
    const params = type && type !== 'all' ? `?type=${type}` : ''
    fetch(`/api/notebook${params}`)
      .then(r => r.json())
      .then(d => setEntries(d.entries ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadEntries(filter) }, [filter, loadEntries])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDrawerOpen(true)
  }

  function openEdit(entry: NotebookEntry) {
    setEditing(entry)
    setForm({
      title: entry.title,
      type: entry.type as NoteType,
      trade_date: entry.trade_date ?? '',
      content: entry.content,
    })
    setDrawerOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Le titre est requis'); return }
    setSaving(true)
    const body = {
      title: form.title.trim(),
      type: form.type,
      trade_date: form.trade_date || null,
      content: form.content,
    }
    const url = editing ? `/api/notebook/${editing.id}` : '/api/notebook'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) {
      toast.success(editing ? 'Entrée mise à jour' : 'Entrée créée')
      setDrawerOpen(false)
      loadEntries(filter)
    } else {
      const d = await res.json()
      toast.error(d.error ?? 'Erreur')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette entrée ?')) return
    const res = await fetch(`/api/notebook/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Entrée supprimée')
      loadEntries(filter)
    } else {
      toast.error('Erreur lors de la suppression')
    }
  }

  return (
    <main className="flex-1 overflow-auto flex flex-col">
      {/* Sub-header */}
      <div
        className="px-6 py-3 flex items-center justify-between border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex gap-1">
          {ALL_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1 rounded text-xs font-medium transition-colors"
              style={{
                background: filter === f ? 'var(--accent)' : 'transparent',
                color: filter === f ? 'white' : 'var(--text-muted)',
              }}
            >
              {f === 'all' ? 'Tous' : TYPE_LABELS[f as NoteType]}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          onClick={openCreate}
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <Plus size={14} className="mr-1" /> New Entry
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Chargement...</p>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucune entrée</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Commence à écrire ton journal de trading</p>
          </div>
        ) : (
          entries.map(entry => (
            <div
              key={entry.id}
              className="rounded-lg p-4 flex items-start justify-between gap-3"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {entry.title}
                  </span>
                  <Badge style={{
                    background: TYPE_COLORS[entry.type as NoteType],
                    color: TYPE_TEXT[entry.type as NoteType],
                    border: 'none', fontSize: 10, whiteSpace: 'nowrap',
                  }}>
                    {TYPE_LABELS[entry.type as NoteType]}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(entry.created_at).toLocaleDateString('fr-FR')}
                  </span>
                  {entry.trade_date && (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Trade: {entry.trade_date}
                    </span>
                  )}
                </div>
                {entry.content && (
                  <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--text-muted)' }}>
                    {entry.content}
                  </p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => openEdit(entry)}
                  className="p-1 rounded hover:bg-[var(--bg-hover)]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="p-1 rounded hover:bg-[var(--bg-hover)]"
                  style={{ color: '#ef4444' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="w-[480px] overflow-y-auto"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
        >
          <SheetHeader>
            <SheetTitle style={{ color: 'var(--text-primary)' }}>
              {editing ? 'Modifier l\'entrée' : 'Nouvelle entrée'}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Titre *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as NoteType }))}>
                <SelectTrigger style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="plan">Plan</SelectItem>
                  <SelectItem value="recap">Recap</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Date du trade (optionnel)</Label>
              <Input
                type="date"
                value={form.trade_date}
                onChange={e => setForm(f => ({ ...f, trade_date: e.target.value }))}
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Contenu</Label>
              <Textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={10}
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                {saving ? 'Sauvegarde...' : editing ? 'Mettre à jour' : 'Créer'}
              </Button>
              <Button variant="ghost" onClick={() => setDrawerOpen(false)} style={{ color: 'var(--text-muted)' }}>
                Annuler
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  )
}
```

- [ ] **Commit**

```bash
git add "app/(dashboard)/notebook/page.tsx"
git commit -m "feat: implement Notebook page with CRUD"
```

---

## Task 5: Reports Page

**Files:**
- Modify: `app/(dashboard)/reports/page.tsx`

Uses recharts `LineChart` (equity curve) + `BarChart` (monthly P&L). Data from `useStats` + `useTrades({}, 500)`.

- [ ] **Replace `app/(dashboard)/reports/page.tsx`**

```tsx
'use client'
import { useMemo } from 'react'
import { useFiltersStore } from '@/store/filtersStore'
import { useStats } from '@/hooks/useStats'
import { useTrades } from '@/hooks/useTrades'
import { formatCurrency } from '@/lib/utils'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts'

export default function ReportsPage() {
  const { dateFrom, dateTo, accountIds } = useFiltersStore()
  const accountId = accountIds[0]
  const { stats } = useStats({ dateFrom, dateTo, accountId })
  const { trades } = useTrades({ dateFrom, dateTo, accountId, status: 'closed' }, 500)

  // Equity curve: cumulative P&L sorted by exit_date
  const equityCurve = useMemo(() => {
    const sorted = [...trades]
      .filter(t => t.exit_date && t.net_pnl != null)
      .sort((a, b) => new Date(a.exit_date!).getTime() - new Date(b.exit_date!).getTime())
    let cum = 0
    return sorted.map(t => {
      cum += t.net_pnl!
      return {
        date: new Date(t.exit_date!).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        cumPnl: parseFloat(cum.toFixed(2)),
      }
    })
  }, [trades])

  // Monthly P&L
  const monthlyPnl = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of trades) {
      if (!t.exit_date || t.net_pnl == null) continue
      const key = new Date(t.exit_date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
      map.set(key, (map.get(key) ?? 0) + t.net_pnl)
    }
    return Array.from(map.entries()).map(([month, pnl]) => ({ month, pnl: parseFloat(pnl.toFixed(2)) }))
  }, [trades])

  const topSymbols = stats?.topSymbols ?? []
  const emotionBreakdown = stats?.emotionBreakdown ?? []

  const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)' }

  if (trades.length === 0) {
    return (
      <main className="flex-1 overflow-auto p-6 flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucun trade fermé dans cette période.</p>
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-auto p-5 flex flex-col gap-4">

      {/* Equity Curve */}
      <div className="rounded-lg p-4" style={cardStyle}>
        <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>Courbe d'equity</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={equityCurve} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={v => `${v}€`} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6 }}
              labelStyle={{ color: 'var(--text-muted)', fontSize: 11 }}
              formatter={(v: number) => [formatCurrency(v), 'P&L cumulé']}
            />
            <Line
              type="monotone"
              dataKey="cumPnl"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly P&L */}
      {monthlyPnl.length > 0 && (
        <div className="rounded-lg p-4" style={cardStyle}>
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>P&L par mois</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyPnl} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={v => `${v}€`} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6 }}
                labelStyle={{ color: 'var(--text-muted)', fontSize: 11 }}
                formatter={(v: number) => [formatCurrency(v), 'Net P&L']}
              />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                {monthlyPnl.map((entry, i) => (
                  <Cell key={i} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Top Symboles */}
        {topSymbols.length > 0 && (
          <div className="rounded-lg p-4" style={cardStyle}>
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>Top symboles</p>
            <table className="w-full">
              <thead>
                <tr>
                  {['Symbole', 'Trades', 'Win%', 'Net P&L'].map(h => (
                    <th key={h} className="text-left text-xs pb-2" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topSymbols.slice(0, 8).map(s => (
                  <tr key={s.symbol} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="py-1.5 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{s.symbol}</td>
                    <td className="py-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>{s.trades}</td>
                    <td className="py-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>{(s.winRate * 100).toFixed(0)}%</td>
                    <td className="py-1.5 text-xs font-medium" style={{ color: s.netPnl >= 0 ? '#22c55e' : '#ef4444' }}>
                      {formatCurrency(s.netPnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Émotions */}
        {emotionBreakdown.length > 0 && (
          <div className="rounded-lg p-4" style={cardStyle}>
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>Répartition émotions</p>
            <table className="w-full">
              <thead>
                <tr>
                  {['Émotion', 'Trades', 'Win%', 'P&L'].map(h => (
                    <th key={h} className="text-left text-xs pb-2" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {emotionBreakdown.map(e => (
                  <tr key={e.emotion} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="py-1.5 text-xs" style={{ color: 'var(--text-primary)' }}>{e.emotion}</td>
                    <td className="py-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>{e.count}</td>
                    <td className="py-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>{(e.winRate * 100).toFixed(0)}%</td>
                    <td className="py-1.5 text-xs font-medium" style={{ color: e.netPnl >= 0 ? '#22c55e' : '#ef4444' }}>
                      {formatCurrency(e.netPnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Commit**

```bash
git add "app/(dashboard)/reports/page.tsx"
git commit -m "feat: implement Reports page with equity curve and monthly P&L"
```

---

## Task 6: AI Insights Page

**Files:**
- Modify: `app/(dashboard)/ai-insights/page.tsx`

Calls `POST /api/ai/analyze`. Shows a prompt selector if API key is configured; otherwise redirects to Settings.

- [ ] **Replace `app/(dashboard)/ai-insights/page.tsx`**

```tsx
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Lightbulb, Settings } from 'lucide-react'

const PRESET_PROMPTS = [
  { label: 'Analyser mes 30 derniers trades', prompt: 'Analyse mes 30 derniers trades et donne-moi un résumé de mes performances, mes points forts et mes axes d\'amélioration.' },
  { label: 'Identifier mes patterns de pertes', prompt: 'Identifie les patterns récurrents dans mes trades perdants. Quelles erreurs je répète le plus souvent ?' },
  { label: 'Conseils pour améliorer mon win rate', prompt: 'En te basant sur mes statistiques, donne-moi 3 conseils concrets pour améliorer mon win rate.' },
  { label: 'Résumé de mes performances', prompt: 'Fais un résumé complet de mes performances de trading sur les 30 derniers jours.' },
]

export default function AIInsightsPage() {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [activePrompt, setActivePrompt] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => setHasApiKey(d.hasApiKey ?? false))
  }, [])

  async function runAnalysis(prompt: string) {
    setActivePrompt(prompt)
    setResponse('')
    setLoading(true)
    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      setResponse(data.response)
    } else {
      setResponse(`Erreur : ${data.error}`)
    }
  }

  if (hasApiKey === null) {
    return (
      <main className="flex-1 overflow-auto p-6">
        <span style={{ color: 'var(--text-muted)' }}>Chargement...</span>
      </main>
    )
  }

  if (!hasApiKey) {
    return (
      <main className="flex-1 overflow-auto p-6 flex items-center justify-center">
        <div
          className="rounded-lg p-6 flex flex-col items-center gap-4 text-center max-w-sm"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <Lightbulb size={32} style={{ color: 'var(--accent)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Clé API Anthropic requise
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Configure ta clé API Anthropic dans Settings pour activer l'analyse IA de tes trades.
          </p>
          <Button asChild size="sm" style={{ background: 'var(--accent)', color: 'white' }}>
            <Link href="/settings">
              <Settings size={14} className="mr-1" /> Aller dans Settings
            </Link>
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-auto p-5 flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {PRESET_PROMPTS.map(({ label, prompt }) => (
          <Button
            key={label}
            size="sm"
            onClick={() => runAnalysis(prompt)}
            disabled={loading}
            style={{
              background: activePrompt === prompt ? 'var(--accent)' : 'var(--bg-card)',
              color: activePrompt === prompt ? 'white' : 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
          >
            {label}
          </Button>
        ))}
      </div>

      {loading && (
        <div
          className="rounded-lg p-5 flex items-center gap-3"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="h-4 w-4 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Claude analyse tes trades...</span>
        </div>
      )}

      {!loading && response && (
        <div
          className="rounded-lg p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>Analyse Claude</p>
          <div className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {response}
          </div>
        </div>
      )}

      {!loading && !response && (
        <div className="flex items-center justify-center h-40">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Sélectionne une analyse pour commencer
          </p>
        </div>
      )}
    </main>
  )
}
```

- [ ] **Commit**

```bash
git add "app/(dashboard)/ai-insights/page.tsx"
git commit -m "feat: implement AI Insights page"
```

---

## Final Step: Deploy

- [ ] **Push and verify on Vercel**

```bash
git push
```

Check https://trading-journal-ten-dusky.vercel.app that all 5 tabs load correctly without errors. Verify:
- Settings: loads current values, saves correctly
- Strategies: empty state shows, drawer opens, create works
- Notebook: empty state shows, filters work, create works
- Reports: shows "aucun trade" message (no trades in test period) or charts if trades exist
- AI Insights: shows Settings prompt if no API key configured
