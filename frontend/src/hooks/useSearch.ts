/**
 * useSearch — Encapsule tout l'état et la logique de recherche.
 * Extrait de App.tsx pour réduire la taille du composant racine.
 *
 * Reçoit `setPage` en paramètre pour déclencher la navigation
 * sans créer de couplage circulaire.
 */
import { useState, useRef, useCallback } from 'react';
import { searchWine, searchByRegionPage } from '../lib/wineSearch';
import type { WineResult } from '../lib/wineSearch';
import type { Page } from '../types';

export type FilterColor = 'Tous' | 'Rouge' | 'Rosé' | 'Blanc';
export type FilterStars = 0 | 1 | 2 | 3;

export interface SearchState {
  query: string;
  results: WineResult[];
  searching: boolean;
  searched: boolean;
  showVendange: boolean;
  realSearchDone: boolean;
  showResults: boolean;
  isRegionSearch: boolean;
  regionPage: number;
  regionTotal: number;
  regionPages: number;
  currentRegion: string;
  searchError: string | null;
  filterColor: FilterColor;
  filterStars: FilterStars;
  filterEffervescent: boolean;
  // Résultats filtrés calculés
  mainResults: WineResult[];
  similarResults: WineResult[];
  // Setters filtres (passés à SearchPage)
  setFilterColor: (c: FilterColor) => void;
  setFilterStars: (s: FilterStars) => void;
  setFilterEffervescent: (e: boolean) => void;
  // Setter query (pour la barre de recherche)
  setQuery: (q: string) => void;
  // Actions
  doSearch: (q: string, vintageFromOcr?: number, wineNameFromOcr?: string) => Promise<void>;
  doRegionSearch: (region: string, page?: number) => Promise<void>;
  doRegionPageChange: (page: number) => void;
  onVendangeComplete: () => void;
  resetSearch: () => void;
  // Restauration depuis sessionStorage (F5)
  restoreState: (opts: { query: string; results: WineResult[]; isRegionSearch: boolean }) => void;
  // OCR
  ocrVintage: number | undefined;
  ocrWineName: string | undefined;
}

