const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  const is2025 = false;

  const posInvoices = await prisma.invoice.findMany({
    where: { clientId, is2025, type: 'pos' },
    orderBy: { createdAt: 'desc' }
  });

  const platformBreakdown = {};

  posInvoices.forEach(inv => {
    let ocr = null;
    if (inv.ocrData) {
      try { ocr = JSON.parse(inv.ocrData); } catch (e) {}
    }

    const isTasty = inv.platform && inv.platform.includes('Tasty');
    const storePrefix = isTasty ? 'Tasty Bun' : 'Herbies';

    if (isTasty) {
      const p = 'Tasty Bun POS';
      const gross = inv.amount || 0;
      const comm = gross * 0.04;
      const net = gross - comm;
      if (!platformBreakdown[p]) platformBreakdown[p] = { grossSales: 0, commission: 0, netPaid: 0 };
      platformBreakdown[p].grossSales += gross;
      platformBreakdown[p].commission += comm;
      platformBreakdown[p].netPaid += net;
    } else if (ocr && (ocr.s4dRegister || ocr.website || ocr.consumerApp)) {
      const posGross = ocr.s4dRegister?.gross || 0;
      const posNet = ocr.s4dRegister?.net !== undefined ? ocr.s4dRegister.net : posGross;

      const webGross = (ocr.website?.gross || 0) + (ocr.consumerApp?.gross || 0);
      const webNet = (ocr.website?.net !== undefined ? ocr.website.net : (ocr.website?.gross || 0)) +
                     (ocr.consumerApp?.net !== undefined ? ocr.consumerApp.net : (ocr.consumerApp?.gross || 0));

      const posP = 'Herbies POS';
      const webP = 'Herbies Web & App';

      // Herbies POS has 0% commission
      if (!platformBreakdown[posP]) platformBreakdown[posP] = { grossSales: 0, commission: 0, netPaid: 0 };
      platformBreakdown[posP].grossSales += posGross;
      platformBreakdown[posP].commission += 0;
      platformBreakdown[posP].netPaid += posNet;

      // Herbies Web & App has 8.5% commission on Net Sales
      const webComm = webNet * 0.085;
      const webFinalNet = webNet - webComm;

      if (!platformBreakdown[webP]) platformBreakdown[webP] = { grossSales: 0, commission: 0, netPaid: 0 };
      platformBreakdown[webP].grossSales += webGross;
      platformBreakdown[webP].commission += webComm;
      platformBreakdown[webP].netPaid += webFinalNet;
    }
  });

  console.log(`\n=== ACCURATE NON-DUPLICATED S4D BREAKDOWN ===\n`);
  Object.entries(platformBreakdown).forEach(([plat, data]) => {
    console.log(`- ${plat.padEnd(20)} | Gross: £${data.grossSales.toFixed(2).padStart(9)} | Comm: £${data.commission.toFixed(2).padStart(7)} | Net Rec: £${data.netPaid.toFixed(2).padStart(9)}`);
  });

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
