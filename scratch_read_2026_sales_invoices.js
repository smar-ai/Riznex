const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';

  // 1. Fetch 2026 Invoices (type: pos or platform)
  const invoices = await prisma.invoice.findMany({
    where: {
      clientId,
      is2025: false,
      type: { in: ['pos', 'platform'] }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`\n=== 2026 SALES INVOICES AUDIT (${invoices.length} INVOICES) ===\n`);

  let totalPosGross = 0;
  let totalPlatformGross = 0;

  invoices.forEach(inv => {
    let ocr = null;
    if (inv.ocrData) {
      try { ocr = JSON.parse(inv.ocrData); } catch (e) {}
    }
    const amount = inv.amount || 0;
    if (inv.type === 'pos') totalPosGross += amount;
    if (inv.type === 'platform') totalPlatformGross += amount;

    console.log(`- [${inv.type.toUpperCase()}] ${inv.fileName.padEnd(35)} | Amount: £${amount.toFixed(2).padStart(8)} | OCR Date: ${ocr?.invoiceDate || 'N/A'}`);
  });

  console.log(`\n---------------------------------------------------`);
  console.log(`Total 2026 POS Invoices Gross:      £${totalPosGross.toFixed(2)}`);
  console.log(`Total 2026 Platform Statements:     £${totalPlatformGross.toFixed(2)}`);
  console.log(`Total 2026 Sales Invoices Revenue:  £${(totalPosGross + totalPlatformGross).toFixed(2)}`);
  console.log(`---------------------------------------------------\n`);

  // 2. Fetch 2026 Sale Records
  const sales = await prisma.sale.findMany({
    where: { clientId, is2025: false }
  });

  console.log(`=== 2026 SALE TABLE RECORDS (${sales.length} RECORDS) ===\n`);
  const salesByPlatform = sales.reduce((acc, s) => {
    const p = s.platform || 'Unknown';
    if (!acc[p]) acc[p] = { gross: 0, count: 0 };
    acc[p].gross += s.grossSales;
    acc[p].count += 1;
    return acc;
  }, {});

  Object.entries(salesByPlatform).forEach(([plat, data]) => {
    console.log(`- ${plat.padEnd(20)} | Records: ${String(data.count).padStart(3)} | Total Gross: £${data.gross.toFixed(2).padStart(9)}`);
  });

  const saleTableTotalGross = sales.reduce((sum, s) => sum + s.grossSales, 0);
  console.log(`\nTotal 2026 Sale Table Gross: £${saleTableTotalGross.toFixed(2)}\n`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
