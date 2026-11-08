// Gera src/assets/v3/og.jpg (1200x630) e src/assets/v3/apple-touch-icon.png (180x180) com a marca nova.
// uso: node ferramentas/gerar-imagens-v3.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire('E:/dev/projects/Tiktok-accounts/package.json');
const { chromium } = require('playwright-core');

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const S = path.join(R, 'src');
const OUT = path.join(S, 'assets/v3');
const b64 = (f) => fs.readFileSync(path.join(S, f)).toString('base64');
const svg = (f) => 'data:image/' + (f.endsWith('.svg') ? 'svg+xml' : 'webp') + ';base64,' + b64(f);
const fontes = `@font-face{font-family:BC;font-weight:700;src:url(data:font/woff2;base64,${b64('assets/fonts/barlow-cond-700.woff2')})}
@font-face{font-family:BC;font-weight:600;src:url(data:font/woff2;base64,${b64('assets/fonts/barlow-cond-600.woff2')})}
@font-face{font-family:B;src:url(data:font/woff2;base64,${b64('assets/fonts/barlow-400.woff2')})}`;
const etq = fs.readFileSync(path.join(S, 'assets/v3/marca/etiqueta.svg'), 'utf8')
  .replace('fill="#1F2D4D"', 'fill="#F1F2EE"').replaceAll('stroke="#F1F2EE"', 'stroke="#1F2D4D"');
const tags = [
  ['#3a34c4', '#f7f5f0', 'IQNorth', 'assets/v3/logos/iqnorth.svg', -2],
  ['#84cc16', '#06080f', 'Fytform', 'assets/v3/logos/fytform.svg', 1.5],
  ['#f6b73c', '#14201b', 'H2HScout', 'assets/v3/logos/h2hscout.svg', -1],
  ['#2a1a12', '#efe2c4', 'Grimoire', 'assets/v3/logos/grimoire.webp', 2],
];
const og = `<html><head><style>${fontes}
body{margin:0;width:1200px;height:630px;background:#1f2d4d;color:#f1f2ee;font-family:B;position:relative;overflow:hidden}
.m{position:absolute;left:72px;top:60px;display:flex;align-items:center;gap:14px;font:600 34px BC}.m svg{width:54px;height:54px}
h1{position:absolute;left:72px;top:150px;margin:0;font:700 104px/.92 BC;max-width:9.5em}
.v{position:absolute;left:0;right:0;top:440px;border-top:2px dashed rgba(241,242,238,.4)}
ul{position:absolute;left:72px;right:72px;top:452px;margin:0;padding:0;list-style:none;display:flex;gap:22px}
li{flex:1;height:140px;border-radius:6px;padding:22px;display:flex;align-items:center;gap:14px;font:700 34px BC;position:relative;transform-origin:50% -20px}
li::after{content:"";position:absolute;inset:8px;border:1.5px dashed currentColor;opacity:.45;border-radius:3px}
li img{width:44px;height:44px;border-radius:10px}
</style></head><body><div class="m">${etq}DC Solutions</div>
<h1>Produtos pequenos, feitos para resolver uma coisa.</h1><div class="v"></div>
<ul>${tags.map(([bg, fg, n, l, r]) => `<li style="background:${bg};color:${fg};transform:rotate(${r}deg)">${l ? `<img src="${svg(l)}">` : ''}${n}</li>`).join('')}</ul></body></html>`;

const ico = fs.readFileSync(path.join(S, 'assets/v3/marca/favicon.svg'), 'utf8').replace('rx="10"', 'rx="0"');
const icone = `<html><head><style>body{margin:0;width:180px;height:180px}svg{width:180px;height:180px}</style></head><body>${ico}</body></html>`;

const b = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(og);
await p.waitForTimeout(500);
await p.screenshot({ path: path.join(OUT, 'og.jpg'), type: 'jpeg', quality: 86 });
await p.setViewportSize({ width: 180, height: 180 });
await p.setContent(icone);
await p.screenshot({ path: path.join(OUT, 'apple-touch-icon.png') });
await b.close();
console.log('ok');
