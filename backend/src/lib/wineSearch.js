const { prisma } = require('./prisma');

/**
 * Normalise pour la recherche cote JS (strip accents, lowercase)
 */
function normalize(s) {
  if (!s) return '';
  return s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Recherche vins par nom (fuzzy AND multi-mot) — PostgreSQL avec unaccent
 * Retourne liste de vins uniques groupes avec leurs millesimes
 */
async function searchWinesDb(query, limit = 20) {
  const keywords = query.trim().split(/\s+/).filter(Boolean);
  if (!keywords.length) return [];

  // Construire les conditions AND pour chaque keyword
  // Chaque keyword doit matcher dans producer.name OU vintage.wineName (insensible accents+casse)
  // On utilise Prisma findMany mais avec les keywords originaux (avec accents)
  // Pour supporter la recherche sans accents, on fait 2 passes si nécessaire
  let producers;
  try {
    // Passe 1 : recherche directe (supporte accents corrects)
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

    // Passe 2 : si pas de résultats, essayer via SQL raw avec unaccent
    if (producers.length === 0) {
      // Construire une requête SQL avec unaccent pour chaque keyword
      const conditions = keywords.map((_, i) =>
        `(unaccent(lower(p.name)) LIKE '%' || unaccent(lower($${i + 1})) || '%')`
      ).join(' AND ');

      const producerCodes = await prisma.$queryRawUnsafe(
        `SELECT DISTINCT p.code FROM producers p WHERE ${conditions} LIMIT 100`,
        ...keywords
      );

      if (producerCodes.length > 0) {
        producers = await prisma.producer.findMany({
          where: { code: { in: producerCodes.map(r => r.code) } },
          include: {
            vintages: { orderBy: [{ year: 'desc' }, { wineName: 'asc' }] }
          }
        });
      }
    }
  } catch (err) {
    console.error('[searchWinesDb]', err.message);
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
 * Recherche par producteur — filtrage PostgreSQL avec unaccent
 */
async function searchProducerDb(query, limit = 50) {
  const keywords = query.trim().split(/\s+/).filter(Boolean);
  if (!keywords.length) return { results: [], total: 0 };

  // Passe 1 : Prisma contains
  let producers = await prisma.producer.findMany({
    where: {
      AND: keywords.map(kw => ({ name: { contains: kw, mode: 'insensitive' } }))
    },
    include: { vintages: { orderBy: [{ year: 'desc' }] } },
    orderBy: { name: 'asc' },
    take: limit,
  });

  // Passe 2 : unaccent fallback
  if (producers.length === 0) {
    const conditions = keywords.map((_, i) =>
      `unaccent(lower(name)) LIKE '%' || unaccent(lower($${i + 1})) || '%'`
    ).join(' AND ');

    const codes = await prisma.$queryRawUnsafe(
      `SELECT code FROM producers WHERE ${conditions} ORDER BY name LIMIT ${limit}`,
      ...keywords
    );

    if (codes.length > 0) {
      producers = await prisma.producer.findMany({
        where: { code: { in: codes.map(r => r.code) } },
        include: { vintages: { orderBy: [{ year: 'desc' }] } },
        orderBy: { name: 'asc' },
      });
    }
  }

  const total = producers.length;
  const results = producers.map(p => ({
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

  return { results, total };
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
