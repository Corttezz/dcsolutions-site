// Monta dist/: inline de CSS/JS/partes, hashes da CSP e o módulo de cabeçalhos do Worker.
// uso: node ferramentas/build.mjs
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { lerPosts, paginaPost, paginaIndice, INDEXNOW_KEY } from './blog.mjs';

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
// marca da v3: logo B "Anel" (aprovado pelo Daniel em 08/11), em currentColor para servir no claro e no escuro
const marcaV3 = '<svg class="anel" viewBox="0 0 48 48" aria-hidden="true"><path d="M37 13.1A17 17 0 1 0 37 34.9" fill="none" stroke="currentColor" stroke-width="6"/><path d="M16.5 15.5H23A8.5 8.5 0 0 1 23 32.5H16.5Z" fill="currentColor"/></svg>';
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
// v3 (revisão 08/11): CSS, topo, rodapé e marca próprios, servida pelo Worker só com VITRINE_V3=1.
// O 4º campo é a língua da v3 ('pt' ou 'en'); 'legado' reaproveita o corpo das páginas legais com a cabeça da v3.
const PAGINAS = [
  ['index.html', 'index.html'],
  ['index-v2.html', 'vitrine-v2.html', 'partes/rodape-v2.html'],
  ['index-v3.html', 'vitrine-v3.html', 'partes/rodape-v3.html', 'pt'],
  ['index-v3-en.html', 'vitrine-v3-en.html', 'partes/rodape-v3-en.html', 'en'],
  ['privacidade/index.html', 'privacidade-v3.html', 'partes/rodape-v3.html', 'pt', 'legado'],
  ['termos/index.html', 'termos-v3.html', 'partes/rodape-v3.html', 'pt', 'legado'],
  ['404-v3.html', '404-v3.html', 'partes/rodape-v3.html', 'pt'],
  // v4 (08/11): só inglês, servida pelo Worker só com VITRINE_V4=1 (tem prioridade sobre a v3)
  ['index-v4.html', 'vitrine-v4.html', 'partes/rodape-v4.html', 'v4'],
  ['privacy-v4.html', 'privacy-v4.html', 'partes/rodape-v4.html', 'v4'],
  ['terms-v4.html', 'terms-v4.html', 'partes/rodape-v4.html', 'v4'],
  // /about e /press (13/11): textos do SEO & Growth, no layout das páginas legais
  ['about-v4.html', 'about-v4.html', 'partes/rodape-v4.html', 'v4'],
  ['press-v4.html', 'press-v4.html', 'partes/rodape-v4.html', 'v4'],
  ['404-v4.html', '404-v4.html', 'partes/rodape-v4.html', 'v4'],
  ['privacidade/index.html', 'privacidade.html'],
  ['termos/index.html', 'termos.html'],
  ['404.html', '404.html'],
];
// Blog (13/11): content/posts/*.md -> blog/<slug>.html e blog/index.html, no visual da v4 (ver ferramentas/blog.mjs).
// POSTS_DIR troca a pasta só para testar o pipeline no local (nunca publique com ela).
const POSTS_DIR = process.env.POSTS_DIR || path.join(R, 'content', 'posts');
const ROTAS = new Set(['/', '/privacy', '/terms', '/about', '/press', '/blog/', ...[...ler('index-v4.html').matchAll(/\sid="([a-z0-9-]+)"/g)].map((m) => '/#' + m[1])]);
const POSTS = lerPosts(POSTS_DIR, ROTAS, S);
for (const p of POSTS) PAGINAS.push([{ html: paginaPost(p) }, `blog/${p.slug}.html`, 'partes/rodape-v4.html', 'v4']);
PAGINAS.push([{ html: paginaIndice(POSTS) }, 'blog/index.html', 'partes/rodape-v4.html', 'v4']);
const cssV3 = minCss('css/v3.css');
const cssV4 = cssV3 + minCss('css/v4.css');
// JSON-LD da v3: logo novo, as 5 marcas (PartiuGringa e Grimoire sem URL) e quem faz (só o nome, sem links)
const jsonldV3 = JSON.stringify({
  ...JSON.parse(jsonld),
  logo: 'https://dcsolutions.app/assets/v3/marca/icone-512.png',
  founder: { '@type': 'Person', name: 'Daniel Cortez' },
  brand: [
    { '@type': 'Brand', name: 'IQNorth', url: 'https://iqnorth.com/' },
    { '@type': 'Brand', name: 'Fytform', url: 'https://fytform.com/' },
    { '@type': 'Brand', name: 'H2HScout', url: 'https://h2hscout.com/' },
    { '@type': 'Brand', name: 'Grimoire' },
    { '@type': 'Brand', name: 'PartiuGringa' },
  ],
});
// JSON-LD da v4: sem a cidade (o endereço completo fica só na linha legal do rodapé), IQNorth em inglês e PartiuGringa no ar (09/11)
const jsonldV4 = JSON.stringify({
  ...JSON.parse(jsonldV3),
  url: 'https://dcsolutions.app/',
  address: { '@type': 'PostalAddress', addressCountry: 'BR' },
  brand: JSON.parse(jsonldV3).brand.map((m) => (m.name === 'IQNorth' ? { ...m, url: 'https://iqnorth.com/en/' } : m.name === 'PartiuGringa' ? { ...m, url: 'https://partiugringa.com/' } : m)),
});
// SEO DC-1/DC-2 (13/11): @id da organização, URL do jogo e bloco WebSite. Nome do jogo: Runemoire desde 13/11 (logo novo
// aprovado); "Grimoire" fica em alternateName por um tempo, para quem busca o nome antigo e bloco WebSite. sameAs fica de fora: a empresa não tem perfil oficial próprio.
const jsonldV4b = JSON.stringify({
  '@context': 'https://schema.org',
  '@id': 'https://dcsolutions.app/#organization',
  ...JSON.parse(jsonldV4),
  brand: JSON.parse(jsonldV4).brand.map((m) => (m.name === 'Grimoire' ? { ...m, name: 'Runemoire', alternateName: 'Grimoire', url: 'https://runemoire.com/' } : m)),
});
const jsonldSite = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'DC Solutions',
  url: 'https://dcsolutions.app/',
  inLanguage: 'en',
  publisher: { '@id': 'https://dcsolutions.app/#organization' },
});
const PRELOAD_V3 = ['barlow-400', 'barlow-600', 'barlow-cond-700', 'barlow-cond-600']
  .map((f) => `<link rel="preload" href="/assets/fonts/${f}.woff2" as="font" type="font/woff2" crossorigin>`).join('\n');
