/**
 * ExposantCard — Carte d'un exposant dans la liste du Mode Visite
 *
 * Affiche le numéro de stand, le nom, la région et le compteur de millésimes.
 * Cliquable pour déplier l'ExposantAccordion avec les vins associés.
 * Se fait scroller automatiquement en haut quand elle s'ouvre.
 */

import { useRef, useEffect } from 'react';
import type { ExposantData } from '../../types';
import ExposantAccordion from './ExposantAccordion';

/** Retourne une couleur hexadécimale selon la région viticole */
function getRegionColor(region: string | null | undefined): string {
  if (!region) return '#7F8C8D';
  const r = region.toLowerCase();
  if (r.includes('bordeaux'))                          return '#722F37';
  if (r.includes('bourgogne') || r.includes('beaujolais')) return '#8B1A5C';
  if (r.includes('rhône') || r.includes('rhone'))     return '#C0392B';
  if (r.includes('loire'))                             return '#27AE60';
  if (r.includes('alsace'))                            return '#2980B9';
  if (r.includes('languedoc') || r.includes('roussillon')) return '#E67E22';
  if (r.includes('provence') || r.includes('corse'))  return '#E91E8C';
  if (r.includes('sud-ouest'))                         return '#8B6914';
  if (r.includes('champagne'))                         return '#D4AF37';
  if (r.includes('savoie') || r.includes('jura'))     return '#27AE60';
  return '#7F8C8D';
}

