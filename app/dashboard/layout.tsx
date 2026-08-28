'use client'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'

const getNavItems = (clientName?: string | null, role?: string) => {
  if (role === 'client') {
    return [{ href: '/dashboard', icon: '📊', label: 'Overview' }]
  }
  return [
  { href: '/dashboard', icon: '📊', label: 'Overview' },
  { 
    href: '/dashboard/sales', 
    icon: '💷', 
    label: 'Sales',
    subItems: clientName === 'Hungry Birds' ? undefined : [
      { href: '/dashboard/sales?tab=combined', label: 'Combined Sales' },
      { href: '/dashboard/sales?tab=monthly_combined', label: 'Combined Monthly Sales' }
    ]
  },
  { 
    href: '/dashboard/expenses', 
    icon: '💸', 
    label: 'Expenses',
    subItems: [
      { href: '/dashboard/expenses', label: 'Combined Expenses Dashboard' },
      { href: '/dashboard/expenses/suppliers', label: 'Supplier Purchases' },
      { href: '/dashboard/expenses/wages', label: 'Staff Wages' },
      { href: '/dashboard/expenses/utilities', label: 'Utilities' },
      { href: '/dashboard/expenses/marketing', label: 'Marketing' },
      { href: '/dashboard/expenses/other', label: 'Other Expenses' }
    ]
  },

  { 
    href: '/dashboard/invoices', 
    icon: '🧾', 
    label: 'Sales Invoices',
    subItems: [
      { href: '/dashboard/invoices?tab=all', label: 'Combined Invoices Data' },
      { href: '/dashboard/invoices?tab=platform', label: 'Uber Eats, Just Eat, Deliveroo Invoices' },
      { href: '/dashboard/invoices?tab=pos', label: clientName === 'Hungry Birds' ? 'POS (Walk-in Card & Cash)' : 'Herbies Pizza & Tasty Bun POS Invoices' }
    ]
  },
  { href: '/dashboard/reports', icon: '📈', label: 'Reports' },
  { href: '/dashboard/settings', icon: '⚙️', label: 'Settings' },
  ...(clientName !== 'Hungry Birds' ? [{
    href: '/dashboard/2025', 
    icon: '🗓️', 
    label: '2025 Audit',
    subItems: [
      { href: '/dashboard/2025', label: '2025 Overview' },
      { href: '/dashboard/2025/sales', label: '2025 Sales' },
      { href: '/dashboard/2025/expenses', label: '2025 Expenses' },
      { href: '/dashboard/2025/wages', label: '2025 Staff Wages' },
      { href: '/dashboard/2025/invoices?tab=all', label: 'Herbies Invoices Data' },
      { href: '/dashboard/2025/invoices?tab=platform', label: 'Uber Eats, Just Eat, Deliveroo Invoices' },
      { href: '/dashboard/2025/invoices?tab=pos', label: 'Herbies Pizza POS Invoices' },
      { href: '/dashboard/2025/reports', label: '2025 Reports' }
    ]
  }] : [])
]
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0c14]" />}>
      <DashboardSidebar>{children}</DashboardSidebar>
    </Suspense>
  )
}

