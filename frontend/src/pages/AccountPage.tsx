/**
 * AccountPage — Espace personnel de l'utilisateur connecté
 *
 * Cinq onglets :
 * - Vins Goûtés  : historique des vins drag & drop dans "Gouté"
 * - Vins Appréciés : historique drag & drop dans "Apprécié"
 * - Favoris      : millésimes drag & drop + vins ♥ globaux avec popup détail
 * - En Cave      : historique drag & drop dans "En Cave"
 * - Paramètres   : changer mot de passe, email, historique, déconnexion
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BACKEND_URL } from '../lib/wineSearch';
import type { WineResult } from '../lib/wineSearch';
import type { AuthUser } from '../lib/auth';
import type { WineCategory, WineCardData } from '../types';
import { getCategoryWines, removeFromCategory } from '../hooks/useWineCategories';
import { getFavorites, toggleFavorite, isFavorite } from '../hooks/useFavorites';
import { FAV_KEY, CAT_KEYS, VISITE_EVENT_ID } from '../constants';
import WineDetailModalWithDrag from '../components/wine/WineDetailModalWithDrag';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

interface Props {
  user: AuthUser;
  initialTab: 'tasted' | 'liked' | 'favorite' | 'cellar' | 'settings' | 'visited';
  onLogout: () => void;
  onSearch: (q: string) => void;
  onRefreshFavCount: () => void;
  onRefreshCategoryCounts: () => void;
}

/** Un exposant visité stocké dans localStorage */
interface VisitedEntry {
  stand: string;
  name?: string;
  region?: string;
}

