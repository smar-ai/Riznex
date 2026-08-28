const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const feesInvoices = await prisma.invoice.findMany({
    where: {
      is2025: true,
      fileName: { contains: 'fee' }
    }
  })

  let migrated = 0;

  for (const inv of feesInvoices) {
    if (inv.fileName.includes('POS fee')) {
      await prisma.expense.create({
        data: {
          clientId: inv.clientId,
          category: 'fees',
          subcategory: 'POS Fee',
          amount: inv.amount,
          period: 'monthly',
          date: inv.invoiceDate,
          notes: 'Migrated from Invoice',
          is2025: true
        }
      })
      await prisma.invoice.delete({ where: { id: inv.id } })
      migrated++;
    } else if (inv.fileName.includes('Franchise fee')) {
      await prisma.expense.create({
        data: {
          clientId: inv.clientId,
          category: 'fees',
          subcategory: 'Franchise Fee',
          amount: inv.amount,
          period: 'weekly',
          date: inv.invoiceDate,
          notes: 'Migrated from Invoice',
          is2025: true
        }
      })
      await prisma.invoice.delete({ where: { id: inv.id } })
      migrated++;
    }
  }

  console.log(`Migrated ${migrated} fee invoices to Expenses table.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
