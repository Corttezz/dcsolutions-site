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
    const r = await env.ASSETS.fetch(req);
    const res = new Response(r.body, r);
    for (const [k, v] of Object.entries(SEG)) res.headers.set(k, v);
    const p = url.pathname;
    if (p.startsWith('/assets/')) res.headers.set('Cache-Control', 'public, max-age=2592000, stale-while-revalidate=86400');
    else if (/\.(svg|png|xml|txt)$/.test(p)) res.headers.set('Cache-Control', 'public, max-age=86400');
    else res.headers.set('Cache-Control', 'public, max-age=0, must-revalidate, no-transform');
    return res;
  },
};
