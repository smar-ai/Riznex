const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const sales = await prisma.sale.findMany({
    where: { platform: 'Just Eat' },
    include: { invoice: true }
  });

  console.log(`Found ${sales.length} Just Eat sales.`);
  for (const sale of sales) {
    // For Just Eat, the user also wants to perfectly balance the math.
    // Net Paid = Gross - Commission - VAT - AdSpends - AdminFee - otherFees + refunds
    // otherFees = Gross - Commission - VAT - AdSpends - AdminFee + refunds - Net Paid
    
    let otherFees = parseFloat((sale.grossSales - (sale.commission || 0) - (sale.vat || 0) - (sale.adSpends || 0) - (sale.adminFee || 0) - (sale.cashOrders || 0) + (sale.refunds || 0) - sale.netPaid).toFixed(2));
    if (isNaN(otherFees)) otherFees = 0;

    await prisma.sale.update({
      where: { id: sale.id },
      data: {
        otherFees: otherFees,
        topRankFee: 0,
        offersOnItems: 0,
        offerRedemptionFee: 0
      }
    });
    console.log(`Updated Just Eat sale ${sale.id} - Gross: ${sale.grossSales}, Net: ${sale.netPaid}, Other: ${otherFees}`);
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
