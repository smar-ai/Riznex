const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');

async function run() {
  const sales = await prisma.sale.findMany({
    where: { 
      is2025: false,
      platform: { contains: 'Uber Eats' }
    },
    include: { invoice: true },
    take: 2 // Just take one or two to inspect the layout
  });
  
  for (const s of sales) {
    console.log('\n---', s.id, s.restaurant, '---');
    if (s.invoice && s.invoice.filePath) {
      try {
        const p = path.join('public', s.invoice.filePath);
        const data = await pdf(fs.readFileSync(p));
        console.log(data.text);
      } catch(e) {
        console.error('Error', e.message);
      }
    }
  }
}

run().catch(console.error).finally(()=>prisma.$disconnect());