export function useSearch(
  setPage: (p: Page) => void,
  setSidebarOpen: (open: boolean) => void,
  setShowAutocomplete: (show: boolean) => void,
): SearchState {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WineResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showVendange, setShowVendange] = useState(false);
  const [realSearchDone, setRealSearchDone] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isRegionSearch, setIsRegionSearch] = useState(false);
  const [regionPage, setRegionPage] = useState(1);
  const [regionTotal, setRegionTotal] = useState(0);
  const [regionPages, setRegionPages] = useState(0);
  const [currentRegion, setCurrentRegion] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [filterColor, setFilterColor] = useState<FilterColor>('Tous');
  const [filterStars, setFilterStars] = useState<FilterStars>(0);
  const [filterEffervescent, setFilterEffervescent] = useState(false);
  const [ocrVintage, setOcrVintage] = useState<number | undefined>(undefined);
  const [ocrWineName, setOcrWineName] = useState<string | undefined>(undefined);
  const pendingResults = useRef<WineResult[]>([]);

  const doSearch = useCallback(async (
    q: string,
    vintageFromOcr?: number,
    wineNameFromOcr?: string,
  ) => {
    if (!q.trim()) return;
    setQuery(q);
    setOcrVintage(vintageFromOcr);
    setOcrWineName(wineNameFromOcr);
    setPage('search');
    setSidebarOpen(false);
    setIsRegionSearch(false);
    setShowAutocomplete(false);
    setSearchError(null);

    const history: string[] = JSON.parse(localStorage.getItem('cepage_history') || '[]');
    const updated = [q, ...history.filter(h => h !== q)].slice(0, 15);
    localStorage.setItem('cepage_history', JSON.stringify(updated));

    setShowVendange(true);
    setShowResults(false);
    setSearching(true);
    setSearched(false);
    setRealSearchDone(false);
    setResults([]);
    pendingResults.current = [];

    try {
      const res = await searchWine(q);
      pendingResults.current = res;
      if (res.length === 0) {
        setSearchError("Aucun résultat trouvé. Vérifiez l'orthographe ou essayez un nom différent.");
      }
    } catch (err) {
      console.error('Search error:', err);
      pendingResults.current = [];
      setSearchError("Impossible de se connecter au serveur. Vérifiez votre connexion internet ou démarrez le backend local.");
    } finally {
      setRealSearchDone(true);
    }
  }, [setPage, setSidebarOpen, setShowAutocomplete]);

  const doRegionSearch = useCallback(async (region: string, page = 1) => {
    const label = `Région : ${region}`;
    setQuery(label);
    setPage('search');
    setSidebarOpen(false);
    setIsRegionSearch(true);
    setCurrentRegion(region);
    setRegionPage(page);

    setShowVendange(page === 1);
    setShowResults(false);
    setSearching(true);
    setSearched(false);
    setRealSearchDone(false);
    setResults([]);
    pendingResults.current = [];

    try {
      const data = await searchByRegionPage(region, page, 50, filterColor, filterStars, filterEffervescent);
      if (data) {
        pendingResults.current = data.results;
        setRegionTotal(data.total);
        setRegionPages(data.pages);
      } else {
        pendingResults.current = [];
        setRegionTotal(0);
        setRegionPages(0);
      }
    } catch (err) {
      console.error('Region search error:', err);
      pendingResults.current = [];
      setRegionTotal(0);
      setRegionPages(0);
    } finally {
      setRealSearchDone(true);
    }
  }, [setPage, setSidebarOpen, filterColor, filterStars, filterEffervescent]);

  const doRegionPageChange = useCallback((page: number) => {
    doRegionSearch(currentRegion, page);
  }, [currentRegion, doRegionSearch]);

  const onVendangeComplete = useCallback(() => {
    setShowVendange(false);
    setResults(pendingResults.current);
    setSearching(false);
    setSearched(true);
    setTimeout(() => setShowResults(true), 50);
  }, []);

  const resetSearch = useCallback(() => {
    setResults([]);
    setSearched(false);
    setQuery('');
    setShowVendange(false);
    setShowResults(false);
    setIsRegionSearch(false);
    setSearchError(null);
  }, []);

  const restoreState = useCallback((opts: { query: string; results: WineResult[]; isRegionSearch: boolean }) => {
    setQuery(opts.query);
    setResults(opts.results);
    setIsRegionSearch(opts.isRegionSearch);
    setSearched(true);
    setShowResults(true);
  }, []);

  // Résultats filtrés
  const mainResults = results.filter(r => {
    if (r.concordance < 75) return false;
    if (filterColor !== 'Tous' && !r.vintages?.some(v => v.color === filterColor)) return false;
    if (filterStars > 0 && !r.vintages?.some(v => (v.stars || 0) >= filterStars)) return false;
    if (filterEffervescent && !r.vintages?.some(v => v.isEffervescent)) return false;
    return true;
  });

  const similarResults = results.filter(r => {
    if (r.concordance < 20 || r.concordance >= 75) return false;
    if (filterColor !== 'Tous' && !r.vintages?.some(v => v.color === filterColor)) return false;
    if (filterStars > 0 && !r.vintages?.some(v => (v.stars || 0) >= filterStars)) return false;
    if (filterEffervescent && !r.vintages?.some(v => v.isEffervescent)) return false;
    return true;
  });

  return {
    query, results, searching, searched,
    showVendange, realSearchDone, showResults,
    isRegionSearch, regionPage, regionTotal, regionPages, currentRegion,
    searchError, filterColor, filterStars, filterEffervescent,
    mainResults, similarResults,
    setQuery, setFilterColor, setFilterStars, setFilterEffervescent,
    doSearch, doRegionSearch, doRegionPageChange, onVendangeComplete, resetSearch, restoreState,
    ocrVintage, ocrWineName,
  };
}
