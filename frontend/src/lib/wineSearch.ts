/**
 * ═══════════════════════════════════════════════════════════════
 * 🍷 CRU×SCAN — Moteur de recherche vin
 * Port fidèle de scraper_hachette_v4.py
 * ═══════════════════════════════════════════════════════════════
 *
 * Pipeline : Input → normalize → search → parse HTML → score → display
 * Utilise un proxy CORS (Cloudflare Worker ou allorigins) pour contourner CORS
 */

// ── CONFIGURATION ─────────────────────────────────────────────
const ANNEE_MIN = 1996;
const ANNEE_MAX_OFFSET = 2;
const SEUIL_FUZZY = 75;
const BASE_URL = 'https://www.hachette-vins.com';

// Backend Flask — URL configurable via variable d'environnement Vite
export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string) || 'http://localhost:5000';
let _backendAvailable: boolean | null = null; // null = non testé

/** Teste si le backend local est en ligne (cache 60s). */
export async function checkBackend(): Promise<boolean> {
  if (_backendAvailable !== null) return _backendAvailable;
  try {
    const r = await fetch(`${BACKEND_URL}/api/status`, { signal: AbortSignal.timeout(2000) });
    _backendAvailable = r.ok;
  } catch {
    _backendAvailable = false;
  }
  // Rétester après 60 secondes
  setTimeout(() => { _backendAvailable = null; }, 60000);
  return _backendAvailable;
}

/** Force le re-test du backend au prochain appel. */
export function resetBackendCache() { _backendAvailable = null; }

