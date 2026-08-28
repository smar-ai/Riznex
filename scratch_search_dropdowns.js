const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('E:/Sales Software/restaurant-dashboard/app');
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('All Platforms') || content.includes('Walk In Cash') || content.includes('Walk-in Cash') || content.includes('POS Sales')) {
    console.log('FOUND IN:', f);
    const lines = content.split('\n');
    lines.forEach((l, idx) => {
      if (l.includes('All Platforms') || l.includes('Walk In Cash') || l.includes('POS Sales') || l.includes('In-Store POS')) {
        console.log(`  L${idx + 1}: ${l.trim()}`);
      }
    });
  }
});
