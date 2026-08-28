const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const sale = await prisma.sale.findFirst({
    where: {
      totalOrders: 52,
    }
  })
  
  if (sale) {
    console.log("Found sale, deleting:", sale)
    await prisma.sale.delete({ where: { id: sale.id } })
    console.log("Deleted!")
  } else {
    console.log("Sale not found")
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
