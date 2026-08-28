const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  const is2025 = false;

  console.log(`\n=== AUDITING TOTAL ORDERS FOR HENLEY 2026 ===\n`);

  // 1. Audit Sale records in DB
  const sales = await prisma.sale.findMany({
    where: { clientId, is2025 }
  });

  const salesByPlat = sales.reduce((acc, s) => {
    acc[s.platform] = (acc[s.platform] || 0) + s.totalOrders;
    return acc;
  }, {});

  console.log(`Sale Records Platform Breakdown (Total Orders):`);
  console.table(salesByPlat);

  const totalSaleOrders = Object.values(salesByPlat).reduce((a, b) => a + b, 0);
  console.log(`Total Orders in Sales Table: ${totalSaleOrders}`);

  // 2. Audit Invoice records in DB
  const invoices = await prisma.invoice.findMany({
    where: { clientId, is2025 }
  });

  let posOrders = 0;
  let ocrBreakdown = {};

  for (const inv of invoices) {
    if (!inv.ocrData) continue;
    try {
      const ocr = JSON.parse(inv.ocrData);
      if (inv.fileName.includes('Tasty')) {
        const pos = ocr.andromedaPOS?.orders || 0;
        const web = ocr.androweb?.orders || 0;
        const app = ocr.app?.orders || 0;
        ocrBreakdown['Tasty Bun POS'] = (ocrBreakdown['Tasty Bun POS'] || 0) + pos;
        ocrBreakdown['Tasty Bun Web & App'] = (ocrBreakdown['Tasty Bun Web & App'] || 0) + (web + app);
      } else if (inv.fileName.includes('Herbies') || inv.type === 'pos') {
        const reg = ocr.s4dRegister?.orders || 0;
        const web = ocr.website?.orders || 0;
        const app = ocr.consumerApp?.orders || 0;
        ocrBreakdown['Herbies POS'] = (ocrBreakdown['Herbies POS'] || 0) + reg;
        ocrBreakdown['Herbies Web & App'] = (ocrBreakdown['Herbies Web & App'] || 0) + (web + app);
      }
    } catch (e) {}
  }

  console.log(`\nOCR Invoice Platform Breakdown (Exact Orders):`);
  console.table(ocrBreakdown);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
