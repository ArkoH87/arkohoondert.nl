// Bouwt het archief van Waarvoor doe je het? uit waarvoor-doe-je-het/_edities/*.md.
// Geen afhankelijkheden: node scripts/bouw-archief.mjs
//
// Maakt:
//   waarvoor-doe-je-het/index.html            overzicht, nieuwste eerst
//   waarvoor-doe-je-het/<slug>/index.html     één pagina per editie
//   waarvoor-doe-je-het/laatste/index.html    stuurt door naar de nieuwste editie
//   sitemap.xml                               homepage plus alle archiefpagina's

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAP = join(ROOT, 'waarvoor-doe-je-het');
const BRON = join(MAP, '_edities');
const SITE = 'https://arkohoondert.nl';
const PAD = '/waarvoor-doe-je-het/';

// Kit-formulier voor aanmelden per mail. Leeg = de aanmeldknop van LinkedIn.
const KIT_FORM_URL = process.env.KIT_FORM_URL || '';
const LINKEDIN_VOLGEN = 'https://www.linkedin.com/build-relation/newsletter-follow?entityUrn=7479311765558960129';

const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const datumNL = (iso) => { const [j, m, d] = iso.split('-').map(Number); return `${d} ${MAANDEN[m - 1]} ${j}`; };
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- inlezen ----------
export function leesEditie(bestand, tekst) {
  const m = tekst.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${bestand}: geen kopblok gevonden`);
  const kop = {};
  for (const regel of m[1].split('\n')) {
    const i = regel.indexOf(':');
    if (i > 0) kop[regel.slice(0, i).trim()] = regel.slice(i + 1).trim();
  }
  for (const veld of ['nummer', 'titel', 'datum']) if (!kop[veld]) throw new Error(`${bestand}: veld ${veld} ontbreekt`);
  const slug = bestand.replace(/\.md$/, '').replace(/^\d+-/, '');
  return { ...kop, nummer: Number(kop.nummer), slug, body: m[2].trim() };
}

// ---------- eenvoudige markdown ----------
function inline(s) {
  return esc(s)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, t, u) => {
      const extern = !u.startsWith(SITE);
      return `<a href="${u}"${extern ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
}
export function markdownNaarHtml(md) {
  const blokken = md.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const uit = [];
  for (const b of blokken) {
    if (b.startsWith('## ')) { uit.push(`<h2>${inline(b.slice(3))}</h2>`); continue; }
    if (/^\d+\.\s/.test(b)) {
      uit.push('<ol>' + b.split('\n').map((r) => `<li>${inline(r.replace(/^\d+\.\s+/, ''))}</li>`).join('') + '</ol>');
      continue;
    }
    if (/^[-*]\s/.test(b)) {
      uit.push('<ul>' + b.split('\n').map((r) => `<li>${inline(r.replace(/^[-*]\s+/, ''))}</li>`).join('') + '</ul>');
      continue;
    }
    if (b === 'Arko') { uit.push('<p class="naam">Arko</p>'); continue; }
    uit.push(`<p>${inline(b).replace(/\n/g, '<br>')}</p>`);
  }
  return uit.join('\n');
}

// ---------- sjabloon ----------
const LOCKUP = `<svg viewBox="-6 -6 140 112" aria-hidden="true"><g fill="none" stroke-width="6"><path stroke="#183026" d="M0 100L32 0L64 100M84 0V100M124 0V100"/><path stroke="#f2a93b" d="M12 62H124"/></g></svg>
      <span class="wm"><span class="naam">ARKO HOONDERT</span><span class="vak">FINANCIËLE LEVENSPLANNING</span></span>`;

function pagina({ titel, beschrijving, canoniek, ogType = 'website', jsonld, inhoud }) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titel)}</title>
<meta name="description" content="${esc(beschrijving)}">
<link rel="canonical" href="${canoniek}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#183026">
<meta name="author" content="Arko Hoondert">
<meta property="og:type" content="${ogType}">
<meta property="og:locale" content="nl_NL">
<meta property="og:url" content="${canoniek}">
<meta property="og:title" content="${esc(titel)}">
<meta property="og:description" content="${esc(beschrijving)}">
<meta property="og:image" content="${SITE}/arko-hoondert-polder-2026.jpg">
<link rel="preload" href="/fonts/instrument-sans-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/literata-300.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/waarvoor-doe-je-het/stijl.css">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body>
<a class="sr" href="#inhoud">Naar de inhoud</a>
<header class="balk">
  <div class="wrap">
    <a class="lockup" href="/" aria-label="Arko Hoondert, financiële levensplanning, naar de homepage">
      ${LOCKUP}
    </a>
    <nav class="nav" aria-label="Hoofdmenu">
      <a class="lnk" href="/waarvoor-doe-je-het/">Alle edities</a>
      <a class="lnk" href="/#werkwijze">Werkwijze</a>
      <a class="knop vol" href="/#contact">Kennismaken</a>
    </nav>
  </div>
