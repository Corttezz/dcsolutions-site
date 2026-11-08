// Grimoire na vitrine v3: pacote v2 oficial (Grimoire Lead, 08/11) -> src/assets/v3/grimoire/.
// Capa: recorte do 06_crossroads. Telas: 01, 02, 03 e 04. Wordmark e ícone oficiais.
// uso: node ferramentas/grimoire-v3.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire('E:/dev/projects/Tiktok-accounts/package.json');
const { chromium } = require('playwright-core');

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(R, 'src/assets/v3/grimoire');
const SHOTS = 'E:/dev/projects/card-game-trailer/steam/store/v2/screenshots/en/';
const MARCA = 'E:/dev/projects/card-game-love2d/assets/branding/';
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });
const p = await b.newPage();
// recorta (x, y, w, h no original) e exporta webp em várias larguras
async function webp(arquivo, nome, larguras, corte, q = 0.82) {
  const src = 'data:image/png;base64,' + fs.readFileSync(arquivo).toString('base64');
  for (const w of larguras) {
    const [d, h] = await p.evaluate(async ([src, w, corte, q]) => {
      const i = new Image(); i.src = src; await i.decode();
      const [cx, cy, cw, ch] = corte || [0, 0, i.width, i.height];
      const c = document.createElement('canvas'); c.width = w; c.height = Math.round(ch * w / cw);
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
      x.drawImage(i, cx, cy, cw, ch, 0, 0, c.width, c.height);
      return [c.toDataURL('image/webp', q), c.height];
    }, [src, w, corte, q]);
    fs.writeFileSync(path.join(OUT, `${nome}-${w}.webp`), Buffer.from(d.split(',')[1], 'base64'));
    console.log(nome, w + 'x' + h);
  }
}
// capa: céu, montanhas, castelo e a bifurcação, sem a moldura de CRT nem a barra do topo
await webp(SHOTS + '06_crossroads.png', 'capa', [800, 1600], [110, 150, 1700, 567]);
for (const f of ['01_combat_hand', '02_boss_tyrant', '03_frost_combo', '04_shop']) await webp(SHOTS + f + '.png', f, [480, 960]);
await webp(MARCA + 'icon.png', 'icone', [112]);
fs.copyFileSync(MARCA + 'wordmark.png', path.join(OUT, 'wordmark.png'));
await b.close();
console.log('ok');
