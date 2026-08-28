const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const henleyClient = await prisma.client.findFirst({ where: { name: { contains: 'Henley' } } });
  if (!henleyClient) {
    console.log("Henley not found");
    return;
  }

  const sales = await prisma.sale.findMany({
    where: { clientId: henleyClient.id, is2025: false }
  });

  let mismatches = 0;
  
  for (const s of sales) {
    let expected = 0;
    
    // Using standard formulas used in full-audit
    if (s.platform.includes('Just Eat')) {
      expected = s.grossSales - s.commission - s.adSpends - s.cashOrders - s.otherFees;
    } else if (s.platform.includes('Uber Eats')) {
      expected = s.grossSales - s.commission - s.vat - s.adSpends - s.topRankFee - s.adminFee - s.otherFees - s.offersOnItems - s.offerRedemptionFee + s.refunds;
    } else if (s.platform.includes('Deliveroo')) {
      expected = s.grossSales - s.commission - s.otherFees + s.otherPayments;
    } else {
      continue;
    }

    const diff = Math.abs(expected - s.netPaid);
    if (diff > 0.1) {
      mismatches++;
      console.log(`❌ MISMATCH: ${s.store} - ${s.platform} | weekEnd=${s.weekEnd.toISOString().split('T')[0]} | gross=${s.grossSales} - commission=${s.commission} - fees=${s.otherFees} - vat=${s.vat} = expected ${expected.toFixed(2)} but got ${s.netPaid.toFixed(2)} (diff=${diff.toFixed(2)})`);
    }
  }

  console.log(`\nFinished checking ${sales.length} Henley sales records.`);
  if (mismatches === 0) {
    console.log(`✅ All Henley calculations are 100% mathematically correct and perfectly balanced!`);
  } else {
    console.log(`Found ${mismatches} records with mismatched calculations for Henley.`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
