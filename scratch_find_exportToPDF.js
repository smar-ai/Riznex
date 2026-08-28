const fs = require('fs');
const path = require('path');

const rootDir = 'E:\\Sales Software\\restaurant-dashboard';

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fullPath.includes('node_modules') || fullPath.includes('.next') || fullPath.includes('henley')) continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('exportToPDF')) {
        console.log(`FOUND IN: ${fullPath}`);
      }
    }
  }
}

searchDir(rootDir);
