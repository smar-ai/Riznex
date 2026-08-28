import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const rows = await p.expense.findMany({
  where: { clientId: 'cmpv4dvik0000vdj089wl6zmf' },
  select: { id: true, category: true, subcategory: true, amount: true, period: true }
})
console.log(JSON.stringify(rows, null, 2))
await p.$disconnect()
