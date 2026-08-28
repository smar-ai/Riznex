const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const wages = await prisma.staffWage.findMany({ where: { is2025: true }, include: { staff: true } });
  const counts = {};
  wages.forEach(w => {
    const name = w.staff?.name || 'Unknown';
    counts[name] = (counts[name] || 0) + 1;
  });
  console.log('Exact number of payment records in database:');
  console.log(counts);
}

main().finally(() => prisma.$disconnect())
