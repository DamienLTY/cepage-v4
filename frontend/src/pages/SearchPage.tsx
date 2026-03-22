/**
 * SearchPage — Résultats de recherche avec filtres et comparaison
 *
 * Affiche :
 * - Résultats principaux (concordance ≥ 75%)
 * - Résultats similaires (concordance 20-75%)
 * - Filtres couleur / étoiles / effervescent (pour les recherches par région)
 * - Message d'erreur si le backend est inaccessible
 * - Recherches populaires si pas encore de recherche lancée
 */

import type { WineResult } from '../lib/wineSearch';
import ResultCard from '../components/wine/ResultCard';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

interface Props {
  results: WineResult[];
  mainResults: WineResult[];
  similarResults: WineResult[];
  searched: boolean;
  searching: boolean;
  query: string;
  onSearch: (q: string) => void;
  isRegion?: boolean;
  searchError?: string | null;
  compareList?: WineResult[];
  onCompare?: (r: WineResult) => void;
  regionTotal?: number;
  regionPage?: number;
  regionPages?: number;
  ocrVintage?: number;
  ocrWineName?: string;
  filterColor: 'Tous' | 'Rouge' | 'Rosé' | 'Blanc';
  setFilterColor: (c: 'Tous' | 'Rouge' | 'Rosé' | 'Blanc') => void;
  filterStars: 0 | 1 | 2 | 3;
  setFilterStars: (s: 0 | 1 | 2 | 3) => void;
  filterEffervescent: boolean;
  setFilterEffervescent: (e: boolean) => void;
}

