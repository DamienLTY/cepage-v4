/**
 * SelectionSommelierPage — La Sélection du Sommelier
 *
 * Circuit personnalisé pour les Portes Ouvertes en Médoc 2026.
 * Liste curatée de châteaux avec carte interactive Google Maps.
 */

import { useState } from 'react';
import type { Page } from '../types';

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
  onDragStart?: (name: string) => void;
  onDragEnd?: () => void;
}

// ── Données ───────────────────────────────────────────────────────────────

const SELECTION_SOMMELIER: ChateauSelection[] = [
  {
    rank: 'N°1',
    name: 'Château Marquis de Terme',
    appellation: 'Margaux',
    lat: 44.9994,
    lng: -0.6683,
    address: 'Route de Rauzan, 33460 Margaux',
  },
  {
    rank: 'N°2',
    name: 'Château Branas Grand Poujeaux',
    appellation: 'Moulis-en-Médoc',
    lat: 45.0653,
    lng: -0.7611,
    address: '33480 Moulis-en-Médoc',
    restauration: true,
    note: 'Déjeuner prévu avant',
  },
  {
    rank: 'N°3',
    name: 'Château Poujeaux',
    appellation: 'Moulis-en-Médoc',
    lat: 45.0631,
    lng: -0.7596,
    address: '33480 Moulis-en-Médoc',
    restauration: true,
    note: 'Déjeuner prévu avant',
  },
  {
    rank: 'OPTION',
    name: 'Château Serin',
    appellation: 'Moulis-en-Médoc',
    lat: 45.0620,
    lng: -0.7540,
    address: '33480 Moulis-en-Médoc',
    restauration: true,
    isOption: true,
  },
  {
    rank: 'OPTION',
    name: 'Lamothe-Bergeron',
    appellation: 'Cussac-Fort-Médoc',
    lat: 45.1105,
    lng: -0.7218,
    address: 'Cussac-Fort-Médoc, 33460',
    restauration: true,
    isOption: true,
  },
  {
    rank: 'N°4',
    name: 'Château Duhart-Milon',
    appellation: 'Pauillac',
    lat: 45.2011,
    lng: -0.7605,
    address: '33250 Pauillac',
  },
  {
    rank: 'N°5',
    name: 'Château Cos Labory',
    appellation: 'Saint-Estèphe',
    lat: 45.2567,
    lng: -0.7665,
    address: '33180 Saint-Estèphe',
    restauration: true,
  },
  {
    rank: 'OPTION',
    name: 'Château Le Crock',
    appellation: 'Saint-Estèphe',
    lat: 45.2712,
    lng: -0.7648,
    address: '33180 Saint-Estèphe',
    restauration: true,
    isOption: true,
  },
  {
    rank: 'N°6',
    name: 'Château Haut-Marbuzet',
    appellation: 'Saint-Estèphe',
    lat: 45.2620,
    lng: -0.7640,
    address: '33180 Saint-Estèphe',
  },
  {
    rank: 'N°7',
    name: 'Château Phélan Ségur',
    appellation: 'Saint-Estèphe',
    lat: 45.2656,
    lng: -0.7623,
    address: '33180 Saint-Estèphe',
  },
];

// ── Composant ──────────────────────────────────────────────────────────────

export default function SelectionSommelierPage({ onNavigate, onDragStart, onDragEnd }: Props) {
  const [selectedChateau, setSelectedChateau] = useState<ChateauSelection | null>(SELECTION_SOMMELIER[0]);

  const mapSrc = selectedChateau
    ? `https://maps.google.com/maps?q=${selectedChateau.lat},${selectedChateau.lng}&z=15&output=embed&hl=fr`
    : `https://maps.google.com/maps?q=45.1,${-0.73}&z=10&output=embed&hl=fr`;

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
        {SELECTION_SOMMELIER.map(chateau => (
          <div
            key={chateau.name}
            draggable
            onDragStart={(ev) => {
              ev.dataTransfer.setData('text/plain', chateau.name);
              ev.dataTransfer.effectAllowed = 'copy';
              onDragStart?.(chateau.name);
            }}
            onDragEnd={() => onDragEnd?.()}
            onClick={() => setSelectedChateau(chateau)}
            style={{
              background: selectedChateau?.name === chateau.name
                ? 'rgba(200,169,81,0.08)'
                : 'rgba(255,255,255,0.03)',
              border: `1px solid ${selectedChateau?.name === chateau.name
                ? 'rgba(200,169,81,0.4)'
                : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 12,
              padding: '14px 16px',
              cursor: 'pointer',
              marginBottom: 8,
              transition: 'all 0.2s',
            }}
          >
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
          </div>
        ))}
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
    </div>
  );
}
