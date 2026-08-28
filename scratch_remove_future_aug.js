const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'client-1';

  const cutoff = new Date('2026-08-16T23:59:59.999Z');

  // Delete wages after 16 Aug
  const dWages = await prisma.staffWage.deleteMany({
    where: { clientId, weekEnd: { gt: cutoff } }
  });
  console.log(`Deleted ${dWages.count} wages after 16 Aug 2026`);

  // Delete expenses after 16 Aug
  const dExp = await prisma.expense.deleteMany({
    where: { clientId, date: { gt: cutoff } }
  });
  console.log(`Deleted ${dExp.count} expenses after 16 Aug 2026`);

  // Delete supplier invoices after 16 Aug
  const dInv = await prisma.invoice.deleteMany({
    where: { clientId, type: 'supplier', invoiceDate: { gt: cutoff } }
  });
  console.log(`Deleted ${dInv.count} supplier invoices after 16 Aug 2026`);

  console.log('SUCCESS: All future data beyond 16 Aug 2026 removed!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
