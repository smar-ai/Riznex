const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const latestExpense = await prisma.expense.findFirst({
    orderBy: { date: 'desc' },
    select: { date: true, category: true, amount: true }
  });

  const latestInvoice = await prisma.invoice.findFirst({
    where: { type: 'expense' },
    orderBy: { invoiceDate: 'desc' },
    select: { invoiceDate: true, fileName: true, amount: true }
  });

  const latestSupplier = await prisma.invoice.findFirst({
    where: { type: 'supplier' },
    orderBy: { invoiceDate: 'desc' },
    select: { invoiceDate: true, fileName: true, amount: true }
  });

  console.log("=== LATEST UPLOADED DATES ===");
  console.log("Latest General Expense:", latestExpense ? latestExpense.date : 'None');
  console.log("Latest Scanned Receipt (Expense Invoice):", latestInvoice ? latestInvoice.invoiceDate : 'None');
  console.log("Latest Supplier Invoice:", latestSupplier ? latestSupplier.invoiceDate : 'None');
}

main().catch(console.error).finally(() => prisma.$disconnect());
