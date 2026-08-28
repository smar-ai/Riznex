'use client'
import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [client, setClient] = useState<any>(null)
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '', jeCommission: '14', ueCommission: '30', delCommission: '14' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const currentClientId = session?.user?.role === 'admin' ? 'client-1' : session?.user?.clientId

  useEffect(() => {
    if (!currentClientId) return
    fetch(`/api/clients/${currentClientId}`)
      .then(r => r.json())
      .then(data => {
        setClient(data)
        setForm({
          name: data.name ?? '',
          address: data.address ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          jeCommission: String(data.jeCommission ?? 14),
          ueCommission: String(data.ueCommission ?? 30),
          delCommission: String(data.delCommission ?? 14),
        })
      })
  }, [session, currentClientId])

  async function save() {
    if (!currentClientId) return
    setSaving(true)
    await fetch(`/api/clients/${currentClientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        jeCommission: parseFloat(form.jeCommission),
        ueCommission: parseFloat(form.ueCommission),
        delCommission: parseFloat(form.delCommission),
      }),
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your business profile and commission rates</p>
      </div>

      <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-white text-base">Business Profile</h2>
        {[
          { label: 'Business Name', key: 'name', placeholder: 'Hungry Birds' },
          { label: 'Address', key: 'address', placeholder: '12 High St, Manchester' },
          { label: 'Phone', key: 'phone', placeholder: '0161 000 0000' },
          { label: 'Email', key: 'email', placeholder: 'business@email.com' },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-xs font-semibold text-slate-400 mb-1">{f.label}</label>
            <input value={(form as any)[f.key]} onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))}
              className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" placeholder={f.placeholder} />
          </div>
        ))}
      </div>

      <div className="bg-[#111520] border border-[#1f2947] rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-white text-base">Platform Commission Rates (%)</h2>
        <p className="text-xs text-slate-500">These are used to auto-calculate commissions when you enter gross sales.</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Just Eat', key: 'jeCommission', color: '#f97316' },
            { label: 'Deliveroo', key: 'delCommission', color: '#4f8ef7' },
            { label: 'Uber Eats', key: 'ueCommission', color: '#22d3a5' },
          ].map(p => (
            <div key={p.key}>
              <label className="block text-xs font-semibold mb-1" style={{ color: p.color }}>{p.label}</label>
              <div className="relative">
                <input type="number" step="0.1" min="0" max="100"
                  value={(form as any)[p.key]} onChange={e => setForm(fm => ({ ...fm, [p.key]: e.target.value }))}
                  className="w-full bg-[#161b2c] border border-[#1f2947] text-white rounded-xl px-3 py-2.5 text-sm pr-8 focus:outline-none focus:border-blue-500" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {saved && <span className="text-emerald-400 text-sm font-semibold">✅ Saved!</span>}
      </div>

      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
        <h2 className="font-bold text-red-400 mb-1">Sign Out</h2>
        <p className="text-sm text-slate-500 mb-3">Sign out of your account on this device.</p>
        <button onClick={() => signOut({ callbackUrl: '/login' })}
          className="border border-red-500/30 text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-xl text-sm font-semibold transition">
          Sign Out
        </button>
      </div>
    </div>
  )
}
