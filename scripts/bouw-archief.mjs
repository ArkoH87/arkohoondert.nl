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
<meta property="og:image" content="${SITE}/arko-hoondert-polder.jpg">
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
      <a class="lnk" href="/#werkwijze">Werkwijze</a>
      <a class="lnk" href="/hetgesprek/">Het gesprek</a>
      <a class="lnk" href="/waarvoor-doe-je-het/">Edities</a>
      <a class="lnk" href="/over/">Over mij</a>
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

const ONDERWERPEN = [
  ['Richting', 'waar leef je voor?'],
  ['Rust', 'wat als het tegenzit?'],
  ['Ritme', 'wat doe je elke maand?'],
  ['Ruimte', 'wat is genoeg?'],
];

// Lezers: LinkedIn-abonnees plus mailabonnees, uit _lezers.json.
function lezersTekst() {
  const pad = join(MAP, '_lezers.json');
  if (!existsSync(pad)) return '';
  const l = JSON.parse(readFileSync(pad, 'utf8'));
  const totaal = (Number(l.linkedin) || 0) + (Number(l.mail) || 0);
  return totaal > 0 ? `samen met ${totaal.toLocaleString('nl-NL')} anderen` : '';
}

function aanmeldRegel() {
  const samen = lezersTekst();
  const knop = samen ? `Schrijf je in, ${samen}` : 'Schrijf je in';
  if (KIT_FORM_URL) {
    return `<form class="aanmeld regel" action="${esc(KIT_FORM_URL)}" method="post">
      <label class="sr" for="email-kop">E-mailadres</label>
      <input id="email-kop" name="email_address" type="email" autocomplete="email" required placeholder="Je e-mailadres">
      <button class="knop vol" type="submit">${knop}</button>
    </form>
    <p class="klein">Elke zondag, gratis. Je bevestigt eerst per mail, afmelden kan onder elke mail.</p>`;
  }
  return `<p><a class="knop vol" href="${LINKEDIN_VOLGEN}" target="_blank" rel="noopener">${knop} <span aria-hidden="true">↗</span></a></p>
    <p class="klein">Elke zondag, gratis, via LinkedIn.</p>`;
}

function overzicht(edities) {
  const rijen = edities.map((e) => {
    const zoek = [e.titel, e.kort, e.beschrijving, e.onderwerp].filter(Boolean).join(' ').toLowerCase();
    return `<li data-onderwerp="${esc(e.onderwerp || '')}" data-zoek="${esc(zoek)}">
        <a href="${PAD}${e.slug}/">
          <span class="rij-kop"><span class="titel">${esc(e.titel)}</span><time datetime="${e.datum}">${datumNL(e.datum)}</time></span>
          ${e.kort || e.ondertitel ? `<span class="kort">${esc(e.kort || e.ondertitel)}</span>` : ''}
        </a>
      </li>`;
  }).join('\n      ');
  const opties = ONDERWERPEN.map(([r, v]) => `<option value="${r}">${r}: ${v}</option>`).join('');
  const inhoud = `<section class="essays">
  <div class="wrap smal">
    <h1>Edities</h1>
    <p class="rust">Elke zondag één vraag, één inzicht en één stap. Over geld, werk en de keuzes die je ooit nog wilt maken.</p>
    ${aanmeldRegel()}
    <div class="zoekbalk" role="search">
      <label class="sr" for="zoek">Zoek in de edities</label>
      <input id="zoek" type="search" placeholder="Zoek in de edities" autocomplete="off">
      <label class="sr" for="onderwerp">Filter op onderwerp</label>
      <select id="onderwerp"><option value="">Alle onderwerpen</option>${opties}</select>
    </div>
    <ul class="rijen" id="rijen">
      ${rijen}
    </ul>
    <p class="geen klein" id="geen" hidden>Geen editie gevonden. Probeer een ander woord.</p>
    <nav class="pager" id="pager" aria-label="Pagina's" hidden>
      <button class="lnk" type="button" id="nieuwer">← Nieuwere edities</button>
      <span class="klein" id="paginanr"></span>
      <button class="lnk" type="button" id="ouder">Oudere edities →</button>
    </nav>
  </div>
</section>
<script>
(() => {
  const PER = 10;
  const rijen = [...document.querySelectorAll('#rijen > li')];
  const zoek = document.getElementById('zoek'), ond = document.getElementById('onderwerp');
  const pager = document.getElementById('pager'), nr = document.getElementById('paginanr');
  const ouder = document.getElementById('ouder'), nieuwer = document.getElementById('nieuwer'), geen = document.getElementById('geen');
  let pagina = 1;
  function toon() {
    const q = zoek.value.trim().toLowerCase(), r = ond.value;
    const passend = rijen.filter((li) => (!r || li.dataset.onderwerp === r) && (!q || li.dataset.zoek.includes(q)));
    const totaal = Math.max(1, Math.ceil(passend.length / PER));
    pagina = Math.min(pagina, totaal);
    rijen.forEach((li) => { li.hidden = true; });
    passend.slice((pagina - 1) * PER, pagina * PER).forEach((li) => { li.hidden = false; });
    geen.hidden = passend.length > 0;
    pager.hidden = totaal < 2;
    nr.textContent = 'Pagina ' + pagina + ' van ' + totaal;
    nieuwer.disabled = pagina === 1; ouder.disabled = pagina === totaal;
  }
  zoek.addEventListener('input', () => { pagina = 1; toon(); });
  ond.addEventListener('change', () => { pagina = 1; toon(); });
  ouder.addEventListener('click', () => { pagina++; toon(); document.getElementById('rijen').scrollIntoView({ behavior: 'smooth' }); });
  nieuwer.addEventListener('click', () => { pagina--; toon(); document.getElementById('rijen').scrollIntoView({ behavior: 'smooth' }); });
  toon();
})();
</script>`;
  return pagina({
    titel: 'Edities · Waarvoor doe je het? · Arko Hoondert',
    beschrijving: 'Alle edities van Waarvoor doe je het?, de nieuwsbrief van Arko Hoondert. Elke zondag één vraag, één inzicht en één stap.',
    canoniek: `${SITE}${PAD}`,
    jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Waarvoor doe je het?', url: `${SITE}${PAD}`, inLanguage: 'nl', author: { '@type': 'Person', name: 'Arko Hoondert' } },
    inhoud,
  });
}

