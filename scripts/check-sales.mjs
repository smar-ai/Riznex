import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const rows = await p.sale.findMany({ 
  select: { id: true, platform: true, store: true, weekStart: true, grossSales: true, netPaid: true },
  take: 20,
  orderBy: { weekStart: 'desc' }
})
console.log('Total sales:', rows.length)
rows.forEach(r => console.log(`platform="${r.platform}" store="${r.store}" week=${r.weekStart?.toISOString().split('T')[0]} gross=${r.grossSales} net=${r.netPaid}`))
await p.$disconnect()