</header>
<main id="inhoud">
${inhoud}
</main>
<footer class="voet">
  <div class="wrap voet-grid">
    <div>
      <a class="lockup" href="/" aria-label="Arko Hoondert, naar de homepage">
        ${LOCKUP}
      </a>
      <p class="klein" style="margin-top: 18px;">De Perponcherpolderweg 5, 4471 RX Wolphaartsdijk<br>KvK 85352012 · btw-id NL004086452B40<br><a href="mailto:arko@hoondert.me">arko@hoondert.me</a> · <a href="tel:+31651739714">06 51 73 97 14</a></p>
    </div>
    <div>
      <nav class="juridisch" aria-label="Juridisch">
        <a href="/algemene-voorwaarden-arko-hoondert.pdf" target="_blank" rel="noopener">Algemene voorwaarden</a>
        <a href="/privacyverklaring-arko-hoondert.pdf" target="_blank" rel="noopener">Privacyverklaring</a>
        <a href="/waarvoor-doe-je-het/">Nieuwsbrief</a>
        <a href="https://www.linkedin.com/in/arkohoondert/" target="_blank" rel="noopener">LinkedIn</a>
      </nav>
      <p class="klein" style="margin-top: 18px;">Alles op deze website is algemene informatie en geen persoonlijk advies. Persoonlijk werk begint pas met een opdrachtbevestiging. Ik heb geen vergunning op grond van de Wet op het financieel toezicht: ik adviseer niet over specifieke financiële producten en bemiddel er niet in.</p>
      <p class="klein">Deze website plaatst geen cookies en meet niets. © ${new Date().getFullYear()} Arko Hoondert.</p>
    </div>
  </div>
</footer>
</body>
</html>
`;
}

function aanmelden() {
  const actie = KIT_FORM_URL
    ? `<form class="aanmeld" action="${esc(KIT_FORM_URL)}" method="post">
        <label class="sr" for="email">E-mailadres</label>
        <input id="email" name="email_address" type="email" autocomplete="email" required placeholder="je@voorbeeld.nl">
        <button class="knop vol" type="submit">Aanmelden</button>
      </form>
      <p class="klein">Je krijgt eerst een mail om je aanmelding te bevestigen. Afmelden kan onder elke mail.</p>`
    : `<p><a class="knop vol" href="${LINKEDIN_VOLGEN}" target="_blank" rel="noopener">Abonneren op LinkedIn <span aria-hidden="true">↗</span></a></p>`;
  return `<section class="klei aanmelden" id="aanmelden">
  <div class="wrap smal">
    <p class="kicker">Elke zondag</p>
    <h2>Waarvoor doe je het?</h2>
    <p class="rust">Eén vraag, één inzicht en één stap. Om in een paar minuten te lezen, met je koffie erbij.</p>
    ${actie}
  </div>
</section>`;
}

function editiePagina(e, vorige, volgende) {
  const url = `${SITE}${PAD}${e.slug}/`;
  const nav = [
    vorige ? `<a href="${PAD}${vorige.slug}/"><span class="klein">Vorige editie</span>${esc(vorige.titel)}</a>` : '<span></span>',
    volgende ? `<a class="rechts" href="${PAD}${volgende.slug}/"><span class="klein">Volgende editie</span>${esc(volgende.titel)}</a>` : '<span></span>',
  ].join('');
  const inhoud = `<article class="editie">
  <div class="wrap smal">
    <p class="kicker"><a href="${PAD}">Waarvoor doe je het?</a> · Editie ${e.nummer}</p>
    <h1>${esc(e.titel)}</h1>
    ${e.ondertitel ? `<p class="rust onder">${esc(e.ondertitel)}</p>` : ''}
    <p class="klein meta"><time datetime="${e.datum}">${datumNL(e.datum)}</time> · Arko Hoondert${e.linkedin ? ` · <a href="${e.linkedin}" target="_blank" rel="noopener">Ook op LinkedIn</a>` : ''}</p>
    <div class="tekst-editie">
${markdownNaarHtml(e.body)}
    </div>
    <p class="klein peil">Geschreven op ${datumNL(e.datum)}. Algemene informatie, geen persoonlijk advies. Regels en bedragen kunnen sindsdien zijn veranderd.</p>
    <nav class="buren" aria-label="Andere edities">${nav}</nav>
  </div>
