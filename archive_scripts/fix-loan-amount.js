const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const supplier = await prisma.supplier.findFirst({ where: { name: 'Shahzad Loan' } })
  if (!supplier) throw new Error("Could not find Shahzad Loan supplier")

  // Find the 26 remaining payments from July-Dec 2025
  const remaining = await prisma.invoice.findMany({
    where: {
      is2025: true,
      supplierId: supplier.id
    },
    orderBy: { invoiceDate: 'asc' }
  });

  if (remaining.length === 0) {
    console.log("No loan payments found.");
    return;
  }

  console.log(`Found ${remaining.length} loan payments remaining in 2025. Adjusting them to £2200/month...`);

  const targetTotal = 2200 * 6; // £13,200
  const baseWeekly = Math.round((13200 / remaining.length) * 100) / 100; // 507.69

  let accumulated = 0;
  
  for (let i = 0; i < remaining.length; i++) {
    const inv = remaining[i];
    let amountToCharge = baseWeekly;

    if (i === remaining.length - 1) {
      amountToCharge = targetTotal - accumulated;
      amountToCharge = Math.round(amountToCharge * 100) / 100;
    }

    await prisma.invoice.update({
      where: { id: inv.id },
      data: { amount: amountToCharge }
    });

    accumulated += amountToCharge;
  }

  console.log(`Successfully updated ${remaining.length} weeks of Shahzad Loan.`);
  console.log(`New Total for July-Dec: £${accumulated.toFixed(2)}`);
  console.log(`(This equates to exactly £2,200 per month).`);
}

main().catch(console.error).finally(() => prisma.$disconnect())
