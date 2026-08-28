const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const cutoffDate = new Date('2026-01-01T00:00:00.000Z')

  const supplier = await prisma.supplier.findFirst({ where: { name: 'Shahzad Loan' } })
  if (!supplier) throw new Error("Could not find Shahzad Loan supplier")

  // Delete all 2026 loan payments
  const deleted = await prisma.invoice.deleteMany({
    where: {
      is2025: true,
      supplierId: supplier.id,
      invoiceDate: { gte: cutoffDate }
    }
  });

  console.log(`Deleted ${deleted.count} loan payments from Jan-Mar 2026.`);

  // Find remaining payments
  const remaining = await prisma.invoice.findMany({
    where: {
      is2025: true,
      supplierId: supplier.id
    },
    orderBy: { invoiceDate: 'asc' }
  });

  console.log(`There are ${remaining.length} loan payments remaining in 2025.`);

  // Sum them up
  let total = 0;
  for (const r of remaining) total += r.amount;

  console.log(`Current Total for July-Dec: £${total.toFixed(2)}`);

  // Target should be 2300 * 6 = £13800
  const target = 2300 * 6;
  const difference = target - total;

  if (difference !== 0 && remaining.length > 0) {
    const lastInvoice = remaining[remaining.length - 1];
    const newAmount = lastInvoice.amount + difference;
    
    await prisma.invoice.update({
      where: { id: lastInvoice.id },
      data: { amount: newAmount }
    });
    
    console.log(`Adjusted the final December payment by £${difference.toFixed(2)} to make the total exactly £${target.toFixed(2)}.`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
