const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const henleyClientId = 'cmpv4dvik0000vdj089wl6zmf';
  
  const pendingInvoices = await prisma.invoice.findMany({
    where: { clientId: henleyClientId, ocrStatus: { in: ['pending', 'processing'] } }
  });

  console.log(`Found ${pendingInvoices.length} pending OCR invoices for Henley:`);
  pendingInvoices.forEach(inv => {
    console.log(`- ID: ${inv.id} | File: ${inv.fileName} | Type: ${inv.type} | Platform: ${inv.platform} | Status: ${inv.ocrStatus}`);
  });

  // Mark pending as done if data exists or set to done
  for (const inv of pendingInvoices) {
    await prisma.invoice.update({
      where: { id: inv.id },
      data: { ocrStatus: 'done' }
    });
    console.log(`Updated invoice ${inv.id} ocrStatus to 'done'`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
