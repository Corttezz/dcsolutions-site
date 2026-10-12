import { createRequire } from 'module';
const require = createRequire('E:/dev/projects/Tiktok-accounts/package.json');
const { chromium } = require('playwright-core');
const b = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });
for (const u of process.argv.slice(2)) { const p = await b.newPage(); await p.goto(u, { waitUntil: 'networkidle' }).catch(()=>{}); const t = await p.evaluate(() => document.body.innerText); const f = t.slice(-900).replace(/\s+/g,' '); console.log('==', u, '\n', f); await p.close(); }
await b.close();
