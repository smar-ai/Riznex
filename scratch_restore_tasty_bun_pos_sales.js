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

  console.log('\n=== RECREATING TASTY BUN POS SALES RECORDS FROM EXISTING INVOICES ===\n');

  const tastyPosInvoices = await prisma.invoice.findMany({
    where: { clientId, is2025, type: 'pos', fileName: { contains: 'Tasty' } },
    orderBy: { invoiceDate: 'asc' }
  });

  console.log(`Found ${tastyPosInvoices.length} Tasty Bun POS Invoices.`);

  let createdCount = 0;

  for (const inv of tastyPosInvoices) {
    const invDate = inv.invoiceDate || new Date();
    const ws = getWeekStart(invDate);
    const we = getWeekEnd(ws);
    const gross = inv.amount || 0;
    const comm = gross * 0.04;
    const net = gross - comm;

    // Check if sale record already exists for this week and platform
    const existing = await prisma.sale.findFirst({
      where: {
        clientId,
        is2025,
        store: 'Tasty Bun',
        platform: 'Tasty Bun POS',
        weekStart: ws
      }
    });

    if (!existing && gross > 0) {
      await prisma.sale.create({
        data: {
          clientId,
          is2025,
          store: 'Tasty Bun',
          platform: 'Tasty Bun POS',
          grossSales: gross,
          commission: comm,
          netPaid: net,
          totalOrders: Math.round(gross / 14.5), // estimated order count
          vat: gross / 6,
          weekStart: ws,
          weekEnd: we,
          invoiceId: inv.id
        }
      });
      createdCount++;
    }
  }

  console.log(`- Restored ${createdCount} Tasty Bun POS Sales Records.`);

  // Audit total Tasty Bun Sales Records now
  const tastySalesAfter = await prisma.sale.count({
    where: { clientId, is2025, OR: [{ store: { contains: 'Tasty' } }, { platform: { contains: 'Tasty' } }] }
  });

  console.log(`- Total Tasty Bun Sales Records in Database: ${tastySalesAfter}\n`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
