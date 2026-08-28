const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf'
  const supplierName = 'One Stop'

  const existing = await prisma.supplier.findFirst({
    where: { clientId, name: supplierName }
  })
  
  if (!existing) {
    await prisma.supplier.create({
      data: {
        clientId,
        name: supplierName,
        category: 'food',
        franchise: 'Combined',
      }
    })
    console.log(`Added ${supplierName}`)
  } else {
    console.log(`${supplierName} already exists`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
