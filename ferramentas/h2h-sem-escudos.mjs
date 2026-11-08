// H2HScout sem escudos (08/11): o H2H Lead proíbe escudos de clubes, mesmo nas telas que ele mandou.
// Acha cada escudo (círculo claro, quase quadrado, de 26 a 90 px) e cobre com um círculo na cor do fundo ao lado.
// Os nomes dos times ficam. Gera os prints do H2HScout da v2 (prints/h2hscout-d-*, -m-*) e da v3 (v3/prints/h2hscout-cel-*).
// uso: node ferramentas/h2h-sem-escudos.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire('E:/dev/projects/Tiktok-accounts/package.json');
const { chromium } = require('playwright-core');

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const H2H = 'E:/dev/projects/h2hscout-landing/landing/img/';
const b = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });
const p = await b.newPage();

// devolve a imagem limpa (data URL PNG) e a lista de escudos cobertos
async function limpar(arquivo) {
  const src = 'data:image/webp;base64,' + fs.readFileSync(arquivo).toString('base64');
  return p.evaluate(async (src) => {
    const i = new Image(); i.src = src; await i.decode();
    const W = i.width, H = i.height;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'); x.drawImage(i, 0, 0);
    const d = x.getImageData(0, 0, W, H).data;
    const claro = new Uint8Array(W * H);
    for (let k = 0; k < W * H; k++) claro[k] = d[k * 4] > 200 && d[k * 4 + 1] > 200 && d[k * 4 + 2] > 200 ? 1 : 0;
    const visto = new Uint8Array(W * H);
    const achados = [];
    const pilha = [];
    for (let k = 0; k < W * H; k++) {
      if (!claro[k] || visto[k]) continue;
      let x0 = W, y0 = H, x1 = 0, y1 = 0, n = 0;
      pilha.push(k); visto[k] = 1;
      while (pilha.length) {
        const q = pilha.pop(); const qx = q % W, qy = (q / W) | 0; n++;
        if (qx < x0) x0 = qx; if (qx > x1) x1 = qx; if (qy < y0) y0 = qy; if (qy > y1) y1 = qy;
        for (const v of [q - 1, q + 1, q - W, q + W]) {
          if (v < 0 || v >= W * H || visto[v] || !claro[v]) continue;
          if ((v === q - 1 && qx === 0) || (v === q + 1 && qx === W - 1)) continue;
          visto[v] = 1; pilha.push(v);
        }
      }
      const w = x1 - x0 + 1, h = y1 - y0 + 1, fill = n / (w * h);
      if (w >= 26 && w <= 90 && h >= 26 && h <= 90 && Math.abs(w - h) <= 8 && fill > 0.3 && fill < 0.95) achados.push({ x0, y0, w, h });
    }
    for (const a of achados) {
      const cx = a.x0 + a.w / 2, cy = a.y0 + a.h / 2, r = Math.max(a.w, a.h) / 2 + 3;
      const sx = Math.max(0, Math.round(a.x0 - 8)), sy = Math.round(cy);
      const o = (sy * W + sx) * 4;
      x.fillStyle = `rgb(${d[o]},${d[o + 1]},${d[o + 2]})`;
      x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    }
    return { url: c.toDataURL('image/png'), achados: achados.map((a) => [Math.round(a.x0 + a.w / 2), Math.round(a.y0 + a.h / 2), a.w]) };
  }, src);
}

async function webp(url, dir, nome, larguras, corte) {
  for (const w of larguras) {
    const [d, h] = await p.evaluate(async ([src, w, corte]) => {
      const i = new Image(); i.src = src; await i.decode();
      const [cx, cy, cw, ch] = corte;
      const c = document.createElement('canvas'); c.width = w; c.height = Math.round(ch * w / cw);
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(i, cx, cy, cw, ch, 0, 0, c.width, c.height);
      return [c.toDataURL('image/webp', 0.82), c.height];
    }, [url, w, corte]);
    fs.writeFileSync(path.join(dir, `${nome}-${w}.webp`), Buffer.from(d.split(',')[1], 'base64'));
    console.log(nome, w + 'x' + h);
  }
}

const desk = await limpar(H2H + 'demo-ofensiva-1800.webp');
console.log('desktop: escudos cobertos', desk.achados.length, JSON.stringify(desk.achados));
const cel = await limpar(H2H + 'demo-ofensiva-cel-860.webp');
console.log('celular: escudos cobertos', cel.achados.length, JSON.stringify(cel.achados));
fs.writeFileSync(path.join(R, '..', '_handoff', 'dcsolutions-vitrine-revisao', 'h2h-sem-escudos-conferencia.json'), JSON.stringify({ desk: desk.achados, cel: cel.achados }, null, 1));

// mesmos recortes de antes: sem a barra do topo ("Cartola", "Apostas", selo) e sem o cursor
const PRINTS = path.join(R, 'src/assets/prints');
const V3 = path.join(R, 'src/assets/v3/prints');
await webp(desk.url, PRINTS, 'h2hscout-d', [640, 1120], [0, 104, 1626, 1016]);
await webp(cel.url, PRINTS, 'h2hscout-m', [240, 480], [0, 128, 556, 1112]);
await webp(cel.url, V3, 'h2hscout-cel', [300, 600], [0, 128, 860, 1112]);
await b.close();
console.log('ok');
