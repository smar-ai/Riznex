import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { cookies } from 'next/headers'
import { HenleySuppliers } from './HenleySuppliers'
import { HungryBirdsSuppliers } from './HungryBirdsSuppliers'

export default async function SuppliersPageRouter() {
  const session = await getServerSession(authOptions)
  let clientName = session?.user?.clientName
  if (session?.user?.role === 'admin') {
    const cookieStore = await cookies()
    const adminClient = cookieStore.get('admin_client')?.value
    if (adminClient) clientName = adminClient
  }

  if (clientName === 'Hungry Birds') {
    return <HungryBirdsSuppliers />
  }
  
  return <HenleySuppliers />
}
