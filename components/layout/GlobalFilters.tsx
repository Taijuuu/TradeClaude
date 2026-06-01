'use client'

import { useFiltersStore } from '@/store/filtersStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Account } from '@/types'

interface GlobalFiltersProps {
  accounts: Account[]
}

export function GlobalFilters({ accounts }: GlobalFiltersProps) {
  const { dateFrom, dateTo, accountIds, displayMode, setDateFrom, setDateTo, setAccountIds, setDisplayMode, reset } =
    useFiltersStore()

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>De</Label>
        <Input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="h-8 text-sm w-36"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>À</Label>
        <Input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="h-8 text-sm w-36"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </div>
      {accounts.length > 0 && (
        <Select
          value={accountIds[0] ?? 'all'}
          onValueChange={v => setAccountIds(v === 'all' ? [] : [v])}
        >
          <SelectTrigger className="h-8 text-sm w-44"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            <SelectValue placeholder="Tous les comptes" />
          </SelectTrigger>
          <SelectContent style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <SelectItem value="all">Tous les comptes</SelectItem>
            {accounts.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select value={displayMode} onValueChange={v => setDisplayMode(v as typeof displayMode)}>
        <SelectTrigger className="h-8 text-sm w-28"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <SelectItem value="dollar">$ Dollar</SelectItem>
          <SelectItem value="percentage">% Pct</SelectItem>
          <SelectItem value="r_multiple">R Multiple</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="ghost" size="sm" onClick={reset} style={{ color: 'var(--text-muted)' }}>
        Reset
      </Button>
    </div>
  )
}
