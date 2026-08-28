const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getWeekStart(d) {
  const dt = new Date(d);
  const day = dt.getUTCDay();
  const diff = dt.getUTCDate() - day + (day === 0 ? -6 : 1);
  const ws = new Date(dt.setDate(diff));
  ws.setUTCHours(0,0,0,0);
  return ws;
}

function getWeekEnd(ws) {
  const we = new Date(ws);
  we.setUTCDate(we.getUTCDate() + 6);
  we.setUTCHours(23,59,59,999);
  return we;
}

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  const is2025 = false;

  const pdfData = [
    {
      fileName: 'Herbies POS 04 April 05.pdf',
      dateTill: '2026-04-05',
      s4dRegister: { gross: 1661.35, net: 1384.46 },
      consumerApp: { gross: 354.39, net: 295.32 },
      website: { gross: 704.96, net: 587.46 },
      totalNet: 2267.24,
      totalGross: 2720.70,
      totalOrders: 174
    },
    {
      fileName: 'Herbies POS 04 April 12.pdf',
      dateTill: '2026-04-12',
      s4dRegister: { gross: 1168.84, net: 974.04 },
      consumerApp: { gross: 460.14, net: 383.45 },
      website: { gross: 971.49, net: 810.49 },
      totalNet: 2167.98,
      totalGross: 2600.47,
      totalOrders: 165
    },
    {
      fileName: 'Herbies POS 04 April 19.pdf',
      dateTill: '2026-04-19',
      s4dRegister: { gross: 1404.74, net: 1170.62 },
      consumerApp: { gross: 383.33, net: 317.09 },
      website: { gross: 1035.00, net: 862.50 },
      totalNet: 2350.21,
      totalGross: 2823.07,
      totalOrders: 170
    },
    {
      fileName: 'Herbies POS 04 April 26.pdf',
      dateTill: '2026-04-26',
      s4dRegister: { gross: 1808.64, net: 1507.21 },
      consumerApp: { gross: 347.45, net: 289.54 },
      website: { gross: 1055.37, net: 879.47 },
      totalNet: 2676.22,
      totalGross: 3211.46,
      totalOrders: 195
    }
  ];

  console.log(`\n=== UPDATING HERBIES POS INVOICES AND SALES TO EXACT NET SALES (EX-VAT) ===\n`);

  for (const item of pdfData) {
    const inv = await prisma.invoice.findFirst({
      where: { clientId, is2025, fileName: item.fileName }
    });

    if (!inv) {
      console.log(`Invoice ${item.fileName} not found in DB!`);
      continue;
    }

    const ocrObj = {
      dateTill: item.dateTill,
      s4dRegister: item.s4dRegister,
      consumerApp: item.consumerApp,
      website: item.website,
      salesGross: item.totalGross,
      salesNet: item.totalNet,
      ordersTotal: item.totalOrders
    };

    // Update invoice amount to TOTAL NET (Ex-VAT)
    await prisma.invoice.update({
      where: { id: inv.id },
      data: {
        amount: item.totalNet,
        invoiceDate: new Date(item.dateTill),
        ocrStatus: 'done',
        ocrData: JSON.stringify(ocrObj)
      }
    });

    // Delete existing sales record for this invoice
    await prisma.sale.deleteMany({
      where: { invoiceId: inv.id }
    });

    const webAppNet = item.consumerApp.net + item.website.net;
    const comm = webAppNet * 0.085; // 8.5% Commission on Web & App Net Sales
    const netPaid = item.totalNet - comm;
    const ws = getWeekStart(item.dateTill);
    const we = getWeekEnd(ws);

    await prisma.sale.create({
      data: {
        clientId,
        is2025,
        store: 'Herbies Pizza',
        platform: 'Herbies POS',
        grossSales: item.totalNet, // Base Sales = Net Ex-VAT!
        commission: comm,
        netPaid: netPaid,
        totalOrders: item.totalOrders,
        vat: item.totalNet * 0.20,
        weekStart: ws,
        weekEnd: we,
        invoiceId: inv.id
      }
    });

    console.log(`- Updated ${item.fileName} -> Invoice Amount (Net Ex-VAT): £${item.totalNet.toFixed(2)} (Was Gross £${item.totalGross.toFixed(2)})`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
