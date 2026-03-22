/**
 * VisiteTutorial — Tutoriel contextuel sans fond sombre
 *
 * - Popup positionnée près de la zone décrite (se déplace à chaque étape)
 * - Aucun fond assombri — l'UI reste visible derrière
 * - Adapté au mode courant (Découverte vs Parcours Guidé)
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  onClose: () => void;
  mode?: 'decouverte' | 'guide' | null;
}

interface Step {
  emoji: string;
  title: string;
  content: string;
  /** Position CSS fixed du popup */
  pos: React.CSSProperties;
  /** Flèche indicatrice */
  arrow?: 'up' | 'down' | 'left' | 'right';
  /** Sélecteur CSS de l'élément à mettre en valeur (spotlight) */
  target?: string;
}

// ── Étapes Mode Découverte ──────────────────────────────────────────────────

const STEPS_DECOUVERTE: Step[] = [
  {
    emoji: '🗺️',
    title: 'Mode Découverte',
    content: 'Explorez librement tous les exposants. Utilisez la barre de recherche et les filtres pour trouver les châteaux qui vous intéressent.',
    pos: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
  },
  {
    emoji: '🔍',
    title: 'Recherche & Filtres',
    content: 'Cherchez par nom d\'exposant. Filtrez par couleur (Rouge, Blanc, Rosé), étoiles Hachette ou région viticole. Les filtres se cumulent.',
    pos: { top: '220px', left: '50%', transform: 'translateX(-50%)' },
    arrow: 'up',
    target: 'input[placeholder*="exposant"]',
  },
  {
    emoji: '🍷',
    title: 'Voir les vins',
    content: 'Cliquez sur une carte dorée pour déplier ses vins et millésimes Hachette. Tapez sur un millésime pour ouvrir la fiche complète.',
    pos: { bottom: '200px', left: '50%', transform: 'translateX(-50%)' },
    arrow: 'down',
    target: '.exposant-card',
  },
  {
    emoji: '✅',
    title: 'Marquer comme visité',
    content: 'Cliquez sur "+ Visiter" pour enregistrer votre passage chez un exposant. Vous pouvez aussi glisser la carte vers le bac vert qui apparaît.',
    pos: { bottom: '100px', right: '16px' },
    arrow: 'down',
    target: '.exposant-card',
  },
];

// ── Étapes Mode Parcours Guidé ──────────────────────────────────────────────

const STEPS_GUIDE: Step[] = [
  {
    emoji: '✨',
    title: 'Parcours Guidé',
    content: 'L\'algorithme classe automatiquement les exposants par leurs meilleures notes Hachette — les 3★ récents en priorité.',
    pos: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
  },
  {
    emoji: '🎨',
    title: 'Choisir les couleurs',
    content: 'Cliquez sur Rouge, Rosé, Blanc ou Effervescent pour filtrer. La liste se met à jour instantanément selon vos préférences.',
    pos: { top: '230px', left: '50%', transform: 'translateX(-50%)' },
    arrow: 'up',
    target: '.guided-tour-color-filters',
  },
  {
    emoji: '🏆',
    title: 'Classement & Explorer',
    content: 'Les exposants sont triés par étoiles et récence. Utilisez "Explorer" pour une sélection aléatoire parmi les meilleurs. Cliquez sur une carte pour ses millésimes.',
    pos: { bottom: '200px', left: '50%', transform: 'translateX(-50%)' },
    arrow: 'down',
    target: '.exposant-card',
  },
  {
    emoji: '✅',
    title: 'Marquer comme visité',
    content: 'Cliquez sur "+ Visiter" sur une carte pour noter votre passage. La carte devient verte. Votre progression est sauvegardée automatiquement.',
    pos: { bottom: '100px', right: '16px' },
    arrow: 'down',
    target: '.exposant-card',
  },
];

// ── Étapes génériques (mode non encore sélectionné) ────────────────────────

const STEPS_GENERIC: Step[] = [
  {
    emoji: '🚶',
    title: 'Bienvenue en Mode Visite',
    content: 'Retrouvez tous les exposants et consultez leurs vins référencés dans le Guide des Vins. Choisissez un mode de visite pour commencer.',
    pos: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
  },
  {
    emoji: '🗺️',
    title: 'Mode Découverte',
    content: 'Explorez librement avec recherche, filtres couleur/étoiles, et consultation des millésimes stand par stand.',
    pos: { top: '50%', left: '20px' },
    arrow: 'right',
  },
  {
    emoji: '✨',
    title: 'Parcours Guidé',
    content: 'L\'algorithme Hachette classe les meilleurs exposants selon vos couleurs préférées. Idéal pour optimiser votre temps au salon.',
    pos: { top: '50%', right: '20px', transform: 'translateY(-50%)' },
    arrow: 'left',
  },
];

// ── Composant ──────────────────────────────────────────────────────────────

