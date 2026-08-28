const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf'

  // Update existing
  await prisma.supplier.updateMany({
    where: { clientId, name: { in: ['BidFood', 'Express Food Service', 'JJ Food Service'] } },
    data: { franchise: 'Tasty Bun' }
  })
  
  await prisma.supplier.updateMany({
    where: { clientId, name: { in: ['N&B Food Service', 'Nella Cutlery'] } },
    data: { franchise: 'Combined' }
  })

  // Add missing
  const missing = [
    { name: 'Heri Cleaning Ltd', category: 'cleaning', franchise: 'Combined' }
  ]

  for (const s of missing) {
    const existing = await prisma.supplier.findFirst({
      where: { clientId, name: s.name }
    })
    if (!existing) {
      await prisma.supplier.create({
        data: {
          clientId,
          name: s.name,
          category: s.category,
          franchise: s.franchise,
        }
      })
      console.log(`Added ${s.name}`)
    }
  }
  console.log('Update complete')
}

main().catch(console.error).finally(() => prisma.$disconnect())
