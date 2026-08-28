const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const herbiesExp = await prisma.expense.findMany({
    where: { category: 'herbies_head_office', date: { gte: new Date('2026-06-01') } }
  });
  console.log(`herbies_head_office expenses since June:`, herbiesExp.length);

  const herbiesInv = await prisma.invoice.findMany({
    where: { supplier: { name: 'Herbies Head office' }, invoiceDate: { gte: new Date('2026-06-01') } }
  });
  console.log(`Herbies Head office supplier invoices since June:`, herbiesInv.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
