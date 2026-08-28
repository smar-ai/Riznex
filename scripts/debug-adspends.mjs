import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const clientId = 'cmpv4dvik0000vdj089wl6zmf'

const sales = await p.sale.findMany({ where: { clientId } })
console.log('Total sales:', sales.length)

let totalAdSpends = 0
for (const s of sales) {
  const ad = (s).adSpends
  if (ad) {
    console.log(`  ${s.platform}: adSpends=${ad}`)
    totalAdSpends += ad
  }
}
console.log('\nTotal adSpends in DB:', totalAdSpends)

// Simulate what the reports API does
const apiTotal = sales.reduce((sum, r) => sum + ((r).adSpends ?? 0), 0)
console.log('API reduce result:', apiTotal)

await p.$disconnect()
