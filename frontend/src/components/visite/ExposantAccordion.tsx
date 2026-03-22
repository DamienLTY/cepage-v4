/**
 * ExposantAccordion — Contenu déplié d'un exposant (vins + millésimes)
 *
 * Affiché sous ExposantCard quand l'exposant est sélectionné.
 * Déduplique les noms de vins et filtre par année de millésime.
 * Chaque millésime ouvre la modal WineDetailModalWithDrag.
 */

import React, { useState } from 'react';
import type { ExposantData, WineCategory } from '../../types';
import type { WineVintage } from '../../lib/wineSearch';
import VintagePill from '../wine/VintagePill';
import WineDetailModalWithDrag from '../wine/WineDetailModalWithDrag';

interface Props {
  exposant: ExposantData;
  /** Filtrer les millésimes antérieurs à cette année */
  filterFromYear: number;
  /** Filtrer par nombre d'étoiles minimum (null = pas de filtre) */
  filterStars: number | null;
  /** Filtrer par couleurs / effervescent ([] = pas de filtre) */
  filterColors: string[];
}

export default function ExposantAccordion({ exposant, filterFromYear, filterStars, filterColors }: Props) {
  const [detailUrl, setDetailUrl] = useState<string | null>(null);
  const [addedToast, setAddedToast] = useState<{ category: WineCategory; wineName: string; year: number } | null>(null);

  const handleWineAdded = (category: WineCategory, wineName: string, year: number) => {
    setAddedToast({ category, wineName, year });
    setTimeout(() => setAddedToast(null), 3000);
  };

  const categoryLabels: Record<WineCategory, { label: string; emoji: string }> = {
    tasted: { label: 'Vins goûtés', emoji: '🍷' },
    liked: { label: 'Vins appréciés', emoji: '🥂' },
    favorite: { label: 'Favoris', emoji: '💛' },
    cellar: { label: 'Cave', emoji: '🏠' },
  };

  // Dédupliquer les noms (insensible à la casse, suppression du suffixe " 0")
  // et filtrer les millésimes conjonctivement (année + étoiles + couleur)
  const winesDeduped = React.useMemo(() => {
    const normName = (s: string | null | undefined) =>
      (s ?? '').trim().toLowerCase().replace(/\s+0$/, '').replace(/\s+/g, ' ');

    const vintageMatches = (v: WineVintage) => {
      if (v.year < filterFromYear) return false;
      if (filterStars !== null && (v.stars || 0) < filterStars) return false;
      if (filterColors.length > 0) {
        const regularColors = filterColors.filter(c => c !== 'Effervescent');
        const effSelected   = filterColors.includes('Effervescent');
        let passes = false;
        if (effSelected && regularColors.length > 0) {
          passes = v.isEffervescent && regularColors.includes(v.color);
        } else if (effSelected) {
          passes = v.isEffervescent;
        } else {
          passes = regularColors.includes(v.color) && !v.isEffervescent;
        }
        if (!passes) return false;
      }
      return true;
    };

    const map = new Map<string, { foundName: string; vintages: WineVintage[] }>();
    for (const r of exposant.wineResults) {
      const key = normName(r.foundName);
      const matched = r.vintages.filter(vintageMatches);
      if (matched.length === 0) continue;
      if (map.has(key)) {
        map.get(key)!.vintages.push(...matched);
      } else {
        map.set(key, { foundName: r.foundName, vintages: [...matched] });
      }
    }
    return Array.from(map.values())
      .map(r => ({ ...r, vintages: r.vintages.sort((a, b) => b.year - a.year) }));
  }, [exposant.wineResults, filterFromYear, filterStars, filterColors]);

  const totalBeforeFilter = exposant.wineResults.reduce((s, r) => s + r.vintages.length, 0);
  const hasActiveFilters = filterFromYear > 1996 || filterStars !== null || filterColors.length > 0;
  const isFiltered = totalBeforeFilter > 0 && winesDeduped.length === 0 && hasActiveFilters;

  return (
    <div style={{
      background: 'rgba(12,5,8,0.55)',
      border: '1px solid rgba(212,175,55,0.18)',
      borderTop: 'none',
      borderRadius: '0 0 12px 12px',
      padding: '10px 14px 14px',
      position: 'relative',
    }}>
      {/* Toast de confirmation ajout bac */}
      {addedToast && (
        <div style={{
          position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, rgba(212,175,55,0.95) 0%, rgba(160,130,30,0.95) 100%)',
          padding: '12px 24px', borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 40px rgba(212,175,55,0.5)',
          zIndex: 10001, animation: 'successSlideIn 0.4s ease-out',
          display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: '1.5rem' }}>{categoryLabels[addedToast.category].emoji}</span>
          <div style={{ color: '#2D0A0D' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              Ajouté à vos {categoryLabels[addedToast.category].label} !
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
              {addedToast.wineName} {addedToast.year}
            </div>
          </div>
        </div>
      )}
      {/* Aucun vin disponible */}
      {winesDeduped.length === 0 && (
        <p style={{ color: 'rgba(245,245,220,0.3)', fontSize: '0.78rem', margin: 0, fontStyle: 'italic' }}>
          {exposant.hasDbMatch
            ? (isFiltered
                ? `Aucun millésime correspondant aux filtres actifs`
                : 'Présent en BDD — aucun millésime disponible')
            : 'Non répertorié dans notre base de données'}
        </p>
      )}

      {/* Liste des vins avec leurs millésimes */}
      {winesDeduped.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 8,
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)',
              fontSize: '0.68rem', color: 'rgba(165,180,252,0.8)',
            }}>
              <span>👆</span>
              <span>Cliquez sur un millésime pour voir sa fiche</span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 8,
              background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)',
              fontSize: '0.68rem', color: 'rgba(212,175,55,0.7)',
            }}>
              <span>📥</span>
              <span>Glissez la carte vers un coin pour la ranger</span>
            </div>
          </div>

          <div className="accordion-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {winesDeduped.map((r, ri) => (
              <div key={`${r.foundName}-${ri}`} style={{
                flex: '1 1 130px', minWidth: '110px', maxWidth: '250px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '7px 9px',
              }}>
                <div style={{
                  fontSize: '0.71rem', color: 'rgba(245,245,220,0.65)',
                  fontStyle: 'italic', marginBottom: 6,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {r.foundName}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {r.vintages.map(v => (
                    <VintagePill
                      key={v.link || String(v.year)}
                      v={v}
                      onDetailClick={v.link ? (url) => setDetailUrl(url) : undefined}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal de détail avec drag & drop */}
      {detailUrl && (
        <WineDetailModalWithDrag
          url={detailUrl}
          onClose={() => setDetailUrl(null)}
          onWineAdded={handleWineAdded}
        />
      )}
    </div>
  );
}
