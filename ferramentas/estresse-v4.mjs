// Teste de estresse e auditoria da v4 (skills break-ui e impeccable audit, 08/11).
// 1) Auditoria técnica em 390 (celular) e 1440: contraste de cada texto contra o fundo sólido mais próximo,
//    alvos de toque < 24 e < 44 px (celular), ordem dos títulos, imagens sem alt, links sem nome, rolagem lateral.
// 2) Pior caso (break-ui): textos mais longos e plausíveis trocados no DOM (a página é estática, os "dados" são o HTML);
//    zoom 200% = janela de 1280 com zoom do navegador, simulada como 640 px em 2x (os pontos de quebra mudam como no zoom real),
//    imagens dos produtos faltando, larguras 320 e 2560, zoom 200%. Mede o que transborda e salva prints.
// uso: node ferramentas/estresse-v4.mjs <base_url> <saida_dir>
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire('E:/dev/projects/Tiktok-accounts/package.json');
const { chromium } = require('playwright-core');
const [, , BASE, OUT] = process.argv;
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });
const rel = {};

async function abrir(opts, url = '/', bloquear = false) {
  const ctx = await b.newContext({ deviceScaleFactor: 1, locale: 'en-US', ...opts });
  if (bloquear) await ctx.route(/\/assets\/(v4\/(telas|runemoire)|v3\/(logos|grimoire)|logos)\//, (r) => r.abort());
  const p = await ctx.newPage();
  await p.goto(BASE + url, { waitUntil: 'networkidle' });
  await p.evaluate(async () => { for (const i of document.images) i.loading = 'eager'; await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); await document.fonts.ready; });
  return { ctx, p };
}

