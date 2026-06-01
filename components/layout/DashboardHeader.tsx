'use client'

import { usePathname } from 'next/navigation'
import { GlobalFilters } from './GlobalFilters'
import { useAccounts } from './AccountsProvider'

const ROUTE_TITLES: [string, string][] = [
  ['/dashboard',   'Dashboard'],
  ['/trades',      'Trade Log'],
  ['/daily-stats', 'Daily Stats'],
  ['/reports',     'Reports'],
  ['/strategies',  'Strategies'],
  ['/notebook',    'Notebook'],
  ['/ai-insights', 'AI Insights'],
  ['/settings',    'Settings'],
]

export function DashboardHeader({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname()
  const accounts = useAccounts()

  const title =
    ROUTE_TITLES.find(([path]) => pathname === path || pathname.startsWith(path + '/'))?.[1] ??
    'Trading Journal'

  return (
    <header
      className="flex items-center justify-between px-6 h-14 border-b shrink-0"
      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
    >
      <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h1>
      <div className="flex items-center gap-3">
        <GlobalFilters accounts={accounts} />
        {children}
      </div>
    </header>
  )
}
