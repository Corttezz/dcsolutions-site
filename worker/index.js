// Worker do dcsolutions.app: www -> apex, cabeçalhos de segurança e cache dos assets estáticos.
import { CSP } from './csp.js';

const SEG = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
};

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const redir = (destino) => {
      const res = new Response(null, { status: 301, headers: { Location: destino, 'Cache-Control': 'public, max-age=3600' } });
      for (const [k, v] of Object.entries(SEG)) res.headers.set(k, v);
      return res;
    };
    if (url.hostname === 'www.dcsolutions.app') {
      url.hostname = 'dcsolutions.app';
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }
    const p = url.pathname;
    // SEO DC-7 (13/11): /index.html e barras repetidas vão direto ao caminho limpo, em 1 salto permanente.
    // (Location montada à mão: new URL('//', url) viraria endereço sem esquema.)
    const limpo = p.replace(/\/{2,}/g, '/').replace(/\/index\.html$/, '/');
    if (limpo !== p) return redir(url.origin + limpo + url.search);
    // Blog (13/11): /blog -> /blog/; /blog/<slug>/ e /blog/<slug>.html -> /blog/<slug> (endereço canônico do post).
    if (p === '/blog') return redir(url.origin + '/blog/' + url.search);
    const post = /^\/blog\/([a-z0-9-]+)(\/|\.html)$/.exec(p);
    if (post) return redir(url.origin + '/blog/' + post[1] + url.search);
    // Vitrine v2 atrás da flag VITRINE_V2 ('1' liga). Desligada: / segue igual e /vitrine-v2.html dá 404.
    const ligada = env.VITRINE_V2 === '1';
    // Vitrine v3 (revisão 08/11) atrás da flag VITRINE_V3 ('1' liga; tem prioridade sobre a v2).
    // Ligada: /, /en, /privacidade, /termos e as páginas 404 vêm da v3. Desligada: tudo igual e as páginas *-v3 dão 404.
    const v3 = env.VITRINE_V3 === '1';
    const V3 = { '/': '/vitrine-v3', '/en': '/vitrine-v3-en', '/en/': '/vitrine-v3-en', '/privacidade': '/privacidade-v3', '/termos': '/termos-v3' };
    const paginaV3 = /^\/(vitrine-v3(-en)?|privacidade-v3|termos-v3|404-v3)(\.html)?$/.test(p);
    // Vitrine v4 (08/11, só inglês) atrás da flag VITRINE_V4 ('1' liga; tem prioridade sobre a v3).
    // Ligada: / , /privacy, /terms e a 404 vêm da v4; /en, /privacidade e /termos dão 301; as páginas antigas em português dão 404.
    // Desligada ('0' = rollback para a v3): tudo como antes, as páginas *-v4 dão 404 e o sitemap volta ao da v3.
    const v4 = env.VITRINE_V4 === '1';
    const V4 = { '/': '/vitrine-v4', '/privacy': '/privacy-v4', '/terms': '/terms-v4', '/about': '/about-v4', '/press': '/press-v4' };
    // SEO DC-5 (13/11): /privacy/ e /terms/ dão 301 para a versão sem barra (antes respondiam 200 com o mesmo conteúdo).
    const R301 = { '/privacy/': '/privacy', '/terms/': '/terms', '/about/': '/about', '/press/': '/press', '/about.html': '/about', '/press.html': '/press', '/en': '/','/en/': '/', '/privacidade': '/privacy', '/privacidade/': '/privacy', '/privacidade.html': '/privacy', '/termos': '/terms', '/termos/': '/terms', '/termos.html': '/terms' };
    const paginaV4 = /^\/(vitrine-v4|privacy-v4|terms-v4|about-v4|press-v4|404-v4)(\.html)?$/.test(p);
    const antigaPt = /^\/(vitrine-v2|vitrine-v3(-en)?|privacidade-v3|termos-v3|404-v3|404|sitemap-v3)(\.(html|xml))?$/.test(p);
    if (v4 && R301[p]) return redir(url.origin + R301[p] + url.search);
    let alvo = req;
    let status;
    if (v4 && V4[p]) alvo = new Request(new URL(V4[p], url), req);
    else if (v4 && antigaPt) status = 404;
    else if (paginaV4 && !v4) { alvo = new Request(new URL('/404', url), req); status = 404; }
    else if (p === '/sitemap.xml' && !v4) alvo = new Request(new URL('/sitemap-v3.xml', url), req);
    else if (v3 && V3[p]) alvo = new Request(new URL(V3[p], url), req);
    else if (p === '/' && ligada) alvo = new Request(new URL('/vitrine-v2', url), req);
    else if (((p === '/vitrine-v2' || p === '/vitrine-v2.html') && !ligada) || (paginaV3 && !v3)) {
      alvo = new Request(new URL('/404', url), req);
      status = 404;
    }
    let r = status === 404 && v4 ? null : await env.ASSETS.fetch(alvo);
    if (v4 && (status === 404 || r.status === 404)) {
      r = await env.ASSETS.fetch(new Request(new URL('/404-v4', url), req));
      status = 404;
    } else if (v3 && (r.status === 404 || status === 404)) {
      r = await env.ASSETS.fetch(new Request(new URL('/404-v3', url), req));
      status = 404;
    }
    const res = new Response(r.body, { status: status ?? r.status, headers: r.headers });
    for (const [k, v] of Object.entries(SEG)) res.headers.set(k, v);
    if (p.startsWith('/assets/')) res.headers.set('Cache-Control', 'public, max-age=2592000, stale-while-revalidate=86400');
    else if (/\.(svg|png|xml|txt)$/.test(p)) res.headers.set('Cache-Control', 'public, max-age=86400');
    else res.headers.set('Cache-Control', 'public, max-age=0, must-revalidate, no-transform');
    // SEO DC-12 (13/11): charset no Content-Type do HTML.
    const ct = res.headers.get('Content-Type') || '';
    const html = ct.startsWith('text/html');
    if (html && !/charset/i.test(ct)) res.headers.set('Content-Type', 'text/html; charset=utf-8');
    // /llms.txt e demais .txt: charset também no texto puro (13/11)
    if (ct.startsWith('text/plain') && !/charset/i.test(ct)) res.headers.set('Content-Type', 'text/plain; charset=utf-8');
    // SEO DC-3 (13/11): o no-transform (que impede a Cloudflare de injetar o beacon) também impede a compressão na borda,
    // então o próprio Worker comprime o HTML em gzip quando o navegador aceita.
    // A Cloudflare troca o Accept-Encoding que chega ao Worker; o pedido original do navegador fica em cf.clientAcceptEncoding.
    const ae = req.cf && 'clientAcceptEncoding' in req.cf ? req.cf.clientAcceptEncoding || '' : req.headers.get('Accept-Encoding') || '';
    if (html && res.body && !res.headers.has('Content-Encoding') && /\bgzip\b/i.test(ae)) {
      const h = new Headers(res.headers);
      h.set('Content-Encoding', 'gzip');
      h.delete('Content-Length');
      h.append('Vary', 'Accept-Encoding');
      return new Response(res.body.pipeThrough(new CompressionStream('gzip')), { status: res.status, headers: h, encodeBody: 'manual' });
    }
    return res;
  },
};
