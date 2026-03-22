const { prisma } = require('./prisma');

/**
 * Normalise pour la recherche cote JS (strip accents, lowercase)
 * Identique a l'ancienne normalize() de db.js
 */
function normalize(s) {
  if (!s) return '';
  return s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Recherche vins par nom (fuzzy AND multi-mot) — filtrage PostgreSQL côté serveur
 * Retourne liste de vins uniques groupes avec leurs millesimes
 */
async function searchWinesDb(query, limit = 20) {
  const keywords = normalize(query).split(' ').filter(Boolean);
  if (!keywords.length) return [];

  // Construire les conditions AND pour chaque mot-cle
  // Chaque keyword doit correspondre à un producteur (name) OU à un vintage (wineName)
  let producers;
  try {
    producers = await prisma.producer.findMany({
      where: {
        AND: keywords.map(kw => ({
          OR: [
            { name: { contains: kw, mode: 'insensitive' } },
            { vintages: { some: { wineName: { contains: kw, mode: 'insensitive' } } } }
          ]
        }))
      },
      include: {
        vintages: { orderBy: [{ year: 'desc' }, { wineName: 'asc' }] }
      }
    });
  } catch {
    return [];
  }

  // Grouper par (producerCode, wineName)
  const wineMap = new Map();
  for (const producer of producers) {
    for (const vintage of producer.vintages) {
      const key = `${producer.code}_${normalize(vintage.wineName)}`;
      if (!wineMap.has(key)) {
        wineMap.set(key, {
          producerCode: producer.code,
          foundName: vintage.wineName,
          producerName: producer.name,
          region: producer.region,
          color: vintage.color,
          wineType: vintage.wineType,
          vintages: [],
        });
      }
      wineMap.get(key).vintages.push({
        year: vintage.year,
        stars: vintage.stars,
        color: vintage.color,
        wineType: vintage.wineType,
        link: vintage.link,
      });
    }
  }

  return Array.from(wineMap.values()).slice(0, limit);
}

/**
 * Recherche par producteur
 */
async function searchProducerDb(query, limit = 50) {
  const keywords = normalize(query).split(' ').filter(Boolean);
  if (!keywords.length) return { results: [], total: 0 };

  const producers = await prisma.producer.findMany({
    include: { vintages: true },
    orderBy: { name: 'asc' },
  });

  const filtered = producers.filter(p =>
    keywords.every(kw => normalize(p.name).includes(kw))
  );

  const results = filtered.slice(0, limit).map(p => ({
    producerCode: p.code,
    producerName: p.name,
    region: p.region,
    wines: p.vintages.map(v => ({
      wineName: v.wineName,
      year: v.year,
      stars: v.stars,
      color: v.color,
      wineType: v.wineType,
      link: v.link,
    })),
  }));

  return { results, total: filtered.length };
}

/**
 * Recherche par region avec pagination native PostgreSQL
 */
async function searchRegionDb(region, page = 1, limit = 50) {
  const offset = (page - 1) * limit;
  const whereClause = { region: { contains: region, mode: 'insensitive' } };

  // Requêtes parallèles : count total + pagination
  const [producers, total] = await Promise.all([
    prisma.producer.findMany({
      where: whereClause,
      include: { vintages: { orderBy: [{ year: 'desc' }] } },
      skip: offset,
      take: limit,
      orderBy: { name: 'asc' }
    }),
    prisma.producer.count({ where: whereClause })
  ]);

  // Grouper par (producerCode, wineName)
  const wineMap = new Map();
  for (const p of producers) {
    for (const v of p.vintages) {
      const key = `${p.code}_${v.wineName}`;
      if (!wineMap.has(key)) {
        wineMap.set(key, {
          producerCode: p.code,
          foundName: v.wineName,
          producerName: p.name,
          region: p.region,
          color: v.color,
          wineType: v.wineType,
          cnt: 0,
          vintages: [],
        });
      }
      const entry = wineMap.get(key);
      entry.cnt++;
      entry.vintages.push({ year: v.year, stars: v.stars, color: v.color, wineType: v.wineType, link: v.link });
    }
  }

  const results = Array.from(wineMap.values()).sort((a, b) => b.cnt - a.cnt || a.foundName.localeCompare(b.foundName));

  return { results, total, page, pages: Math.ceil(total / limit) };
}

/**
 * Recupere tous les millesimes d'un producteur par son code
 */
async function getProducerVintages(producerCode) {
  const producer = await prisma.producer.findUnique({
    where: { code: producerCode },
    include: {
      vintages: { orderBy: [{ year: 'desc' }, { wineName: 'asc' }] },
    },
  });
  if (!producer) return null;
  return { producer, vintages: producer.vintages };
}

module.exports = { searchWinesDb, searchProducerDb, searchRegionDb, getProducerVintages, normalize };
