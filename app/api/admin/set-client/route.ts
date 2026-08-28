import { NextResponse } from 'next/server'
export async function POST(req) {
  const { clientName } = await req.json()
  const res = NextResponse.json({ success: true })
  res.cookies.set('admin_client', clientName, { path: '/' })
  return res
}