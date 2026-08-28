const fs = require('fs');
const path = require('path');

const rootDir = 'E:\\Sales Software\\restaurant-dashboard';
const excludes = ['node_modules', '.next', '.git', 'scratch', 'henley'];

const matches = [];

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const relPath = path.relative(rootDir, fullPath);

    // Skip excluded dirs or henley
    if (excludes.some(ex => relPath.toLowerCase().includes(ex))) continue;

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.md') || file.endsWith('.html'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.toLowerCase().includes('restaurantiq')) {
        matches.push(fullPath);
      }
    }
  }
}

searchDir(rootDir);
console.log('--- FILES CONTAINING RESTAURANTIQ ---');
matches.forEach(m => console.log(m));
