const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  const is2025 = false;

  console.log(`\n=== UPDATING TASTY BUN SALE RECORD ORDERS TO MATCH EXACT OCR INVOICES ===\n`);

  const tastyPosInvoices = await prisma.invoice.findMany({
    where: { clientId, is2025, type: 'pos', fileName: { contains: 'Tasty' } }
  });

  let updatedCount = 0;

  for (const inv of tastyPosInvoices) {
    if (!inv.ocrData) continue;
    try {
      const ocr = JSON.parse(inv.ocrData);
      const posOrders = ocr.andromedaPOS?.orders || 0;
      const webOrders = ocr.androweb?.orders || 0;
      const appOrders = ocr.app?.orders || 0;
      const totalExactOrders = posOrders + webOrders + appOrders;

      if (totalExactOrders > 0) {
        await prisma.sale.updateMany({
          where: { invoiceId: inv.id },
          data: { totalOrders: totalExactOrders }
        });
        updatedCount++;
      }
    } catch (e) {}
  }

  console.log(`Updated ${updatedCount} Tasty Bun Sale records with exact OCR order counts.`);

  // Audit sale records total orders now
  const sales = await prisma.sale.findMany({ where: { clientId, is2025 } });
  const byPlat = sales.reduce((acc, s) => {
    acc[s.platform] = (acc[s.platform] || 0) + s.totalOrders;
    return acc;
  }, {});

  console.log(`\nUpdated Sale Records Platform Orders Breakdown:`);
  console.table(byPlat);

  const grandTotal = Object.values(byPlat).reduce((a, b) => a + b, 0);
  console.log(`\nGRAND TOTAL ORDERS ACROSS ALL PLATFORMS: ${grandTotal}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
