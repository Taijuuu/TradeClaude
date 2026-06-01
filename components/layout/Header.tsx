'use client'

import { GlobalFilters } from './GlobalFilters'
import type { Account } from '@/types'

interface HeaderProps {
  title: string
  accounts: Account[]
  children?: React.ReactNode
}

export function Header({ title, accounts, children }: HeaderProps) {
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
