const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const invoiceId = 'cmrl7i2910031vdk08mugv942'; // Tasty bun POS June 07.JPG
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';

  console.log("=== UPDATING TASTY BUN POS INVOICE & SALES ===");

  // 1. Find invoice
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { sales: true }
  });

  if (!invoice) {
    console.log("Invoice not found!");
    return;
  }

  // 2. Delete existing sales linked to this invoice
  if (invoice.sales.length > 0) {
    const deleted = await prisma.sale.deleteMany({
      where: { invoiceId: invoice.id }
    });
    console.log(`Deleted ${deleted.count} incorrect linked sales records.`);
  }

  // 3. Update invoice details
  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      type: 'pos',
      platform: 'Tasty Bun POS',
      amount: 969.42, // Sum of POS + Website + App
      invoiceDate: new Date('2026-06-07T00:00:00.000Z'),
      ocrStatus: 'completed'
    }
  });
  console.log(`Updated invoice type to 'pos' and amount to £969.42.`);

  // 4. Create the three correct sales records
  const salesToCreate = [
    {
      clientId,
      platform: 'Tasty Bun POS',
      store: 'Tasty Bun',
      weekStart: new Date('2026-06-01T00:00:00.000Z'),
      weekEnd: new Date('2026-06-07T23:59:59.000Z'),
      totalOrders: 17,
      grossSales: 266.83,
      commission: 10.67, // 4% of 266.83
      vat: 0,
      netPaid: 256.16,
      invoiceId: invoice.id,
      is2025: false,
      notes: `Auto-created from Tasty Bun POS report: ${invoice.fileName}`
    },
    {
      clientId,
      platform: 'Tasty Bun Website',
      store: 'Tasty Bun',
      weekStart: new Date('2026-06-01T00:00:00.000Z'),
      weekEnd: new Date('2026-06-07T23:59:59.000Z'),
      totalOrders: 17,
      grossSales: 387.91,
      commission: 15.52, // 4% of 387.91
      vat: 0,
      netPaid: 372.39,
      invoiceId: invoice.id,
      is2025: false,
      notes: `Auto-created from Tasty Bun POS report: ${invoice.fileName}`
    },
    {
      clientId,
      platform: 'Tasty Bun App',
      store: 'Tasty Bun',
      weekStart: new Date('2026-06-01T00:00:00.000Z'),
      weekEnd: new Date('2026-06-07T23:59:59.000Z'),
      totalOrders: 12,
      grossSales: 314.68,
      commission: 12.59, // 4% of 314.68
      vat: 0,
      netPaid: 302.09,
      invoiceId: invoice.id,
      is2025: false,
      notes: `Auto-created from Tasty Bun POS report: ${invoice.fileName}`
    }
  ];

  for (const s of salesToCreate) {
    const created = await prisma.sale.create({ data: s });
    console.log(`Created sales record for ${s.platform} | Gross: £${s.grossSales}`);
  }

  console.log("\nUpdate complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
