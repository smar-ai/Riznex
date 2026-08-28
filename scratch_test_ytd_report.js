const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  const is2025 = false;

  const sales = await prisma.sale.findMany({
    where: { clientId, is2025 },
    include: { invoice: true }
  });

  const acc = {};

  for (const s of sales) {
    let ocr = null;
    if (s.invoice && s.invoice.ocrData) {
      try { ocr = JSON.parse(s.invoice.ocrData); } catch (e) {}
    }

    if (ocr && (ocr.website || ocr.consumerApp || ocr.s4dRegister || ocr.andromedaPOS || ocr.androweb || ocr.app)) {
      const isTasty = s.store && s.store.includes('Tasty');
      const storePrefix = isTasty ? 'Tasty Bun' : 'Herbies';

      const webAppGross = (ocr.website?.gross || 0) + (ocr.consumerApp?.gross || 0) + (ocr.androweb?.sales || 0) + (ocr.app?.sales || 0);
      const webAppNet = (ocr.website?.net !== undefined ? ocr.website.net : (ocr.website?.gross || 0)) + 
                        (ocr.consumerApp?.net !== undefined ? ocr.consumerApp.net : (ocr.consumerApp?.gross || 0)) +
                        (ocr.androweb?.sales || 0) + (ocr.app?.sales || 0);

      const posGross = (ocr.s4dRegister?.gross || 0) + (ocr.andromedaPOS?.sales || 0);
      const posNet = (ocr.s4dRegister?.net !== undefined ? ocr.s4dRegister.net : (ocr.s4dRegister?.gross || 0)) + (ocr.andromedaPOS?.sales || 0);

      const webAppOrders = (ocr.androweb?.orders || 0) + (ocr.app?.orders || 0) + (ocr.website?.orders || 0) + (ocr.consumerApp?.orders || 0);
      const posOrders = (ocr.andromedaPOS?.orders || 0) + (ocr.s4dRegister?.orders || 0);
      const hasSpecificOrders = (webAppOrders + posOrders) > 0;

      const channels = [
        { name: `${storePrefix} Web & App`, gross: webAppGross, net: webAppNet, exactOrders: webAppOrders },
        { name: `${storePrefix} POS`, gross: posGross, net: posNet, exactOrders: posOrders },
      ];

      const totalGross = channels.reduce((sum, c) => sum + c.gross, 0);

      channels.forEach(ch => {
        if (!ch.gross && !ch.net) return;
        const p = ch.name;
        const ratio = totalGross > 0 ? ch.gross / totalGross : 0;

        let baseSales = ch.net;
        let commission = isTasty ? baseSales * 0.04 : (p.includes('Web & App') ? baseSales * 0.085 : 0);
        let finalNetPaid = baseSales - commission;

        if (!acc[p]) acc[p] = { grossSales: 0, orders: 0, netPaid: 0, commission: 0 };
        acc[p].grossSales += baseSales;
        acc[p].netPaid += finalNetPaid;
        acc[p].commission += commission;
        acc[p].orders += hasSpecificOrders ? ch.exactOrders : Math.round(s.totalOrders * ratio);
      });
      continue;
    }

    let p = s.platform || 'Unknown';
    if (!acc[p]) acc[p] = { grossSales: 0, orders: 0, netPaid: 0, commission: 0 };
    acc[p].grossSales += s.grossSales;
    acc[p].netPaid += s.netPaid || s.grossSales;
    acc[p].commission += s.commission;
    acc[p].orders += s.totalOrders;
  }

  console.log(`\n=== FINAL RECONCILED PLATFORM ORDERS & SALES AUDIT ===\n`);
  let grandTotalOrders = 0;
  let grandTotalSales = 0;

  Object.entries(acc).forEach(([plat, data]) => {
    console.log(`- ${plat.padEnd(22)} | Orders: ${String(data.orders).padStart(5)} | Sales: £${data.grossSales.toFixed(2).padStart(9)} | Comm: £${data.commission.toFixed(2).padStart(8)} | Net Rec: £${data.netPaid.toFixed(2).padStart(9)}`);
    grandTotalOrders += data.orders;
    grandTotalSales += data.grossSales;
  });

  console.log(`----------------------------------------------------------------------------------------`);
  console.log(`TOTAL ALL PLATFORMS       | Orders: ${String(grandTotalOrders).padStart(5)} | Sales: £${grandTotalSales.toFixed(2).padStart(9)}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
