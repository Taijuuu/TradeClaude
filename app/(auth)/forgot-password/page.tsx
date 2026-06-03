'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { toast.error('Saisis ton email'); return }
    setLoading(true)
    const supabase = createClient()
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/reset-password`,
    })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    setSent(true)
  }

  return (
    <Card style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <CardHeader>
        <CardTitle style={{ color: 'var(--text-primary)' }}>Mot de passe oublié</CardTitle>
        <CardDescription style={{ color: 'var(--text-muted)' }}>
          {sent
            ? 'Vérifie ta boîte mail pour le lien de réinitialisation.'
            : 'Saisis ton email pour recevoir un lien de réinitialisation.'}
        </CardDescription>
      </CardHeader>
      {!sent && (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label style={{ color: 'var(--text-muted)' }}>Email</Label>
              <Input
                type="email"
                placeholder="trader@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </Button>
            <Link href="/login" className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Retour à la connexion
            </Link>
          </CardFooter>
        </form>
      )}
      {sent && (
        <CardFooter>
          <Link href="/login" className="text-sm" style={{ color: 'var(--accent-light)' }}>
            Retour à la connexion
          </Link>
        </CardFooter>
      )}
    </Card>
  )
}
