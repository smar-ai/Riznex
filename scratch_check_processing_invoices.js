const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  const is2025 = false;

  const pendingInvoices = await prisma.invoice.findMany({
    where: { clientId, is2025, ocrStatus: { in: ['processing', 'pending'] } }
  });

  console.log(`\n=== PENDING INVOICES AUDIT (${pendingInvoices.length} Invoices) ===\n`);

  for (const inv of pendingInvoices) {
    console.log(`ID: ${inv.id} | File: ${inv.fileName} | ocrStatus: ${inv.ocrStatus} | Amount: ${inv.amount}`);
  }

  // Also check all recent Herbies invoices
  const allHerbies = await prisma.invoice.findMany({
    where: { clientId, is2025, fileName: { contains: 'Herbies' } },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`\n=== ALL HERBIES INVOICES (${allHerbies.length} Total) ===\n`);
  for (const inv of allHerbies) {
    console.log(`File: ${inv.fileName} | ocrStatus: ${inv.ocrStatus} | Amount: ${inv.amount}`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