const ICONES_V3 = [
  '<link rel="icon" href="/assets/v3/marca/favicon.ico" sizes="32x32">',
  '<link rel="icon" href="/assets/v3/marca/favicon.svg" type="image/svg+xml">',
  '<link rel="apple-touch-icon" href="/assets/v3/apple-touch-icon.png">',
  '<link rel="manifest" href="/site.webmanifest">',
].join('\n');
const cabecaLegadoV3 = (s) => {
  const trocas = [
    ['<meta name="theme-color" content="#0c0c0d">', '<meta name="theme-color" content="#1f2d4d">'],
    ['<link rel="icon" href="/favicon.svg" type="image/svg+xml">', ICONES_V3],
    ['<link rel="preload" href="/assets/fonts/sans.woff2" as="font" type="font/woff2" crossorigin>', PRELOAD_V3],
  ];
  for (const [a, b] of trocas) { if (!s.includes(a)) throw new Error('cabeça legada mudou: ' + a); s = s.replace(a, b); }
  return s;
};
// Clarity (13/11, opção A do Lead): só nas páginas v4 públicas, sem cookies (consentv2 negado antes de o script carregar).
// Opção B (cookies _clck/_clsk + banner) só com OK do Daniel.
const CLARITY = '<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.crossOrigin="anonymous";t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","zd7s4jl9z8");window.clarity("consentv2",{ad_Storage:"denied",analytics_Storage:"denied"});</script>';
for (const [src, dst, rod, v3, legado] of PAGINAS) {
  const m = v3 ? marcaV3 : marca;
  const topoV3 = v3 && ler(v3 === 'v4' ? 'partes/topo-v4.html' : v3 === 'en' ? 'partes/topo-v3-en.html' : 'partes/topo-v3.html').replaceAll('{{MARCA}}', m);
  const nome = typeof src === 'object' ? dst : src;
  let s = (typeof src === 'object' ? src.html : legado ? cabecaLegadoV3(ler(src)) : ler(src))
    .replaceAll('{{TOPO}}', v3 ? topoV3 : topo)
    .replaceAll('{{RODAPE}}', rod ? ler(rod).replaceAll('{{MARCA}}', m) : rodape)
    .replaceAll('{{PRELOAD_V3}}', PRELOAD_V3)
    .replaceAll('{{ICONES_V3}}', ICONES_V3)
    .replaceAll('{{CSS}}', v3 === 'v4' ? cssV4 : v3 ? cssV3 : css)
    .replaceAll('{{CABECA_JS}}', cab)
    .replaceAll('{{CORPO_JS}}', corpo)
    .replaceAll('{{JSONLD_V3}}', jsonldV3)
    .replaceAll('{{JSONLD_V4}}', jsonldV4b)
    .replaceAll('{{JSONLD_SITE}}', jsonldSite)
    .replaceAll('{{JSONLD}}', jsonld);
  if (/\{\{[A-Z_]+\}\}/.test(s)) throw new Error('marcador sobrando em ' + nome);
  if (/ style="/.test(s)) throw new Error('style inline em ' + nome + ' (a CSP bloqueia)');
  if (v3 === 'v4') { if (!s.includes('</head>')) throw new Error('sem </head> em ' + nome); s = s.replace('</head>', CLARITY + '</head>'); }
  // o blog não passa pelo aperto de espaços: ele comeria o espaço entre um link e o negrito do texto do post
  if (!dst.startsWith('blog/')) s = s.replace(/>\s+</g, '><');
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
// /favicon.ico (pedido automático dos navegadores): o ícone da v3
fs.copyFileSync(path.join(S, 'assets/v3/marca/favicon.ico'), path.join(D, 'favicon.ico'));
const G = path.join(R, 'gerado');
if (fs.existsSync(path.join(G, 'apple-touch-icon.png'))) fs.copyFileSync(path.join(G, 'apple-touch-icon.png'), path.join(D, 'apple-touch-icon.png'));
if (fs.existsSync(path.join(G, 'og.jpg'))) fs.copyFileSync(path.join(G, 'og.jpg'), path.join(D, 'assets/og.jpg'));
// /llms.txt (13/11): resumo da empresa e dos produtos para assistentes de IA; só fato que já está na vitrine. Fora do sitemap.
// Seção "## Blog" gerada dos posts (13/11): cada post novo entra sozinho no mesmo deploy; sem post, não há seção.
const llmsBlog = POSTS.length
  ? '\n## Blog\n\n- [Blog](https://dcsolutions.app/blog/): Articles from DC Solutions on how we plan, build, launch and look after small digital products.\n' +
    [...POSTS].sort((a, b) => (b.data > a.data ? 1 : -1)).map((p) => `- [${p.titulo}](https://dcsolutions.app/blog/${p.slug}): ${p.descricao}\n`).join('')
  : '';
fs.writeFileSync(path.join(D, 'llms.txt'), fs.readFileSync(path.join(S, 'llms.txt'), 'utf8').trimEnd() + '\n' + llmsBlog);
fs.writeFileSync(path.join(D, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://dcsolutions.app/sitemap.xml\n');
// sitemap.xml é o da v4; o Worker serve sitemap-v3.xml no lugar dele com VITRINE_V4 desligada
const sitemap = (us, lm = {}) => '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
  us.map((u) => `<url><loc>https://dcsolutions.app/${u}</loc>${lm[u] ? `<lastmod>${lm[u]}</lastmod>` : ''}</url>`).join('') + '</urlset>\n';
// lastmod (SEO DC-11): data real da última mudança de cada página. ATUALIZE ao publicar mudança na página.
const LASTMOD_V4 = { '': '2026-11-13', privacy: '2026-11-13', terms: '2026-11-13', about: '2026-11-13', press: '2026-11-13' };
// blog: cada post com lastmod (atualizado ou data); o índice /blog/ só entra quando houver post (sem post ele tem noindex)
const blogUrls = POSTS.map((p) => `blog/${p.slug}`);
for (const p of POSTS) LASTMOD_V4[`blog/${p.slug}`] = p.atualizado || p.data;
if (POSTS.length) LASTMOD_V4['blog/'] = POSTS.map((p) => p.atualizado || p.data).sort().pop();
fs.writeFileSync(path.join(D, 'sitemap.xml'), sitemap(['', 'privacy', 'terms', 'about', 'press', ...(POSTS.length ? ['blog/', ...blogUrls] : [])], LASTMOD_V4));
// IndexNow: a chave é pública por definição (o arquivo na raiz prova que o site é nosso); o ping é ferramentas/indexnow.mjs
fs.writeFileSync(path.join(D, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY);
// manifest (SEO DC-13), com os ícones da marca Anel
fs.writeFileSync(path.join(D, 'site.webmanifest'), JSON.stringify({
  name: 'DC Solutions', short_name: 'DC Solutions', start_url: '/', display: 'browser',
  background_color: '#f1f2ee', theme_color: '#1f2d4d',
  icons: [
    { src: '/assets/v3/marca/icone-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/assets/v3/marca/icone-512.png', sizes: '512x512', type: 'image/png' },
  ],
}) + '\n');
fs.writeFileSync(path.join(D, 'sitemap-v3.xml'), sitemap(['', 'en', 'privacidade', 'termos']));
// OG da v4: a imagem em inglês da v3 (sem cidade), num endereço novo por causa do cache de 30 dias
fs.mkdirSync(path.join(D, 'assets/v4'), { recursive: true });
fs.copyFileSync(path.join(S, 'assets/v3/og-en.jpg'), path.join(D, 'assets/v4/og.jpg'));

const csp = [
  "default-src 'none'",
  `script-src ${[...scr].join(' ')} https://*.clarity.ms`,
  `style-src ${[...sty].join(' ')}`,
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' https://*.clarity.ms",
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');
fs.mkdirSync(path.join(R, 'worker'), { recursive: true });
fs.writeFileSync(path.join(R, 'worker', 'csp.js'), '// gerado por ferramentas/build.mjs\nexport const CSP = ' + JSON.stringify(csp) + ';\n');
console.log('dist ok; scripts', scr.size, 'styles', sty.size);
