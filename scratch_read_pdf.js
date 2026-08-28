const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

async function parsePdfText() {
  const filePath = 'E:/Sales Software/restaurant-dashboard/public/uploads/client-1/1786925073392-Walkin_Card_May.pdf';
  try {
    const { stdout } = await exec(`node scripts/pdf-worker.js "${filePath}"`);
    console.log('=== FULL PDF RAW EXTRACTED TEXT ===');
    console.log(stdout);
  } catch (err) {
    console.error('PDF Worker Error:', err.message);
  }
}

parsePdfText();
