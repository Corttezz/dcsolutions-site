// Monta dist/: inline de CSS/JS/partes, hashes da CSP e o módulo de cabeçalhos do Worker.
// uso: node ferramentas/build.mjs
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const S = path.join(R, 'src');
const D = path.join(R, 'dist');
// esvazia sem apagar a pasta (o wrangler dev segura a pasta aberta no Windows)
fs.mkdirSync(D, { recursive: true });
for (const f of fs.readdirSync(D)) fs.rmSync(path.join(D, f), { recursive: true, force: true });

const ler = (f) => fs.readFileSync(path.join(S, f), 'utf8');
const minCss = (f) => ler(f)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s*\n\s*/g, '')
  .replace(/\s*([{};,])\s*/g, '$1')
  .replace(/;}/g, '}');
const css = minCss('css/site.css');
const marca = ler('assets/marca.svg').trim().replace('<svg ', '<svg aria-hidden="true" ');
// marca da v3 (etiqueta), com classes para trocar as cores no claro e no escuro
const marcaV3 = '<svg class="etq" viewBox="3 8 42 32" aria-hidden="true"><rect class="etq-f" x="3" y="8" width="42" height="32" rx="3"/><rect class="etq-p" x="6" y="11" width="36" height="26" rx="1.5"/><path class="etq-l" d="M13.5 15.5V32.5H17A4.6 8.5 0 0 0 17 15.5Z"/><path class="etq-l" d="M33.24 17.04A4.6 8.5 0 1 0 33.24 30.96"/></svg>';
const topo = ler('partes/topo.html').replaceAll('{{MARCA}}', marca);
const rodape = ler('partes/rodape.html').replaceAll('{{MARCA}}', marca);
const cab = ler('js/cabeca.js').trim();
const corpo = ler('js/site.js').trim();
const jsonld = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'DC Solutions',
  legalName: 'DC SOLUTIONS LTDA',
  taxID: '63.680.570/0001-90',
  url: 'https://dcsolutions.app/',
  logo: 'https://dcsolutions.app/apple-touch-icon.png',
  email: 'contato@dcsolutions.app',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Rua João Pereira Neto, 20, Residencial Doutor Walchir Resende Costa',
    addressLocality: 'Divinópolis',
    addressRegion: 'MG',
    postalCode: '35503-131',
    addressCountry: 'BR',
  },
  brand: [
    { '@type': 'Brand', name: 'IQNorth', url: 'https://iqnorth.com/' },
    { '@type': 'Brand', name: 'Fytform', url: 'https://fytform.com/' },
    { '@type': 'Brand', name: 'H2HScout', url: 'https://h2hscout.com/' },
    { '@type': 'Brand', name: 'Grimoire' },
  ],
});

// [fonte, saída, rodapé próprio opcional, v3]. vitrine-v2.html é servida pelo Worker só com VITRINE_V2=1.
// vitrine-v3.html (revisão 08/11) é só preview: CSS, topo e marca próprios; o Worker ainda não a liga.
const PAGINAS = [
  ['index.html', 'index.html'],
  ['index-v2.html', 'vitrine-v2.html', 'partes/rodape-v2.html'],
  ['index-v3.html', 'vitrine-v3.html', 'partes/rodape-v3.html', true],
  ['privacidade/index.html', 'privacidade.html'],
  ['termos/index.html', 'termos.html'],
  ['404.html', '404.html'],
];
const cssV3 = minCss('css/v3.css');
for (const [src, dst, rod, v3] of PAGINAS) {
  const m = v3 ? marcaV3 : marca;
  let s = ler(src)
    .replaceAll('{{TOPO}}', v3 ? ler('partes/topo-v3.html').replaceAll('{{MARCA}}', m) : topo)
    .replaceAll('{{RODAPE}}', rod ? ler(rod).replaceAll('{{MARCA}}', m) : rodape)
    .replaceAll('{{CSS}}', v3 ? cssV3 : css)
    .replaceAll('{{CABECA_JS}}', cab)
    .replaceAll('{{CORPO_JS}}', corpo)
    .replaceAll('{{JSONLD}}', jsonld);
  if (/\{\{[A-Z_]+\}\}/.test(s)) throw new Error('marcador sobrando em ' + src);
  if (/ style="/.test(s)) throw new Error('style inline em ' + src + ' (a CSP bloqueia)');
  s = s.replace(/>\s+</g, '><');
  fs.mkdirSync(path.dirname(path.join(D, dst)), { recursive: true });
  fs.writeFileSync(path.join(D, dst), s);
}

// hashes da CSP a partir dos arquivos FINAIS
const h = (s) => "'sha256-" + crypto.createHash('sha256').update(s, 'utf8').digest('base64') + "'";
const scr = new Set();
const sty = new Set();
for (const [, f] of PAGINAS) {
  const s = fs.readFileSync(path.join(D, f), 'utf8');
  for (const m of s.matchAll(/<script>([\s\S]*?)<\/script>/g)) scr.add(h(m[1]));
  for (const m of s.matchAll(/<style>([\s\S]*?)<\/style>/g)) sty.add(h(m[1]));
}

fs.cpSync(path.join(S, 'assets'), path.join(D, 'assets'), { recursive: true });
fs.rmSync(path.join(D, 'assets/marca.svg'));
fs.copyFileSync(path.join(S, 'assets/marca.svg'), path.join(D, 'favicon.svg'));
const G = path.join(R, 'gerado');
if (fs.existsSync(path.join(G, 'apple-touch-icon.png'))) fs.copyFileSync(path.join(G, 'apple-touch-icon.png'), path.join(D, 'apple-touch-icon.png'));
if (fs.existsSync(path.join(G, 'og.jpg'))) fs.copyFileSync(path.join(G, 'og.jpg'), path.join(D, 'assets/og.jpg'));
fs.writeFileSync(path.join(D, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://dcsolutions.app/sitemap.xml\n');
fs.writeFileSync(
  path.join(D, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    ['', 'privacidade', 'termos'].map((u) => `<url><loc>https://dcsolutions.app/${u}</loc></url>`).join('') +
    '</urlset>\n',
);

const csp = [
  "default-src 'none'",
  `script-src ${[...scr].join(' ')}`,
  `style-src ${[...sty].join(' ')}`,
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');
fs.mkdirSync(path.join(R, 'worker'), { recursive: true });
fs.writeFileSync(path.join(R, 'worker', 'csp.js'), '// gerado por ferramentas/build.mjs\nexport const CSP = ' + JSON.stringify(csp) + ';\n');
console.log('dist ok; scripts', scr.size, 'styles', sty.size);
