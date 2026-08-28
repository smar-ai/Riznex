const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const herbiesExp = await prisma.expense.findMany({
    where: { category: 'herbies_head_office', date: { gte: new Date('2026-06-01') } },
    orderBy: { date: 'asc' }
  });
  
  const herbiesInv = await prisma.invoice.findMany({
    where: { supplier: { name: 'Herbies Head office' }, invoiceDate: { gte: new Date('2026-06-01') } },
    orderBy: { invoiceDate: 'asc' }
  });

  console.log("=== EXPENSES ===");
  herbiesExp.forEach(e => console.log(`${e.date.toISOString().split('T')[0]} - £${e.amount}`));

  console.log("\n=== SUPPLIER INVOICES ===");
  herbiesInv.forEach(i => console.log(`${i.invoiceDate ? i.invoiceDate.toISOString().split('T')[0] : 'No Date'} - £${i.amount}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
