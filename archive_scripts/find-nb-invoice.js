const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const invoices = await prisma.invoice.findMany({
    where: {
      OR: [
        { fileName: { contains: 'NB' } },
        { fileName: { contains: 'N&B' } },
        { amount: 38.27 },
        { amount: 17.27 }
      ]
    }
  });
  console.log("Found Invoices:");
  console.table(invoices.map(i => ({
    id: i.id,
    fileName: i.fileName,
    amount: i.amount,
    date: i.invoiceDate,
    supplierId: i.supplierId,
    createdAt: i.createdAt
  })));

  const suppliers = await prisma.supplier.findMany({
    where: { OR: [{ name: { contains: 'NB' } }, { name: { contains: 'N&B' } }] }
  });
  console.log("Found Suppliers:");
  console.table(suppliers.map(s => ({ id: s.id, name: s.name, category: s.category })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
