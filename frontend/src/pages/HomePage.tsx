/**
 * HomePage — Millésime Edition
 *
 * Design system : "Millésime" — luxury editorial wine
 * Fonts : Cormorant Garant (serif titres) + DM Sans (body)
 *
 * Structure :
 * 1. HERO plein écran — titre serif goldShimmer, stats glassmorphism, orbes aurora vin
 * 2. PROCHAINS ÉVÉNEMENTS — cards glassmorphism chaud, badges vin/or
 * 3. MODE VISITE — bannière gradient bordeaux, ping doré
 * 4. RECHERCHE — section secondaire glass, régions par chip
 */

import { useState, useEffect, useRef } from 'react';
import { WINE_EVENTS, isEventPast, type WineEvent } from '../lib/events';
import type { Page } from '../types';

interface Props {
  onSearch: (q: string) => void;
  onRegionSearch: (region: string) => void;
  onNavigate: (p: Page) => void;
  onNavigateToVisite?: (eventId: string) => void;
  setHomeEventModal?: (e: WineEvent | null) => void;
}

/* ── Badge statut temporel ── */
function StatusBadge({ dates, dateEnd }: { dates: string; dateEnd: string }) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const dateMatch = dates.match(/(\d+)\s*-\s*(\d+)\s*(\w+)/);
  let startDate: Date;
  if (dateMatch) {
    const day = parseInt(dateMatch[1]);
    const monthStr = dateMatch[3];
    const months: Record<string, number> = {
      'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
      'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11,
    };
    startDate = new Date(now.getFullYear(), months[monthStr.toLowerCase()] ?? now.getMonth(), day);
  } else { startDate = new Date(dateEnd); }
  const endDate = new Date(dateEnd); endDate.setHours(0,0,0,0); startDate.setHours(0,0,0,0);
  const diffStart = Math.ceil((startDate.getTime() - now.getTime()) / 86400000);
  const diffEnd   = Math.ceil((endDate.getTime()   - now.getTime()) / 86400000);

  let label = ''; let bg = ''; let color = '#fff'; let shadow = '';
  if (diffStart <= 0 && diffEnd >= 0) {
    label = 'EN COURS';
    bg = 'var(--crimson)';
    shadow = '0 2px 12px rgba(145,3,31,0.45)';
  } else if (diffStart === 1) {
    label = 'DEMAIN';
    bg = 'linear-gradient(135deg, var(--amber), var(--amber))';
    color = '#1A0508';
    shadow = '0 2px 10px rgba(255,255,255,0.12)';
  } else if (diffStart <= 7) {
    label = 'BIENTÔT';
    bg = 'rgba(255,255,255,0.06)';
    color = 'var(--amber)';
    shadow = 'none';
  } else {
    label = dates;
    bg = 'rgba(26,7,12,0.7)';
    color = 'var(--amber)';
    shadow = 'none';
  }

  return (
    <span style={{
      background: bg, color, padding: '3px 10px', borderRadius: 20,
      fontSize: '0.6rem', fontWeight: 700, textTransform: label === dates ? 'none' : 'uppercase',
      letterSpacing: label === dates ? '0.02em' : '0.1em',
      flexShrink: 0, backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: label === dates ? '1px solid rgba(255,255,255,0.1)' : label === 'BIENTÔT' ? '1px solid rgba(255,255,255,0.1)' : 'none',
      fontFamily: "'Inter', sans-serif",
      boxShadow: shadow,
    }}>
      {label}
    </span>
  );
}

