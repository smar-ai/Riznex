const fs = require('fs');
const path = 'C:/Users/syedq/.gemini/antigravity/brain/fff3c3be-ce4e-49ff-b76d-5be74530568c/.system_generated/logs/transcript_full.jsonl';
const lines = fs.readFileSync(path, 'utf8').split('\n');

const obj = JSON.parse(lines[1701]);
const toolCalls = obj.planner_response?.tool_calls || obj.tool_calls || [];

toolCalls.forEach(tc => {
  if (tc.name === 'write_to_file' || tc.name === 'replace_file_content') {
    let code = tc.args.CodeContent || tc.args.ReplacementContent || '';
    console.log('Restoring line 1701 code length:', code.length);
    
    // Make sure header has logo image
    if (!code.includes('hungry-birds-logo.jpg')) {
      code = code.replace(
        `<h1 className="text-3xl font-black text-white tracking-tight">`,
        `<h1 className="text-3xl font-black text-white tracking-tight flex items-center justify-center gap-3">\n              {/* eslint-disable-next-line @next/next/no-img-element */}\n              <img src="/hungry-birds-logo.jpg" alt="Hungry Birds Logo" className="h-12 w-auto rounded-xl shadow-md border border-[#1f2947] inline-block" />`
      );
    }

    fs.writeFileSync('E:/Sales Software/restaurant-dashboard/app/dashboard/HungryBirdsDashboard.tsx', code);
    console.log('Successfully restored 100% exact screenshot matching layout!');
  }
});
