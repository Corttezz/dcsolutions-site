// uso: node ferramentas/gtm-check.mjs <base_url>  (env ROTAS=/a,/b; LAUNCH_OPTS com o executablePath do Edge)
// Confere o GTM (GOOGLE-1): gtm.js carregado, consent default no dataLayer, collect do GA4 (g/collect), cookies _ga e nenhum erro de CSP.
import { createRequire } from 'module';
const require = createRequire('E:/dev/projects/Tiktok-accounts/package.json');
const { chromium } = require('playwright-core');
const BASE = process.argv[2].replace(/\/$/, '');
const ROTAS = process.env.ROTAS ? process.env.ROTAS.split(',') : ['/', '/blog/what-is-an-mvp'];
const b = await chromium.launch(JSON.parse(process.env.LAUNCH_OPTS || '{}'));
let falhas = 0;
for (const r of ROTAS) {
  const ctx = await b.newContext(); const pg = await ctx.newPage();
  const erros = [], reqs = [];
  pg.on('console', (m) => { if (m.type() === 'error') erros.push(m.text().slice(0, 200)); });
  pg.on('request', (q) => { const u = new URL(q.url()); if (/googletagmanager|google-analytics|analytics\.google|doubleclick/.test(u.hostname)) reqs.push(u.hostname + u.pathname + (u.pathname.endsWith('/collect') ? '?en=' + (u.searchParams.get('en') || '') + '&gcs=' + (u.searchParams.get('gcs') || '') : '')); });
  pg.on('response', (q) => { if (/googletagmanager/.test(q.url()) && q.status() >= 400) erros.push(q.status() + ' ' + q.url()); });
  await pg.goto(BASE + r, { waitUntil: 'load' });
  await pg.mouse.wheel(0, 900); await pg.waitForTimeout(6000);
  const consent = await pg.evaluate(() => (window.dataLayer || []).filter((x) => x && x[0] === 'consent').map((x) => x[1] + ':' + (x[2].region ? 'regiao' + x[2].region.length : 'geral') + ':' + x[2].analytics_storage));
  const cookies = (await ctx.cookies()).filter((c) => c.name.startsWith('_ga')).map((c) => c.name + '@' + c.domain);
  const gtm = reqs.some((x) => x.includes('/gtm.js')), collect = reqs.filter((x) => x.includes('/collect'));
  const ok = gtm && !erros.length;
  if (!ok) falhas++;
  console.log(ok ? 'OK ' : 'FALHA', r, '| gtm.js', gtm, '| consent', consent.join(' '), '| collect', collect.length ? collect.join(' ') : 0, '| cookies', cookies.join(',') || 0, erros.length ? '| erros ' + erros.join(' || ') : '');
  await ctx.close();
}
await b.close(); console.log('falhas:', falhas); process.exit(falhas ? 1 : 0);
