const fs = require('fs');
const content = fs.readFileSync('E:\\restaurant-dashboard\\app\\api\\invoices\\[id]\\ocr\\route.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('Tasty Bun')) {
    console.log(`Line ${i + 1}: ${line}`);
  }
});
