export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center"
         style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            📊 Trading Journal
          </h1>
        </div>
        {children}
      </div>
    </div>
  )
}
