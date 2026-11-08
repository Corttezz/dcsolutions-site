// Imagens da marca da v3 (logo B "Anel", aprovado pelo Daniel em 08/11):
// - src/assets/v3/og.jpg e og-en.jpg (1200x630), com os 6 nomes do catálogo
// - src/assets/v3/apple-touch-icon.png (180x180)
// - src/assets/v3/marca/icone-{16,32,48,192,512}.png e favicon.ico (16, 32 e 48 em PNG dentro do ICO)
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
const MARCA = path.join(OUT, 'marca');
const b64 = (f) => fs.readFileSync(path.join(S, f)).toString('base64');
const dataUrl = (f) => 'data:image/' + (f.endsWith('.svg') ? 'svg+xml' : 'webp') + ';base64,' + b64(f);
const fontes = `@font-face{font-family:BC;font-weight:700;src:url(data:font/woff2;base64,${b64('assets/fonts/barlow-cond-700.woff2')})}
@font-face{font-family:BC;font-weight:600;src:url(data:font/woff2;base64,${b64('assets/fonts/barlow-cond-600.woff2')})}
@font-face{font-family:B;src:url(data:font/woff2;base64,${b64('assets/fonts/barlow-400.woff2')})}`;
const anel = (cor) => `<svg viewBox="0 0 48 48"><path d="M37 13.1A17 17 0 1 0 37 34.9" fill="none" stroke="${cor}" stroke-width="6"/><path d="M16.5 15.5H23A8.5 8.5 0 0 1 23 32.5H16.5Z" fill="${cor}"/></svg>`;

// [fundo, texto, nome, logo, rotação]
const TAGS = [
  ['#3a34c4', '#f7f5f0', 'IQNorth', 'assets/v3/logos/iqnorth.svg', -1.5],
  ['#84cc16', '#06080f', 'Fytform', 'assets/v3/logos/fytform.svg', 1],
  ['#f6b73c', '#14201b', 'H2HScout', 'assets/v3/logos/h2hscout.svg', -1],
  ['#2a1a12', '#efe2c4', 'Grimoire', 'assets/v3/grimoire/icone-112.webp', 1.5],
  ['#0f2a28', '#e6fffb', 'PartiuGringa', 'assets/logos/partiugringa.svg', -1],
  ['#e7efe9', '#0f3a31', 'Ismeire Cortez', 'assets/v3/logos/ismeire.svg', 1],
];
const og = (titulo) => `<html><head><style>${fontes}
body{margin:0;width:1200px;height:630px;background:#1f2d4d;color:#f1f2ee;font-family:B;position:relative;overflow:hidden}
.m{position:absolute;left:72px;top:56px;display:flex;align-items:center;gap:14px;font:600 36px BC}.m svg{width:52px;height:52px}
h1{position:absolute;left:72px;top:140px;margin:0;font:700 96px/.92 BC;max-width:11em}
.v{position:absolute;left:0;right:0;top:384px;border-top:2px dashed rgba(241,242,238,.4)}
ul{position:absolute;left:72px;right:72px;top:398px;margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(3,1fr);gap:16px 20px}
li{height:84px;border-radius:6px;padding:0 22px;display:flex;align-items:center;gap:14px;font:700 34px BC;position:relative;transform-origin:50% -20px}
li::after{content:"";position:absolute;inset:7px;border:1.5px dashed currentColor;opacity:.45;border-radius:3px}
li img{width:44px;height:44px;border-radius:10px;object-fit:contain}
</style></head><body><div class="m">${anel('#f1f2ee')}DC Solutions</div><h1>${titulo}</h1><div class="v"></div>
<ul>${TAGS.map(([bg, fg, n, l, r]) => `<li style="background:${bg};color:${fg};transform:rotate(${r}deg)"><img src="${dataUrl(l)}">${n}</li>`).join('')}</ul></body></html>`;

const icone = (px, raio) => `<html><head><style>body{margin:0;width:${px}px;height:${px}px;background:transparent}
div{width:${px}px;height:${px}px;border-radius:${raio}px;background:#1f2d4d;display:grid;place-items:center}svg{width:${Math.round(px * 0.8)}px;height:${Math.round(px * 0.8)}px}</style></head>
<body><div>${anel('#f1f2ee')}</div></body></html>`;

const b = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
for (const [arq, titulo] of [['og.jpg', 'Produtos pequenos, feitos para resolver uma coisa.'], ['og-en.jpg', 'Small products, made to solve one thing.']]) {
  await p.setContent(og(titulo));
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(OUT, arq), type: 'jpeg', quality: 86 });
}
// apple-touch: quadrado cheio (o iOS arredonda sozinho); favicons: cantos arredondados e fundo transparente
const pngs = {};
for (const [px, raio, nome] of [[180, 0, null], [16, 3, 16], [32, 6, 32], [48, 10, 48], [192, 40, 192], [512, 106, 512]]) {
  await p.setViewportSize({ width: px, height: px });
  await p.setContent(icone(px, raio));
  const buf = await p.screenshot({ omitBackground: true });
  if (nome === null) fs.writeFileSync(path.join(OUT, 'apple-touch-icon.png'), buf);
  else { pngs[nome] = buf; fs.writeFileSync(path.join(MARCA, `icone-${nome}.png`), buf); }
}
await b.close();
// favicon.ico com PNGs dentro (formato aceito por todos os navegadores atuais)
const tam = [16, 32, 48];
const cab = Buffer.alloc(6 + 16 * tam.length);
cab.writeUInt16LE(0, 0); cab.writeUInt16LE(1, 2); cab.writeUInt16LE(tam.length, 4);
let pos = cab.length;
tam.forEach((t, i) => {
  const o = 6 + 16 * i;
  cab.writeUInt8(t, o); cab.writeUInt8(t, o + 1); cab.writeUInt8(0, o + 2); cab.writeUInt8(0, o + 3);
  cab.writeUInt16LE(1, o + 4); cab.writeUInt16LE(32, o + 6);
  cab.writeUInt32LE(pngs[t].length, o + 8); cab.writeUInt32LE(pos, o + 12);
  pos += pngs[t].length;
});
fs.writeFileSync(path.join(MARCA, 'favicon.ico'), Buffer.concat([cab, ...tam.map((t) => pngs[t])]));
console.log('ok');
