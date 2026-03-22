/**
 * GuidedTourTab — Parcours Guidé du Mode Visite
 *
 * Slider couleur (rouge→rosé→blanc) + checkboxes individuelles + case effervescents.
 * Algorithme de tri par pré-listes (3★ récent, 3★ ancien, nb 3★, nb 2★, nb 1★, 0★).
 * Bouton Explorer randomisé avec progression.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { ExposantData, ExposantsData } from '../../types';
import ExposantAccordion from './ExposantAccordion';
import { VISITE_EVENT_ID } from '../../constants';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PoDetail {
  chateauName: string;
  hasRestauration: boolean;
  restaurationDesc: string | null;
  hasAnimation: boolean;
  animationDesc: string | null;
  hasMusee: boolean;
  museeDesc: string | null;
}

interface Props {
  data: ExposantsData;
  visitedStands?: Set<string>;
  onToggleVisited?: (stand: string) => void;
  onDragStart?: (stand: string) => void;
  onDragEnd?: () => void;
}

// ── Constantes ────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

/** Fallback hardcodé pour la restauration (po-medoc-2026) */
const RESTO_FALLBACK = [
  'Branas Grand Poujeaux', 'Poujeaux', 'Serin', 'Lamothe-Bergeron',
  'Cos Labory', 'Le Crock', 'Dutruch Grand Poujeaux', 'Chasse-Spleen',
  'Maucaillou', 'Gressier Grand Poujeaux',
];

/** Fallback hardcodé pour les animations (po-medoc-2026) */
const ANIM_FALLBACK = [
  'Chasse-Spleen', 'Maucaillou', 'Poujeaux', 'La Tour de Bessan',
  'Biston-Brillette', 'Brillette', 'Dutruch Grand Poujeaux',
];



// ── Helpers ───────────────────────────────────────────────────────────────────

/** Étoiles max d'un exposant */
function getMaxStars(e: ExposantData): number {
  let max = 0;
  for (const r of e.wineResults) {
    for (const v of r.vintages) {
      if ((v.stars || 0) > max) max = v.stars || 0;
    }
  }
  return max;
}

/** Nombre de millésimes totaux */
function getTotalVintages(e: ExposantData): number {
  return e.wineResults.reduce((s, r) => s + r.vintages.length, 0);
}

/** Nombre de millésimes avec un nb d'étoiles donné */
function countStars(e: ExposantData, stars: number): number {
  let count = 0;
  for (const r of e.wineResults) {
    for (const v of r.vintages) {
      if ((v.stars || 0) === stars) count++;
    }
  }
  return count;
}

/** True si l'exposant a au moins 1 millésime N★ datant de moins de X ans */
function hasRecentStars(e: ExposantData, stars: number, maxAge: number): boolean {
  return e.wineResults.some(r =>
    r.vintages.some(v => (v.stars || 0) === stars && (CURRENT_YEAR - v.year) <= maxAge)
  );
}

/** Mélange aléatoire (Fisher-Yates) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Algorithme de tri en pré-listes (sans doublons).
 * Retourne la liste ordonnée de tous les exposants éligibles.
 */
function buildRankedList(exposants: ExposantData[]): ExposantData[] {
  const seen = new Set<string>();
  const result: ExposantData[] = [];

  const add = (list: ExposantData[]) => {
    for (const e of list) {
      if (!seen.has(e.stand)) {
        seen.add(e.stand);
        result.push(e);
      }
    }
  };

  // Pré-liste 0 : 3★ datant de moins de 5 ans
  const pl0 = exposants.filter(e => hasRecentStars(e, 3, 5));
  add(pl0);

  // Pré-liste 1 : 3★ datant de moins de 10 ans
  const pl1 = exposants.filter(e => hasRecentStars(e, 3, 10));
  add(pl1);

  // Pré-liste 2 : le plus de millésimes 3★ (triés desc)
  const pl2 = [...exposants].sort((a, b) => countStars(b, 3) - countStars(a, 3));
  add(pl2.filter(e => countStars(e, 3) > 0));

  // Pré-liste 3 : le plus de millésimes 2★ (triés desc)
  const pl3 = [...exposants].sort((a, b) => countStars(b, 2) - countStars(a, 2));
  add(pl3.filter(e => countStars(e, 2) > 0));

  // Pré-liste 4 : le plus de millésimes 1★ (triés desc)
  const pl4 = [...exposants].sort((a, b) => countStars(b, 1) - countStars(a, 1));
  add(pl4.filter(e => countStars(e, 1) > 0));

  // Pré-liste 5 : le reste (0★)
  add(exposants);

  return result;
}

