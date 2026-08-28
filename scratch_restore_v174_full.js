const fs = require('fs');
const path = 'C:/Users/syedq/.gemini/antigravity/brain/fff3c3be-ce4e-49ff-b76d-5be74530568c/.system_generated/logs/transcript_full.jsonl';
const lines = fs.readFileSync(path, 'utf8').split('\n');

const obj = JSON.parse(lines[174]);
const toolCalls = obj.planner_response?.tool_calls || obj.tool_calls || [];

toolCalls.forEach(tc => {
  if (tc.name === 'write_to_file' || tc.name === 'replace_file_content') {
    let code = tc.args.CodeContent || tc.args.ReplacementContent || '';
    if (!code.startsWith("'use client'")) {
      code = "'use client'\n" + code;
    }
    console.log('Restoring version 174 length:', code.length);
    fs.writeFileSync('E:/Sales Software/restaurant-dashboard/app/dashboard/HungryBirdsDashboard.tsx', code);
    console.log('Successfully restored version 174 of HungryBirdsDashboard.tsx!');
  }
});
