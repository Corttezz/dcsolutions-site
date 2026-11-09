// Prints da v4 (só inglês, 08/11): duas telas reais e atuais de cada produto, em src/assets/v4/prints/.
// IQNorth: site em inglês (home e o relatório de exemplo "Ana Sample"). Fytform: só o plano de exemplo (treino e troca de alimento).
// H2HScout: telas da plataforma (landing e print de iOS da classificação), escudos cobertos, sem a barra do topo.
// Ismeire: site público no celular (topo e "como é a consulta"). Grimoire usa os prints v2 que já estão em assets/v3/grimoire.
// uso: node ferramentas/prints-v4.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire('E:/dev/projects/Tiktok-accounts/package.json');
const { chromium } = require('playwright-core');

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(R, 'src/assets/v4/prints');
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });
const conv = await b.newPage();

async function webp(src, nome, larguras, corte = null) {
  for (const w of larguras) {
    const [d, h] = await conv.evaluate(async ([src, w, corte]) => {
      const i = new Image(); i.src = src; await i.decode();
      // corte em pixels ou, com todos os valores <= 1, em frações da imagem
      const fr = corte && corte.every((v) => v <= 1);
      const [cx, cy, cw, ch] = !corte ? [0, 0, i.width, i.height] : fr ? [corte[0] * i.width, corte[1] * i.height, corte[2] * i.width, corte[3] * i.height] : corte;
      const c = document.createElement('canvas'); c.width = w; c.height = Math.round(ch * w / cw);
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(i, cx, cy, cw, ch, 0, 0, c.width, c.height);
      return [c.toDataURL('image/webp', 0.82), c.height];
    }, [src, w, corte]);
    fs.writeFileSync(path.join(OUT, `${nome}-${w}.webp`), Buffer.from(d.split(',')[1], 'base64'));
    console.log(nome, w + 'x' + h);
  }
}
const png = (buf) => 'data:image/png;base64,' + buf.toString('base64');

// termos proibidos de todos os Leads (PT e EN), procurados no texto visível de cada recorte
const PROIBIDO = /R\$|US?\$|€|\bPIX\b|premium|grátis|gratuito|\bfree\b|price|preço|\d[\d.]*\+|\b4[,.]9\b|\b97\s?%|satisfa|avalia[cç][aã]o psicol|psycholog|QI oficial|official IQ|cl[ií]nic|laudo|diagn|mensa\b|lista de espera|waiting ?list|waitlist|vital[ií]ci|lifetime|aposta|\bbets?\b|betting|odds|Over \d|Ambas marcam|Play Store|Google Play|App Store|\bAPK\b|steam|wishlist|garantia|guarantee|depoimento|testimonial|antes e depois|\bkg\b/i;
const proibidos = (p, clip) => p.evaluate(([src, c]) => {
  const re = new RegExp(src, 'i');
  return [...document.querySelectorAll('body *')].filter((e) => {
    const t = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ');
    const r = e.getBoundingClientRect();
    return re.test(t) && e.checkVisibility() && r.width && r.bottom > c.y && r.top < c.y + c.height && r.right > c.x && r.left < c.x + c.width;
  }).map((e) => e.textContent.trim().slice(0, 60));
}, [PROIBIDO.source, clip]);
const trava = async (p, clip, nome) => { const v = await proibidos(p, clip); if (v.length) throw new Error(nome + ': termo proibido no recorte: ' + v.join(' | ')); };
// primeira linha visível com preço ou "free", para cortar acima dela
const primeiraLinhaProibida = (p) => p.evaluate((src) => {
  const re = new RegExp(src, 'i'); let topo = Infinity;
  for (const e of document.querySelectorAll('body *')) {
    const t = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ');
    const r = e.getBoundingClientRect();
    if (re.test(t) && e.checkVisibility() && r.width && r.top > 40 && r.top < topo) topo = r.top;
  }
  return topo;
}, PROIBIDO.source);

const cel = await b.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-US' });

