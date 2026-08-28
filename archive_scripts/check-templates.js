const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.expense.findMany({
    where: { period: 'template' }
  });
  console.log("Templates found:", templates.length);
  templates.forEach(t => {
    console.log(`- ${t.category}: £${t.amount} (${t.subcategory || 'no subcategory'})`);
  });
}
main().catch(console.error);
