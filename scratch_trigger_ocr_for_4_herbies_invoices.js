const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ids = [
    'cmt2yrboe004jwkv4l61sswn8', // Herbies POS 04 April 26.pdf
    'cmt2yrbk9004hwkv4dicbv171', // Herbies POS 04 April 19.pdf
    'cmt2yrbgy004fwkv4ceq05yn2', // Herbies POS 04 April 12.pdf
    'cmt2yrbd0004dwkv46srkuin6'  // Herbies POS 04 April 05.pdf
  ];

  console.log(`\n=== TRIGGERING OCR FOR 4 HERBIES POS INVOICES ===\n`);

  for (const id of ids) {
    console.log(`Sending POST to http://localhost:3000/api/invoices/${id}/ocr ...`);
    try {
      const res = await fetch(`http://localhost:3000/api/invoices/${id}/ocr`, {
        method: 'POST'
      });
      const data = await res.json();
      console.log(`Result for ${id}:`, data);
    } catch (e) {
      console.error(`Error for ${id}:`, e.message);
    }
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
