const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getSunday(dateInput) {
  const dt = new Date(dateInput);
  if (isNaN(dt.getTime())) return null;
  const day = dt.getUTCDay();
  const sunday = day === 0 ? dt : new Date(dt.getTime() + (7 - day) * 24 * 60 * 60 * 1000);
  sunday.setUTCHours(0, 0, 0, 0);
  return sunday;
}

async function main() {
  const clientId = 'client-1';
  console.log('====================================================');
  console.log('🚀 DEEP SYSTEM DEDUPLICATION & DATE SANITIZATION');
  console.log('====================================================');

  // 1. DEDUPLICATE STAFF WAGES
  console.log('\n--- 1. AUDITING & DEDUPLICATING STAFF WAGES ---');
  const wages = await prisma.staffWage.findMany({
    where: { clientId },
    include: { staff: true },
    orderBy: { weekEnd: 'asc' }
  });

  const wageMap = new Map();
  let deletedWagesCount = 0;

  for (const w of wages) {
    const sunday = getSunday(w.weekEnd);
    const key = `${w.staffId}_${sunday.toISOString().split('T')[0]}`;
    if (wageMap.has(key)) {
      // Duplicate! Delete this extra record
      await prisma.staffWage.delete({ where: { id: w.id } });
      deletedWagesCount++;
    } else {
      // Update weekEnd date to exact Sunday if it was on a different day
      if (w.weekEnd.toISOString() !== sunday.toISOString()) {
        await prisma.staffWage.update({
          where: { id: w.id },
          data: { weekEnd: sunday }
        });
      }
      wageMap.set(key, w.id);
    }
  }
  console.log(`✅ Staff Wages Cleaned: Deleted ${deletedWagesCount} duplicate wage entries. Remaining: ${wageMap.size} valid weekly wage records.`);

  // 2. DEDUPLICATE SUPPLIER INVOICES
  console.log('\n--- 2. AUDITING & DEDUPLICATING SUPPLIER INVOICES ---');
  const supplierInvoices = await prisma.invoice.findMany({
    where: { clientId, type: 'supplier' },
    orderBy: { invoiceDate: 'asc' }
  });

  const supMap = new Map();
  let deletedSupCount = 0;

  for (const inv of supplierInvoices) {
    if (!inv.supplierId || !inv.invoiceDate) continue;
    const sunday = getSunday(inv.invoiceDate);
    const key = `${inv.supplierId}_${sunday.toISOString().split('T')[0]}`;
    if (supMap.has(key)) {
      await prisma.invoice.delete({ where: { id: inv.id } });
      deletedSupCount++;
    } else {
      if (inv.invoiceDate.toISOString() !== sunday.toISOString()) {
        await prisma.invoice.update({
          where: { id: inv.id },
          data: { invoiceDate: sunday }
        });
      }
      supMap.set(key, inv.id);
    }
  }
  console.log(`✅ Supplier Invoices Cleaned: Deleted ${deletedSupCount} duplicate supplier invoices. Remaining: ${supMap.size} valid weekly supplier records.`);

  // 3. DEDUPLICATE OPERATING EXPENSES (Utilities, Rent, Marketing, etc.)
  console.log('\n--- 3. AUDITING & DEDUPLICATING OPERATING EXPENSES ---');
  const expenses = await prisma.expense.findMany({
    where: { clientId },
    orderBy: { date: 'asc' }
  });

  const expMap = new Map();
  let deletedExpCount = 0;

  for (const e of expenses) {
    const sunday = getSunday(e.date);
    const key = `${e.category}_${e.subcategory || ''}_${sunday.toISOString().split('T')[0]}`;
    if (expMap.has(key)) {
      await prisma.expense.delete({ where: { id: e.id } });
      deletedExpCount++;
    } else {
      if (e.date.toISOString() !== sunday.toISOString()) {
        await prisma.expense.update({
          where: { id: e.id },
          data: { date: sunday }
        });
      }
      expMap.set(key, e.id);
    }
  }
  console.log(`✅ Operating Expenses Cleaned: Deleted ${deletedExpCount} duplicate expenses. Remaining: ${expMap.size} valid expense records.`);

  // 4. DEDUPLICATE SALES RECORDS (Platform & POS)
  console.log('\n--- 4. AUDITING & DEDUPLICATING SALES RECORDS ---');
  const sales = await prisma.sale.findMany({
    where: { clientId },
    orderBy: { weekEnd: 'asc' }
  });

  const salesMap = new Map();
  let deletedSalesCount = 0;

  for (const s of sales) {
    const sunday = getSunday(s.weekEnd);
    const normPlatform = s.platform.toLowerCase().replace(/[-_]/g, ' ').trim();
    const key = `${normPlatform}_${sunday.toISOString().split('T')[0]}`;

    if (salesMap.has(key)) {
      await prisma.sale.delete({ where: { id: s.id } });
      deletedSalesCount++;
    } else {
      // Standardize weekEnd to Sunday, store to 'Hungry Birds'
      const startOfWeek = new Date(sunday.getTime() - 6 * 24 * 60 * 60 * 1000);
      startOfWeek.setUTCHours(0, 0, 0, 0);

      await prisma.sale.update({
        where: { id: s.id },
        data: {
          weekStart: startOfWeek,
          weekEnd: sunday,
          store: 'Hungry Birds'
        }
      });
      salesMap.set(key, s.id);
    }
  }
  console.log(`✅ Sales Records Cleaned: Deleted ${deletedSalesCount} duplicate sales. Remaining: ${salesMap.size} valid sales records.`);

  console.log('\n====================================================');
  console.log('🎉 SYSTEM DEDUPLICATION & DATE SANITIZATION COMPLETE!');
  console.log('====================================================');
}

main().catch(console.error).finally(() => prisma.$disconnect());
