// Prints novos dos produtos (sites no ar) em webp, para a vitrine v3.
// Celular: tela do topo, 360x780 @2x. H2HScout: só o painel "Exemplo de leitura" (o topo do site fala de lista de espera).
// uso: node ferramentas/prints-v3.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire('E:/dev/projects/Tiktok-accounts/package.json');
const { chromium } = require('playwright-core');

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = path.join(R, 'src/assets/v3/prints');
fs.mkdirSync(PASTA, { recursive: true });
const b = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });

// png -> webp em várias larguras, pelo canvas do próprio navegador
const conv = await b.newPage();
// corte opcional [x, y, w, h] no original; mime para arquivos que não são png
async function webp(png, nome, larguras, corte = null, mime = 'image/png', OUT = PASTA) {
  const src = 'data:' + mime + ';base64,' + png.toString('base64');
  for (const w of larguras) {
    const d = await conv.evaluate(async ([src, w, corte]) => {
      const i = new Image(); i.src = src; await i.decode();
      const [cx, cy, cw, ch] = corte || [0, 0, i.width, i.height];
      const c = document.createElement('canvas'); c.width = w; c.height = Math.round(ch * w / cw);
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(i, cx, cy, cw, ch, 0, 0, c.width, c.height);
      return [c.toDataURL('image/webp', 0.8), c.height];
    }, [src, w, corte]);
    fs.writeFileSync(path.join(OUT, `${nome}-${w}.webp`), Buffer.from(d[0].split(',')[1], 'base64'));
    console.log(nome, w + 'x' + d[1]);
  }
}

