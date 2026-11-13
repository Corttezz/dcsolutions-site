// Prints de perto de cada card de produto (1440 desktop e 390 celular), com as imagens carregadas.
// uso: node ferramentas/cards.mjs <base_url> <saida_dir> [rotulo]
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire('E:/dev/projects/Tiktok-accounts/package.json');
const { chromium } = require('playwright-core');
const [, , BASE, OUT, ROT = 'card'] = process.argv;
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });
for (const [larg, cel] of [[1440, false], [390, true]]) {
  const p = await (await b.newContext({ viewport: { width: larg, height: cel ? 844 : 900 }, deviceScaleFactor: 2, isMobile: cel, hasTouch: cel, locale: 'en-US' })).newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.evaluate(async () => { for (const i of document.images) i.loading = 'eager'; await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); await document.fonts.ready; });
  await p.waitForTimeout(600);
  for (const id of ['iqnorth', 'fytform', 'h2hscout', 'partiugringa', 'ismeire', 'runemoire']) {
    const el = p.locator('#' + id);
    // no celular, só o palco com os aparelhos (o card inteiro é alto demais para ver os detalhes)
    const alvo = cel && id !== 'runemoire' ? el.locator('.palco') : el;
    await alvo.screenshot({ path: `${OUT}/${ROT}-${id}-${larg}.png` });
  }
  console.log(larg, 'ok');
}
await b.close();