// ---------- Het gesprek (/hetgesprek/) uit hetgesprek/_tekst.md ----------
// Boekingslink van de betaalde afsprakenpagina in Google Agenda. Leeg = knop naar het contactblok.
const BOEK_GESPREK_URL = process.env.BOEK_GESPREK_URL || '';
// Kosteloze kennismaking van 20 minuten (afsprakenpagina in Google Agenda).
const KENNISMAKING_URL = 'https://calendar.app.google/uK1NGzYM1U4datPM6';
function gesprekPagina() {
  const pad = join(ROOT, 'hetgesprek', '_tekst.md');
  if (!existsSync(pad)) return null;
  const delen = {};
  for (const blok of readFileSync(pad, 'utf8').split(/^## /m).filter(Boolean)) {
    const i = blok.indexOf('\n');
    delen[blok.slice(0, i).trim()] = blok.slice(i + 1).trim();
  }
  const [kicker, titel, intro] = delen['Kop'].split('\n');
  const vragen = delen['Veelgestelde vragen'].split(/^### /m).filter(Boolean).map((v) => {
    const i = v.indexOf('\n');
    return `<details><summary>${esc(v.slice(0, i).trim())}</summary>${markdownNaarHtml(v.slice(i + 1).trim())}</details>`;
  }).join('\n      ');
  const boek = BOEK_GESPREK_URL
    ? `<a class="knop vol breed" href="${esc(BOEK_GESPREK_URL)}" target="_blank" rel="noopener">Kies een moment <span aria-hidden="true">→</span></a>`
    : `<a class="knop vol breed" href="/#contact">Kies een moment <span aria-hidden="true">→</span></a>`;
  const sectie = (kop) => `<h2>${esc(kop)}</h2>\n    <div class="tekst">${markdownNaarHtml(delen[kop])}</div>`;
  const inhoud = `<section class="gesprek">
  <div class="wrap smal">
    <div class="boekkaart" id="boeken">
      <p class="kicker">${esc(kicker)}</p>
      <h1>Het gesprek</h1>
      <p class="rust">${esc(titel)}. ${esc(intro)}</p>
      <dl class="prijs"><div><dt>Duur</dt><dd>120 minuten</dd></div><div><dt>Prijs</dt><dd>€495 inclusief btw</dd></div></dl>
      ${boek}
      <p class="klein">Start je binnen drie maanden een traject, dan trekken we de €495 af van de vaste prijs.</p>
      <div class="eerst">
        <p><b>Eerst kijken of het klikt?</b> Plan een kennismaking van 20 minuten, kosteloos en via video.</p>
        <a class="knop leeg" href="${KENNISMAKING_URL}" target="_blank" rel="noopener">Plan een kennismaking <span aria-hidden="true">↗</span></a>
      </div>
    </div>
    ${sectie('Wat je kunt verwachten')}
    ${sectie('Over mij')}
    <h2>Zo werkt het</h2>
    <div class="tekst stappen">${markdownNaarHtml(delen['Zo werkt het'])}</div>
    ${sectie('Wat het niet is')}
    <h2>Veelgestelde vragen</h2>
    <div class="vragen">
      ${vragen}
    </div>
    <p class="terug"><a href="#boeken">Terug naar boeken ↑</a></p>
  </div>
</section>`;
  return pagina({
    titel: 'Het gesprek · Arko Hoondert',
    beschrijving: 'Een persoonlijk gesprek van twee uur over je leven en je geld, alleen of samen met je partner. €495 inclusief btw, verrekend als je een traject start.',
    canoniek: `${SITE}/hetgesprek/`,
    jsonld: { '@context': 'https://schema.org', '@type': 'Service', name: 'Het gesprek', provider: { '@type': 'Person', name: 'Arko Hoondert' }, areaServed: 'NL', offers: { '@type': 'Offer', price: '495', priceCurrency: 'EUR' }, url: `${SITE}/hetgesprek/` },
    inhoud,
  });
}

