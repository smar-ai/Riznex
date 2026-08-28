const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  const is2025 = false; // Real data only

  console.log("=== DATA MATCHING & CONSISTENCY AUDIT ===");

  // 1. Check all platform/pos invoices and their linked sales
  const invoices = await prisma.invoice.findMany({
    where: { clientId, is2025, type: { in: ['platform', 'pos'] } },
    include: { sales: true }
  });

  console.log(`\n1. Checking Platform & POS Invoices vs Linked Sales:`);
  let salesMismatches = 0;
  let missingSalesRecords = 0;

  for (const inv of invoices) {
    if (inv.sales.length === 0) {
      console.log(`  ❌ MISSING SALES: Invoice ID ${inv.id} (${inv.fileName}) has amount £${inv.amount} but 0 linked Sales records!`);
      missingSalesRecords++;
      continue;
    }

    const totalSalesGross = inv.sales.reduce((sum, s) => sum + s.grossSales, 0);
    const diff = Math.abs((inv.amount || 0) - totalSalesGross);
    if (diff > 0.05) { // 5p rounding tolerance
      console.log(`  ❌ MISMATCH: Invoice ${inv.fileName} amount is £${inv.amount}, but sum of linked Sales is £${totalSalesGross.toFixed(2)} (diff: £${diff.toFixed(2)})`);
      salesMismatches++;
    }
  }

  if (salesMismatches === 0 && missingSalesRecords === 0) {
    console.log("  ✅ All platform/pos invoices match their linked sales records perfectly!");
  } else {
    console.log(`  Summary: Found ${salesMismatches} mismatches and ${missingSalesRecords} invoices with missing sales records.`);
  }

  // 2. Check all expense invoices and their linked expenses
  const expenseInvoices = await prisma.invoice.findMany({
    where: { clientId, is2025, type: 'expense' },
    include: { generatedInvoices: true } // Wait, expenses link via expense.invoiceId
  });

  // Find all expenses linked to invoices
  const expenses = await prisma.expense.findMany({
    where: { clientId, is2025, invoiceId: { not: null } }
  });

  console.log(`\n2. Checking Expense Invoices vs Linked Expenses:`);
  let expenseMismatches = 0;
  
  // Group expenses by invoiceId
  const expensesByInvoice = {};
  for (const exp of expenses) {
    if (!expensesByInvoice[exp.invoiceId]) expensesByInvoice[exp.invoiceId] = 0;
    expensesByInvoice[exp.invoiceId] += exp.amount;
  }

  const expInvs = await prisma.invoice.findMany({
    where: { clientId, is2025, type: 'expense' }
  });

  for (const inv of expInvs) {
    const totalExp = expensesByInvoice[inv.id] || 0;
    const diff = Math.abs((inv.amount || 0) - totalExp);
    if (diff > 0.05) {
      console.log(`  ❌ MISMATCH: Expense Invoice ${inv.fileName} amount is £${inv.amount}, but sum of linked Expenses is £${totalExp.toFixed(2)} (diff: £${diff.toFixed(2)})`);
      expenseMismatches++;
    }
  }

  if (expenseMismatches === 0) {
    console.log("  ✅ All expense invoices match their linked expense records perfectly!");
  } else {
    console.log(`  Summary: Found ${expenseMismatches} mismatches.`);
  }

  // 3. Check for any Sales records that do NOT have a linked Invoice
  const unlinkedSales = await prisma.sale.findMany({
    where: { clientId, is2025, invoiceId: null }
  });
  console.log(`\n3. Checking for Sales records not linked to any Invoice (manual sales):`);
  if (unlinkedSales.length > 0) {
    console.log(`  ℹ️ Found ${unlinkedSales.length} manually created or unlinked Sales records:`);
    for (const sale of unlinkedSales) {
      console.log(`    - ${sale.platform} | Store: ${sale.store} | weekEnd: ${sale.weekEnd.toISOString().split('T')[0]} | Gross: £${sale.grossSales}`);
    }
  } else {
    console.log("  ✅ All Sales records are linked to uploaded invoices!");
  }

  // 4. Grouped weekly totals cross-check
  console.log("\n4. Weekly Totals Check (Sales Tab vs Overview Dashboard Calculations):");
  const salesGroupedByWeek = await prisma.sale.groupBy({
    by: ['weekEnd'],
    where: { clientId, is2025 },
    _sum: { grossSales: true, netPaid: true, commission: true }
  });

  // Sort weeks
  salesGroupedByWeek.sort((a, b) => a.weekEnd.getTime() - b.weekEnd.getTime());

  for (const week of salesGroupedByWeek) {
    const weekStr = week.weekEnd.toISOString().split('T')[0];
    
    // Sum of all invoices matching this weekEnd
    // Platform/POS invoices snaped to weekend or uploaded for this week
    const invoicesForWeek = await prisma.invoice.aggregate({
      where: { 
        clientId, 
        is2025, 
        type: { in: ['platform', 'pos'] },
        invoiceDate: {
          gte: new Date(week.weekEnd.getTime() - 3 * 24 * 60 * 60 * 1000), // +/- 3 days window
          lte: new Date(week.weekEnd.getTime() + 3 * 24 * 60 * 60 * 1000)
        }
      },
      _sum: { amount: true }
    });

    const invSum = invoicesForWeek._sum.amount || 0;
    const salesSum = week._sum.grossSales || 0;
    const diff = Math.abs(invSum - salesSum);
    
    console.log(`  - Week Ending ${weekStr}:`);
    console.log(`    Invoices Total (Platform/POS): £${invSum.toFixed(2)}`);
    console.log(`    Sales Tab Gross Total:         £${salesSum.toFixed(2)}`);
    if (diff > 1.00) {
      console.log(`    ❌ mismatch of £${diff.toFixed(2)} (Likely due to date alignment or unlinked manual entries)`);
    } else {
      console.log(`    ✅ MATCH (within tolerance)`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
