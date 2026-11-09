// Telas dos celulares da v4 (revisão de 08/11, "nível de detalhe dos outros sites"): todas em 390x844 pontos,
// salvas em 2x (780x1688) e 1x (390x844) em src/assets/v4/telas/. A moldura do aparelho é CSS (src/css/v4.css),
// na receita dos celulares do iqnorth.com e do fytform.com.
// - IQNorth e Fytform: a tela do aparelho dos próprios sites (já tem barra de status e ilha), capturada em alta densidade.
// - H2HScout e Ismeire: barra de status e ilha desenhadas aqui por cima de uma captura do site ou do print de iOS.
// Trava: falha se aparecer termo proibido no texto visível de uma captura de site.
// uso: node ferramentas/telas-v4.mjs [nome ...]   (sem nome: todas)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire('E:/dev/projects/Tiktok-accounts/package.json');
const { chromium } = require('playwright-core');

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(R, 'src/assets/v4/telas');
fs.mkdirSync(OUT, { recursive: true });
const SO = process.argv.slice(2);
const quer = (n) => !SO.length || SO.includes(n);
const b = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });
const conv = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
const png = (buf) => 'data:image/png;base64,' + buf.toString('base64');
const arq = (f) => 'data:image/' + (f.endsWith('.png') ? 'png' : 'webp') + ';base64,' + fs.readFileSync(f).toString('base64');

