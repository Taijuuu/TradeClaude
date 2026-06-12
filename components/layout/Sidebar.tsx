'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart2, ClipboardList, CalendarDays, TrendingDown,
  Target, BookOpen, Lightbulb, Settings, Plus,
  ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Logo, LogoMark } from '@/components/Logo'

const NAV_ITEMS = [
  { href: '/dashboard',    icon: BarChart2,     label: 'Dashboard' },
  { href: '/trades',       icon: ClipboardList, label: 'Trades' },
  { href: '/daily-stats',  icon: CalendarDays,  label: 'Daily Stats' },
  { href: '/reports',      icon: TrendingDown,  label: 'Reports' },
  { href: '/strategies',   icon: Target,        label: 'Strategies' },
  { href: '/notebook',     icon: BookOpen,      label: 'Notebook' },
  { href: '/ai-insights',  icon: Lightbulb,     label: 'AI Insights' },
  { href: '/settings',     icon: Settings,      label: 'Settings' },
]

interface SidebarProps {
  userEmail: string
  onAddTrade?: () => void
}

export function Sidebar({ userEmail, onAddTrade }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) { toast.error(error.message); return }
    router.push('/login')
  }

  function handleAddTrade() {
    if (onAddTrade) {
      onAddTrade()
    } else {
      router.push('/trades?add=1')
    }
  }

  const displayName = userEmail.split('@')[0]

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className="flex flex-col h-screen shrink-0 border-r transition-all duration-200"
        style={{
          width: collapsed ? 64 : 220,
          background: 'var(--bg-primary)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Header */}
        <div className={cn('flex items-center justify-between h-14 border-b', collapsed ? 'px-2' : 'p-3')} style={{ borderColor: 'var(--border)' }}>
          {collapsed ? <LogoMark size={20} /> : <Logo />}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-[var(--bg-hover)] ml-auto shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Add Trade button */}
        <div className="p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleAddTrade}
                className={cn('w-full gap-2', collapsed && 'px-0 justify-center')}
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                <Plus size={16} />
                {!collapsed && <span className="text-sm">Add Trade</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Add Trade</TooltipContent>}
          </Tooltip>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Tooltip key={href}>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    className={cn(
                      'flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors',
                      collapsed && 'justify-center',
                      active
                        ? 'bg-[var(--accent)]/10 text-[var(--accent-light)]'
                        : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    <Icon size={18} className="shrink-0" />
                    {!collapsed && label}
                  </Link>
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right">{label}</TooltipContent>}
              </Tooltip>
            )
          })}
        </nav>

        {/* Theme toggle */}
        <div className={cn('px-2 py-1', collapsed && 'flex justify-center')}>
          <Tooltip>
            <TooltipTrigger asChild>
              <ThemeToggle />
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Changer de thème</TooltipContent>}
          </Tooltip>
        </div>

        {/* User */}
        <div className="p-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className={cn('flex items-center gap-2 px-2 py-2 rounded-md', collapsed && 'justify-center')}>
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback style={{ background: 'var(--accent)', color: 'white', fontSize: 11 }}>
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <>
                <span className="text-xs truncate flex-1" style={{ color: 'var(--text-muted)' }}>
                  {displayName}
                </span>
                <button onClick={handleLogout} className="text-[var(--text-muted)] hover:text-red-400">
                  <LogOut size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
