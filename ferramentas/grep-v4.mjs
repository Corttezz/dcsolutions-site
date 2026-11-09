// Grep da v4 (só inglês): português, "Divinópolis" e termos proibidos dos Leads no HTML (texto, atributos, meta e JSON-LD).
// "Divinópolis" é aceito só no endereço legal do rodapé e no foro de /terms (decisão de 08/11). Sai com código 1 se achar algo fora disso.
// uso: node ferramentas/grep-v4.mjs <base_url>   (padrão: arquivos de dist/)
import fs from 'fs';
const BASE = process.argv[2];
const PAGS = [['/', 'vitrine-v4.html'], ['/privacy', 'privacy-v4.html'], ['/terms', 'terms-v4.html'], ['/nao-existe', '404-v4.html']];
const PT = / de | da | para | com | não |ção|ções|você|Produtos|Perguntas|Privacidade|Termos de uso|Página|Fale|Feito em|Divin[oó]polis/g;
const PROIBIDO = /cartola|steam|waitlist|wait ?list|lista de espera|7 days|7 dias|\bfree\b|grátis|official IQ|QI oficial|diagnos|clinical|psycholog|premium|lifetime|\bbets?\b|betting|odds|Over 2|Ambas|App Store|Play Store|Google Play|\bAPK\b|wishlist|guarantee|garantia|testimonial|2\.847|4[,.]9\b|97 ?%|R\$ 500|R\$ 800|sob medida|custom-made|we build for you/gi;
let total = 0, aceitos = 0;
for (const [u, f] of PAGS) {
  const html = BASE ? await (await fetch(BASE + u)).text() : fs.readFileSync('dist/' + f, 'utf8');
  // tira CSS; mantém texto, atributos e JSON-LD; ignora class/id/href/src (código, não texto)
  const t = html.replace(/<style>[\s\S]*?<\/style>/g, ' ').replace(/\s(class|id|href|d|src|srcset|sizes|rel|hreflang|aria-labelledby|type|loading|decoding)="[^"]*"/g, ' ').replace(/</g, '\n<');
  const linhas = t.split('\n');
  for (const [nome, re] of [['português', PT], ['proibido', PROIBIDO]]) {
    for (const l of linhas) for (const m of l.matchAll(re)) {
      // "Divinópolis" só pode aparecer em dois lugares: o endereço legal do rodapé (todas as páginas) e o foro de /terms
      const permitido = /Divin/.test(m[0]) && (l.startsWith('<address>') || (u === '/terms' && /courts of the district of Divinópolis, Minas Gerais, Brazil/.test(l)));
      if (permitido) { aceitos++; console.log(u, 'permitido', JSON.stringify(m[0]), '→', l.trim().slice(0, 140)); continue; }
      total++; console.log(u, nome, JSON.stringify(m[0]), '→', l.trim().slice(0, 140));
    }
  }
}
console.log('ocorrências fora do permitido:', total, '| Divinópolis nos lugares permitidos:', aceitos);
process.exitCode = total ? 1 : 0;
