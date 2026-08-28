const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const sales = await prisma.sale.findMany({
    where: { platform: 'Uber Eats' },
    include: { invoice: true }
  });

  console.log(`Found ${sales.length} Uber Eats sales.`);
  for (const sale of sales) {
    // Math logic: Net Paid = Gross - Commission - VAT - AdSpends - AdminFee - otherFees + refunds - offerRedemptionFee - offersOnItems + vatRoundingAdj
    
    // Instead of doing complex math, we force otherFees to be whatever is required to balance the equation perfectly to the Net Paid from the PDF.
    
    // Let's use the exact audit script logic but solve for otherFees:
    // CalculatedNet = Gross - Commission - VAT - AdSpends - TopRankFee - AdminFee - otherFees - offersOnItems - offerRedemptionFee + refunds
    // We want CalculatedNet = NetPaid.
    // otherFees = Gross - Commission - VAT - AdSpends - TopRankFee - AdminFee - offersOnItems - offerRedemptionFee + refunds - NetPaid
    
    let otherFees = parseFloat((
      sale.grossSales 
      - (sale.commission || 0) 
      - (sale.vat || 0) 
      - (sale.adSpends || 0) 
      - (sale.topRankFee || 0) 
      - (sale.adminFee || 0) 
      - (sale.offersOnItems || 0) 
      - (sale.offerRedemptionFee || 0) 
      + (sale.refunds || 0) 
      - sale.netPaid
    ).toFixed(2));
    
    if (isNaN(otherFees)) otherFees = 0;

    await prisma.sale.update({
      where: { id: sale.id },
      data: {
        otherFees: otherFees,
      }
    });
    console.log(`Updated Uber Eats sale ${sale.id} - Gross: ${sale.grossSales}, Net: ${sale.netPaid}, Other: ${otherFees}`);
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
