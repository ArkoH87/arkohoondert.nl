# arkohoondert.nl

De website van Arko Hoondert, financieel planner in Zeeland. Eén statische pagina, gehost op GitHub Pages.

## Bestanden

| Bestand | Wat |
| --- | --- |
| `index.html` | De hele site: tekst, opmaak en een klein script voor de cijferschaal |
| `fonts/` | Instrument Sans en Newsreader, zelf gehost (geen Google Fonts) |
| `*.jpg` | Hoofdfoto (polder) en tweede foto (keukentafel) |
| `*.pdf` | Algemene voorwaarden en privacyverklaring |
| `llms.txt` | Feitelijke samenvatting voor AI-zoekdiensten en taalmodellen |
| `robots.txt`, `sitemap.xml` | Voor zoekmachines |
| `CNAME` | Koppelt GitHub Pages aan arkohoondert.nl |
| `404.html` | Pagina voor onbekende adressen |

## Specificaties

### Techniek
- Statische HTML, geen bouwstap, geen afhankelijkheden van derden bij het laden.
- Geen cookies, geen meting, geen externe lettertypen of scripts. De enige externe links gaan pas open als een bezoeker klikt (LinkedIn, Google Drive voor het werkblad).
- Werkt op telefoon en laptop; toegankelijk met het toetsenbord; een link "Naar de inhoud" bovenaan.
- HTTPS via GitHub Pages, met HTTPS afgedwongen.

### Vindbaarheid in zoekmachines (SEO)
- Titel: "Arko Hoondert · Financieel planner in Zeeland". Beschrijving onder 160 tekens met vak, regio en de drie kernvragen.
- De h1 bevat naam, vak en regio, plus de vraag "Waar leef je eigenlijk voor?".
- Eén canonieke URL: https://arkohoondert.nl/ (zonder www).
- Gestructureerde gegevens (schema.org, JSON-LD): WebSite, ProfessionalService en FinancialService (adres, telefoon, werkgebied Zeeland en Nederland, diensten, KvK, btw), Person (Arko, met LinkedIn) en FAQPage. De FAQPage wordt automatisch gevuld met de zichtbare vragen, zodat tekst en gegevens altijd gelijk zijn.
- Open Graph voor een nette voorvertoning op LinkedIn en in berichten.
- Foto's met beschrijvende alt-tekst, vaste afmetingen en de hoofdfoto met voorrang geladen.
- robots.txt en sitemap.xml.

### Vindbaarheid in AI-zoekdiensten (LLM-search)
- Crawlers van AI-zoekdiensten zijn in robots.txt expliciet welkom (OpenAI, Anthropic, Perplexity, Google, Apple).
- `llms.txt` geeft feiten in gewone taal: wie, wat, voor wie, waar, werkwijze, wat Arko niet doet, contact.
- Veelgestelde vragen in de vorm waarin mensen het aan een AI vragen, met antwoorden die op zichzelf staan.
- Consistente feiten op site, gestructureerde gegevens, llms.txt en LinkedIn: dezelfde naam, hetzelfde vak, dezelfde regio.

### Nog te doen na livegang
- Google Search Console: domein verifiëren (TXT-record) en de sitemap indienen.
- Google Bedrijfsprofiel aanmaken met hetzelfde adres, telefoonnummer en dezelfde naam.
- LinkedIn-profiel: website arkohoondert.nl toevoegen.
- Samenwerkingsblok met Maurice van den Hemel terugzetten zodra hij akkoord geeft.

## Aanpassen

Tekst wijzigen kan rechtstreeks in `index.html` op GitHub. Na opslaan staat de wijziging binnen een paar minuten online.