interface Props {
  exposant: ExposantData;
  /** La carte est-elle dépliée ? */
  expanded: boolean;
  /** Callback pour basculer l'état déplié/replié */
  onToggle: () => void;
  filterFromYear: number;
  filterStars: number | null;
  filterColors: string[];
  isPortesOuvertes?: boolean;
  isVisited?: boolean;
  onToggleVisited?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export default function ExposantCard({ exposant, expanded, onToggle, filterFromYear, filterStars, filterColors, isPortesOuvertes, isVisited, onToggleVisited, onDragStart, onDragEnd }: Props) {
  const totalMillesimes = exposant.wineResults.reduce((s, r) => s + r.vintages.length, 0);
  const totalVins = exposant.wineResults.length;
  const regionColor = getRegionColor(exposant.region);
  const hasWines = totalMillesimes > 0;
  const cardRef = useRef<HTMLDivElement>(null);

  // Scroll automatique vers la carte lors de l'ouverture
  useEffect(() => {
    if (expanded && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const targetY = window.scrollY + rect.top - 68; // 68 = hauteur du header
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  }, [expanded]);

  return (
    <div
      ref={cardRef}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', exposant.stand);
        e.dataTransfer.effectAllowed = 'copy';

        // Ghost de drag lisible — mini-carte stylisée Deep Space
        const ghost = document.createElement('div');
        ghost.style.cssText = [
          'position: fixed',
          'top: -9999px',
          'left: -9999px',
          'display: flex',
          'align-items: center',
          'gap: 10px',
          'padding: 10px 14px',
          'border-radius: 12px',
          'background: linear-gradient(135deg, #1a1a2e, #0f0f1f)',
          'border: 2px solid rgba(16,185,129,0.7)',
          'box-shadow: 0 0 20px rgba(16,185,129,0.35)',
          'color: #f1f5f9',
          'font-family: Space Grotesk, Inter, sans-serif',
          'font-size: 13px',
          'font-weight: 600',
          'white-space: nowrap',
          'pointer-events: none',
          'z-index: 99999',
          'max-width: 260px',
          'overflow: hidden',
        ].join('; ');

        const badge = document.createElement('div');
        badge.style.cssText = [
          'width: 36px',
          'height: 36px',
          'border-radius: 8px',
          'display: flex',
          'flex-direction: column',
          'align-items: center',
          'justify-content: center',
          'background: rgba(16,185,129,0.15)',
          'border: 1px solid rgba(16,185,129,0.4)',
          'flex-shrink: 0',
          'font-size: 11px',
          'font-weight: 800',
          'color: rgba(212,175,55,0.9)',
        ].join('; ');
        badge.textContent = isPortesOuvertes ? '🏰' : exposant.stand;

        const info = document.createElement('div');
        info.style.cssText = 'overflow: hidden; max-width: 180px;';

        const name = document.createElement('div');
        name.style.cssText = [
          'color: rgba(245,245,220,0.95)',
          'font-size: 13px',
          'font-weight: 700',
          'white-space: nowrap',
          'overflow: hidden',
          'text-overflow: ellipsis',
        ].join('; ');
        name.textContent = exposant.name;

        const region = document.createElement('div');
        region.style.cssText = 'color: rgba(245,245,220,0.5); font-size: 10px; margin-top: 2px;';
        region.textContent = exposant.region || '';

        info.appendChild(name);
        if (exposant.region) info.appendChild(region);
        ghost.appendChild(badge);
        ghost.appendChild(info);
        document.body.appendChild(ghost);

        e.dataTransfer.setDragImage(ghost, 0, 18);

        // Nettoyage après un court délai
        setTimeout(() => { if (ghost.parentNode) ghost.parentNode.removeChild(ghost); }, 0);

        onDragStart?.();
      }}
      onDragEnd={() => onDragEnd?.()}
      style={{ marginBottom: 6 }}
    >
      {/* En-tête cliquable */}
      <div
        role={hasWines ? 'button' : undefined}
        tabIndex={hasWines ? 0 : undefined}
        aria-expanded={hasWines ? expanded : undefined}
        onClick={hasWines ? onToggle : undefined}
        onKeyDown={(e) => {
          if (!hasWines) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '12px 16px',
          background: isVisited
            ? (hasWines ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.04)')
            : (hasWines ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.03)'),
          border: `1px solid ${isVisited ? 'rgba(16,185,129,0.3)' : (hasWines ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.06)')}`,
          borderRadius: expanded ? '12px 12px 0 0' : 12,
          cursor: hasWines ? 'pointer' : 'default',
          transition: 'all 0.18s ease',
        }}
        onMouseEnter={e => {
          if (!hasWines) return;
          (e.currentTarget as HTMLDivElement).style.background = 'rgba(212,175,55,0.12)';
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212,175,55,0.35)';
        }}
        onMouseLeave={e => {
          if (!hasWines) return;
          (e.currentTarget as HTMLDivElement).style.background = 'rgba(212,175,55,0.06)';
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212,175,55,0.18)';
        }}
      >
        {/* Badge numéro de stand ou château */}
        <div style={{
          minWidth: 54, height: 54, borderRadius: 10,
          background: hasWines ? `linear-gradient(135deg, ${regionColor}33, ${regionColor}18)` : 'rgba(255,255,255,0.05)',
          border: `2px solid ${hasWines ? regionColor + '55' : 'rgba(255,255,255,0.08)'}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {isPortesOuvertes ? (
            <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>🏰</span>
          ) : (
            <>
              <span style={{ fontSize: '0.6rem', color: hasWines ? regionColor : 'rgba(245,245,220,0.3)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Stand</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: hasWines ? 'var(--champagne)' : 'rgba(245,245,220,0.35)', letterSpacing: '0.02em' }}>{exposant.stand}</span>
            </>
          )}
        </div>

        {/* Bouton Visité */}
        {onToggleVisited && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleVisited(); }}
            title={isVisited ? 'Marquer comme non visité' : 'Marquer comme visité'}
            style={{
              padding: '5px 10px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700,
              background: isVisited ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${isVisited ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.12)'}`,
              color: isVisited ? 'rgba(16,185,129,0.9)' : 'rgba(245,245,220,0.3)',
              cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
            }}
          >
            {isVisited ? '✓ Visité' : '○ Visiter'}
          </button>
        )}

        {/* Infos exposant */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: hasWines ? 'var(--champagne)' : 'rgba(245,245,220,0.45)',
            fontWeight: 600, fontSize: '0.88rem',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            fontFamily: 'Playfair Display, serif',
          }}>
            {exposant.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.68rem', color: hasWines ? regionColor : 'rgba(245,245,220,0.3)',
              background: hasWines ? `${regionColor}18` : 'transparent',
              padding: '1px 6px', borderRadius: 4, fontWeight: 600,
            }}>
              {exposant.region}
            </span>
            {hasWines && (
              <span style={{ fontSize: '0.68rem', color: 'rgba(245,245,220,0.5)' }}>
                {totalVins} vin{totalVins > 1 ? 's' : ''} · {totalMillesimes} millésime{totalMillesimes > 1 ? 's' : ''}
              </span>
            )}
            {!hasWines && exposant.hasDbMatch && (
              <span style={{ fontSize: '0.65rem', color: 'rgba(245,245,220,0.3)', fontStyle: 'italic' }}>Présent en BDD — aucun millésime</span>
            )}
            {!exposant.hasDbMatch && (
              <span style={{ fontSize: '0.65rem', color: 'rgba(245,245,220,0.25)', fontStyle: 'italic' }}>Non répertorié dans notre guide</span>
            )}
          </div>
        </div>

        {/* Flèche rotative */}
        {hasWines && (
          <div style={{
            color: 'rgba(212,175,55,0.5)', fontSize: '1rem', flexShrink: 0,
            transform: expanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.2s ease',
          }}>›</div>
        )}
      </div>

      {/* Accordéon déplié */}
      {expanded && hasWines && (
        <ExposantAccordion exposant={exposant} filterFromYear={filterFromYear} filterStars={filterStars} filterColors={filterColors} />
      )}
    </div>
  );
}
