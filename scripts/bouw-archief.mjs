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
const KIT_FORM_URL = process.env.KIT_FORM_URL || 'https://app.kit.com/forms/10201840/subscriptions';
const KENNISMAKING_URL = 'https://calendar.app.google/uK1NGzYM1U4datPM6';
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

// Kop en voet komen uit _schil.html, zodat alle pagina's hetzelfde menu en dezelfde voet hebben.
function kopUitSchil(canoniek) {
  const pad = canoniek.replace(SITE, '');
  const actief = pad.startsWith(PAD) ? PAD : pad === '/hetgesprek/' ? '/werkwijze/' : pad;
  return schil().match(/<header class="balk">[\s\S]*?<\/header>/)[0]
    .replace(`<a class="lnk" href="${actief}">`, `<a class="lnk" href="${actief}" aria-current="page">`);
}
const voetUitSchil = () => schil().match(/<footer class="voet donker">[\s\S]*?<\/footer>/)[0];

function pagina({ titel, beschrijving, canoniek, ogType = 'website', jsonld, inhoud }) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titel)}</title>
<meta name="description" content="${esc(beschrijving)}">
<link rel="canonical" href="${canoniek}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon-96.png" type="image/png" sizes="96x96">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#183026">
<meta name="author" content="Arko Hoondert">
<meta property="og:type" content="${ogType}">
<meta property="og:locale" content="nl_NL">
<meta property="og:url" content="${canoniek}">
<meta property="og:title" content="${esc(titel)}">
<meta property="og:description" content="${esc(beschrijving)}">
<meta property="og:image" content="${SITE}/arko-hoondert-og.jpg">
<link rel="preload" href="/fonts/instrument-sans-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/literata-300.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/waarvoor-doe-je-het/stijl.css">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body>
<a class="sr" href="#inhoud">Naar de inhoud</a>
${kopUitSchil(canoniek)}
<main id="inhoud">
${inhoud}
</main>
${voetUitSchil()}
</body>
</html>
`;
}

function aanmelden() {
  return `<section class="klei aanmelden" id="aanmelden">
  <div class="wrap smal">
    <p class="kicker">Elke zondag</p>
    <h2>Waarvoor doe je het?</h2>
    <p class="rust">Eén vraag, één inzicht en één stap. Om in een paar minuten te lezen, met je koffie erbij.</p>
    ${aanmeldBlok('onder')}
  </div>
