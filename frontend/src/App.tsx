/**
 * App.tsx — Point d'entrée de l'application Cépage
 *
 * Responsabilités :
 * - État global : navigation (page), auth (authUser), visite (currentVisiteEventId)
 * - Initialisation depuis URL (tokens email, hash navigation)
 * - Gestion body overflow pour les modales
 * - Persistance de l'état de recherche (F5)
 *
 * Composants layout : AppSidebar, AppHeader
 * Composants UI : SearchBar, CompareBar, RegionPagination
 * Routing : PageRouter
 * Modales : EventDetailModal, CameraOverlay, CompareOverlay
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── Lib ────────────────────────────────────────────────────────
import { getStoredUser, storeAuth, clearAuth, syncFavoritesToServer } from './lib/auth';
import type { AuthUser } from './lib/auth';
import type { WineEvent } from './lib/events';

// ── Types & Constantes ─────────────────────────────────────────
import type { Page } from './types';
import { SITE_NAME, SITE_TAGLINE, HASH_PAGES, VISITE_EVENT_ID } from './constants';
import { getCategoryCount } from './hooks/useWineCategories';
import { useSearch } from './hooks/useSearch';
import { useCompare } from './hooks/useCompare';
import { useKeepAlive } from './hooks/useKeepAlive';

// ── Composants UI ──────────────────────────────────────────────
import ChampagneBubbles from './components/ui/ChampagneBubbles';
import VendangeBar from './components/ui/VendangeBar';
import CameraOverlay from './components/ui/CameraOverlay';
import CompareOverlay from './components/wine/CompareOverlay';

// ── Composants Layout ──────────────────────────────────────────
import AppSidebar from './components/layout/AppSidebar';
import AppHeader from './components/layout/AppHeader';

// ── Composants fonctionnels ────────────────────────────────────
import SearchBar from './components/ui/SearchBar';
import CompareBar from './components/wine/CompareBar';
import RegionPagination from './components/ui/RegionPagination';
import EventDetailModal from './components/events/EventDetailModal';
import PageRouter from './components/routing/PageRouter';

// ══════════════════════════════════════════════════════════════
// APP
// ══════════════════════════════════════════════════════════════
export default function App() {
  // ── Navigation ────────────────────────────────────────────────
  const [page, setPage] = useState<Page>('home');
  const [pageKey, setPageKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Autocomplétion ────────────────────────────────────────────
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteItems, setAutocompleteItems] = useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // ── OCR (CameraOverlay) ───────────────────────────────────────
  const [showCamera, setShowCamera] = useState(false);

  // ── Hooks extraits ────────────────────────────────────────────
  const search = useSearch(setPage, setSidebarOpen, setShowAutocomplete);
  const compare = useCompare();

  // ── Authentification ──────────────────────────────────────────
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => getStoredUser());
  const [accountExpanded, setAccountExpanded] = useState(false);
  const [accountPageKey, setAccountPageKey] = useState(0);
  const [accountTab, setAccountTab] = useState<'tasted' | 'liked' | 'favorite' | 'cellar' | 'settings' | 'visited'>('favorite');

  // ── Ref dropdown compte (click-outside) ───────────────────────
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  // ── Modal événement (depuis HomePage) ─────────────────────────
  const [homeEventModal, setHomeEventModal] = useState<WineEvent | null>(null);

  // ── Mode Visite — event courant ───────────────────────────────
  const [currentVisiteEventId, setCurrentVisiteEventId] = useState(VISITE_EVENT_ID);

  // ── Token email (verify-email, reset-password) ────────────────
  const [urlToken, setUrlToken] = useState('');

  // ── Compteurs sidebar ─────────────────────────────────────────
  const [categoryCounts, setCategoryCounts] = useState(() => ({
    tasted: getCategoryCount('tasted'),
    liked: getCategoryCount('liked'),
    favorite: getCategoryCount('favorite'),
    cellar: getCategoryCount('cellar'),
  }));

  const refreshCategoryCounts = useCallback(() => {
    setCategoryCounts({
      tasted: getCategoryCount('tasted'),
      liked: getCategoryCount('liked'),
      favorite: getCategoryCount('favorite'),
      cellar: getCategoryCount('cellar'),
    });
  }, []);

  // ── Initialisation depuis URL (tokens email + hash) ────────────
  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || '';
    if (token) {
      if (path.includes('verify-email')) {
        setUrlToken(token);
        setPage('verify-email');
      } else if (path.includes('reset-password')) {
        setUrlToken(token);
        setPage('reset-password');
      }
      window.history.replaceState({}, '', '/');
      return;
    }
    // Restaurer depuis le hash URL
    const rawHash = window.location.hash.replace('#', '');
    if (rawHash === 'visite' || rawHash.startsWith('visite-')) {
      const eventId = rawHash.startsWith('visite-') ? rawHash.replace('visite-', '') : VISITE_EVENT_ID;
      setCurrentVisiteEventId(eventId);
      setPage('visite');
      window.history.replaceState({}, '', `#visite-${eventId}`);
      return;
    }
    // Alias hash → page (ex: #compte → account)
    const hashAliases: Record<string, Page> = {
      compte: 'account',
      account: 'account',
      admin: 'admin',
      login: 'login',
      connexion: 'login',
      events: 'events',
      favorites: 'favorites',
      favoris: 'favorites',
    };
    const resolvedPage = hashAliases[rawHash] ?? (rawHash as Page);
    if (resolvedPage && HASH_PAGES.includes(resolvedPage)) {
      setPage(resolvedPage);
      return;
    }
    // Restaurer l'état de recherche (persistance F5)
    try {
      const saved = sessionStorage.getItem('cepage_search_state');
      if (saved) {
        const state = JSON.parse(saved);
        if (state.wasOnSearch) {
          setPage('search');
          if (state.query) {
            search.restoreState({
              query: state.query,
              results: state.results || [],
              isRegionSearch: state.isRegionSearch || false,
            });
          }
        }
      }
    } catch { /* ignore */ }
  }, []); // eslint-disable-line

  // ── Click-outside pour fermer le dropdown compte ──────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setAccountExpanded(false);
      }
    };
    if (accountExpanded) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [accountExpanded]);

  // ── Gestion body overflow pour les modales ────────────────────
  useEffect(() => {
    if (homeEventModal || compare.showCompare || showCamera) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [homeEventModal, compare.showCompare, showCamera]);

  // ── Persistance de l'état de recherche (F5) ───────────────────
  useEffect(() => {
    try {
      sessionStorage.setItem('cepage_search_state', JSON.stringify({
        wasOnSearch: page === 'search',
        query: page === 'search' ? search.query : undefined,
        results: page === 'search' ? search.results : undefined,
        isRegionSearch: page === 'search' ? search.isRegionSearch : undefined,
      }));
    } catch { /* sessionStorage plein */ }
  }, [page, search.query, search.results, search.isRegionSearch]);

  // ── Authentification ──────────────────────────────────────────
  const handleLogin = (token: string, user: AuthUser) => {
    storeAuth(token, user);
    setAuthUser(user);
    syncFavoritesToServer();
  };

  const handleLogout = () => {
    clearAuth();
    setAuthUser(null);
    setAccountExpanded(false);
    navigate('home');
  };

  // ── Navigation ────────────────────────────────────────────────
  const navigateToVisite = useCallback((visiteId?: string) => {
    const eid = visiteId || VISITE_EVENT_ID;
    setCurrentVisiteEventId(eid);
    setPageKey(k => k + 1);
    setPage('visite');
    setSidebarOpen(false);
    setShowAutocomplete(false);
    window.history.replaceState({}, '', `#visite-${eid}`);
  }, []);

  const navigate = useCallback((p: Page) => {
    setPageKey(k => k + 1);
    setPage(p);
    setSidebarOpen(false);
    setShowAutocomplete(false);
    if (p === 'visite') {
      window.history.replaceState({}, '', `#visite-${currentVisiteEventId}`);
    } else if (p === 'events') {
      window.history.replaceState({}, '', '#events');
    } else if (p === 'favorites') {
      window.history.replaceState({}, '', '#favorites');
    } else if (p === 'account') {
      window.history.replaceState({}, '', '#account');
    } else if (p === 'admin') {
      window.history.replaceState({}, '', '#admin');
    } else if (p === 'login') {
      window.history.replaceState({}, '', '#login');
    } else if (p === 'home' || p === 'search') {
      window.history.replaceState({}, '', '/');
    } else {
      window.history.replaceState({}, '', '/');
    }
    if (p === 'home') search.resetSearch();
  }, [currentVisiteEventId]); // eslint-disable-line

  // ── Autocomplétion ────────────────────────────────────────────
  const handleQueryChange = (val: string) => {
    search.setQuery(val);
    if (val.trim().length >= 2) {
      const history: string[] = JSON.parse(localStorage.getItem('cepage_history') || '[]');
      const matches = history.filter(h => h.toLowerCase().includes(val.toLowerCase())).slice(0, 6);
      setAutocompleteItems(matches);
      setShowAutocomplete(matches.length > 0);
    } else {
      setShowAutocomplete(false);
    }
  };

  // ── Handlers compte ───────────────────────────────────────────
  const handleAccountTabNavigate = (tab: typeof accountTab) => {
    setAccountTab(tab);
    if (page === 'account') setAccountPageKey(k => k + 1);
    else navigate('account');
  };

  const isAdmin = authUser?.role === 'admin';
  useKeepAlive(!!authUser);

  const showSearchBar = page === 'search' || page === 'events';
  const searchPlaceholder = page === 'events'
    ? 'Rechercher un vin (ex: Château Margaux)...'
    : 'Domaine, château, appellation...';

  // ── Rendu ──────────────────────────────────────────────────────
  return (
    <>
      <ChampagneBubbles disabled={isAdmin} />

      {/* Overlay fond sidebar */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <AppSidebar
        isOpen={sidebarOpen}
        page={page}
        authUser={authUser}
        isAdmin={isAdmin}
        accountExpanded={accountExpanded}
        categoryCounts={categoryCounts}
        onNavigate={navigate}
        onToggleAccount={() => setAccountExpanded(e => !e)}
        onAccountTab={handleAccountTabNavigate}
        onLogout={handleLogout}
      />

      <div id="app-container" role="main">
        {/* ── Header ──────────────────────────────────────────── */}
        <AppHeader
          authUser={authUser}
          isAdmin={isAdmin}
          sidebarOpen={sidebarOpen}
          accountExpanded={accountExpanded}
          accountDropdownRef={accountDropdownRef}
          categoryCounts={categoryCounts}
          onNavigate={navigate}
          onLogout={handleLogout}
          onHamburgerToggle={() => setSidebarOpen(!sidebarOpen)}
          onAccountExpand={setAccountExpanded}
          onAccountTabNavigate={handleAccountTabNavigate}
        />

        <div className="content-wrapper">
          {/* ── Barre de recherche ─────────────────────────────── */}
          {showSearchBar && (
            <SearchBar
              query={search.query}
              searching={search.searching}
              showAutocomplete={showAutocomplete}
              autocompleteItems={autocompleteItems}
              inputRef={inputRef}
              placeholder={searchPlaceholder}
              onQueryChange={handleQueryChange}
              onSubmit={e => { e.preventDefault(); if (search.query.trim()) search.doSearch(search.query); }}
              onAutocompleteSelect={item => { search.setQuery(item); setShowAutocomplete(false); search.doSearch(item); }}
              setShowAutocomplete={setShowAutocomplete}
              onCameraOpen={() => setShowCamera(true)}
            />
          )}

          {/* ── Barre comparaison flottante ───────────────────── */}
          <CompareBar
            compareList={compare.compareList}
            onOpenCompare={() => compare.setShowCompare(true)}
            onClear={compare.clearCompare}
          />

          {/* ── Animation vendange ───────────────────────────── */}
          {search.showVendange && (
            <VendangeBar realDone={search.realSearchDone} onComplete={search.onVendangeComplete} />
          )}

          {/* ── Pagination région (fixe bas-droite) ─────────── */}
          <RegionPagination
            page={page}
            isRegionSearch={search.isRegionSearch}
            searched={search.searched}
            searching={search.searching}
            regionPage={search.regionPage}
            regionPages={search.regionPages}
            onPageChange={search.doRegionPageChange}
          />

          {/* ── Routage des pages ───────────────────────────── */}
          <PageRouter
            page={page}
            pageKey={pageKey}
            authUser={authUser}
            isAdmin={isAdmin}
            accountTab={accountTab}
            accountPageKey={accountPageKey}
            currentVisiteEventId={currentVisiteEventId}
            search={search}
            compare={compare}
            urlToken={urlToken}
            onNavigate={navigate}
            onNavigateToVisite={navigateToVisite}
            onLogin={handleLogin}
            onLogout={handleLogout}
            setHomeEventModal={setHomeEventModal}
            onRefreshCategoryCounts={refreshCategoryCounts}
          />
        </div>

        <footer className="site-footer">
          <p>{SITE_NAME} © {new Date().getFullYear()} — {SITE_TAGLINE}</p>
        </footer>
      </div>

      {/* ── Modal événement (depuis HomePage) ───────────────── */}
      {homeEventModal && (
        <EventDetailModal
          event={homeEventModal}
          onClose={() => { document.body.style.overflow = ''; setHomeEventModal(null); }}
        />
      )}

      {/* ── CameraOverlay ───────────────────────────────────── */}
      {showCamera && (
        <CameraOverlay
          onClose={() => setShowCamera(false)}
          onResult={(text, vintage) => { setShowCamera(false); search.doSearch(text, vintage, text); }}
        />
      )}

      {/* ── CompareOverlay ──────────────────────────────────── */}
      {compare.showCompare && compare.compareList.length > 0 && (
        <CompareOverlay
          wines={compare.compareList}
          onRemove={compare.removeFromCompare}
          onClose={() => compare.setShowCompare(false)}
        />
      )}
    </>
  );
}
