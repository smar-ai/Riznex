const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  for (let id of ['client-2', 'client-3', 'client-4', 'client-5']) {
    const s = await prisma.sale.count({where:{clientId: id}});
    const e = await prisma.expense.count({where:{clientId: id}});
    const i = await prisma.invoice.count({where:{clientId: id}});
    console.log(id, 'sales:', s, 'expenses:', e, 'invoices:', i);
  }
}
main().finally(()=>prisma.$disconnect());
