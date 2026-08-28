const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function main() {
  const jj = await prisma.invoice.findFirst({
    where: { fileName: 'Supplier JJ Foods June 29.pdf', amount: null }
  });

  const actualPath = path.join('E:\\restaurant-dashboard\\public', jj.filePath.replace(/\//g, '\\'));
  console.log("Path:", actualPath);
  
  const pdfParse = (await import('pdf-parse')).default;
  const buffer = fs.readFileSync(actualPath);
  const pdfData = await pdfParse(buffer);
  
  console.log("=== FULL TEXT ===");
  console.log(pdfData.text);
}

main().catch(console.error).finally(() => prisma.$disconnect());
