/**
 * EventsPage — Calendrier des événements viticoles
 *
 * Affiche :
 * - Toggle À venir / Passés
 * - Grille de cartes (non-cliquables) avec boutons Info + Mode Visite
 * - Filtres par catégorie + barre de recherche
 * - Modal de détail
 */

import { useState } from 'react';
import { WINE_EVENTS, isEventPast, type WineEvent } from '../lib/events';
import type { Page } from '../types';

interface Props {
  onNavigate: (p: Page) => void;
  onNavigateToVisite?: (eventId: string) => void;
}

export default function EventsPage({ onNavigate, onNavigateToVisite }: Props) {
  const [filter, setFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<WineEvent | null>(null);
  const [eventSearch, setEventSearch] = useState('');
  const [showPast, setShowPast] = useState(false);

  const categories = [
    { key: 'all', label: 'Tous' },
    { key: 'portes-ouvertes', label: 'Portes Ouvertes' },
    { key: 'salon', label: 'Salons' },
    { key: 'festival', label: 'Festivals' },
    { key: 'professionnel', label: 'Professionnels' },
  ];

  const catLabels: Record<string, string> = {
    'portes-ouvertes': 'Portes Ouvertes',
    'salon': 'Salon',
    'festival': 'Festival',
    'professionnel': 'Pro',
  };

  // Filtrage par catégorie + recherche textuelle + passés/à venir
  let filtered = (filter === 'all' ? [...WINE_EVENTS] : WINE_EVENTS.filter(e => e.category === filter))
    .filter(e => (showPast ? isEventPast(e) : !isEventPast(e)));

  if (eventSearch.trim()) {
    const q = eventSearch.toLowerCase();
    filtered = filtered.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.location.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q)
    );
  }

  // Tri chronologique
  filtered.sort((a, b) => {
    if (!showPast) return a.dateEnd.localeCompare(b.dateEnd);
    return b.dateEnd.localeCompare(a.dateEnd);  // Passés : plus récent en premier
  });

  const upcomingCount = WINE_EVENTS.filter(e => !isEventPast(e)).length;
  const pastCount = WINE_EVENTS.filter(e => isEventPast(e)).length;

  return (
    <>
      <div className="events-page page-enter" style={{ paddingBottom: '3rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 className="events-title" style={{
            fontSize: '3.5rem',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontStyle: 'normal',
            color: 'var(--text-1)',
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em',
          }}>
            Événements Viticoles
          </h2>
          <p style={{
            fontSize: '0.95rem',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 300,
            color: 'var(--text-2)',
            letterSpacing: '0.02em',
          }}>
            Salons, portes ouvertes, festivals — les rendez-vous du vin
          </p>
        </div>

        {/* Toggle À venir / Passés */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            borderBottom: `1px solid rgba(255,255,255,0.08)`,
            paddingBottom: '1rem',
          }}>
            <button className={`events-toggle-btn${!showPast ? ' active' : ''}`}
              style={{
                background: !showPast ? 'var(--crimson)' : 'transparent',
                border: !showPast ? 'none' : `1px solid rgba(255,255,255,0.08)`,
                color: !showPast ? 'var(--text-1)' : 'var(--text-2)',
                padding: '0.75rem 1.5rem',
                fontSize: '0.9rem',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onClick={() => setShowPast(false)}
            >
              📅 À venir ({upcomingCount})
            </button>
            <button className={`events-toggle-btn${showPast ? ' active' : ''}`}
              style={{
                background: showPast ? 'var(--crimson)' : 'transparent',
                border: showPast ? 'none' : `1px solid rgba(255,255,255,0.08)`,
                color: showPast ? 'var(--text-1)' : 'var(--text-2)',
                padding: '0.75rem 1.5rem',
                fontSize: '0.9rem',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onClick={() => setShowPast(true)}
            >
              🕐 Passés ({pastCount})
            </button>
          </div>
        </div>

        {/* Barre de recherche */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'var(--glass-bg)',
            border: `1px solid var(--border)`,
            borderRadius: '8px',
            padding: '0 1rem',
            backdropFilter: 'blur(16px)',
            transition: 'all 0.3s ease',
          }}>
            <input
              className="events-search-input"
              type="text"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                padding: '0.75rem 0',
                fontSize: '0.95rem',
                fontFamily: "'Inter', sans-serif",
                color: 'var(--text-1)',
                outline: 'none',
              }}
              placeholder="Rechercher un événement..."
              value={eventSearch}
              onChange={e => setEventSearch(e.target.value)}
            />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
        </div>

        {/* Filtres catégories */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '2.5rem',
        }}>
          {categories.map(c => (
            <button
              key={c.key}
              className={`filter-btn${filter === c.key ? ' active' : ''}`}
              style={{
                background: filter === c.key ? 'var(--crimson)' : 'var(--glass-bg)',
                border: `1px solid ${filter === c.key ? 'var(--crimson)' : 'rgba(255,255,255,0.08)'}`,
                color: filter === c.key ? 'var(--text-1)' : 'var(--text-2)',
                padding: '0.625rem 1.25rem',
                fontSize: '0.85rem',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backdropFilter: filter === c.key ? 'none' : 'blur(12px)',
              }}
              onClick={() => setFilter(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Grille d'événements */}
        {filtered.length === 0 ? (
          <div className="no-results" style={{
            padding: '4rem 1.25rem',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '4rem',
              marginBottom: '1rem',
              opacity: 0.6,
            }}>
              {showPast ? '🕐' : '📅'}
            </div>
            <p style={{
              fontSize: '0.95rem',
              fontFamily: "'Inter', sans-serif",
              color: 'var(--text-2)',
            }}>
              {showPast ? 'Aucun événement passé trouvé' : 'Aucun événement à venir pour cette sélection'}
            </p>
          </div>
        ) : (
          <div className="events-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem',
          }}>
            {filtered.map(event => (
              <div
                key={event.id}
                className="event-card-glass"
                style={{
                  background: 'var(--glass-bg)',
                  border: `1px solid var(--glass-border)`,
                  borderRadius: '12px',
                  overflow: 'hidden',
                  backdropFilter: 'blur(16px)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--amber)';
                  (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.01)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--glass-border)';
                  (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
                }}
              >
                <div style={{ position: 'relative', paddingBottom: '66.67%', overflow: 'hidden' }}>
                  <img
                    src={event.image} alt={event.title}
                    style={{
                      position: 'absolute',
                      top: 0, left: 0,
                      width: '100%', height: '100%',
                      objectFit: 'cover',
                    }}
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80'; }}
                  />
                  {showPast && (
                    <div style={{
                      position: 'absolute', top: '0.5rem', right: '0.5rem',
                      background: 'rgba(15, 4, 7, 0.9)',
                      color: 'var(--amber)',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}>
                      Passé
                    </div>
                  )}
                  {!showPast && (
                    <div style={{
                      position: 'absolute', top: '0.5rem', left: '0.5rem',
                      background: 'var(--crimson)',
                      color: 'var(--text-1)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      boxShadow: '0 0 12px rgba(145, 3, 31, 0.5)',
                    }}>
                      EN COURS
                    </div>
                  )}
                </div>
                <div style={{
                  padding: '1.25rem',
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                  }}>
                    <span style={{
                      background: 'var(--glass-bg)',
                      border: `1px solid rgba(255,255,255,0.08)`,
                      color: 'var(--text-2)',
                      fontSize: '0.7rem',
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 600,
                      padding: '0.35rem 0.75rem',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      backdropFilter: 'blur(8px)',
                    }}>
                      {catLabels[event.category]}
                    </span>
                  </div>
                  <h3 style={{
                    fontSize: '1.35rem',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 600,
                    color: 'var(--text-1)',
                    marginBottom: '0.75rem',
                    lineHeight: 1.3,
                  }}>
                    {event.title}
                  </h3>
                  <p style={{
                    fontSize: '0.9rem',
                    fontFamily: "'Inter', sans-serif",
                    color: 'var(--amber)',
                    fontWeight: 400,
                    marginBottom: '0.5rem',
                  }}>
                    📅 {event.dates}
                  </p>
                  <p style={{
                    fontSize: '0.9rem',
                    fontFamily: "'Inter', sans-serif",
                    color: 'var(--text-2)',
                    marginBottom: '1.25rem',
                  }}>
                    📍 {event.location}
                  </p>

                  {/* Boutons d'action */}
                  <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                  }}>
                    <button
                      className="event-action-btn info"
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: `1px solid rgba(255,255,255,0.08)`,
                        color: 'var(--text-1)',
                        padding: '0.65rem 1rem',
                        fontSize: '0.85rem',
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 500,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'var(--crimson)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--crimson)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
                      }}
                      onClick={() => setSelectedEvent(event)}
                    >
                      ℹ️ Informations
                    </button>
                    <button
                      className="event-action-btn visite"
                      style={{
                        flex: 1,
                        background: event.visiteEventId ? 'var(--crimson)' : 'rgba(139, 92, 246, 0.15)',
                        border: event.visiteEventId ? 'none' : `1px solid rgba(255,255,255,0.08)`,
                        color: event.visiteEventId ? 'var(--text-1)' : 'var(--text-3)',
                        padding: '0.65rem 1rem',
                        fontSize: '0.85rem',
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 500,
                        borderRadius: '6px',
                        cursor: event.visiteEventId ? 'pointer' : 'not-allowed',
                        transition: 'all 0.3s ease',
                        opacity: event.visiteEventId ? 1 : 0.6,
                      }}
                      disabled={!event.visiteEventId}
                      onMouseEnter={(e) => {
                        if (event.visiteEventId) {
                          (e.currentTarget as HTMLButtonElement).style.background = 'var(--crimson)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (event.visiteEventId) {
                          (e.currentTarget as HTMLButtonElement).style.background = 'var(--crimson)';
                        }
                      }}
                      onClick={() => event.visiteEventId && (onNavigateToVisite ? onNavigateToVisite(event.visiteEventId) : onNavigate('visite'))}
                      title={event.visiteEventId ? 'Accéder au Mode Visite' : 'Mode Visite non disponible'}
                    >
                      🗺️ {event.visiteEventId ? 'Visite' : 'Bientôt'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal détail — hors du div page-enter (évite le bug transform/fixed) */}
      {selectedEvent && (
        <div
          className="event-modal-overlay"
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 4, 7, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="event-modal"
            style={{
              background: 'rgba(22,13,24,0.98)',
              border: `1px solid var(--glass-border)`,
              borderRadius: '12px',
              maxWidth: '600px',
              maxHeight: '85vh',
              overflowY: 'auto',
              position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              className="event-modal-close"
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(15, 4, 7, 0.9)',
                border: `1px solid rgba(255,255,255,0.08)`,
                color: 'var(--text-1)',
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                fontSize: '1.25rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                zIndex: 10000,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--crimson)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--crimson)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(15, 4, 7, 0.9)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
              }}
              onClick={() => setSelectedEvent(null)}
            >
              ✕
            </button>
            <img
              src={selectedEvent.image} alt={selectedEvent.title}
              style={{
                width: '100%',
                height: '300px',
                objectFit: 'cover',
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
              }}
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80'; }}
            />
            <div style={{
              padding: '2rem',
            }}>
              <span style={{
                display: 'inline-block',
                background: 'var(--glass-bg)',
                border: `1px solid rgba(255,255,255,0.08)`,
                color: 'var(--text-2)',
                fontSize: '0.7rem',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                padding: '0.4rem 0.9rem',
                borderRadius: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '1rem',
                backdropFilter: 'blur(8px)',
              }}>
                {catLabels[selectedEvent.category]}
              </span>
              <h3 style={{
                fontSize: '2rem',
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontStyle: 'normal',
                color: 'var(--text-1)',
                marginBottom: '1rem',
              }}>
                {selectedEvent.title}
              </h3>
              <div style={{
                display: 'flex',
                gap: '1.5rem',
                marginBottom: '1.5rem',
                paddingBottom: '1.5rem',
                borderBottom: `1px solid rgba(255,255,255,0.08)`,
              }}>
                <span style={{
                  fontSize: '0.9rem',
                  fontFamily: "'Inter', sans-serif",
                  color: 'var(--amber)',
                  fontWeight: 500,
                }}>
                  📅 {selectedEvent.dates}
                </span>
                <span style={{
                  fontSize: '0.9rem',
                  fontFamily: "'Inter', sans-serif",
                  color: 'var(--text-2)',
                  fontWeight: 500,
                }}>
                  📍 {selectedEvent.location}
                </span>
              </div>
              <p style={{
                fontSize: '0.95rem',
                fontFamily: "'Inter', sans-serif",
                lineHeight: 1.7,
                color: 'var(--text-2)',
                marginBottom: '1.5rem',
              }}>
                {selectedEvent.details.fullDescription}
              </p>

              {selectedEvent.details.schedule && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{
                    fontSize: '1rem',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 600,
                    color: 'var(--amber)',
                    marginBottom: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Programme
                  </h4>
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                  }}>
                    {selectedEvent.details.schedule.map((s, i) => (
                      <li key={i} style={{
                        fontSize: '0.9rem',
                        fontFamily: "'Inter', sans-serif",
                        color: 'var(--text-2)',
                        marginBottom: '0.5rem',
                        paddingLeft: '1.5rem',
                        position: 'relative',
                      }}>
                        <span style={{
                          position: 'absolute',
                          left: 0,
                          color: 'var(--amber)',
                        }}>
                          •
                        </span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedEvent.details.highlights && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{
                    fontSize: '1rem',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 600,
                    color: 'var(--amber)',
                    marginBottom: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Points forts
                  </h4>
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                  }}>
                    {selectedEvent.details.highlights.map((h, i) => (
                      <li key={i} style={{
                        fontSize: '0.9rem',
                        fontFamily: "'Inter', sans-serif",
                        color: 'var(--text-2)',
                        marginBottom: '0.5rem',
                        paddingLeft: '1.5rem',
                        position: 'relative',
                      }}>
                        <span style={{
                          position: 'absolute',
                          left: 0,
                          color: 'var(--amber)',
                        }}>
                          •
                        </span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedEvent.details.practicalInfo && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{
                    fontSize: '1rem',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 600,
                    color: 'var(--amber)',
                    marginBottom: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Infos pratiques
                  </h4>
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                  }}>
                    {selectedEvent.details.practicalInfo.map((p, i) => (
                      <li key={i} style={{
                        fontSize: '0.9rem',
                        fontFamily: "'Inter', sans-serif",
                        color: 'var(--text-2)',
                        marginBottom: '0.5rem',
                        paddingLeft: '1.5rem',
                        position: 'relative',
                      }}>
                        <span style={{
                          position: 'absolute',
                          left: 0,
                          color: 'var(--amber)',
                        }}>
                          •
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Bouton Mode Visite dans la modal */}
              {selectedEvent.visiteEventId && (
                <button
                  style={{
                    width: '100%',
                    marginBottom: '1rem',
                    padding: '0.875rem',
                    background: 'var(--crimson)',
                    border: 'none',
                    color: 'var(--text-1)',
                    fontSize: '0.95rem',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--crimson)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--crimson)';
                  }}
                  onClick={() => { setSelectedEvent(null); if (selectedEvent.visiteEventId && onNavigateToVisite) onNavigateToVisite(selectedEvent.visiteEventId); else onNavigate('visite'); }}
                >
                  🗺️ Démarrer le Mode Visite
                </button>
              )}

              <a
                href={selectedEvent.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.9rem',
                  fontFamily: "'Inter', sans-serif",
                  color: 'var(--amber)',
                  textDecoration: 'none',
                  borderBottom: `1px solid var(--amber)`,
                  paddingBottom: '0.25rem',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--amber)';
                  (e.currentTarget as HTMLAnchorElement).style.borderBottomColor = 'var(--amber)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--amber)';
                  (e.currentTarget as HTMLAnchorElement).style.borderBottomColor = 'var(--amber)';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                </svg>
                Source officielle
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
