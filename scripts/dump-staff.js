const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const staff = await prisma.staff.findMany();
  console.log(staff.map(s => `${s.name} - ${s.store}`));
}
run().finally(()=>prisma.$disconnect());
