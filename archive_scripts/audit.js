const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function auditApi() {
  console.log("=== API AUDIT ===");
  walkDir('E:/restaurant-dashboard/app/api', function(filePath) {
    if (!filePath.endsWith('.ts')) return;
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    let hasClientIdCheck = false;
    let hasSessionCheck = false;
    
    lines.forEach((line, i) => {
      if (line.includes('getServerSession')) hasSessionCheck = true;
      if (line.includes('clientId') || line.includes('session.user.clientId')) hasClientIdCheck = true;
      
      // Check for updates without clientId
      if (line.includes('prisma.') && (line.includes('.update(') || line.includes('.delete('))) {
        // Look ahead 5 lines for clientId
        let safe = false;
        for (let j = 0; j < 5; j++) {
          if (lines[i+j] && (lines[i+j].includes('clientId') || lines[i+j].includes('session.user.clientId'))) safe = true;
        }
        if (!safe) {
          console.log(`[WARNING] Potential IDOR in ${filePath} at line ${i+1}: ${line.trim()}`);
        }
      }
    });
    
    if (!hasSessionCheck && !filePath.includes('auth')) {
      console.log(`[WARNING] No session check in ${filePath}`);
    }
  });
}

function auditFrontend() {
  console.log("\n=== FRONTEND AUDIT ===");
  walkDir('E:/restaurant-dashboard/app/dashboard', function(filePath) {
    if (!filePath.endsWith('.tsx')) return;
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, i) => {
      // Find hardcoded strings that should be dynamic
      if (line.includes('.includes(\'herbies\')') || line.includes('.includes(\'tasty\')')) {
        console.log(`[SMELL] Hardcoded string match in ${filePath} at line ${i+1}`);
      }
      // Find potentially slow renders
      if (line.includes('reduce(') && line.includes('filter(') && line.includes('map(')) {
        console.log(`[PERF] Chained array methods might be slow in ${filePath} at line ${i+1}`);
      }
    });
  });
}

auditApi();
auditFrontend();
