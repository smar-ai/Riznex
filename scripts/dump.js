const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');

async function run() {
  const sales = await prisma.sale.findMany({
    where: { 
      is2025: false,
      platform: { contains: 'Deliveroo' },
      notes: { not: 'Fixed by Emergency Deliveroo OCR Rescan' }
    },
    include: { invoice: true }
  });
  
  for (const s of sales) {
    console.log('\n---', s.id, '---');
    if (s.invoice && s.invoice.filePath) {
      try {
        const p = path.join('public', s.invoice.filePath);
        const data = await pdf(fs.readFileSync(p));
        console.log(data.text.replace(/\n/g, ' '));
      } catch(e) {
        console.error('Error', e.message);
      }
    }
  }
}

run().catch(console.error).finally(()=>prisma.$disconnect());
