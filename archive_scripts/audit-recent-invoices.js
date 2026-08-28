const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("Recent Invoices:");
  console.table(invoices.map(i => ({ id: i.id, fileName: i.fileName, type: i.type, platform: i.platform, amount: i.amount, createdAt: i.createdAt })));
  
  // also check recent sales
  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log("Recent Sales:");
  console.table(sales.map(s => ({ platform: s.platform, gross: s.grossSales, net: s.netPaid, createdAt: s.createdAt })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
