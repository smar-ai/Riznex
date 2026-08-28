const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const deleted = await prisma.staffWage.deleteMany({ where: { is2025: true } });
  console.log(`Deleted ${deleted.count} wage records.`);
}

main().finally(() => prisma.$disconnect())
