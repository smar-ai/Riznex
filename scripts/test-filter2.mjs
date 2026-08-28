import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const client = await p.client.findFirst()

// Test simple contains
const r1 = await p.sale.findMany({ 
  where: { clientId: client.id, platform: { contains: 'Herbies' } },
  select: { platform: true, store: true }
})
console.log('Simple contains "Herbies":', r1.length, r1.map(r => r.platform))

// Test store field values
const r2 = await p.sale.findMany({ 
  where: { clientId: client.id },
  select: { platform: true, store: true },
  distinct: ['store']
})
console.log('All distinct stores:', r2.map(r => `"${r.store}"`))

// Test AND with notIn
const r3 = await p.sale.findMany({ 
  where: { 
    clientId: client.id,
    AND: [
      { OR: [{ platform: { contains: 'Herbies Pizza' } }] },
      { store: { notIn: ['Monthly Combined', 'Monthly Herbies Pizza', 'Monthly Tasty Bun'] } }
    ]
  },
  select: { platform: true, store: true }
})
console.log('AND test:', r3.length, r3.map(r => r.platform))

await p.$disconnect()