const PROIBIDO = /R\$|US?\$|€|\bPIX\b|premium|grátis|gratuito|\bfree\b|price|preço|\d[\d.]*\+|\b4[,.]9\b|\b97\s?%|satisfa|psycholog|QI oficial|official IQ|cl[ií]nic|laudo|diagn|lista de espera|waiting ?list|waitlist|vital[ií]ci|lifetime|aposta|\bbets?\b|betting|odds|Over \d|Ambas marcam|Cartola|Play Store|Google Play|App Store|\bAPK\b|steam|wishlist|garantia|guarantee|depoimento|testimonial|Divin[oó]polis/i;
async function trava(p, el, nome) {
  const t = await el.evaluate((e) => {
    const r = e.getBoundingClientRect();
    return [...e.querySelectorAll('*')].filter((x) => {
      const q = x.getBoundingClientRect();
      return x.checkVisibility() && q.width && q.bottom > Math.max(r.top, 0) && q.top < Math.min(r.bottom, innerHeight) && [...x.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    }).map((x) => [...x.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ')).join(' | ');
  });
  const m = t.match(PROIBIDO);
  if (m) throw new Error(nome + ': termo proibido na tela: ' + m[0]);
  return t;
}

// salva a tela (data URL de 390x844 em qualquer densidade) em 780 e 390 de largura, cortando para 390:844 a partir do topo
async function salvar(src, nome) {
  for (const w of [780, 390]) {
    const d = await conv.evaluate(async ([src, w]) => {
      const i = new Image(); i.src = src; await i.decode();
      const h = Math.round(w * 844 / 390), c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
      const ch = Math.min(i.height, i.width * 844 / 390);
      x.drawImage(i, 0, 0, i.width, ch, 0, 0, w, Math.round(ch * w / i.width));
      return c.toDataURL('image/webp', 0.9);
    }, [src, w]);
    fs.writeFileSync(path.join(OUT, `${nome}-${w}.webp`), Buffer.from(d.split(',')[1], 'base64'));
  }
  console.log('ok', nome);
}

// barra de status de iPhone (9:41, ilha, sinal, wi-fi e bateria) sobre a captura, montada em 390x844 a 2x
const ICONES = (cor) => `<svg width="18" height="12" viewBox="0 0 18 12" fill="${cor}"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
<svg width="16" height="12" viewBox="0 0 16 12" fill="${cor}"><path d="M8 2.6c2.3 0 4.4.9 6 2.4l1.3-1.4A10.6 10.6 0 0 0 8 .7 10.6 10.6 0 0 0 .7 3.6L2 5c1.6-1.5 3.7-2.4 6-2.4Zm0 3.8c1.3 0 2.5.5 3.4 1.3l1.3-1.4A6.7 6.7 0 0 0 8 4.5c-1.8 0-3.5.7-4.7 1.8l1.3 1.4c.9-.8 2.1-1.3 3.4-1.3Zm0 3.8c.5 0 .9.2 1.3.5L8 12 6.7 10.7c.4-.3.8-.5 1.3-.5Z"/></svg>
<svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="${cor}" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2.5" fill="${cor}"/><path d="M25 4.5v4a2.2 2.2 0 0 0 0-4Z" fill="${cor}" opacity=".45"/></svg>`;
async function compor(src, { fundo, tinta, topo = 50, base = 0, ajuste = 'largura' }) {
  // base: faixa embaixo, na cor do fundo, para o indicador de início não cobrir a barra de navegação do app
  // fundo 'auto': a cor do canto de cima da captura (a barra de status emenda com o cabeçalho do site)
  if (fundo === 'auto') fundo = await conv.evaluate(async (src) => {
    const i = new Image(); i.src = src; await i.decode();
    const c = document.createElement('canvas'); c.width = 4; c.height = 4; c.getContext('2d').drawImage(i, 6, 6, 4, 4, 0, 0, 4, 4);
    const d = c.getContext('2d').getImageData(1, 1, 1, 1).data; return `rgb(${d[0]},${d[1]},${d[2]})`;
  }, src);
  const html = `<html><head><style>
  @font-face{font-family:SB;src:local('Segoe UI Semibold'),local('Arial')}
  body{margin:0;width:390px;height:844px;overflow:hidden;background:${fundo}}
  .sb{position:absolute;inset:0 0 auto;height:${topo}px;display:flex;align-items:center;justify-content:space-between;padding:6px 30px 0 46px;box-sizing:border-box;background:${fundo};color:${tinta};z-index:2}
  .h{font:600 17px/1 SB,Arial,sans-serif;letter-spacing:-.01em}.r{display:flex;align-items:center;gap:6px}
  .ilha{position:absolute;left:50%;top:11px;width:122px;height:35px;margin-left:-61px;border-radius:20px;background:#000;z-index:3}
  .ilha::after{content:"";position:absolute;right:13px;top:11px;width:13px;height:13px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#2b3a55,#0a0d14 70%)}
  img{position:absolute;top:${topo}px;left:50%;transform:translateX(-50%);${ajuste === 'largura' ? 'width:390px' : `height:${844 - topo - base}px`}}
  .home{position:absolute;left:50%;bottom:8px;width:134px;height:5px;margin-left:-67px;border-radius:3px;background:${tinta};opacity:.85;z-index:3}
  </style></head><body><div class="sb"><span class="h">9:41</span><span class="r">${ICONES(tinta)}</span></div><div class="ilha"></div><img src="${src}"><div class="home"></div></body></html>`;
  await conv.setContent(html); await conv.evaluate(() => document.images[0].decode());
  return png(await conv.screenshot());
}

const desk = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3, locale: 'en-US' });

// tira a inclinação 3D do aparelho (no próprio elemento e nos ancestrais), para a tela sair reta e nítida
const reto = (el) => el.evaluate((e) => {
  for (let x = e; x && x !== document.body; x = x.parentElement) {
    x.style.setProperty('transform', 'none', 'important'); x.style.setProperty('perspective', 'none', 'important');
    x.style.setProperty('rotate', 'none', 'important'); x.style.setProperty('translate', 'none', 'important');
    x.style.setProperty('scale', 'none', 'important'); x.style.setProperty('animation', 'none', 'important');
  }
  // esconde o resto da página, que pode passar por cima do aparelho depois de endireitado
  for (const o of document.querySelectorAll('body *')) if (!o.contains(e) && !e.contains(o)) o.style.setProperty('visibility', 'hidden', 'important');
});
// IQNorth: a tela "By area" do relatório de exemplo ("SAMPLE") do aparelho de /en/features/report, sem a inclinação 3D
if (quer('iqnorth-relatorio')) {
  const p = await desk.newPage();
  await p.goto('https://iqnorth.com/en/features/report', { waitUntil: 'networkidle', timeout: 60000 });
  let el, t;
  for (let i = 0; i < await p.locator('.capp-tela').count(); i++) {
    el = p.locator('.capp-tela').nth(i);
    await el.scrollIntoViewIfNeeded(); await reto(el); await p.waitForTimeout(2500);
    t = await trava(p, el, 'iqnorth-relatorio');
    if (/sample/i.test(t) && /By area/i.test(t)) break;
    t = null;
  }
  if (!t) throw new Error('iqnorth-relatorio: tela "By area" não encontrada');
  await salvar(png(await el.screenshot()), 'iqnorth-relatorio');
  await p.close();
}
// IQNorth: o site em inglês no celular (topo da home, com a pergunta de exemplo "SAMPLE").
// O aparelho da home do site fica numa área presa à rolagem e não sai reto num recorte; por isso a página no celular.
if (quer('iqnorth-home')) {
  const cel = await b.newContext({ viewport: { width: 390, height: 794 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-US' });
  const p = await cel.newPage();
  await p.goto('https://iqnorth.com/en/', { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(3000);
  const t = await trava(p, p.locator('body'), 'iqnorth-home');
  if (!/sample/i.test(t)) throw new Error('iqnorth-home: sem o selo de exemplo na tela');
  await salvar(await compor(png(await p.screenshot()), { fundo: 'auto', tinta: '#fff' }), 'iqnorth-home');
  await cel.close();
}

// Fytform: o aparelho do plano de exemplo (treino e troca de alimento), sem a inclinação, em 4x
if (quer('fytform-treino') || quer('fytform-dieta')) {
  const c4 = await b.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 4, isMobile: true, hasTouch: true, locale: 'pt-BR' });
  const p = await c4.newPage();
  await p.goto('https://fytform.com/', { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(1500);
  await p.addStyleTag({ content: '.pm-tilt,.pm-float,.phone-mock,.stage-phone{transform:none!important;animation:none!important}.pm-glass{display:none!important}' });
  const tela = p.locator('.pm-screen').first();
  // o clique no passo rola a página até ele; rolar de novo volta o carrossel ao passo 1
  for (const [passo, nome] of [[2, 'fytform-treino'], [4, 'fytform-dieta']]) {
    await p.locator(`[aria-label^="Passo ${passo}:"]`).first().click({ force: true });
    await p.waitForTimeout(2500);
    await trava(p, tela, nome);
    await salvar(png(await tela.screenshot()), nome);
  }
  await c4.close();
}

// H2HScout: print de iOS da classificação (440x956 pt, sem barra de status), escudos e selo do Brasileirão cobertos
if (quer('h2hscout-classificacao')) {
  const src = arq('E:/dev/projects/_handoff/h2h-ios-assets/6.9/print-3-liga.png');
  const limpo = await conv.evaluate(async (src) => {
    const i = new Image(); i.src = src; await i.decode();
    const c = document.createElement('canvas'); c.width = i.width; c.height = i.height;
    const x = c.getContext('2d'); x.drawImage(i, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const cor = (px, py) => { const o = (py * c.width + px) * 4; return `rgb(${d[o]},${d[o + 1]},${d[o + 2]})`; };
    // selo do Brasileirão no cabeçalho (x 470-580, y 40-150): retângulo na cor do cabeçalho
    x.fillStyle = cor(600, 20); x.fillRect(468, 36, 118, 118);
    // escudos na coluna "Time" (x=269): faixas com pixels coloridos ou escuros entre y=1000 e 2680
    const cx = 269, ys = []; let dentro = false, ini = 0;
    for (let y = 1000; y < 2680; y++) {
      let n = 0;
      for (let dx = -30; dx <= 30; dx += 3) { const o = (y * c.width + cx + dx) * 4; const m = Math.max(d[o], d[o + 1], d[o + 2]) - Math.min(d[o], d[o + 1], d[o + 2]); if (m > 40 || Math.max(d[o], d[o + 1], d[o + 2]) < 90) n++; }
      if (n >= 2 && !dentro) { dentro = true; ini = y; } else if (n < 2 && dentro) { dentro = false; if (y - ini > 20) ys.push(Math.round((ini + y) / 2)); }
    }
    for (const y of ys) { x.fillStyle = cor(205, y); x.beginPath(); x.arc(cx, y, 54, 0, Math.PI * 2); x.fill(); }
    return { url: c.toDataURL('image/png'), n: ys.length };
  }, src);
  console.log('H2H classificação: escudos cobertos', limpo.n);
  // a tela de 440x956 pt cabe inteira abaixo da barra de status, ajustada pela altura (sobra igual dos lados, na cor do fundo)
  await salvar(await compor(limpo.url, { fundo: 'rgb(235,236,231)', tinta: '#111', base: 22, ajuste: 'altura' }), 'h2hscout-classificacao');
}

// H2HScout: análise ofensiva da landing (tela de 430 pt), sem a barra do topo, escudos cobertos
if (quer('h2hscout-ofensiva')) {
  const src = arq('E:/dev/projects/h2hscout-landing/landing/img/demo-ofensiva-cel-860.webp');
  const limpo = await conv.evaluate(async (src) => {
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
      const o = (Math.round(a.y0 + a.h / 2) * W + Math.max(0, Math.round(a.x0 - 8))) * 4;
      x.fillStyle = `rgb(${d[o]},${d[o + 1]},${d[o + 2]})`; x.beginPath(); x.arc(a.x0 + a.w / 2, a.y0 + a.h / 2, Math.max(a.w, a.h) / 2 + 3, 0, Math.PI * 2); x.fill();
    }
    // tira a barra do topo (128 px, com as abas do site) e devolve o resto
    const s = document.createElement('canvas'); s.width = W; s.height = H - 128;
    s.getContext('2d').drawImage(c, 0, 128, W, H - 128, 0, 0, W, H - 128);
    const o = ((H - 4) * W + 4) * 4;
    return { url: s.toDataURL('image/png'), n: achados.length, fundo: `rgb(${d[o]},${d[o + 1]},${d[o + 2]})` };
  }, src);
  console.log('H2H ofensiva: escudos cobertos', limpo.n, 'fundo', limpo.fundo);
  await salvar(await compor(limpo.url, { fundo: limpo.fundo, tinta: '#fff' }), 'h2hscout-ofensiva');
}

// Ismeire: o site no celular (390x794 abaixo da barra de status), nas seções de serviços e de consulta
if (quer('ismeire-servicos') || quer('ismeire-consulta')) {
  const cel = await b.newContext({ viewport: { width: 390, height: 794 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR' });
  const p = await cel.newPage();
  await p.goto('https://ismeirecortez.com/', { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(2500);
  await p.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  for (const [nome, alvo, fundo] of [['ismeire-servicos', /Obesidade e emagrecimento, com cuidado/, 'auto'], ['ismeire-consulta', /Como é a consulta com a nutricionista/, 'auto']]) {
    await p.getByText(alvo).first().evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 110));
    await p.waitForTimeout(2500);
    const t = await trava(p, p.locator('body'), nome);
    if (/Divin[oó]polis/i.test(t)) throw new Error(nome + ': cidade na tela');
    await salvar(await compor(png(await p.screenshot()), { fundo, tinta: '#111' }), nome);
  }
  await cel.close();
}

// PartiuGringa (09/11, landing nova da rodada R1 da melhoria, front 00d4a84): a landing pública no celular, só em português
// (regra do Fytform: o card diz "Portuguese only"). Sem o cabeçalho fixo. Telas com a legenda "Exemplo com perfil fictício" visível:
// "Sua nota, critério por critério" e "Seu LinkedIn em inglês e um CV para cada vaga". O topo, a etiqueta "ANÁLISE GRÁTIS" e os planos
// têm "grátis" e preço, e a vaga mostra marca de empresa; ficam de fora. Nomes novos de arquivo (cache de 30 dias).
if (quer('partiugringa-r1-criterios') || quer('partiugringa-r1-reescrita')) {
  const cel = await b.newContext({ viewport: { width: 390, height: 794 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR' });
  const p = await cel.newPage();
  await p.goto('https://partiugringa.com/', { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(2500);
  await p.addStyleTag({ content: 'html{scroll-behavior:auto!important} header{display:none!important}' });
  for (const [nome, alvo] of [['partiugringa-r1-criterios', /Sua nota, critério por critério/], ['partiugringa-r1-reescrita', /Seu LinkedIn em inglês e um CV para cada vaga/]]) {
    if (!quer(nome)) continue;
    await p.getByRole('heading', { name: alvo }).first().evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 8));
    await p.waitForTimeout(3000);
    const t = await trava(p, p.locator('body'), nome);
    if (!/Exemplo com perfil fict[ií]cio/.test(t)) throw new Error(nome + ': sem a legenda de perfil fictício na tela');
    await salvar(await compor(png(await p.screenshot()), { fundo: 'auto', tinta: '#111' }), nome);
  }
  await cel.close();
}
await b.close();