export default function VisiteTutorial({ onClose, mode }: Props) {
  const steps =
    mode === 'decouverte' ? STEPS_DECOUVERTE :
    mode === 'guide'      ? STEPS_GUIDE :
                            STEPS_GENERIC;

  const [step, setStep] = useState(0);
  const current = steps[Math.min(step, steps.length - 1)];
  const isLast = step === steps.length - 1;

  // Applique / retire la classe spotlight sur l'élément cible de l'étape courante
  useEffect(() => {
    const selector = current.target;
    if (!selector) return;
    const el = document.querySelector(selector);
    if (!el) return;
    el.classList.add('tutorial-spotlight');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return () => {
      el.classList.remove('tutorial-spotlight');
    };
  }, [current]);

  const handleClose = () => {
    localStorage.setItem('visite-tutorial-done', '1');
    onClose();
  };

  const handleNext = () => {
    if (isLast) handleClose();
    else setStep(s => s + 1);
  };

  // Couleur d'accent selon le mode
  const accent =
    mode === 'guide' ? 'rgba(99,102,241,0.9)' :
    mode === 'decouverte' ? 'rgba(212,175,55,0.85)' :
    'rgba(212,175,55,0.85)';
  const accentBorder =
    mode === 'guide' ? 'rgba(99,102,241,0.5)' :
    'rgba(212,175,55,0.4)';
  const accentBg =
    mode === 'guide' ? 'rgba(99,102,241,0.12)' :
    'rgba(212,175,55,0.12)';

  // Flèche indicatrice
  const ArrowIndicator = ({ dir }: { dir: 'up' | 'down' | 'left' | 'right' }) => {
    const size = 10;
    const positions: Record<string, React.CSSProperties> = {
      up:    { top: -size, left: '50%', marginLeft: -size, borderWidth: `0 ${size}px ${size}px ${size}px`, borderColor: `transparent transparent ${accentBorder} transparent` },
      down:  { bottom: -size, left: '50%', marginLeft: -size, borderWidth: `${size}px ${size}px 0 ${size}px`, borderColor: `${accentBorder} transparent transparent transparent` },
      left:  { left: -size, top: '50%', marginTop: -size, borderWidth: `${size}px ${size}px ${size}px 0`, borderColor: `transparent ${accentBorder} transparent transparent` },
      right: { right: -size, top: '50%', marginTop: -size, borderWidth: `${size}px 0 ${size}px ${size}px`, borderColor: `transparent transparent transparent ${accentBorder}` },
    };
    return (
      <div style={{
        position: 'absolute',
        width: 0, height: 0,
        borderStyle: 'solid',
        ...positions[dir],
      }} />
    );
  };

  return createPortal(
    <>
      {/* Popup tutoriel */}
      <div style={{
        position: 'fixed',
        ...current.pos,
        zIndex: 2500,
        width: 'min(300px, calc(100vw - 32px))',
        animation: 'modalZoomIn 0.22s ease-out',
      }}>
      {/* Flèche indicatrice */}
      {current.arrow && <ArrowIndicator dir={current.arrow} />}

      {/* Carte popup */}
      <div style={{
        background: 'linear-gradient(160deg, rgba(14,6,10,0.97) 0%, rgba(8,4,6,0.97) 100%)',
        border: `1.5px solid ${accentBorder}`,
        borderRadius: 16,
        boxShadow: `0 20px 60px rgba(0,0,0,0.85), 0 0 30px ${accentBg}`,
        overflow: 'hidden',
        backdropFilter: 'blur(24px)',
      }}>
        {/* Barre de progression */}
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
          <div style={{
            height: '100%',
            width: `${((step + 1) / steps.length) * 100}%`,
            background: `linear-gradient(90deg, ${accent}, ${accentBorder})`,
            transition: 'width 0.3s ease',
          }} />
        </div>

        <div style={{ padding: '16px 16px 14px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: accentBg,
                border: `1px solid ${accentBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem',
              }}>{current.emoji}</div>
              <div>
                <div style={{ fontSize: '0.55rem', color: 'rgba(212,175,55,0.45)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 1 }}>
                  {step + 1} / {steps.length}
                </div>
                <h3 style={{ color: 'var(--champagne)', fontSize: '0.88rem', fontWeight: 700, margin: 0, fontFamily: 'Playfair Display, serif' }}>
                  {current.title}
                </h3>
              </div>
            </div>
            <button
              onClick={handleClose}
              style={{
                background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%',
                width: 28, height: 28, cursor: 'pointer', color: 'rgba(245,245,220,0.4)',
                fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginLeft: 6,
              }}
            >×</button>
          </div>

          {/* Texte */}
          <p style={{ color: 'rgba(245,245,220,0.72)', fontSize: '0.8rem', lineHeight: 1.55, margin: '0 0 12px' }}>
            {current.content}
          </p>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Points */}
            <div style={{ display: 'flex', gap: 4, flex: 1 }}>
              {steps.map((_, i) => (
                <div key={i} onClick={() => setStep(i)} style={{
                  width: i === step ? 16 : 5, height: 5, borderRadius: 3,
                  background: i === step ? accent : 'rgba(255,255,255,0.1)',
                  transition: 'all 0.2s ease', cursor: 'pointer',
                }} />
              ))}
            </div>

            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} style={{
                padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(245,245,220,0.45)', fontSize: '0.75rem',
              }}>←</button>
            )}
            <button onClick={handleNext} style={{
              padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700,
              background: isLast
                ? 'linear-gradient(135deg, rgba(212,175,55,0.85), rgba(160,120,20,0.8))'
                : mode === 'guide'
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.8), rgba(80,85,200,0.7))'
                  : 'linear-gradient(135deg, rgba(212,175,55,0.7), rgba(160,120,20,0.6))',
              border: 'none',
              color: isLast ? '#1a0a0e' : (mode === 'guide' ? '#e8e9ff' : '#1a0a0e'),
              fontSize: '0.78rem',
              boxShadow: '0 3px 12px rgba(0,0,0,0.3)',
            }}>
              {isLast ? '✓ C\'est parti !' : 'Suivant →'}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>,
    document.body
  );
}
