const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const ids = ['client-2', 'client-3', 'client-4', 'client-5'];
  await prisma.user.deleteMany({where: {clientId: {in: ids}}});
  await prisma.client.deleteMany({where: {id: {in: ids}}});
  console.log('Deleted dummy clients and users');
}
main().finally(()=>prisma.$disconnect());