// ---------- 1) auditoria ----------
const AUDIT = () => {
  const lum = (c) => { const v = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const rgb = (s) => { const m = s.match(/[\d.]+/g); return m ? m.map(Number) : null; };
  const fundo = (e) => {
    for (let x = e; x; x = x.parentElement) {
      const s = getComputedStyle(x);
      if (s.backgroundImage !== 'none') return { img: true, sel: x.className };
      const c = rgb(s.backgroundColor); if (c && (c[3] === undefined || c[3] > 0.95)) return { c };
    }
    return { c: [255, 255, 255] };
  };
  const contraste = [];
  for (const e of document.querySelectorAll('body *')) {
    if (!e.checkVisibility() || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const s = getComputedStyle(e), f = fundo(e), c = rgb(s.color);
    if (!c) continue;
    const alpha = c[3] ?? 1, op = parseFloat(s.opacity);
    if (f.img) { contraste.push({ t: e.textContent.trim().slice(0, 40), sobre: 'gradiente/imagem: ' + String(f.sel).slice(0, 30) }); continue; }
    const mix = c.slice(0, 3).map((v, i) => v * alpha * op + f.c[i] * (1 - alpha * op));
    const L1 = lum(mix), L2 = lum(f.c), r = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const px = parseFloat(s.fontSize), grande = px >= 24 || (px >= 18.66 && +s.fontWeight >= 600);
    if (r < (grande ? 3 : 4.5)) contraste.push({ t: e.textContent.trim().slice(0, 40), razao: +r.toFixed(2), px, grande });
  }
  const toque = [...document.querySelectorAll('a,button,summary')].filter((e) => e.checkVisibility()).map((e) => { const r = e.getBoundingClientRect(); return { t: (e.textContent.trim() || e.getAttribute('aria-label') || '').slice(0, 30), w: Math.round(r.width), h: Math.round(r.height), inline: getComputedStyle(e).display === 'inline' }; });
  const titulos = [...document.querySelectorAll('h1,h2,h3,h4')].map((h) => h.tagName + ' ' + h.textContent.trim().slice(0, 30));
  let ant = 0; const saltos = [];
  for (const h of document.querySelectorAll('h1,h2,h3,h4')) { const n = +h.tagName[1]; if (ant && n > ant + 1) saltos.push(h.textContent.trim().slice(0, 30)); ant = n; }
  return {
    contraste, menos24: toque.filter((x) => (x.w < 24 || x.h < 24) && !x.inline), menos44: toque.filter((x) => (x.w < 44 || x.h < 44) && !x.inline).map((x) => `${x.t} ${x.w}x${x.h}`),
    titulos, saltos, semAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).map((i) => i.src),
    linkSemNome: [...document.querySelectorAll('a')].filter((a) => !(a.textContent.trim() || a.getAttribute('aria-label') || a.querySelector('img[alt]:not([alt=""])'))).map((a) => a.href),
    rolagemLateral: document.documentElement.scrollWidth > innerWidth,
  };
};
for (const [nome, opts] of [['cel390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['desk1440', { viewport: { width: 1440, height: 900 } }]]) {
  for (const url of ['/', '/privacy']) {
    const { ctx, p } = await abrir(opts, url);
    rel[`audit-${nome}-${url}`] = await p.evaluate(AUDIT);
    await ctx.close();
  }
}

// ---------- 2) pior caso ----------
// textos plausíveis: o que um Lead poderia mandar amanhã (status e frases mais longos, domínio com caminho, e-mail longo)
const PIOR = () => {
  const t = (sel, txt, i = 0) => { const e = document.querySelectorAll(sel)[i]; if (e) e.textContent = txt; };
  t('#iqnorth .estado', 'Live · Portuguese, English and Spanish');
  t('#iqnorth .prod-frase', 'Online IQ test with a confidence range, an area-by-area report and a certificate anyone can check.');
  t('#fytform .dom', 'fytform.com/formulario/?utm_source=dcsolutions');
  t('#h2hscout h3', 'H2HScout Brasileirão Série A');
  t('#h2hscout .estado', 'Closed beta · invitations by email only');
  t('#ismeire .fatos li', 'Booking at atendimento.nutricionista.ismeirecortez@gmail.com or via WhatsApp', 1);
  t('.etiquetas li:nth-child(3) span', 'Brasileirão Série A statistics in numbers');
  t('.etiquetas li:nth-child(4) i', 'In development · PC game');
  t('.faq summary', 'Where do I get support for a product, and how long does it usually take to get an answer from the team?', 0);
  t('.contato .email', 'partnerships.and.press@dcsolutions.app');
  t('#h-pg', 'PartiuGringa International');
};
const TRANSBORDA = () => {
  const r = [];
  for (const e of document.querySelectorAll('main *, footer *, header *')) {
    if (!e.checkVisibility() || e.closest('.cel,.pcs,.etiquetas li .tag::after')) continue;
    // o pai é o primeiro ancestral com caixa própria (display: contents não tem)
    let pp = e.parentElement; while (pp && getComputedStyle(pp).display === 'contents') pp = pp.parentElement;
    const q = e.getBoundingClientRect(), pai = pp.getBoundingClientRect();
    const st = getComputedStyle(pp);
    if (st.overflow !== 'visible' || !q.width) continue;
    if (q.right > pai.right + 2 && q.right > 0 && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) r.push(`${e.tagName}.${String(e.className).slice(0, 20)} "${e.textContent.trim().slice(0, 40)}" passa ${Math.round(q.right - pai.right)}px`);
  }
  return { rolagemLateral: document.documentElement.scrollWidth > innerWidth, sw: document.documentElement.scrollWidth, iw: innerWidth, transborda: r.slice(0, 20) };
};
const CASOS = [
  ['320-pior', { viewport: { width: 320, height: 720 }, isMobile: true, hasTouch: true }, true, false],
  ['390-pior', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, true, false],
  ['1440-pior', { viewport: { width: 1440, height: 900 } }, true, false],
  ['2560', { viewport: { width: 2560, height: 1440 } }, false, false],
  ['1280-zoom200', { viewport: { width: 640, height: 450 }, deviceScaleFactor: 2 }, false, false],
  ['390-sem-imagens', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, false, true],
  ['1440-sem-imagens', { viewport: { width: 1440, height: 900 } }, false, true],
];
for (const [nome, opts, pior, semImg, zoom] of CASOS) {
  const { ctx, p } = await abrir(opts, '/', semImg);
  if (pior) await p.evaluate(PIOR);
  if (zoom) await p.evaluate((z) => { document.documentElement.style.zoom = z; }, zoom);
  await p.waitForTimeout(400);
  rel['quebra-' + nome] = await p.evaluate(TRANSBORDA);
  await p.screenshot({ path: `${OUT}/${nome}.png`, fullPage: !zoom && opts.viewport.width < 2000 });
  await ctx.close();
}
fs.writeFileSync(`${OUT}/relatorio.json`, JSON.stringify(rel, null, 1));
console.log(JSON.stringify(rel, null, 1).slice(0, 12000));
await b.close();
