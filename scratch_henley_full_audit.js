const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runHenleyAudit() {
  const henleyClientId = 'cmpv4dvik0000vdj089wl6zmf';
  console.log('=== STARTING COMPLETE HENLEY SYSTEM AUDIT ===\n');

  // 1. Audit Client Info
  const client = await prisma.client.findUnique({ where: { id: henleyClientId } });
  console.log(`Client Name: ${client ? client.name : 'NOT FOUND'} (ID: ${henleyClientId})`);

  // 2. Audit Sales Records
  const sales2026 = await prisma.sale.findMany({
    where: { clientId: henleyClientId, is2025: false },
    orderBy: { weekEnd: 'asc' }
  });
  const sales2025 = await prisma.sale.findMany({
    where: { clientId: henleyClientId, is2025: true },
    orderBy: { weekEnd: 'asc' }
  });

  console.log(`\n--- 2026 SALES RECORDS ---`);
  console.log(`Total Sales Records (2026): ${sales2026.length}`);
  const s2026Gross = sales2026.reduce((a, b) => a + (b.grossSales || 0), 0);
  const s2026Net = sales2026.reduce((a, b) => a + (b.netPaid || 0), 0);
  const s2026Comm = sales2026.reduce((a, b) => a + (b.commission || 0), 0);
  const s2026Orders = sales2026.reduce((a, b) => a + (b.totalOrders || 0), 0);
  console.log(`Gross Sales (2026): £${s2026Gross.toFixed(2)}`);
  console.log(`Net Sales (2026): £${s2026Net.toFixed(2)}`);
  console.log(`Commissions (2026): £${s2026Comm.toFixed(2)}`);
  console.log(`Total Orders (2026): ${s2026Orders}`);

  // Breakdown 2026 by Store
  const stores2026 = ['Herbies Pizza', 'Tasty Bun', 'Combined'];
  stores2026.forEach(st => {
    let recs = sales2026;
    if (st !== 'Combined') recs = sales2026.filter(s => s.store === st);
    const g = recs.reduce((a, b) => a + b.grossSales, 0);
    const n = recs.reduce((a, b) => a + b.netPaid, 0);
    const o = recs.reduce((a, b) => a + b.totalOrders, 0);
    console.log(`  > ${st.padEnd(14)}: ${recs.length} recs | Gross: £${g.toFixed(2)} | Net: £${n.toFixed(2)} | Orders: ${o}`);
  });

  // 3. Audit Invoices
  const invoices = await prisma.invoice.findMany({
    where: { clientId: henleyClientId },
    include: { supplier: true }
  });
  console.log(`\n--- INVOICES AUDIT ---`);
  console.log(`Total Invoices: ${invoices.length}`);
  const supplierInvoices = invoices.filter(i => i.type === 'supplier');
  const platformInvoices = invoices.filter(i => i.type === 'platform');
  const posInvoices = invoices.filter(i => i.type === 'pos');
  console.log(`Supplier Invoices: ${supplierInvoices.length} | Total Amount: £${supplierInvoices.reduce((a, b) => a + (b.amount || 0), 0).toFixed(2)}`);
  console.log(`Platform Statements: ${platformInvoices.length} | Total Amount: £${platformInvoices.reduce((a, b) => a + (b.amount || 0), 0).toFixed(2)}`);
  console.log(`POS Statements: ${posInvoices.length} | Total Amount: £${posInvoices.reduce((a, b) => a + (b.amount || 0), 0).toFixed(2)}`);

  // Check for any errored/pending OCR status
  const pendingOcr = invoices.filter(i => i.ocrStatus === 'pending' || i.ocrStatus === 'processing');
  const errorOcr = invoices.filter(i => i.ocrStatus === 'error');
  console.log(`Pending OCR: ${pendingOcr.length} | Error OCR: ${errorOcr.length}`);

  // 4. Audit Expenses
  const expenses = await prisma.expense.findMany({
    where: { clientId: henleyClientId, is2025: false }
  });
  console.log(`\n--- 2026 OPERATING EXPENSES ---`);
  console.log(`Total Expenses Records: ${expenses.length}`);
  const expCategories = ['utilities', 'rent', 'marketing', 'wages', 'supplier', 'misc', 'others'];
  expCategories.forEach(cat => {
    const catRecs = expenses.filter(e => e.category.toLowerCase() === cat);
    const sum = catRecs.reduce((a, b) => a + (b.amount || 0), 0);
    console.log(`  > ${cat.padEnd(12)}: ${catRecs.length} recs | Sum: £${sum.toFixed(2)}`);
  });

  // 5. Audit Staff Wages
  const wages = await prisma.staffWage.findMany({
    where: { clientId: henleyClientId, is2025: false },
    include: { staff: true }
  });
  console.log(`\n--- STAFF WAGES ---`);
  console.log(`Total Wage Records: ${wages.length}`);
  const totalWagesAmt = wages.reduce((a, b) => a + (b.amount || 0), 0);
  console.log(`Total Wages Pay: £${totalWagesAmt.toFixed(2)}`);

  // 6. Net Profit Calculation
  const totalSupplierPurchases = supplierInvoices.reduce((a, b) => a + (b.amount || 0), 0);
  const totalOperatingExpenses = expenses.reduce((a, b) => a + (b.amount || 0), 0);
  const totalCosts = totalSupplierPurchases + totalWagesAmt + totalOperatingExpenses;
  const netProfit = s2026Net - totalCosts;

  console.log(`\n=== FINANCIAL SUMMARY FOR HENLEY (2026) ===`);
  console.log(`Net Sales: £${s2026Net.toFixed(2)}`);
  console.log(`Supplier Purchases: £${totalSupplierPurchases.toFixed(2)}`);
  console.log(`Staff Wages: £${totalWagesAmt.toFixed(2)}`);
  console.log(`Operating Expenses: £${totalOperatingExpenses.toFixed(2)}`);
  console.log(`Total Expenses: £${totalCosts.toFixed(2)}`);
  console.log(`NET PROFIT: £${netProfit.toFixed(2)}`);

  await prisma.$disconnect();
}

runHenleyAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
