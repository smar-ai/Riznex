const fs = require('fs');
const path = require('path');

const src1 = 'C:/Users/syedq/.gemini/antigravity/brain/fff3c3be-ce4e-49ff-b76d-5be74530568c/.user_uploaded/media_1787308695318.jpg';
const src2 = 'C:/Users/syedq/.gemini/antigravity/brain/fff3c3be-ce4e-49ff-b76d-5be74530568c/.user_uploaded/media_1787308762105.jpg';

const targetDir = path.join(process.cwd(), 'public', 'logos');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

fs.copyFileSync(src1, path.join(targetDir, 'herbies-pizza.jpg'));
fs.copyFileSync(src2, path.join(targetDir, 'tasty-bun.jpg'));

console.log('Successfully copied logos:');
console.log('- public/logos/herbies-pizza.jpg');
console.log('- public/logos/tasty-bun.jpg');
