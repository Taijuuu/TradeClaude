import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { AccountsProvider } from '@/components/layout/AccountsProvider'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { AutoSync } from '@/components/mt5/AutoSync'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at')

  return (
    <AccountsProvider accounts={accounts ?? []}>
      <AutoSync />
      <div className="flex h-screen overflow-hidden">
        <Sidebar userEmail={user.email ?? ''} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader />
          {children}
        </div>
      </div>
    </AccountsProvider>
  )
}
