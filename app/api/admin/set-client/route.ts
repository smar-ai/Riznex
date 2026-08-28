import { NextRequest, NextResponse } from 'next/server'
export async function POST(req: NextRequest) {
  const { clientName } = await req.json()
  const res = NextResponse.json({ success: true })
  res.cookies.set('admin_client', clientName, { path: '/' })
  return res
}