</article>
${aanmelden()}`;
  return pagina({
    titel: `${e.titel} · Waarvoor doe je het? · Arko Hoondert`,
    beschrijving: e.beschrijving || e.titel,
    canoniek: url,
    ogType: 'article',
    jsonld: {
      '@context': 'https://schema.org', '@type': 'Article', headline: e.titel, description: e.beschrijving || undefined,
      datePublished: e.datum, inLanguage: 'nl', url, mainEntityOfPage: url,
      isPartOf: { '@type': 'Periodical', name: 'Waarvoor doe je het?', url: `${SITE}${PAD}` },
      author: { '@type': 'Person', name: 'Arko Hoondert', url: `${SITE}/` },
    },
    inhoud,
  });
}

function overzicht(edities) {
  const lijst = edities.map((e) => `<li>
      <a href="${PAD}${e.slug}/">
        <span class="klein">Editie ${e.nummer} · <time datetime="${e.datum}">${datumNL(e.datum)}</time></span>
        <span class="titel">${esc(e.titel)}</span>
        ${e.beschrijving ? `<span class="besch">${esc(e.beschrijving)}</span>` : ''}
      </a>
    </li>`).join('\n    ');
  const inhoud = `<section class="archief-kop">
  <div class="wrap smal">
    <p class="kicker">Nieuwsbrief</p>
    <h1>Waarvoor doe je het?</h1>
    <p class="rust">Elke zondag één vraag, één inzicht en één stap. Over geld, werk en de keuzes die je ooit nog wilt maken.</p>
    <p><a class="knop vol" href="#aanmelden">Elke zondag ontvangen</a> <a class="knop leeg" href="${PAD}laatste/">Lees de nieuwste editie</a></p>
  </div>
</section>
<section class="archief">
  <div class="wrap smal">
    <h2 class="sr">Alle edities</h2>
    <ol class="edities" reversed>
    ${lijst}
    </ol>
  </div>
</section>
${aanmelden()}`;
  return pagina({
    titel: 'Waarvoor doe je het? · Alle edities · Arko Hoondert',
    beschrijving: 'Alle edities van Waarvoor doe je het?, de nieuwsbrief van Arko Hoondert. Elke zondag één vraag, één inzicht en één stap.',
    canoniek: `${SITE}${PAD}`,
    jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Waarvoor doe je het?', url: `${SITE}${PAD}`, inLanguage: 'nl', author: { '@type': 'Person', name: 'Arko Hoondert' } },
    inhoud,
  });
}

function laatste(e) {
  const doel = `${PAD}${e.slug}/`;
  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8">
<title>Nieuwste editie · Waarvoor doe je het?</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${SITE}${doel}">
<meta http-equiv="refresh" content="0; url=${doel}">
<script>location.replace(${JSON.stringify(doel)});</script>
</head><body><p>De nieuwste editie staat op <a href="${doel}">${esc(e.titel)}</a>.</p></body></html>
`;
}

// ---------- bouwen ----------
function bouw() {
  const edities = readdirSync(BRON).filter((f) => f.endsWith('.md'))
    .map((f) => leesEditie(f, readFileSync(join(BRON, f), 'utf8')))
    .sort((a, b) => b.datum.localeCompare(a.datum) || b.nummer - a.nummer);

  const slugs = new Set();
  for (const e of edities) {
    if (slugs.has(e.slug)) throw new Error(`Dubbele slug: ${e.slug}`);
    slugs.add(e.slug);
  }

  // Oude editiemappen opruimen die geen bron meer hebben.
  for (const naam of readdirSync(MAP, { withFileTypes: true })) {
    if (naam.isDirectory() && !naam.name.startsWith('_') && naam.name !== 'laatste' && !slugs.has(naam.name)) {
      rmSync(join(MAP, naam.name), { recursive: true });
    }
  }

  edities.forEach((e, i) => {
    const map = join(MAP, e.slug);
    if (!existsSync(map)) mkdirSync(map);
    writeFileSync(join(map, 'index.html'), editiePagina(e, edities[i + 1], edities[i - 1]));
  });
  writeFileSync(join(MAP, 'index.html'), overzicht(edities));
  mkdirSync(join(MAP, 'laatste'), { recursive: true });
  writeFileSync(join(MAP, 'laatste', 'index.html'), laatste(edities[0]));

  const vandaag = new Date().toISOString().slice(0, 10);
  const urls = [
    `  <url><loc>${SITE}/</loc><lastmod>2026-10-19</lastmod></url>`,
    `  <url><loc>${SITE}${PAD}</loc><lastmod>${edities[0]?.datum || vandaag}</lastmod></url>`,
    ...edities.map((e) => `  <url><loc>${SITE}${PAD}${e.slug}/</loc><lastmod>${e.datum}</lastmod></url>`),
  ];
  writeFileSync(join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);

  console.log(`${edities.length} edities gebouwd; nieuwste: #${edities[0]?.nummer} ${edities[0]?.titel}`);
}

if (import.meta.url === `file://${process.argv[1]}`) bouw();
