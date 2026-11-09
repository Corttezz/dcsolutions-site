// Print de página inteira com todas as imagens carregadas (tira o loading="lazy" antes de capturar).
// uso: node ferramentas/pagina-inteira.mjs <url> <arquivo.png> <largura> [celular 0|1]
// Páginas com mais de ~8000 px de altura: use celular=0 (1x), porque a captura em 2x passa do limite de 16384 px e repete o topo.
import { createRequire } from 'module';
const require = createRequire('E:/dev/projects/Tiktok-accounts/package.json');
const { chromium } = require('playwright-core');
const [, , url, arq, w, cel = '0'] = process.argv;
const m = cel === '1';
const b = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });
const p = await (await b.newContext({ viewport: { width: +w, height: m ? 844 : 900 }, deviceScaleFactor: m ? 2 : 1, isMobile: m, hasTouch: m, locale: 'en-US' })).newPage();
await p.goto(url, { waitUntil: 'networkidle' });
await p.evaluate(async () => {
  for (const i of document.images) i.loading = 'eager';
  await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  await document.fonts.ready;
});
await p.waitForTimeout(800);
const faltam = await p.evaluate(() => [...document.images].filter((i) => !i.complete || !i.naturalWidth).map((i) => i.src));
await p.screenshot({ path: arq, fullPage: true });
console.log(arq, 'imagens sem carregar:', faltam.length, faltam.join(' '));
await b.close();
