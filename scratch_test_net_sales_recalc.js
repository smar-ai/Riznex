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
      const channels = [
        { name: `${storePrefix} Website`, data: ocr.website },
        { name: `${storePrefix} Mobile App`, data: ocr.consumerApp },
        { name: `${storePrefix} POS`, data: ocr.s4dRegister },
      ];

      const totalGross = channels.reduce((sum, c) => sum + (c.data?.gross || 0), 0);

      channels.forEach(ch => {
        if (!ch.data || !ch.data.gross) return;
        const p = ch.name;
        const ratio = totalGross > 0 ? ch.data.gross / totalGross : 0;
        const chNet = ch.data.net !== undefined ? ch.data.net : ch.data.gross;

        let commission = 0;
        let finalNetPaid = chNet;

        if (isTasty) {
          commission = ch.data.gross * 0.04;
          finalNetPaid = ch.data.gross - commission;
        } else {
          if (p.includes('Website') || p.includes('Mobile App')) {
            commission = chNet * 0.085;
            finalNetPaid = chNet - commission;
          } else {
            commission = 0;
            finalNetPaid = chNet;
          }
        }

        if (!acc[p]) acc[p] = { grossSales: 0, orders: 0, netPaid: 0, commission: 0, vat: 0 };
        acc[p].grossSales += ch.data.gross;
        acc[p].netPaid += finalNetPaid;
        acc[p].commission += commission;
        acc[p].orders += Math.round(s.totalOrders * ratio);
        acc[p].vat += s.vat * ratio;
      });
      return acc;
    }

    let p = s.platform || 'Unknown';
    const isTasty = s.store && s.store.includes('Tasty');
    const storePrefix = isTasty ? 'Tasty Bun' : 'Herbies';
    if (p === 'Website') p = `${storePrefix} Website`;
    else if (p === 'Mobile App') p = `${storePrefix} Mobile App`;
    else if (p === 'POS' || p === 'In-Store POS') p = `${storePrefix} POS`;

    let commission = s.commission;
    let finalNetPaid = s.netPaid || s.grossSales;

    if (isTasty) {
      if (p.includes('Website') || p.includes('Mobile App') || p.includes('POS')) {
        commission = s.grossSales * 0.04;
        finalNetPaid = s.grossSales - commission;
      }
    } else if (p.includes('Herbies')) {
      if (p.includes('Website') || p.includes('Mobile App')) {
        const netBase = s.netPaid || s.grossSales;
        commission = netBase * 0.085;
        finalNetPaid = netBase - commission;
      } else if (p.includes('POS')) {
        commission = 0;
        finalNetPaid = s.netPaid || s.grossSales;
      }
    }

    if (!acc[p]) acc[p] = { grossSales: 0, orders: 0, netPaid: 0, commission: 0, vat: 0 };
    acc[p].grossSales += s.grossSales;
    acc[p].netPaid += finalNetPaid;
    acc[p].commission += commission;
    acc[p].vat += s.vat;
    acc[p].orders += s.totalOrders;
    return acc;
  }, {});

  const totalGross = Object.values(platformBreakdown).reduce((s, p) => s + p.grossSales, 0);
  const totalNet = Object.values(platformBreakdown).reduce((s, p) => s + p.netPaid, 0);
  const totalComm = Object.values(platformBreakdown).reduce((s, p) => s + p.commission, 0);

  const totalExpenses = 58263.74 + 31240.92; // expenses + suppliers
  const netProfit = totalNet - totalExpenses;

  console.log(`\n=== FINAL ACCURATE FINANCIAL KPI METRICS ===\n`);
  console.log(`- Gross Sales:       £${totalGross.toFixed(2)}`);
  console.log(`- Total Commission:  £${totalComm.toFixed(2)}`);
  console.log(`- Net Sales (Rec'd): £${totalNet.toFixed(2)}`);
  console.log(`- Total Expenses:    £${totalExpenses.toFixed(2)}`);
  console.log(`- Net Profit:        £${netProfit.toFixed(2)}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
