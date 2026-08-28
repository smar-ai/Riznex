const fs = require('fs');

const content = fs.readFileSync('app/api/invoices/[id]/ocr/route.ts', 'utf8');
let openCount = 0;
let closeCount = 0;

for (let i = 0; i < content.length; i++) {
  if (content[i] === '{') openCount++;
  if (content[i] === '}') closeCount++;
}

console.log(`Braces Audit:`);
console.log(`Open '{' count: ${openCount}`);
console.log(`Close '}' count: ${closeCount}`);
console.log(`Difference: ${openCount - closeCount}`);
