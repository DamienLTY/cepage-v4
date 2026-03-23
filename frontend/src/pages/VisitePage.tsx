/**
 * VisitePage — Mode Visite du Salon des Vignerons Indépendants
 *
 * Charge le JSON des exposants depuis /public/exposants-{eventId}.json
 * et permet de :
 * - Chercher par stand ou nom d'exposant
 * - Filtrer par couleur, étoiles, région, millésime minimum
 * - Trier par numéro de stand, nom ou nombre de millésimes
 * - Déplier les vins référencés inline (accordion)
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ExposantData, ExposantsData } from '../types';
import { VISITE_EVENT_ID } from '../constants';
import { BACKEND_URL } from '../lib/wineSearch';
import ExposantCard from '../components/visite/ExposantCard';
import GuidedTourTab from '../components/visite/GuidedTourTab';
import VisiteTutorial from '../components/visite/VisiteTutorial';
import VisiteModePicker from '../components/visite/VisiteModePicker';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

// ── Helpers ────────────────────────────────────────────────────────────

/** Tri alphanumérique des numéros de stand (ex: "A 12" < "B 3") */
function sortStand(a: string, b: string): number {
  const aLet = a[0] || '';
  const bLet = b[0] || '';
  if (aLet !== bLet) return aLet.localeCompare(bLet);
  const aNum = parseInt(a.slice(2)) || 0;
  const bNum = parseInt(b.slice(2)) || 0;
  return aNum - bNum;
}

/** Retourne une couleur hexadécimale selon la région viticole */
function getRegionColor(region: string | null | undefined): string {
  if (!region) return '#7F8C8D';
  const r = region.toLowerCase();
  if (r.includes('bordeaux')) return '#722F37';
  if (r.includes('bourgogne') || r.includes('beaujolais')) return '#8B1A5C';
  if (r.includes('rhône') || r.includes('rhone')) return '#C0392B';
  if (r.includes('loire')) return '#27AE60';
  if (r.includes('alsace')) return '#2980B9';
  if (r.includes('languedoc') || r.includes('roussillon')) return '#E67E22';
  if (r.includes('provence') || r.includes('corse')) return '#E91E8C';
  if (r.includes('champagne')) return '#F0D060';
  if (r.includes('sud-ouest') || r.includes('armagnac')) return '#8E44AD';
  if (r.includes('jura')) return '#16A085';
  return '#7F8C8D';
}

/** Emojis des régions viticoles */
const REGION_EMOJI: Record<string, string> = {
  'Bordeaux': '🏰', 'Bourgogne': '🍇', 'Champagne': '🥂',
  'Alsace': '🌹', 'Rhône': '🌊', 'Loire': '🌻',
  'Languedoc': '☀️', 'Provence': '🌿', 'Roussillon': '🏔️',
  'Sud-Ouest': '🌾', 'Beaujolais': '🍷', 'Savoie': '🏔️',
  'Jura': '🌲', 'Corse': '🏝️',
};

// ── Page principale ─────────────────────────────────────────────────────

interface VisitePageProps {
  eventId?: string;
  onNavigate?: (p: import('../types').Page) => void;
}