// ---------- Over mij (/over/) uit over/_tekst.md ----------
function overPagina() {
  const pad = join(ROOT, 'over', '_tekst.md');
  if (!existsSync(pad)) return null;
  const t = readFileSync(pad, 'utf8');
  const tijdlijn = (t.match(/## Tijdlijn\n([\s\S]*?)\n## /) || [])[1] || '';
  const verhaal = (t.match(/## Verhaal\n([\s\S]*)$/) || [])[1] || '';
  const regels = tijdlijn.trim().split('\n').map((r) => r.split('|').map((x) => x.trim()))
    .map(([j, w]) => `<li><span class="jaar">${esc(j)}</span><span>${inline(w)}</span></li>`).join('\n        ');
  const inhoud = `<section class="over-mij">
  <div class="wrap smal">
    <h1>Hoi, ik ben Arko Hoondert.</h1>
    <figure class="foto"><img src="/arko-hoondert-polder.jpg" alt="Arko Hoondert in de polder bij Wolphaartsdijk" width="1800" height="1208" loading="eager"></figure>
    <h2>De versie van twintig seconden</h2>
    <ol class="tijdlijn">
        ${regels}
    </ol>
    <h2>De versie van twee minuten</h2>
    <div class="tekst">${markdownNaarHtml(verhaal.trim())}</div>
    <div class="over-aanmelden">
      <h2>Elke zondag één vraag</h2>
      <p class="rust">Eén vraag, één inzicht en één stap. Over geld, werk en de keuzes die je ooit nog wilt maken.</p>
      ${aanmeldRegel()}
    </div>
  </div>
</section>`;
  return pagina({
    titel: 'Over mij · Arko Hoondert',
    beschrijving: 'Rugbyinternational, tien jaar fondsenwerving, opgebrand, opnieuw begonnen. Nu financieel levensplanner in Zeeland. Het verhaal van Arko Hoondert.',
    canoniek: `${SITE}/over/`,
    ogType: 'profile',
    jsonld: { '@context': 'https://schema.org', '@type': 'ProfilePage', url: `${SITE}/over/`, inLanguage: 'nl', mainEntity: { '@type': 'Person', name: 'Arko Hoondert', jobTitle: 'Financieel levensplanner', url: SITE } },
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
  const over = overPagina();
  if (over) writeFileSync(join(ROOT, 'over', 'index.html'), over);
  const gesprek = gesprekPagina();
  if (gesprek) writeFileSync(join(ROOT, 'hetgesprek', 'index.html'), gesprek);

  const vandaag = new Date().toISOString().slice(0, 10);
  const urls = [
    `  <url><loc>${SITE}/</loc><lastmod>2026-10-19</lastmod></url>`,
    ...(existsSync(join(ROOT, 'hetgesprek', '_tekst.md')) ? [`  <url><loc>${SITE}/hetgesprek/</loc><lastmod>${vandaag}</lastmod></url>`] : []),
    ...(existsSync(join(ROOT, 'over', '_tekst.md')) ? [`  <url><loc>${SITE}/over/</loc><lastmod>${vandaag}</lastmod></url>`] : []),
    `  <url><loc>${SITE}${PAD}</loc><lastmod>${edities[0]?.datum || vandaag}</lastmod></url>`,
    ...edities.map((e) => `  <url><loc>${SITE}${PAD}${e.slug}/</loc><lastmod>${e.datum}</lastmod></url>`),
  ];
  writeFileSync(join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);

  console.log(`${edities.length} edities gebouwd; nieuwste: #${edities[0]?.nummer} ${edities[0]?.titel}`);
}

if (import.meta.url === `file://${process.argv[1]}`) bouw();
