const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const sales = await prisma.sale.findMany({
    include: { invoice: true }
  });

  console.log(`--- AUDITING ${sales.length} SALES RECORDS ---`);

  let errors = 0;

  // 1. Check for exact duplicates (same store, platform, weekStart)
  const grouped = {};
  for (const s of sales) {
    const key = `${s.store}-${s.platform}-${s.weekStart.toISOString().split('T')[0]}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  }

  console.log("\n1. CHECKING FOR DUPLICATES...");
  for (const [key, records] of Object.entries(grouped)) {
    // Note: Tasty Bun POS sometimes has 2 records per week (POS vs App), but we split them to Mobile App!
    // So there should be NO duplicates for the exact same store + platform + week.
    if (records.length > 1) {
      console.log(`❌ DUPLICATE DETECTED: ${key} has ${records.length} records!`);
      records.forEach(r => console.log(`   - ID: ${r.id} | Gross: ${r.grossSales} | Invoice: ${r.invoice?.fileName}`));
      errors++;
    }
  }

  // 2. Check math (Gross - Deductions = Net)
  console.log("\n2. CHECKING FINANCIAL MATH...");
  for (const s of sales) {
    const calcNet = s.grossSales 
      - (s.commission || 0) 
      - (s.vat || 0) 
      - (s.adSpends || 0) 
      - (s.topRankFee || 0) 
      - (s.offersOnItems || 0) 
      - (s.otherFees || 0) 
      - (s.adminFee || 0)
      + (s.refunds || 0)
      - (s.offerRedemptionFee || 0);

    // Give a small tolerance for rounding errors (e.g. 0.05)
    if (Math.abs(calcNet - s.netPaid) > 0.05) {
      // Ignore POS and Website since they might not have full breakdown of deductions in DB
      if (s.platform === 'POS' || s.platform === 'Website' || s.platform === 'Mobile App') continue;
      
      console.log(`❌ MATH MISMATCH: ${s.store} ${s.platform} on ${s.weekStart.toISOString().split('T')[0]}`);
      console.log(`   - DB NetPaid: ${s.netPaid}`);
      console.log(`   - Calculated Net: ${calcNet}`);
      console.log(`   - Diff: ${Math.abs(calcNet - s.netPaid).toFixed(2)}`);
      errors++;
    }
  }

  // 3. Check for suspiciously low/high commissions
  console.log("\n3. CHECKING COMMISSION RATES...");
  for (const s of sales) {
    if (s.grossSales > 0 && s.platform !== 'POS' && s.platform !== 'Website' && s.platform !== 'Mobile App') {
      const commRate = s.commission / s.grossSales;
      // Uber is ~30%, Deliveroo ~14-28%, Just Eat ~14%. 
      // If it's over 40% or under 5% (and not Tasty Bun which has flat 4%), flag it.
      if (commRate > 0.40) {
        console.log(`⚠️ HIGH COMM RATE: ${s.store} ${s.platform} on ${s.weekStart.toISOString().split('T')[0]}`);
        console.log(`   - Rate: ${(commRate*100).toFixed(1)}% | Gross: ${s.grossSales} | Comm: ${s.commission}`);
      }
    }
  }

  // 4. Check for missing invoice links
  console.log("\n4. CHECKING FOR MISSING INVOICE LINKS...");
  for (const s of sales) {
    if (!s.invoiceId && s.platform !== 'POS' && s.platform !== 'Website' && s.platform !== 'Mobile App') {
      console.log(`⚠️ NO INVOICE ATTACHED: ${s.store} ${s.platform} on ${s.weekStart.toISOString().split('T')[0]} (ID: ${s.id})`);
    }
  }

  console.log(`\n--- AUDIT COMPLETE: ${errors} CRITICAL ERRORS FOUND ---`);
}

run().finally(() => prisma.$disconnect());
