const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const inv = await prisma.invoice.findFirst({
    where: { fileName: 'Supplier head Office June 29.jpeg' }
  });

  if (inv) {
    await prisma.invoice.update({
      where: { id: inv.id },
      data: { amount: 379.41 }
    });
    console.log("Updated June 29 invoice to 379.41");
  } else {
    console.log("Invoice not found.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
