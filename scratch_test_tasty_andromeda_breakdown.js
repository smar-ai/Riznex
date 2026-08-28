const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  const is2025 = false;

  const tastyInvoices = await prisma.invoice.findMany({
    where: { clientId, is2025, type: 'pos', fileName: { contains: 'Tasty' } }
  });

  let posSales = 0, posOrders = 0;
  let webAppSales = 0, webAppOrders = 0;

  for (const inv of tastyInvoices) {
    if (!inv.ocrData) continue;
    try {
      const ocr = JSON.parse(inv.ocrData);
      if (ocr.andromedaPOS) {
        posSales += (ocr.andromedaPOS.sales || 0);
        posOrders += (ocr.andromedaPOS.orders || 0);
      }
      const web = (ocr.androweb?.sales || 0) + (ocr.website?.gross || 0);
      const app = (ocr.app?.sales || 0) + (ocr.consumerApp?.gross || 0);
      const webOrders = (ocr.androweb?.orders || 0);
      const appOrders = (ocr.app?.orders || 0);

      webAppSales += (web + app);
      webAppOrders += (webOrders + appOrders);
    } catch (e) {}
  }

  console.log(`\n=== TASTY BUN 2-PART BREAKDOWN AUDIT ===\n`);
  console.log(`1. Tasty Bun POS (In-Store Till):`);
  console.log(`   - Orders:      ${posOrders}`);
  console.log(`   - Gross Sales: £${posSales.toFixed(2)}`);
  console.log(`   - Deductions:  £${(posSales * 0.04).toFixed(2)} (4.0%)`);
  console.log(`   - Net Rec'd:   £${(posSales * 0.96).toFixed(2)}`);
  console.log(``);
  console.log(`2. Tasty Bun Web & App (Website + App Combined):`);
  console.log(`   - Orders:      ${webAppOrders}`);
  console.log(`   - Gross Sales: £${webAppSales.toFixed(2)}`);
  console.log(`   - Deductions:  £${(webAppSales * 0.04).toFixed(2)} (4.0%)`);
  console.log(`   - Net Rec'd:   £${(webAppSales * 0.96).toFixed(2)}`);
  console.log(``);
  console.log(`Total Combined:   £${(posSales + webAppSales).toFixed(2)} | Orders: ${posOrders + webAppOrders}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
