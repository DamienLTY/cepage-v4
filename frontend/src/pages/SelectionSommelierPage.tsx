/**
 * SelectionSommelierPage — La Sélection du Sommelier
 *
 * Circuit personnalisé pour les Portes Ouvertes en Médoc 2026.
 * Liste curatée de châteaux avec carte interactive Google Maps,
 * vins associés, et suivi des visites.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Page } from '../types';
import type { WineResult } from '../lib/wineSearch';
import { BACKEND_URL } from '../lib/wineSearch';
import WineDetailModalWithDrag from '../components/wine/WineDetailModalWithDrag';

// ── Types ──────────────────────────────────────────────────────────────────

interface ChateauSelection {
  rank: string;
  name: string;
  appellation: string;
  lat: number;
  lng: number;
  address: string;
  restauration?: boolean;
  isOption?: boolean;
  note?: string;
}

interface Props {
  onNavigate: (p: Page) => void;
}

// ── Données ───────────────────────────────────────────────────────────────

const SELECTION_SOMMELIER: ChateauSelection[] = [
  {
    rank: 'N°1',
    name: 'Château Marquis de Terme',
    appellation: 'Margaux',
    lat: 45.0392656,
    lng: -0.6774724,
    address: '3 Rte de Rauzan, 33460 Margaux-Cantenac',
    restauration: false,
  },
  {
    rank: 'N°2',
    name: 'Château Branas Grand Poujeaux',
    appellation: 'Moulis-en-Médoc',
    lat: 45.076384,
    lng: -0.742213,
    address: '23 Chem. de la Razé, 33480 Moulis-en-Médoc',
    restauration: true,
    note: 'Déjeuner sur place',
  },
  {
    rank: 'N°3',
    name: 'Château Poujeaux',
    appellation: 'Moulis-en-Médoc',
    lat: 45.0794191,
    lng: -0.7431583,
    address: '450 Av. de la Gironde, 33480 Moulis-en-Médoc',
    restauration: true,
    note: 'Déjeuner sur place',
  },
  {
    rank: 'OPTION',
    name: 'Château Serin',
    appellation: 'Moulis-en-Médoc',
    lat: 45.0814181,
    lng: -0.7520551,
    address: '127 Rte de Médrac, 33480 Moulis-en-Médoc',
    restauration: true,
    isOption: true,
  },
  {
    rank: 'OPTION',
    name: 'Lamothe-Bergeron',
    appellation: 'Cussac-Fort-Médoc',
    lat: 45.1211583,
    lng: -0.725845,
    address: '49 Chem. des Graves, 33460 Cussac-Fort-Médoc',
    restauration: true,
    isOption: true,
  },
  {
    rank: 'N°4',
    name: 'Château Duhart-Milon',
    appellation: 'Pauillac',
    lat: 45.1977976,
    lng: -0.74674,
    address: '1 Rue Pierre Castéja, 33250 Pauillac',
    restauration: false,
  },
  {
    rank: 'N°5',
    name: 'Château Cos Labory',
    appellation: 'Saint-Estèphe',
    lat: 45.2304869,
    lng: -0.776695,
    address: '33180 Saint-Estèphe',
    restauration: true,
  },
  {
    rank: 'OPTION',
    name: 'Château Le Crock',
    appellation: 'Saint-Estèphe',
    lat: 45.2386294,
    lng: -0.7718469,
    address: '1 Rue Paul Amilhat, 33180 Saint-Estèphe',
    restauration: true,
    isOption: true,
  },
  {
    rank: 'N°6',
    name: 'Château Haut-Marbuzet',
    appellation: 'Saint-Estèphe',
    lat: 45.2380243,
    lng: -0.769008,
    address: '7 Rue Mac Carthy, 33180 Saint-Estèphe',
    restauration: false,
  },
  {
    rank: 'N°7',
    name: 'Château Phélan Ségur',
    appellation: 'Saint-Estèphe',
    lat: 45.2614496,
    lng: -0.7690932,
    address: 'Rue des Écoles, 33180 Saint-Estèphe',
    restauration: false,
  },
];

// ── Composant ──────────────────────────────────────────────────────────────

export default function SelectionSommelierPage({ onNavigate }: Props) {
  // Sélection château pour la carte
  const [expandedChateau, setExpandedChateau] = useState<string | null>(null);

  // Vins associés par château (name -> WineResult[])
  const [wineResults, setWineResults] = useState<Record<string, WineResult[]>>({});

  // Chargement vins
  const [loadingWines, setLoadingWines] = useState<Set<string>>(new Set());

  // Modal détail vin
  const [activeModalUrl, setActiveModalUrl] = useState<string | null>(null);

  // Drag & drop
  const [isDragging, setIsDragging] = useState(false);
  const [dragName, setDragName] = useState<string | null>(null);
  const [dragOverVisited, setDragOverVisited] = useState(false);

  // Châteaux visités
  const [visitedChateaux, setVisitedChateaux] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('sommelier-visited');
    if (stored) {
      try {
        return new Set(JSON.parse(stored));
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  // Persister les visites
  useEffect(() => {
    localStorage.setItem('sommelier-visited', JSON.stringify(Array.from(visitedChateaux)));
  }, [visitedChateaux]);

  // Sélection par défaut : premier château
  const selectedChateau = expandedChateau
    ? SELECTION_SOMMELIER.find((c) => c.name === expandedChateau) || SELECTION_SOMMELIER[0]
    : SELECTION_SOMMELIER[0];

  // Carte Google Maps
  const mapSrc = selectedChateau
    ? `https://maps.google.com/maps?q=${selectedChateau.lat},${selectedChateau.lng}&z=15&output=embed&hl=fr`
    : `https://maps.google.com/maps?q=45.1,${-0.73}&z=10&output=embed&hl=fr`;

  // Fetch des vins pour un château (stable, pas de dépendances sur le state)
  const fetchWines = useCallback((name: string) => {
    setLoadingWines((prev) => {
      if (prev.has(name)) return prev; // Déjà en cours
      const next = new Set(prev);
      next.add(name);
      return next;
    });

    fetch(`${BACKEND_URL}/api/search?q=${encodeURIComponent(name)}&limit=5`)
      .then((r) => r.json())
      .then((data) => {
        const results = Array.isArray(data)
          ? data
          : data.results || data.mainResults || [];
        setWineResults((prev) => {
          if (prev[name]) return prev; // Ne pas écraser si déjà là
          return { ...prev, [name]: (results as WineResult[]).slice(0, 3) };
        });
      })
      .catch(() => {
        setWineResults((prev) => ({ ...prev, [name]: [] }));
      })
      .finally(() => {
        setLoadingWines((prev) => {
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
      });
  }, []);

  // Précharger tous les vins au montage → pas de "chargement" visible
  useEffect(() => {
    SELECTION_SOMMELIER.forEach((c) => fetchWines(c.name));
  }, [fetchWines]);

  // Toggle expansion
  const handleToggleExpand = (chateau: ChateauSelection) => {
    setExpandedChateau((prev) => prev === chateau.name ? null : chateau.name);
  };

  return (
    <div className="page-enter" style={{ paddingTop: 12, paddingBottom: 80 }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(160deg, rgba(139,38,53,0.22) 0%, rgba(80,20,30,0.08) 60%, transparent 100%)',
        borderRadius: 18,
        padding: '20px 20px 18px',
        marginBottom: 20,
        border: '1px solid rgba(200,169,81,0.2)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: 'clamp(1.3rem, 4vw, 1.9rem)',
              fontWeight: 800,
              color: 'var(--text-1)',
              margin: '0 0 6px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span>🍷</span>
              <span>La Sélection du Sommelier</span>
            </h1>
            <p style={{
              fontSize: '0.82rem',
              color: 'var(--text-2)',
              margin: 0,
              fontFamily: 'Space Grotesk, sans-serif',
            }}>
              Portes Ouvertes en Médoc 2026 • Circuit personnalisé
            </p>
          </div>

          <a
            href="https://maps.app.goo.gl/C7VzuTMURhDakkSo9"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(200,169,81,0.2), rgba(139,38,53,0.2))',
              border: '1.5px solid rgba(200,169,81,0.5)',
              color: 'var(--amber)',
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none',
              boxShadow: '0 0 16px rgba(200,169,81,0.2)',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            <span>📍</span>
            <span>Voir l'itinéraire complet</span>
          </a>
        </div>
      </div>

      {/* ── Carte Google Maps ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <iframe
          key={mapSrc}
          src={mapSrc}
          width="100%"
          height="300"
          style={{
            border: '1px solid rgba(200,169,81,0.2)',
            borderRadius: 12,
            display: 'block',
          }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          title={selectedChateau ? `Carte de ${selectedChateau.name}` : 'Carte du circuit Médoc'}
        />
        {selectedChateau && (
          <div style={{
            marginTop: 8,
            padding: '8px 14px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            fontSize: '0.78rem',
            color: 'var(--text-2)',
            fontFamily: 'Space Grotesk, sans-serif',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ color: 'var(--cyan)', flexShrink: 0 }}>📍</span>
            <span><strong style={{ color: 'var(--text-1)' }}>{selectedChateau.name}</strong> — {selectedChateau.address}</span>
          </div>
        )}
      </div>

      {/* ── Liste des châteaux ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        {SELECTION_SOMMELIER.map((chateau) => {
          const isExpanded = expandedChateau === chateau.name;
          const hasWines = wineResults[chateau.name] && wineResults[chateau.name].length > 0;
          const isLoading = loadingWines.has(chateau.name);
          const isVisited = visitedChateaux.has(chateau.name);

          return (
            <div
              key={chateau.name}
              draggable
              onDragStart={(ev) => {
                ev.dataTransfer.setData('text/plain', chateau.name);
                ev.dataTransfer.effectAllowed = 'copy';
                setIsDragging(true);
                setDragName(chateau.name);
              }}
              onDragEnd={() => {
                setIsDragging(false);
                setDragName(null);
              }}
              onClick={() => handleToggleExpand(chateau)}
              style={{
                background: isExpanded
                  ? 'rgba(200,169,81,0.08)'
                  : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isExpanded
                  ? 'rgba(200,169,81,0.4)'
                  : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 12,
                padding: '14px 16px',
                cursor: 'pointer',
                marginBottom: 8,
                transition: 'all 0.2s',
              }}
            >
              {/* Ligne principale */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Badge rank */}
                <span style={{
                  background: chateau.isOption
                    ? 'rgba(200,169,81,0.15)'
                    : 'rgba(139,38,53,0.3)',
                  border: `1px solid ${chateau.isOption ? 'rgba(200,169,81,0.4)' : 'rgba(200,169,81,0.3)'}`,
                  borderRadius: 8,
                  padding: '3px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--amber)',
                  whiteSpace: 'nowrap',
                  fontFamily: 'Space Grotesk, sans-serif',
                  flexShrink: 0,
                }}>
                  {chateau.rank}
                </span>

                {/* Nom + appellation */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 600,
                    color: 'var(--text-1)',
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontSize: '0.9rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {chateau.name}
                  </div>
                  <div style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-3)',
                    marginTop: 2,
                    fontFamily: 'Space Grotesk, sans-serif',
                  }}>
                    {chateau.appellation}
                  </div>
                </div>

                {/* Icônes */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  {chateau.restauration && (
                    <span title="Avec restauration" style={{ fontSize: '0.9rem' }}>🍴</span>
                  )}
                  {isVisited && (
                    <span title="Château visité" style={{ fontSize: '0.9rem', color: 'var(--emerald)' }}>✅</span>
                  )}
                  <span style={{ fontSize: '0.7rem', color: 'var(--cyan)' }}>📍</span>
                </div>
              </div>

              {/* Note */}
              {chateau.note && (
                <div style={{
                  marginTop: 8,
                  fontSize: '0.75rem',
                  color: 'var(--cyan)',
                  paddingLeft: 4,
                  fontStyle: 'italic',
                  fontFamily: 'Space Grotesk, sans-serif',
                }}>
                  ℹ️ {chateau.note}
                </div>
              )}

              {/* Contenu expansible : vins */}
              {isExpanded && (
                <div style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: '1px solid rgba(200,169,81,0.2)',
                }}>
                  {hasWines && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {wineResults[chateau.name].map((wine, idx) => (
                        <div
                          key={`${chateau.name}-${idx}`}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                          }}
                        >
                          {wine.vintages.slice(0, 10).map((vintage, vIdx) => {
                            const hasLink = vintage.link && vintage.link.trim().length > 0;
                            return (
                              <div
                                key={`${chateau.name}-vintage-${vIdx}`}
                                onClick={(e) => {
                                  if (hasLink) {
                                    e.stopPropagation();
                                    setActiveModalUrl(vintage.link);
                                  }
                                }}
                                style={{
                                  padding: '6px 8px',
                                  background: hasLink
                                    ? 'rgba(200,169,81,0.12)'
                                    : 'rgba(255,255,255,0.04)',
                                  border: `1px solid ${hasLink
                                    ? 'rgba(200,169,81,0.35)'
                                    : 'rgba(255,255,255,0.1)'}`,
                                  borderRadius: 6,
                                  fontSize: '0.75rem',
                                  color: hasLink ? 'var(--amber)' : 'var(--text-1)',
                                  cursor: hasLink ? 'pointer' : 'default',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={(e) => {
                                  if (hasLink) {
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(200,169,81,0.15)';
                                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(200,169,81,0.5)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (hasLink) {
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(200,169,81,0.1)';
                                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(200,169,81,0.3)';
                                  }
                                }}
                              >
                                <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, minWidth: '35px', color: hasLink ? 'var(--amber)' : 'var(--text-1)' }}>
                                  {vintage.year}
                                </span>
                                <span style={{ minWidth: '42px', letterSpacing: '0px', fontSize: '0.9rem', lineHeight: 1 }}>
                                  <span style={{ color: '#FFD700', textShadow: '0 0 6px rgba(255,215,0,0.7)' }}>
                                    {'★'.repeat(vintage.stars)}
                                  </span>
                                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>
                                    {'★'.repeat(Math.max(0, 3 - vintage.stars))}
                                  </span>
                                </span>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: hasLink ? 'var(--text-1)' : 'var(--text-2)' }}>
                                  {vintage.name || wine.foundName}
                                </span>
                                {hasLink && <span style={{ flexShrink: 0, fontSize: '0.9rem' }}>→</span>}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}

                  {!hasWines && !isLoading && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-2)',
                      fontStyle: 'italic',
                    }}>
                      Aucun vin trouvé pour ce château
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Légende ───────────────────────────────────────────────────── */}
      <div style={{
        padding: '14px 16px',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        marginBottom: 20,
      }}>
        <p style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontWeight: 700,
          fontSize: '0.78rem',
          color: 'var(--text-2)',
          margin: '0 0 8px',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          Légende
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.78rem', color: 'var(--text-2)' }}>
            <span>🍴</span>
            <span>Restauration disponible sur place</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.78rem', color: 'var(--text-2)' }}>
            <span>✅</span>
            <span>Château visité (déposer sur la zone en bas)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.78rem', color: 'var(--text-2)' }}>
            <span style={{
              background: 'rgba(200,169,81,0.15)',
              border: '1px solid rgba(200,169,81,0.4)',
              borderRadius: 6,
              padding: '1px 8px',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--amber)',
              fontFamily: 'Space Grotesk, sans-serif',
            }}>OPTION</span>
            <span>Étape à décider sur place selon le temps</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.78rem', color: 'var(--text-2)' }}>
            <span style={{
              background: 'rgba(139,38,53,0.3)',
              border: '1px solid rgba(200,169,81,0.3)',
              borderRadius: 6,
              padding: '1px 8px',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--amber)',
              fontFamily: 'Space Grotesk, sans-serif',
            }}>N°1</span>
            <span>Étapes prévues du circuit (N°1 → N°7)</span>
          </div>
        </div>
      </div>

      {/* ── Bouton retour ─────────────────────────────────────────────── */}
      <button
        onClick={() => onNavigate('visite')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'var(--text-2)',
          fontFamily: 'Space Grotesk, sans-serif',
          fontWeight: 600,
          fontSize: '0.85rem',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        ← Retour au Mode Visite
      </button>

      {/* ── Overlay drag & drop (zone visitée) ────────────────────────── */}
      {isDragging && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9500,
          background: 'rgba(7,7,15,0.45)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: 72,
          pointerEvents: 'none',
        }}>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverVisited(true);
            }}
            onDragLeave={() => setDragOverVisited(false)}
            onDrop={(e) => {
              e.preventDefault();
              if (dragName) {
                const next = new Set(visitedChateaux);
                next.add(dragName);
                setVisitedChateaux(next);
              }
              setIsDragging(false);
              setDragName(null);
              setDragOverVisited(false);
            }}
            style={{
              pointerEvents: 'all',
              width: 260,
              padding: '20px 30px',
              background: dragOverVisited
                ? 'rgba(16,185,129,0.25)'
                : 'rgba(10,20,20,0.85)',
              border: `2px solid ${dragOverVisited ? 'rgba(16,185,129,0.8)' : 'rgba(16,185,129,0.4)'}`,
              borderRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              backdropFilter: 'blur(12px)',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: '2rem' }}>✅</span>
            <span style={{
              fontSize: '0.85rem',
              color: 'rgba(16,185,129,0.9)',
              fontWeight: 700,
              textAlign: 'center',
              fontFamily: 'Space Grotesk, sans-serif',
            }}>
              Château visité
            </span>
          </div>
        </div>
      )}

      {/* ── Modal détail vin ──────────────────────────────────────────── */}
      {activeModalUrl && (
        <WineDetailModalWithDrag
          url={activeModalUrl}
          onClose={() => setActiveModalUrl(null)}
        />
      )}
    </div>
  );
}
