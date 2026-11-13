// Ícone com acabamento (aprovado pelo Daniel em 13/11): degradê no mesmo tom, luz no topo, aro claro e sombra.
// Fonte: pacote do design em C:\Users\corte\OpenBot\Shared\design-icones-mascotes\pacote-icones\dcsolutions\ (icon.svg + PNGs).
// Saída em src/assets/v4/marca/ (endereço novo por causa do cache de 30 dias de /assets):
// - icone-32/48/192/512.png: os PNGs do pacote como vieram
// - icone-16.png: o 16 px da v3 (o acabamento empasta em 16 px: o vão entre o C e o D some)
// - favicon.ico: 16 da v3 + 32 e 48 novos (PNGs dentro do ICO)
// - apple-touch-icon.png (180): quadrado cheio renderizado do icon.svg sem os cantos (o iOS arredonda sozinho
//   e pinta de preto canto transparente; o icon-180.png do pacote tem canto transparente)
// - icon.svg: cópia do pacote, só para referência/press
// uso: node ferramentas/gerar-icones-v4.mjs [pasta_do_pacote]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire('E:/dev/projects/Tiktok-accounts/package.json');
const { chromium } = require('playwright-core');

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAC = process.argv[2] || 'C:/Users/corte/OpenBot/Shared/design-icones-mascotes/pacote-icones/dcsolutions';
const OUT = path.join(R, 'src/assets/v4/marca');
fs.mkdirSync(OUT, { recursive: true });

const pngs = {};
for (const t of [32, 48, 192, 512]) {
  pngs[t] = fs.readFileSync(path.join(PAC, `icon-${t}.png`));
  fs.writeFileSync(path.join(OUT, `icone-${t}.png`), pngs[t]);
}
pngs[16] = fs.readFileSync(path.join(R, 'src/assets/v3/marca/icone-16.png'));
fs.writeFileSync(path.join(OUT, 'icone-16.png'), pngs[16]);
const svg = fs.readFileSync(path.join(PAC, 'icon.svg'), 'utf8');
if (/<script|href="http|xlink:href="http/i.test(svg)) throw new Error('icon.svg com script ou referência externa');
fs.writeFileSync(path.join(OUT, 'icon.svg'), svg);

// apple-touch: mesmo desenho, sem arredondar (clip e aro retos)
const cheio = svg.replace('<rect width="48" height="48" rx="10"/>', '<rect width="48" height="48"/>').replace(/ rx="9\.8125"/, '');
if (cheio === svg) throw new Error('icon.svg mudou: não achei os cantos para tirar');
const b = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });
const p = await b.newPage({ viewport: { width: 180, height: 180 } });
await p.setContent(`<html><body style="margin:0;background:#1f2d4d"><img width="180" height="180" style="display:block" src="data:image/svg+xml;base64,${Buffer.from(cheio).toString('base64')}"></body></html>`);
await p.waitForTimeout(300);
fs.writeFileSync(path.join(OUT, 'apple-touch-icon.png'), await p.screenshot());
await b.close();

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
fs.writeFileSync(path.join(OUT, 'favicon.ico'), Buffer.concat([cab, ...tam.map((t) => pngs[t])]));
console.log('ok', fs.readdirSync(OUT).join(' '));
