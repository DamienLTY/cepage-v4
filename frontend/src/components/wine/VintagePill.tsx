/**
 * VintagePill — Pastille de millésime cliquable
 *
 * Affiche une année + des étoiles, avec support de :
 * - couleur (rouge/rosé/blanc) et effervescent
 * - surbrillance OCR (millésime scanné)
 * - override d'étoiles (depuis les données de détail)
 * - lien vers la fiche Hachette OU callback onDetailClick (modal drag)
 */

import type { WineVintage } from '../../lib/wineSearch';
import Stars from './Stars';

interface Props {
  v: WineVintage;
  /** Si fourni, ouvre la modal de détail au lieu d'ouvrir un lien externe */
  onDetailClick?: (url: string) => void;
  /** Override du nombre d'étoiles (récupéré depuis l'API détail) */
  starOverride?: number;
  /** Si true, ce millésime correspond exactement à celui scanné par OCR */
  highlightYear?: boolean;
}

export default function VintagePill({ v, onDetailClick, starOverride, highlightYear }: Props) {
  const colorClass = v.color === 'Rouge' ? 'rouge' : v.color === 'Rosé' ? 'rose' : 'blanc';
  const isEff = v.isEffervescent;
  const displayStars = starOverride !== undefined ? starOverride : v.stars;

  // Style de surbrillance animée pour le millésime OCR
  const highlightStyle = highlightYear ? {
    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)',
    color: '#000',
    padding: '4px 10px',
    borderRadius: 8,
    fontWeight: 700,
    boxShadow: '0 0 15px rgba(255, 215, 0, 0.8), 0 0 30px rgba(255, 165, 0, 0.5)',
    animation: 'glow-pulse 1.5s ease-in-out infinite',
    border: '2px solid #FFD700',
  } : {};

  const pill = (
    <div className={`vintage-pill ${colorClass} ${isEff ? 'effervescent' : ''} ${highlightYear ? 'highlight-vintage' : ''}`}>
      <span className="vintage-year" style={highlightStyle}>{v.year}</span>
      <Stars count={displayStars} />
      {/* Bulles dékoratives pour les vins effervescents */}
      {isEff && (
        <>
          <span className="eff-bubble" />
          <span className="eff-bubble" />
          <span className="eff-bubble" />
          <span className="eff-bubble" />
          <span className="eff-bubble" />
        </>
      )}
    </div>
  );

  // Comportement selon la disponibilité d'un lien
  if (v.link && onDetailClick) {
    return (
      <button
        onClick={() => onDetailClick(v.link!)}
        title="Voir les détails"
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-block' }}
      >
        {pill}
      </button>
    );
  }

  if (v.link) {
    return (
      <a href={v.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
        {pill}
      </a>
    );
  }

  return pill;
}
