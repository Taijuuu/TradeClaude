import { cn } from '@/lib/utils'

interface CurrentStreakProps {
  streak: { type: 'win' | 'loss' | 'none'; count: number }
  consecutiveWins: number
  consecutiveLosses: number
}

export function CurrentStreak({ streak, consecutiveWins, consecutiveLosses }: CurrentStreakProps) {
  return (
    <div
      className="rounded-lg p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <span className="text-xs font-medium block mb-3" style={{ color: 'var(--text-muted)' }}>
        Current Streak
      </span>
      <div className="flex gap-2">
        <div className={cn(
          'flex-1 rounded-md p-2 text-center',
          streak.type === 'win' ? 'bg-green-500/10' : 'bg-[var(--bg-hover)]'
        )}>
          <div className={cn(
            'text-lg font-bold',
            streak.type === 'win' ? 'text-green-400' : 'text-[var(--text-muted)]'
          )}>
            {streak.type === 'win' ? streak.count : consecutiveWins}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>WIN DAYS</div>
        </div>
        <div className={cn(
          'flex-1 rounded-md p-2 text-center',
          streak.type === 'loss' ? 'bg-red-500/10' : 'bg-[var(--bg-hover)]'
        )}>
          <div className={cn(
            'text-lg font-bold',
            streak.type === 'loss' ? 'text-red-400' : 'text-[var(--text-muted)]'
          )}>
            {streak.type === 'loss' ? streak.count : consecutiveLosses}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>LOSS DAYS</div>
        </div>
      </div>
    </div>
  )
}
