const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getWeekStart(d) {
  const date = new Date(d);
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

function getWeekEnd(d) {
  const start = getWeekStart(d);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  end.setUTCHours(0, 0, 0, 0);
  return end;
}

async function autoFillWeek(dateStr) {
  const clientId = 'client-1';
  const targetDate = new Date(dateStr + 'T00:00:00.000Z');
  const weekStart = getWeekStart(targetDate);
  const weekEnd = getWeekEnd(targetDate);

  // 1. WAGES (£1,300)
  const wagesToAdd = [
    { name: 'Staff 1', amount: 200 },
    { name: 'Staff 2', amount: 200 },
    { name: 'Chef', amount: 400 },
    { name: 'Owner', amount: 500 }
  ];

  for (const w of wagesToAdd) {
    let staff = await prisma.staff.findFirst({ where: { clientId, name: w.name } });
    if (!staff) {
      staff = await prisma.staff.create({
        data: { clientId, name: w.name, role: 'Staff Member', weeklyWage: w.amount, active: true }
      });
    }

    const existingWage = await prisma.staffWage.findFirst({
      where: { staffId: staff.id, weekEnd: weekEnd }
    });

    if (!existingWage) {
      await prisma.staffWage.create({
        data: { clientId, staffId: staff.id, amount: w.amount, weekEnd: weekEnd, store: 'Hungry Birds' }
      });
    }
  }

  // 2. SUPPLIERS (£1,475)
  const suppliersToAdd = [
    { name: 'Express Foods', amount: 450, category: 'food' },
    { name: 'Wington', amount: 325, category: 'food' },
    { name: 'Elc', amount: 200, category: 'food' },
    { name: 'NB Foods', amount: 350, category: 'food' },
    { name: 'Fairwise Ltd', amount: 75, category: 'food' },
    { name: 'Macros', amount: 75, category: 'food' }
  ];

  for (const sup of suppliersToAdd) {
    let supplier = await prisma.supplier.findFirst({ where: { clientId, name: sup.name } });
    if (!supplier) {
      supplier = await prisma.supplier.create({
        data: { clientId, name: sup.name, category: sup.category, franchise: 'Hungry Birds' }
      });
    }

    const existingInv = await prisma.invoice.findFirst({
      where: { clientId, supplierId: supplier.id, type: 'supplier', invoiceDate: weekEnd }
    });

    if (!existingInv) {
      await prisma.invoice.create({
        data: {
          clientId,
          supplierId: supplier.id,
          type: 'supplier',
          amount: sup.amount,
          invoiceDate: weekEnd,
          fileName: 'Auto-generated fixed expense',
          filePath: 'none',
          fileType: 'auto',
          ocrStatus: 'done'
        }
      });
    }
  }

  // 3. UTILITIES & FIXED EXPENSES (£713.98)
  const expensesToAdd = [
    { category: 'utilities', subcategory: 'Fuel', amount: 150.00 },
    { category: 'utilities', subcategory: 'Electricity, Gas, Water', amount: 150.00 },
    { category: 'rent', subcategory: 'Rent', amount: 325.00 },
    { category: 'utilities', subcategory: 'Bin Collection', amount: 27.75 },
    { category: 'utilities', subcategory: 'Internet', amount: 17.00 },
    { category: 'marketing', subcategory: 'Social Media', amount: 25.00 },
    { category: 'marketing', subcategory: 'Website', amount: 19.23 }
  ];

  for (const e of expensesToAdd) {
    const existingExp = await prisma.expense.findFirst({
      where: { clientId, category: e.category, subcategory: e.subcategory, date: weekEnd }
    });

    if (!existingExp) {
      await prisma.expense.create({
        data: {
          clientId,
          category: e.category,
          subcategory: e.subcategory,
          amount: e.amount,
          date: weekEnd,
          period: 'weekly',
          store: 'Hungry Birds'
        }
      });
    }
  }

  // 4. WALK IN CASH SALES (£500)
  const existingSale = await prisma.sale.findFirst({
    where: { clientId, platform: 'Walk In Cash', weekEnd: weekEnd }
  });

  if (!existingSale) {
    await prisma.sale.create({
      data: {
        clientId,
        platform: 'Walk In Cash',
        store: 'Hungry Birds',
        weekStart: weekStart,
        weekEnd: weekEnd,
        grossSales: 500,
        netPaid: 500,
        totalOrders: 25,
        commission: 0,
        vat: 0,
        adminFee: 0,
        topRankFee: 0,
        refunds: 0,
        cashOrders: 500,
        otherFees: 0,
        is2025: false,
        notes: 'Auto-generated fixed weekly Walk-in Cash Sales'
      }
    });
  }

  console.log(`Generated auto-fill expenses for week ending ${weekEnd.toISOString().split('T')[0]}`);
}

async function main() {
  await autoFillWeek('2026-08-09');
  await autoFillWeek('2026-08-16');
  console.log('SUCCESS: Auto-filled all missing August weeks!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
