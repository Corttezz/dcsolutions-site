// Fotografa sites (Brave headless por pipe, sem porta CDP).
// uso: node ferramentas/fotografar.mjs <saida_dir> <url> <nome> [largura altura mobile fullpage]
import { createRequire } from 'module';
const require = createRequire('E:/dev/projects/Tiktok-accounts/package.json');
const { chromium } = require('playwright-core');
const [,, dir, url, nome, w='1440', h='900', mob='0', full='0'] = process.argv;
const b = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });
const m = mob === '1';
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: m ? 3 : 1, isMobile: m, hasTouch: m, locale: 'pt-BR' });
const p = await ctx.newPage();
const erros = [];
p.on('console', x => { if (x.type() === 'error') erros.push(x.text()); });
p.on('pageerror', e => erros.push('pageerror: ' + e.message));
await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => erros.push('goto: ' + e.message));
await p.waitForTimeout(2500);
await p.screenshot({ path: `${dir}/${nome}.png`, fullPage: full === '1' });
console.log(nome, 'erros:', erros.length, erros.slice(0, 5).join(' | '));
await b.close();
