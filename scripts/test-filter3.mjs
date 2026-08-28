import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const client = await p.client.findFirst()
console.log('clientId:', client.id)

const r = await p.sale.findMany({ 
  where: { clientId: client.id },
  select: { platform: true, store: true, weekStart: true },
  take: 5
})
r.forEach(row => {
  console.log('platform bytes:', JSON.stringify(row.platform))
  console.log('store bytes:', JSON.stringify(row.store))
  console.log('---')
})

await p.$disconnect()
