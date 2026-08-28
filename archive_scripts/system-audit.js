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
  console.log("               SYSTEM DATA AUDIT REPORT             ");
  console.log("====================================================");
  
  // 1. Sales Records Audit
  const sales = await prisma.sale.findMany({ include: { invoice: true } });
  console.log(`\n[Sales Audit] Total records: ${sales.length}`);
  
  let salesBadDates = 0;
  let salesShiftedWeeks = 0;
  let salesDuplicates = 0;
  const salesKeys = new Set();

  for (const s of sales) {
    // Check if dates are within valid ranges (2025 or 2026-2028)
    const yStart = new Date(s.weekStart).getUTCFullYear();
    const yEnd = new Date(s.weekEnd).getUTCFullYear();
    if (yStart < 2025 || yStart > 2028) salesBadDates++;
    
    // Check if weekStart is Monday UTC midnight and weekEnd is Sunday UTC 23:59:59.999
    const isStartOk = checkUTCBoundaries(s.weekStart, 0, 0, 0);
    const isEndOk = checkUTCBoundaries(s.weekEnd, 23, 59, 59);
    if (!isStartOk || !isEndOk) salesShiftedWeeks++;

    // Check duplicates: platform + store + weekStart
    const key = `${s.platform}-${s.store}-${s.weekStart.toISOString()}`;
    if (salesKeys.has(key)) {
      salesDuplicates++;
      console.warn(`  --> Duplicate Sale found: Store: ${s.store}, Platform: ${s.platform}, WeekStart: ${s.weekStart.toISOString()}`);
    } else {
      salesKeys.add(key);
    }
  }
  console.log(`  - Bad year range: ${salesBadDates}`);
  console.log(`  - Shifted week boundaries (non-UTC midnight): ${salesShiftedWeeks}`);
  console.log(`  - Exact duplicates: ${salesDuplicates}`);

  // 2. Expenses Records Audit
  const expenses = await prisma.expense.findMany();
  console.log(`\n[Expenses Audit] Total records: ${expenses.length}`);
  
  let expensesBadDates = 0;
  let expensesDuplicates = 0;
  const expenseKeys = new Set();

  for (const e of expenses) {
    const y = new Date(e.date).getUTCFullYear();
    if (y < 2025 || y > 2028) expensesBadDates++;

    const key = `${e.category}-${e.subcategory || ''}-${e.date.toISOString()}-${e.amount}`;
    if (expenseKeys.has(key)) {
      expensesDuplicates++;
    } else {
      expenseKeys.add(key);
    }
  }
  console.log(`  - Bad year range: ${expensesBadDates}`);
  console.log(`  - Potential duplicates: ${expensesDuplicates}`);

  // 3. Staff Wages Audit
  const wages = await prisma.staffWage.findMany({ include: { staff: true } });
  console.log(`\n[Staff Wages Audit] Total records: ${wages.length}`);
  
  let wagesBadDates = 0;
  let wagesShifted = 0;
  let wagesDuplicates = 0;
  const wageKeys = new Set();

  for (const w of wages) {
    const y = new Date(w.weekEnd).getUTCFullYear();
    if (y < 2025 || y > 2028) wagesBadDates++;

    const isEndOk = checkUTCBoundaries(w.weekEnd, 23, 59, 59);
    if (!isEndOk) wagesShifted++;

    const key = `${w.staffId}-${w.weekEnd.toISOString()}`;
    if (wageKeys.has(key)) {
      wagesDuplicates++;
      console.warn(`  --> Duplicate Wage found: Staff: ${w.staff?.name}, WeekEnd: ${w.weekEnd.toISOString()}`);
    } else {
      wageKeys.add(key);
    }
  }
  console.log(`  - Bad year range: ${wagesBadDates}`);
  console.log(`  - Shifted weekEnd boundaries (non-UTC 23:59:59): ${wagesShifted}`);
  console.log(`  - Exact duplicates (same staff, same week): ${wagesDuplicates}`);

  // 4. Invoices Audit
  const invoices = await prisma.invoice.findMany({ include: { supplier: true } });
  console.log(`\n[Invoices Audit] Total records: ${invoices.length}`);
  
  let invoicesBadDates = 0;
  let invoicesDuplicates = 0;
  const invoiceKeys = new Set();

  for (const inv of invoices) {
    if (inv.invoiceDate) {
      const y = new Date(inv.invoiceDate).getUTCFullYear();
      if (y < 2025 || y > 2028) {
        invoicesBadDates++;
        console.warn(`  --> Bad Date Invoice: ID: ${inv.id}, Date: ${inv.invoiceDate.toISOString()}, File: ${inv.fileName}`);
      }
    }
    
    // Duplicate check by file hash or file name/path
    const key = inv.filePath;
    if (invoiceKeys.has(key)) {
      invoicesDuplicates++;
    } else {
      invoiceKeys.add(key);
    }
  }
  console.log(`  - Bad year range: ${invoicesBadDates}`);
  console.log(`  - Duplicate file paths: ${invoicesDuplicates}`);

  // 5. Stocks Audit
  const stocks = await prisma.stock.findMany();
  console.log(`\n[Stocks Audit] Total records: ${stocks.length}`);
  
  let stocksBadDates = 0;
  let stocksShifted = 0;
  let stocksDuplicates = 0;
  const stockKeys = new Set();

  for (const st of stocks) {
    const y = new Date(st.weekEnd).getUTCFullYear();
    if (y < 2025 || y > 2028) stocksBadDates++;

    const isEndOk = checkUTCBoundaries(st.weekEnd, 23, 59, 59);
    if (!isEndOk) stocksShifted++;

    const key = `${st.franchise}-${st.weekEnd.toISOString()}`;
    if (stockKeys.has(key)) {
      stocksDuplicates++;
    } else {
      stockKeys.add(key);
    }
  }
  console.log(`  - Bad year range: ${stocksBadDates}`);
  console.log(`  - Shifted weekEnd boundaries (non-UTC 23:59:59): ${stocksShifted}`);
  console.log(`  - Exact duplicates (same franchise, same week): ${stocksDuplicates}`);

  console.log("\n====================================================");
  console.log("               AUDIT COMPLETED                      ");
  console.log("====================================================");
}

main().catch(console.error).finally(() => prisma.$disconnect());