const cel = await b.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR' });
for (const [nome, url] of [['iqnorth', 'https://iqnorth.com/'], ['fytform', 'https://fytform.com/'], ['ismeirecortez', 'https://ismeirecortez.com/'], ['iqnorth-en', 'https://iqnorth.com/en/']]) {
  const p = await cel.newPage();
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(2500);
  // regra do Fytform (e geral): sem preço nem forma de pagamento no print. Corta a tela acima da primeira linha com "R$".
  const corte = await p.evaluate(() => {
    let topo = innerHeight;
    for (const e of document.querySelectorAll('body *')) {
      const proprio = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ');
      if (!/R\$|PIX|grátis|gratuito|\bfree\b/i.test(proprio)) continue;
      const r = e.getBoundingClientRect();
      if (r.width && r.bottom > 0 && r.top < topo) topo = r.top;
    }
    return Math.floor(topo);
  });
  const altura = Math.min(780, corte - 16);
  if (altura < 500) throw new Error(nome + ': preço alto demais na tela, print ficaria curto');
  await webp(await p.screenshot({ clip: { x: 0, y: 0, width: 360, height: altura } }), nome + '-cel', [300, 600]);
  await p.close();
}
{
  const dk = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: 'pt-BR' });
  const p = await dk.newPage();
  await p.goto('https://h2hscout.com/', { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(2500);
  // sobe do texto do painel até o cartão inteiro
  const texto = await p.getByText(/criou chance/i).first().evaluate((e) => {
    // o maior ancestral que ainda não traz a promessa de lista de espera
    while (e.parentElement && !/lista de espera|cadastr|vital[ií]ci/i.test(e.parentElement.innerText)) e = e.parentElement;
    e.setAttribute('data-v3', '1');
    return e.innerText;
  });
  // escudos de clubes e o selo do Brasileirão estão na lista "não pode" do H2H: tira as linhas com imagem
  await p.locator('[data-v3]').evaluate((raiz) => {
    for (const i of raiz.querySelectorAll('img,svg image,picture')) {
      let e = i;
      while (e.parentElement && e.parentElement !== raiz && e.parentElement.getBoundingClientRect().height < 100) e = e.parentElement;
      e.style.display = 'none';
    }
  });
  if (await p.locator('[data-v3] img:visible').count()) throw new Error('painel do H2HScout ainda com imagem (escudo)');
  // trava: o recorte não pode ter a promessa de lista de espera/cadastro
  if (/lista de espera|cadastr|vital[ií]ci/i.test(texto)) throw new Error('painel do H2HScout com texto proibido');
  await p.waitForTimeout(1500);
  await webp(await p.locator('[data-v3]').screenshot(), 'h2hscout-painel', [420, 840]);
  await dk.close();
}
{
  // IQNorth: relatório de exemplo (material indicado pelo IQNorth Lead): o celular do topo de /recursos/relatorio, tela "Por área".
  const dk = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: 'pt-BR' });
  const p = await dk.newPage();
  await p.goto('https://iqnorth.com/recursos/relatorio', { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(2500);
  const proibido = /R\$|grátis|gratuito|oficial|cl[ií]nic|laudo|diagn[oó]stic|psicol[oó]gic|Mensa|usu[aá]rios|vendas/i;
  const texto = await p.getByText('Por área', { exact: true }).first().evaluate((e) => {
    // sobe até o aparelho inteiro (alto e estreito)
    while (e.parentElement && !(e.getBoundingClientRect().height >= 560 && e.getBoundingClientRect().height <= 760 && e.getBoundingClientRect().width < 420)) e = e.parentElement;
    e.setAttribute('data-v3', '1');
    // esconde os selos flutuantes da página que encostam no aparelho
    for (const o of document.querySelectorAll('body *')) if (!o.contains(e) && !e.contains(o)) o.style.visibility = 'hidden';
    return e.innerText;
  });
  const achado = texto.match(new RegExp('.{0,40}(' + proibido.source + ').{0,40}', 'i'));
  if (achado) throw new Error('relatório do IQNorth com termo proibido: ' + achado[0].replace(/\s+/g, ' '));
  await webp(await p.locator('[data-v3]').screenshot(), 'iqnorth-relatorio', [300, 600]);
  await dk.close();
}

// Fytform (material do Fytform Lead, 08/11). Não pode: preço, PIX, premium, números de vendas ou planos, nota, App Store/Play/APK.
const PROIBIDO_FYT = /R\$|PIX|premium|grátis|gratuito|\d[\d.]*\+|\b4,9\b|\b9\d\s?%|satisfa|avalia[cç][aã]o|Play|App Store|APK|substitui (o )?(personal|nutricionista|médico)|garantia|vital[ií]ci/i;
// lista os textos proibidos visíveis num retângulo da página (coordenadas da janela)
const proibidosNaTela = (p, y0 = 0, y1 = 1e9) => p.evaluate(([src, y0, y1]) => {
  const re = new RegExp(src, 'i');
  return [...document.querySelectorAll('body *')].filter((e) => {
    const t = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ');
    const r = e.getBoundingClientRect();
    return re.test(t) && r.width && r.bottom > y0 && r.top < Math.min(innerHeight, y1) && e.checkVisibility();
  }).map((e) => e.textContent.trim().slice(0, 60));
}, [PROIBIDO_FYT.source, y0, y1]);
// topo da primeira linha visível com preço (texto próprio do elemento), abaixo da barra do topo
const primeiroPreco = (p) => p.evaluate(() => {
  let topo = Infinity;
  for (const e of document.querySelectorAll('body *')) {
    const t = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ');
    const r = e.getBoundingClientRect();
    if (/R\$/.test(t) && e.checkVisibility() && r.width && r.top > 40 && r.top < topo) topo = r.top;
  }
  return topo;
});
{
  // seção "Veja o plano por dentro antes de pagar": as telas do app com o plano de exemplo
  const p = await cel.newPage();
  await p.goto('https://fytform.com/', { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(1500);
  await p.getByText(/Estas são as telas do app com um plano de exemplo/).first().evaluate((e) => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, e.getBoundingClientRect().bottom + window.scrollY + 8);
  });
  await p.waitForTimeout(2000);
  const vistos = await proibidosNaTela(p);
  if (vistos.length) throw new Error('plano de exemplo do Fytform com termo proibido: ' + vistos.join(' | '));
  // só o aparelho do carrossel; tira a legenda e os pontos de navegação abaixo dele
  const legenda = await p.getByText(/O plano abre no celular/).first().evaluate((e) => e.getBoundingClientRect().top);
  const fundo = Math.floor(legenda - 44); // os pontos do carrossel ficam logo acima da legenda
  if (fundo < 400 || fundo > 780) throw new Error('fytform plano: corte fora do esperado (' + fundo + ')');
  await webp(await p.screenshot({ clip: { x: 0, y: 0, width: 360, height: fundo } }), 'fytform-plano', [300, 600]);
  await p.close();
}
{
  // v1 e v2 (arco do hero e card): celular 1:2, cortado acima da linha de preço
  const p = await cel.newPage();
  await p.goto('https://fytform.com/', { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(2500);
  const topo = await primeiroPreco(p);
  const h = Math.floor(topo - 12), w = Math.floor(h / 2);
  if (w > 360 || h < 560) throw new Error('fytform v1/v2 celular: corte fora do esperado');
  const vistos = await proibidosNaTela(p, 0, h);
  if (vistos.length) throw new Error('fytform v1/v2 celular com termo proibido: ' + vistos.join(' | '));
  const RAIZ = path.join(R, 'src/assets/prints');
  const png = await p.screenshot({ clip: { x: 0, y: 0, width: w, height: h } });
  await webp(png, 'fytform-m', [240, 480], null, 'image/png', RAIZ);
  await p.close();
}
await cel.close();
{
  // v1 e v2 (janela do card): desktop 16:10, cortado acima da linha de preço
  const dk = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: 'pt-BR' });
  const p = await dk.newPage();
  await p.goto('https://fytform.com/', { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(2500);
  const topo = await primeiroPreco(p);
  const h = Math.floor(topo - 12), w = Math.round(h * 1.6);
  if (w > 1280 || h < 500) throw new Error('fytform v1/v2 desktop: corte fora do esperado');
  const vistos = await proibidosNaTela(p, 0, h);
  if (vistos.length) throw new Error('fytform v1/v2 desktop com termo proibido: ' + vistos.join(' | '));
  const RAIZ = path.join(R, 'src/assets/prints');
  await webp(await p.screenshot({ clip: { x: 0, y: 0, width: w, height: h } }), 'fytform-d', [640, 1120], null, 'image/png', RAIZ);
  await dk.close();
}

// H2HScout, celular (D2, decidido pelos Leads em 08/11): tela da plataforma da landing, sem a barra de navegação do topo.
await webp(fs.readFileSync('E:/dev/projects/h2hscout-landing/landing/img/demo-ofensiva-cel-860.webp'), 'h2hscout-cel', [300, 600], [0, 128, 860, 1112], 'image/webp');

// Ismeire desktop: print oficial de 08/11 (via Produtos), se existir; senão, tira do site público.
const OFICIAL = 'C:/Users/corte/OpenBot/Shared/vitrine-revisao/ismeire/ismeirecortez-home-desktop-1440-20261108.png';
if (fs.existsSync(OFICIAL)) {
  await webp(fs.readFileSync(OFICIAL), 'ismeirecortez-desk', [640, 1120]);
} else {
  const desk = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'pt-BR' });
  const p = await desk.newPage();
  await p.goto('https://ismeirecortez.com/', { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(2500);
  await webp(await p.screenshot(), 'ismeirecortez-desk', [640, 1120]);
  await desk.close();
}
await b.close();
