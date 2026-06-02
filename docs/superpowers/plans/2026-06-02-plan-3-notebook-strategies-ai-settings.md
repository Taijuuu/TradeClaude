# Plan 3 — Notebook, Strategies, AI Insights, Settings

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 4 remaining placeholder pages: Notebook (notes + screenshots), Strategies (CRUD), AI Insights (Claude chat), and Settings (accounts, API key, tags, preferences).

**Architecture:** All pages are `'use client'` components fetching their own data via `fetch`. The API layer is largely complete — this plan fills the gaps (`/api/strategies/[id]`, `/api/tags`) and builds the page UIs. Tags are also wired into `TradeForm` (multi-select).

**Tech Stack:** Next.js 16, Supabase, `@uiw/react-md-editor`, shadcn/ui, React Hook Form + Zod, sonner, lucide-react.

**Spec:** `docs/superpowers/specs/2026-06-01-trading-journal-design.md`

---

## File Map

| File | Status | Purpose |
|------|--------|---------|
| `app/api/strategies/[id]/route.ts` | ❌ missing | PUT + DELETE strategy |
| `app/api/tags/route.ts` | ❌ missing | GET + POST tags |
| `app/api/tags/[id]/route.ts` | ❌ missing | PUT + DELETE tag |
| `hooks/useTags.ts` | ❌ missing | Client fetch hook for tags |
| `hooks/useStrategies.ts` | ❌ missing | Client fetch hook for strategies |
| `hooks/useNotebook.ts` | ❌ missing | Client fetch hook for notes |
| `app/(dashboard)/notebook/page.tsx` | placeholder | Notebook page |
| `app/(dashboard)/strategies/page.tsx` | placeholder | Strategies list |
| `app/(dashboard)/ai-insights/page.tsx` | placeholder | AI Insights + chat |
| `app/(dashboard)/settings/page.tsx` | placeholder | Settings (5 sections) |

---

## Phase 1 — API Gaps

### Task 1: `/api/strategies/[id]` + `/api/tags`

**Files:**
- Create: `app/api/strategies/[id]/route.ts`
- Create: `app/api/tags/route.ts`
- Create: `app/api/tags/[id]/route.ts`

- [ ] **Step 1: Create `app/api/strategies/[id]/route.ts`**

```ts
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
    })
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

- [ ] **Step 2: Create `app/api/tags/route.ts`**

```ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ tags: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, color = '#7c3aed', category = 'custom' } = await request.json()
  if (!name) return Response.json({ error: 'name requis' }, { status: 400 })

  const { data, error } = await supabase
    .from('tags')
    .insert({ user_id: user.id, name, color, category })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ tag: data }, { status: 201 })
}
```

- [ ] **Step 3: Create `app/api/tags/[id]/route.ts`**

```ts
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

  const { name, color, category } = await request.json()

  const { data, error } = await supabase
    .from('tags')
    .update({ name, color, category })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ tag: data })
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
    .from('tags')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/strategies/ app/api/tags/
git commit -m "feat: add /api/strategies/[id] and /api/tags CRUD routes"
```

---

## Phase 2 — Client Hooks

### Task 2: `useTags` + `useStrategies` + `useNotebook`

**Files:**
- Create: `hooks/useTags.ts`
- Create: `hooks/useStrategies.ts`
- Create: `hooks/useNotebook.ts`

- [ ] **Step 1: Create `hooks/useTags.ts`**

```ts
'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Tag } from '@/types'

interface UseTagsResult {
  tags: Tag[]
  loading: boolean
  refresh: () => void
}

export function useTags(): UseTagsResult {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    setLoading(true)
    fetch('/api/tags')
      .then(r => r.json())
      .then(d => setTags(d.tags ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tick])

  return { tags, loading, refresh }
}
```

- [ ] **Step 2: Create `hooks/useStrategies.ts`**

```ts
'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Strategy } from '@/types'

interface UseStrategiesResult {
  strategies: Strategy[]
  loading: boolean
  refresh: () => void
}

export function useStrategies(): UseStrategiesResult {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    setLoading(true)
    fetch('/api/strategies')
      .then(r => r.json())
      .then(d => setStrategies(d.strategies ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tick])

  return { strategies, loading, refresh }
}
```

- [ ] **Step 3: Create `hooks/useNotebook.ts`**

```ts
'use client'
import { useState, useEffect, useCallback } from 'react'
import type { NotebookEntry, NoteType } from '@/types'

interface UseNotebookResult {
  entries: NotebookEntry[]
  loading: boolean
  refresh: () => void
}

