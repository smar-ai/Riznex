import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

// Simulate what API does for "Herbies Pizza" tab
const where = {
  clientId: 'cmpv4dv9k0000vdj0q7nf3fzr', // use first client
  AND: [
    {
      OR: [
        { store: 'Herbies Pizza' },
        { platform: { contains: 'Herbies Pizza' } }
      ]
    },
    { store: { notIn: ['Monthly Combined', 'Monthly Herbies Pizza', 'Monthly Tasty Bun'] } }
  ]
}

// First get client ID
const client = await p.client.findFirst()
where.clientId = client.id

const rows = await p.sale.findMany({ where, select: { platform: true, store: true, grossSales: true } })
console.log('Herbies Pizza results:', rows.length)
rows.forEach(r => console.log(`  platform="${r.platform}" store="${r.store}" gross=${r.grossSales}`))

// Also check Combined
const where2 = {
  clientId: client.id,
  AND: [
    { store: { notIn: ['Monthly Combined', 'Monthly Herbies Pizza', 'Monthly Tasty Bun'] } }
  ]
}
const rows2 = await p.sale.findMany({ where: where2, select: { platform: true, store: true } })
console.log('\nCombined results:', rows2.length)

await p.$disconnect()
