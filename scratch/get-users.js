const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      role: true,
      client: { select: { name: true } }
    }
  });

  console.log("Users in Database:");
  users.forEach(u => {
    console.log(`Name: ${u.name}`);
    console.log(`Email: ${u.email}`);
    console.log(`Role: ${u.role}`);
    console.log(`Client: ${u.client ? u.client.name : 'None (Admin)'}`);
    console.log(`Password Hash: ${u.password.substring(0, 15)}... (hashed)`);
    console.log('---');
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
