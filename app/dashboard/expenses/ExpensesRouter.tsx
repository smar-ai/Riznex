// @ts-nocheck
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { cookies } from 'next/headers'
import { HenleyExpenses } from './HenleyExpenses'
import { HungryBirdsExpenses } from './HungryBirdsExpenses'

export default async function ExpensesRouter({ filterMode }: { filterMode?: 'utilities' | 'other' | 'marketing' | 'templates' }) {
  const session = await getServerSession(authOptions)
  let clientName = session?.user?.clientName
  if (session?.user?.role === 'admin') {
    const cookieStore = await cookies()
    const adminClient = cookieStore.get('admin_client')?.value
    if (adminClient) clientName = adminClient
  }

  if (clientName === 'Hungry Birds') {
    return <HungryBirdsExpenses filterMode={filterMode} />
  }
  
  return <HenleyExpenses filterMode={filterMode} />
}
