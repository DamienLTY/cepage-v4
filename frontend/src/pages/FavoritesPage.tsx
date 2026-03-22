/**
 * FavoritesPage — Page des vins mis en favoris (♥)
 *
 * Affiche la liste des WineResult sauvegardés avec étoile rouge.
 * Permet de retirer un favori ou de vider toute la liste.
 * Réutilise ResultCard pour l'affichage de chaque vin.
 */

import { useState } from 'react';
import type { WineResult } from '../lib/wineSearch';
import { getFavorites, toggleFavorite } from '../hooks/useFavorites';
import { FAV_KEY } from '../constants';
import ResultCard from '../components/wine/ResultCard';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

interface Props {
  onSearch: (q: string) => void;
}

export default function FavoritesPage({ onSearch }: Props) {
  const [favs, setFavs] = useState<WineResult[]>(() => getFavorites());

  const { visibleItems: visibleFavs, sentinelRef, hasMore } = useInfiniteScroll(favs, 20);

  const handleRemove = (wine: WineResult) => {
    toggleFavorite(wine);
    setFavs(getFavorites());
  };

  if (favs.length === 0) {
    return (
      <div className="page-enter" style={{ textAlign: 'center', paddingTop: 60 }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>♡</div>
        <h2 style={{ color: 'var(--champagne)', fontFamily: 'Playfair Display, serif', marginBottom: 12 }}>
          Aucun favori
        </h2>
        <p style={{ color: 'rgba(245,245,220,0.5)', fontSize: '0.9rem', maxWidth: 320, margin: '0 auto' }}>
          Cliquez sur ♡ sur une fiche vin pour la sauvegarder ici.
        </p>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ color: 'var(--champagne)', fontFamily: 'Playfair Display, serif', fontSize: '1.4rem' }}>
          ♥ Mes Vins — {favs.length} favori{favs.length > 1 ? 's' : ''}
        </h2>
        <button
          onClick={() => { localStorage.removeItem(FAV_KEY); setFavs([]); }}
          style={{
            fontSize: '0.78rem', color: 'rgba(255,120,120,0.7)',
            background: 'none', border: '1px solid rgba(255,120,120,0.2)',
            borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
          }}
        >
          Tout effacer
        </button>
      </div>

      {visibleFavs.map((wine, i) => (
        <ResultCard
          key={i}
          result={wine}
          onSimilarClick={onSearch}
          onCompare={() => handleRemove(wine)}
          inCompare={false}
        />
      ))}
      {hasMore && <div ref={sentinelRef} style={{ height: '1px', marginBottom: '20px' }} />}
    </div>
  );
}
