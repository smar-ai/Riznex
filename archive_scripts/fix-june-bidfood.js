const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const inv1 = await prisma.invoice.findFirst({
    where: { fileName: 'Supplier Bid Foods June 08.jpeg' }
  });
  if (inv1) {
    await prisma.invoice.update({
      where: { id: inv1.id },
      data: { invoiceDate: new Date('2026-06-08T12:00:00Z') }
    });
    console.log("Fixed June 08");
  }

  const inv2 = await prisma.invoice.findFirst({
    where: { fileName: 'Supplier Bid Foods June 17.jpeg' }
  });
  if (inv2) {
    await prisma.invoice.update({
      where: { id: inv2.id },
      data: { invoiceDate: new Date('2026-06-17T12:00:00Z') }
    });
    console.log("Fixed June 17");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