</section>`;
}

// Halverwege een lange editie een formulier, na een alinea en nooit vlak voor een tussenkop.
function halverwege(html) {
  const delen = html.split(/(?<=<\/p>)\n?/);
  if (delen.length < 8) return html;
  let i = Math.floor(delen.length / 2);
  while (i < delen.length - 2 && /^\s*<h[23]/.test(delen[i])) i++;
  const blok = `<aside class="halverwege" aria-label="Nieuwsbrief"><p class="halverwege-kop">Krijg de volgende editie in je mail.</p>${aanmeldBlok('half')}</aside>`;
  return [...delen.slice(0, i), blok, ...delen.slice(i)].join('\n');
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
${halverwege(markdownNaarHtml(e.body))}
    </div>
    <p class="naar-gesprek">Speelt deze vraag bij jou? In een <a href="/kennismaken/">kennismaking van twintig minuten</a> kijken we of een plan je verder helpt.</p>
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

function aanmeldRegel() {
  return aanmeldBlok('kop');
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

// ---------- Bouwstenen, gedeeld door de homepage en de pagina's ----------
// _schil.html is de bron voor kop, stijl, voet en scripts; _home.html en de _sectie.html-bestanden bevatten de inhoud.
// Plekhouders in die bestanden: <!--@aanmeld:id-->, <!--@verschil-->, <!--@voorbeelden-->, <!--@slot-->,
// <!--@bestgelezen-->, <!--@fragmenten--> en {{KENNISMAKING_URL}}.
const schil = () => readFileSync(join(ROOT, '_schil.html'), 'utf8');

// Lezers, uit _lezers.json: LinkedIn plus mail, afgerond naar beneden op honderdtallen ("700+").
function lezersGetal() {
  const pad = join(MAP, '_lezers.json');
  if (!existsSync(pad)) return '';
  const l = JSON.parse(readFileSync(pad, 'utf8'));
  const totaal = (Number(l.linkedin) || 0) + (Number(l.mail) || 0);
  if (totaal <= 0) return '';
  return totaal >= 100 ? `${(Math.floor(totaal / 100) * 100).toLocaleString('nl-NL')}+` : String(totaal);
}

// Het aanmeldformulier, overal gelijk (naar Justin Welsh): veld en knop onder elkaar over de volle breedte,
// het lezersaantal in de knop, één korte regel eronder. Het label blijft voor schermlezers.
function aanmeldBlok(id = 'a', { intro = false } = {}) {
  const getal = lezersGetal();
  return `<form class="aanmeld" action="${esc(KIT_FORM_URL)}" method="post">
          ${intro ? '<p class="intro">Elke zondag één vraag over je leven en je geld.</p>' : ''}
          <label class="sr" for="mail-${id}">Je e-mailadres</label>
          <input id="mail-${id}" name="email_address" type="email" autocomplete="email" placeholder="Je e-mailadres" required>
          <button class="knop vol" type="submit">${getal ? `Lees mee met ${getal} anderen` : 'Lees mee'}</button>
          <p class="hulp">Gratis. Afmelden kan altijd.</p>
        </form>`;
}

const VERSCHIL = `<div class="verschil" role="table" aria-label="Verschil tussen een gewoon financieel plan en een financieel levensplan">
        <div role="row" style="display:contents"><div role="columnheader"></div><div class="kopje" role="columnheader">Gewoon financieel plan</div><div class="kopje" role="columnheader" style="color:var(--polder)">Financieel levensplan</div></div>
        <div role="row" style="display:contents"><div class="kopje" role="rowheader">Begint bij</div><div role="cell">Je cijfers</div><div class="wij" role="cell">Je leven: waar je voor leeft</div></div>
        <div role="row" style="display:contents"><div class="kopje" role="rowheader">De vraag</div><div role="cell">Hoeveel heb je?</div><div class="wij" role="cell">Waarvoor wil je het, en is het genoeg?</div></div>
        <div role="row" style="display:contents"><div class="kopje" role="rowheader">Uitkomst</div><div role="cell">Een overzicht</div><div class="wij" role="cell">Keuzes die standhouden, ook als het leven anders loopt</div></div>
      </div>`;

// Drie voorbeeldpagina's uit de samengestelde casus van Ingrid en Paul.
const VOORBEELDEN = `<div class="voorbeelden">
      <div>
        <div class="vb" aria-label="Voorbeeld van een levenskaart">
          <span class="label">Voorbeeld</span>
          <p class="titel">Levenskaart</p><p class="sub">Ingrid en Paul · na Het gesprek</p>
          <div class="vier">
            <span style="border-top-color:var(--groen)"><b>Lang leven</b>Rond tot op hoge leeftijd</span>
            <span style="border-top-color:var(--vonk)"><b>Kort leven</b>Testament verouderd</span>
            <span style="border-top-color:var(--rood)"><b>Rot leven</b>Zeven maanden vangnet</span>
            <span style="border-top-color:var(--groen)"><b>Apart leven</b>Uitgesproken</span>
          </div>
          <p class="regel"><b>Drie volgende stappen</b></p>
          <ol><li>Vierde vrije dag van Paul inplannen</li><li>Testament laten nakijken</li><li>Vangnet van Ingrid bespreken met een adviseur</li></ol>
        </div>
        <p class="vb-onder">Waar je staat, op één vel</p>
        <p class="klein">Groen staat goed, oranje vraagt aandacht, rood is nog niet geregeld.</p>
      </div>
      <div>
        <div class="vb" aria-label="Voorbeeld van een plan op één A4">
          <span class="label">Voorbeeld</span>
          <p class="titel">Plan op één A4</p>
          <p class="doel">“We willen over vijf jaar minder werken en onze dochter helpen met een huis, zonder dat het onze rust kost.”</p>
          <p class="regel"><b>Wat genoeg is</b>Het huidige leven, met één vrije dag meer.</p>
          <p class="regel"><b>Onze keuzes</b>Paul vier dagen vanaf 62. Een bedrag voor het huis van onze dochter. Testament en vangnet vóór de zomer.</p>
          <p class="regel"><b>Elk jaar</b>In januari samen het plan doorlopen.</p>
        </div>
        <p class="vb-onder">Je doel in één zin, je keuzes eronder</p>
        <p class="klein">Zodat je in één oogopslag ziet waar je voor koos.</p>
      </div>
      <div>
        <div class="vb" aria-label="Voorbeeld van een pagina uit het naslagwerk">
          <span class="label">Voorbeeld</span>
          <p class="titel">Naslagwerk</p><p class="sub">Per keuze de regel en de reden</p>
          <p class="regel"><b>Testament</b>Van voor de geboorte van jullie dochter. Wat het nu regelt, en wat je de notaris vraagt.</p>
          <p class="regel"><b>Schenking aan jullie dochter</b>Wat de wet zegt, wat het kost en waarom dit bedrag past in het plan.</p>
          <p class="regel"><b>Vangnet</b>Welk soort vangnet past, en welke vragen je een adviseur stelt.</p>
        </div>
        <p class="vb-onder">Voor jou, je naasten en je notaris</p>
        <p class="klein">Zodat ook later iemand begrijpt waarom je koos wat je koos.</p>
      </div>
    </div>`;

const SLOT = `<section aria-labelledby="h-slot">
  <div class="wrap">
    <div class="slot">
      <div>
        <p class="kicker">Beginnen</p>
        <h2 id="h-slot" style="margin-top:12px">Begin met een gesprek van twintig <span class="lat">minuten</span>.</h2>
        <a class="knop vol" href="/kennismaken/">Plan een kennismaking (gratis) <span aria-hidden="true">→</span></a>
      </div>
      <div>
        <ul><li>Je vertelt wat er speelt. Ik stel vooral vragen.</li><li>Aan het eind zeg ik eerlijk of een plan je verder helpt, of dat de nieuwsbrief of Ooit voorlopig genoeg is.</li><li>Via video, kosteloos en zonder verplichting.</li></ul>
        <p class="klein">Liever zelf aan de slag, in je eigen tempo? Bij Ooit, mijn leerbedrijf, vind je online cursussen en e-books over onder meer je testament, samenwonen en je pensioen. <a href="https://nuofooit.nl/" target="_blank" rel="noopener">Naar nuofooit.nl <span aria-hidden="true">↗</span></a></p>
      </div>
    </div>
  </div>