/** Couleur dominante d'un exposant (parmi ses millésimes non-effervescents) */
function getDominantColor(e: ExposantData): string {
  const counts: Record<string, number> = { Rouge: 0, Rosé: 0, Blanc: 0 };
  for (const r of e.wineResults) {
    for (const v of r.vintages) {
      if (!v.isEffervescent && counts[v.color] !== undefined) {
        counts[v.color]++;
      }
    }
  }
  const max = Math.max(counts.Rouge, counts.Rosé, counts.Blanc);
  if (max === 0) return '';
  if (counts.Rouge === max) return 'Rouge';
  if (counts.Rosé === max) return 'Rosé';
  return 'Blanc';
}

/** True si l'exposant a au moins un millésime effervescent */
function hasEffervescent(e: ExposantData): boolean {
  return e.wineResults.some(r => r.vintages.some(v => v.isEffervescent));
}

// ── Helpers de normalisation de noms ───────────────────────────────────────

/** Normalise un nom de château pour la comparaison */
function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/\p{Mn}/gu, '')
    .replace(/ch[aâa]teau\s*/g, '')
    .replace(/['']/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function GuidedTourTab({ data, visitedStands, onToggleVisited, onDragStart, onDragEnd }: Props) {
  // État pour les données PO details (restauration/animation/musée)
  const [poDetails, setPoDetails] = useState<PoDetail[]>([]);

  // Charger les données depuis l'API
  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://cepage-backend.onrender.com';
    fetch(`${backendUrl}/api/visite/po-details/${VISITE_EVENT_ID}`)
      .then(r => r.json())
      .then(response => {
        if (response.ok && Array.isArray(response.data)) {
          setPoDetails(response.data);
        }
      })
      .catch(() => {
        // En cas d'erreur, poDetails reste vide — les icônes ne s'affichent pas
        console.warn('Failed to load PO details');
      });
  }, []);

  // Couleurs sélectionnées (tous par défaut)
  const [selectedColors, setSelectedColors] = useState<Set<string>>(
    () => new Set(['Rouge', 'Rosé', 'Blanc'])
  );

  const toggleColor = (color: string) => {
    setSelectedColors(prev => {
      const next = new Set(prev);
      if (next.has(color)) {
        if (next.size === 1) return prev; // toujours au moins 1
        next.delete(color);
      } else {
        next.add(color);
      }
      return next;
    });
    setPage(0);
    setExploreList(null);
  };

  const toggleRestaurant = () => {
    setFilterRestaurant(p => !p);
    setPage(0);
    setExploreList(null);
  };

  const toggleAnimation = () => {
    setFilterAnimation(p => !p);
    setPage(0);
    setExploreList(null);
  };

  // Filtres activités
  const [filterRestaurant, setFilterRestaurant] = useState(false);
  const [filterAnimation, setFilterAnimation] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);

  // État Explorer
  const [exploreClicks, setExploreClicks] = useState(0);
  const [exploreList, setExploreList] = useState<ExposantData[] | null>(null);

  // État accordéon
  const [expandedStand, setExpandedStand] = useState<string | null>(null);

  const PAGE_SIZE = 10;

  // Helper pour récupérer les détails PO d'un exposant
  const getPoDetail = (name: string): PoDetail | undefined => {
    const norm = normName(name);
    return poDetails.find(d => normName(d.chateauName) === norm);
  };

  const hasResto = (name: string): boolean => {
    if (poDetails.length > 0) {
      return poDetails.some(p => p.chateauName === name && p.hasRestauration);
    }
    return RESTO_FALLBACK.some(n => name.toLowerCase().includes(n.toLowerCase()));
  };

  const hasAnim = (name: string): boolean => {
    if (poDetails.length > 0) {
      return poDetails.some(p => p.chateauName === name && p.hasAnimation);
    }
    return ANIM_FALLBACK.some(n => name.toLowerCase().includes(n.toLowerCase()));
  };
  const getRestoDesc = (name: string): string | null => getPoDetail(name)?.restaurationDesc ?? null;
  const getAnimDesc = (name: string): string | null => getPoDetail(name)?.animationDesc ?? null;

  // Exposants éligibles (filtrés couleur + activités)
  const eligibles = useMemo(() => {
    return data.exposants.filter(e => {
      // Filtre couleur
      if (selectedColors.size > 0) {
        const dom = getDominantColor(e);
        const colorOk = dom ? selectedColors.has(dom) : false;
        const effOk = selectedColors.has('Effervescent') && hasEffervescent(e);
        if (!colorOk && !effOk) return false;
      }
      // Filtre restauration (sans réservation)
      if (filterRestaurant && !hasResto(e.name)) return false;
      // Filtre animation (gratuite, sans réservation)
      if (filterAnimation && !hasAnim(e.name)) return false;
      return true;
    });
  }, [data.exposants, selectedColors, filterRestaurant, filterAnimation, poDetails]);

  // Liste triée
  const ranked = useMemo(() => buildRankedList(eligibles), [eligibles]);

  // Liste à afficher (Explorer ou standard)
  const displayList = exploreList ?? ranked;
  const totalPages = Math.ceil(displayList.length / PAGE_SIZE);
  const visible = displayList.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Gestion bouton Explorer
  const handleExplore = useCallback(() => {
    const clicks = exploreClicks + 1;
    setExploreClicks(clicks);
    setPage(0);

    // Pool selon nb de clics
    let pool = ranked.filter(e => getMaxStars(e) >= 2); // Base : 2★ et +
    if (clicks > 4) pool = [...pool, ...ranked.filter(e => getMaxStars(e) === 1)];
    if (clicks > 7) pool = [...ranked]; // tout

    setExploreList(shuffle(pool));
  }, [exploreClicks, ranked]);

  const handleResetExplore = useCallback(() => {
    setExploreList(null);
    setExploreClicks(0);
    setPage(0);
  }, []);

  // ── Styles ────────────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: '12px 14px',
    marginBottom: 8,
  };

  const btnStyle: React.CSSProperties = {
    padding: '9px 18px', borderRadius: 10,
    border: '1px solid rgba(34,211,238,0.35)',
    background: 'rgba(34,211,238,0.1)',
    color: 'var(--cyan, #22D3EE)',
    fontSize: '0.82rem', fontWeight: 700,
    cursor: 'pointer', transition: 'all 0.15s',
  };

  // ── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ paddingTop: 16 }}>

      {/* ── Intro algo ── */}
      <div style={{
        marginBottom: 14, padding: '10px 14px', borderRadius: 10,
        background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>✨</span>
        <span style={{ color: 'rgba(165,180,252,0.8)', fontSize: '0.78rem', lineHeight: 1.4 }}>
          Sélectionnez vos couleurs ci-dessous — l'algorithme classe les exposants par leurs meilleures notes Hachette. Cliquez sur une carte pour voir les millésimes.
        </span>
      </div>

      {/* ── Panneau couleurs ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div className="guided-tour-color-filters" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: 'rgba(245,245,220,0.4)', fontSize: '0.72rem', flexShrink: 0 }}>Couleurs :</span>
          {([
            { key: 'Rouge', label: '🔴 Rouge', bg: 'rgba(114,47,55,0.3)', bc: 'rgba(114,47,55,0.7)' },
            { key: 'Rosé', label: '🌸 Rosé', bg: 'rgba(200,80,120,0.2)', bc: 'rgba(200,80,120,0.5)' },
            { key: 'Blanc', label: '⚪ Blanc', bg: 'rgba(180,150,30,0.22)', bc: 'rgba(212,175,55,0.5)' },
            { key: 'Effervescent', label: '🥂 Effervescent', bg: 'rgba(60,120,200,0.18)', bc: 'rgba(80,150,220,0.45)' },
          ] as const).map(c => {
            const active = selectedColors.has(c.key);
            return (
              <button key={c.key} onClick={() => toggleColor(c.key)} style={{
                padding: '8px 14px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
                background: active ? c.bg : 'rgba(255,255,255,0.05)',
                border: `1px solid ${active ? c.bc : 'rgba(255,255,255,0.1)'}`,
                color: active ? 'var(--champagne)' : 'rgba(245,245,220,0.45)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>{c.label}</button>
            );
          })}
        </div>
      </div>

      {/* ── Filtres activités ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          onClick={toggleRestaurant}
          style={{
            padding: '8px 14px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.15s',
            background: filterRestaurant ? 'rgba(249,115,22,0.22)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${filterRestaurant ? 'rgba(249,115,22,0.6)' : 'rgba(255,255,255,0.12)'}`,
            color: filterRestaurant ? 'rgba(249,180,100,1)' : 'rgba(245,245,220,0.45)',
            boxShadow: filterRestaurant ? '0 0 12px rgba(249,115,22,0.2)' : 'none',
          }}
        >
          🍽️ Avec Restauration
        </button>
        <button
          onClick={toggleAnimation}
          style={{
            padding: '8px 14px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.15s',
            background: filterAnimation ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${filterAnimation ? 'rgba(168,85,247,0.55)' : 'rgba(255,255,255,0.12)'}`,
            color: filterAnimation ? 'rgba(200,160,255,1)' : 'rgba(245,245,220,0.45)',
            boxShadow: filterAnimation ? '0 0 12px rgba(168,85,247,0.2)' : 'none',
          }}
        >
          🎭 Avec Animation
        </button>
        {(filterRestaurant || filterAnimation) && (
          <button
            onClick={() => { setFilterRestaurant(false); setFilterAnimation(false); setPage(0); setExploreList(null); }}
            style={{
              padding: '8px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(245,245,220,0.35)',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Indication restauration active */}
      {filterRestaurant && (
        <div style={{
          marginBottom: 12, padding: '8px 12px', borderRadius: 8,
          background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>🍽️</span>
          <span style={{ color: 'rgba(249,180,100,0.8)', fontSize: '0.75rem', lineHeight: 1.4 }}>
            Châteaux proposant une <strong>restauration sans réservation</strong> — idéal pour déjeuner sur place sans planifier.
          </span>
        </div>
      )}

      {/* Indication animation active */}
      {filterAnimation && (
        <div style={{
          marginBottom: 12, padding: '8px 12px', borderRadius: 8,
          background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.2)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>🎭</span>
          <span style={{ color: 'rgba(200,160,255,0.8)', fontSize: '0.75rem', lineHeight: 1.4 }}>
            Châteaux proposant des <strong>animations gratuites sans réservation</strong> — concerts, visites culturelles, ateliers viticoles.
          </span>
        </div>
      )}

      {/* ── En-tête résultats + boutons ──────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <span style={{ color: 'var(--champagne, #D4AF37)', fontWeight: 700, fontSize: '1rem' }}>{ranked.length}</span>
          <span style={{ color: 'rgba(245,245,220,0.45)', fontSize: '0.78rem' }}> exposants trouvés</span>
          {exploreList && (
            <span style={{ color: 'rgba(34,211,238,0.7)', fontSize: '0.72rem', marginLeft: 6 }}>• Mode Explorer</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {exploreList && (
            <button
              onClick={handleResetExplore}
              style={{
                padding: '7px 12px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(245,245,220,0.5)',
                fontSize: '0.75rem', cursor: 'pointer',
              }}
            >
              Réinitialiser
            </button>
          )}
          <button
            onClick={handleExplore}
            style={btnStyle}
          >
            Explorer {exploreClicks > 0 && `(${exploreClicks})`}
          </button>
        </div>
      </div>

      {exploreClicks > 0 && (
        <p style={{ color: 'rgba(245,245,220,0.35)', fontSize: '0.7rem', marginBottom: 10 }}>
          {exploreClicks <= 4
            ? 'Mélange parmi les 2★ et 3★'
            : exploreClicks <= 7
              ? 'Mélange incluant aussi les 1★'
              : 'Mélange de tous les exposants'}
        </p>
      )}

      {/* ── Liste des exposants ──────────────────────────────────────────── */}
      {visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>🍷</div>
          <p style={{ color: 'rgba(245,245,220,0.4)', fontSize: '0.88rem' }}>
            Aucun exposant ne correspond aux couleurs sélectionnées.
          </p>
        </div>
      ) : (
        visible.map(({ stand, name, region, wineResults }, idx) => {
          const rank = page * PAGE_SIZE + idx + 1;
          const e: ExposantData = displayList[page * PAGE_SIZE + idx];
          const maxStars = getMaxStars(e);
          const totalVintages = getTotalVintages(e);
          const exposantHasResto = hasResto(e.name);
          const exposantHasAnim = hasAnim(e.name);
          const restoDesc = getRestoDesc(e.name);
          const animDesc = getAnimDesc(e.name);

          return (
            <div key={stand} style={{ marginBottom: 8 }}>
              <div
                draggable
                onDragStart={(ev) => {
                  ev.dataTransfer.setData('text/plain', stand);
                  ev.dataTransfer.setData('exposantId', stand);
                  ev.dataTransfer.effectAllowed = 'copy';
                  onDragStart?.(stand);
                }}
                onDragEnd={() => onDragEnd?.()}
                onClick={() => setExpandedStand(s => s === stand ? null : stand)}
                style={{
                  ...cardStyle,
                  cursor: 'pointer',
                  background: visitedStands?.has(stand)
                    ? (expandedStand === stand ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.07)')
                    : (expandedStand === stand ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.04)'),
                  border: `1px solid ${visitedStands?.has(stand) ? 'rgba(16,185,129,0.3)' : (expandedStand === stand ? 'rgba(212,175,55,0.35)' : 'rgba(255,255,255,0.08)')}`,
                  borderRadius: expandedStand === stand ? '14px 14px 0 0' : 14,
                  transition: 'all 0.18s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Rang */}
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: rank <= 3 ? 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(180,140,30,0.2))' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${rank <= 3 ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: rank <= 3 ? 'var(--champagne, #D4AF37)' : 'rgba(245,245,220,0.35)',
                    fontSize: '0.72rem', fontWeight: 700,
                  }}>
                    {rank}
                  </div>

                  {/* Infos */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ color: visitedStands?.has(stand) ? 'rgba(16,185,129,0.9)' : 'var(--champagne, #D4AF37)', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'Playfair Display, serif' }}>
                        {name}
                      </span>
                      <span style={{ color: 'rgba(245,245,220,0.35)', fontSize: '0.72rem' }}>
                        Stand {stand}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      {region && (
                        <span style={{ color: 'rgba(245,245,220,0.45)', fontSize: '0.73rem' }}>
                          {region}
                        </span>
                      )}
                      {maxStars > 0 && (
                        <span style={{ color: '#FFD700', fontSize: '0.73rem', fontWeight: 700, textShadow: '0 0 8px rgba(212,175,55,0.7)' }}>
                          {'★'.repeat(maxStars)}
                        </span>
                      )}
                      {totalVintages > 0 && (
                        <span style={{ color: 'rgba(245,245,220,0.35)', fontSize: '0.71rem' }}>
                          {wineResults.length} vin{wineResults.length > 1 ? 's' : ''} · {totalVintages} millésime{totalVintages > 1 ? 's' : ''}
                        </span>
                      )}
                      {exposantHasResto && filterRestaurant && (
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700,
                          padding: '2px 6px', borderRadius: 4,
                          background: 'rgba(245,158,11,0.22)',
                          border: '1px solid rgba(245,158,11,0.45)',
                          color: '#F59E0B',
                        }}>
                          🍽️ Restauration
                        </span>
                      )}
                      {exposantHasAnim && filterAnimation && (
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700,
                          padding: '2px 6px', borderRadius: 4,
                          background: 'rgba(139,92,246,0.22)',
                          border: '1px solid rgba(139,92,246,0.45)',
                          color: '#C4B5FD',
                        }}>
                          🎭 Animation
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {onToggleVisited && (
                      <button
                        onClick={(ev) => { ev.stopPropagation(); onToggleVisited(stand); }}
                        title={visitedStands?.has(stand) ? 'Retirer des visités' : 'Marquer comme visité'}
                        style={{
                          padding: '5px 10px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700,
                          background: visitedStands?.has(stand) ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${visitedStands?.has(stand) ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.12)'}`,
                          color: visitedStands?.has(stand) ? 'rgba(16,185,129,0.9)' : 'rgba(245,245,220,0.45)',
                          cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                        }}
                      >
                        {visitedStands?.has(stand) ? '✓ Visité' : '+ Visiter'}
                      </button>
                    )}
                    {totalVintages > 0 && (
                      <div style={{
                        color: 'rgba(245,245,220,0.4)', fontSize: '1rem',
                        transform: expandedStand === stand ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.2s ease',
                      }}>›</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Descriptions restauration / animation si déplié */}
              {expandedStand === stand && (
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  borderLeft: '1px solid rgba(255,255,255,0.08)',
                  borderRight: '1px solid rgba(255,255,255,0.08)',
                  borderBottom: totalVintages === 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  borderRadius: totalVintages === 0 ? '0 0 14px 14px' : '0',
                  padding: '12px 14px',
                }}>
                  {exposantHasResto && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: '0.9rem' }}>🍽️</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(245,158,11,0.9)' }}>Restauration</span>
                      </div>
                      {restoDesc && (
                        <p style={{ fontSize: '0.75rem', color: 'rgba(245,245,220,0.6)', marginLeft: 24, lineHeight: 1.4 }}>
                          {restoDesc}
                        </p>
                      )}
                    </div>
                  )}
                  {exposantHasAnim && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: '0.9rem' }}>🎭</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(200,160,255,0.9)' }}>Animation</span>
                      </div>
                      {animDesc && (
                        <p style={{ fontSize: '0.75rem', color: 'rgba(245,245,220,0.6)', marginLeft: 24, lineHeight: 1.4 }}>
                          {animDesc}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Accordéon déplié */}
              {expandedStand === stand && totalVintages > 0 && (
                <ExposantAccordion
                  exposant={e}
                  filterFromYear={1996}
                  filterStars={null}
                  filterColors={[]}
                />
              )}
            </div>
          );
        })
      )}

      {/* ── Boutons navigation ──────────────────────────────────────────── */}
      {displayList.length > PAGE_SIZE && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
          {page > 0 && (
            <button onClick={() => setPage(p => p - 1)} style={{
              padding: '9px 20px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(245,245,220,0.6)',
              fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600,
            }}>
              ← Précédents
            </button>
          )}
          {page < totalPages - 1 && (
            <button onClick={() => setPage(p => p + 1)} style={btnStyle}>
              Voir les suivants
            </button>
          )}
        </div>
      )}

      {displayList.length > 0 && (
        <p style={{ color: 'rgba(245,245,220,0.25)', fontSize: '0.68rem', textAlign: 'center', marginTop: 12 }}>
          {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, displayList.length)} sur {displayList.length} exposants
        </p>
      )}
    </div>
  );
}
