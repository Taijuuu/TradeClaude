// Logo TradeClaude : carré arrondi dégradé violet avec 3 bougies ascendantes.
// Même visuel que le favicon (app/icon.svg) — garder les deux synchronisés.
export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="tc-logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#tc-logo-grad)" />
      <line x1="18" y1="26" x2="18" y2="54" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" />
      <rect x="13" y="32" width="10" height="14" rx="2" fill="#ffffff" fillOpacity="0.9" />
      <line x1="32" y1="16" x2="32" y2="46" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" />
      <rect x="27" y="22" width="10" height="16" rx="2" fill="#ffffff" />
      <line x1="46" y1="8" x2="46" y2="38" stroke="#4ade80" strokeOpacity="0.9" strokeWidth="3" strokeLinecap="round" />
      <rect x="41" y="13" width="10" height="17" rx="2" fill="#4ade80" />
    </svg>
  )
}

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <span className="flex items-center gap-2 min-w-0">
      <LogoMark />
      {!collapsed && (
        <span className="font-bold text-sm tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
          Trade<span style={{ color: 'var(--accent-light, #a78bfa)' }}>Claude</span>
        </span>
      )}
    </span>
  )
}