function DashboardSidebar({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const [activeClient, setActiveClient] = useState<string | null | undefined>(session?.user?.clientName)

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      const match = document.cookie.match(/(^| )admin_client=([^;]+)/)
      if (match) setActiveClient(decodeURIComponent(match[2]))
    } else {
      setActiveClient(session?.user?.clientName)
    }
  }, [session])
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedMenu, setExpandedMenu] = useState<string | null>(
    pathname.startsWith('/dashboard/invoices') ? 'Sales Invoices' :
    pathname.startsWith('/dashboard/sales') ? 'Sales' :
    pathname.startsWith('/dashboard/expenses') ? 'Expenses' : 
    pathname.startsWith('/dashboard/2025') ? '2025 Audit' : null
  )

  useEffect(() => {
    if (pathname.startsWith('/dashboard/2025')) setExpandedMenu('2025 Audit')
    else if (pathname.startsWith('/dashboard/invoices')) setExpandedMenu('Sales Invoices')
    else if (pathname.startsWith('/dashboard/sales')) setExpandedMenu('Sales')
    else if (pathname.startsWith('/dashboard/expenses')) setExpandedMenu('Expenses')
  }, [pathname])

  return (
    <div className="min-h-screen bg-[#0a0c14] flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 bg-[#111520] border-r border-[#1f2947] flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 print:hidden`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6 border-b border-[#1f2947]">
          {activeClient === 'Hungry Birds' ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src="/hungry-birds-logo.jpg" alt="Hungry Birds Logo" className="w-10 h-10 rounded-xl object-cover shadow-lg border border-[#1f2947] flex-shrink-0" />
          ) : (
            <img src="/riznex_logo.jpg" alt="Riznex Digital Solutions" className="w-12 h-12 rounded-xl object-contain bg-white flex-shrink-0 p-1" />
          )}
          <div>
            {activeClient === 'Hungry Birds' ? (
              <div className="font-bold text-white text-sm leading-tight">Hungry Birds</div>
            ) : (
              <div className="font-bold text-white text-sm uppercase tracking-wide">RIZNEX</div>
            )}
            <div className="text-[11px] text-slate-400 leading-tight truncate max-w-[120px]">
              {activeClient ?? 'Dashboard'}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
            MENU
          </div>
          {getNavItems(activeClient, session?.user?.role).map(item => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            const isExpanded = expandedMenu === item.label
            
            return (
              <div key={item.label}>
                {item.subItems ? (
                  <button
                    onClick={() => setExpandedMenu(isExpanded ? null : item.label)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border border-transparent ${
                      isActive
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/20'
                        : isExpanded
                        ? 'text-white bg-[#1c2238] border-[#2a3441]'
                        : 'text-slate-400 hover:bg-[#1c2238] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base w-5 text-center">{item.icon}</span>
                      {item.label}
                    </div>
                    <span className="text-[10px] opacity-50">{isExpanded ? '▼' : '▶'}</span>
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                        : 'text-slate-400 hover:bg-[#1c2238] hover:text-white'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base w-5 text-center">{item.icon}</span>
                      {item.label}
                    </div>
                  </Link>
                )}
                
                {item.subItems && isExpanded && (
                  <div className="ml-9 mt-1 space-y-1">
                    {item.subItems.map(sub => {
                      const subUrl = new URL(sub.href, 'http://localhost')
                      const subPath = subUrl.pathname
                      const subTab = subUrl.searchParams.get('tab')
                      
                      let isActiveSub = false
                      if (subTab) {
                        isActiveSub = pathname === subPath && (currentTab === subTab || (!currentTab && (subTab === 'combined' || subTab === 'all')))
                      } else {
                        isActiveSub = pathname === subPath && !currentTab
                      }
                      
                      return (
                        <Link
                          key={sub.label}
                          href={sub.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-start px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            isActiveSub 
                              ? 'bg-[#1c2238] text-white border border-[#2a3441] shadow-sm'
                              : 'text-slate-400 hover:text-white hover:bg-[#1c2238]'
                          }`}
                        >
                          <span className={`mr-2 mt-[1px] ${isActiveSub ? 'text-blue-400' : 'text-slate-600'}`}>•</span>
                          <span>{sub.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-[#1f2947]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {session?.user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">{session?.user?.name}</div>
              <div className="text-xs text-slate-500 truncate">{session?.user?.email}</div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 px-3 py-2 rounded-xl hover:bg-red-500/10 transition-colors"
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-60 print:ml-0 flex flex-col min-h-screen print:bg-white print:text-black">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[#0a0c14]/80 backdrop-blur border-b border-[#1f2947] px-6 py-3 flex items-center gap-4 print:hidden">
          <button
            className="lg:hidden text-slate-400 hover:text-white p-1"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="hidden sm:block">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

// Force recompile
