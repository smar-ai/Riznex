const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const client = await prisma.client.findFirst();
  if (!client) {
    console.log("No client found");
    return;
  }
  
  const suppliers = await prisma.supplier.findMany();
  console.log("Current suppliers:", suppliers.map(s => s.name).join(', '));
  
  const existing = await prisma.supplier.findFirst({ where: { name: 'Magna Foodservice' } });
  if (!existing) {
    await prisma.supplier.create({
      data: {
        name: 'Magna Foodservice',
        clientId: client.id
      }
    });
    console.log("Added Magna Foodservice!");
  } else {
    console.log("Magna Foodservice already exists.");
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