export default function AccountPage({
  user, initialTab, onLogout, onSearch: _onSearch,
  onRefreshFavCount: _onRefreshFavCount, onRefreshCategoryCounts
}: Props) {
  const [tab, setTab] = useState<'tasted' | 'liked' | 'favorite' | 'cellar' | 'settings' | 'visited'>(initialTab);

  // Vins par catégorie (bacs drag & drop)
  const [categoryWines, setCategoryWines] = useState<Record<WineCategory, WineCardData[]>>({
    tasted: getCategoryWines('tasted'),
    liked: getCategoryWines('liked'),
    favorite: getCategoryWines('favorite'),
    cellar: getCategoryWines('cellar'),
  });

  // Paramètres — changement de mot de passe
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  // Paramètres — changement d'email
  const [newEmail, setNewEmail] = useState('');
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // Modal détail vin (depuis les bacs drag & drop)
  const [categoryDetailUrl, setCategoryDetailUrl] = useState<string | null>(null);

  // Châteaux visités (Mode Visite — localStorage)
  const [visitedChateaux, setVisitedChateaux] = useState<VisitedEntry[]>(() => {
    // Chercher dans tous les salons connus
    const eventIds = [VISITE_EVENT_ID, 'vi-paris-champerret-2026', 'vi-baltard-2026', 'vi-mandelieu-2026', 'po-medoc-2026'];
    const all: VisitedEntry[] = [];
    for (const eid of eventIds) {
      try {
        const raw = localStorage.getItem(`visite-visited-${eid}`);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (typeof item === 'string') {
              all.push({ stand: item });
            } else if (item && typeof item === 'object' && item.stand) {
              all.push(item as VisitedEntry);
            }
          }
        }
      } catch { /* ignore */ }
    }
    return all;
  });

  // Favoris globaux (♥)
  const [globalFavorites, setGlobalFavorites] = useState<WineResult[]>(() => getFavorites());
  const [selectedGlobalFavorite, setSelectedGlobalFavorite] = useState<WineResult | null>(null);

  // Scroll infini pour chaque onglet
  const { visibleItems: visibleTasted, sentinelRef: tastedSentinelRef, hasMore: tastedHasMore } = useInfiniteScroll(categoryWines.tasted, 20);
  const { visibleItems: visibleLiked, sentinelRef: likedSentinelRef, hasMore: likedHasMore } = useInfiniteScroll(categoryWines.liked, 20);
  const { visibleItems: visibleFavorite, sentinelRef: favoriteSentinelRef, hasMore: favoriteHasMore } = useInfiniteScroll(categoryWines.favorite, 20);
  const { visibleItems: visibleCellar, sentinelRef: cellarSentinelRef, hasMore: cellarHasMore } = useInfiniteScroll(categoryWines.cellar, 20);
  const { visibleItems: visibleGlobalFavs, sentinelRef: globalFavsSentinelRef, hasMore: globalFavsHasMore } = useInfiniteScroll(globalFavorites, 20);
  const { visibleItems: visibleVisited, sentinelRef: visitedSentinelRef, hasMore: visitedHasMore } = useInfiniteScroll(visitedChateaux, 30);

  const refreshCategories = () => {
    setCategoryWines({
      tasted: getCategoryWines('tasted'),
      liked: getCategoryWines('liked'),
      favorite: getCategoryWines('favorite'),
      cellar: getCategoryWines('cellar'),
    });
    onRefreshCategoryCounts();
  };

  const handleRemoveFromCategory = (category: WineCategory, wineName: string, year: number) => {
    removeFromCategory(category, wineName, year);
    refreshCategories();
  };

  // Recharger au changement d'onglet
  useEffect(() => {
    refreshCategories();
    if (tab === 'visited') {
      // Recharger les châteaux visités depuis localStorage
      const eventIds = [VISITE_EVENT_ID, 'vi-paris-champerret-2026', 'vi-baltard-2026', 'vi-mandelieu-2026', 'po-medoc-2026'];
      const all: VisitedEntry[] = [];
      for (const eid of eventIds) {
        try {
          const raw = localStorage.getItem(`visite-visited-${eid}`);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (typeof item === 'string') all.push({ stand: item });
              else if (item && typeof item === 'object' && item.stand) all.push(item as VisitedEntry);
            }
          }
        } catch { /* ignore */ }
      }
      setVisitedChateaux(all);
    }
  }, [tab]); // eslint-disable-line

  const handleChangePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) { setPwdMsg({ ok: false, text: 'Les mots de passe ne correspondent pas' }); return; }
    if (newPwd.length < 8) { setPwdMsg({ ok: false, text: 'Minimum 8 caractères' }); return; }
    setPwdLoading(true); setPwdMsg(null);
    try {
      const { getStoredToken } = await import('../lib/auth');
      const token = getStoredToken();
      const r = await fetch(`${BACKEND_URL}/api/auth/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ current_password: currentPwd, new_password: newPwd })
      });
      const data = await r.json();
      if (data.ok) {
        setPwdMsg({ ok: true, text: 'Mot de passe modifié !' });
        setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      } else {
        setPwdMsg({ ok: false, text: data.error || 'Erreur' });
      }
    } catch {
      setPwdMsg({ ok: false, text: 'Impossible de contacter le serveur' });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.includes('@')) { setEmailMsg({ ok: false, text: 'Email invalide' }); return; }
    setEmailLoading(true); setEmailMsg(null);
    try {
      const { getStoredToken } = await import('../lib/auth');
      const token = getStoredToken();
      const r = await fetch(`${BACKEND_URL}/api/auth/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ new_email: newEmail })
      });
      const data = await r.json();
      if (data.ok) {
        setEmailMsg({ ok: true, text: 'Email mis à jour ! Un lien de vérification a été envoyé.' });
        setNewEmail('');
      } else {
        setEmailMsg({ ok: false, text: data.error || 'Erreur' });
      }
    } catch {
      setEmailMsg({ ok: false, text: 'Impossible de contacter le serveur' });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem('cepage_history');
    alert('Historique de recherche supprimé.');
  };

  // ── Helpers UI ────────────────────────────────────────────────

  const tabBtn = (t: typeof tab, label: string, color?: string) => (
    <button onClick={() => setTab(t)} style={{
      padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
      background: tab === t ? (color || 'var(--bourgogne)') : 'rgba(255,255,255,0.05)',
      color: tab === t ? '#FFE0E0' : 'rgba(245,245,220,0.5)',
      transition: 'all 0.2s', whiteSpace: 'nowrap',
    }}>{label}</button>
  );

  const msgBox = (msg: { ok: boolean; text: string }) => (
    <div style={{
      padding: '8px 12px', borderRadius: 8, fontSize: '0.85rem', marginTop: 8,
      background: msg.ok ? 'rgba(50,150,50,0.2)' : 'rgba(139,26,26,0.3)',
      border: `1px solid ${msg.ok ? 'rgba(50,200,50,0.3)' : 'rgba(139,26,26,0.5)'}`,
      color: msg.ok ? '#90EE90' : '#F0A0A0'
    }}>{msg.text}</div>
  );

  // Carte d'un vin de catégorie (bacs drag & drop)
  const CategoryWineCard = ({ wine, category }: { wine: WineCardData; category: WineCategory }) => {
    const categoryColors: Record<WineCategory, string> = {
      tasted: '#7B8794', liked: '#27AE60', favorite: '#D4AF37', cellar: '#8B4513',
    };

    return (
      <div
        onClick={() => {
          if (wine.url) setCategoryDetailUrl(wine.url);
          else alert('Détails non disponibles pour ce vin. Veuillez le rechercher à nouveau.');
        }}
        style={{
          background: 'rgba(212,175,55,0.07)', borderRadius: 14,
          border: `1px solid ${categoryColors[category]}40`,
          padding: '14px 16px', marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 12,
          transition: 'all 0.2s', cursor: wine.url ? 'pointer' : 'default',
        }}
      >
        {wine.image && (
          <img src={wine.image} alt={wine.wineName}
            style={{ width: 45, height: 60, objectFit: 'contain', borderRadius: 4, flexShrink: 0 }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ fontFamily: 'Playfair Display, serif', color: 'var(--champagne)', fontSize: '0.95rem', fontWeight: 600, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
            {wine.wineName}
          </h4>
          <p style={{ color: categoryColors[category], fontWeight: 600, fontSize: '0.85rem', margin: 0 }}>
            {wine.year} {'★'.repeat(wine.stars)}
          </p>
          {(wine.region || wine.appellation) && (
            <p style={{ color: 'rgba(245,245,220,0.4)', fontSize: '0.72rem', margin: '2px 0 0' }}>
              {[wine.appellation, wine.region].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); handleRemoveFromCategory(category, wine.wineName, wine.year); }}
          style={{ background: 'rgba(255,100,100,0.15)', border: '1px solid rgba(255,100,100,0.3)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#F0A0A0', fontSize: '0.8rem' }}
          title="Retirer"
        >✕</button>
      </div>
    );
  };

  // ── Rendu ──────────────────────────────────────────────────────

  return (
    <div className="page-enter" style={{ maxWidth: 700, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ color: 'var(--champagne)', fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', marginBottom: 4 }}>
          Mon Compte
        </h2>
        <p style={{ color: 'rgba(245,245,220,0.4)', fontSize: '0.85rem' }}>{user.display_name || user.email}</p>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 32, flexWrap: 'wrap' }}>
        {tabBtn('tasted', `🍷 Vins Goûtés (${categoryWines.tasted.length})`, 'rgba(123,135,148,0.8)')}
        {tabBtn('liked', `🥂 Vins Appréciés (${categoryWines.liked.length})`, 'rgba(39,174,96,0.8)')}
        {tabBtn('favorite', `💛 Favoris (${categoryWines.favorite.length})`, 'rgba(212,175,55,0.8)')}
        {tabBtn('cellar', `🏠 En Cave (${categoryWines.cellar.length})`, 'rgba(139,69,19,0.8)')}
        {tabBtn('visited', `🏰 Châteaux Visités (${visitedChateaux.length})`, 'rgba(16,185,129,0.75)')}
        {tabBtn('settings', '⚙ Paramètres', 'rgba(255,255,255,0.1)')}
      </div>

      {/* ─── Onglet Vins Goûtés ─────────────────────────────── */}
      {tab === 'tasted' && (
        <div>
          {categoryWines.tasted.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 40 }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>🍷</div>
              <h3 style={{ color: 'var(--champagne)', fontFamily: 'Playfair Display, serif', marginBottom: 8 }}>Aucun vin goûté</h3>
              <p style={{ color: 'rgba(245,245,220,0.5)', fontSize: '0.9rem' }}>
                Ouvrez une fiche vin et glissez-la vers "Vin Goûté"
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button onClick={() => { localStorage.removeItem(CAT_KEYS.tasted); refreshCategories(); }}
                  style={{ fontSize: '0.78rem', color: 'rgba(255,120,120,0.7)', background: 'none', border: '1px solid rgba(255,120,120,0.2)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>
                  Tout effacer
                </button>
              </div>
              {visibleTasted.map((wine, i) => (
                <CategoryWineCard key={`${wine.wineName}-${wine.year}-${i}`} wine={wine} category="tasted" />
              ))}
              {tastedHasMore && <div ref={tastedSentinelRef} style={{ height: '1px', marginBottom: '20px' }} />}
            </>
          )}
        </div>
      )}

      {/* ─── Onglet Vins Appréciés ───────────────────────────── */}
      {tab === 'liked' && (
        <div>
          {categoryWines.liked.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 40 }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>🥂</div>
              <h3 style={{ color: 'var(--champagne)', fontFamily: 'Playfair Display, serif', marginBottom: 8 }}>Aucun vin apprécié</h3>
              <p style={{ color: 'rgba(245,245,220,0.5)', fontSize: '0.9rem' }}>
                Ouvrez une fiche vin et glissez-la vers "Vin Apprécié"
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button onClick={() => { localStorage.removeItem(CAT_KEYS.liked); refreshCategories(); }}
                  style={{ fontSize: '0.78rem', color: 'rgba(255,120,120,0.7)', background: 'none', border: '1px solid rgba(255,120,120,0.2)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>
                  Tout effacer
                </button>
              </div>
              {visibleLiked.map((wine, i) => (
                <CategoryWineCard key={`${wine.wineName}-${wine.year}-${i}`} wine={wine} category="liked" />
              ))}
              {likedHasMore && <div ref={likedSentinelRef} style={{ height: '1px', marginBottom: '20px' }} />}
            </>
          )}
        </div>
      )}

      {/* ─── Onglet Favoris (deux colonnes) ─────────────────── */}
      {tab === 'favorite' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {/* COLONNE GAUCHE : Millésimes Favoris (bacs drag) */}
          <div>
            <h3 style={{ color: '#D4AF37', fontFamily: 'Playfair Display, serif', fontSize: '1rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
              🍾 Millésimes Favoris
              <span style={{ fontSize: '0.75rem', color: 'rgba(245,245,220,0.5)', fontWeight: 400 }}>
                ({categoryWines.favorite.length})
              </span>
            </h3>
            {categoryWines.favorite.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', opacity: 0.6 }}>
                <p style={{ color: 'rgba(245,245,220,0.5)', fontSize: '0.85rem' }}>Glissez un vin vers 💛</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <button onClick={() => { localStorage.removeItem(CAT_KEYS.favorite); refreshCategories(); }}
                    style={{ fontSize: '0.7rem', color: 'rgba(255,120,120,0.7)', background: 'none', border: '1px solid rgba(255,120,120,0.2)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                    Tout effacer
                  </button>
                </div>
                {visibleFavorite.map((wine, i) => (
                  <CategoryWineCard key={`fav-${wine.wineName}-${wine.year}-${i}`} wine={wine} category="favorite" />
                ))}
                {favoriteHasMore && <div ref={favoriteSentinelRef} style={{ height: '1px', marginBottom: '20px' }} />}
              </>
            )}
          </div>

          {/* COLONNE DROITE : Vins Favoris globaux (♥) */}
          <div>
            <h3 style={{ color: '#D4AF37', fontFamily: 'Playfair Display, serif', fontSize: '1rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
              ♥ Vins Favoris
              <span style={{ fontSize: '0.75rem', color: 'rgba(245,245,220,0.5)', fontWeight: 400 }}>
                ({globalFavorites.length})
              </span>
            </h3>
            {globalFavorites.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', opacity: 0.6 }}>
                <p style={{ color: 'rgba(245,245,220,0.5)', fontSize: '0.85rem' }}>
                  Cliquez sur ♡ dans une recherche
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <button onClick={() => { localStorage.removeItem(FAV_KEY); setGlobalFavorites([]); }}
                    style={{ fontSize: '0.7rem', color: 'rgba(255,120,120,0.7)', background: 'none', border: '1px solid rgba(255,120,120,0.2)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                    Tout effacer
                  </button>
                </div>
                {visibleGlobalFavs.map((wine, i) => (
                  <div
                    key={`global-${wine.foundName}-${i}`}
                    onClick={() => setSelectedGlobalFavorite(wine)}
                    style={{
                      background: 'rgba(212,175,55,0.07)', borderRadius: 14, border: '1px solid rgba(212,175,55,0.25)',
                      padding: '12px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12,
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    {wine.image && (
                      <img src={wine.image} alt={wine.foundName}
                        style={{ width: 40, height: 50, objectFit: 'contain', borderRadius: 4, flexShrink: 0 }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ fontFamily: 'Playfair Display, serif', color: 'var(--champagne)', fontSize: '0.95rem', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                        {wine.foundName}
                      </h4>
                      {wine.region && (
                        <p style={{ color: 'rgba(245,245,220,0.4)', fontSize: '0.72rem', margin: '2px 0 0' }}>
                          {wine.region}
                        </p>
                      )}
                    </div>
                    <span style={{ color: '#D4AF37', fontSize: '1rem' }}>♡</span>
                  </div>
                ))}
                {globalFavsHasMore && <div ref={globalFavsSentinelRef} style={{ height: '1px', marginBottom: '20px' }} />}
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Popup vin favori global ────────────────────────── */}
      {selectedGlobalFavorite && createPortal(
        <div
          onClick={() => setSelectedGlobalFavorite(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#f8f4ec', borderRadius: 20, maxWidth: 600, width: '100%', maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.5)', position: 'relative', display: 'flex', flexDirection: 'column' }}
          >
            <button
              onClick={() => setSelectedGlobalFavorite(null)}
              style={{ position: 'absolute', top: 12, right: 12, zIndex: 2, background: 'rgba(45,10,13,0.1)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: '#2D0A0D', fontSize: '1.2rem', lineHeight: '32px', textAlign: 'center' }}
            >×</button>

            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(212,175,55,0.2)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.6rem', fontWeight: 700, color: '#2D0A0D', lineHeight: 1.2, margin: 0 }}>
                    {selectedGlobalFavorite.foundName}
                  </h2>
                  {selectedGlobalFavorite.producerName && selectedGlobalFavorite.producerName !== selectedGlobalFavorite.foundName && (
                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'rgba(60,40,10,0.5)', fontStyle: 'italic', letterSpacing: '0.02em' }}>
                      {selectedGlobalFavorite.producerName}
                    </p>
                  )}
                  {(() => {
                    const appellations = [...new Set(selectedGlobalFavorite.vintages?.map(v => v.type).filter(Boolean))] as string[];
                    const totalVintages = selectedGlobalFavorite.vintages?.length || 0;
                    return (
                      <p style={{ fontSize: '0.9rem', color: '#666', marginTop: 4 }}>
                        {appellations.slice(0, 3).join(' · ')} — {totalVintages} millésime{totalVintages > 1 ? 's' : ''}
                      </p>
                    );
                  })()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                  <button
                    onClick={() => {
                      toggleFavorite(selectedGlobalFavorite);
                      setGlobalFavorites(getFavorites());
                    }}
                    title={isFavorite(selectedGlobalFavorite) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    style={{
                      background: isFavorite(selectedGlobalFavorite) ? 'rgba(180,30,30,0.1)' : 'rgba(60,40,10,0.05)',
                      border: `1px solid ${isFavorite(selectedGlobalFavorite) ? 'rgba(180,30,30,0.3)' : 'rgba(60,40,10,0.15)'}`,
                      borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                      color: isFavorite(selectedGlobalFavorite) ? '#c0392b' : 'rgba(60,40,10,0.45)',
                      fontSize: '1.1rem', lineHeight: 1, transition: 'all 0.2s',
                    }}
                  >{isFavorite(selectedGlobalFavorite) ? '♥' : '♡'}</button>
                  <button
                    onClick={() => {
                      const searchName = encodeURIComponent(selectedGlobalFavorite.producerName || selectedGlobalFavorite.foundName);
                      window.open(`https://www.hachette-vins.com/producteurs/page-1/list/?search=${searchName}`, '_blank');
                    }}
                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(114,47,55,0.08)', border: '1px solid rgba(114,47,55,0.15)', borderRadius: 8, color: '#722F37', fontSize: '0.85rem' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                    </svg>
                    Plus d'infos
                  </button>
                </div>
              </div>
            </div>

            {/* Millésimes groupés par couleur */}
            <div style={{ padding: '12px 24px 24px', overflowY: 'auto', flex: 1 }}>
              {(() => {
                const byColor: Record<string, typeof selectedGlobalFavorite.vintages> = {};
                for (const v of selectedGlobalFavorite.vintages || []) {
                  const base = v.color || 'Autre';
                  const c = v.isEffervescent ? `${base} effervescent` : base;
                  if (!byColor[c]) byColor[c] = [];
                  byColor[c].push(v);
                }
                for (const c of Object.keys(byColor)) byColor[c].sort((a, b) => b.year - a.year);

                const colorOrder = ['Rouge', 'Rouge effervescent', 'Rosé', 'Rosé effervescent', 'Blanc', 'Blanc effervescent', 'Autre'];

                return colorOrder.map(color => {
                  const vins = byColor[color];
                  if (!vins || vins.length === 0) return null;
                  const baseColor = color.replace(' effervescent', '');
                  const isEff = color.endsWith('effervescent');
                  const cls = baseColor === 'Rouge' ? 'rouge' : baseColor === 'Rosé' ? 'rose' : 'blanc';
                  const emoji = baseColor === 'Rouge' ? (isEff ? '🫧' : '🔴') : baseColor === 'Rosé' ? (isEff ? '🫧' : '🌸') : (isEff ? '🫧' : '🟡');
                  const label = isEff ? `${baseColor} pétillant` : `${baseColor} tranquille`;

                  const pillBg = baseColor === 'Rouge' ? '#8B1A1A' : baseColor === 'Rosé' ? '#E8A0BF' : 'linear-gradient(135deg, #D4AF37, #C9A832)';
                  const pillColor = baseColor === 'Rouge' ? '#FFE0E0' : baseColor === 'Rosé' ? '#5A1530' : '#3D2B00';
                  const starFilled = { color: '#FFE033', filter: 'drop-shadow(0 0 4px rgba(255,220,0,0.75)) brightness(1.12)' };
                  const starEmpty = baseColor === 'Blanc'
                    ? { color: 'rgba(61, 43, 0, 0.25)' }
                    : { color: baseColor === 'Rouge' ? 'rgba(255, 200, 200, 0.2)' : 'rgba(90, 21, 48, 0.2)' };

                  return (
                    <div key={color} className="vintage-group" style={{ marginBottom: 14 }}>
                      <div className={`vintage-group-title ${cls}`} style={isEff ? { opacity: 0.85, fontStyle: 'italic' } : undefined}>
                        <span>{emoji}</span> {label} — {vins.length} millésime{vins.length > 1 ? 's' : ''}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {vins.map((v, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              if (v.link) {
                                setSelectedGlobalFavorite(null);
                                setCategoryDetailUrl(v.link);
                              }
                            }}
                            style={{
                              background: pillBg, color: pillColor, borderRadius: 14, padding: '12px 16px 10px',
                              cursor: v.link ? 'pointer' : 'default', textAlign: 'center',
                              transition: 'transform 0.15s, box-shadow 0.15s', minWidth: 80,
                              display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                              opacity: v.link ? 1 : 0.5,
                            }}
                          >
                            <span style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1 }}>{v.year}</span>
                            <span style={{ display: 'flex', gap: 2, marginTop: 5 }}>
                              {[0, 1, 2].map(starIdx => (
                                <span key={starIdx} style={{ fontSize: '1rem', lineHeight: 1, ...(starIdx < v.stars ? starFilled : starEmpty) }}>★</span>
                              ))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── Onglet En Cave ─────────────────────────────────── */}
      {tab === 'cellar' && (
        <div>
          {categoryWines.cellar.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 40 }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>🏠</div>
              <h3 style={{ color: 'var(--champagne)', fontFamily: 'Playfair Display, serif', marginBottom: 8 }}>Aucune cave</h3>
              <p style={{ color: 'rgba(245,245,220,0.5)', fontSize: '0.9rem' }}>
                Ouvrez une fiche vin et glissez-la vers "En Cave"
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button onClick={() => { localStorage.removeItem(CAT_KEYS.cellar); refreshCategories(); }}
                  style={{ fontSize: '0.78rem', color: 'rgba(255,120,120,0.7)', background: 'none', border: '1px solid rgba(255,120,120,0.2)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>
                  Tout effacer
                </button>
              </div>
              {visibleCellar.map((wine, i) => (
                <CategoryWineCard key={`${wine.wineName}-${wine.year}-${i}`} wine={wine} category="cellar" />
              ))}
              {cellarHasMore && <div ref={cellarSentinelRef} style={{ height: '1px', marginBottom: '20px' }} />}
            </>
          )}
        </div>
      )}

      {/* ─── Onglet Châteaux Visités ────────────────────────── */}
      {tab === 'visited' && (
        <div>
          {visitedChateaux.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 60 }}>
              <div style={{ fontSize: '3.5rem', marginBottom: 16, filter: 'drop-shadow(0 0 20px rgba(16,185,129,0.3))' }}>🏰</div>
              <h3 style={{ color: 'var(--champagne)', fontFamily: 'Playfair Display, serif', marginBottom: 8, fontSize: '1.2rem' }}>
                Aucun château visité pour l'instant
              </h3>
              <p style={{ color: 'rgba(245,245,220,0.4)', fontSize: '0.88rem', maxWidth: 320, margin: '0 auto', lineHeight: 1.6 }}>
                En mode Visite, glissez un exposant vers le bac "Châteaux Visités" pour le retrouver ici.
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700,
                    background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)',
                    color: 'rgba(16,185,129,0.9)',
                  }}>
                    {visitedChateaux.length} château{visitedChateaux.length > 1 ? 'x' : ''} visité{visitedChateaux.length > 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  onClick={() => {
                    const eventIds = [VISITE_EVENT_ID, 'vi-paris-champerret-2026', 'vi-baltard-2026', 'vi-mandelieu-2026', 'po-medoc-2026'];
                    for (const eid of eventIds) localStorage.removeItem(`visite-visited-${eid}`);
                    setVisitedChateaux([]);
                  }}
                  style={{ fontSize: '0.75rem', color: 'rgba(255,120,120,0.7)', background: 'none', border: '1px solid rgba(255,120,120,0.2)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}
                >
                  Tout effacer
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {visibleVisited.map((entry, i) => (
                  <div
                    key={`${entry.stand}-${i}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 16px',
                      background: 'rgba(16,185,129,0.06)',
                      border: '1px solid rgba(16,185,129,0.22)',
                      borderRadius: 14,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(16,185,129,0.1)';
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(16,185,129,0.4)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(16,185,129,0.06)';
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(16,185,129,0.22)';
                    }}
                  >
                    {/* Badge stand */}
                    <div style={{
                      minWidth: 46, height: 46, borderRadius: 10, flexShrink: 0,
                      background: 'rgba(16,185,129,0.12)',
                      border: '1.5px solid rgba(16,185,129,0.35)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>🏰</span>
                    </div>
                    {/* Infos */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: 'var(--champagne)', fontWeight: 600, fontSize: '0.9rem',
                        fontFamily: 'Playfair Display, serif',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {entry.name || `Stand ${entry.stand}`}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                        {entry.region && (
                          <span style={{ fontSize: '0.7rem', color: 'rgba(245,245,220,0.45)', fontWeight: 500 }}>
                            {entry.region}
                          </span>
                        )}
                        <span style={{
                          fontSize: '0.68rem', color: 'rgba(16,185,129,0.7)',
                          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                          padding: '1px 6px', borderRadius: 10, fontWeight: 600,
                        }}>
                          {entry.stand}
                        </span>
                      </div>
                    </div>
                    {/* Badge visité */}
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 700,
                      color: 'rgba(16,185,129,0.9)',
                      background: 'rgba(16,185,129,0.12)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      padding: '3px 8px', borderRadius: 20, flexShrink: 0,
                    }}>
                      ✓ Visité
                    </span>
                  </div>
                ))}
              </div>
              {visitedHasMore && <div ref={visitedSentinelRef} style={{ height: '1px', marginBottom: '20px' }} />}
            </>
          )}
        </div>
      )}

      {/* ─── Onglet Paramètres ──────────────────────────────── */}
      {tab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Changer mot de passe */}
          <div className="admin-card">
            <h3 className="admin-title" style={{ fontSize: '1rem', marginBottom: 16 }}>Changer le mot de passe</h3>
            <form onSubmit={handleChangePwd} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input className="admin-input" type="password" placeholder="Mot de passe actuel" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} required autoComplete="off" />
              <input className="admin-input" type="password" placeholder="Nouveau mot de passe (min. 8 car.)" value={newPwd} onChange={e => setNewPwd(e.target.value)} required autoComplete="off" />
              <input className="admin-input" type="password" placeholder="Confirmer le nouveau mot de passe" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} required autoComplete="off" />
              <button type="submit" className="admin-btn" disabled={pwdLoading} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                {pwdLoading ? 'Enregistrement...' : 'Changer le mot de passe'}
              </button>
            </form>
            {pwdMsg && msgBox(pwdMsg)}
          </div>

          {/* Changer email */}
          <div className="admin-card">
            <h3 className="admin-title" style={{ fontSize: '1rem', marginBottom: 4 }}>Changer l'adresse email</h3>
            <p style={{ color: 'rgba(245,245,220,0.4)', fontSize: '0.8rem', marginBottom: 12 }}>
              Actuel : {user.email}
            </p>
            <form onSubmit={handleChangeEmail} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input className="admin-input" type="email" placeholder="Nouvelle adresse email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required autoComplete="off" />
              <button type="submit" className="admin-btn" disabled={emailLoading} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                {emailLoading ? 'Enregistrement...' : "Changer l'email"}
              </button>
            </form>
            {emailMsg && msgBox(emailMsg)}
          </div>

          {/* Données & Confidentialité */}
          <div className="admin-card">
            <h3 className="admin-title" style={{ fontSize: '1rem', marginBottom: 12 }}>Données & Confidentialité</h3>
            <button
              onClick={handleClearHistory}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 16px', color: 'rgba(245,245,220,0.6)', cursor: 'pointer', fontSize: '0.88rem', marginBottom: 8, display: 'block', width: '100%', textAlign: 'left' }}>
              🗑 Supprimer l'historique de recherche
            </button>
          </div>

          {/* Déconnexion */}
          <button
            onClick={onLogout}
            style={{ background: 'rgba(139,26,26,0.2)', border: '1px solid rgba(139,26,26,0.4)', borderRadius: 12, padding: '12px 20px', color: '#F0A0A0', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Se déconnecter
          </button>
        </div>
      )}

      {/* Modal détail vin (bacs drag & drop) */}
      {categoryDetailUrl && (
        <WineDetailModalWithDrag
          url={categoryDetailUrl}
          onClose={() => setCategoryDetailUrl(null)}
          onCategoryChange={refreshCategories}
        />
      )}
    </div>
  );
}
