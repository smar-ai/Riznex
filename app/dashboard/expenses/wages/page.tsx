import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { HenleyWages } from './HenleyWages'
import { HungryBirdsWages } from './HungryBirdsWages'

import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function WagesPageRouter() {
  const session = await getServerSession(authOptions)
  let clientName = session?.user?.clientName
  if (session?.user?.role === 'admin') {
    const cookieStore = await cookies()
    const adminClient = cookieStore.get('admin_client')?.value
    if (adminClient) clientName = adminClient
  }

  if (clientName === 'Hungry Birds') return <HungryBirdsWages />
  
  return <HenleyWages />
}
