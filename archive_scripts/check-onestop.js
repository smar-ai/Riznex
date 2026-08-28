const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  
  console.log("=== CHECKING ONE STOP INVOICES ===");
  const invoices = await prisma.invoice.findMany({
    where: { 
      clientId,
      OR: [
        { supplier: { name: { contains: 'One Stop' } } },
        { fileName: { contains: 'One Stop' } },
        { platform: { contains: 'One Stop' } }
      ]
    },
    include: { supplier: true },
    orderBy: { createdAt: 'desc' }
  });

  for (const inv of invoices) {
    console.log(`ID: ${inv.id}`);
    console.log(`File: ${inv.fileName}`);
    console.log(`Supplier: ${inv.supplier?.name}`);
    console.log(`Status: ${inv.ocrStatus}`);
    console.log(`Amount: ${inv.amount}`);
    console.log(`Date: ${inv.invoiceDate}`);
    console.log(`Notes: ${inv.notes}`);
    console.log("------------------------");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
