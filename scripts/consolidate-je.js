const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const sales = await prisma.sale.findMany({
    where: { platform: 'Just Eat' }
  });

  console.log(`Found ${sales.length} Just Eat sales.`);
  for (const sale of sales) {
    // The user ONLY wants 3 deductions tracked for Just Eat:
    // 1. adSpends (Top Rank / Ad Spend)
    // 2. commission
    // 3. otherFees (All other deductions)
    // Note: cashOrders is cash in hand, not a deduction, so we exclude it from deductions.
    
    // Total Deductions = Gross - CashOrders - NetPaid
    // We already have commission and adSpends (which we keep).
    // So, otherFees = Total Deductions - commission - adSpends
    
    // We will merge topRankFee into adSpends first, just in case they were split.
    const combinedAdSpend = (sale.adSpends || 0) + (sale.topRankFee || 0);

    let otherFees = parseFloat((sale.grossSales - (sale.cashOrders || 0) - sale.netPaid - (sale.commission || 0) - combinedAdSpend).toFixed(2));
    
    // If it's NaN for some reason, fallback to 0
    if (isNaN(otherFees)) otherFees = 0;

    await prisma.sale.update({
      where: { id: sale.id },
      data: {
        adSpends: combinedAdSpend,
        topRankFee: 0,
        vat: 0,
        adminFee: 0,
        refunds: 0,
        offersOnItems: 0,
        offerRedemptionFee: 0,
        otherFees: otherFees
      }
    });
    console.log(`Updated Just Eat sale ${sale.id} - Gross: ${sale.grossSales}, Net: ${sale.netPaid}, Comm: ${sale.commission}, Ads: ${combinedAdSpend}, Other: ${otherFees}`);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