/* ── Orbe aurora décorative ── */
function AuroraOrb({ top, left, size, colorStart, colorEnd, delay, dur }: {
  top: string; left: string; size: number;
  colorStart: string; colorEnd: string;
  delay: number; dur: number;
}) {
  return (
    <div style={{
      position: 'absolute', top, left,
      width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle at 35% 35%, ${colorStart}, ${colorEnd})`,
      filter: `blur(${Math.floor(size * 0.4)}px)`,
      animation: `auroraBreath ${dur}s ease-in-out ${delay}s infinite`,
      pointerEvents: 'none',
      opacity: 0.55,
    }} />
  );
}

/* ── Compteur animé ── */
function AnimatedCounter({ target, suffix = '' }: { target: string; suffix?: string }) {
  const [display, setDisplay] = useState('0');
  const ref = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const numericPart = target.replace(/[^0-9]/g, '');
    const num = parseInt(numericPart, 10);
    if (isNaN(num)) { setDisplay(target); return; }

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !startedRef.current) {
        startedRef.current = true;
        const duration = 1400;
        const steps = 40;
        const step = duration / steps;
        let current = 0;
        const suffix_char = target.replace(numericPart, '');
        const timer = setInterval(() => {
          current += num / steps;
          if (current >= num) {
            setDisplay(target);
            clearInterval(timer);
          } else {
            const rounded = Math.floor(current);
            setDisplay(rounded >= 1000 ? `${Math.floor(rounded/1000)}k${suffix_char}` : `${rounded}${suffix_char}`);
          }
        }, step);
      }
    }, { threshold: 0.3 });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <div ref={ref}>{display}{suffix}</div>;
}

export default function HomePage({ onSearch, onRegionSearch, onNavigate, onNavigateToVisite, setHomeEventModal }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const recentSearches = JSON.parse(localStorage.getItem('cepage_history') || '[]') as string[];

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const upcomingEvents = WINE_EVENTS
    .filter(e => !isEventPast(e))
    .sort((a, b) => a.dateEnd.localeCompare(b.dateEnd))
    .slice(0, 6);

  const visiteEvents = WINE_EVENTS
    .filter(e => !!e.visiteEventId && !isEventPast(e))
    .sort((a, b) => a.dateEnd.localeCompare(b.dateEnd));
  const visiteCount = visiteEvents.length;
  const nextVisiteEvent = visiteEvents[0];
  const nextVisiteId = nextVisiteEvent?.visiteEventId || 'vi-bordeaux-2026';

  const [visitePicker, setVisitePicker] = useState(false);
  const [selectedVisiteId, setSelectedVisiteId] = useState<string | null>(null);

  const catLabels: Record<string, string> = {
    'portes-ouvertes': 'Portes Ouvertes',
    'salon': 'Salon',
    'festival': 'Festival',
    'professionnel': 'Pro',
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) onSearch(searchQuery.trim());
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ══════════════════════════════════════════════════
          1. HERO PLEIN ÉCRAN — Millésime
         ══════════════════════════════════════════════════ */}
      <div className="hero-futuriste page-enter" style={{ position: 'relative', overflow: 'hidden' }}>

        {/* Orbes aurora vin — 4 max, animation auroraBreath lente */}
        <AuroraOrb
          top="5%"  left="3%"
          size={260} delay={0}   dur={10}
          colorStart="rgba(145,3,31,0.5)"
          colorEnd="rgba(26,7,12,0)"
        />
        <AuroraOrb
          top="55%" left="72%"
          size={320} delay={3}   dur={12}
          colorStart="rgba(192,38,63,0.35)"
          colorEnd="rgba(15,4,7,0)"
        />
        <AuroraOrb
          top="30%" left="85%"
          size={140} delay={1.5} dur={9}
          colorStart="rgba(255,255,255,0.1)"
          colorEnd="rgba(15,4,7,0)"
        />
        <AuroraOrb
          top="75%" left="15%"
          size={180} delay={4}   dur={11}
          colorStart="rgba(107,3,22,0.4)"
          colorEnd="rgba(15,4,7,0)"
        />

        {/* Filet doré décoratif en haut */}
        <div style={{
          position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
          background: 'linear-gradient(90deg, transparent, var(--amber), transparent)',
          opacity: 0.3,
        }} />

        {/* Titre principal — Cormorant Garant serif */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', paddingTop: 8 }}>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.68rem', fontWeight: 400, letterSpacing: '0.22em',
            color: 'var(--amber)', textTransform: 'uppercase',
            marginBottom: 16, opacity: 0.85,
          }}>
            Guide officiel · Édition 2026
          </p>

          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(2.6rem, 7vw, 5rem)',
            fontWeight: 700,
            fontStyle: 'normal',
            color: 'var(--text-1)',
            lineHeight: 1.1,
            margin: '0 0 8px',
            letterSpacing: '-0.01em',
          }}>
            Le Guide des Vins
          </h1>

          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(1.6rem, 4vw, 2.8rem)',
            fontWeight: 700,
            fontStyle: 'italic',
            color: 'var(--amber)',
            letterSpacing: '0.04em',
            margin: '0 0 24px',
          }}>
            Édition 2026
          </h2>

          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 'clamp(0.9rem, 1.8vw, 1.05rem)',
            fontWeight: 300,
            color: 'var(--text-2)',
            maxWidth: 560,
            margin: '0 auto 36px',
            lineHeight: 1.7,
          }}>
            Salons des Vignerons Indépendants, dégustations, portes ouvertes —
            explorez le vignoble français avec votre guide numérique.
          </p>

          {/* CTA buttons — style luxury */}
          <div style={{
            display: 'flex', gap: 14, justifyContent: 'center',
            flexWrap: 'wrap', marginBottom: 52,
          }}>
            <button
              onClick={() => { setSelectedVisiteId(nextVisiteId); setVisitePicker(true); }}
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontStyle: 'normal',
                fontSize: '1rem',
                fontWeight: 600,
                padding: '13px 32px',
                background: 'linear-gradient(135deg, var(--crimson) 0%, var(--crimson) 100%)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 4,
                color: 'var(--text-1)',
                cursor: 'pointer',
                letterSpacing: '0.03em',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 20px rgba(145,3,31,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                const b = e.currentTarget;
                b.style.boxShadow = '0 6px 28px rgba(145,3,31,0.5), inset 0 1px 0 rgba(255,255,255,0.12)';
                b.style.transform = 'translateY(-2px)';
                b.style.borderColor = 'rgba(255,255,255,0.18)';
              }}
              onMouseLeave={e => {
                const b = e.currentTarget;
                b.style.boxShadow = '0 4px 20px rgba(145,3,31,0.35), inset 0 1px 0 rgba(255,255,255,0.08)';
                b.style.transform = 'translateY(0)';
                b.style.borderColor = 'rgba(255,255,255,0.12)';
              }}
            >
              Mode Visite
            </button>

            <button
              onClick={() => onNavigate('events')}
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontStyle: 'normal',
                fontSize: '1rem',
                fontWeight: 600,
                padding: '12px 30px',
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 4,
                color: 'var(--amber)',
                cursor: 'pointer',
                letterSpacing: '0.03em',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
              onMouseEnter={e => {
                const b = e.currentTarget;
                b.style.background = 'rgba(145,3,31,0.12)';
                b.style.borderColor = 'rgba(255,255,255,0.15)';
                b.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                const b = e.currentTarget;
                b.style.background = 'var(--glass-bg)';
                b.style.borderColor = 'var(--glass-border)';
                b.style.transform = 'translateY(0)';
              }}
            >
              Voir les Événements
            </button>
          </div>

          {/* Stats bar — glassmorphism chaud */}
          <div style={{
            display: 'flex', gap: 12, justifyContent: 'center',
            flexWrap: 'wrap', maxWidth: 700, margin: '0 auto',
          }}>
            {[
              { target: '189k+', label: 'Vins référencés' },
              { target: `${visiteCount}`, label: 'Salons Guidés' },
              { target: '310+', label: 'Exposants / Salon' },
              { target: '16', label: 'Régions' },
            ].map((stat, i) => (
              <div
                key={i}
                style={{
                  flex: '1 1 130px',
                  padding: '18px 16px',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 8,
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* filet or en haut de la card */}
                <div style={{
                  position: 'absolute', top: 0, left: '20%', right: '20%', height: 1,
                  background: 'linear-gradient(90deg, transparent, var(--amber), transparent)',
                  opacity: 0.5,
                }} />
                <div style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                  fontWeight: 700,
                  color: 'var(--amber)',
                  lineHeight: 1,
                  marginBottom: 6,
                }}>
                  <AnimatedCounter target={stat.target} />
                </div>
                <div style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.72rem',
                  fontWeight: 300,
                  color: 'var(--text-3)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          2. PROCHAINS ÉVÉNEMENTS — Millésime cards
         ══════════════════════════════════════════════════ */}
      {upcomingEvents.length > 0 && (
        <div style={{ padding: '0 0 40px' }}>
          {/* Divider doré */}
          <div style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, var(--border), transparent)',
            margin: '0 0 36px',
          }} />

          <div style={{
            marginBottom: 24,
            display: 'flex', alignItems: 'flex-end',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          }}>
            <div>
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.65rem', fontWeight: 400,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                color: 'var(--amber)', marginBottom: 8, opacity: 0.8,
              }}>
                Agenda viticole
              </p>
              <h2 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)',
                fontWeight: 700,
                fontStyle: 'normal',
                color: 'var(--text-1)',
                margin: 0, lineHeight: 1.2,
              }}>
                Prochains rendez-vous
              </h2>
            </div>

            <button
              onClick={() => onNavigate('events')}
              style={{
                fontFamily: "'Inter', sans-serif",
                padding: '9px 20px',
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 4,
                color: 'var(--amber)',
                fontSize: '0.82rem', fontWeight: 400,
                cursor: 'pointer', transition: 'all 0.25s',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                const b = e.currentTarget;
                b.style.borderColor = 'rgba(255,255,255,0.15)';
                b.style.color = 'var(--amber)';
                b.style.transform = 'translateY(-1px)';
                b.style.background = 'rgba(145,3,31,0.1)';
              }}
              onMouseLeave={e => {
                const b = e.currentTarget;
                b.style.borderColor = 'var(--glass-border)';
                b.style.color = 'var(--amber)';
                b.style.transform = 'translateY(0)';
                b.style.background = 'var(--glass-bg)';
              }}
            >
              Tous les événements →
            </button>
          </div>

          <div className="events-scroll-container">
            {upcomingEvents.map((event, idx) => (
              <div
                key={event.id}
                style={{
                  animationDelay: `${idx * 0.08}s`,
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 8,
                  overflow: 'hidden',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  transition: 'all 0.28s ease',
                  cursor: 'default',
                  flexShrink: 0,
                  width: 'clamp(260px, 28vw, 320px)',
                  display: 'flex', flexDirection: 'column',
                }}
                onMouseEnter={e => {
                  const c = e.currentTarget;
                  c.style.borderColor = 'rgba(255,255,255,0.12)';
                  c.style.transform = 'translateY(-4px) scale(1.02)';
                  c.style.boxShadow = '0 12px 40px rgba(145,3,31,0.25), 0 0 0 1px rgba(255,255,255,0.04)';
                }}
                onMouseLeave={e => {
                  const c = e.currentTarget;
                  c.style.borderColor = 'var(--glass-border)';
                  c.style.transform = 'translateY(0) scale(1)';
                  c.style.boxShadow = 'none';
                }}
              >
                {/* Image */}
                <div style={{ position: 'relative', overflow: 'hidden' }}>
                  <img
                    src={event.image} alt={event.title} loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80'; }}
                    style={{
                      width: '100%', height: 'auto', aspectRatio: '16/9',
                      objectFit: 'cover', display: 'block',
                      transition: 'transform 0.5s ease',
                    }}
                    onMouseEnter={e => { (e.target as HTMLImageElement).style.transform = 'scale(1.06)'; }}
                    onMouseLeave={e => { (e.target as HTMLImageElement).style.transform = 'scale(1)'; }}
                  />
                  {/* Overlay gradient */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(15,4,7,0.85) 0%, transparent 55%)',
                  }} />
                  {/* Badge statut */}
                  <div style={{ position: 'absolute', top: 10, right: 10 }}>
                    <StatusBadge dates={event.dates} dateEnd={event.dateEnd} />
                  </div>
                  {/* Badge guidé */}
                  {event.visiteEventId && (
                    <div style={{
                      position: 'absolute', top: 10, left: 10,
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: 'var(--amber)',
                      padding: '2px 9px', borderRadius: 4,
                      fontSize: '0.58rem', fontWeight: 600,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      fontFamily: "'Inter', sans-serif",
                      backdropFilter: 'blur(6px)',
                    }}>
                      Guidé
                    </div>
                  )}
                </div>

                {/* Corps */}
                <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {/* Catégorie */}
                  <span style={{
                    display: 'inline-block', marginBottom: 8,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.6rem', fontWeight: 500,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: 'var(--text-3)',
                  }}>
                    {catLabels[event.category]}
                  </span>

                  {/* Titre event */}
                  <h3 style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    fontStyle: 'normal',
                    color: 'var(--text-1)',
                    marginBottom: 8, lineHeight: 1.35,
                    flex: 1,
                  }}>
                    {event.title}
                  </h3>

                  {/* Dates */}
                  <p style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.78rem', fontWeight: 400,
                    color: 'var(--amber)', marginBottom: 2,
                    letterSpacing: '0.02em',
                  }}>
                    {event.dates}
                  </p>

                  {/* Lieu */}
                  <p style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.74rem', color: 'var(--text-3)', marginBottom: 14,
                  }}>
                    {event.location.split(',')[0]}
                  </p>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <button
                      onClick={() => setHomeEventModal?.(event)}
                      style={{
                        flex: 1,
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.78rem', fontWeight: 400,
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        borderRadius: 4, color: 'var(--text-2)',
                        cursor: 'pointer', transition: 'all 0.2s',
                        letterSpacing: '0.03em',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)';
                        e.currentTarget.style.color = 'var(--text-1)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)';
                        e.currentTarget.style.color = 'var(--text-2)';
                      }}
                    >
                      Infos
                    </button>
                    <button
                      disabled={!event.visiteEventId}
                      onClick={() => event.visiteEventId && (onNavigateToVisite ? onNavigateToVisite(event.visiteEventId) : onNavigate('visite'))}
                      title={event.visiteEventId ? 'Mode Visite disponible' : 'Bientôt disponible'}
                      style={{
                        flex: 1,
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.78rem', fontWeight: 500,
                        padding: '8px 12px',
                        background: event.visiteEventId ? 'rgba(145,3,31,0.18)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${event.visiteEventId ? 'rgba(145,3,31,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        borderRadius: 4,
                        color: event.visiteEventId ? 'var(--text-2)' : 'var(--text-3)',
                        cursor: event.visiteEventId ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s',
                        letterSpacing: '0.03em',
                        opacity: event.visiteEventId ? 1 : 0.5,
                      }}
                      onMouseEnter={e => {
                        if (!event.visiteEventId) return;
                        e.currentTarget.style.background = 'rgba(145,3,31,0.3)';
                        e.currentTarget.style.borderColor = 'rgba(145,3,31,0.6)';
                        e.currentTarget.style.color = 'var(--text-1)';
                      }}
                      onMouseLeave={e => {
                        if (!event.visiteEventId) return;
                        e.currentTarget.style.background = 'rgba(145,3,31,0.18)';
                        e.currentTarget.style.borderColor = 'rgba(145,3,31,0.4)';
                        e.currentTarget.style.color = 'var(--text-2)';
                      }}
                    >
                      {event.visiteEventId ? 'Visite' : 'Bientôt'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          3. MODE VISITE — Bannière bordeaux luxe
         ══════════════════════════════════════════════════ */}
      <div style={{
        margin: '0 0 40px',
        padding: '28px 32px',
        background: 'linear-gradient(135deg, rgba(145,3,31,0.14) 0%, rgba(107,3,22,0.18) 50%, rgba(201,168,76,0.08) 100%)',
        border: '1px solid var(--glass-border)',
        borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Filet or haut */}
        <div style={{
          position: 'absolute', top: 0, left: '5%', right: '5%', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
        }} />

        {/* Ping doré */}
        <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '1.5px solid rgba(255,255,255,0.2)',
            animation: 'pingRipple 2.5s ease-out infinite',
          }} />
          <div style={{
            position: 'absolute', inset: 8, borderRadius: '50%',
            border: '1.5px solid rgba(255,255,255,0.1)',
            animation: 'pingRipple 2.5s ease-out 0.8s infinite',
          }} />
          <div style={{
            position: 'absolute', inset: 18, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.12), rgba(145,3,31,0.2))',
            border: '1px solid rgba(255,255,255,0.15)',
          }} />
        </div>

        {/* Texte */}
        <div style={{ flex: 1, minWidth: 'min(200px, 100%)' }}>
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.62rem', fontWeight: 400,
            color: 'var(--amber)', textTransform: 'uppercase',
            letterSpacing: '0.18em', marginBottom: 8, opacity: 0.85,
          }}>
            Nouveauté exclusive
          </div>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
            fontWeight: 700, fontStyle: 'normal',
            color: 'var(--text-1)', marginBottom: 8, lineHeight: 1.25,
          }}>
            Guide numérique pour les salons
          </h2>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.84rem', fontWeight: 300,
            color: 'var(--text-2)', lineHeight: 1.6,
          }}>
            Naviguez exposant par exposant, filtrez par région, notation et couleur.
          </p>
        </div>

        {/* Boutons */}
        <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
          <button
            onClick={() => { setSelectedVisiteId(nextVisiteId); setVisitePicker(true); }}
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontStyle: 'normal', fontSize: '0.98rem', fontWeight: 600,
              padding: '11px 26px',
              background: 'linear-gradient(135deg, var(--crimson) 0%, var(--crimson) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4, color: 'var(--text-1)',
              cursor: 'pointer', transition: 'all 0.25s',
              boxShadow: '0 4px 16px rgba(145,3,31,0.3)',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(145,3,31,0.45)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(145,3,31,0.3)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Démarrer
          </button>
          <button
            onClick={() => onNavigate('events')}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.84rem', fontWeight: 400,
              padding: '10px 20px',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: 4, color: 'var(--amber)',
              cursor: 'pointer', transition: 'all 0.25s',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              letterSpacing: '0.03em',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.color = 'var(--amber)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--glass-border)';
              e.currentTarget.style.color = 'var(--amber)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Voir les salons →
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          4. RECHERCHE — Section secondaire
         ══════════════════════════════════════════════════ */}
      <div className="search-secondary-section" style={{ textAlign: 'center' }}>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.65rem', fontWeight: 400,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'var(--amber)', marginBottom: 10, opacity: 0.8,
        }}>
          Base de données
        </p>
        <h2 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)',
          fontWeight: 700, fontStyle: 'normal',
          color: 'var(--text-1)', margin: '0 0 8px',
        }}>
          Chercher un vin
        </h2>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.84rem', fontWeight: 300,
          color: 'var(--text-3)', marginBottom: 28,
        }}>
          189 000+ vins référencés · 30 ans de sélection viticole
        </p>

        {/* Barre de recherche */}
        <form onSubmit={handleSearch} style={{ maxWidth: 500, margin: '0 auto 32px', position: 'relative' }}>
          <div style={{
            position: 'relative',
            background: 'var(--glass-bg)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            display: 'flex', alignItems: 'center',
            transition: 'border-color 0.2s',
          }}
            onFocusCapture={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
            onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            <input
              type="text"
              placeholder="Domaine, château, appellation..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoComplete="off"
              style={{
                flex: 1,
                background: 'none', border: 'none', outline: 'none',
                padding: '13px 16px',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.92rem', fontWeight: 300,
                color: 'var(--text-1)',
              }}
            />
            <button
              type="submit"
              aria-label="Rechercher"
              style={{
                background: 'none', border: 'none',
                padding: '0 16px',
                color: 'var(--amber)', cursor: 'pointer',
                display: 'flex', alignItems: 'center',
                transition: 'color 0.2s',
                flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--amber)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--amber)'; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
            </button>
          </div>
        </form>

        {/* Recherches récentes */}
        {recentSearches.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.62rem', color: 'var(--text-3)',
              marginBottom: 12, textTransform: 'uppercase',
              letterSpacing: '0.15em',
            }}>
              Récemment consultés
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {recentSearches.slice(0, 8).map((s, i) => (
                <button
                  key={`${s}-${i}`}
                  onClick={() => onSearch(s)}
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.82rem', fontWeight: 400,
                    padding: '6px 16px',
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 20, color: 'var(--text-2)',
                    cursor: 'pointer', transition: 'all 0.2s',
                    letterSpacing: '0.02em',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.color = 'var(--amber)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.color = 'var(--text-2)';
                    e.currentTarget.style.background = 'var(--glass-bg)';
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Explorer par région */}
        <div>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.62rem', color: 'var(--text-3)',
            marginBottom: 16, textTransform: 'uppercase',
            letterSpacing: '0.15em',
          }}>
            Explorer par région
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, justifyContent: 'center', width: '100%' }}>
            {[
              { key: 'Bordeaux',    emoji: '🏰' },
              { key: 'Bourgogne',   emoji: '🍇' },
              { key: 'Champagne',   emoji: '🥂' },
              { key: 'Alsace',      emoji: '🌹' },
              { key: 'Rhone',       emoji: '🌊', name: 'Rhône' },
              { key: 'Loire',       emoji: '🌻' },
              { key: 'Languedoc',   emoji: '☀️' },
              { key: 'Provence',    emoji: '🌿' },
              { key: 'Beaujolais',  emoji: '🍷' },
              { key: 'Roussillon',  emoji: '🏔️' },
              { key: 'Sud-Ouest',   emoji: '🌾' },
              { key: 'Jura',        emoji: '🌲' },
              { key: 'Savoie',      emoji: '🏔️' },
              { key: 'Corse',       emoji: '🏝️' },
            ].map(r => (
              <button
                key={r.key}
                onClick={() => onRegionSearch(r.key)}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.84rem', fontWeight: 400,
                  padding: '8px 18px', gap: 8,
                  display: 'inline-flex', alignItems: 'center',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 20,
                  color: 'var(--text-2)',
                  cursor: 'pointer', transition: 'all 0.25s',
                  letterSpacing: '0.02em',
                }}
                onMouseEnter={e => {
                  const b = e.currentTarget;
                  b.style.transform = 'translateY(-3px)';
                  b.style.borderColor = 'rgba(255,255,255,0.12)';
                  b.style.color = 'var(--amber)';
                  b.style.background = 'rgba(145,3,31,0.1)';
                  b.style.boxShadow = '0 6px 20px rgba(145,3,31,0.2)';
                }}
                onMouseLeave={e => {
                  const b = e.currentTarget;
                  b.style.transform = 'translateY(0)';
                  b.style.borderColor = 'var(--border)';
                  b.style.color = 'var(--text-2)';
                  b.style.background = 'var(--glass-bg)';
                  b.style.boxShadow = 'none';
                }}
              >
                <span>{r.emoji}</span>
                <span>{'name' in r ? (r as typeof r & { name?: string }).name : r.key}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Modal sélection salon Mode Visite ── */}
      {visitePicker && (
        <div
          onClick={() => setVisitePicker(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(4,1,3,0.85)', backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg, #1A070C 0%, #0F0407 100%)',
              border: '1px solid var(--glass-border)',
              borderRadius: 8,
              padding: '32px 28px 24px',
              maxWidth: 440, width: '100%',
              boxShadow: '0 28px 70px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.02)',
              animation: 'modalZoomIn 0.22s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Filet or haut modal */}
            <div style={{
              position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            }} />

            <div style={{ marginBottom: 22 }}>
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.62rem', fontWeight: 400, color: 'var(--amber)',
                textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 8, opacity: 0.85,
              }}>
                Mode Visite
              </p>
              <h3 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '1.3rem', fontWeight: 700, fontStyle: 'normal',
                color: 'var(--text-1)', margin: '0 0 8px',
              }}>
                Choisir un salon
              </h3>
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.82rem', fontWeight: 300, color: 'var(--text-3)',
              }}>
                Sélectionnez le salon pour lequel vous souhaitez démarrer le mode Visite.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
              {visiteEvents.length === 0 && (
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  color: 'var(--text-3)', fontSize: '0.85rem',
                  textAlign: 'center', padding: '12px 0',
                }}>
                  Aucun salon avec Mode Visite disponible pour le moment.
                </p>
              )}
              {visiteEvents.map(e => {
                const isSelected = selectedVisiteId === e.visiteEventId;
                return (
                  <button
                    key={e.visiteEventId}
                    onClick={() => setSelectedVisiteId(e.visiteEventId!)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      gap: 4, padding: '13px 16px', borderRadius: 4, cursor: 'pointer',
                      border: `1px solid ${isSelected ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)'}`,
                      background: isSelected ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.02)',
                      textAlign: 'left', width: '100%',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontWeight: 700, fontStyle: 'normal',
                        fontSize: '0.96rem',
                        color: isSelected ? 'var(--amber)' : 'var(--text-1)',
                      }}>
                        {e.title}
                      </span>
                      {isSelected && (
                        <span style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '0.58rem', fontWeight: 600,
                          color: 'var(--amber)',
                          background: 'rgba(201,168,76,0.12)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 20, padding: '2px 10px',
                          flexShrink: 0, letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                        }}>
                          Sélectionné
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.74rem', fontWeight: 300,
                      color: 'var(--text-3)',
                    }}>
                      {e.dates} · {e.location}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setVisitePicker(false)}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  padding: '9px 20px', borderRadius: 4, cursor: 'pointer',
                  fontSize: '0.84rem', fontWeight: 400,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  color: 'var(--text-3)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.color = 'var(--text-2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = 'var(--text-3)';
                }}
              >
                Annuler
              </button>
              <button
                disabled={!selectedVisiteId}
                onClick={() => {
                  if (!selectedVisiteId) return;
                  setVisitePicker(false);
                  if (onNavigateToVisite) onNavigateToVisite(selectedVisiteId);
                  else onNavigate('visite');
                }}
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontStyle: 'normal',
                  padding: '9px 24px', borderRadius: 4,
                  cursor: selectedVisiteId ? 'pointer' : 'not-allowed',
                  fontSize: '0.95rem', fontWeight: 600,
                  border: `1px solid ${selectedVisiteId ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)'}`,
                  background: selectedVisiteId
                    ? 'linear-gradient(135deg, var(--crimson) 0%, var(--crimson) 100%)'
                    : 'rgba(145,3,31,0.05)',
                  color: selectedVisiteId ? 'var(--text-1)' : 'var(--text-3)',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedVisiteId ? '0 4px 16px rgba(145,3,31,0.3)' : 'none',
                  opacity: selectedVisiteId ? 1 : 0.5,
                }}
                onMouseEnter={e => {
                  if (!selectedVisiteId) return;
                  e.currentTarget.style.boxShadow = '0 6px 22px rgba(145,3,31,0.45)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  if (!selectedVisiteId) return;
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(145,3,31,0.3)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Démarrer ce salon
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
