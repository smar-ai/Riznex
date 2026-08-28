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
  const invoices = await prisma.invoice.findMany({
    where: { 
      clientId: 'cmpv4dvik0000vdj089wl6zmf',
      fileName: { contains: 'Herbies' }
    }
  });

  const targetInvoices = invoices.filter(i => i.fileName.includes('POS'));

  console.log(`Found ${targetInvoices.length} Herbies POS invoices.`);

  for (const inv of targetInvoices) {
    if (!inv.ocrData) continue;
    
    let data;
    try {
      data = JSON.parse(inv.ocrData);
    } catch(e) { continue; }

    const s4dNet = data.s4dRegister?.net || 0;
    const appNet = data.consumerApp?.net || 0;
    const webNet = data.website?.net || 0;
    
    if (s4dNet === 0 && appNet === 0 && webNet === 0) {
      console.log(`Skipping ${inv.fileName} - no breakdown found`);
      continue;
    }

    const posNet = s4dNet;
    const webAppNet = appNet + webNet;
    const totalNet = posNet + webAppNet;

    // Fix Invoice Amount
    await prisma.invoice.update({
      where: { id: inv.id },
      data: { amount: totalNet }
    });

    // Delete existing sales
    await prisma.sale.deleteMany({
      where: { invoiceId: inv.id }
    });

    const comm = webAppNet * 0.085;
    const dateStr = data.dateTill || data.invoiceDate || data.weekEnd;
    const ws = getWeekStart(dateStr || inv.invoiceDate);
    const we = getWeekEnd(ws);

    let ordersTotal = data.ordersTotal || data.totalOrders || 0;
    if (ordersTotal === 0 && data.ordersDelivery && data.ordersInStore) {
        ordersTotal = data.ordersDelivery + data.ordersInStore;
    }
    // if still zero or too small
    if (ordersTotal < 10) {
      if (inv.fileName.includes('05 May 31')) ordersTotal = 184;
      if (inv.fileName.includes('05 May 24')) ordersTotal = 176;
      if (inv.fileName.includes('05 May 17')) ordersTotal = 188;
      if (inv.fileName.includes('05 May 10')) ordersTotal = 153;
      if (inv.fileName.includes('05 May 03')) ordersTotal = 170;
    }

    const posOrders = Math.round(ordersTotal * (posNet / totalNet)) || 0;
    const webOrders = ordersTotal - posOrders;

    // POS record
    await prisma.sale.create({
      data: {
        clientId: inv.clientId,
        is2025: inv.is2025,
        store: 'Herbies Pizza',
        platform: 'Herbies POS',
        grossSales: posNet,
        commission: 0,
        netPaid: posNet,
        totalOrders: posOrders,
        vat: posNet * 0.20,
        weekStart: ws,
        weekEnd: we,
        invoiceId: inv.id
      }
    });

    // Web & App record
    await prisma.sale.create({
      data: {
        clientId: inv.clientId,
        is2025: inv.is2025,
        store: 'Herbies Pizza',
        platform: 'Herbies Web & App',
        grossSales: webAppNet,
        commission: comm,
        netPaid: webAppNet - comm,
        totalOrders: webOrders,
        vat: webAppNet * 0.20,
        weekStart: ws,
        weekEnd: we,
        invoiceId: inv.id
      }
    });

    console.log(`Fixed ${inv.fileName}: TotalNet=£${totalNet.toFixed(2)}, POS=£${posNet.toFixed(2)}, WebApp=£${webAppNet.toFixed(2)}`);
  }
}

main().then(() => console.log('Done')).catch(console.error);
