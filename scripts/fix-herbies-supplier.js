const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf'

  await prisma.supplier.updateMany({
    where: { clientId, name: 'Herbies Pizza Limited' },
    data: { franchise: 'Herbies Pizza' }
  })
  
  console.log('Fixed Herbies Pizza Limited franchise')
}

main().catch(console.error).finally(() => prisma.$disconnect())
