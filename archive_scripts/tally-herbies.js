const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const invoices = await prisma.invoice.findMany({
    where: {
      is2025: true,
      type: 'supplier',
      supplier: {
        name: 'Herbies Head office'
      }
    },
    orderBy: { invoiceDate: 'asc' }
  });

  const monthly = {};

  for (const inv of invoices) {
    const d = new Date(inv.invoiceDate);
    // Format: YYYY-MM
    const month = d.toISOString().substring(0, 7);
    monthly[month] = (monthly[month] || 0) + inv.amount;
  }

  console.log("--- Herbies Head Office Spending by Month ---");
  let total = 0;
  for (const [m, amt] of Object.entries(monthly)) {
    console.log(`${m}: £${amt.toFixed(2)}`);
    total += amt;
  }
  console.log(`\nTOTAL: £${total.toFixed(2)}`);
}

main().catch(console.error).finally(() => prisma.$disconnect())
