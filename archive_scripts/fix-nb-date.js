const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const invoice = await prisma.invoice.findUnique({ where: { id: 'cmrqto0cm004rvd501vl3gow6' } });
  if (invoice) {
    await prisma.invoice.update({
      where: { id: 'cmrqto0cm004rvd501vl3gow6' },
      data: { invoiceDate: new Date('2026-06-17T00:00:00.000Z') }
    });
    
    // Also update any related expenses
    await prisma.expense.updateMany({
      where: { invoiceId: invoice.id },
      data: { date: new Date('2026-06-17T00:00:00.000Z') }
    });
    
    console.log("Updated invoice and expenses to 2026-06-17");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
