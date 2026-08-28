const { execSync } = require('child_process');

try {
  const status = execSync('git status --porcelain', { cwd: 'E:\\Sales Software\\restaurant-dashboard', encoding: 'utf8' });
  console.log('--- GIT STATUS ---');
  console.log(status || 'No modified files in git.');
} catch (e) {
  console.log('Git check failed:', e.message);
}
