import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const rows = await p.invoice.findMany({ 
  where: { ocrStatus: 'error' }, 
  select: { id: true, fileName: true, notes: true, platform: true },
  take: 10
})
console.log(JSON.stringify(rows, null, 2))
await p.$disconnect()