</section>`;

const BEST_GELEZEN = ['de-drie-levens', 'de-acht-stenen', 'minder-ballen'];
function bestGelezen(edities) {
  const rij = (e) => `<li><a href="${PAD}${e.slug}/"><span class="t"><span class="titel">${esc(e.titel)}</span><time datetime="${e.datum}">${datumNL(e.datum)}</time></span>${e.kort ? `<span class="kort">${esc(e.kort)}</span>` : ''}</a></li>`;
  const lijst = BEST_GELEZEN.map((s) => edities.find((e) => e.slug === s)).filter(Boolean);
  return `<ul class="rijen">${(lijst.length ? lijst : edities.slice(0, 3)).map(rij).join('')}</ul>`;
}
function fragmenten(edities) {
  return edities.slice(0, 3).map((e) => `<p class="fragment">${esc(e.kort || e.ondertitel || e.titel)}<span><a href="${PAD}${e.slug}/">${esc(e.titel)}</a> · ${datumNL(e.datum)}</span></p>`).join('\n    ');
}
function vulIn(html, edities = []) {
  return html
    .replace(/<!--@aanmeld:([a-z0-9-]+)-->/g, (_, id) => aanmeldBlok(id, { intro: id === 'hero' }))
    .replace(/<!--@verschil-->/g, VERSCHIL)
    .replace(/<!--@voorbeelden-->/g, VOORBEELDEN)
    .replace(/<!--@slot-->/g, SLOT)
    .replace(/<!--@bestgelezen-->/g, bestGelezen(edities))
    .replace(/<!--@fragmenten-->/g, fragmenten(edities))
    .replace(/\{\{KENNISMAKING_URL\}\}/g, KENNISMAKING_URL);
}

// Pagina's in de schil van de homepage.
function vanHome({ map, titel, beschrijving, extra = '', kaal = false, jsonld = null, robots = null, edities = [] }) {
  const bron = join(ROOT, map, '_sectie.html');
  if (!existsSync(bron)) return null;
  const url = `${SITE}/${map}/`;
  let s = schil();
  s = s.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(titel)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(beschrijving)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(titel)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(beschrijving)}">`)
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${JSON.stringify(jsonld || { '@context': 'https://schema.org', '@type': 'WebPage', name: titel, url, inLanguage: 'nl', isPartOf: { '@type': 'WebSite', url: SITE } })}</script>`)
    .replace(/<link rel="preload" as="image"[^>]*>\n?/, '')
    .replace(/href="(favicon\.svg|fonts\/|arko-hoondert)/g, 'href="/$1')
    .replace(/src="(arko-hoondert|fonts\/)/g, 'src="/$1')
    .replace(/url\((['"]?)fonts\//g, 'url($1/fonts/')
    .replace(`<a class="lnk" href="/${map}/">`, `<a class="lnk" href="/${map}/" aria-current="page">`)
    .replace(`<a class="knop leeg" href="/${map}/">`, `<a class="knop leeg" href="/${map}/" aria-current="page">`);
  if (kaal) s = s.replace('<header class="balk">', '<header class="balk kaal">');
  if (robots) s = s.replace(/<meta name="robots" content="[^"]*">/, `<meta name="robots" content="${robots}">`);
  return s.replace('<!--@inhoud-->', vulIn(readFileSync(bron, 'utf8'), edities) + extra);
}
function bouwHome(edities) {
  const home = schil().replace('<!--@inhoud-->', vulIn(readFileSync(join(ROOT, '_home.html'), 'utf8'), edities));
  // Taalverwijzing naar de Engelse site (alleen op de homepage, die heeft een Engelse tegenhanger op /en/).
  const metTaal = home.replace('<link rel="canonical" href="https://arkohoondert.nl/">', '<link rel="canonical" href="https://arkohoondert.nl/">\n<link rel="alternate" hreflang="nl" href="https://arkohoondert.nl/">\n<link rel="alternate" hreflang="en" href="https://arkohoondert.nl/en/">');
  writeFileSync(join(ROOT, 'index.html'), metTaal);
}
// Veelgestelde vragen op een pagina als FAQPage, uit de details-blokken.
function faqJsonld(map, naam) {
  const html = readFileSync(join(ROOT, map, '_sectie.html'), 'utf8');
  const vragen = [...html.matchAll(/<details><summary>([\s\S]*?)<\/summary><div class="antwoord">([\s\S]*?)<\/div><\/details>/g)]
    .map(([, v, a]) => ({ '@type': 'Question', name: v.replace(/<[^>]+>/g, '').trim(), acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() } }));
  const url = `${SITE}/${map}/`;
  return { '@context': 'https://schema.org', '@graph': [{ '@type': 'WebPage', name: naam, url, inLanguage: 'nl', isPartOf: { '@type': 'WebSite', url: SITE } }, { '@type': 'FAQPage', url, mainEntity: vragen }] };
}

// ---------- Het gesprek (/hetgesprek/) uit hetgesprek/_tekst.md ----------
// Betaalde afsprakenpagina's in Google Agenda (aangemaakt 18 november 2026, betaling via Stripe).
const BOEK_ALLEEN_URL = 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ26gBiVdJDFRYG7vXqGGpwhdmHwSfb-5njB06bf7MlQMze9MYmZuUA_tUR_HfDnM62u9WUhBmNA';
const BOEK_SAMEN_URL = 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ1sH--h7cynaZ1LdYQ7NS4rTDNZCiq2hwpSC3W9ucFylcZ07MxuxLNMk8wucgCs0owXXHk4mgUc';
// Kosteloze kennismaking van 20 minuten (afsprakenpagina in Google Agenda).
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
  const boek = `<div class="boekknoppen">
        <a class="knop vol breed" href="${BOEK_ALLEEN_URL}" target="_blank" rel="noopener">Alleen · kies een moment <span aria-hidden="true">↗</span></a>
        <a class="knop vol breed" href="${BOEK_SAMEN_URL}" target="_blank" rel="noopener">Samen · kies een moment <span aria-hidden="true">↗</span></a>
      </div>`;
  const sectie = (kop) => `<h2>${esc(kop)}</h2>\n    <div class="tekst">${markdownNaarHtml(delen[kop])}</div>`;
  const inhoud = `<section class="gesprek">
  <div class="wrap smal">
    <div class="boekkaart" id="boeken">
      <p class="kicker">${esc(kicker)}</p>
      <h1>Het gesprek</h1>
      <p class="rust">${esc(titel)}. ${esc(intro)}</p>
      <dl class="prijs"><div><dt>Alleen</dt><dd>90 minuten · €450</dd></div><div><dt>Samen met je partner</dt><dd>120 minuten · €550</dd></div></dl>
      <p class="klein">Prijzen inclusief btw.</p>
      ${boek}
      <p class="klein">Start je binnen drie maanden een traject, dan trekken we het bedrag af van de vaste prijs.</p>
      <div class="eerst">
        <p><b>Eerst kijken of het klikt?</b> Plan een kennismaking van 20 minuten, kosteloos en via video.</p>
        <a class="knop leeg" href="/kennismaken/">Plan een kennismaking <span aria-hidden="true">→</span></a>
      </div>
    </div>
    ${sectie('Wat je kunt verwachten')}
    <div class="over-kort"><img class="avatar" src="/arko-hoondert-vierkant.webp" width="800" height="800" loading="lazy" decoding="async" alt="Arko Hoondert"><div>${sectie('Over mij')}</div></div>
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
    beschrijving: 'Een persoonlijk gesprek over je leven en je geld: alleen 90 minuten voor €450, samen met je partner 120 minuten voor €550, inclusief btw. Verrekend als je een traject start.',
    canoniek: `${SITE}/hetgesprek/`,
    jsonld: { '@context': 'https://schema.org', '@type': 'Service', name: 'Het gesprek', provider: { '@type': 'Person', name: 'Arko Hoondert' }, areaServed: 'NL', offers: [{ '@type': 'Offer', name: 'Alleen, 90 minuten', price: '450', priceCurrency: 'EUR' }, { '@type': 'Offer', name: 'Samen met je partner, 120 minuten', price: '550', priceCurrency: 'EUR' }], url: `${SITE}/hetgesprek/` },
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
    <p class="rust intro">Financieel levensplanner in Zeeland. Ik help mensen rond en na hun veertigste hun leven opnieuw inrichten, en reken uit of het klopt.</p>
    <figure class="foto"><img src="/arko-hoondert-over-mij.webp" alt="Arko Hoondert in een grijs overhemd" width="1400" height="1044" loading="eager"></figure>
    <h2>De versie van twintig seconden</h2>
    <ol class="tijdlijn">
        ${regels}
    </ol>
    <h2>De versie van twee minuten</h2>
    <div class="tekst">${markdownNaarHtml(verhaal.trim())}</div>
    <h2>De versie van twintig minuten</h2>
    <div class="tekst">
      <p>Die vertel ik je liever zelf, en dan wil ik vooral jouw verhaal horen. In een kennismaking van twintig minuten via video stel je je vraag en kijken we samen of het klikt. Het kost niets.</p>
      <p><a class="knop leeg" href="/kennismaken/">Plan een kennismaking</a></p>
    </div>
    <h2>Waar ik voor sta</h2>
    <ol class="credo">
      <li>Liever écht zijn dan lijken.</li>
      <li>Eerst je leven, dan je geld.</li>
      <li>Ik zeg wat ik zie. De keuze blijft van jou.</li>
      <li>Ik verkoop geen financiële producten. Daardoor kan ik ook zeggen dat je iets niet moet doen.</li>
      <li>Een plan moet vier levens overleven: lang, kort, rot en apart.</li>
      <li>Afspraken regel je als de zon schijnt.</li>
      <li>Je weet vooraf wat het kost.</li>
    </ol>
    <h2>Achtergrond</h2>
    <ul class="achtergrond">
      <li><b>MBA</b><span>Quantic School of Business and Technology</span></li>
      <li><b>Vijftien jaar fondsenwerving</b><span>Oprichter van PeerWorks, voormalig hoofd fondsenwerving en MT-lid bij KWF</span></li>
      <li><b>Grote giften en nalatenschappen</b><span>Adviseur bij Het Zeeuwse Landschap, naast mijn praktijk</span></li>
    </ul>
    <div class="over-aanmelden">
      <h2>Elke zondag één vraag</h2>
      <p class="rust">Eén vraag, één inzicht en één stap. Over geld, werk en de keuzes die je ooit nog wilt maken.</p>
      ${aanmeldBlok('over')}
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

