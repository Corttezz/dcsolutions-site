// Gera gerado/og.jpg (1200x630) e gerado/apple-touch-icon.png (180x180) a partir de HTML.
// uso: node ferramentas/gerar-imagens.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire('E:/dev/projects/Tiktok-accounts/package.json');
const { chromium } = require('playwright-core');

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const S = path.join(R, 'src');
const G = path.join(R, 'gerado');
fs.mkdirSync(G, { recursive: true });
const b64 = (f) => fs.readFileSync(path.join(S, f)).toString('base64');
const marca = fs.readFileSync(path.join(S, 'assets/marca.svg'), 'utf8');
const fontes = `@font-face{font-family:IS;src:url(data:font/woff2;base64,${b64('assets/fonts/sans.woff2')})}
@font-face{font-family:IF;font-style:italic;src:url(data:font/woff2;base64,${b64('assets/fonts/serif-italic.woff2')})}`;

const og = `<html><head><style>${fontes}
body{margin:0;width:1200px;height:630px;background:#0c0c0d;color:#f4f1ea;font-family:IS;position:relative;overflow:hidden}
body::before{content:"";position:absolute;inset:-30% -10% auto;height:120%;background:radial-gradient(55% 50% at 50% 35%,rgba(255,122,89,.22),transparent 70%)}
.m{position:absolute;left:72px;top:64px;display:flex;align-items:center;gap:14px;font-size:30px;font-weight:600;letter-spacing:-.02em}
.m svg{width:46px;height:46px}.m span{color:#b9b5ac;font-weight:500}
h1{position:absolute;left:72px;right:72px;top:190px;margin:0;font-size:88px;line-height:1;letter-spacing:-.045em;font-weight:500}
em{font-family:IF;font-weight:400;color:#ff7a59;letter-spacing:-.02em}
p{position:absolute;left:72px;bottom:64px;margin:0;font-size:28px;color:#b9b5ac}
p b{color:#f4f1ea;font-weight:600}
</style></head><body><div class="m">${marca}<div>DC <span>Solutions</span></div></div>
<h1>Produtos digitais que fazem <em>uma coisa</em> muito <em>bem</em>.</h1>
<p><b>IQNorth</b> · <b>Fytform</b> · <b>H2HScout</b> &nbsp;—&nbsp; dcsolutions.app</p></body></html>`;

const icone = `<html><head><style>body{margin:0;width:180px;height:180px;background:#ff7a59}svg{width:180px;height:180px}</style></head><body>${marca.replace('rx="8"', 'rx="0"')}</body></html>`;

const b = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(og);
await p.waitForTimeout(400);
await p.screenshot({ path: path.join(G, 'og.jpg'), type: 'jpeg', quality: 86 });
await p.setViewportSize({ width: 180, height: 180 });
await p.setContent(icone);
await p.screenshot({ path: path.join(G, 'apple-touch-icon.png') });
await b.close();
console.log('ok');
