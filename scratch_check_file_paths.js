const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const path = require('path');

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  const is2025 = false;

  const herbiesInvoices = await prisma.invoice.findMany({
    where: { clientId, is2025, fileName: { contains: 'Herbies' }, type: 'pos' }
  });

  console.log(`\n=== PARSING HERBIES POS PDFS LOCALLY WITH PDF-WORKER ===\n`);

  for (const inv of herbiesInvoices) {
    const fullPath = path.join(process.cwd(), 'public', inv.filePath);
    console.log(`Invoice ${inv.fileName} -> Path: ${fullPath}`);
    try {
      const { stdout } = await exec(`node scripts/pdf-worker.js "${fullPath}"`);
      const res = JSON.parse(stdout.trim());
      if (res.success) {
        const text = res.text;
        console.log(`\nExtracted PDF Text Length for ${inv.fileName}: ${text.length} chars`);

        // Parse Sales per channel report
        const channelMatch = text.match(/Sales per channel report[\s\S]+?(?=Report|Operational report|$)/i);
        if (channelMatch) {
          console.log(`Found Sales per channel report!`);
          const block = channelMatch[0];
          console.log(block);
        }
      }
    } catch (e) {
      console.error(`Error parsing ${inv.fileName}:`, e.message);
    }
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
