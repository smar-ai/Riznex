const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const badInvoices = await prisma.invoice.findMany({
    where: { invoiceDate: { gt: new Date('2026-12-31') } },
    select: { id: true, invoiceDate: true, amount: true }
  });
  
  console.log('Bad invoices:', badInvoices);
  if (badInvoices.length > 0) {
    for (const inv of badInvoices) {
      const newDate = new Date(inv.invoiceDate);
      newDate.setFullYear(2026);
      await prisma.invoice.update({
        where: { id: inv.id },
        data: { invoiceDate: newDate }
      });
      console.log('Fixed', inv.id, 'to', newDate);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