// Proxy CORS — nocache=true sur allorigins pour éviter les résultats mis en cache
const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}&nocache=true`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

// ── MAPPING RÉGIONS HACHETTE ───────────────────────────────────
export const REGION_MAP: Record<string, string> = {
  // Régions principales
  'Bordeaux':         'Bordelais',
  'Bourgogne':        'Bourgogne',
  'Champagne':        'Champagne',
  'Alsace':           'Alsace',
  'Rhône':            'Vallée du Rhône',
  'Loire':            'Vallée de la Loire et Centre',
  'Languedoc':        'Languedoc',
  'Provence':         'Provence',
  'Roussillon':       'Roussillon',
  'Sud-Ouest':        'Sud-Ouest',
  'Beaujolais':       'Beaujolais et Lyonnais',
  'Corse':            'Corse',
  'Jura':             'Jura',
  'Savoie':           'Savoie et Bugey',
  // Régions secondaires
  'Armagnac':         'Armagnac et Cognac',
  'Lorraine':         'Lorraine',
  'Poitou-Charentes': 'Poitou-Charentes',
  'Piémont Pyrénéen': 'Le piémont Pyrénéen',
  // Vins étrangers / autres
  'Vins Suisses':     'Vins Suisses',
  'Vins de Pays':     'Vins de Pays',
  'Luxembourg':       'Vins du Luxembourg',
};

const STOP_WORDS = new Set([
  'du', 'de', 'des', 'la', 'le', 'les', 'et', 'en', 'd', 'l',
  'château', 'chateau', 'domaine', 'domaines', 'vignobles', 'vignoble',
  'clos', 'ch', 'dom', 'vieux', 'aux', 'sur', 'sous', 'pres',
]);

const STOP_PREFIXES = [
  'Château du ', 'Château de la ', 'Château de ', 'Château des ',
  'Château la ', 'Château le ', 'Château les ',
  'Domaine du ', 'Domaine de la ', 'Domaine de ', 'Domaine des ',
  "Domaine d'", 'Domaine la ', 'Domaine le ', 'Domaine les ',
  'Château ', 'Chateaux ', 'Domaine ', 'Domaines ',
  'Vignobles ', 'Vignoble ', 'Clos ', 'Ch. ', 'Dom. ', 'La ', 'Le ', 'Les '
];

import { WineByProducerResponseSchema, safeParse } from './schemas';

// ── TYPES ─────────────────────────────────────────────────────
export interface WineVintage {
  year: number;
  stars: number;
  name: string;
  type: string;
  color: string;
  link: string;
  isEffervescent: boolean;
}

export interface WineResult {
  searchName: string;
  foundName: string;
  producerName?: string;
  producerUrl?: string;
  concordance: number;
  vintages: WineVintage[];
  detailUrl: string;
  passUsed: string;
  producerCode: string | null;
  subWines?: WineResult[]; // Autres vins du même producteur
  image?: string;           // Image de l'étiquette (optionnel, depuis API)
  region?: string;          // Région viticole du producteur (optionnel)
}

export interface SearchProgress {
  phase: string;
  detail: string;
  percent: number;
}

// ── NORMALISATION (port fidèle de normalize_name) ─────────────
export function normalizeName(name: string): string {
  if (!name) return '';
  let n = name.toLowerCase().trim();
  for (const [old, rep] of [['-', ' '], ["'", ' '], ['\u2019', ' '], ['.', ' '], [',', ' '], ['(', ' '], [')', ' ']]) {
    n = n.split(old).join(rep);
  }
  // Translitérer accents
  const accentMap: Record<string, string> = {
    'à':'a','â':'a','ä':'a','á':'a','ã':'a','å':'a','æ':'a',
    'é':'e','è':'e','ê':'e','ë':'e',
    'í':'i','î':'i','ï':'i',
    'ó':'o','ô':'o','ö':'o','õ':'o',
    'ú':'u','û':'u','ü':'u','ù':'u',
    'ç':'c','ñ':'n'
  };
  n = n.split('').map(c => accentMap[c] || c).join('');
  while (n.includes('  ')) n = n.replace(/  /g, ' ');
  return n.trim();
}

export function getSignificantWords(name: string): string[] {
  const normalized = normalizeName(name);
  return normalized.split(' ').filter(w => !STOP_WORDS.has(w) && w.length > 1);
}

export function extractMainName(chateauName: string): string {
  if (!chateauName) return chateauName;
  const sorted = [...STOP_PREFIXES].sort((a, b) => b.length - a.length);
  for (const prefix of sorted) {
    if (chateauName.startsWith(prefix)) {
      const result = chateauName.slice(prefix.length).trim();
      if (result) return result;
    }
  }
  return chateauName;
}

// ── SCORING (port fidèle de get_similarity_score) ─────────────
export function getSimilarityScore(searchName: string, resultName: string): number {
  const s = normalizeName(searchName);
  const r = normalizeName(resultName);
  if (s === r) return 100;

  const sw = new Set(s.split(' '));
  const rw = new Set(r.split(' '));
  const swSig = new Set([...sw].filter(w => !STOP_WORDS.has(w)));
  const rwSig = new Set([...rw].filter(w => !STOP_WORDS.has(w)));

  // Vérification par mots-clés significatifs EN PREMIER
  // (élimine les faux négatifs causés par les mots génériques : "Château", "Domaine"…)
  let wordScore = 0;
  if (swSig.size > 0 && rwSig.size > 0) {
    const allInResult = [...swSig].every(w => rwSig.has(w));
    if (allInResult) {
      const isMeaningful = swSig.size >= 2 || (swSig.size === 1 && [...swSig].every(w => w.length > 6));
      if (isMeaningful) {
        const extra = rwSig.size - swSig.size;
        let base = extra === 0 ? 85 : (extra === 1 ? 80 : 72);
        for (const w of swSig) {
          if (w.length > 8) base = Math.min(base + 5, 95);
        }
        wordScore = base;
      }
    }
    if (wordScore === 0) {
      const common = [...sw].filter(w => rw.has(w));
      if (common.length > 0) {
        const ratio = common.length / Math.max(sw.size, rw.size);
        let score = Math.floor(ratio * 60);
        for (const w of common) {
          if (w.length > 8) score += 15;
          else if (w.length > 6) score += 10;
          else if (w.length > 4) score += 5;
        }
        wordScore = Math.min(score, 90);
      }
    }
  }

  // Score par sous-chaîne
  let substringScore = 0;
  if (s && r && r.includes(s)) {
    const coverage = s.length / r.length;
    substringScore = coverage < 0.4 ? 35 : 50 + Math.floor(coverage * 40);
  } else if (s && r && s.includes(r)) {
    const coverage = r.length / s.length;
    substringScore = coverage < 0.4 ? 35 : 50 + Math.floor(coverage * 40);
  }

  // Retourner le meilleur des deux scores
  return Math.max(wordScore, substringScore);
}

// ── VARIANTES DE RECHERCHE (port de generate_search_variants) ──
export function generateSearchVariants(chateauName: string, passLevel: number = 1): string[] {
  if (!chateauName) return [];
  const variants: string[] = [];
  const base = chateauName.trim();
  const mainName = extractMainName(base);

  variants.push(base);
  if (mainName && mainName !== base) variants.push(mainName);

  if (passLevel >= 2) {
    const noDash = base.replace(/-/g, ' ');
    if (noDash !== base) variants.push(noDash);

    const cleaned = base.replace(/[-'\u2019.,()]/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned !== base) variants.push(cleaned);

    if (mainName) {
      const mainNoDash = mainName.replace(/-/g, ' ');
      if (mainNoDash !== mainName) variants.push(mainNoDash);
    }
  }

  if (passLevel >= 3 && mainName) {
    const words = mainName.split(' ');
    if (words.length === 2) {
      variants.push(`${words[1]} ${words[0]}`);
    }
  }

  if (passLevel >= 4) {
    const words = base.split(' ');
    const skip = new Set(['Château', 'Chateau', 'Domaine', 'Domaines', 'Vignobles', 'Vignoble', 'Clos',
      'du', 'de', 'des', 'la', 'le', 'les', 'et', 'en', 'd', 'l']);
    for (const word of words) {
      if (!skip.has(word) && word.length >= 5) {
        variants.push(word);
      }
    }
  }

  // Supprimer doublons
  return [...new Set(variants)];
}

// ── FETCH VIA PROXY CORS ──────────────────────────────────────
let currentProxyIndex = 0;

async function fetchViaProxy(url: string): Promise<string | null> {
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const proxyIdx = (currentProxyIndex + i) % CORS_PROXIES.length;
    const proxyUrl = CORS_PROXIES[proxyIdx](url);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'text/html,application/xhtml+xml,*/*' }
      });
      clearTimeout(timeout);
      if (response.ok) {
        const text = await response.text();
        if (text.length > 500) {
          currentProxyIndex = proxyIdx;
          return text;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ── PARSING HTML (port fidèle de parse_wine_items) ────────────
function parseWineItems(html: string): {
  items: WineVintage[],
  producerCode: string | null,
  producerCodesByName: Map<string, string>
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const items: WineVintage[] = [];
  let producerCode: string | null = null;
  const producerCodesByName = new Map<string, string>(); // normName → code

  const anneeMax = new Date().getFullYear() + ANNEE_MAX_OFFSET;

  // Extraire code producteur global (premier trouvé sur la page)
  const prodLinks = doc.querySelectorAll('a[href*="code_producteur"]');
  for (const link of prodLinks) {
    const href = link.getAttribute('href') || '';
    const m = href.match(/code_producteur[=](\d+)/);
    if (m) { producerCode = m[1]; break; }
  }

  // Parser chaque bloc vin
  const blocks = doc.querySelectorAll('.block.custom-block');
  for (const block of blocks) {
    const yearEl = block.querySelector('.sub-title');
    const nameEl = block.querySelector('span[itemprop="name"]');
    if (!yearEl || !nameEl) continue;

    const yearText = yearEl.textContent || '';
    const yearMatch = yearText.match(/\b((?:19|20)\d{2})\b/);
    if (!yearMatch) continue;
    const year = parseInt(yearMatch[1]);
    if (year < ANNEE_MIN || year > anneeMax) continue;

    const wineName = (nameEl.textContent || '').trim();

    // Extraire le code producteur spécifique à CE bloc
    const blockProdLinks = block.querySelectorAll('a[href*="code_producteur"]');
    for (const link of blockProdLinks) {
      const href = link.getAttribute('href') || '';
      const m = href.match(/code_producteur[=](\d+)/);
      if (m && wineName) {
        producerCodesByName.set(normalizeName(wineName), m[1]);
        break;
      }
    }

    // Étoiles
    const activeStars = block.querySelectorAll('.rating span.active');
    let stars = Math.min(activeStars.length, 3);
    if (stars === 0 && block.querySelector('.icon-lock-black')) {
      stars = 0;
    }

    // Lien
    const linkEl = block.querySelector('a[href]');
    let wineLink = '';
    if (linkEl) {
      const href = linkEl.getAttribute('href') || '';
      wineLink = href.startsWith('/') ? BASE_URL + href : href;
    }

    // Type de vin
    const blockText = block.textContent || '';
    let wineType = 'Non spécifié';
    let isEffervescent = false;
    const effMatch = blockText.match(/(Rouge|Blanc|Rosé)\s+effervescent/i);
    if (effMatch) {
      wineType = effMatch[1].charAt(0).toUpperCase() + effMatch[1].slice(1).toLowerCase() + ' effervescent';
      isEffervescent = true;
    } else {
      const typeMatch = blockText.match(/\b(Rouge|Blanc|Rosé)\b/i);
      if (typeMatch) {
        wineType = typeMatch[1].charAt(0).toUpperCase() + typeMatch[1].slice(1).toLowerCase();
      }
    }

    let color = 'Autre';
    const tl = wineType.toLowerCase();
    if (tl.includes('rouge')) color = 'Rouge';
    else if (tl.includes('blanc')) color = 'Blanc';
    else if (tl.includes('rosé') || tl.includes('rose')) color = 'Rosé';

    items.push({
      year,
      stars,
      name: wineName,
      type: wineType,
      color,
      link: wineLink,
      isEffervescent
    });
  }

  return { items, producerCode, producerCodesByName };
}

// ── PAGINATION HACHETTE — incrémente le numéro de page ─────────
// Format Hachette : /vins/page-N/list/?...
// On construit la page suivante en incrémentant N
function buildNextPageUrl(url: string, nextPage: number): string {
  // Si l'URL contient déjà /page-N/ → remplacer N par nextPage
  if (/\/page-\d+\//.test(url)) {
    return url.replace(/\/page-\d+\//, `/page-${nextPage}/`);
  }
  // Sinon ajouter /page-N/ avant /list/
  return url.replace('/list/', `/page-${nextPage}/list/`);
}

// ── RECHERCHE VIA BACKEND LOCAL ────────────────────────────────
async function searchViaBackend(query: string): Promise<WineResult[] | null> {
  try {
    const r = await fetch(
      `${BACKEND_URL}/api/search?q=${encodeURIComponent(query)}&limit=30`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!r.ok) return null;
    const data = await r.json();
    if (!data.ok || !data.results) return null;

    const rawResults = data.results as WineResult[];

    // Recalculer la vraie concordance (le backend met toujours 95)
    // On prend le MAX entre le score sur le nom du vin ET le score sur le nom du producteur
    // Ainsi "Pavillon Blanc" dont le producerName = "Château Margaux" aura concordance élevée
    for (const result of rawResults) {
      const wineScore = getSimilarityScore(query, result.foundName || '');
      const producerScore = getSimilarityScore(query, result.producerName || '');
      result.concordance = Math.max(wineScore, producerScore);
    }

    // Trier par concordance DESC
    rawResults.sort((a, b) => b.concordance - a.concordance);

    // Grouper les résultats du même producteur
    // Le résultat principal = concordance la plus haute pour ce producerCode
    // Les autres = subWines du résultat principal
    const grouped: WineResult[] = [];
    const producerSeen = new Map<string, WineResult>(); // producerCode → résultat principal

    for (const result of rawResults) {
      const pCode = result.producerCode;
      if (pCode && producerSeen.has(pCode)) {
        // Ce vin appartient à un producteur déjà vu → sous-vin
        const primary = producerSeen.get(pCode)!;
        if (!primary.subWines) primary.subWines = [];
        primary.subWines.push(result);
      } else {
        // Nouveau producteur ou pas de code
        grouped.push(result);
        if (pCode) producerSeen.set(pCode, result);
      }
    }

    return grouped;
  } catch {
    return null;
  }
}

async function searchRegionViaBackend(region: string): Promise<WineResult[] | null> {
  try {
    const r = await fetch(
      `${BACKEND_URL}/api/region?r=${encodeURIComponent(region)}&page=1&limit=50`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) return null;
    const data = await r.json();
    return data.ok && data.results.length > 0 ? (data.results as WineResult[]) : null;
  } catch {
    return null;
  }
}

/** Charge une page spécifique de résultats par région depuis le backend local. */
export async function searchByRegionPage(
  region: string,
  page: number = 1,
  limit: number = 50,
  colorFilter: string = '',
  minStars: number = 0,
  effervescent: boolean = false
): Promise<{ results: WineResult[]; total: number; pages: number; page: number } | null> {
  try {
    let url = `${BACKEND_URL}/api/region?r=${encodeURIComponent(region)}&page=${page}&limit=${limit}`;
    if (colorFilter && colorFilter !== 'Tous') url += `&color=${encodeURIComponent(colorFilter)}`;
    if (minStars > 0) url += `&stars=${minStars}`;
    if (effervescent) url += `&effervescent=true`;
    
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    const data = await r.json();
    if (!data.ok) return null;
    return { results: data.results, total: data.total, pages: data.pages, page: data.page };
  } catch {
    return null;
  }
}

// ── RECHERCHE PRINCIPALE ──────────────────────────────────────
export async function searchWine(
  query: string,
  onProgress?: (p: SearchProgress) => void
): Promise<WineResult[]> {
  if (!query.trim()) return [];

  // ── Essayer d'abord le backend local (base SQLite complète) ──
  const backendOk = await checkBackend();
  if (backendOk) {
    onProgress?.({ phase: 'Base locale', detail: 'Recherche dans la DB...', percent: 30 });
    const localResults = await searchViaBackend(query);
    if (localResults && localResults.length > 0) {
      onProgress?.({ phase: 'Terminé', detail: '', percent: 100 });
      return localResults;
    }
  }

  // ── Fallback : scraping live via CORS proxy ───────────────────
  const results: WineResult[] = [];
  const seenNames = new Set<string>();

  // Passes P1 → P4
  const passes: { level: number; label: string }[] = [
    { level: 1, label: 'P1' },
    { level: 2, label: 'P3' },
    { level: 4, label: 'P4' },
  ];

  for (const pass of passes) {
    const variants = generateSearchVariants(query, pass.level);

    for (const variant of variants) {
      onProgress?.({
        phase: `Recherche ${pass.label}`,
        detail: `"${variant}"`,
        percent: passes.indexOf(pass) / passes.length * 80
      });

      // Chercher sur plusieurs pages Hachette pour avoir plus de résultats
      const allSearchItems: WineVintage[] = [];
      let firstProducerCode: string | null = null;
      for (let searchPage = 1; searchPage <= 3; searchPage++) {
        const searchUrl = `${BASE_URL}/vins/page-${searchPage}/list/?search=${encodeURIComponent(variant)}&sort%5Bmillesime%5D=desc`;
        const html = await fetchViaProxy(searchUrl);
        if (!html) break;
        const { items: pageItems, producerCode: pageCode } = parseWineItems(html);
        if (pageItems.length === 0) break;
        allSearchItems.push(...pageItems);
        if (!firstProducerCode && pageCode) firstProducerCode = pageCode;
      }
      const items = allSearchItems;
      const producerCode = firstProducerCode;
      if (items.length === 0) continue;

      // Grouper par nom trouvé
      const byName = new Map<string, WineVintage[]>();
      for (const item of items) {
        const key = normalizeName(item.name);
        if (!byName.has(key)) byName.set(key, []);
        byName.get(key)!.push(item);
      }

      for (const [, vintages] of byName) {
        const foundName = vintages[0].name;
        const normalizedFound = normalizeName(foundName);
        if (seenNames.has(normalizedFound)) continue;

        const score = getSimilarityScore(query, foundName);
        if (score < 20) continue;

        seenNames.add(normalizedFound);

        const result: WineResult = {
          searchName: query,
          foundName,
          concordance: score,
          vintages: [...vintages],
          detailUrl: vintages[0].link,
          passUsed: pass.label,
          producerCode
        };

        // Si bon match et code producteur, chercher TOUTES les pages du producteur
        if (score >= SEUIL_FUZZY && producerCode) {
          onProgress?.({
            phase: 'Collecte complète',
            detail: `Producteur ${foundName}`,
            percent: 85
          });

          let allVintages: WineVintage[] = [];

          // 1️⃣ Priorité : backend local (API /api/wine/<code>)
          if (backendOk) {
            try {
              const resp = await fetch(`${BACKEND_URL}/api/wine/${producerCode}`);
              if (resp.ok) {
                const parsed = safeParse(WineByProducerResponseSchema, await resp.json());
                if (parsed?.ok && parsed.vintages.length > 0) {
                  allVintages = parsed.vintages.map(v => ({
                    year: v.year,
                    stars: v.stars,
                    name: v.wine_name,
                    color: v.color,
                    type: v.wine_type,
                    link: v.link,
                    isEffervescent: v.wine_type.toLowerCase().includes('effervescent'),
                  }));
                }
              }
            } catch (e) {
              console.warn('Backend producer fetch failed, fallback to proxy', e);
            }
          }

          // 2️⃣ Fallback : scraping direct via CORS proxy si backend indisponible ou vide
          if (allVintages.length === 0) {
            for (let page = 1; page <= 8; page++) {
              const prodUrl = buildNextPageUrl(
                `${BASE_URL}/vins/list/?filtre%5Bcode_producteur%5D=${producerCode}&sort%5Bmillesime%5D=desc`,
                page
              );

              const prodHtml = await fetchViaProxy(prodUrl);
              if (!prodHtml) break;

              const { items: prodItems } = parseWineItems(prodHtml);
              if (prodItems.length === 0) break; // Plus de résultats → fin de pagination

              allVintages.push(...prodItems);

              onProgress?.({
                phase: 'Collecte complète',
                detail: `Page ${page} — ${allVintages.length} millésimes`,
                percent: 85 + page
              });
            }
          }

          if (allVintages.length > 0) {
            // Dédupliquer par year+color+name
            const seen = new Set<string>();
            result.vintages = [];
            for (const v of allVintages) {
              const key = `${v.year}_${v.color}_${v.name}`;
              if (!seen.has(key)) {
                seen.add(key);
                result.vintages.push(v);
              }
            }
          }
        }

        results.push(result);
      }

      // Si on a un match principal ≥75%, pas besoin de passer aux passes suivantes
      if (results.some(r => r.concordance >= SEUIL_FUZZY)) {
        onProgress?.({ phase: 'Terminé', detail: '', percent: 100 });
        results.sort((a, b) => b.concordance - a.concordance);
        return results;
      }
    }
  }

  onProgress?.({ phase: 'Terminé', detail: '', percent: 100 });
  results.sort((a, b) => b.concordance - a.concordance);
  return results;
}

// ── RECHERCHE PAR RÉGION ───────────────────────────────────────
// Stratégie hybride :
// Phase 1 — scan des pages région : collect vins directs (1 vintage) + tous les codes producteurs de la page
// Phase 2 — pour chaque code trouvé, récupère TOUS ses millésimes
// Fallback — si aucun code trouvé, retourne les vins directs (au moins 1 vintage par vin)
export async function searchByRegion(
  regionDisplay: string,
  maxProducers: number = 20,
  onProgress?: (p: SearchProgress) => void
): Promise<WineResult[]> {
  // ── Essayer d'abord le backend local ─────────────────────────
  const backendOk = await checkBackend();
  if (backendOk) {
    onProgress?.({ phase: 'Base locale', detail: `Région ${regionDisplay}...`, percent: 30 });
    const localResults = await searchRegionViaBackend(regionDisplay);
    if (localResults && localResults.length > 0) {
      onProgress?.({ phase: 'Terminé', detail: '', percent: 100 });
      return localResults;
    }
  }

  // ── Fallback : scraping live Hachette ────────────────────────
  const regionParam = REGION_MAP[regionDisplay] || regionDisplay;

  // stocke résultats directs (1 vintage/vin) → fallback si pas de codes
  const directResultsMap = new Map<string, WineResult>(); // normName → result
  // codes producteurs découverts sur les pages région
  const seenCodes = new Set<string>();
  const REGION_SCAN_PAGES = 4;

  // ─── Phase 1 : scan des pages région ────────────────────────
  for (let page = 1; page <= REGION_SCAN_PAGES; page++) {
    const url = `${BASE_URL}/vins/page-${page}/list/?filtre%5Bregion%5D=${encodeURIComponent(regionParam)}&sort%5Bmillesime%5D=desc`;

    onProgress?.({
      phase: `Découverte ${regionDisplay}`,
      detail: `Page ${page}/${REGION_SCAN_PAGES}`,
      percent: Math.floor((page / REGION_SCAN_PAGES) * 25)
    });

    const html = await fetchViaProxy(url);
    if (!html) break;

    const { items, producerCode: pageCode, producerCodesByName } = parseWineItems(html);
    if (items.length === 0) break;

    // Collecter tous les codes producteurs visibles sur cette page
    // (1) codes par bloc (si disponibles)
    for (const [, code] of producerCodesByName) {
      if (code) seenCodes.add(code);
    }
    // (2) code global de la page (souvent présent sur les pages de résultats)
    if (pageCode) seenCodes.add(pageCode);

    // Construire résultats directs (fallback 1 vintage/vin)
    const byName = new Map<string, WineVintage[]>();
    for (const item of items) {
      const key = normalizeName(item.name);
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key)!.push(item);
    }

    for (const [normName, vintages] of byName) {
      if (directResultsMap.has(normName)) continue;
      const code = producerCodesByName.get(normName) || null;
      directResultsMap.set(normName, {
        searchName: regionDisplay,
        foundName: vintages[0].name,
        concordance: 90,
        vintages: [...vintages],
        detailUrl: vintages[0].link,
        passUsed: 'région',
        producerCode: code
      });
    }

    if (directResultsMap.size >= maxProducers) break;
  }

  // Si aucun résultat du tout → échec proxy
  if (directResultsMap.size === 0) {
    onProgress?.({ phase: 'Terminé', detail: '', percent: 100 });
    return [];
  }

  // Si aucun code producteur trouvé → retourner résultats directs
  if (seenCodes.size === 0) {
    onProgress?.({ phase: 'Terminé', detail: '', percent: 100 });
    const direct = [...directResultsMap.values()];
    direct.sort((a, b) => a.foundName.localeCompare(b.foundName, 'fr'));
    return direct;
  }

  // ─── Phase 2 : pour chaque code, récupérer TOUS les millésimes ──
  const results: WineResult[] = [];
  const codesWithoutResult = new Set(seenCodes);
  const codes = [...seenCodes].slice(0, maxProducers);

  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    // Trouver le nom associé à ce code (depuis résultats directs ou fallback)
    let producerName = code;
    for (const r of directResultsMap.values()) {
      if (r.producerCode === code) { producerName = r.foundName; break; }
    }

    onProgress?.({
      phase: 'Collecte millésimes',
      detail: `${producerName} (${i + 1}/${codes.length})`,
      percent: 25 + Math.floor((i / codes.length) * 70)
    });

    let allVintages: WineVintage[] = [];

    // Essayer backend d'abord
    if (backendOk) {
      try {
        const resp = await fetch(`${BACKEND_URL}/api/wine/${code}`);
        if (resp.ok) {
          const parsed = safeParse(WineByProducerResponseSchema, await resp.json());
          if (parsed?.ok && parsed.vintages.length > 0) {
            allVintages = parsed.vintages.map(v => ({
              year: v.year,
              stars: v.stars,
              name: v.wine_name,
              color: v.color,
              type: v.wine_type,
              link: v.link,
              isEffervescent: v.wine_type.toLowerCase().includes('effervescent'),
            }));
          }
        }
      } catch (e) {
        console.warn('Backend producer fetch failed', e);
      }
    }

    // Fallback scraping si backend vide
    if (allVintages.length === 0) {
      for (let page = 1; page <= 8; page++) {
        const prodUrl = buildNextPageUrl(
          `${BASE_URL}/vins/list/?filtre%5Bcode_producteur%5D=${code}&sort%5Bmillesime%5D=desc`,
          page
        );
        const prodHtml = await fetchViaProxy(prodUrl);
        if (!prodHtml) break;
        const { items: prodItems } = parseWineItems(prodHtml);
        if (prodItems.length === 0) break;
        allVintages.push(...prodItems);
      }
    }

    if (allVintages.length === 0) continue;
    codesWithoutResult.delete(code);

    // Dédupliquer
    const seen = new Set<string>();
    const uniqueVintages: WineVintage[] = [];
    for (const v of allVintages) {
      const key = `${v.year}_${v.color}_${normalizeName(v.name)}`;
      if (!seen.has(key)) { seen.add(key); uniqueVintages.push(v); }
    }

    // Grouper par nom de vin (un producteur peut avoir plusieurs vins)
    const byWineName = new Map<string, WineVintage[]>();
    for (const v of uniqueVintages) {
      const key = normalizeName(v.name);
      if (!byWineName.has(key)) byWineName.set(key, []);
      byWineName.get(key)!.push(v);
    }

    for (const [, vintages] of byWineName) {
      results.push({
        searchName: regionDisplay,
        foundName: vintages[0].name,
        concordance: 90,
        vintages: vintages.sort((a, b) => b.year - a.year),
        detailUrl: vintages[0].link,
        passUsed: 'région',
        producerCode: code
      });
    }
  }

  // Ajouter les résultats directs pour les vins sans code producteur
  for (const r of directResultsMap.values()) {
    if (!r.producerCode || codesWithoutResult.has(r.producerCode)) {
      if (!results.some(x => normalizeName(x.foundName) === normalizeName(r.foundName))) {
        results.push(r);
      }
    }
  }

  onProgress?.({ phase: 'Terminé', detail: '', percent: 100 });
  results.sort((a, b) => a.foundName.localeCompare(b.foundName, 'fr'));
  return results;
}
