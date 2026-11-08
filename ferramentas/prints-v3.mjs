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
const OUT = path.join(R, 'src/assets/v3/prints');
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });

// png -> webp em várias larguras, pelo canvas do próprio navegador
const conv = await b.newPage();
async function webp(png, nome, larguras) {
  const src = 'data:image/png;base64,' + png.toString('base64');
  for (const w of larguras) {
    const d = await conv.evaluate(async ([src, w]) => {
      const i = new Image(); i.src = src; await i.decode();
      const c = document.createElement('canvas'); c.width = w; c.height = Math.round(i.height * w / i.width);
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(i, 0, 0, c.width, c.height);
      return [c.toDataURL('image/webp', 0.8), c.height];
    }, [src, w]);
    fs.writeFileSync(path.join(OUT, `${nome}-${w}.webp`), Buffer.from(d[0].split(',')[1], 'base64'));
    console.log(nome, w + 'x' + d[1]);
  }
}

const cel = await b.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR' });
for (const [nome, url] of [['iqnorth', 'https://iqnorth.com/'], ['fytform', 'https://fytform.com/']]) {
  const p = await cel.newPage();
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(2500);
  // regra do Fytform (e geral): sem preço nem forma de pagamento no print. Corta a tela acima da primeira linha com "R$".
  const corte = await p.evaluate(() => {
    let topo = innerHeight;
    for (const e of document.querySelectorAll('body *')) {
      const proprio = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ');
      if (!/R\$|PIX|grátis|gratuito/i.test(proprio)) continue;
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
await cel.close();

const desk = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale: 'pt-BR' });
{
  const p = await desk.newPage();
  await p.goto('https://ismeirecortez.com/', { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(2500);
  await webp(await p.screenshot(), 'ismeirecortez-desk', [640, 1120]);
  await p.close();
}
await b.close();
