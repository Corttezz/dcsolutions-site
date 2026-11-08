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
    if (url.hostname === 'www.dcsolutions.app') {
      url.hostname = 'dcsolutions.app';
      return Response.redirect(url.toString(), 301);
    }
    const p = url.pathname;
    // Vitrine v2 atrás da flag VITRINE_V2 ('1' liga). Desligada: / segue igual e /vitrine-v2.html dá 404.
    const ligada = env.VITRINE_V2 === '1';
    // Vitrine v3 (revisão 08/11) atrás da flag VITRINE_V3 ('1' liga; tem prioridade sobre a v2).
    // Ligada: /, /en, /privacidade, /termos e as páginas 404 vêm da v3. Desligada: tudo igual e as páginas *-v3 dão 404.
    const v3 = env.VITRINE_V3 === '1';
    const V3 = { '/': '/vitrine-v3', '/en': '/vitrine-v3-en', '/en/': '/vitrine-v3-en', '/privacidade': '/privacidade-v3', '/termos': '/termos-v3' };
    const paginaV3 = /^\/(vitrine-v3(-en)?|privacidade-v3|termos-v3|404-v3)(\.html)?$/.test(p);
    let alvo = req;
    let status;
    if (v3 && V3[p]) alvo = new Request(new URL(V3[p], url), req);
    else if (p === '/' && ligada) alvo = new Request(new URL('/vitrine-v2', url), req);
    else if (((p === '/vitrine-v2' || p === '/vitrine-v2.html') && !ligada) || (paginaV3 && !v3)) {
      alvo = new Request(new URL('/404', url), req);
      status = 404;
    }
    let r = await env.ASSETS.fetch(alvo);
    if (v3 && (r.status === 404 || status === 404)) {
      r = await env.ASSETS.fetch(new Request(new URL('/404-v3', url), req));
      status = 404;
    }
    const res = new Response(r.body, { status: status ?? r.status, headers: r.headers });
    for (const [k, v] of Object.entries(SEG)) res.headers.set(k, v);
    if (p.startsWith('/assets/')) res.headers.set('Cache-Control', 'public, max-age=2592000, stale-while-revalidate=86400');
    else if (/\.(svg|png|xml|txt)$/.test(p)) res.headers.set('Cache-Control', 'public, max-age=86400');
    else res.headers.set('Cache-Control', 'public, max-age=0, must-revalidate, no-transform');
    return res;
  },
};
