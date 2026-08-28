const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const cutoffDate = new Date('2025-10-16T00:00:00.000Z')
  
  // 1. Delete Franchise & POS fees >= Oct 16
  const deletedExpenses = await prisma.expense.deleteMany({
    where: {
      is2025: true,
      category: 'fees',
      date: { gte: cutoffDate },
      OR: [
        { subcategory: 'POS Fee' },
        { subcategory: 'Franchise Fee' }
      ]
    }
  })
  console.log(`Deleted ${deletedExpenses.count} POS and Franchise fees from Expense table.`)

  // 2. Delete Herbies Head office supplier invoices >= Oct 16
  const supplier = await prisma.supplier.findFirst({ where: { name: 'Herbies Head office' } })
  if (!supplier) throw new Error("Could not find Herbies Head office supplier")
  
  const deletedInvoices = await prisma.invoice.deleteMany({
    where: {
      is2025: true,
      supplierId: supplier.id,
      invoiceDate: { gte: cutoffDate }
    }
  })
  console.log(`Deleted ${deletedInvoices.count} Herbies Head office invoices.`)

  // 3. Re-insert POS Fees (Nov, Dec, Jan, Feb, Mar)
  const posMonths = ['2025-11-01', '2025-12-01', '2026-01-01', '2026-02-01', '2026-03-01']
  let createdPOS = 0;
  for (const m of posMonths) {
    await prisma.expense.create({
      data: {
        clientId: supplier.clientId,
        category: 'fees',
        subcategory: 'POS Fee',
        amount: 150,
        period: 'monthly',
        date: new Date(m),
        is2025: true,
        notes: 'Migrated from Invoice'
      }
    })
    createdPOS++;
  }
  console.log(`Created ${createdPOS} POS Fees.`);

  // 4. Re-insert Franchise Fees & Supplier Invoices (Weekly starting Oct 20)
  // Get all Mondays from Oct 16 to Mar 31.
  let currentDate = new Date('2025-10-20T00:00:00.000Z') // First Monday after Oct 16
  const endDate = new Date('2026-03-31T23:59:59.000Z')
  
  let weeksCount = 0;
  let remainingTotal = 24809.77;
  let accumulatedSupplier = 0;
  
  // Calculate exact total weeks to balance the final payment
  let tempDate = new Date('2025-10-20T00:00:00.000Z');
  let totalWeeks = 0;
  while (tempDate <= endDate) {
    totalWeeks++;
    tempDate.setDate(tempDate.getDate() + 7);
  }
  
  const baseSupplierWeekly = Math.round((remainingTotal / totalWeeks) * 100) / 100;
  
  console.log(`Adding ${totalWeeks} weekly Franchise Fees and Supplier Invoices...`);
  
  while (currentDate <= endDate) {
    weeksCount++;
    const dateStr = currentDate.toISOString().substring(0,10)
    
    // Add Franchise Fee
    await prisma.expense.create({
      data: {
        clientId: supplier.clientId,
        category: 'fees',
        subcategory: 'Franchise Fee',
        amount: 250,
        period: 'weekly',
        date: new Date(currentDate),
        is2025: true,
        notes: 'Migrated from Invoice'
      }
    })
    
    // Calculate Supplier Amount
    let supplierAmount = baseSupplierWeekly;
    if (weeksCount === totalWeeks) {
      supplierAmount = remainingTotal - accumulatedSupplier;
      supplierAmount = Math.round(supplierAmount * 100) / 100;
    }
    
    // Add Supplier Invoice
    await prisma.invoice.create({
      data: {
        clientId: supplier.clientId,
        supplierId: supplier.id,
        type: 'supplier',
        platform: null,
        fileName: `Herbies Weekly Supplier Purchase ${dateStr}`,
        fileType: 'manual',
        filePath: 'manual',
        amount: supplierAmount,
        invoiceDate: new Date(currentDate),
        ocrStatus: 'done',
        is2025: true,
        notes: 'Calculated from pool'
      }
    });
    
    accumulatedSupplier += supplierAmount;
    currentDate.setDate(currentDate.getDate() + 7)
  }
  
  console.log(`Created ${weeksCount} Franchise Fees.`);
  console.log(`Created ${weeksCount} Herbies Supplier Invoices. Total: £${accumulatedSupplier.toFixed(2)}`);
}

main().catch(console.error).finally(() => prisma.$disconnect())