export default function VisitePage({ eventId, onNavigate }: VisitePageProps) {
  const activeEventId = eventId || VISITE_EVENT_ID;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExposantsData | null>(null);
  const [visiteMode, setVisiteMode] = useState<'decouverte' | 'guide' | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'stand' | 'name' | 'millesimes'>(() =>
    (localStorage.getItem('visite-sort') as 'stand' | 'name' | 'millesimes') || 'stand'
  );
  const [expandedStand, setExpandedStand] = useState<string | null>(null);
  const [visitedStands, setVisitedStands] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`visite-visited-${activeEventId}`) || '[]')); }
    catch { return new Set(); }
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStand, setDragStand] = useState<string | null>(null);
  const [dragOverVisited, setDragOverVisited] = useState(false);
  const [filterColors, setFilterColors] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('visite-colors') || '[]'); } catch { return []; }
  });
  const [filterStars, setFilterStars] = useState<number | null>(() => {
    const v = localStorage.getItem('visite-stars');
    return v ? parseInt(v) : null;
  });
  const [filterRegion, setFilterRegion] = useState<string | null>(() =>
    localStorage.getItem('visite-region') || null
  );
  const [filterFromYear, setFilterFromYear] = useState<number>(() =>
    parseInt(localStorage.getItem('visite-year') || '1996')
  );
  const searchRef = useRef<HTMLInputElement>(null);

  // Le tutoriel est déclenché après sélection du mode
  const handleModeSelect = (mode: 'decouverte' | 'guide') => {
    setVisiteMode(mode);
    if (!localStorage.getItem('visite-tutorial-done')) {
      setShowTutorial(true);
    }
  };

  // Chargement du JSON exposants — fichier statique d'abord, fallback backend
  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);
    const staticUrl = `/exposants-${activeEventId}.json`;
    fetch(staticUrl)
      .then(r => {
        if (!r.ok) throw new Error('static_failed');
        return r.json();
      })
      .then((d: ExposantsData) => { setData(d); setLoading(false); })
      .catch(() => {
        // Fallback vers le backend si le fichier statique est absent
        fetch(`${BACKEND_URL}/api/visite/exposants/${activeEventId}`)
          .then(r => {
            if (!r.ok) throw new Error('Salon non trouvé');
            return r.json();
          })
          .then((d: ExposantsData) => { setData(d); setLoading(false); })
          .catch(e => { setError(e.message); setLoading(false); });
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persistance des préférences dans localStorage
  useEffect(() => { localStorage.setItem('visite-sort', sortBy); }, [sortBy]);
  useEffect(() => { localStorage.setItem('visite-colors', JSON.stringify(filterColors)); }, [filterColors]);
  useEffect(() => {
    if (filterStars !== null) localStorage.setItem('visite-stars', String(filterStars));
    else localStorage.removeItem('visite-stars');
  }, [filterStars]);
  useEffect(() => {
    if (filterRegion) localStorage.setItem('visite-region', filterRegion);
    else localStorage.removeItem('visite-region');
  }, [filterRegion]);
  useEffect(() => { localStorage.setItem('visite-year', String(filterFromYear)); }, [filterFromYear]);

  // Persistance des châteaux visités
  useEffect(() => {
    localStorage.setItem(`visite-visited-${activeEventId}`, JSON.stringify([...visitedStands]));
  }, [visitedStands]); // eslint-disable-line

  // Reset sortBy si portes-ouvertes
  useEffect(() => {
    if (data?.type === 'portes-ouvertes' && sortBy === 'stand') {
      setSortBy('name');
    }
  }, [data?.type]); // eslint-disable-line

  // Fonction toggleVisited
  const toggleVisited = (stand: string) => {
    setVisitedStands(prev => {
      const next = new Set(prev);
      if (next.has(stand)) next.delete(stand); else next.add(stand);
      return next;
    });
  };

  // ── Filtre conjonctif par millésime ──────────────────────────────────────
  // Un millésime correspond si ET SEULEMENT SI il satisfait TOUS les critères actifs.
  // Un exposant reste dans la liste s'il possède au moins un tel millésime.
  const vintageMatchesAllFilters = React.useCallback((v: { year: number; stars: number; color: string; isEffervescent: boolean }) => {
    // Filtre année (année >= seuil)
    if (v.year < filterFromYear) return false;
    // Filtre étoiles
    if (filterStars !== null && (v.stars || 0) < filterStars) return false;
    // Filtre couleur / effervescent (conjonctif : Rouge + Effervescent = Rouge effervescent uniquement)
    if (filterColors.length > 0) {
      const regularColors = filterColors.filter(c => c !== 'Effervescent');
      const effSelected   = filterColors.includes('Effervescent');
      let passes = false;
      if (effSelected && regularColors.length > 0) {
        // Les deux cochés → le millésime doit être de la couleur ET effervescent
        passes = v.isEffervescent && regularColors.includes(v.color);
      } else if (effSelected) {
        // Seulement Effervescent → tout effervescent
        passes = v.isEffervescent;
      } else {
        // Seulement couleur(s) → la couleur doit correspondre ET ne pas être effervescent
        passes = regularColors.includes(v.color) && !v.isEffervescent;
      }
      if (!passes) return false;
    }
    return true;
  }, [filterColors, filterStars, filterFromYear]);

  // Filtrage + tri de la liste d'exposants
  const filtered = React.useMemo(() => {
    if (!data) return [];
    let list = data.exposants;

    // 1. Région (filtre indépendant des millésimes)
    if (filterRegion) {
      list = list.filter(e => (e.region || '') === filterRegion);
    }

    // 2. Recherche textuelle (indépendant)
    if (search.trim()) {
      const s = search.toLowerCase().trim().replace(/\s+/g, '');
      list = list.filter(e => {
        const standNorm  = e.stand.toLowerCase().replace(/\s+/g, '');
        const nameNorm   = e.name.toLowerCase();
        const regionNorm = (e.region || '').toLowerCase();
        return standNorm.includes(s) || nameNorm.includes(s) || regionNorm.includes(s);
      });
    }

    // 3. Filtres sur les millésimes — tous appliqués CONJONCTIVEMENT sur chaque millésime.
    //    L'exposant n'est conservé que s'il a ≥ 1 millésime qui passe tous les filtres.
    const hasVintageFilters = filterColors.length > 0 || filterStars !== null || filterFromYear > 1996;
    if (hasVintageFilters) {
      list = list.filter(e =>
        e.wineResults.some(r => r.vintages.some(v => vintageMatchesAllFilters(v)))
      );
    }

    // 4. Tri — le compteur de millésimes reflète uniquement les millésimes correspondants
    const getMatchingMilCount = (e: ExposantData) =>
      hasVintageFilters
        ? e.wineResults.reduce((s, r) => s + r.vintages.filter(v => vintageMatchesAllFilters(v)).length, 0)
        : e.wineResults.reduce((s, r) => s + r.vintages.length, 0);

    return [...list].sort((a, b) => {
      if (sortBy === 'stand')      return sortStand(a.stand, b.stand);
      if (sortBy === 'millesimes') return getMatchingMilCount(b) - getMatchingMilCount(a);
      return a.name.localeCompare(b.name, 'fr');
    });
  }, [data, search, sortBy, filterColors, filterStars, filterRegion, filterFromYear, vintageMatchesAllFilters]);

  const stats = React.useMemo(() => {
    if (!data) return null;
    const total = data.exposants.length;
    const avecVins = data.exposants.filter(e => e.wineResults.some(r => r.vintages.length > 0)).length;
    const totalMillesimes = data.exposants.reduce(
      (s, e) => s + e.wineResults.reduce((s2, r) => s2 + r.vintages.length, 0), 0
    );
    return { total, avecVins, totalMillesimes };
  }, [data]);

  const regions = React.useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const e of data.exposants) { if (e.region) set.add(e.region); }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [data]);

  // Scroll infini sur la liste plate (mode filtré ou tri non-stand)
  const {
    visibleItems: visibleFiltered,
    sentinelRef: filteredSentinelRef,
    hasMore: filteredHasMore,
  } = useInfiniteScroll(filtered, 20);

  // Scroll infini sur les groupes de lettres (mode stand sans filtre)
  const groupedEntries = React.useMemo(() => {
    const groups: Record<string, ExposantData[]> = {};
    for (const e of filtered) {
      const letter = e.stand[0] || '?';
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(e);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const {
    visibleItems: visibleGroups,
    sentinelRef: groupSentinelRef,
    hasMore: groupHasMore,
  } = useInfiniteScroll(groupedEntries, 5);

  if (loading) {
    return (
      <div className="page-enter" style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 16, display: 'inline-block', animation: 'bubbleRise 2s ease-in-out infinite' }}>🍷</div>
        <p style={{ color: 'rgba(245,245,220,0.5)', fontSize: '0.95rem' }}>Chargement du catalogue exposants...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-enter" style={{ textAlign: 'center', paddingTop: 60 }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚠️</div>
        <p style={{ color: 'rgba(245,245,220,0.5)' }}>Impossible de charger les exposants : {error}</p>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ paddingTop: 12 }}>
      {/* ── Tutoriel ── */}
      {showTutorial && <VisiteTutorial onClose={() => setShowTutorial(false)} mode={visiteMode} />}

      {/* ── Bouton Aide flottant (portal → rendu dans document.body pour éviter les contextes de positionnement) ── */}
      {!showTutorial && createPortal(
        <button
          onClick={() => setShowTutorial(true)}
          title="Relancer le tutoriel"
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
            width: 46, height: 46, borderRadius: '50%', cursor: 'pointer',
            background: 'linear-gradient(135deg, rgba(212,175,55,0.22), rgba(160,120,20,0.15))',
            border: '1.5px solid rgba(212,175,55,0.45)',
            color: 'rgba(212,175,55,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.15rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 20px rgba(212,175,55,0.1)',
            transition: 'all 0.2s ease',
            animation: 'neonPulse 3s ease-in-out infinite',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(212,175,55,0.35), rgba(160,120,20,0.25))';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(0,0,0,0.6), 0 0 30px rgba(212,175,55,0.25)';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(212,175,55,0.22), rgba(160,120,20,0.15))';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.5), 0 0 20px rgba(212,175,55,0.1)';
            (e.currentTarget as HTMLButtonElement).style.transform = '';
          }}
        >
          ❓
        </button>,
        document.body
      )}

      {/* ── Bouton La Sélection du Sommelier (Portes Ouvertes Médoc uniquement) ── */}
      {activeEventId === 'po-medoc-2026' && onNavigate && createPortal(
        <button
          onClick={() => onNavigate('selection-sommelier')}
          style={{
            position: 'fixed',
            top: 72,
            right: 16,
            zIndex: 900,
            background: 'linear-gradient(135deg, #8B2635, #C8A951, #8B2635)',
            backgroundSize: '200% 200%',
            animation: 'goldShimmer 3s linear infinite',
            border: '2px solid rgba(200,169,81,0.8)',
            borderRadius: 16,
            padding: '12px 18px',
            cursor: 'pointer',
            color: '#fff',
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 700,
            fontSize: '0.9rem',
            boxShadow: '0 0 20px rgba(200,169,81,0.5), 0 0 40px rgba(139,38,53,0.4), 0 4px 24px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            whiteSpace: 'nowrap',
            letterSpacing: '0.01em',
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>🍷</span>
          <span>La Sélection du Sommelier</span>
          <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>✨</span>
        </button>,
        document.body
      )}

      {/* ── Sélection du mode ── */}
      {visiteMode === null && data && (
        <VisiteModePicker
          eventName={data.eventName || 'Salon des Vignerons Indépendants'}
          eventDates={data.dates}
          eventLocation={data.location}
          onSelect={handleModeSelect}
        />
      )}

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(160deg, rgba(114,47,55,0.22) 0%, rgba(80,20,30,0.08) 60%, transparent 100%)',
        borderRadius: 18, padding: '20px 20px 18px', marginBottom: 18,
        border: '1px solid rgba(114,47,55,0.22)', boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(114,47,55,0.4), rgba(80,20,20,0.5))',
            border: '1px solid rgba(114,47,55,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
          }}>🚶</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h2 style={{ color: 'var(--champagne)', fontFamily: 'Playfair Display, serif', fontSize: '1.3rem', margin: 0, lineHeight: 1.2 }}>
                Mode Visite
              </h2>
            </div>
            <p style={{ color: 'rgba(245,245,220,0.7)', fontSize: '0.88rem', margin: '0 0 2px', fontWeight: 600 }}>
              {data?.eventName || 'Salon des Vignerons Indépendants'}
            </p>
            <p style={{ color: 'rgba(245,245,220,0.45)', fontSize: '0.78rem', margin: 0 }}>
              {data?.dates && `📅 ${data.dates}`}{data?.dates && data?.location && ' · '}{data?.location && `📍 ${data.location}`}
            </p>
          </div>
        </div>

        {stats && (
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            {[
              { val: stats.total, label: 'exposants', color: 'var(--champagne)' },
              { val: stats.avecVins, label: 'avec vins référencés', color: '#27AE60' },
              { val: stats.totalMillesimes, label: 'millésimes référencés', color: 'rgba(245,245,220,0.55)' },
              { val: visitedStands.size, label: 'châteaux visités', color: 'rgba(16,185,129,0.9)' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ color: s.color, fontWeight: 700, fontSize: '1.1rem' }}>{s.val.toLocaleString('fr')}</span>
                <span style={{ color: 'rgba(245,245,220,0.45)', fontSize: '0.75rem' }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Barre de navigation mode ── */}
      {visiteMode !== null && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
          padding: '10px 12px',
          background: 'rgba(7,7,15,0.95)',
          backdropFilter: 'blur(12px)',
          borderRadius: 16,
          border: '1px solid rgba(99,102,241,0.25)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.1)',
          position: 'sticky', top: 68, zIndex: 200,
        }}>
          {/* Bouton retour */}
          <button
            onClick={() => setVisiteMode(null)}
            title="Changer de mode"
            style={{
              padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(245,245,220,0.5)',
              fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5,
              flexShrink: 0, transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(245,245,220,0.9)';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(245,245,220,0.5)';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
            }}
          >
            ← Modes
          </button>

          {/* Séparateur */}
          <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

          {/* Onglets mode */}
          {([
            { key: 'decouverte' as const, label: '🗺️ Découverte' },
            { key: 'guide' as const, label: '✨ Parcours Guidé' },
          ]).map(({ key, label }) => {
            const active = visiteMode === key;
            return (
              <button key={key} onClick={() => handleModeSelect(key)} style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.9rem',
                fontFamily: 'Space Grotesk, sans-serif',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                border: active ? '1.5px solid rgba(99,102,241,0.7)' : '1.5px solid rgba(255,255,255,0.08)',
                background: active
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(139,92,246,0.25))'
                  : 'rgba(255,255,255,0.04)',
                color: active ? '#c7d2fe' : 'rgba(245,245,220,0.45)',
                boxShadow: active
                  ? '0 0 20px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
                  : 'none',
                textShadow: active ? '0 0 12px rgba(99,102,241,0.8)' : 'none',
              }}>
                {label}
              </button>
            );
          })}
        </div>
      )}


      {/* ── Parcours Guidé ────────────────────────────────────────────────── */}
      {visiteMode === 'guide' && <GuidedTourTab data={data!} visitedStands={visitedStands} onToggleVisited={toggleVisited} onDragStart={(stand) => { setIsDragging(true); setDragStand(stand); }} onDragEnd={() => { setIsDragging(false); setDragStand(null); setDragOverVisited(false); }} />}

      {/* ── Mode Découverte (contenu existant) ───────────────────────────── */}
      {visiteMode === 'decouverte' && <>

      {/* ── Hint drag discret ── */}
      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', textAlign: 'center', padding: '4px 0', opacity: 0.7, margin: '0 0 10px' }}>
        💡 Glisse un nom de château vers le bac "Châteaux visités" pour le marquer
      </p>

      {/* ── Intro mode découverte ── */}
      <div style={{
        marginBottom: 14, padding: '10px 14px', borderRadius: 10,
        background: 'rgba(114,47,55,0.07)', border: '1px solid rgba(114,47,55,0.2)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🗺️</span>
        <span style={{ color: 'rgba(245,220,190,0.7)', fontSize: '0.78rem', lineHeight: 1.4 }}>
          Recherchez un exposant ou filtrez la liste. Cliquez sur une carte pour voir ses vins — glissez-la vers le bac ✅ pour marquer le château comme visité.
        </span>
      </div>

      {/* ── Barre de recherche ── */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <input
          ref={searchRef} type="text" value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Chercher par nom d'exposant..."
          style={{
            width: '100%', padding: '11px 14px 11px 40px',
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 12, color: 'var(--champagne)', fontSize: '0.9rem',
            outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
          }}
          onFocus={e => (e.target.style.borderColor = 'rgba(212,175,55,0.4)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.14)')}
        />
        <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(245,245,220,0.4)', fontSize: '0.95rem' }}>🔍</span>
        {search && (
          <button onClick={() => setSearch('')} style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: 'rgba(245,245,220,0.4)',
            cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px', lineHeight: 1,
          }}>×</button>
        )}
      </div>

      {/* ── Panel filtres ── */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, padding: '14px 14px 12px', marginBottom: 20,
      }}>
        {/* Tri */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
          <span style={{ color: 'rgba(245,245,220,0.4)', fontSize: '0.7rem', flexShrink: 0, whiteSpace: 'nowrap' }}>Trier par</span>
          <div style={{ display: 'flex', gap: 6, flex: 1 }}>
            {([
              ...(data?.type !== 'portes-ouvertes' ? [{ val: 'stand' as const, label: '↕ N° Stand' }] : []),
              { val: 'name' as const, label: 'A–Z Nom' },
              { val: 'millesimes' as const, label: '# Millésimes' },
            ] as const).map(s => (
              <button key={s.val} onClick={() => setSortBy(s.val)} style={{
                flex: 1, padding: '9px 6px', borderRadius: 9, fontSize: '0.78rem', fontWeight: 600,
                background: sortBy === s.val ? 'linear-gradient(135deg, rgba(212,175,55,0.25), rgba(180,140,30,0.18))' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${sortBy === s.val ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.09)'}`,
                color: sortBy === s.val ? 'var(--champagne)' : 'rgba(245,245,220,0.45)',
                cursor: 'pointer', textAlign: 'center',
                boxShadow: sortBy === s.val ? '0 2px 8px rgba(212,175,55,0.15)' : 'none',
                transition: 'all 0.15s',
              }}>{s.label}</button>
            ))}
          </div>
          <span style={{ color: 'rgba(245,245,220,0.35)', fontSize: '0.7rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {filtered.length} stand{filtered.length > 1 ? 's' : ''}
          </span>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 0 10px' }} />

        {/* Filtres couleur / effervescent / étoiles */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
          {[
            { key: 'Rouge', label: '🔴 Rouge', bg: 'rgba(114,47,55,0.3)', bc: 'rgba(114,47,55,0.7)' },
            { key: 'Blanc', label: '⚪ Blanc', bg: 'rgba(180,150,30,0.22)', bc: 'rgba(212,175,55,0.5)' },
            { key: 'Rosé', label: '🌸 Rosé', bg: 'rgba(200,80,120,0.2)', bc: 'rgba(200,80,120,0.5)' },
          ].map(c => {
            const active = filterColors.includes(c.key);
            return (
              <button key={c.key} onClick={() => setFilterColors(prev =>
                prev.includes(c.key) ? prev.filter(x => x !== c.key) : [...prev, c.key]
              )} style={{
                flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: '0.73rem', fontWeight: 600,
                background: active ? c.bg : 'rgba(255,255,255,0.05)',
                border: `1px solid ${active ? c.bc : 'rgba(255,255,255,0.1)'}`,
                color: active ? 'var(--champagne)' : 'rgba(245,245,220,0.45)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>{c.label}</button>
            );
          })}

          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

          {(() => {
            const c = { key: 'Effervescent', label: '🥂 Effervescent', bg: 'rgba(60,120,200,0.18)', bc: 'rgba(80,150,220,0.45)' };
            const active = filterColors.includes(c.key);
            return (
              <button onClick={() => setFilterColors(prev =>
                prev.includes(c.key) ? prev.filter(x => x !== c.key) : [...prev, c.key]
              )} style={{
                flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: '0.73rem', fontWeight: 600,
                background: active ? c.bg : 'rgba(255,255,255,0.05)',
                border: `1px solid ${active ? c.bc : 'rgba(255,255,255,0.1)'}`,
                color: active ? 'var(--champagne)' : 'rgba(245,245,220,0.45)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>{c.label}</button>
            );
          })()}

          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

          {[1, 2, 3].map(n => (
            <button key={n} onClick={() => setFilterStars(filterStars === n ? null : n)} style={{
              flex: 1, padding: '7px 2px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700,
              background: filterStars === n ? 'rgba(212,175,55,0.28)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${filterStars === n ? '#D4AF37' : 'rgba(255,255,255,0.1)'}`,
              color: filterStars === n ? '#FFD700' : 'rgba(212,175,55,0.4)',
              cursor: 'pointer', transition: 'all 0.15s',
              textShadow: filterStars === n ? '0 0 10px rgba(212,175,55,0.9)' : 'none',
            }}>{'★'.repeat(n)}</button>
          ))}
        </div>

        {/* Filtre année */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ color: 'rgba(245,245,220,0.4)', fontSize: '0.7rem', flexShrink: 0 }}>Depuis</span>
          <select
            value={filterFromYear}
            onChange={e => setFilterFromYear(parseInt(e.target.value))}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, color: 'var(--champagne)', fontSize: '0.78rem',
              padding: '8px', minHeight: '44px', cursor: 'pointer', outline: 'none',
            }}
          >
            {Array.from({ length: 31 }, (_, i) => 1996 + i).map(y => (
              <option key={y} value={y} style={{ background: '#1a0a0e' }}>{y}</option>
            ))}
          </select>
          {filterFromYear > 1996 && (
            <button onClick={() => setFilterFromYear(1996)} style={{
              padding: '4px 8px', borderRadius: 6, fontSize: '0.68rem',
              background: 'none', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(245,245,220,0.35)', cursor: 'pointer',
            }}>✕</button>
          )}
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 0 10px' }} />

        {/* Filtre région */}
        {regions.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 4 }}>
            {regions.map(r => {
              const active = filterRegion === r;
              const rc = getRegionColor(r);
              const emoji = REGION_EMOJI[r] || '🍷';
              return (
                <button key={r} onClick={() => setFilterRegion(active ? null : r)} style={{
                  padding: '6px 4px', borderRadius: 8, fontSize: '0.71rem', fontWeight: 600,
                  background: active ? `${rc}28` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? rc + '77' : 'rgba(255,255,255,0.08)'}`,
                  color: active ? rc : 'rgba(245,245,220,0.38)',
                  cursor: 'pointer', transition: 'all 0.12s', textAlign: 'center',
                }}>{emoji} {r}</button>
              );
            })}
          </div>
        )}

        {/* Reset filtres */}
        {(filterColors.length > 0 || filterStars !== null || filterRegion || filterFromYear > 1996) && (
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => { setFilterColors([]); setFilterStars(null); setFilterRegion(null); setFilterFromYear(1996); }} style={{
              padding: '4px 12px', borderRadius: 7, fontSize: '0.7rem',
              background: 'none', border: '1px solid rgba(255,255,255,0.14)',
              color: 'rgba(245,245,220,0.4)', cursor: 'pointer',
            }}>✕ Réinitialiser les filtres</button>
          </div>
        )}
      </div>

      {/* ── Liste des exposants (groupés par lettre de stand si tri=stand) ── */}
      {sortBy === 'stand' && !search && filterColors.length === 0 && filterStars === null && !filterRegion ? (
        <>
          {visibleGroups.map(([letter, exposants]) => (
            <div key={letter} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--champagne)', fontWeight: 700, fontSize: '1rem',
                  fontFamily: 'Playfair Display, serif', flexShrink: 0,
                }}>{letter}</div>
                <div style={{ flex: 1, height: 1, background: 'rgba(212,175,55,0.1)' }} />
                <span style={{ color: 'rgba(245,245,220,0.3)', fontSize: '0.72rem' }}>
                  {exposants.length} stand{exposants.length > 1 ? 's' : ''}
                </span>
              </div>
              {exposants.map(e => (
                <ExposantCard
                  key={e.stand}
                  exposant={e}
                  expanded={expandedStand === e.stand}
                  onToggle={() => setExpandedStand(s => s === e.stand ? null : e.stand)}
                  filterFromYear={filterFromYear}
                  filterStars={filterStars}
                  filterColors={filterColors}
                  isPortesOuvertes={data?.type === 'portes-ouvertes'}
                  isVisited={visitedStands.has(e.stand)}
                  onToggleVisited={() => toggleVisited(e.stand)}
                  onDragStart={() => { setIsDragging(true); setDragStand(e.stand); }}
                  onDragEnd={() => { setIsDragging(false); setDragStand(null); setDragOverVisited(false); }}
                />
              ))}
            </div>
          ))}
          {groupHasMore && <div ref={groupSentinelRef} style={{ height: '1px', marginBottom: '20px' }} />}
        </>
      ) : (
        <>
          {visibleFiltered.map(e => (
            <ExposantCard
              key={e.stand}
              exposant={e}
              expanded={expandedStand === e.stand}
              onToggle={() => setExpandedStand(s => s === e.stand ? null : e.stand)}
              filterFromYear={filterFromYear}
              filterStars={filterStars}
              filterColors={filterColors}
              isPortesOuvertes={data?.type === 'portes-ouvertes'}
              isVisited={visitedStands.has(e.stand)}
              onToggleVisited={() => toggleVisited(e.stand)}
              onDragStart={() => { setIsDragging(true); setDragStand(e.stand); }}
              onDragEnd={() => { setIsDragging(false); setDragStand(null); setDragOverVisited(false); }}
            />
          ))}
          {filteredHasMore && <div ref={filteredSentinelRef} style={{ height: '1px', marginBottom: '20px' }} />}
        </>
      )}

      {/* Aucun résultat */}
      {filtered.length === 0 && (() => {
        const activeFilters: string[] = [];
        if (search.trim()) activeFilters.push(`Recherche : "${search.trim()}"`);
        if (filterRegion) activeFilters.push(`Région : ${filterRegion}`);
        if (filterColors.length > 0) activeFilters.push(`Couleur : ${filterColors.join(', ')}`);
        if (filterStars !== null) activeFilters.push(`${filterStars} étoile${filterStars > 1 ? 's' : ''} minimum`);
        if (filterFromYear > 1996) activeFilters.push(`Depuis ${filterFromYear}`);
        return (
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔍</div>
            <p style={{ color: 'rgba(245,245,220,0.55)', fontSize: '0.9rem', marginBottom: 8 }}>
              Aucun exposant ne correspond aux filtres actifs
            </p>
            {activeFilters.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 18 }}>
                {activeFilters.map(f => (
                  <span key={f} style={{
                    padding: '3px 10px', borderRadius: 14, fontSize: '0.78rem',
                    background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)',
                    color: 'rgba(212,175,55,0.8)',
                  }}>{f}</span>
                ))}
              </div>
            )}
            <button
              onClick={() => {
                setSearch('');
                setFilterColors([]);
                setFilterStars(null);
                setFilterRegion(null);
                setFilterFromYear(1996);
              }}
              style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, padding: '8px 20px', color: 'var(--champagne)', cursor: 'pointer', fontSize: '0.85rem' }}>
              Réinitialiser tous les filtres
            </button>
          </div>
        );
      })()}

      {/* Note de bas de page */}
      <div style={{
        marginTop: 24, padding: '12px 16px',
        background: 'rgba(255,255,255,0.03)', borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.06)',
        fontSize: '0.72rem', color: 'rgba(245,245,220,0.3)', textAlign: 'center',
      }}>
        Dernière mise à jour : mars 2026 · Cliquez sur un exposant pour voir ses vins et utiliser les bacs 🍷🥂💛🏠
      </div>

      </> /* fin Mode Découverte */}

      {/* ── Overlay drop zone châteaux visités (portal → document.body pour position fixe fiable) ── */}
      {isDragging && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9500,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
            paddingTop: 72,
            pointerEvents: 'none',
          }}
        >
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOverVisited(true); }}
            onDragLeave={() => setDragOverVisited(false)}
            onDrop={(e) => {
              e.preventDefault();
              const stand = e.dataTransfer.getData('text/plain');
              if (stand) toggleVisited(stand);
              setDragOverVisited(false);
              setIsDragging(false);
              setDragStand(null);
            }}
            style={{
              pointerEvents: 'all',
              padding: '28px 48px', borderRadius: 24,
              background: dragOverVisited ? 'rgba(16,185,129,0.25)' : 'rgba(8,12,22,0.97)',
              border: `3px solid ${dragOverVisited ? 'rgba(16,185,129,1)' : 'rgba(16,185,129,0.5)'}`,
              boxShadow: dragOverVisited
                ? '0 0 60px rgba(16,185,129,0.5), 0 16px 60px rgba(0,0,0,0.7)'
                : '0 16px 60px rgba(0,0,0,0.7)',
              transition: 'all 0.18s ease',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              transform: dragOverVisited ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>✅</span>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                color: dragOverVisited ? 'rgb(16,185,129)' : 'rgba(16,185,129,0.85)',
                fontWeight: 800, fontSize: '1.1rem', marginBottom: 4,
                fontFamily: 'Space Grotesk, sans-serif',
              }}>
                {dragOverVisited ? 'Relâchez ici !' : 'Châteaux Visités'}
              </div>
              <div style={{ color: 'rgba(245,245,220,0.45)', fontSize: '0.8rem' }}>
                {dragOverVisited
                  ? `Marquer ${data?.exposants.find(e => e.stand === dragStand)?.name || 'ce château'} comme visité`
                  : 'Déposez un château pour le marquer comme visité'}
              </div>
            </div>
            {visitedStands.size > 0 && (
              <div style={{ fontSize: '0.72rem', color: 'rgba(16,185,129,0.6)', marginTop: 4 }}>
                {visitedStands.size} déjà visité{visitedStands.size > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
