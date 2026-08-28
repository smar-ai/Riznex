const fs = require('fs');
const path = require('path');

const src = 'C:/Users/syedq/.gemini/antigravity/brain/fff3c3be-ce4e-49ff-b76d-5be74530568c/.user_uploaded/media_1787308952237.jpg';
const target = path.join(process.cwd(), 'public', 'logos', 'tasty-bun.jpg');

fs.copyFileSync(src, target);
console.log('Successfully updated public/logos/tasty-bun.jpg with new high-res logo!');
