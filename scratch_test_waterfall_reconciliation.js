const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  const is2025 = false;

  const salesRaw = await prisma.sale.findMany({
    where: { clientId, is2025 },
    include: { invoice: true },
    orderBy: { weekStart: 'asc' },
  });

  const getOtherFees = (r) => (r.otherFees || 0) + (r.adminFee || 0) + (r.offersOnItems || 0) + (r.offerRedemptionFee || 0);
  const getAdSpends = (r) => (r.adSpends || 0) + (r.topRankFee || 0);

  const platformBreakdown = salesRaw.reduce((acc, s) => {
    let ocr = null;
    if (s.invoice?.ocrData) {
      try { ocr = JSON.parse(s.invoice.ocrData); } catch (e) {}
    }

    if (ocr && (ocr.website || ocr.consumerApp || ocr.s4dRegister)) {
      const isTasty = s.store && s.store.includes('Tasty');
      const storePrefix = isTasty ? 'Tasty Bun' : 'Herbies';

      const webAppGross = (ocr.website?.gross || 0) + (ocr.consumerApp?.gross || 0);
      const webAppNet = (ocr.website?.net !== undefined ? ocr.website.net : (ocr.website?.gross || 0)) + 
                        (ocr.consumerApp?.net !== undefined ? ocr.consumerApp.net : (ocr.consumerApp?.gross || 0));

      const channels = [
        { name: `${storePrefix} Web & App`, gross: webAppGross, net: webAppNet },
        { name: `${storePrefix} POS`, gross: ocr.s4dRegister?.gross || 0, net: ocr.s4dRegister?.net !== undefined ? ocr.s4dRegister.net : (ocr.s4dRegister?.gross || 0) },
      ];

      const totalGross = channels.reduce((sum, c) => sum + c.gross, 0);

      channels.forEach(ch => {
        if (!ch.gross) return;
        const p = ch.name;
        const ratio = totalGross > 0 ? ch.gross / totalGross : 0;
        const chNet = ch.net;
        const chVat = ch.gross - chNet;

        let commission = 0;
        if (isTasty) {
          commission = chNet * 0.04;
        } else {
          if (p.includes('Web & App')) {
            commission = chNet * 0.085;
          } else {
            commission = 0;
          }
        }

        const otherDeds = (getOtherFees(s) + getAdSpends(s)) * ratio;
        const netReceived = chNet - commission - otherDeds;

        if (!acc[p]) acc[p] = { grossSales: 0, orders: 0, vat: 0, netSales: 0, commission: 0, otherDeductions: 0, netReceived: 0 };
        acc[p].grossSales += ch.gross;
        acc[p].vat += chVat;
        acc[p].netSales += chNet;
        acc[p].commission += commission;
        acc[p].otherDeductions += otherDeds;
        acc[p].netReceived += netReceived;
        acc[p].orders += Math.round(s.totalOrders * ratio);
      });
      return acc;
    }

    let p = s.platform || 'Unknown';
    const isTasty = s.store && s.store.includes('Tasty');
    const storePrefix = isTasty ? 'Tasty Bun' : 'Herbies';
    if (p === 'Website' || p === 'Mobile App' || p === 'Web & App') p = `${storePrefix} Web & App`;
    else if (p === 'POS' || p === 'In-Store POS') p = `${storePrefix} POS`;

    const gross = s.grossSales;
    const vat = s.vat || (gross - (s.netPaid || gross));
    const netSales = gross - vat;

    let commission = s.commission;
    if (isTasty) {
      if (p.includes('Web & App') || p.includes('POS')) {
        commission = netSales * 0.04;
      }
    } else if (p.includes('Herbies')) {
      if (p.includes('Web & App')) {
        commission = netSales * 0.085;
      } else if (p.includes('POS')) {
        commission = 0;
      }
    }

    const otherDeds = getOtherFees(s) + getAdSpends(s);
    const netReceived = s.netPaid !== undefined && s.netPaid > 0 ? (s.netPaid - commission - otherDeds) : (netSales - commission - otherDeds);

    if (!acc[p]) acc[p] = { grossSales: 0, orders: 0, vat: 0, netSales: 0, commission: 0, otherDeductions: 0, netReceived: 0 };
    acc[p].grossSales += gross;
    acc[p].vat += vat;
    acc[p].netSales += netSales;
    acc[p].commission += commission;
    acc[p].otherDeductions += otherDeds;
    acc[p].netReceived += netReceived;
    acc[p].orders += s.totalOrders;
    return acc;
  }, {});

  const totalGross = Object.values(platformBreakdown).reduce((s, p) => s + p.grossSales, 0);
  const totalVat = Object.values(platformBreakdown).reduce((s, p) => s + p.vat, 0);
  const totalNetSales = Object.values(platformBreakdown).reduce((s, p) => s + p.netSales, 0);
  const totalComm = Object.values(platformBreakdown).reduce((s, p) => s + p.commission, 0);
  const totalOtherDeds = Object.values(platformBreakdown).reduce((s, p) => s + p.otherDeductions, 0);
  const totalNetReceived = Object.values(platformBreakdown).reduce((s, p) => s + p.netReceived, 0);

  const totalExpenses = 58263.74 + 31240.92; // Business expenses + Supplier purchases
  const netProfit = totalNetReceived - totalExpenses;

  console.log('\n=== PERFECT WATERFALL FINANCIAL RECONCILIATION ===\n');
  console.log(`1. GROSS SALES:         £${totalGross.toFixed(2).padStart(10)}`);
  console.log(`2. LESS VAT (20%):      £${totalVat.toFixed(2).padStart(10)}`);
  console.log(`3. NET SALES (Ex-VAT):  £${totalNetSales.toFixed(2).padStart(10)}  (Gross - VAT = ${ (totalGross - totalVat).toFixed(2) })`);
  console.log(`4. LESS COMMISSIONS:    £${totalComm.toFixed(2).padStart(10)}`);
  console.log(`5. LESS OTHER FEES/ADS: £${totalOtherDeds.toFixed(2).padStart(10)}`);
  console.log(`6. ACTUAL NET RECEIVED: £${totalNetReceived.toFixed(2).padStart(10)}  (Net Sales - Comm - Other Fees = ${ (totalNetSales - totalComm - totalOtherDeds).toFixed(2) })`);
  console.log(`7. BUSINESS EXPENSES:   £${totalExpenses.toFixed(2).padStart(10)}`);
  console.log(`--------------------------------------------------`);
  console.log(`8. NET PROFIT:          £${netProfit.toFixed(2).padStart(10)}  (Net Received - Expenses = ${ (totalNetReceived - totalExpenses).toFixed(2) })\n`);

  console.log('=== PLATFORM TABLE RECONCILIATION ===\n');
  Object.entries(platformBreakdown).forEach(([plat, data]) => {
    console.log(`- ${plat.padEnd(20)} | Gross: £${data.grossSales.toFixed(2).padStart(9)} | VAT: £${data.vat.toFixed(2).padStart(8)} | Net Sales: £${data.netSales.toFixed(2).padStart(9)} | Comm: £${data.commission.toFixed(2).padStart(7)} | Net Rec: £${data.netReceived.toFixed(2).padStart(9)}`);
  });

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
