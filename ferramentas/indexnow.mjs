// Avisa o IndexNow (Bing, Yandex, Seznam, Naver...) das URLs novas ou mudadas do blog. Rode DEPOIS do deploy, quando o post já responde 200.
// uso: node ferramentas/indexnow.mjs [url ...]   (sem URL: todas as do blog no dist/sitemap.xml)   --seco: só mostra o pedido
// A chave é pública (arquivo /<chave>.txt servido pelo site); não é segredo de conta.
import fs from 'fs';
import { INDEXNOW_KEY, SITE } from './blog.mjs';

const seco = process.argv.includes('--seco');
let urls = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!urls.length) urls = [...fs.readFileSync('dist/sitemap.xml', 'utf8').matchAll(/<loc>([^<]+\/blog\/[^<]*)<\/loc>/g)].map((m) => m[1]);
if (!urls.length) { console.log('nenhuma URL do blog no sitemap: nada a avisar'); process.exit(0); }
if (urls.some((u) => !u.startsWith(SITE + '/'))) throw new Error('só URLs de ' + SITE);
const corpo = { host: new URL(SITE).host, key: INDEXNOW_KEY, keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`, urlList: urls };
if (seco) { console.log(JSON.stringify(corpo, null, 2)); process.exit(0); }
// confere antes que a chave e as URLs estão no ar
const chave = await fetch(corpo.keyLocation);
if (!chave.ok || (await chave.text()).trim() !== INDEXNOW_KEY) throw new Error('arquivo da chave não está no ar: ' + corpo.keyLocation);
for (const u of urls) { const r = await fetch(u, { redirect: 'manual' }); if (r.status !== 200) throw new Error(`${u} respondeu ${r.status}`); }
const r = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(corpo) });
console.log('IndexNow', r.status, r.statusText, '| URLs:', urls.length);
// 200 ou 202 = aceito; 422 = URL fora do host ou chave inválida; 429 = muitas chamadas
process.exitCode = r.status === 200 || r.status === 202 ? 0 : 1;
