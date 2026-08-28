const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs'); // Assuming bcryptjs is installed since it's Next Auth standard
const prisma = new PrismaClient();

async function main() {
  const newPassword = 'password123';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const emailsToReset = [
    'admin@riznex.com',
    'hungrybirdsmcr@gmail.com',
    'henley@example.com'
  ];

  for (const email of emailsToReset) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.user.update({
        where: { email },
        data: { password: hashedPassword }
      });
      console.log(`Reset password for ${email}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
