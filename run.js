const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();
async function main() {
  const clients = await prisma.client.findMany();
  const users = await prisma.user.findMany();
  fs.writeFileSync('output.json', JSON.stringify({clients, users}, null, 2));
}
main().finally(() => prisma.$disconnect());
