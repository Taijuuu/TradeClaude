'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword(data)
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <Card style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <CardHeader>
        <CardTitle style={{ color: 'var(--text-primary)' }}>Connexion</CardTitle>
        <CardDescription style={{ color: 'var(--text-muted)' }}>
          Accède à ton journal de trading
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label style={{ color: 'var(--text-muted)' }}>Email</Label>
            <Input
              type="email"
              placeholder="trader@example.com"
              {...register('email')}
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label style={{ color: 'var(--text-muted)' }}>Mot de passe</Label>
              <Link href="/forgot-password" className="text-xs" style={{ color: 'var(--accent-light)' }}>
                Mot de passe oublié ?
              </Link>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              {...register('password')}
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </Button>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Pas de compte ?{' '}
            <Link href="/register" style={{ color: 'var(--accent-light)' }}>
              S&apos;inscrire
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
