const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function checkUTCBoundaries(date, expectedHour, expectedMinute, expectedSecond) {
  const d = new Date(date);
  return d.getUTCHours() === expectedHour && 
         d.getUTCMinutes() === expectedMinute && 
         d.getUTCSeconds() === expectedSecond;
}

async function main() {
  console.log("====================================================");
  console.log("             DEEP SYSTEM DATA AUDIT REPORT          ");
  console.log("====================================================");
  
  // 1. Sales Records Audit
  const sales = await prisma.sale.findMany({ include: { invoice: true } });
  console.log(`\n[Sales Audit] Total records: ${sales.length}`);
  
  let salesBadDates = 0;
  let salesShiftedWeeks = 0;
  let salesDuplicates = 0;
  let salesMathErrors = 0;
  const salesKeys = new Set();

  for (const s of sales) {
    const yStart = new Date(s.weekStart).getUTCFullYear();
    if (yStart < 2025 || yStart > 2028) salesBadDates++;
    
    const isStartOk = checkUTCBoundaries(s.weekStart, 0, 0, 0);
    const isEndOk = checkUTCBoundaries(s.weekEnd, 23, 59, 59);
    if (!isStartOk || !isEndOk) salesShiftedWeeks++;

    if (s.netPaid > s.grossSales) salesMathErrors++;

    const key = `${s.platform}-${s.store}-${s.weekStart.toISOString()}`;
    if (salesKeys.has(key)) salesDuplicates++;
    else salesKeys.add(key);
  }
  console.log(`  - Bad year range: ${salesBadDates}`);
  console.log(`  - Shifted week boundaries: ${salesShiftedWeeks}`);
  console.log(`  - Exact duplicates: ${salesDuplicates} (Expected: overlapping POS reports)`);
  console.log(`  - Math errors (Net > Gross): ${salesMathErrors}`);

  // 2. Expenses Records Audit
  const expenses = await prisma.expense.findMany();
  console.log(`\n[Expenses Audit] Total records: ${expenses.length}`);
  
  let expensesBadDates = 0;
  let expensesMissingCategory = 0;
  let expensesNegative = 0;

  for (const e of expenses) {
    const y = new Date(e.date).getUTCFullYear();
    if (y < 2025 || y > 2028) expensesBadDates++;
    if (!e.category) expensesMissingCategory++;
    if (e.amount < 0) expensesNegative++;
  }
  console.log(`  - Bad year range: ${expensesBadDates}`);
  console.log(`  - Missing category: ${expensesMissingCategory}`);
  console.log(`  - Negative amounts: ${expensesNegative}`);

  // 3. Staff Wages Audit
  const wages = await prisma.staffWage.findMany({ include: { staff: true } });
  console.log(`\n[Staff Wages Audit] Total records: ${wages.length}`);
  
  let wagesBadDates = 0;
  let wagesShifted = 0;
  let wagesNegative = 0;
  let wagesMissingStaff = 0;

  for (const w of wages) {
    const y = new Date(w.weekEnd).getUTCFullYear();
    if (y < 2025 || y > 2028) wagesBadDates++;

    const isEndOk = checkUTCBoundaries(w.weekEnd, 23, 59, 59);
    if (!isEndOk) wagesShifted++;

    if (w.amount < 0) wagesNegative++;
    if (!w.staffId || !w.staff) wagesMissingStaff++;
  }
  console.log(`  - Bad year range: ${wagesBadDates}`);
  console.log(`  - Shifted weekEnd boundaries: ${wagesShifted}`);
  console.log(`  - Negative amounts: ${wagesNegative}`);
  console.log(`  - Missing staff relation: ${wagesMissingStaff}`);

  // 4. Invoices Audit
  const invoices = await prisma.invoice.findMany({ include: { supplier: true } });
  console.log(`\n[Invoices Audit] Total records: ${invoices.length}`);
  
  let invoicesBadDates = 0;
  let supplierInvoicesMissingSupplier = 0;

  for (const inv of invoices) {
    if (inv.invoiceDate) {
      const y = new Date(inv.invoiceDate).getUTCFullYear();
      if (y < 2025 || y > 2028) invoicesBadDates++;
    }
    if (inv.type === 'supplier' && !inv.supplierId) {
      supplierInvoicesMissingSupplier++;
    }
  }
  console.log(`  - Bad year range: ${invoicesBadDates}`);
  console.log(`  - Supplier invoices missing supplier relation: ${supplierInvoicesMissingSupplier}`);

  // 5. Suppliers Audit
  const suppliers = await prisma.supplier.findMany();
  console.log(`\n[Suppliers Audit] Total records: ${suppliers.length}`);
  let suppliersMissingFranchise = 0;
  for (const s of suppliers) {
    if (!s.franchise) suppliersMissingFranchise++;
  }
  console.log(`  - Suppliers missing franchise assignment: ${suppliersMissingFranchise}`);

  console.log("\n====================================================");
  console.log("               DEEP AUDIT COMPLETED                 ");
  console.log("====================================================");
}

main().catch(console.error).finally(() => prisma.$disconnect());
