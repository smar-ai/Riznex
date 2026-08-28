const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.expense.delete({
    where: { id: 'cmrqxmc84000vvd546nzkhpc0' }
  });
  console.log('Deleted erroneous wages record');
}
main().catch(console.error);
