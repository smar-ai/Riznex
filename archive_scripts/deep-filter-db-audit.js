const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runAudit() {
  console.log("====================================================");
  console.log("        DEEP DB FILTER LOGIC AUDIT EXECUTING        ");
  console.log("====================================================");
  const clientId = "cmpv4dvik0000vdj089wl6zmf"; // Admin client ID

  try {
    // 1. Sales Store Filters
    console.log("\n[1] Testing Sales Store/Franchise Filters...");
    const salesHerbies = await prisma.sale.findMany({
      where: { 
        clientId, 
        AND: [
          { store: 'Herbies Pizza' },
          { store: { notIn: ['Monthly Combined', 'Monthly Herbies Pizza', 'Monthly Tasty Bun'] } }
        ]
      }
    });
    console.log(`  - Herbies Pizza Sales: ${salesHerbies.length}`);
    let hLeaks = salesHerbies.filter(s => s.store !== 'Herbies Pizza').length;
    console.log(`    -> Tasty Bun/Monthly Leaks: ${hLeaks}`);

    const salesTasty = await prisma.sale.findMany({
      where: { 
        clientId, 
        AND: [
          { store: 'Tasty Bun' },
          { store: { notIn: ['Monthly Combined', 'Monthly Herbies Pizza', 'Monthly Tasty Bun'] } }
        ]
      }
    });
    console.log(`  - Tasty Bun Sales: ${salesTasty.length}`);
    let tLeaks = salesTasty.filter(s => s.store !== 'Tasty Bun').length;
    console.log(`    -> Herbies/Monthly Leaks: ${tLeaks}`);

    // 2. Sales Date Filters
    console.log("\n[2] Testing Sales Date Filters...");
    const dateFrom = new Date('2026-05-01');
    const dateTo = new Date('2026-05-31T23:59:59.999Z');
    const salesMay = await prisma.sale.findMany({
      where: { clientId, weekStart: { gte: dateFrom, lte: dateTo } }
    });
    console.log(`  - May 2026 Sales: ${salesMay.length}`);
    let dLeaks = salesMay.filter(s => s.weekStart < dateFrom || s.weekStart > dateTo).length;
    console.log(`    -> Date Boundary Leaks: ${dLeaks}`);

    // 3. Expenses Category Filters
    console.log("\n[3] Testing Expenses Category Filters...");
    // Let's test a category that actually has records, like 'wages' isn't a direct expense anymore it's handled differently, but let's test 'misc' or just fetch all and test.
    const expensesMisc = await prisma.expense.findMany({
      where: { clientId, category: 'misc' }
    });
    console.log(`  - Misc Expenses: ${expensesMisc.length}`);
    let cLeaks = expensesMisc.filter(e => e.category !== 'misc').length;
    console.log(`    -> Category Leaks: ${cLeaks}`);

    // 4. Supplier Invoice Date Filters
    console.log("\n[4] Testing Supplier Invoice Date Filters...");
    const invoicesJune = await prisma.invoice.findMany({
      where: { clientId, type: 'supplier', invoiceDate: { gte: new Date('2026-06-01'), lte: new Date('2026-06-30T23:59:59.999Z') } }
    });
    console.log(`  - June 2026 Supplier Invoices: ${invoicesJune.length}`);
    let iLeaks = invoicesJune.filter(i => !i.invoiceDate || i.invoiceDate < new Date('2026-06-01') || i.invoiceDate > new Date('2026-06-30T23:59:59.999Z')).length;
    console.log(`    -> Date Boundary Leaks: ${iLeaks}`);

    // 5. Wages Date Filters
    console.log("\n[5] Testing Wages Date Filters...");
    const wagesJune = await prisma.staffWage.findMany({
      where: { clientId, weekEnd: { gte: new Date('2026-06-01'), lte: new Date('2026-06-30T23:59:59.999Z') } }
    });
    console.log(`  - June 2026 Wages: ${wagesJune.length}`);
    let wLeaks = wagesJune.filter(w => w.weekEnd < new Date('2026-06-01') || w.weekEnd > new Date('2026-06-30T23:59:59.999Z')).length;
    console.log(`    -> Date Boundary Leaks: ${wLeaks}`);

    console.log("\n====================================================");
    console.log("             DB FILTER AUDIT COMPLETED              ");
    console.log("====================================================");

  } catch (e) {
    console.error("Audit failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

runAudit();
