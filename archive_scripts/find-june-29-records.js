const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';

  console.log("=== CHECKING FOR 29 JUN 2026 RECORDS ===");

  const sales = await prisma.sale.findMany({
    where: {
      clientId,
      OR: [
        { weekEnd: new Date('2026-06-29T00:00:00.000Z') },
        { weekEnd: new Date('2026-06-29T23:59:59.000Z') },
        { weekEnd: { gte: new Date('2026-06-29T00:00:00Z'), lte: new Date('2026-06-29T23:59:59Z') } }
      ]
    }
  });

  const invoices = await prisma.invoice.findMany({
    where: {
      clientId,
      invoiceDate: { gte: new Date('2026-06-29T00:00:00Z'), lte: new Date('2026-06-29T23:59:59Z') }
    }
  });

  console.log(`Sales count: ${sales.length}`);
  sales.forEach(s => {
    console.log(`- Sale: ${s.platform} | weekStart: ${s.weekStart.toISOString()} | weekEnd: ${s.weekEnd.toISOString()}`);
  });

  console.log(`Invoices count: ${invoices.length}`);
  invoices.forEach(i => {
    console.log(`- Invoice: ${i.fileName} | Date: ${i.invoiceDate.toISOString()}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
