const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const sales = await prisma.sale.findMany({
    where: {
      platform: {
        contains: 'Website'
      }
    }
  })

  let updated = 0;
  for (const sale of sales) {
    if (sale.platform.includes('Website') && sale.commission === 0 && sale.grossSales > 0) {
      const comm = sale.grossSales * 0.085;
      const vat = comm * 0.20;
      const net = sale.grossSales - comm - vat;

      await prisma.sale.update({
        where: { id: sale.id },
        data: {
          commission: comm,
          vat: vat,
          netPaid: net,
          notes: (sale.notes ? sale.notes + ' ' : '') + '(Updated to 8.5% Comm)'
        }
      })
      updated++;
    }
  }
  console.log(`Updated ${updated} sales records with 8.5% commission.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
