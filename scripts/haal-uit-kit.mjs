// Haalt verzonden edities van Waarvoor doe je het? uit Kit en zet ze als markdown in
// waarvoor-doe-je-het/_edities/. Daarna bouwt scripts/bouw-archief.mjs de pagina's.
//
// Draait elke zondag via .github/workflows/archief.yml. Nodig: geheim KIT_API_KEY (Kit, V4-sleutel).
// Pakt alleen broadcasts waarvan de Description begint met "Waarvoor doe je het?",
// bijvoorbeeld: Waarvoor doe je het? | editie 21
// Bestaat een editie al (zelfde nummer of zelfde kit-id), dan blijft het bestand ongemoeid.
// Blokken met de klasse alleen-mail komen niet op de site, net als bij Nu of ooit.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BRON = join(ROOT, 'waarvoor-doe-je-het', '_edities');
const SLEUTEL = process.env.KIT_API_KEY;
const DROOG = process.argv.includes('--droog');

if (!SLEUTEL) { console.error('KIT_API_KEY ontbreekt'); process.exit(1); }

async function kit(pad) {
  const r = await fetch(`https://api.kit.com/v4${pad}`, { headers: { 'X-Kit-Api-Key': SLEUTEL, Accept: 'application/json' } });
  if (!r.ok) throw new Error(`Kit ${pad}: ${r.status} ${await r.text()}`);
  return r.json();
}

async function alleBroadcasts() {
  const uit = [];
  let na = '';
  for (let i = 0; i < 20; i++) {
    const d = await kit(`/broadcasts?per_page=100${na ? `&after=${encodeURIComponent(na)}` : ''}`);
    uit.push(...d.broadcasts);
    if (!d.pagination?.has_next_page) break;
    na = d.pagination.end_cursor;
  }
  return uit;
}

const slugVan = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);

// Van Kit-HTML naar de eenvoudige markdown die bouw-archief.mjs leest.
export function htmlNaarMarkdown(html) {
  let h = html;
  // alleen-mail weg (div, p, section, table ...), ook genest.
  for (let i = 0; i < 10; i++) {
    const voor = h;
    h = h.replace(/<(\w+)[^>]*class="[^"]*\balleen-mail\b[^"]*"[^>]*>[\s\S]*?<\/\1>/gi, '');
    if (h === voor) break;
  }
  h = h.replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<hr[^>]*>[\s\S]*$/i, '') // alles onder de lijn is afsluiting en voet
    .replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '') // de titel toont de pagina zelf
    .replace(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi, (_, t) => `\n\n## ${t}\n\n`)
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, t) => `\n- ${t}`)
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, u, t) => `[${t}](${u.replace(/[?&]utm_[^&#]*/g, '').replace(/\?$/, '')})`)
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|blockquote|ul|ol|table|tr)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return h.split('\n').map((r) => r.trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function main() {
  const bestaand = readdirSync(BRON).filter((f) => f.endsWith('.md')).map((f) => readFileSync(join(BRON, f), 'utf8'));
  const bekendeNummers = new Set(bestaand.map((t) => Number((t.match(/^nummer:\s*(\d+)/m) || [])[1])));
  const bekendeIds = new Set(bestaand.map((t) => (t.match(/^kit:\s*(\d+)/m) || [])[1]).filter(Boolean));

  const lijst = (await alleBroadcasts()).filter((b) => (b.description || '').startsWith('Waarvoor doe je het?') && b.published_at);
  let nieuw = 0;
  for (const kort of lijst) {
    const nummer = Number(((kort.description || '').match(/editie\s+(\d+)/i) || [])[1]);
    if (!nummer) { console.warn(`Broadcast ${kort.id}: geen editienummer in Description, overgeslagen`); continue; }
    if (bekendeNummers.has(nummer) || bekendeIds.has(String(kort.id))) continue;

    const { broadcast: b } = await kit(`/broadcasts/${kort.id}`);
    const titel = (b.subject || '').trim();
    const datum = (b.published_at || b.send_at).slice(0, 10);
    const tekst = htmlNaarMarkdown(b.content || '');
    if (!tekst) { console.warn(`Broadcast ${b.id}: lege tekst, overgeslagen`); continue; }
    const bestand = `${String(nummer).padStart(2, '0')}-${slugVan(titel)}.md`;
    const md = `---\nnummer: ${nummer}\ntitel: ${titel}\n${b.preview_text ? `ondertitel: ${b.preview_text.trim()}\n` : ''}datum: ${datum}\nbeschrijving: ${(b.preview_text || '').trim()}\nlinkedin:\nkit: ${b.id}\n---\n${tekst}\n`;
    if (DROOG) { console.log(`--- ${bestand}\n${md}`); } else { writeFileSync(join(BRON, bestand), md); }
    console.log(`Nieuw: #${nummer} ${titel}`);
    nieuw++;
  }
  console.log(`${nieuw} nieuwe editie(s).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
