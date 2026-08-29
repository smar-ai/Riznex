import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const adminPassword = await bcrypt.hash('admin123', 10)
    await prisma.user.upsert({
      where: { email: 'admin@riznex.com' },
      update: {},
      create: {
        email: 'admin@riznex.com',
        password: adminPassword,
        name: 'Riznex Admin',
        role: 'admin',
      },
    })
    return NextResponse.json({ success: true, message: 'Admin user seeded successfully' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
