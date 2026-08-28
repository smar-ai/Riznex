const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const heroSupplier = await prisma.supplier.findFirst({
    where: { name: { contains: 'hero' } }
  });

  if (!heroSupplier) {
    console.log("Hero Cleaning supplier not found!");
    return;
  }

  // Find all Weekly expenses for Hero Cleaning
  const heroExpenses = await prisma.expense.findMany({
    where: { subcategory: 'Hero Cleaning', period: 'weekly' }
  });

  console.log(`Found ${heroExpenses.length} Hero Cleaning expenses. Converting to Invoices...`);

  for (const exp of heroExpenses) {
    await prisma.invoice.create({
      data: {
        clientId: exp.clientId,
        is2025: exp.is2025,
        type: 'supplier',
        supplierId: heroSupplier.id,
        platform: heroSupplier.franchise,
        amount: exp.amount,
        invoiceDate: exp.date,
        fileName: 'Auto-Generated Fixed Cost',
        filePath: 'none',
        fileType: 'system',
        ocrStatus: 'done',
        notes: 'Converted from auto-expense to supplier invoice'
      }
    });

    // Delete the expense so it doesn't double-count
    await prisma.expense.delete({ where: { id: exp.id } });
  }

  // Find the template
  const heroTemplate = await prisma.expense.findFirst({
    where: { subcategory: 'Hero Cleaning', period: 'template' }
  });

  if (heroTemplate) {
    // Delete the template to prevent confusion
    await prisma.expense.delete({ where: { id: heroTemplate.id } });
    console.log("Deleted Hero Cleaning from Auto-Expenses template to prevent double counting.");
  }

  console.log("Done! Converted 13 records to Supplier Invoices.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
