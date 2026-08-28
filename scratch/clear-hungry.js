const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hungryBirds = await prisma.client.findFirst({
    where: { name: { contains: 'Hungry' } }
  });

  if (!hungryBirds) {
    console.log("Hungry Birds client not found.");
    return;
  }

  const clientId = hungryBirds.id;

  console.log("Found Hungry Birds client. ID:", clientId);
  console.log("Deleting all data for Hungry Birds...");

  // Delete records in the correct order to respect foreign keys if any
  const deletedSales = await prisma.sale.deleteMany({ where: { clientId } });
  console.log(`Deleted ${deletedSales.count} Sales.`);

  const deletedExpenses = await prisma.expense.deleteMany({ where: { clientId } });
  console.log(`Deleted ${deletedExpenses.count} Expenses.`);

  const deletedWages = await prisma.staffWage.deleteMany({ where: { clientId } });
  console.log(`Deleted ${deletedWages.count} Staff Wages.`);

  const deletedStocks = await prisma.stock.deleteMany({ where: { clientId } });
  console.log(`Deleted ${deletedStocks.count} Stock counts.`);

  const deletedStaff = await prisma.staff.deleteMany({ where: { clientId } });
  console.log(`Deleted ${deletedStaff.count} Staff members.`);

  // Invoices might be tied to suppliers or sales, but sales/expenses are deleted now
  const deletedInvoices = await prisma.invoice.deleteMany({ where: { clientId } });
  console.log(`Deleted ${deletedInvoices.count} Invoices.`);

  const deletedSuppliers = await prisma.supplier.deleteMany({ where: { clientId } });
  console.log(`Deleted ${deletedSuppliers.count} Suppliers.`);

  console.log("Data clearing for Hungry Birds complete! The Client and User login remain intact.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
