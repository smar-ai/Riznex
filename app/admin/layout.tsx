'use client'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const navItems = [
  { href: '/admin', icon: '📊', label: 'All Clients' },
  { href: '/admin/settings', icon: '⚙️', label: 'Admin Settings' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#0a0c14] flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 bg-[#111520] border-r border-[#1f2947] flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex items-center gap-3 px-5 py-6 border-b border-[#1f2947]">
          <img src="/riznex_logo.jpg" alt="Riznex Digital Solutions" className="w-12 h-12 rounded-xl object-contain bg-white flex-shrink-0 p-1" />
          <div>
            <div className="font-bold text-white text-sm uppercase tracking-wide">Riznex</div>
            <div className="text-[11px] text-blue-400 font-semibold tracking-wider">DIGITAL SOLUTIONS</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:bg-[#1c2238] hover:text-white'}`}
                onClick={() => setOpen(false)}>
                <span className="text-base w-5 text-center">{item.icon}</span>{item.label}
              </Link>
            )
          })}
</nav>
        <div className="px-4 py-4 border-t border-[#1f2947] flex flex-col gap-2">
          <Link href="/admin?addClient=true" className="w-full flex items-center justify-center gap-2 text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 px-4 py-2.5 rounded-xl transition font-bold shadow-lg shadow-blue-500/20">
            <span className="text-lg leading-none">+</span> Add Client
          </Link>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="w-full flex items-center justify-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white hover:border-red-500 px-4 py-2.5 rounded-xl transition font-bold mt-1">
            Sign Out
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-[#0a0c14]/80 backdrop-blur border-b border-[#1f2947] px-6 py-3 flex items-center h-14 lg:hidden">
          <button className="text-slate-400 hover:text-white p-1" onClick={() => setOpen(true)}>☰</button>
        </header>
        <main className="flex-1 p-6 lg:pt-8">{children}</main>
      </div>
    </div>
  )
}
