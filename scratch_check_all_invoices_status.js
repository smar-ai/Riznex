const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  const is2025 = false;

  const invoices = await prisma.invoice.findMany({
    where: { clientId, is2025 }
  });

  const byStatus = invoices.reduce((acc, i) => {
    acc[i.ocrStatus] = (acc[i.ocrStatus] || 0) + 1;
    return acc;
  }, {});

  console.log(`\n=== INVOICE STATUS AUDIT (${invoices.length} Total Invoices) ===\n`);
  console.table(byStatus);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
