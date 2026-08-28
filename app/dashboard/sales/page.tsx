import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { HenleySales } from './HenleySales'
import { HungryBirdsSales } from './HungryBirdsSales'

import { cookies } from 'next/headers'

export default async function SalesPageRouter() {
  const session = await getServerSession(authOptions)
  let clientName = session?.user?.clientName
  if (session?.user?.role === 'admin') {
    const cookieStore = await cookies()
    const adminClient = cookieStore.get('admin_client')?.value
    if (adminClient) clientName = adminClient
  }

  if (clientName === 'Hungry Birds') {
    return <HungryBirdsSales />
  }
  
  return <HenleySales />
}
