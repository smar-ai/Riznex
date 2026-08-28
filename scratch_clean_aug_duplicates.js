const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'client-1';

  // Find all wages for August
  const wages = await prisma.staffWage.findMany({
    where: { clientId, weekEnd: { gte: new Date('2026-08-01') } },
    include: { staff: true },
    orderBy: { weekEnd: 'desc' }
  });

  console.log('--- ALL AUGUST WAGES IN DB ---');
  wages.forEach(w => {
    console.log(`ID: ${w.id} | Staff: ${w.staff.name} | WeekEnd: ${w.weekEnd.toISOString().split('T')[0]} | Amount: £${w.amount}`);
  });

  // Find duplicates on 08 Aug vs 09 Aug, or 15 Aug vs 16 Aug
  const aug8Wages = wages.filter(w => w.weekEnd.toISOString().startsWith('2026-08-08'));
  if (aug8Wages.length > 0) {
    console.log(`\nDeleting ${aug8Wages.length} duplicate wages on 08 Aug 2026...`);
    for (const w of aug8Wages) {
      await prisma.staffWage.delete({ where: { id: w.id } });
    }
  }

  const aug15Wages = wages.filter(w => w.weekEnd.toISOString().startsWith('2026-08-15'));
  if (aug15Wages.length > 0) {
    console.log(`\nDeleting ${aug15Wages.length} duplicate wages on 15 Aug 2026...`);
    for (const w of aug15Wages) {
      await prisma.staffWage.delete({ where: { id: w.id } });
    }
  }

  // Also check expenses table for duplicate dates (08 Aug / 15 Aug vs 09 Aug / 16 Aug)
  const expenses = await prisma.expense.findMany({
    where: { clientId, date: { gte: new Date('2026-08-01') } }
  });
  console.log('\n--- ALL AUGUST EXPENSES IN DB ---');
  expenses.forEach(e => {
    console.log(`ID: ${e.id} | Subcat: ${e.subcategory} | Date: ${e.date.toISOString().split('T')[0]} | Amount: £${e.amount}`);
  });

  const aug8Exp = expenses.filter(e => e.date.toISOString().startsWith('2026-08-08'));
  if (aug8Exp.length > 0) {
    console.log(`\nDeleting ${aug8Exp.length} duplicate expenses on 08 Aug 2026...`);
    for (const e of aug8Exp) {
      await prisma.expense.delete({ where: { id: e.id } });
    }
  }

  const aug15Exp = expenses.filter(e => e.date.toISOString().startsWith('2026-08-15'));
  if (aug15Exp.length > 0) {
    console.log(`\nDeleting ${aug15Exp.length} duplicate expenses on 15 Aug 2026...`);
    for (const e of aug15Exp) {
      await prisma.expense.delete({ where: { id: e.id } });
    }
  }

  // Also check supplier invoices for duplicate dates (08 Aug / 15 Aug)
  const invoices = await prisma.invoice.findMany({
    where: { clientId, type: 'supplier', invoiceDate: { gte: new Date('2026-08-01') } }
  });
  console.log('\n--- ALL AUGUST SUPPLIER INVOICES IN DB ---');
  invoices.forEach(i => {
    console.log(`ID: ${i.id} | Date: ${i.invoiceDate ? i.invoiceDate.toISOString().split('T')[0] : 'NULL'} | Amount: £${i.amount}`);
  });

  const aug8Inv = invoices.filter(i => i.invoiceDate && i.invoiceDate.toISOString().startsWith('2026-08-08'));
  if (aug8Inv.length > 0) {
    console.log(`\nDeleting ${aug8Inv.length} duplicate supplier invoices on 08 Aug 2026...`);
    for (const i of aug8Inv) {
      await prisma.invoice.delete({ where: { id: i.id } });
    }
  }

  const aug15Inv = invoices.filter(i => i.invoiceDate && i.invoiceDate.toISOString().startsWith('2026-08-15'));
  if (aug15Inv.length > 0) {
    console.log(`\nDeleting ${aug15Inv.length} duplicate supplier invoices on 15 Aug 2026...`);
    for (const i of aug15Inv) {
      await prisma.invoice.delete({ where: { id: i.id } });
    }
  }

  console.log('\nSUCCESS: All duplicate entries cleaned!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
