/**
 * DropZones — Les 4 bacs de catégorie affichés aux coins de l'écran
 *
 * Affiché pendant un drag & drop. Chaque zone représente un bac :
 * - Haut-gauche  : 🍷 Vin Gouté
 * - Bas-gauche   : 🥂 Vin Apprécié
 * - Haut-droite  : 💛 Favoris
 * - Bas-droite   : 🏠 En Cave
 *
 * Rendu via createPortal pour éviter les problèmes de stacking context.
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { WineCategory } from '../../types';

// ── Composant interne : une zone avec animation ───────────────
function DropZoneWithAnimation({
  category: _category, icon, label, color, gradient, position, delay, onDrop: _onDrop, onMouseEnter, onMouseLeave,
}: {
  category: WineCategory;
  icon: string;
  label: string;
  color: string;
  gradient: string;
  position: string;
  delay: number;
  onDrop: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        ...Object.fromEntries(position.split(';').filter(Boolean).map(p => {
          const [k, v] = p.trim().split(':');
          return [k.trim(), v.trim()];
        })),
        width: 110, height: 110, zIndex: 9997,
        borderRadius: isHovered ? 28 : 20,
        background: gradient,
        border: `2px solid ${color}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8, cursor: 'pointer',
        boxShadow: isHovered
          ? `0 0 35px ${color}, 0 12px 40px rgba(0,0,0,0.5)`
          : `0 0 20px ${color}, 0 8px 32px rgba(0,0,0,0.4)`,
        transition: 'all 0.2s ease',
        animation: `dropZonePulse 2s ease-in-out ${delay}s infinite`,
        transform: isHovered ? 'scale(1.12)' : 'scale(1)',
        '--zone-color': color,
      } as React.CSSProperties}
      onMouseEnter={() => { setIsHovered(true); onMouseEnter(); }}
      onMouseLeave={() => { setIsHovered(false); onMouseLeave(); }}
    >
      <span style={{ fontSize: '2.2rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>{icon}</span>
      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fff', textAlign: 'center', textShadow: '0 1px 3px rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.2, padding: '0 8px' }}>
        {label}
      </span>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────
interface Props {
  onDrop: (category: WineCategory) => void;
  visible: boolean;
  onZoneHover?: () => void;
  onZoneLeave?: () => void;
  onZoneEnter?: (category: WineCategory | null) => void;
}

export default function DropZones({ onDrop, visible, onZoneHover, onZoneLeave, onZoneEnter }: Props) {
  if (!visible) return null;

  const zones: { cat: WineCategory; pos: string; icon: string; label: string; color: string; gradient: string }[] = [
    { cat: 'tasted',   pos: 'top: 8px; left: 8px;',    icon: '🍷', label: 'Vin Gouté',    color: '#7B8794', gradient: 'linear-gradient(135deg, rgba(80,90,100,0.85) 0%, rgba(50,55,65,0.9) 100%)' },
    { cat: 'liked',    pos: 'bottom: 8px; left: 8px;',  icon: '🥂', label: 'Vin Apprécié', color: '#27AE60', gradient: 'linear-gradient(135deg, rgba(39,174,96,0.85) 0%, rgba(25,120,65,0.9) 100%)' },
    { cat: 'favorite', pos: 'top: 8px; right: 8px;',    icon: '💛', label: 'Favoris',       color: '#D4AF37', gradient: 'linear-gradient(135deg, rgba(212,175,55,0.85) 0%, rgba(160,130,30,0.9) 100%)' },
    { cat: 'cellar',   pos: 'bottom: 8px; right: 8px;', icon: '🏠', label: 'En Cave',       color: '#8B4513', gradient: 'linear-gradient(135deg, rgba(139,69,19,0.85) 0%, rgba(90,45,10,0.9) 100%)' },
  ];

  return createPortal(
    <React.Fragment>
      {/* Overlay sombre pour mettre le focus sur les bacs */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,8,10,0.4)', zIndex: 9996, animation: 'fadeIn 0.3s ease-out' }} />

      {zones.map((z, idx) => (
        <DropZoneWithAnimation
          key={z.cat}
          category={z.cat}
          icon={z.icon}
          label={z.label}
          color={z.color}
          gradient={z.gradient}
          position={z.pos}
          delay={idx * 0.1}
          onDrop={() => onDrop(z.cat)}
          onMouseEnter={() => {
            if (onZoneEnter) onZoneEnter(z.cat);
            if (onZoneHover) onZoneHover();
          }}
          onMouseLeave={() => {
            if (onZoneEnter) onZoneEnter(null);
            if (onZoneLeave) onZoneLeave();
          }}
        />
      ))}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dropZonePulse {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px var(--zone-color), 0 8px 32px rgba(0,0,0,0.4); }
          50% { box-shadow: 0 0 35px var(--zone-color), 0 12px 40px rgba(0,0,0,0.5); }
        }
      `}</style>
    </React.Fragment>,
    document.body
  );
}