export default function SearchPage({
  results, mainResults, similarResults, searched, searching, query, onSearch,
  isRegion, searchError,
  regionTotal, regionPage, regionPages,
  ocrVintage, ocrWineName,
  filterColor, setFilterColor, filterStars, setFilterStars,
  filterEffervescent, setFilterEffervescent,
}: Props) {

  // Filtrage côté client sur les millésimes de chaque vin
  const filteredMainResults = mainResults.map(r => {
    if (filterColor === 'Tous' && filterStars === 0 && !filterEffervescent) return r;
    const filtered = r.vintages.filter(v => {
      const colorOk = filterColor === 'Tous' || v.color === filterColor;
      const starsOk = filterStars === 0 || (v.stars || 0) >= filterStars;
      const effOk = !filterEffervescent || v.isEffervescent;
      return colorOk && starsOk && effOk;
    });
    if (filtered.length === 0) return null;
    return { ...r, vintages: filtered };
  }).filter((r): r is WineResult => r !== null);

  const filteredSimilarResults = similarResults.map(r => {
    if (filterColor === 'Tous' && filterStars === 0 && !filterEffervescent) return r;
    const filtered = r.vintages.filter(v => {
      const colorOk = filterColor === 'Tous' || v.color === filterColor;
      const starsOk = filterStars === 0 || (v.stars || 0) >= filterStars;
      const effOk = !filterEffervescent || v.isEffervescent;
      return colorOk && starsOk && effOk;
    });
    if (filtered.length === 0) return null;
    return { ...r, vintages: filtered };
  }).filter((r): r is WineResult => r !== null);

  const {
    visibleItems: visibleMainResults,
    sentinelRef: mainSentinelRef,
    hasMore: mainHasMore,
  } = useInfiniteScroll(filteredMainResults, 20);

  const recentSearches = JSON.parse(localStorage.getItem('cepage_history') || '[]') as string[];
  const popularSearches = [
    'Château Margaux', 'Château Latour', 'Domaine Rosier', 'Pétrus', "Château d'Yquem",
    'Château Haut-Brion', 'Château Mouton Rothschild', 'Romanée-Conti',
  ];

  // État initial — pas encore de recherche
  if (!searched && !searching && results.length === 0) {
    return (
      <div className="page-enter">
        {recentSearches.length > 0 && (
          <div className="popular-section" style={{ marginTop: 20 }}>
            <h3 className="popular-title">Recherches récentes</h3>
            <div className="popular-grid">
              {recentSearches.slice(0, 10).map(s => (
                <button key={s} className="popular-chip" onClick={() => onSearch(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        <div className="popular-section">
          <h3 className="popular-title">Recherches populaires</h3>
          <div className="popular-grid">
            {popularSearches.map(s => (
              <button key={s} className="popular-chip" onClick={() => onSearch(s)}>{s}</button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      {/* Résumé région */}
      {isRegion && searched && (
        <div style={{ textAlign: 'center', marginBottom: 16, color: 'var(--text-2)', fontSize: '0.88rem' }}>
          <span>Résultats pour la région <strong style={{ color: 'var(--amber)' }}>{query.replace('Région : ', '')}</strong></span>
          <span> — {regionTotal ?? filteredMainResults.length} producteurs trouvés</span>
          {regionPages && regionPages > 1 && (
            <span style={{ marginLeft: 8, color: 'var(--text-3)' }}>
              (page {regionPage} sur {regionPages})
            </span>
          )}
        </div>
      )}

      {/* Filtres (mode région uniquement) */}
      {searched && filteredMainResults.length > 0 && isRegion && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
          <span style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginRight: 4 }}>Filtres :</span>
          {(['Tous', 'Rouge', 'Rosé', 'Blanc'] as const).map(c => (
            <button key={c} onClick={() => setFilterColor(c)} style={{
              padding: '8px 14px', minHeight: '44px', borderRadius: 20, fontSize: '0.8rem', cursor: 'pointer',
              border: `1px solid ${filterColor === c ? 'var(--amber)' : 'var(--border)'}`,
              background: filterColor === c ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
              color: filterColor === c ? 'var(--amber)' : 'var(--text-2)',
            }}>
              {c === 'Rouge' ? '🔴' : c === 'Rosé' ? '🌸' : c === 'Blanc' ? '🟡' : ''} {c}
            </button>
          ))}
          <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />
          <button onClick={() => setFilterEffervescent(!filterEffervescent)} style={{
            padding: '8px 14px', minHeight: '44px', borderRadius: 20, fontSize: '0.8rem', cursor: 'pointer',
            border: `1px solid ${filterEffervescent ? 'var(--amber)' : 'var(--border)'}`,
            background: filterEffervescent ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
            color: filterEffervescent ? 'var(--amber)' : 'var(--text-2)',
          }}>🫧 Effervescent</button>
          <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />
          {([0, 1, 2, 3] as const).map(s => (
            <button key={s} onClick={() => setFilterStars(s === filterStars ? 0 : s)} style={{
              padding: '8px 14px', minHeight: '44px', borderRadius: 20, fontSize: '0.8rem', cursor: 'pointer',
              border: `1px solid ${filterStars === s && s > 0 ? 'var(--amber)' : 'var(--border)'}`,
              background: filterStars === s && s > 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
              color: filterStars === s && s > 0 ? 'var(--amber)' : 'var(--text-2)',
            }}>{s === 0 ? 'Tous ★' : '★'.repeat(s)}</button>
          ))}
          {(filterColor !== 'Tous' || filterStars !== 0 || filterEffervescent) && (
            <button onClick={() => { setFilterColor('Tous'); setFilterStars(0); setFilterEffervescent(false); }} style={{
              padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', cursor: 'pointer',
              border: `1px solid rgba(255,255,255,0.08)`, background: 'rgba(145,3,31,0.1)',
              color: 'var(--wine-bright)',
            }}>✕ Réinitialiser</button>
          )}
        </div>
      )}

      {/* Erreur backend */}
      {searchError && (
        <div role="alert" style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.08)', border: `1px solid var(--wine-bright)`, borderRadius: 12, marginBottom: 16 }}>
          <p style={{ color: 'var(--wine-bright)', fontWeight: 600, marginBottom: 4, fontSize: '0.88rem' }}>Connexion impossible</p>
          <p style={{ color: 'var(--text-2)', fontSize: '0.82rem' }}>{searchError}</p>
        </div>
      )}

      {/* Aucun résultat */}
      {!searching && searched && results.length === 0 && (
        <div className="no-results">
          <div className="no-results-icon">🍷</div>
          <p className="no-results-text">Aucun résultat pour « {query} »</p>
          <p className="no-results-hint">Essayez avec un nom de château, domaine ou appellation différent.</p>
        </div>
      )}

      {/* Résultats principaux */}
      {!searching && visibleMainResults.map((r, i) => (
        <ResultCard
          key={i}
          result={r}
          onSimilarClick={onSearch}
          highlight={query}
          ocrVintage={ocrVintage}
          ocrWineName={ocrWineName}
        />
      ))}
      {!searching && mainHasMore && (
        <div ref={mainSentinelRef} style={{ height: '1px', marginBottom: '20px' }} />
      )}

      {/* Message "résultats approchants" */}
      {!searching && filteredMainResults.length === 0 && filteredSimilarResults.length > 0 && (
        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: 12 }}>
          Pas de correspondance exacte. Résultats approchants :
        </div>
      )}

      {/* Résultats similaires */}
      {!searching && similarResults.length > 0 && (
        <div className="results-frame results-enter" style={{ padding: '20px 24px' }}>
          <div className="similar-title">Recherches similaires</div>
          <div className="similar-list">
            {filteredSimilarResults.map((r, i) => (
              <button key={i} className="similar-chip" onClick={() => onSearch(r.foundName)}>
                {r.foundName}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
