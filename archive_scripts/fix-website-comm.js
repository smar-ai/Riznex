const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const websiteSales = await prisma.sale.findMany({
    where: {
      platform: {
        contains: 'Website'
      }
    }
  })

  let updated = 0;
  for (const sale of websiteSales) {
    if (sale.grossSales > 0) {
      const comm = sale.grossSales * 0.085;
      const net = sale.grossSales - comm; // No VAT, no other fees! Just exactly 8.5% total deduction!

      await prisma.sale.update({
        where: { id: sale.id },
        data: {
          commission: comm,
          vat: 0,
          otherFees: 0, // Reset any other fees that the OCR might have accidentally picked up
          netPaid: net
        }
      })
      updated++;
    }
  }
  console.log(`Updated ${updated} Website sales records to exactly 8.5% deductions.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
