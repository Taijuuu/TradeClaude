import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at')

  // accounts fetched here for use in future Plan 3 dashboard pages
  void accounts

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userEmail={user.email ?? ''} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
