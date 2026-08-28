const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';

  // 1. Cross-validate: Total Net Paid from Sales vs what reports API uses
  const sales = await prisma.sale.findMany({ where: { clientId, is2025: false } });
  const totalGrossSales = sales.reduce((s, r) => s + r.grossSales, 0);
  const totalNetPaid = sales.reduce((s, r) => s + r.netPaid, 0);
  const totalCommission = sales.reduce((s, r) => s + r.commission, 0);
  const totalVat = sales.reduce((s, r) => s + (r.vat || 0), 0);
  const totalOtherFees = sales.reduce((s, r) => s + (r.otherFees || 0), 0);

  // 2. Commission accuracy check per platform
  const platforms = {};
  for (const s of sales) {
    if (!platforms[s.platform]) platforms[s.platform] = { gross: 0, commission: 0, net: 0, count: 0 };
    platforms[s.platform].gross += s.grossSales;
    platforms[s.platform].commission += s.commission;
    platforms[s.platform].net += s.netPaid;
    platforms[s.platform].count++;
  }

  console.log("=== SALES CROSS-VALIDATION ===");
  console.log(`Total Records: ${sales.length}`);
  console.log(`Total Gross: £${totalGrossSales.toFixed(2)}`);
  console.log(`Total Net Paid: £${totalNetPaid.toFixed(2)}`);
  console.log(`Total Commission: £${totalCommission.toFixed(2)}`);
  console.log(`Total VAT: £${totalVat.toFixed(2)}`);
  console.log(`Total Other Fees: £${totalOtherFees.toFixed(2)}`);
  console.log(`\nCommission % of Gross: ${((totalCommission / totalGrossSales) * 100).toFixed(2)}%`);
  
  console.log("\n=== COMMISSION RATES BY PLATFORM ===");
  for (const [platform, data] of Object.entries(platforms)) {
    const commRate = data.gross > 0 ? ((data.commission / data.gross) * 100).toFixed(2) : '0.00';
    console.log(`${platform}: Gross=£${data.gross.toFixed(2)}, Commission=£${data.commission.toFixed(2)}, Rate=${commRate}%, Net=£${data.net.toFixed(2)}, Records=${data.count}`);
  }

  // 3. Verify Net Paid = Gross - Commission for each platform
  console.log("\n=== NET PAID FORMULA ACCURACY (per record) ===");
  let formulaErrors = 0;
  for (const s of sales) {
    const expected = s.grossSales - s.commission - (s.otherFees || 0) - (s.vat || 0);
    const diff = Math.abs(s.netPaid - expected);
    if (diff > 0.02) { // Allow 2p rounding tolerance
      console.log(`  ❌ MISMATCH: ${s.platform} | weekEnd=${s.weekEnd?.toISOString().split('T')[0]} | gross=${s.grossSales} - commission=${s.commission} - fees=${s.otherFees||0} - vat=${s.vat||0} = expected ${expected.toFixed(2)} but got ${s.netPaid.toFixed(2)} (diff=${diff.toFixed(2)})`);
      formulaErrors++;
    }
  }
  if (formulaErrors === 0) console.log("  ✅ All Net Paid records match formula (within 2p tolerance)");
  else console.log(`  ❌ Found ${formulaErrors} records with Net Paid formula mismatch`);

  // 4. Check for any sales records with suspiciously wrong commission rates
  console.log("\n=== SUSPICIOUS COMMISSION RATE CHECK ===");
  let suspiciousCount = 0;
  for (const s of sales) {
    const rate = s.grossSales > 0 ? (s.commission / s.grossSales) * 100 : 0;
    // Expected rates:
    const isTastyBunWebOrApp = s.platform === 'Tasty Bun Website' || s.platform === 'Tasty Bun App';
    const isTastyBunPOS = s.platform === 'Tasty Bun POS';
    const isHerbiesWebMobile = s.platform === 'Herbies Pizza Website & Mobile';
    const isHerbiesPOS = s.platform === 'Herbies Pizza POS';
    const isPlatform = ['Herbies Pizza Deliveroo','Herbies Pizza Just Eat','Herbies Pizza Uber Eats','Tasty Bun Deliveroo','Tasty Bun Just Eat','Tasty Bun Uber Eats'].includes(s.platform);
    
    let issue = null;
    if (isTastyBunPOS && s.commission !== 0) issue = `Tasty Bun POS should have 0% commission but has ${rate.toFixed(2)}%`;
    if (isHerbiesPOS && s.commission !== 0) issue = `Herbies POS should have 0% commission but has ${rate.toFixed(2)}%`;
    if (isTastyBunWebOrApp && (rate < 3.9 || rate > 4.1)) issue = `Tasty Bun Web/App should be 4% but is ${rate.toFixed(2)}%`;
    if (isHerbiesWebMobile && (rate < 8.0 || rate > 9.0)) issue = `Herbies Website & Mobile should be 8.5% but is ${rate.toFixed(2)}%`;
    
    if (issue) {
      console.log(`  ❌ ${issue} | week=${s.weekEnd?.toISOString().split('T')[0]} | gross=£${s.grossSales}`);
      suspiciousCount++;
    }
  }
  if (suspiciousCount === 0) console.log("  ✅ All commission rates are within expected ranges");
  
  // 5. Check Expenses Math
  console.log("\n=== EXPENSES AUDIT ===");
  const expenses = await prisma.expense.findMany({ where: { clientId, is2025: false, period: { not: 'template' } } });
  const wages = await prisma.staffWage.findMany({ where: { clientId, is2025: false } });
  const suppliers = await prisma.invoice.findMany({ where: { clientId, is2025: false, type: 'supplier' } });
  
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalWages = wages.reduce((s, w) => s + w.amount, 0);
  const totalSuppliers = suppliers.reduce((s, i) => s + (i.amount || 0), 0);
  
  console.log(`Total Expense Records: ${expenses.length}`);
  console.log(`Total Expenses: £${totalExpenses.toFixed(2)}`);
  console.log(`Total Staff Wages: £${totalWages.toFixed(2)}`);
  console.log(`Total Supplier Invoices: £${totalSuppliers.toFixed(2)}`);
  console.log(`Grand Total All Expenses: £${(totalExpenses + totalWages + totalSuppliers).toFixed(2)}`);
  
  // 6. Net Profit cross-check
  console.log("\n=== NET PROFIT CROSS-VALIDATION ===");
  const reportNetProfit = totalNetPaid - totalExpenses - totalWages - totalSuppliers;
  console.log(`Net Profit = £${totalNetPaid.toFixed(2)} (Net Paid) - £${totalExpenses.toFixed(2)} (Expenses) - £${totalWages.toFixed(2)} (Wages) - £${totalSuppliers.toFixed(2)} (Suppliers)`);
  console.log(`= £${reportNetProfit.toFixed(2)}`);
  
  // 7. Duplicate sales records check
  console.log("\n=== DUPLICATE SALES CHECK ===");
  const saleGroups = {};
  for (const s of sales) {
    const key = `${s.platform}|${s.weekEnd?.toISOString().split('T')[0]}|${s.grossSales}`;
    if (!saleGroups[key]) saleGroups[key] = [];
    saleGroups[key].push(s.id);
  }
  let dupCount = 0;
  for (const [key, ids] of Object.entries(saleGroups)) {
    if (ids.length > 1) {
      console.log(`  ❌ DUPLICATE: ${key} appears ${ids.length} times`);
      dupCount++;
    }
  }
  if (dupCount === 0) console.log("  ✅ No duplicate sales records found");
  
  // 8. Check for null/zero gross sales
  console.log("\n=== NULL/ZERO GROSS SALES CHECK ===");
  const zeroSales = sales.filter(s => s.grossSales === 0 || s.grossSales === null);
  if (zeroSales.length > 0) {
    console.log(`  ❌ Found ${zeroSales.length} records with zero/null gross sales:`);
    zeroSales.forEach(s => console.log(`    - ${s.platform} | week=${s.weekEnd?.toISOString().split('T')[0]}`));
  } else {
    console.log("  ✅ No zero/null gross sales records found");
  }
  
  // 9. Duplicate expense check
  console.log("\n=== DUPLICATE EXPENSE CHECK ===");
  const expGroups = {};
  for (const e of expenses) {
    const key = `${e.category}|${e.subcategory}|${e.date?.toISOString().split('T')[0]}|${e.amount}`;
    if (!expGroups[key]) expGroups[key] = 0;
    expGroups[key]++;
  }
  let expDups = 0;
  for (const [key, count] of Object.entries(expGroups)) {
    if (count > 1) {
      console.log(`  ❌ DUPLICATE EXPENSE: ${key} appears ${count} times`);
      expDups++;
    }
  }
  if (expDups === 0) console.log("  ✅ No duplicate expenses found");
}

main().catch(console.error).finally(()=>prisma.$disconnect());
