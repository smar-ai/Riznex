import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

const clients = await p.client.findMany({ select: { id: true, name: true } })
console.log('All clients:', clients)

for (const c of clients) {
  const count = await p.sale.count({ where: { clientId: c.id } })
  const sample = await p.sale.findMany({ 
    where: { clientId: c.id }, 
    select: { platform: true, store: true },
    take: 3,
    orderBy: { weekStart: 'desc' }
  })
  console.log(`\nClient "${c.name}" (${c.id}): ${count} sales`)
  sample.forEach(s => console.log(`  platform="${s.platform}" store="${s.store}"`))
}

await p.$disconnect()
