const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clients = await prisma.client.findMany()
  if (clients.length === 0) {
    console.log('No clients found.')
    return
  }
  const clientId = clients[0].id

  const newSuppliers = [
    { name: 'Bidfood', category: 'food', franchise: 'Tasty Bun' },
    { name: 'Espress', category: 'food', franchise: 'Tasty Bun' },
    { name: 'JJ Food Service', category: 'food', franchise: 'Tasty Bun' },
    { name: 'NB', category: 'equipment', franchise: 'Combined' },
    { name: 'Nella Cutlery', category: 'equipment', franchise: 'Combined' },
    { name: 'Heri Cleaning Ltd', category: 'cleaning', franchise: 'Combined' },
  ]

  for (const s of newSuppliers) {
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
    } else {
      console.log(`${s.name} already exists.`)
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
