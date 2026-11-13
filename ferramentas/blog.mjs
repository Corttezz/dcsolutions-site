// Blog do dcsolutions.app (13/11/2026): lê content/posts/*.md (frontmatter do FLUXO-POSTS do SEO & Growth),
// valida e gera as páginas /blog/<slug> e o índice /blog/. Usado por ferramentas/build.mjs; sem dependências.
// Regras que fazem o build FALHAR (o post volta ao SEO & Growth com o motivo):
//   campo obrigatório faltando; idioma diferente de inglês; title > 60; description fora de 140-155; slug inválido ou repetido;
//   "[CHECK]" no texto; mais de um H1; preço; "Steam"; o nome antigo "Grimoire" (o jogo é Runemoire desde 13/11);
//   link interno para página que não existe; CTA fora da vitrine; imagem local que não existe; imagem sem alt.
import fs from 'fs';
import path from 'path';

export const SITE = 'https://dcsolutions.app';
// chave pública do IndexNow (servida em /<chave>.txt); não é segredo de conta
export const INDEXNOW_KEY = '8a85d1fa6de1961caec4e6d27adba135';
const CAMPOS = ['titulo', 'descricao', 'slug', 'idioma', 'palavra_chave', 'categoria', 'data'];
const MESES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const dataLonga = (d) => { const [a, m, dd] = d.split('-').map(Number); return `${MESES[m - 1]} ${dd}, ${a}`; };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
const texto = (html) => html.replace(/<[^>]+>/g, '').replace(/&#123;/g, '{').replace(/&#125;/g, '}').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const ancora = (s) => texto(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// frontmatter simples: chave: "texto" | 'texto' | texto | ["a", "b"]
export function frontmatter(bruto, arq) {
  const m = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(bruto);
  if (!m) throw new Error(`${arq}: sem frontmatter entre ---`);
  const fm = {};
  for (const l of m[1].split(/\r?\n/)) {
    if (!l.trim() || l.trim().startsWith('#')) continue;
    const k = /^([a-z_]+):\s*(.*)$/.exec(l);
    if (!k) throw new Error(`${arq}: linha do frontmatter inválida: ${l}`);
    let v = k[2].trim();
    if (v.startsWith('[') || v.startsWith('"')) v = JSON.parse(v);
    else if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
    fm[k[1]] = v;
  }
  return { fm, corpo: m[2].replace(/\r\n/g, '\n') };
}

// Markdown -> HTML (só o necessário para post: títulos, parágrafos, listas, citação, tabela, código, imagem, link, negrito, itálico)
function inline(s, ctx) {
  const guard = [];
  const g = (h) => `\u0000${guard.push(h) - 1}\u0000`;
  let t = s.replace(/`([^`]+)`/g, (_, c) => g(`<code>${esc(c)}</code>`));
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => g(ctx.imagem(src, alt)));
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, href) => g(ctx.link(href, inline(txt, ctx))));
  t = esc(t)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g, '$1<em>$2</em>');
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => guard[+i]);
}

export function markdown(md, ctx) {
  const L = md.split('\n');
  const blocos = [];
  let h1 = null;
  let i = 0;
  const lista = (re, tag) => {
    const itens = [];
    while (i < L.length && re.test(L[i])) { itens.push(`<li>${inline(L[i].replace(re, ''), ctx)}</li>`); i++; }
    blocos.push({ tipo: tag, html: `<${tag}>${itens.join('')}</${tag}>` });
  };
  while (i < L.length) {
    const l = L[i];
    if (!l.trim()) { i++; continue; }
    if (/^\s*<!--/.test(l)) { while (i < L.length && !L[i].includes('-->')) i++; i++; continue; }
    if (l.trim() === '{{CTA}}') { blocos.push({ tipo: 'cta' }); i++; continue; }
    if (/^```/.test(l)) {
      const cod = []; i++;
      while (i < L.length && !/^```/.test(L[i])) cod.push(L[i++]);
      i++; blocos.push({ tipo: 'pre', html: `<pre><code>${esc(cod.join('\n'))}</code></pre>` }); continue;
    }
    let m;
    if ((m = /^#\s+(.+)$/.exec(l))) { if (h1) throw new Error(`${ctx.arq}: mais de um H1`); h1 = inline(m[1].trim(), ctx); i++; continue; }
    if ((m = /^(#{2,4})\s+(.+)$/.exec(l))) {
      const n = m[1].length, h = inline(m[2].trim(), ctx);
      blocos.push({ tipo: 'h' + n, html: `<h${n} id="${ancora(h)}">${h}</h${n}>`, txt: texto(h) }); i++; continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(l)) { blocos.push({ tipo: 'hr', html: '<hr>' }); i++; continue; }
    if (/^\s*[-*+]\s+/.test(l)) { lista(/^\s*[-*+]\s+/, 'ul'); continue; }
    if (/^\s*\d+[.)]\s+/.test(l)) { lista(/^\s*\d+[.)]\s+/, 'ol'); continue; }
    if (/^>\s?/.test(l)) {
      const q = [];
      while (i < L.length && /^>\s?/.test(L[i])) q.push(L[i++].replace(/^>\s?/, ''));
      blocos.push({ tipo: 'blockquote', html: `<blockquote><p>${inline(q.join(' '), ctx)}</p></blockquote>` }); continue;
    }
    if (/^\|/.test(l) && i + 1 < L.length && /^\|?\s*:?-{3,}/.test(L[i + 1])) {
      const cel = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim(), ctx));
      const cab = cel(l); i += 2;
      const lin = [];
      while (i < L.length && /^\|/.test(L[i])) lin.push(cel(L[i++]));
      blocos.push({ tipo: 'table', html: `<div class="tabela"><table><thead><tr>${cab.map((c) => `<th scope="col">${c}</th>`).join('')}</tr></thead><tbody>${lin.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` });
      continue;
    }
    const p = [];
    while (i < L.length && L[i].trim() && !/^(#{1,4}\s|```|>|\s*[-*+]\s|\s*\d+[.)]\s|\||<!--|-{3,}\s*$)/.test(L[i]) && L[i].trim() !== '{{CTA}}') p.push(L[i++].trim());
    if (!p.length) throw new Error(`${ctx.arq}: linha não reconhecida: ${l}`);
    blocos.push({ tipo: 'p', html: `<p>${inline(p.join(' '), ctx)}</p>` });
  }
  return { h1, blocos };
}