// IQNorth (inglês): home e relatório de exemplo
{
  const p = await cel.newPage();
  await p.goto('https://iqnorth.com/en/', { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(2500);
  const h = Math.min(780, Math.floor((await primeiraLinhaProibida(p)) - 16));
  if (h < 500) throw new Error('IQNorth home: recorte curto');
  const clip = { x: 0, y: 0, width: 360, height: h }; await trava(p, clip, 'IQNorth home');
  await webp(png(await p.screenshot({ clip })), 'iqnorth-home', [300, 600]);
  await p.close();
}
{
  // relatório de exemplo: o celular do topo de /en/features/report (tela "By area" com o selo "EXAMPLE"), no desktop em 2x
  const dk = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: 'en-US' });
  const p = await dk.newPage();
  await p.goto('https://iqnorth.com/en/features/report', { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(2500);
  const texto = await p.getByText('By area', { exact: true }).first().evaluate((e) => {
    while (e.parentElement && !(e.getBoundingClientRect().height >= 560 && e.getBoundingClientRect().height <= 760 && e.getBoundingClientRect().width < 420)) e = e.parentElement;
    e.setAttribute('data-v4', '1');
    for (const o of document.querySelectorAll('body *')) if (!o.contains(e) && !e.contains(o)) o.style.visibility = 'hidden';
    return e.innerText;
  });
  // só o texto visível dentro do aparelho conta (o conteúdo rolado e escondido dentro dele não aparece no print)
  const caixa = await p.locator('[data-v4]').boundingBox();
  await trava(p, { x: caixa.x, y: caixa.y, width: caixa.width, height: caixa.height }, 'IQNorth relatório');
  if (!/example|sample/i.test(texto)) throw new Error('IQNorth relatório sem o selo de exemplo');
  // só a tela, sem a moldura do site e sem a barra de status (a moldura da vitrine é a mesma em todos os produtos)
  await webp(png(await p.locator('[data-v4]').screenshot()), 'iqnorth-relatorio', [300, 600], [0.027, 0.071, 0.946, 0.9]);
  await dk.close();
}

// Fytform: dois passos do plano de exemplo, só a tela do aparelho do site (.pm-screen), sem a inclinação, em 3x
{
  const c3 = await b.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'pt-BR' });
  const p = await c3.newPage();
  await p.goto('https://fytform.com/', { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(1500);
  await p.addStyleTag({ content: '.pm-tilt,.pm-float,.phone-mock,.stage-phone{transform:none!important;animation:none!important}' });
  const tela = p.locator('.pm-screen').first();
  // o clique no passo rola a página até ele; rolar de novo volta o carrossel ao passo 1
  for (const [passo, nome] of [[2, 'fytform-treino'], [4, 'fytform-dieta']]) {
    await p.locator(`[aria-label^="Passo ${passo}:"]`).first().click({ force: true });
    await p.waitForTimeout(2500);
    const cx = await tela.boundingBox(); await trava(p, cx, nome);
    await webp(png(await tela.screenshot()), nome, [300, 600]);
  }
  await c3.close();
}

// Ismeire: topo do site e a seção "como é a consulta, passo a passo"
{
  const p = await cel.newPage();
  await p.goto('https://ismeirecortez.com/', { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(2500);
  // o topo do site diz "Nutricionista em Divinópolis" e a v4 não cita a cidade: a 1ª tela é a seção de serviços
  const clip = { x: 0, y: 0, width: 360, height: 780 };
  await p.getByText(/Obesidade e emagrecimento, com cuidado/).first().evaluate((e) => {
    document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 110);
  });
  await p.waitForTimeout(2500);
  await trava(p, clip, 'Ismeire serviços');
  if (await p.evaluate(() => [...document.querySelectorAll('body *')].some((e) => { const r = e.getBoundingClientRect(); return e.children.length === 0 && /Divin[oó]polis/i.test(e.textContent) && e.checkVisibility() && r.bottom > 0 && r.top < innerHeight; }))) throw new Error('Ismeire serviços com "Divinópolis" na tela');
  await webp(png(await p.screenshot({ clip })), 'ismeire-servicos', [300, 600]);
  await p.getByText(/Como é a consulta com a nutricionista/).first().evaluate((e) => {
    document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 110);
  });
  await p.waitForTimeout(2500);
  await trava(p, clip, 'Ismeire consulta');
  await webp(png(await p.screenshot({ clip })), 'ismeire-consulta', [300, 600]);
  await p.close();
}
await cel.close();

// H2HScout: escudos cobertos
async function cobrirEscudosEscuro(arquivo) {
  // tema escuro: escudo = círculo claro, quase quadrado, de 26 a 90 px; cobre com a cor do fundo ao lado
  const src = 'data:image/webp;base64,' + fs.readFileSync(arquivo).toString('base64');
  return conv.evaluate(async (src) => {
    const i = new Image(); i.src = src; await i.decode();
    const W = i.width, H = i.height, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'); x.drawImage(i, 0, 0);
    const d = x.getImageData(0, 0, W, H).data, claro = new Uint8Array(W * H), visto = new Uint8Array(W * H), achados = [], pilha = [];
    for (let k = 0; k < W * H; k++) claro[k] = d[k * 4] > 200 && d[k * 4 + 1] > 200 && d[k * 4 + 2] > 200 ? 1 : 0;
    for (let k = 0; k < W * H; k++) {
      if (!claro[k] || visto[k]) continue;
      let x0 = W, y0 = H, x1 = 0, y1 = 0, n = 0; pilha.push(k); visto[k] = 1;
      while (pilha.length) {
        const q = pilha.pop(), qx = q % W, qy = (q / W) | 0; n++;
        if (qx < x0) x0 = qx; if (qx > x1) x1 = qx; if (qy < y0) y0 = qy; if (qy > y1) y1 = qy;
        for (const v of [q - 1, q + 1, q - W, q + W]) {
          if (v < 0 || v >= W * H || visto[v] || !claro[v]) continue;
          if ((v === q - 1 && qx === 0) || (v === q + 1 && qx === W - 1)) continue;
          visto[v] = 1; pilha.push(v);
        }
      }
      const w = x1 - x0 + 1, h = y1 - y0 + 1, f = n / (w * h);
      if (w >= 26 && w <= 90 && h >= 26 && h <= 90 && Math.abs(w - h) <= 8 && f > 0.3 && f < 0.95) achados.push({ x0, y0, w, h });
    }
    for (const a of achados) {
      const cx = a.x0 + a.w / 2, cy = a.y0 + a.h / 2, r = Math.max(a.w, a.h) / 2 + 3, o = (Math.round(cy) * W + Math.max(0, Math.round(a.x0 - 8))) * 4;
      x.fillStyle = `rgb(${d[o]},${d[o + 1]},${d[o + 2]})`; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    }
    return { url: c.toDataURL('image/png'), n: achados.length };
  }, src);
}
{
  const ofensiva = await cobrirEscudosEscuro('E:/dev/projects/h2hscout-landing/landing/img/demo-ofensiva-cel-860.webp');
  console.log('H2H ofensiva: escudos cobertos', ofensiva.n);
  await webp(ofensiva.url, 'h2hscout-ofensiva', [300, 600], [0, 128, 860, 1112]);
}
{
  // classificação (tema claro): escudos em posições fixas na coluna "Time"; cada um vira um círculo na cor da linha.
  // Corta a barra do topo (selo do Brasileirão) e a barra de navegação de baixo ("Escalar", "Coach").
  const src = 'data:image/png;base64,' + fs.readFileSync('E:/dev/projects/_handoff/h2h-ios-assets/6.9/print-3-liga.png').toString('base64');
  const r = await conv.evaluate(async (src) => {
    const i = new Image(); i.src = src; await i.decode();
    const c = document.createElement('canvas'); c.width = i.width; c.height = i.height;
    const x = c.getContext('2d'); x.drawImage(i, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const cx = 269, ys = [];
    // acha o centro de cada escudo: na coluna x=269, faixas verticais com pixels coloridos (não cinza) entre y=1000 e 2680
    let dentro = false, ini = 0;
    for (let y = 1000; y < 2680; y++) {
      let colorido = 0;
      for (let dx = -30; dx <= 30; dx += 3) { const o = (y * c.width + cx + dx) * 4; const m = Math.max(d[o], d[o + 1], d[o + 2]) - Math.min(d[o], d[o + 1], d[o + 2]); if (m > 40 || Math.max(d[o], d[o + 1], d[o + 2]) < 90) colorido++; }
      if (colorido >= 2 && !dentro) { dentro = true; ini = y; } else if (colorido < 2 && dentro) { dentro = false; if (y - ini > 20) ys.push(Math.round((ini + y) / 2)); }
    }
    for (const y of ys) {
      const o = (y * c.width + 205) * 4; // cor da linha, à esquerda do círculo
      x.fillStyle = `rgb(${d[o]},${d[o + 1]},${d[o + 2]})`; x.beginPath(); x.arc(cx, y, 52, 0, Math.PI * 2); x.fill();
    }
    return { url: c.toDataURL('image/png'), ys };
  }, src);
  console.log('H2H classificação: escudos cobertos', r.ys.length, JSON.stringify(r.ys));
  await webp(r.url, 'h2hscout-classificacao', [300, 600], [0, 350, 1320, 2324]);
}
await b.close();
console.log('ok');
