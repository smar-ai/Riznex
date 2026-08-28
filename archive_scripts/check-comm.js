const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  })
  console.log(sales.map(s => ({ 
    platform: s.platform, 
    gross: s.grossSales, 
    comm: s.commission, 
    commPercent: (s.commission / s.grossSales) * 100,
    vat: s.vat
  })))
}

main().catch(console.error).finally(() => prisma.$disconnect())
