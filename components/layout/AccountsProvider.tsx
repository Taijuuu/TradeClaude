'use client'

import { createContext, useContext } from 'react'
import type { Account } from '@/types'

const AccountsContext = createContext<Account[]>([])

export function AccountsProvider({
  accounts,
  children,
}: {
  accounts: Account[]
  children: React.ReactNode
}) {
  return (
    <AccountsContext.Provider value={accounts}>
      {children}
    </AccountsContext.Provider>
  )
}

export function useAccounts(): Account[] {
  return useContext(AccountsContext)
}
