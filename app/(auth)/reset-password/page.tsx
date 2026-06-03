'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { toast.error('Minimum 6 caractères'); return }
    if (password !== confirm) { toast.error('Les mots de passe ne correspondent pas'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Mot de passe mis à jour !')
    router.push('/dashboard')
  }

  return (
    <Card style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <CardHeader>
        <CardTitle style={{ color: 'var(--text-primary)' }}>Nouveau mot de passe</CardTitle>
        <CardDescription style={{ color: 'var(--text-muted)' }}>
          Choisis un nouveau mot de passe pour ton compte.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label style={{ color: 'var(--text-muted)' }}>Nouveau mot de passe</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="space-y-1">
            <Label style={{ color: 'var(--text-muted)' }}>Confirmer le mot de passe</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {loading ? 'Mise à jour...' : 'Mettre à jour'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
