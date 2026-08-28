const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('henleypass', 10);
  await prisma.user.update({
    where: { email: 'henley@example.com' },
    data: { password: hash }
  });
  console.log('Updated Henley password to: henleypass');
}
main().finally(() => prisma.$disconnect());
