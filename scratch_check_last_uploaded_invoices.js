const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';

  const recentInvoices = await prisma.invoice.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, fileName: true, type: true, is2025: true, ocrStatus: true, amount: true, createdAt: true }
  });

  console.log(`\n=== 10 MOST RECENTLY CREATED INVOICES IN DB ===\n`);

  recentInvoices.forEach((inv, idx) => {
    console.log(`#${idx + 1}: ID: ${inv.id} | File: ${inv.fileName} | Type: ${inv.type} | 2025: ${inv.is2025} | Status: ${inv.ocrStatus} | Created: ${inv.createdAt.toISOString()}`);
  });

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
