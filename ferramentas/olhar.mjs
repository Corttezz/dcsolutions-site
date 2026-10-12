// Prints de verificação: celular (390, modo celular de verdade) e desktop (modo desktop, isMobile:false),
// rolando por passos com a roda/dedo, e coleta de erros de console e CLS.
// uso: node ferramentas/olhar.mjs <base_url> <saida_dir> [rotulo]
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire('E:/dev/projects/Tiktok-accounts/package.json');
const { chromium } = require('playwright-core');

const [, , BASE, OUT, ROT = 'local'] = process.argv;
fs.mkdirSync(OUT, { recursive: true });
const PERFIS = [
  { nome: 'cel390', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  { nome: 'desk1440', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { nome: 'desk1366', viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { nome: 'desk1920', viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
];
const PAGS = (process.env.PAGS || '/,/privacidade,/termos').split(',');
const b = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });
let falhas = 0;
for (const pf of PERFIS) {
  if (process.env.SO && !process.env.SO.split(',').includes(pf.nome)) continue;
  const { nome, ...opts } = pf;
  const ctx = await b.newContext({ ...opts, locale: 'pt-BR' });
  for (const pg of PAGS) {
    const p = await ctx.newPage();
    const erros = [];
    p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') erros.push(m.type() + ': ' + m.text()); });
    p.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
    p.on('response', (r) => { if (r.status() >= 400) erros.push('http ' + r.status() + ' ' + r.url()); });
    await p.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    await p.goto(BASE + pg, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1200);
    const tag = `${ROT}-${nome}-${pg === '/' ? 'home' : pg.replace(/\//g, '')}`;
    await p.screenshot({ path: `${OUT}/${tag}-0.png` });
    // rola por passos (roda no desktop, dedo no celular) até o fim, fotografando cada tela
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    const vh = pf.viewport.height;
    let i = 1;
    for (let y = vh * 0.9; y < H; y += vh * 0.9) {
      if (pf.isMobile) await p.evaluate((yy) => window.scrollTo(0, yy), y);
      else { for (let k = 0; k < 6; k++) { await p.mouse.wheel(0, (vh * 0.9) / 6); await p.waitForTimeout(40); } }
      await p.waitForTimeout(700);
      await p.screenshot({ path: `${OUT}/${tag}-${i++}.png` });
    }
    const info = await p.evaluate(() => ({ cls: window.__cls, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    const hscroll = info.sw > info.cw;
    if (erros.length || hscroll || info.cls > 0.001) falhas++;
    console.log(tag, 'telas', i, 'CLS', info.cls.toFixed(4), 'rolagem-horizontal', hscroll, 'erros', erros.length, erros.slice(0, 4).join(' | '));
    await p.close();
  }
  await ctx.close();
}
await b.close();
console.log(falhas ? `FALHAS: ${falhas}` : 'tudo limpo');
