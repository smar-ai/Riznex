const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const supplier = await prisma.supplier.findFirst({where: {name: 'Others'}});
  const invoices = await prisma.invoice.findMany({ where: { supplierId: supplier.id } });
  console.table(invoices.map(i => ({ id: i.id, date: i.invoiceDate, amount: i.amount })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
