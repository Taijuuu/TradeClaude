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
  password: z.string().min(6, 'Au moins 6 caractères'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    toast.success('Compte créé ! Connecte-toi.')
    router.push('/login')
  }

  return (
    <Card style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <CardHeader>
        <CardTitle style={{ color: 'var(--text-primary)' }}>Créer un compte</CardTitle>
        <CardDescription style={{ color: 'var(--text-muted)' }}>
          Commence à journaliser tes trades
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
            <Label style={{ color: 'var(--text-muted)' }}>Mot de passe</Label>
            <Input
              type="password"
              placeholder="••••••••"
              {...register('password')}
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
          </div>
          <div className="space-y-1">
            <Label style={{ color: 'var(--text-muted)' }}>Confirmer</Label>
            <Input
              type="password"
              placeholder="••••••••"
              {...register('confirmPassword')}
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {loading ? 'Création...' : 'Créer mon compte'}
          </Button>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Déjà un compte ?{' '}
            <Link href="/login" style={{ color: 'var(--accent-light)' }}>
              Se connecter
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
