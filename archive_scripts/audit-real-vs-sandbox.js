const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log("=== DATA AUDIT: REAL VS SANDBOX ===");

  for (const is2025 of [false, true]) {
    const label = is2025 ? "SANDBOX (is2025: true)" : "REAL / ACTIVE (is2025: false)";
    console.log(`\n========================================`);
    console.log(`STATUS FOR: ${label}`);
    console.log(`========================================`);

    // Sales Summary
    const salesSummary = await prisma.sale.aggregate({
      where: { is2025 },
      _min: { weekStart: true, weekEnd: true },
      _max: { weekStart: true, weekEnd: true },
      _count: { id: true }
    });
    console.log(`Sales:`);
    console.log(`  Count: ${salesSummary._count.id}`);
    console.log(`  Min Date: ${salesSummary._min.weekStart?.toISOString().split('T')[0] || 'None'}`);
    console.log(`  Max Date: ${salesSummary._max.weekEnd?.toISOString().split('T')[0] || 'None'}`);

    // Wages
    const wagesSummary = await prisma.staffWage.aggregate({
      where: { is2025 },
      _min: { weekEnd: true },
      _max: { weekEnd: true },
      _count: { id: true }
    });
    console.log(`Wages:`);
    console.log(`  Count: ${wagesSummary._count.id}`);
    console.log(`  Min Date: ${wagesSummary._min.weekEnd?.toISOString().split('T')[0] || 'None'}`);
    console.log(`  Max Date: ${wagesSummary._max.weekEnd?.toISOString().split('T')[0] || 'None'}`);

    // Expenses
    const expensesSummary = await prisma.expense.aggregate({
      where: { is2025, period: { not: 'template' } },
      _min: { date: true },
      _max: { date: true },
      _count: { id: true }
    });
    console.log(`Expenses:`);
    console.log(`  Count: ${expensesSummary._count.id}`);
    console.log(`  Min Date: ${expensesSummary._min.date?.toISOString().split('T')[0] || 'None'}`);
    console.log(`  Max Date: ${expensesSummary._max.date?.toISOString().split('T')[0] || 'None'}`);

    // Invoices
    const invoicesSummary = await prisma.invoice.aggregate({
      where: { is2025 },
      _min: { invoiceDate: true },
      _max: { invoiceDate: true },
      _count: { id: true }
    });
    console.log(`Invoices:`);
    console.log(`  Count: ${invoicesSummary._count.id}`);
    console.log(`  Min Date: ${invoicesSummary._min.invoiceDate?.toISOString().split('T')[0] || 'None'}`);
    console.log(`  Max Date: ${invoicesSummary._max.invoiceDate?.toISOString().split('T')[0] || 'None'}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