// FAQ: a seção "## Perguntas frequentes" / "## Frequently asked questions" / "## FAQ", com cada pergunta em "### ..."
export function faq(blocos, arq) {
  const ini = blocos.findIndex((b) => b.tipo === 'h2' && /^(perguntas frequentes|frequently asked questions|faq)$/i.test(b.txt));
  if (ini < 0) return [];
  const qs = [];
  for (let k = ini + 1; k < blocos.length && blocos[k].tipo !== 'h2'; k++) {
    if (blocos[k].tipo === 'h3') qs.push({ q: blocos[k].txt, a: [] });
    else if (qs.length && blocos[k].html) qs[qs.length - 1].a.push(texto(blocos[k].html));
  }
  if (!qs.length || qs.some((x) => !x.a.length)) throw new Error(`${arq}: FAQ sem perguntas em "###" ou pergunta sem resposta`);
  return qs.map((x) => ({ q: x.q, a: x.a.join(' ') }));
}

const PRECO = /R\$|US\$|€|£|\$\s?\d|\d\s?(reais|dollars?|USD|BRL)\b|\bper month\b|\/mo\b/i;
export function lerPosts(dir, rotasValidas, srcDir) {
  if (!fs.existsSync(dir)) return [];
  const posts = [];
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
    const arq = path.join(dir, f);
    const bruto = fs.readFileSync(arq, 'utf8');
    const { fm, corpo } = frontmatter(bruto, f);
    const erro = (m) => { throw new Error(`${f}: ${m}`); };
    for (const c of CAMPOS) if (!fm[c] || !String(fm[c]).trim()) erro(`campo "${c}" vazio`);
    if (!/^en(-[A-Z]{2})?$/.test(fm.idioma)) erro(`idioma "${fm.idioma}": o blog é só em inglês`);
    if (fm.titulo.length > 60) erro(`titulo com ${fm.titulo.length} caracteres (máx. 60)`);
    if (fm.descricao.length < 140 || fm.descricao.length > 155) erro(`descricao com ${fm.descricao.length} caracteres (140 a 155)`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.slug) || fm.slug.length > 70) erro(`slug inválido "${fm.slug}"`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fm.data) || (fm.atualizado && !/^\d{4}-\d{2}-\d{2}$/.test(fm.atualizado))) erro('data fora do formato AAAA-MM-DD');
    if (/\[CHECK\]/i.test(bruto)) erro('tem [CHECK] (fato não verificado)');
    if (/\bsteam\b/i.test(bruto)) erro('cita Steam');
    if (/grimoire/i.test(bruto)) erro('cita o nome antigo Grimoire (o jogo se chama Runemoire)');
    if (PRECO.test(bruto)) erro(`cita preço: "${PRECO.exec(bruto)[0]}"`);
    const cta = fm.cta || '/#products';
    if (!/^\/(#[a-z0-9-]+)?$/.test(cta) || !rotasValidas.has(cta)) erro(`cta "${cta}" não é uma seção da vitrine`);
    const internos = new Set(Array.isArray(fm.links_internos) ? fm.links_internos : []);
    let capa = null;
    const im = typeof fm.imagem === 'string' ? /^(\/\S+)\s*\|\s*(.+)$/.exec(fm.imagem.trim()) : null;
    const ctx = {
      arq: f,
      link: (href, txt) => {
        if (/^javascript:/i.test(href)) erro('link javascript:');
        if (href.startsWith('/')) { internos.add(href); return `<a href="${esc(href)}">${txt}</a>`; }
        if (/^https?:\/\//.test(href)) return `<a href="${esc(href)}" rel="noopener">${txt}</a>`;
        if (/^mailto:/.test(href)) return `<a href="${esc(href)}">${txt}</a>`;
        erro(`link estranho "${href}"`);
      },
      imagem: (src, alt) => {
        if (!alt.trim()) erro(`imagem sem alt: ${src}`);
        if (!src.startsWith('/') || !fs.existsSync(path.join(srcDir, src))) erro(`imagem não existe em src/: ${src}`);
        return `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
      },
    };
    if (im) {
      if (!fs.existsSync(path.join(srcDir, im[1]))) erro(`capa não existe em src/: ${im[1]}`);
      capa = { src: im[1], alt: im[2].trim() };
    }
    const { h1, blocos } = markdown(corpo, ctx);
    if (!h1) erro('sem H1 ("# ...")');
    posts.push({ ...fm, cta, h1, blocos, faq: faq(blocos, f), capa, internos: [...internos], arq: f });
  }
  const vistos = new Set();
  for (const p of posts) { if (vistos.has(p.slug)) throw new Error(`slug repetido: ${p.slug}`); vistos.add(p.slug); }
  for (const p of posts) for (const r of p.internos) {
    const rota = r.replace(/\?.*$/, '');
    if (!rotasValidas.has(rota) && !(rota.startsWith('/blog/') && vistos.has(rota.slice(6).replace(/#.*$/, '')))) throw new Error(`${p.arq}: link interno para página que não existe: ${r}`);
  }
  return posts.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : a.slug.localeCompare(b.slug)));
}

const OG = `${SITE}/assets/v4/og-20261113.jpg`;
const cabeca = ({ titulo, desc, url, tipo, robots, imagem, extra = '' }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(desc)}">
${robots ? `<meta name="robots" content="${robots}">\n` : ''}<link rel="canonical" href="${url}">
<meta name="theme-color" content="#1f2d4d">
<meta property="og:type" content="${tipo}">
<meta property="og:site_name" content="DC Solutions">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${imagem || OG}">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
{{ICONES_V3}}
{{PRELOAD_V3}}
<style>{{CSS}}</style>
${extra}</head>
<body>
<div class="doc-topo">{{TOPO}}</div>
`;
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>\n`;
const ORG = { '@id': `${SITE}/#organization` };

export function paginaPost(p) {
  const url = `${SITE}/blog/${p.slug}`;
  const img = p.capa ? SITE + p.capa.src : OG;
  const mod = p.atualizado || p.data;
  let ctaUsado = false;
  const blocoCta = () => { ctaUsado = true; return `<aside class="post-cta" aria-label="Our products"><p>DC Solutions builds and runs small digital products, each made to solve one thing.</p><a class="btn btn-claro" href="${esc(p.cta)}">See the products</a></aside>`; };
  const corpo = p.blocos.map((b) => (b.tipo === 'cta' ? blocoCta() : b.html)).join('\n');
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'Article', headline: texto(p.h1), description: p.descricao, inLanguage: 'en', datePublished: p.data, dateModified: mod, image: img, mainEntityOfPage: url, articleSection: p.categoria, keywords: p.palavra_chave, author: { '@type': 'Organization', name: 'DC Solutions', ...ORG }, publisher: { '@type': 'Organization', name: 'DC Solutions', ...ORG, logo: { '@type': 'ImageObject', url: `${SITE}/assets/v3/marca/icone-512.png` } } },
    p.faq.length && { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: p.faq.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [['Home', `${SITE}/`], ['Blog', `${SITE}/blog/`], [texto(p.h1), url]].map(([name, item], k) => ({ '@type': 'ListItem', position: k + 1, name, item })) },
  ].filter(Boolean).map(ld).join('');
  return cabeca({ titulo: p.titulo, desc: p.descricao, url, tipo: 'article', imagem: img, extra: `<meta property="article:published_time" content="${p.data}">\n<meta property="article:modified_time" content="${mod}">\n${jsonld}` }) +
`<main id="content" class="doc post">
<article class="wrap">
<nav class="migalhas" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><a href="/blog/">Blog</a></li><li aria-current="page">${p.h1}</li></ol></nav>
<p class="post-meta"><span>${esc(p.categoria)}</span> · <time datetime="${p.data}">${dataLonga(p.data)}</time>${p.atualizado ? ` · updated <time datetime="${p.atualizado}">${dataLonga(p.atualizado)}</time>` : ''}</p>
<h1>${p.h1}</h1>
${p.capa ? `<img class="post-capa" src="${esc(p.capa.src)}" alt="${esc(p.capa.alt)}" decoding="async">\n` : ''}<div class="post-corpo">
${corpo}
</div>
${ctaUsado ? '' : blocoCta()}
</article>
</main>
{{RODAPE}}
</body>
</html>
`;
}

export function paginaIndice(posts) {
  const desc = 'Articles from DC Solutions, a Brazilian company that builds and runs small digital products: how we plan, build, launch and look after each one.';
  const lista = posts.length
    ? `<ul class="post-lista">${posts.map((p) => `<li><p class="post-meta"><span>${esc(p.categoria)}</span> · <time datetime="${p.data}">${dataLonga(p.data)}</time></p><h2><a href="/blog/${p.slug}">${esc(p.titulo)}</a></h2><p>${esc(p.descricao)}</p></li>`).join('\n')}</ul>`
    : '<p class="post-vazio">No articles yet. The first one is on its way.</p>';
  const extra = posts.length ? ld({ '@context': 'https://schema.org', '@type': 'Blog', name: 'DC Solutions blog', url: `${SITE}/blog/`, inLanguage: 'en', publisher: { '@type': 'Organization', name: 'DC Solutions', ...ORG }, blogPost: posts.map((p) => ({ '@type': 'BlogPosting', headline: p.titulo, url: `${SITE}/blog/${p.slug}`, datePublished: p.data })) }) : '';
  return cabeca({ titulo: 'Blog · DC Solutions', desc, url: `${SITE}/blog/`, tipo: 'website', robots: posts.length ? '' : 'noindex', extra }) +
`<main id="content" class="doc blog">
<div class="wrap">
<h1>Blog</h1>
<p class="data">${esc(desc)}</p>
${lista}
</div>
</main>
{{RODAPE}}
</body>
</html>
`;
}
