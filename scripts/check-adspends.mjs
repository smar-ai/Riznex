import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const clientId = 'cmpv4dvik0000vdj089wl6zmf'

// Check if adSpends column exists and has data
const rows = await p.sale.findMany({
  where: { clientId },
  select: { platform: true, adSpends: true, marketing: true, grossSales: true, netPaid: true },
  take: 10,
  orderBy: { weekStart: 'desc' }
})
console.log('Sample sales with adSpends:')
rows.forEach(r => console.log(`  ${r.platform}: adSpends=${r.adSpends} marketing=${r.marketing} gross=${r.grossSales}`))

const totalAdSpends = rows.reduce((s, r) => s + (r.adSpends ?? 0), 0)
console.log('\nTotal ad spends:', totalAdSpends)
await p.$disconnect()
