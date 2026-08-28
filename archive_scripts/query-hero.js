const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const searchTerm = 'hero';

  const suppliers = await prisma.supplier.findMany({
    where: { name: { contains: searchTerm } }
  });

  const invoices = await prisma.invoice.findMany({
    where: { 
      OR: [
        { fileName: { contains: searchTerm } },
        { notes: { contains: searchTerm } },
        { platform: { contains: searchTerm } }
      ]
    }
  });

  const expenses = await prisma.expense.findMany({
    where: {
      OR: [
        { category: { contains: searchTerm } },
        { subcategory: { contains: searchTerm } },
        { notes: { contains: searchTerm } }
      ]
    }
  });

  console.log("=== HERO CLEANING SEARCH ===");
  console.log(`Suppliers found: ${suppliers.length}`);
  suppliers.forEach(s => console.log(`- ${s.name} (${s.franchise})`));

  console.log(`\nInvoices found: ${invoices.length}`);
  invoices.forEach(i => console.log(`- ${i.fileName} (Type: ${i.type}, Amount: £${i.amount})`));

  console.log(`\nExpenses found: ${expenses.length}`);
  expenses.forEach(e => console.log(`- £${e.amount} | Cat: ${e.category} | Sub: ${e.subcategory} | Notes: ${e.notes}`));

}

main().catch(console.error).finally(() => prisma.$disconnect());
