// Variantes de 330 e 540 px das telas da v4 (SEO DC-8, 13/11): reduz cada *-780.webp no navegador.
// O srcset passa a 330w, 390w, 540w, 780w, e o celular com DPR ~1,75-2 deixa de baixar imagem maior que a exibida.
// uso: node ferramentas/telas-menores.mjs
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire('E:/dev/projects/Tiktok-accounts/package.json');
const { chromium } = require('playwright-core');
const DIR = 'src/assets/v4/telas';
const b = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });
const p = await (await b.newContext()).newPage();
for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith('-780.webp'))) {
  const src = 'data:image/webp;base64,' + fs.readFileSync(path.join(DIR, f)).toString('base64');
  for (const W of [330, 540]) {
  const d = await p.evaluate(async ([src, w]) => {
    const i = new Image(); i.src = src; await i.decode();
    const h = Math.round(w * i.height / i.width), c = document.createElement('canvas');
    c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(i, 0, 0, w, h);
    return c.toDataURL('image/webp', 0.85);
  }, [src, W]);
  const out = path.join(DIR, f.replace('-780.webp', '-' + W + '.webp'));
  fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64'));
  console.log(out, fs.statSync(out).size);
  }
}
await b.close();
