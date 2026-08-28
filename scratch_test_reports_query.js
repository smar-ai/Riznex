const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  const is2025 = false;
  const dateFrom = new Date('2026-08-01T00:00:00.000Z');
  const dateTo = new Date('2026-08-31T23:59:59.999Z');

  const salesRaw = await prisma.sale.findMany({
    where: { clientId, is2025, weekEnd: { gte: dateFrom, lte: dateTo } },
    include: { invoice: true },
    orderBy: { weekStart: 'asc' },
  });

  const getSplit = (text) => {
    const t = (text || '').toLowerCase();
    if (t.includes('herbies')) return 1;
    if (t.includes('tasty')) return 0;
    return 0.5;
  };

  const sales = salesRaw.map(s => {
    const split = getSplit(`${s.store} ${s.platform}`);
    return {
      ...s,
      grossSales: s.grossSales * split,
      netPaid: s.netPaid * split,
      commission: s.commission * split,
      vat: s.vat * split,
      totalOrders: Math.round(s.totalOrders * split),
    };
  }).filter(s => s.grossSales > 0 || s.totalOrders > 0);

  const platformBreakdown = sales.reduce((acc, s) => {
    let ocr = null;
    if (s.invoice?.ocrData) {
      try { ocr = JSON.parse(s.invoice.ocrData); } catch (e) {}
    }

    if (ocr && (ocr.website || ocr.consumerApp || ocr.s4dRegister)) {
      const storePrefix = (s.store && s.store.includes('Tasty')) ? 'Tasty Bun' : 'Herbies';
      const channels = [
        { name: `${storePrefix} Website`, data: ocr.website },
        { name: `${storePrefix} Mobile App`, data: ocr.consumerApp },
        { name: 'In-Store POS', data: ocr.s4dRegister },
      ];

      const totalGross = channels.reduce((sum, c) => sum + (c.data?.gross || 0), 0);

      channels.forEach(ch => {
        if (!ch.data || !ch.data.gross) return;
        const p = ch.name;
        const ratio = totalGross > 0 ? ch.data.gross / totalGross : 0;
        const chNet = ch.data.net !== undefined ? ch.data.net : ch.data.gross;

        // 8.5% commission on net sales for Website and Mobile App, 0% for In-Store POS
        const isOnlineChannel = p.includes('Website') || p.includes('Mobile App');
        const commission = isOnlineChannel ? (chNet * 0.085) : 0;
        const finalNetPaid = chNet - commission;

        if (!acc[p]) acc[p] = { grossSales: 0, orders: 0, netPaid: 0, commission: 0, vat: 0 };
        acc[p].grossSales += ch.data.gross;
        acc[p].netPaid += finalNetPaid;
        acc[p].commission += commission;
        acc[p].orders += Math.round(s.totalOrders * ratio);
        acc[p].vat += s.vat * ratio;
      });
      return acc;
    }

    const p = s.platform || 'Unknown';
    if (!acc[p]) acc[p] = { grossSales: 0, orders: 0, netPaid: 0, commission: 0, vat: 0 };
    acc[p].grossSales += s.grossSales;
    acc[p].orders += s.totalOrders;
    acc[p].netPaid += s.netPaid;
    acc[p].commission += s.commission;
    acc[p].vat += s.vat;
    return acc;
  }, {});

  console.log('\n=== PLATFORM BREAKDOWN WITH 8.5% COMMISSION ON WEBSITE & MOBILE APP ===\n');
  Object.entries(platformBreakdown).forEach(([plat, data]) => {
    const dedPct = data.grossSales > 0 ? ((data.commission / data.grossSales) * 100).toFixed(1) + '%' : '0.0%';
    console.log(`- ${plat.padEnd(20)} | Gross: £${data.grossSales.toFixed(2).padStart(8)} | Commission (8.5% Net): £${data.commission.toFixed(2).padStart(7)} (${dedPct}) | Net Rec: £${data.netPaid.toFixed(2).padStart(8)}`);
  });

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