// Gratis downloads op /gratis/<slug>/ (formulieren in Kit, aangemaakt 25 november 2026).
const GRATIS = [
  { slug: 'keuzes-die-standhouden', titel: 'Keuzes die standhouden: lees het voorproefje', beschrijving: 'Lees de introductie en het eerste hoofdstuk van Keuzes die standhouden, het boek van Arko Hoondert, en kom op de wachtlijst.' },
  { slug: 'lang-kort-rot-apart', titel: 'Werkblad: lang, kort, rot en apart op één A4', beschrijving: 'Gratis werkblad: leg één keuze langs het lange, korte, rotte en aparte leven en vind je eerste stap.' },
  { slug: 'waar-ligt-wat', titel: 'Checklist: waar ligt wat', beschrijving: 'Gratis checklist: wat je naasten moeten kunnen vinden als jij er niet bent of even niet kunt.' },
  { slug: 'geven-met-belastingvoordeel', titel: 'Gids: geven met belastingvoordeel', beschrijving: 'Gratis gids over giftenaftrek, de periodieke gift, geven vanuit je bv en nalaten aan een goed doel. Bedragen 2026.' },
];

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
  bouwHome(edities);
  const paginas = [
    { map: 'levensplan', titel: 'Wat is een levensplan? · Arko Hoondert', beschrijving: 'Een financieel levensplan begint bij hoe je wilt leven en rekent daarna uit wat dat betekent voor je geld. Met een voorbeeld van begin tot eind.', extra: SLOT },
    { map: 'werkwijze', titel: 'Werkwijze en prijzen · Arko Hoondert', beschrijving: 'Kies waar je begint: een levensplan, je testament, geven aan een goed doel of één grote keuze. Vaste prijzen inclusief btw, vooraf op papier. Plus jaarabonnementen.', extra: SLOT, jsonld: faqJsonld('werkwijze', 'Werkwijze en prijzen') },
    { map: 'kennismaken', titel: 'Kennismaken · Arko Hoondert', beschrijving: 'Plan een kosteloze kennismaking van 20 minuten via video. Daarna weet je of een plan je verder helpt.' },
    { map: 'nieuwsbrief', titel: 'Waarvoor doe je het? · De nieuwsbrief van Arko Hoondert', beschrijving: 'Elke zondag één vraag over je leven en je geld. Gratis, afmelden kan onder elke mail.', kaal: true },
    { map: 'zeeland', titel: 'Financiële planning in Zeeland · Arko Hoondert', beschrijving: 'Financiële levensplanning in Zeeland, bij je thuis, buiten of via video. Geen producten, geen provisie, vaste prijs vooraf.', extra: SLOT },
    { map: 'bedankt', titel: 'Bijna klaar · Arko Hoondert', beschrijving: 'Bevestig je inschrijving voor Waarvoor doe je het?.', robots: 'noindex, follow' },
    { map: 'bevestigd', titel: 'Gelukt · Arko Hoondert', beschrijving: 'Je inschrijving voor Waarvoor doe je het? is bevestigd.', robots: 'noindex, follow' },
    // Gratis downloads: landingspagina's (geïndexeerd), de gedeelde inboxpagina en de downloadpagina's (niet geïndexeerd).
    { map: '4r-scan', titel: 'De 4R-scan: houden jouw keuzes stand? · Arko Hoondert', beschrijving: 'In vijf minuten zie je welke van de vier poorten bij jou het eerst wiebelt: richting, rust, ritme of ruimte. Gratis, met de eerstvolgende stap. Je antwoorden blijven in je browser.' },
    ...GRATIS.map((g) => ({ map: `gratis/${g.slug}`, titel: `${g.titel} · Arko Hoondert`, beschrijving: g.beschrijving })),
    ...GRATIS.map((g) => ({ map: `gratis/${g.slug}/download`, titel: `Je download · Arko Hoondert`, beschrijving: g.beschrijving, robots: 'noindex, follow' })),
    { map: 'gratis/4r-werkblad/download', titel: 'Je 4R-werkblad · Arko Hoondert', beschrijving: 'Download het 4R-werkblad bij de 4R-scan.', robots: 'noindex, follow' },
    { map: 'gratis/check-je-inbox', titel: 'Kijk in je inbox · Arko Hoondert', beschrijving: 'Bevestig je e-mailadres, daarna opent je download meteen.', robots: 'noindex, follow' },
  ];
  for (const p of paginas) {
    const html = vanHome({ ...p, edities });
    if (html) writeFileSync(join(ROOT, p.map, 'index.html'), html);
  }
  const gesprek = gesprekPagina();
  if (gesprek) writeFileSync(join(ROOT, 'hetgesprek', 'index.html'), gesprek);

  const vandaag = new Date().toISOString().slice(0, 10);
  const urls = [
    `  <url><loc>${SITE}/</loc><lastmod>${vandaag}</lastmod></url>`,
    ...['levensplan', 'werkwijze', 'kennismaken', 'nieuwsbrief', 'zeeland', '4r-scan', ...GRATIS.map((g) => `gratis/${g.slug}`)].map((m) => `  <url><loc>${SITE}/${m}/</loc><lastmod>${vandaag}</lastmod></url>`),
    ...(existsSync(join(ROOT, 'hetgesprek', '_tekst.md')) ? [`  <url><loc>${SITE}/hetgesprek/</loc><lastmod>${vandaag}</lastmod></url>`] : []),
    ...(existsSync(join(ROOT, 'over', '_tekst.md')) ? [`  <url><loc>${SITE}/over/</loc><lastmod>${vandaag}</lastmod></url>`] : []),
    ...['en/', 'en/about/', 'en/staying-for-good/', 'en/introduction/', 'en/guide/'].map((m) => `  <url><loc>${SITE}/${m}</loc><lastmod>${vandaag}</lastmod></url>`),
    `  <url><loc>${SITE}${PAD}</loc><lastmod>${edities[0]?.datum || vandaag}</lastmod></url>`,
    ...edities.map((e) => `  <url><loc>${SITE}${PAD}${e.slug}/</loc><lastmod>${e.datum}</lastmod></url>`),
  ];
  writeFileSync(join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);

  console.log(`${edities.length} edities gebouwd; nieuwste: #${edities[0]?.nummer} ${edities[0]?.titel}`);
}

if (import.meta.url === `file://${process.argv[1]}`) bouw();
