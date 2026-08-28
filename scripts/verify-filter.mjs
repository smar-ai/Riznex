import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const clientId = 'cmpv4dvik0000vdj089wl6zmf' // Henley on Thames

// Test Herbies Pizza tab
const r1 = await p.sale.findMany({ 
  where: { clientId, platform: { contains: 'Herbies Pizza' } },
  select: { platform: true }
})
console.log('Herbies Pizza:', r1.length, r1.map(r => r.platform))

// Test Tasty Bun tab  
const r2 = await p.sale.findMany({ 
  where: { clientId, platform: { contains: 'Tasty Bun' } },
  select: { platform: true }
})
console.log('Tasty Bun:', r2.length, r2.map(r => r.platform))

// Test Combined (no store filter)
const r3 = await p.sale.findMany({ 
  where: { clientId, store: { notIn: ['Monthly Combined', 'Monthly Herbies Pizza', 'Monthly Tasty Bun'] } },
  select: { platform: true }
})
console.log('Combined:', r3.length)

// Test platform=uber_eats + store=Herbies Pizza
const r4 = await p.sale.findMany({ 
  where: { clientId, AND: [{ platform: { contains: 'Herbies Pizza' } }, { platform: { contains: 'Uber Eats' } }] },
  select: { platform: true }
})
console.log('Herbies + Uber Eats:', r4.length, r4.map(r => r.platform))

await p.$disconnect()
