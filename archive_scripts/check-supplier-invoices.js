const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const suppliers = await prisma.supplier.findMany({
    include: {
      invoices: {
        select: { id: true, amount: true, invoiceDate: true, platform: true }
      }
    }
  });

  const summary = suppliers.map(s => ({
    id: s.id,
    name: s.name,
    franchise: s.franchise,
    invoiceCount: s.invoices.length,
    totalAmount: s.invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
    invoicePlatforms: Array.from(new Set(s.invoices.map(inv => inv.platform || 'N/A'))).join(', ')
  })).filter(s => s.invoiceCount > 0);

  console.table(summary);
}

main().catch(console.error).finally(() => prisma.$disconnect());