export function useNotebook(type?: NoteType): UseNotebookResult {
  const [entries, setEntries] = useState<NotebookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    fetch(`/api/notebook?${params}`)
      .then(r => r.json())
      .then(d => setEntries(d.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [type, tick])

  return { entries, loading, refresh }
}
```

- [ ] **Step 4: Commit**

```bash
git add hooks/useTags.ts hooks/useStrategies.ts hooks/useNotebook.ts
git commit -m "feat: add useTags, useStrategies, useNotebook hooks"
```

---

## Phase 3 — Notebook Page

### Task 3: Notebook page

**Files:**
- Modify: `app/(dashboard)/notebook/page.tsx`

The user wants: notes + screenshots. Simple. Two columns: list (left) + editor (right).

- [ ] **Step 1: Create `app/(dashboard)/notebook/page.tsx`**

```tsx
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { Plus, Trash2, FileText, Calendar, BookOpen, Target, Brain, ChevronDown } from 'lucide-react'
import { useNotebook } from '@/hooks/useNotebook'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { NotebookEntry, NoteType } from '@/types'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-md-editor/markdown.css'

// SSR-safe: react-md-editor requires browser APIs
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

const TYPE_META: Record<NoteType, { label: string; icon: React.ReactNode; color: string }> = {
  daily:   { label: 'Journal',    icon: <Calendar size={12} />,  color: '#7c3aed' },
  weekly:  { label: 'Recap',      icon: <BookOpen size={12} />,  color: '#3b82f6' },
  plan:    { label: 'Plan',       icon: <Target size={12} />,    color: '#22c55e' },
  recap:   { label: 'Analyse',    icon: <Brain size={12} />,     color: '#f97316' },
  custom:  { label: 'Note',       icon: <FileText size={12} />,  color: '#94a3b8' },
}

const TEMPLATES: Record<string, { type: NoteType; title: string; content: string }> = {
  journal: {
    type: 'daily',
    title: `Journal ${new Date().toLocaleDateString('fr-FR')}`,
    content: `## Contexte marché\n\n\n## Trades planifiés\n\n\n## Résumé de la journée\n\n\n## Leçons apprises\n\n`,
  },
  recap: {
    type: 'weekly',
    title: `Recap semaine`,
    content: `## Stats de la semaine\n\n\n## Meilleur trade\n\n\n## Pire trade\n\n\n## Plan semaine suivante\n\n`,
  },
  plan: {
    type: 'plan',
    title: 'Plan de trading',
    content: `## Vision & objectifs\n\n\n## Règles d'entrée\n\n\n## Règles de sortie\n\n\n## Risk management\n\n\n## Rules to never break\n\n`,
  },
  analyse: {
    type: 'recap',
    title: 'Analyse de trade',
    content: `## Contexte\n\n\n## Setup\n\n\n## Exécution\n\n\n## Verdict\n\n\n## Ce que j'aurais dû faire\n\n`,
  },
}

export default function NotebookPage() {
  const { entries, loading, refresh } = useNotebook()
  const [selected, setSelected] = useState<NotebookEntry | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load selected entry into editor
  useEffect(() => {
    if (selected) {
      setTitle(selected.title)
      setContent(selected.content)
    }
  }, [selected?.id])

  // Auto-save on content/title change (2s debounce)
  const autoSave = useCallback(async (newTitle: string, newContent: string, entry: NotebookEntry) => {
    if (!newTitle.trim()) return
    setSaving(true)
    const res = await fetch(`/api/notebook/${entry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, content: newContent, type: entry.type }),
    })
    setSaving(false)
    if (res.ok) refresh()
  }, [refresh])

  function handleContentChange(val: string | undefined) {
    const v = val ?? ''
    setContent(v)
    if (!selected) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => autoSave(title, v, selected), 2000)
  }

  function handleTitleChange(val: string) {
    setTitle(val)
    if (!selected) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => autoSave(val, content, selected), 2000)
  }

  async function createNote(template?: keyof typeof TEMPLATES) {
    const tpl = template ? TEMPLATES[template] : { type: 'custom' as NoteType, title: 'Nouvelle note', content: '' }
    const res = await fetch('/api/notebook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: tpl.title, content: tpl.content, type: tpl.type }),
    })
    if (!res.ok) { toast.error('Erreur création note'); return }
    const { entry } = await res.json()
    refresh()
    setSelected(entry)
    setShowTemplates(false)
  }

  async function deleteNote(id: string) {
    if (!confirm('Supprimer cette note ?')) return
    const res = await fetch(`/api/notebook/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Erreur suppression'); return }
    toast.success('Note supprimée')
    if (selected?.id === id) setSelected(null)
    refresh()
  }

  const inputStyle = { background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }

  return (
    <main className="flex-1 overflow-hidden flex">

      {/* ── LEFT: Note list (30%) ── */}
      <div
        className="w-72 shrink-0 flex flex-col border-r"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}
      >
        {/* Header */}
        <div className="p-3 border-b flex flex-col gap-2" style={{ borderColor: 'var(--border)' }}>
          {/* New note button + template dropdown */}
          <div className="relative">
            <div className="flex gap-1">
              <Button
                size="sm"
                className="flex-1 text-xs gap-1"
                style={{ background: 'var(--accent)', color: 'white' }}
                onClick={() => createNote()}
              >
                <Plus size={12} /> Nouvelle note
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="px-2"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                onClick={() => setShowTemplates(!showTemplates)}
              >
                <ChevronDown size={12} />
              </Button>
            </div>

            {showTemplates && (
              <div
                className="absolute top-full left-0 right-0 z-10 mt-1 rounded-md overflow-hidden shadow-lg"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                {Object.entries(TEMPLATES).map(([key, tpl]) => (
                  <button
                    key={key}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2"
                    style={{ color: 'var(--text-primary)' }}
                    onClick={() => createNote(key as keyof typeof TEMPLATES)}
                  >
                    {TYPE_META[tpl.type].icon}
                    {tpl.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              Chargement...
            </div>
          ) : entries.length === 0 ? (
            <div className="p-4 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              Aucune note.<br />Crée ta première note.
            </div>
          ) : (
            entries.map(entry => {
              const meta = TYPE_META[entry.type as NoteType] ?? TYPE_META.custom
              return (
                <div
                  key={entry.id}
                  onClick={() => setSelected(entry)}
                  className={cn(
                    'px-3 py-2.5 cursor-pointer border-b flex items-start justify-between gap-2 group',
                    selected?.id === entry.id ? 'bg-[var(--bg-hover)]' : 'hover:bg-[var(--bg-hover)]/50'
                  )}
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span style={{ color: meta.color }}>{meta.icon}</span>
                      <span className="text-[10px]" style={{ color: meta.color }}>{meta.label}</span>
                    </div>
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {entry.title}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {new Date(entry.updated_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteNote(entry.id) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── RIGHT: Editor (70%) ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <>
            {/* Title bar */}
            <div className="px-4 py-3 border-b flex items-center gap-3"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}>
              <Input
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                className="text-sm font-semibold border-0 bg-transparent px-0 focus-visible:ring-0"
                style={{ color: 'var(--text-primary)' }}
                placeholder="Titre de la note..."
              />
              {saving && (
                <span className="text-[10px] shrink-0" style={{ color: 'var(--text-muted)' }}>
                  Sauvegarde...
                </span>
              )}
            </div>

            {/* MD Editor */}
            <div className="flex-1 overflow-hidden" data-color-mode="dark">
              <MDEditor
                value={content}
                onChange={handleContentChange}
                height="100%"
                preview="live"
                style={{
                  background: 'var(--bg-primary)',
                  border: 'none',
                  borderRadius: 0,
                  height: '100%',
                }}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3"
            style={{ color: 'var(--text-muted)' }}>
            <FileText size={40} style={{ opacity: 0.3 }} />
            <p className="text-sm">Sélectionne une note ou crée-en une nouvelle</p>
          </div>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/notebook/page.tsx
git commit -m "feat: build Notebook page with markdown editor and auto-save"
```

---

## Phase 4 — Strategies Page

### Task 4: Strategies page

**Files:**
- Modify: `app/(dashboard)/strategies/page.tsx`

- [ ] **Step 1: Create `app/(dashboard)/strategies/page.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Target } from 'lucide-react'
import { useStrategies } from '@/hooks/useStrategies'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Strategy, AssetClass } from '@/types'

const schema = z.object({
  name:        z.string().min(1, 'Nom requis'),
  description: z.string().optional(),
  asset_class: z.string().optional(),
  entry_rules: z.string().optional(),
  exit_rules:  z.string().optional(),
  risk_rules:  z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function StrategiesPage() {
  const { strategies, loading, refresh } = useStrategies()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Strategy | null>(null)

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  function openCreate() {
    setEditing(null)
    reset({ name: '', description: '', asset_class: '', entry_rules: '', exit_rules: '', risk_rules: '' })
    setDialogOpen(true)
  }

  function openEdit(s: Strategy) {
    setEditing(s)
    reset({
      name:        s.name,
      description: s.description ?? '',
      asset_class: s.asset_class ?? '',
      entry_rules: s.entry_rules ?? '',
      exit_rules:  s.exit_rules ?? '',
      risk_rules:  s.risk_rules ?? '',
    })
    setDialogOpen(true)
  }

  async function onSubmit(data: FormData) {
    const url = editing ? `/api/strategies/${editing.id}` : '/api/strategies'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        checklist: editing?.checklist ?? [],
      }),
    })
    if (!res.ok) { toast.error('Erreur sauvegarde'); return }
    toast.success(editing ? 'Stratégie mise à jour' : 'Stratégie créée')
    setDialogOpen(false)
    refresh()
  }

  async function deleteStrategy(id: string) {
    if (!confirm('Supprimer cette stratégie ?')) return
    const res = await fetch(`/api/strategies/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Erreur suppression'); return }
    toast.success('Stratégie supprimée')
    refresh()
  }

  const inputStyle = { background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }
  const labelStyle = { color: 'var(--text-muted)' }

  return (
    <main className="flex-1 overflow-auto p-5">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {strategies.length} stratégie{strategies.length !== 1 ? 's' : ''}
        </p>
        <Button size="sm" onClick={openCreate} style={{ background: 'var(--accent)', color: 'white' }}>
          <Plus size={14} className="mr-1" /> Nouvelle stratégie
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-sm text-center mt-8" style={{ color: 'var(--text-muted)' }}>Chargement...</p>
      ) : strategies.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 mt-16">
          <Target size={40} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucune stratégie</p>
          <Button size="sm" onClick={openCreate} style={{ background: 'var(--accent)', color: 'white' }}>
            Créer ma première stratégie
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {strategies.map(s => (
            <div
              key={s.id}
              className="rounded-lg p-4 flex flex-col gap-2"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Target size={16} style={{ color: 'var(--accent-light)', shrink: 0 }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {s.name}
                  </span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(s)} style={{ color: 'var(--text-muted)' }}>
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => deleteStrategy(s.id)} style={{ color: '#ef4444' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {s.asset_class && (
                <span className="text-[10px] px-1.5 py-0.5 rounded w-fit"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                  {s.asset_class}
                </span>
              )}

              {s.description && (
                <p className="text-xs line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                  {s.description}
                </p>
              )}

              <div className="mt-auto pt-2 border-t grid grid-cols-3 gap-1 text-[10px]"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                {s.entry_rules && <div className="truncate">✓ Entrée</div>}
                {s.exit_rules  && <div className="truncate">✓ Sortie</div>}
                {s.risk_rules  && <div className="truncate">✓ Risk</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => !v && setDialogOpen(false)}>
        <DialogContent
          className="max-w-lg overflow-y-auto max-h-[90vh]"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--text-primary)' }}>
              {editing ? 'Modifier la stratégie' : 'Nouvelle stratégie'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label style={labelStyle}>Nom *</Label>
              <Input placeholder="Breakout London" {...register('name')} style={inputStyle} />
              {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <Label style={labelStyle}>Asset class</Label>
              <select
                {...register('asset_class')}
                className="w-full rounded-md px-3 py-2 text-sm"
                style={inputStyle}
              >
                <option value="">Tous</option>
                {(['forex','stocks','crypto','futures','options'] as AssetClass[]).map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label style={labelStyle}>Description</Label>
              <Textarea rows={2} placeholder="Brève description..." {...register('description')} style={inputStyle} />
            </div>

            <div className="space-y-1">
              <Label style={labelStyle}>Règles d&apos;entrée</Label>
              <Textarea rows={3} placeholder="Conditions pour entrer..." {...register('entry_rules')} style={inputStyle} />
            </div>

            <div className="space-y-1">
              <Label style={labelStyle}>Règles de sortie</Label>
              <Textarea rows={3} placeholder="Conditions pour sortir..." {...register('exit_rules')} style={inputStyle} />
            </div>

            <div className="space-y-1">
              <Label style={labelStyle}>Risk management</Label>
              <Textarea rows={2} placeholder="Stop loss, taille position..." {...register('risk_rules')} style={inputStyle} />
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setDialogOpen(false)}
                style={{ color: 'var(--text-muted)' }}>
                Annuler
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}
                style={{ background: 'var(--accent)', color: 'white' }}>
                {isSubmitting ? 'Sauvegarde...' : editing ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/strategies/page.tsx
git commit -m "feat: build Strategies page with CRUD modal"
```

---

## Phase 5 — AI Insights Page

### Task 5: AI Insights page

**Files:**
- Modify: `app/(dashboard)/ai-insights/page.tsx`

- [ ] **Step 1: Create `app/(dashboard)/ai-insights/page.tsx`**

```tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { Send, Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: number
}

const QUICK_ANALYSES = [
  { id: 'global',    emoji: '🔍', label: 'Analyse globale 30 jours',   prompt: 'Analyse mes performances de trading des 30 derniers jours. Identifie mes forces, faiblesses et donne-moi 3 points d\'amélioration prioritaires.' },
  { id: 'losses',    emoji: '📉', label: 'Mes 20 dernières pertes',     prompt: 'Analyse mes 20 dernières pertes. Trouve les patterns communs, les erreurs répétées et comment je peux les éviter.' },
  { id: 'wins',      emoji: '🏆', label: 'Mes 20 derniers gains',       prompt: 'Analyse mes 20 derniers trades gagnants. Quels sont les setups qui fonctionnent le mieux pour moi ?' },
  { id: 'weekly',    emoji: '📊', label: 'Rapport hebdomadaire',        prompt: 'Fais-moi un rapport hebdomadaire complet de mes performances de trading.' },
  { id: 'psychology',emoji: '🧠', label: 'Psychologie & discipline',    prompt: 'Analyse ma psychologie de trading : mes émotions, mes biais, mes moments de sur-trading ou de peur. Que dois-je travailler ?' },
  { id: 'risk',      emoji: '🎯', label: 'Gestion du risque',           prompt: 'Évalue ma gestion du risque : taille des positions, respect des stop loss, R-multiple moyen. Comment l\'améliorer ?' },
  { id: 'besttime',  emoji: '⏰', label: 'Meilleurs moments pour trader', prompt: 'Analyse à quelles heures et quels jours je performe le mieux. Dois-je éviter certaines sessions ?' },
]

const LS_KEY = 'tj_chat_history'

export default function AIInsightsPage() {
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load settings on mount
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => setHasApiKey(d.hasApiKey ?? false))
      .catch(() => setHasApiKey(false))
    // Load chat history from localStorage
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) setMessages(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function saveApiKey() {
    if (!apiKeyInput.trim()) return
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anthropic_api_key: apiKeyInput.trim() }),
    })
    if (!res.ok) { toast.error('Erreur sauvegarde'); return }
    toast.success('Clé sauvegardée')
    setHasApiKey(true)
    setApiKeyInput('')
    setTestResult(null)
  }

  async function testKey() {
    setTesting(true)
    setTestResult(null)
    const res = await fetch('/api/ai/test', { method: 'POST' })
    const data = await res.json()
    setTestResult(data)
    setTesting(false)
  }

  async function sendMessage(promptText: string) {
    if (!promptText.trim()) return
    setInput('')
    setLoading(true)

    const userMsg: Message = { role: 'user', content: promptText, ts: Date.now() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)

    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: promptText }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(data.error ?? 'Erreur Claude')
      return
    }

    const assistantMsg: Message = { role: 'assistant', content: data.response, ts: Date.now() }
    const updatedMessages = [...newMessages, assistantMsg]
    setMessages(updatedMessages)
    localStorage.setItem(LS_KEY, JSON.stringify(updatedMessages.slice(-30)))
  }

  function clearHistory() {
    setMessages([])
    localStorage.removeItem(LS_KEY)
  }

  const inputStyle = { background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }

  return (
    <main className="flex-1 overflow-hidden flex flex-col p-4 gap-4">

      {/* ── API Key section ── */}
      <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Clé API Anthropic</span>

          {hasApiKey === true && (
            <div className="flex items-center gap-1 text-xs text-green-400">
              <CheckCircle size={12} /> Configurée
            </div>
          )}
          {hasApiKey === false && (
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <XCircle size={12} /> Non configurée
            </div>
          )}

          <Input
            type="password"
            placeholder="sk-ant-..."
            value={apiKeyInput}
            onChange={e => setApiKeyInput(e.target.value)}
            className="w-64 h-7 text-xs"
            style={inputStyle}
            onKeyDown={e => e.key === 'Enter' && saveApiKey()}
          />

          <Button size="sm" className="h-7 text-xs" onClick={saveApiKey}
            style={{ background: 'var(--accent)', color: 'white' }}>
            Sauvegarder
          </Button>

          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={testKey} disabled={testing}
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            {testing ? <Loader2 size={10} className="animate-spin" /> : 'Tester'}
          </Button>

          {testResult && (
            <span className={cn('text-xs', testResult.ok ? 'text-green-400' : 'text-red-400')}>
              {testResult.ok ? '🟢 Connecté' : `🔴 ${testResult.error}`}
            </span>
          )}
        </div>
      </div>

      {/* ── Quick analyses ── */}
      <div className="flex flex-wrap gap-2">
        {QUICK_ANALYSES.map(a => (
          <button
            key={a.id}
            onClick={() => sendMessage(a.prompt)}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            <span>{a.emoji}</span>
            {a.label}
          </button>
        ))}
      </div>

      {/* ── Chat window ── */}
      <div
        className="flex-1 rounded-lg overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
              <span className="text-3xl">🤖</span>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Ton coach de trading IA est prêt.
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Utilise les boutons rapides ou pose une question libre.
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={cn('flex gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm"
                  style={{ background: 'var(--accent)' }}>🤖</div>
              )}
              <div
                className={cn(
                  'max-w-[75%] rounded-xl px-4 py-3 text-xs leading-relaxed',
                  m.role === 'user'
                    ? 'rounded-tr-sm'
                    : 'rounded-tl-sm'
                )}
                style={{
                  background: m.role === 'user' ? 'var(--accent)' : 'var(--bg-hover)',
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {m.content}
              </div>
              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm"
                  style={{ background: 'var(--bg-hover)' }}>👤</div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
                style={{ background: 'var(--accent)' }}>🤖</div>
              <div className="px-4 py-3 rounded-xl rounded-tl-sm text-xs"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                <Loader2 size={12} className="animate-spin inline mr-1" />
                Analyse en cours...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="border-t p-3 flex gap-2 items-end"
          style={{ borderColor: 'var(--border)' }}>
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={clearHistory}
              style={{ color: 'var(--text-muted)' }}>
              <Trash2 size={13} />
            </Button>
          )}
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Pose une question sur tes trades..."
            rows={1}
            className="flex-1 min-h-[36px] max-h-24 resize-none text-xs"
            style={inputStyle}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(input)
              }
            }}
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0"
            disabled={loading || !input.trim()}
            onClick={() => sendMessage(input)}
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <Send size={13} />
          </Button>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/ai-insights/page.tsx
git commit -m "feat: build AI Insights page with chat and quick analyses"
```

---

## Phase 6 — Settings Page

### Task 6: Settings page

**Files:**
- Modify: `app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Create `app/(dashboard)/settings/page.tsx`**

```tsx
'use client'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Save, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useTags } from '@/hooks/useTags'
import { cn } from '@/lib/utils'
import type { Account, Tag } from '@/types'

// ── Accounts section ──────────────────────────────────────────
function AccountsSection() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [form, setForm] = useState({ name: '', broker: '', type: 'live', balance: '', currency: 'USD' })

  async function load() {
    const r = await fetch('/api/accounts')
    const d = await r.json()
    setAccounts(d.accounts ?? [])
  }
  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', broker: '', type: 'live', balance: '', currency: 'USD' })
    setDialogOpen(true)
  }
  function openEdit(a: Account) {
    setEditing(a)
    setForm({ name: a.name, broker: a.broker ?? '', type: a.type, balance: String(a.balance), currency: a.currency })
    setDialogOpen(true)
  }

  async function save() {
    const payload = { ...form, balance: parseFloat(form.balance) || 0 }
    const url = editing ? `/api/accounts/${editing.id}` : '/api/accounts'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!res.ok) { toast.error('Erreur'); return }
    toast.success(editing ? 'Compte mis à jour' : 'Compte créé')
    setDialogOpen(false)
    load()
  }

  async function del(id: string) {
    if (!confirm('Supprimer ce compte ?')) return
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
    toast.success('Supprimé')
    load()
  }

  const inputStyle = { background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{accounts.length} compte{accounts.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={openCreate} style={{ background: 'var(--accent)', color: 'white' }}>
          <Plus size={13} className="mr-1" /> Ajouter
        </Button>
      </div>

      <div className="space-y-2">
        {accounts.map(a => (
          <div key={a.id} className="flex items-center justify-between p-3 rounded-lg"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
            <div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.name}</span>
              {a.broker && <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>{a.broker}</span>}
              <div className="flex gap-2 mt-0.5">
                <Badge style={{ fontSize: 9, background: 'var(--bg-card)', color: 'var(--text-muted)', border: 'none' }}>
                  {a.type}
                </Badge>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {a.balance.toLocaleString('fr-FR')} {a.currency}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(a)} style={{ color: 'var(--text-muted)' }}><Pencil size={13} /></button>
              <button onClick={() => del(a.id)} style={{ color: '#ef4444' }}><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>Aucun compte. Ajoutes-en un !</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => !v && setDialogOpen(false)}>
        <DialogContent style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--text-primary)' }}>{editing ? 'Modifier le compte' : 'Nouveau compte'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label style={{ color: 'var(--text-muted)' }}>Nom *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Mon compte live" style={inputStyle} /></div>
            <div><Label style={{ color: 'var(--text-muted)' }}>Broker</Label>
              <Input value={form.broker} onChange={e => setForm({ ...form, broker: e.target.value })} placeholder="ICMarkets, FTMO..." style={inputStyle} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label style={{ color: 'var(--text-muted)' }}>Type</Label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-md px-3 py-2 text-sm" style={inputStyle}>
                  <option value="live">Live</option>
                  <option value="demo">Demo</option>
                  <option value="prop">Prop Firm</option>
                </select>
              </div>
              <div><Label style={{ color: 'var(--text-muted)' }}>Solde</Label>
                <Input type="number" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} placeholder="10000" style={inputStyle} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setDialogOpen(false)} style={{ color: 'var(--text-muted)' }}>Annuler</Button>
              <Button onClick={save} style={{ background: 'var(--accent)', color: 'white' }}>Sauvegarder</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Tags section ──────────────────────────────────────────────
function TagsSection() {
  const { tags, refresh } = useTags()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Tag | null>(null)
  const [form, setForm] = useState({ name: '', color: '#7c3aed', category: 'custom' })

  function openCreate() {
    setEditing(null)
    setForm({ name: '', color: '#7c3aed', category: 'custom' })
    setDialogOpen(true)
  }
  function openEdit(t: Tag) {
    setEditing(t)
    setForm({ name: t.name, color: t.color, category: t.category })
    setDialogOpen(true)
  }

  async function save() {
    const url = editing ? `/api/tags/${editing.id}` : '/api/tags'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (!res.ok) { toast.error('Erreur'); return }
    toast.success(editing ? 'Tag mis à jour' : 'Tag créé')
    setDialogOpen(false)
    refresh()
  }

  async function del(id: string) {
    if (!confirm('Supprimer ce tag ?')) return
    await fetch(`/api/tags/${id}`, { method: 'DELETE' })
    toast.success('Tag supprimé')
    refresh()
  }

  const inputStyle = { background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }
  const CATEGORIES = ['setup', 'mistake', 'condition', 'custom']

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{tags.length} tag{tags.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={openCreate} style={{ background: 'var(--accent)', color: 'white' }}>
          <Plus size={13} className="mr-1" /> Ajouter
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tags.map(t => (
          <div key={t.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full group"
            style={{ background: `${t.color}20`, border: `1px solid ${t.color}40` }}>
            <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
            <span className="text-xs" style={{ color: t.color }}>{t.name}</span>
            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>({t.category})</span>
            <button onClick={() => openEdit(t)} className="opacity-0 group-hover:opacity-100 ml-1" style={{ color: 'var(--text-muted)' }}>
              <Pencil size={10} />
            </button>
            <button onClick={() => del(t.id)} className="opacity-0 group-hover:opacity-100" style={{ color: '#ef4444' }}>
              <Trash2 size={10} />
            </button>
          </div>
        ))}
        {tags.length === 0 && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Aucun tag</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => !v && setDialogOpen(false)}>
        <DialogContent style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--text-primary)' }}>{editing ? 'Modifier le tag' : 'Nouveau tag'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label style={{ color: 'var(--text-muted)' }}>Nom *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="FOMO, Breakout..." style={inputStyle} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label style={{ color: 'var(--text-muted)' }}>Couleur</Label>
                <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}
                  className="w-full h-9 rounded-md cursor-pointer" style={{ border: '1px solid var(--border)' }} />
              </div>
              <div><Label style={{ color: 'var(--text-muted)' }}>Catégorie</Label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-md px-3 py-2 text-sm" style={inputStyle}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setDialogOpen(false)} style={{ color: 'var(--text-muted)' }}>Annuler</Button>
              <Button onClick={save} style={{ background: 'var(--accent)', color: 'white' }}>Sauvegarder</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Preferences section ───────────────────────────────────────
function PreferencesSection() {
  const [form, setForm] = useState({
    default_commission: '0',
    breakeven_range: '0',
    currency: 'USD',
    timezone: 'Europe/Paris',
    display_mode: 'dollar',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.settings) setForm({
        default_commission: String(d.settings.default_commission ?? 0),
        breakeven_range:    String(d.settings.breakeven_range ?? 0),
        currency:           d.settings.currency ?? 'USD',
        timezone:           d.settings.timezone ?? 'Europe/Paris',
        display_mode:       d.settings.display_mode ?? 'dollar',
      })
    }).catch(() => {})
  }, [])

  async function save() {
    setSaving(true)
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        default_commission: parseFloat(form.default_commission) || 0,
        breakeven_range:    parseFloat(form.breakeven_range) || 0,
        currency:           form.currency,
        timezone:           form.timezone,
        display_mode:       form.display_mode,
      }),
    })
    setSaving(false)
    if (!res.ok) { toast.error('Erreur'); return }
    toast.success('Préférences sauvegardées')
  }

  const inputStyle = { background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }

  return (
    <div className="space-y-4 max-w-sm">
      <div className="grid grid-cols-2 gap-3">
        <div><Label style={{ color: 'var(--text-muted)' }}>Commission défaut ($)</Label>
          <Input type="number" step="any" value={form.default_commission}
            onChange={e => setForm({ ...form, default_commission: e.target.value })} style={inputStyle} /></div>
        <div><Label style={{ color: 'var(--text-muted)' }}>Breakeven range ($)</Label>
          <Input type="number" step="any" value={form.breakeven_range}
            onChange={e => setForm({ ...form, breakeven_range: e.target.value })} style={inputStyle} /></div>
      </div>
      <div><Label style={{ color: 'var(--text-muted)' }}>Devise</Label>
        <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}
          className="w-full rounded-md px-3 py-2 text-sm" style={inputStyle}>
          {['USD','EUR','GBP','JPY','CHF'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div><Label style={{ color: 'var(--text-muted)' }}>Affichage P&L</Label>
        <select value={form.display_mode} onChange={e => setForm({ ...form, display_mode: e.target.value })}
          className="w-full rounded-md px-3 py-2 text-sm" style={inputStyle}>
          <option value="dollar">$ Dollar</option>
          <option value="percentage">% Pourcentage</option>
          <option value="r_multiple">R Multiple</option>
        </select>
      </div>
      <Button onClick={save} disabled={saving} className="w-full" style={{ background: 'var(--accent)', color: 'white' }}>
        <Save size={13} className="mr-1" />{saving ? 'Sauvegarde...' : 'Sauvegarder'}
      </Button>
    </div>
  )
}

// ── Export section ────────────────────────────────────────────
function ExportSection() {
  async function exportCSV() {
    const res = await fetch('/api/trades?limit=9999')
    const { trades } = await res.json()
    if (!trades?.length) { toast.info('Aucun trade à exporter'); return }

    const headers = ['date_entree','symbole','side','statut','asset','prix_entree','prix_sortie','quantite','commission','gross_pnl','net_pnl','r_multiple','rating','emotion','notes']
    const rows = trades.map((t: Record<string, unknown>) => [
      t.entry_date, t.symbol, t.side, t.status, t.asset_class,
      t.entry_price, t.exit_price ?? '', t.quantity, t.commission,
      t.gross_pnl ?? '', t.net_pnl ?? '', t.r_multiple ?? '',
      t.rating ?? '', t.emotion ?? '', (String(t.notes ?? '')).replace(/,/g, ';'),
    ].join(','))

    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `trades_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    toast.success(`${trades.length} trades exportés`)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Exporte tous tes trades en CSV.</p>
      <Button onClick={exportCSV} style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
        <Download size={13} className="mr-1.5" /> Exporter CSV
      </Button>
    </div>
  )
}

// ── Main Settings page ────────────────────────────────────────
export default function SettingsPage() {
  return (
    <main className="flex-1 overflow-auto p-5">
      <Tabs defaultValue="accounts">
        <TabsList style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {[
            { value: 'accounts',    label: 'Comptes' },
            { value: 'tags',        label: 'Tags' },
            { value: 'preferences', label: 'Préférences' },
            { value: 'export',      label: 'Export' },
          ].map(t => (
            <TabsTrigger key={t.value} value={t.value}
              className="text-xs data-[state=active]:bg-[var(--accent)] data-[state=active]:text-white"
              style={{ color: 'var(--text-muted)' }}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-5">
          <TabsContent value="accounts">
            <AccountsSection />
          </TabsContent>
          <TabsContent value="tags">
            <TagsSection />
          </TabsContent>
          <TabsContent value="preferences">
            <PreferencesSection />
          </TabsContent>
          <TabsContent value="export">
            <ExportSection />
          </TabsContent>
        </div>
      </Tabs>
    </main>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/settings/page.tsx
git commit -m "feat: build Settings page with accounts, tags, preferences, export tabs"
```

---

## Phase 7 — Build + Push + Deploy

### Task 7: Verify + deploy

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: clean build, all routes present.

- [ ] **Step 3: Push to GitHub**

```bash
git push
```

- [ ] **Step 4: Deploy to Vercel**

```bash
vercel --prod
```

---

## Self-Review

**Spec coverage:**
- ✅ `/api/strategies/[id]` PUT + DELETE
- ✅ `/api/tags` GET/POST + `/api/tags/[id]` PUT/DELETE
- ✅ `useTags` + `useStrategies` + `useNotebook` hooks
- ✅ Notebook page — markdown editor, auto-save 2s, templates, delete
- ✅ Strategies page — CRUD modal, grid layout
- ✅ AI Insights — key config + test + 7 quick analyses + free chat + localStorage history
- ✅ Settings — Accounts CRUD + Tags CRUD + Preferences + Export CSV

**Deferred intentionally:**
- Screenshot drag/drop in Notebook (upload API exists, UI deferred)
- Tags multi-select in TradeForm (hooks exist, wiring deferred)
- Import CSV (complex, Plan 4)
- Danger zone (delete all / delete account, Plan 4)
- MetaTrader integration (awaiting user choice on MetaApi vs DWX)
