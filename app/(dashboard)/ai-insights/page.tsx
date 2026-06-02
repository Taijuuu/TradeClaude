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
      .catch(() => setHasApiKey(false))
  }, [])

  async function runAnalysis(prompt: string) {
    setActivePrompt(prompt)
    setResponse('')
    setLoading(true)
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      setResponse(res.ok ? data.response : `Erreur : ${data.error}`)
    } catch {
      setResponse('Erreur réseau. Vérifie ta connexion.')
    } finally {
      setLoading(false)
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
            Configure ta clé API Anthropic dans Settings pour activer l&apos;analyse IA de tes trades.
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
