const axios = require('axios');
const cheerio = require('cheerio');
const { prisma } = require('./prisma');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
};

/**
 * Recupere et parse une page detail Hachette
 * Cache permanent via Prisma WineDetail
 */
async function getWineDetail(url) {
  // Verifier cache Prisma
  const cached = await prisma.wineDetail.findUnique({ where: { url } });
  if (cached) {
    return { ok: true, ...(typeof cached.data === 'string' ? JSON.parse(cached.data) : cached.data) };
  }

  // Fetch page
  let html;
  try {
    const resp = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    html = resp.data;
  } catch (err) {
    return { ok: false, error: `Impossible de charger la page: ${err.message}` };
  }

  const $ = cheerio.load(html);
  const titleSpans = $('div.detail-product .title h1 span');
  const wine_name = titleSpans.first().text().trim() || '';
  const subtitle = $('div.detail-product .title h1').text().trim();
  const yearMatch = subtitle.match(/\b(\d{4})\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : null;
  const locationLinks = $('div.detail-product .location a');
  const region = locationLinks.eq(0).text().trim() || '';
  const appellation = locationLinks.eq(1).text().trim() || '';
  const fullText = $('body').text();

  let stars = 0;
  const starsMatch = fullText.match(/obtenu la note de\s+(\w+)\s+étoile/i);
  if (starsMatch) {
    const word = starsMatch[1].toLowerCase();
    if (word === 'trois' || word === '3') stars = 3;
    else if (word === 'deux' || word === '2') stars = 2;
    else if (word === 'une' || word === '1') stars = 1;
  }

  const coup_de_coeur = /Coup de C.?ur/i.test(fullText);
  const wine_type_label = $('div.detail-product .buttons-func a.banc').text().trim() || '';
  const a_boire = $('div.detail-product .buttons-func a.boire').text().trim() || '';
  const image = $('div.detail-product img').first().attr('src') || '';

  let elevage = '';
  const elevageMatch = fullText.match(/est élevé (.+?)\./i);
  if (elevageMatch) elevage = elevageMatch[1].trim();

  let garde = '';
  const gardeMatch = fullText.match(/entre (\d{4})\s*[-–]\s*(\d{4})/);
  if (gardeMatch) garde = `${gardeMatch[1]}-${gardeMatch[2]}`;

  let temperature = '';
  const tempMatch = fullText.match(/(\d+)\s*(?:à|et)\s*(\d+)\s*°C/i);
  if (tempMatch) temperature = `${tempMatch[1]}-${tempMatch[2]}°C`;

  let producer_url = '';
  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('/producteurs/')) producer_url = href;
  });

  const wt = wine_type_label.toLowerCase();
  let color = '';
  if (wt.includes('rouge')) color = 'Rouge';
  else if (wt.includes('blanc')) color = 'Blanc';
  else if (wt.includes('ros')) color = 'Rosé';

  const data = { wine_name, subtitle, year, region, appellation, stars, coup_de_coeur, wine_type_label, a_boire, elevage, garde, temperature, image, producer_url, color };

  // Stocker cache Prisma
  await prisma.wineDetail.upsert({
    where: { url },
    create: { url, data, fetchedAt: new Date() },
    update: { data, fetchedAt: new Date() },
  });

  // Mettre a jour stars/color dans vintages si manquants
  if (stars > 0 || color) {
    try {
      await prisma.vintage.updateMany({
        where: { link: url, ...(stars > 0 ? { stars: 0 } : {}), ...(color ? { color: 'Autre' } : {}) },
        data: { ...(stars > 0 ? { stars } : {}), ...(color ? { color } : {}) },
      });
    } catch {}
  }

  return { ok: true, ...data };
}

module.exports = { getWineDetail };
