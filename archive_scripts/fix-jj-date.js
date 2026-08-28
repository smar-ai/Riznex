const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const invoiceId = 'cmrmhn4uy0001vdd06jtfnb12';
  
  console.log("=== FIXING INVOICE DATE ===");
  
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      invoiceDate: new Date('2026-05-08T00:00:00.000Z')
    }
  });

  console.log("Invoice date updated to May 8th, 2026.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
