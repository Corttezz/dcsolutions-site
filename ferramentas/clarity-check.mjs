// uso: node ferramentas/clarity-check.mjs <base_url>
// Confere o Clarity COM cookies (13/11): tag carregada, /collect saindo, nenhum erro de CSP e _clck/_clsk gravados no domínio do site.
import { createRequire } from 'module';
const require = createRequire('E:/dev/projects/Tiktok-accounts/package.json');
const { chromium } = require('playwright-core');
const BASE = process.argv[2].replace(/\/$/, '');
const ROTAS = ['/', '/about', '/press', '/privacy', '/terms', '/blog/', '/blog/what-is-an-mvp', '/nao-existe'];
const LAUNCH_OPTS = JSON.parse(process.env.LAUNCH_OPTS || '{}');
const b = await chromium.launch(LAUNCH_OPTS);
let falhas = 0;
for (const r of ROTAS) {
  const ctx = await b.newContext();
  const pg = await ctx.newPage();
  const erros = [], clarity = [];
  pg.on('console', (m) => { if (m.type() === 'error' && !(r === '/nao-existe' && /404/.test(m.text()))) erros.push(m.text().slice(0, 160)); });
  pg.on('pageerror', (e) => erros.push(String(e).slice(0, 160)));
  pg.on('request', (q) => { const u = new URL(q.url()); if (/clarity\.ms$|bing\.com$/.test(u.hostname)) clarity.push(u.hostname + (u.pathname.startsWith('/collect') ? '/collect' : u.pathname.replace(/\/[^/]+$/, '/…'))); });
  await pg.goto(BASE + r, { waitUntil: 'load' });
  await pg.mouse.move(100, 200); await pg.mouse.wheel(0, 800); await pg.waitForTimeout(3000); await pg.mouse.click(5, 300); await pg.waitForTimeout(4000);
  const cookies = (await ctx.cookies()).map((c) => c.name + '@' + c.domain);
  const consent = await pg.evaluate(() => new Promise((res) => { try { window.clarity('metadata', (d, u, c) => res(c ?? null), false, true, true); setTimeout(() => res('sem resposta'), 2000); } catch (e) { res('erro ' + e); } }));
  const collect = clarity.some((x) => x.endsWith('/collect'));
  const site = new URL(BASE).hostname;
  const proprios = ['_clck', '_clsk'].every((n) => cookies.some((c) => c.startsWith(n + '@') && c.includes(site)));
  const ok = !erros.length && proprios && collect;
  if (!ok) falhas++;
  console.log(ok ? 'OK ' : 'FALHA', r, '| hosts', [...new Set(clarity)].join(' '), '| cookies', cookies.length ? cookies.join(',') : 0, '| consent', JSON.stringify(consent), erros.length ? '| erros ' + erros.join(' || ') : '');
  await ctx.close();
}
await b.close();
console.log('falhas:', falhas);
process.exit(falhas ? 1 : 0);
