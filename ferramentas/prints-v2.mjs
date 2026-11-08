// Hotfix da v2 no ar (08/11): troca só imagens, com os mesmos nomes e proporções que a v2 já usa.
// Fytform: plano de exemplo do site público. H2HScout: telas da plataforma enviadas pelo H2H Lead.
// Grimoire: pacote v2 do Grimoire Lead. Texto, layout e flag não mudam.
// uso: node ferramentas/prints-v2.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire('E:/dev/projects/Tiktok-accounts/package.json');
const { chromium } = require('playwright-core');

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRINTS = path.join(R, 'src/assets/prints');
const GRIM = path.join(R, 'src/assets/grimoire');
const H2H = 'E:/dev/projects/h2hscout-landing/landing/img/';
const SHOTS = 'E:/dev/projects/card-game-trailer/steam/store/v2/screenshots/en/';

const b = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });
const conv = await b.newPage();
// recorte [x, y, w, h] no original -> webp nas larguras pedidas
async function webp(buf, mime, dir, nome, larguras, corte = null) {
  const src = 'data:' + mime + ';base64,' + buf.toString('base64');
  for (const w of larguras) {
    const [d, h] = await conv.evaluate(async ([src, w, corte]) => {
      const i = new Image(); i.src = src; await i.decode();
      const [cx, cy, cw, ch] = corte || [0, 0, i.width, i.height];
      const c = document.createElement('canvas'); c.width = w; c.height = Math.round(ch * w / cw);
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(i, cx, cy, cw, ch, 0, 0, c.width, c.height);
      return [c.toDataURL('image/webp', 0.82), c.height];
    }, [src, w, corte]);
    fs.writeFileSync(path.join(dir, `${nome}-${w}.webp`), Buffer.from(d.split(',')[1], 'base64'));
    console.log(nome, w + 'x' + h);
  }
}

// Fytform: proibido preço/PIX no print (o preço fica no texto do card), premium, notas, números de vendas, lojas de app, garantia.
const PROIBIDO = /R\$|PIX|premium|grátis|gratuito|\d[\d.]*\+|\b4[,.]9\b|\b9\d\s?%|satisfa|avalia[cç][aã]o|Play|App Store|APK|garantia|vital[ií]ci|substitui (o )?(personal|nutricionista|médico)/i;
const proibidosNaTela = (p, clip) => p.evaluate(([src, clip]) => {
  const re = new RegExp(src, 'i');
  return [...document.querySelectorAll('body *')].filter((e) => {
    const t = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ');
    const r = e.getBoundingClientRect();
    return re.test(t) && e.checkVisibility() && r.width && r.bottom > clip.y && r.top < clip.y + clip.height && r.right > clip.x && r.left < clip.x + clip.width;
  }).map((e) => e.textContent.trim().slice(0, 60));
}, [PROIBIDO.source, clip]);
async function plano(ctx, clipDe) {
  const p = await ctx.newPage();
  await p.goto('https://fytform.com/', { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(1500);
  await p.getByText(/Estas são as telas do app com um plano de exemplo/).first().evaluate((e) => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, e.getBoundingClientRect().bottom + window.scrollY + 8);
  });
  await p.waitForTimeout(2000);
  const clip = await clipDe(p);
  const vistos = await proibidosNaTela(p, clip);
  if (vistos.length) throw new Error('Fytform com termo proibido no recorte: ' + vistos.join(' | '));
  const png = await p.screenshot({ clip });
  await p.close();
  return png;
}
{
  // celular 1:2 (arco do hero e card): o aparelho do plano de exemplo, centrado
  const cel = await b.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR' });
  const png = await plano(cel, async (p) => {
    const legenda = await p.getByText(/O plano abre no celular/).first().evaluate((e) => e.getBoundingClientRect().top);
    const w = Math.floor(Math.min(Math.floor(legenda - 44), 640) / 2);
    const h = w * 2;
    if (h < 500) throw new Error('Fytform celular: recorte curto demais');
    return { x: Math.round((360 - w) / 2), y: 0, width: w, height: h };
  });
  await webp(png, 'image/png', PRINTS, 'fytform-m', [240, 480]);
  await cel.close();
}
{
  // janela 16:10 do card: a seção do plano de exemplo no desktop
  const dk = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: 'pt-BR' });
  const png = await plano(dk, async (p) => {
    // leva o título da seção para logo abaixo do menu fixo do site, e corta 16:10
    const topo = await p.getByText(/Veja o plano por dentro antes de pagar/).first().evaluate((e) => e.getBoundingClientRect().top);
    await p.evaluate((t) => window.scrollBy(0, t - 110), topo);
    await p.waitForTimeout(1200);
    return { x: 0, y: 0, width: 1280, height: 800 };
  });
  await webp(png, 'image/png', PRINTS, 'fytform-d', [640, 1120]);
  await dk.close();
}

// H2HScout: os prints agora saem de ferramentas/h2h-sem-escudos.mjs (escudos cobertos, 08/11).

// Grimoire (pacote v2). Os nomes de arquivo e os textos alternativos da v2 ficam; cada tela nova bate com o alt do lugar dela.
await webp(fs.readFileSync(SHOTS + '06_crossroads.png'), 'image/png', GRIM, 'hero', [800, 1600], [110, 150, 1700, 549]);
for (const [orig, dest] of [['01_combat_hand', '03_road_battle'], ['02_boss_tyrant', '04_boss_room'], ['04_shop', '05_shop'], ['06_crossroads', '06_road_fork']]) {
  await webp(fs.readFileSync(SHOTS + orig + '.png'), 'image/png', GRIM, dest, [480, 960]);
}
await b.close();
console.log('ok');
