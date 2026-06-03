import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createMetaApiAccount, deployMetaApiAccount } from '@/lib/metaapi'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, login, investorPassword, server, accountId } = await request.json()

  if (!login || !investorPassword || !server) {
    return Response.json({ error: 'Login, mot de passe et serveur requis' }, { status: 400 })
  }

  try {
    // Create MetaAPI account
    const metaAccount = await createMetaApiAccount(
      name || `MT5-${login}`,
      String(login),
      investorPassword,
      server
    )

    // Deploy it
    await deployMetaApiAccount(metaAccount.id)

    // Save metaapi_account_id to our accounts table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any

    if (accountId) {
      // Update existing account
      await supabaseAny
        .from('accounts')
        .update({ metaapi_account_id: metaAccount.id, mt5_login: String(login) })
        .eq('id', accountId)
        .eq('user_id', user.id)
    } else {
      // Create new account
      await supabaseAny
        .from('accounts')
        .insert({
          user_id: user.id,
          name: name || `MT5-${login}`,
          type: 'live',
          balance: 0,
          currency: 'USD',
          metaapi_account_id: metaAccount.id,
          mt5_login: String(login),
        })
    }

    return Response.json({ metaapiAccountId: metaAccount.id, state: metaAccount.state })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur de connexion MetaAPI'
    return Response.json({ error: msg }, { status: 500 })
  }
}
