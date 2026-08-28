const fs = require('fs');
const pdfParse = require('pdf-parse');

async function run() {
  try {
    const filePath = process.argv[2];
    if (!filePath) {
      console.log(JSON.stringify({ success: false, error: 'No file path provided' }));
      return;
    }
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    console.log(JSON.stringify({ success: true, text: data.text }));
  } catch (error) {
    console.log(JSON.stringify({ success: false, error: error.message || error.toString() }));
  }
}

run();
