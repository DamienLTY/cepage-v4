/**
 * ResultCard — Carte de résultat vin avec millésimes, favoris et comparaison
 *
 * Affiche :
 * - Nom du producteur + appellations
 * - Millésimes groupés par couleur (rouge/rosé/blanc, effervescent)
 * - Bouton favori, bouton comparaison, lien producteur
 * - Surbrillance du terme de recherche (highlight)
 * - Surbrillance du millésime scanné par OCR (highlightYear)
 */

import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../../lib/wineSearch';
import type { WineResult, WineVintage } from '../../lib/wineSearch';
import type { WineCategory, WineDetailData } from '../../types';
import { isFavorite, toggleFavorite } from '../../hooks/useFavorites';
import VintagePill from './VintagePill';
import WineDetailModalWithDrag from './WineDetailModalWithDrag';

interface Props {
  result: WineResult;
  /** Callback pour lancer une nouvelle recherche (suggestions "autres vins") */
  onSimilarClick: (name: string) => void;
  /** Callback pour la comparaison — si fourni, affiche le bouton comparer */
  onCompare?: (r: WineResult) => void;
  /** Ce vin est-il actuellement dans la liste de comparaison ? */
  inCompare?: boolean;
  /** Terme à surligner dans le nom du vin */
  highlight?: string;
  /** Millésime détecté par OCR à mettre en valeur */
  ocrVintage?: number;
  /** Nom du vin scanné (pour identifier la correspondance exacte OCR) */
  ocrWineName?: string;
}

export default function ResultCard({
  result, onSimilarClick,
  highlight, ocrVintage, ocrWineName,
}: Props) {
  const [favored, setFavored] = useState(() => isFavorite(result));
  const [detailUrl, setDetailUrl] = useState<string | null>(null);
  // Overrides d'étoiles récupérés depuis l'API détail (par URL millésime)
  const [starOverrides, setStarOverrides] = useState<Record<string, number>>({});
  // Message de succès après ajout à une catégorie
  const [addedWine, setAddedWine] = useState<{ category: WineCategory; wineName: string; year: number } | null>(null);
  const [loadingProducerUrl, setLoadingProducerUrl] = useState(false);

  // Masquer le message de succès après 3 secondes
  useEffect(() => {
    if (addedWine) {
      const timer = setTimeout(() => setAddedWine(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [addedWine]);

  // ── Surlignage du terme de recherche ─────────────────────
  const highlightText = (text: string, term: string): React.ReactNode => {
    if (!term || !text) return text;
    const normalize = (s: string) =>
      s.toLowerCase().replace(/[âàá]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u');
    const idx = normalize(text).indexOf(normalize(term));
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: 'rgba(255,255,255,0.12)', color: 'var(--amber)', padding: '0 2px', borderRadius: 2 }}>
          {text.slice(idx, idx + term.length)}
        </mark>
        {text.slice(idx + term.length)}
      </>
    );
  };

  // Ce vin correspond-il exactement au vin scanné ?
  const isExactWineMatch = (): boolean => {
    if (!ocrWineName) return false;
    const norm = (s: string) =>
      s.toLowerCase().replace(/[âàá]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u').replace(/[^a-z0-9]/g, '');
    return norm(result.foundName).includes(norm(ocrWineName)) || norm(ocrWineName).includes(norm(result.foundName));
  };

  // Mettre à jour les étoiles depuis la modal de détail
  const handleDetailLoaded = (_url: string, detail: WineDetailData) => {
    if (detail.stars && detail.stars > 0) {
      setStarOverrides(prev => ({ ...prev, [_url]: detail.stars! }));
    }
  };

  // Ouvrir la page producteur sur Hachette
  const handleMoreInfoClick = async () => {
    const redVintage = result.vintages.find(v => v.color === 'Rouge');
    const firstVintageLink = redVintage?.link || result.vintages[0]?.link;
    if (!firstVintageLink) return;

    setLoadingProducerUrl(true);
    try {
      const resp = await fetch(`${BACKEND_URL}/api/wine/detail?url=${encodeURIComponent(firstVintageLink)}`);
      const data = await resp.json();
      if (data.ok && data.producer_url) {
        window.open(data.producer_url, '_blank');
      } else {
        const searchName = encodeURIComponent(result.producerName || result.foundName);
        window.open(`https://www.hachette-vins.com/producteurs/page-1/list/?search=${searchName}`, '_blank');
      }
    } catch {
      const searchName = encodeURIComponent(result.producerName || result.foundName);
      window.open(`https://www.hachette-vins.com/producteurs/page-1/list/?search=${searchName}`, '_blank');
    }
    setLoadingProducerUrl(false);
  };

  // ── Groupage des millésimes par couleur ──────────────────
  const byColor: Record<string, WineVintage[]> = {};
  for (const v of result.vintages) {
    const base = v.color || 'Autre';
    const key = v.isEffervescent ? `${base} effervescent` : base;
    if (!byColor[key]) byColor[key] = [];
    byColor[key].push(v);
  }
  for (const key of Object.keys(byColor)) byColor[key].sort((a, b) => b.year - a.year);

  const colorOrder = ['Rouge', 'Rouge effervescent', 'Rosé', 'Rosé effervescent', 'Blanc', 'Blanc effervescent', 'Autre'];
  const totalVintages = result.vintages.length;
  const appellations = [...new Set(result.vintages.map(v => v.type).filter(Boolean))];
  const otherNames = result.vintages
    .map(v => v.name)
    .filter((n, i, a) => a.indexOf(n) === i && n !== result.foundName);
  const isRegionResult = result.passUsed === 'région';

  return (
    <div className="results-frame results-enter">
      {/* En-tête : nom + boutons d'action */}
      <div className="result-header">
        <div>
          <h2 className="wine-name" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '1.4rem', color: 'var(--text-1)', margin: '0 0 4px 0' }}>{highlightText(result.foundName, highlight || '')}</h2>
          {result.producerName && result.producerName !== result.foundName && (
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-2)', fontFamily: "'Inter', sans-serif", fontWeight: 400, letterSpacing: '0.02em' }}>
              {result.producerName}
            </p>
          )}
          {appellations.length > 0 && (
            <p className="wine-appellation">
              {appellations.slice(0, 3).join(' · ')} — {totalVintages} millésime{totalVintages > 1 ? 's' : ''}
              {isRegionResult && <span style={{ marginLeft: 8, color: 'var(--text-3)', fontSize: '0.8rem' }}>• Résultat région</span>}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {/* Bouton favoris */}
          <button
            onClick={() => { const nowFav = toggleFavorite(result); setFavored(nowFav); }}
            title={favored ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            aria-label={favored ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            style={{
              background: favored ? `rgba(192,38,63,0.15)` : 'rgba(255,255,255,0.07)',
              border: `1px solid ${favored ? 'rgba(192,38,63,0.5)' : 'var(--border)'}`,
              borderRadius: 10, padding: '7px 12px', cursor: 'pointer',
              color: favored ? 'var(--wine-bright)' : 'var(--text-3)',
              fontSize: '1.2rem', lineHeight: 1, transition: 'all 0.2s',
            }}
          >{favored ? '♥' : '♡'}</button>

          {/* Lien producteur */}
          <button
            onClick={handleMoreInfoClick}
            disabled={loadingProducerUrl}
            className="more-info-link"
            style={{ cursor: loadingProducerUrl ? 'wait' : 'pointer', opacity: loadingProducerUrl ? 0.7 : 1 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
            </svg>
            {loadingProducerUrl ? 'Chargement...' : "Plus d'infos"}
          </button>
        </div>
      </div>

      {/* Millésimes groupés par couleur */}
      {colorOrder.map(color => {
        const vins = byColor[color];
        if (!vins || vins.length === 0) return null;
        const baseColor = color.replace(' effervescent', '');
        const isEff = color.endsWith(' effervescent');
        const cls = baseColor === 'Rouge' ? 'rouge' : baseColor === 'Rosé' ? 'rose' : 'blanc';
        const emoji = baseColor === 'Rouge' ? (isEff ? '🫧' : '🔴') : baseColor === 'Rosé' ? (isEff ? '🫧' : '🌸') : (isEff ? '🫧' : '🟡');
        const labelStr = isEff ? `${baseColor} pétillant` : `${baseColor} tranquille`;
        return (
          <div key={color} className="vintage-group">
            <div className={`vintage-group-title ${cls}`} style={isEff ? { opacity: 0.85 } : undefined}>
              <span>{emoji}</span>
              {labelStr} — {vins.length} millésime{vins.length > 1 ? 's' : ''}
            </div>
            <div className="vintages-grid">
              {vins.map((v, i) => (
                <VintagePill
                  key={`${v.year}-${v.color}-${i}`}
                  v={v}
                  onDetailClick={setDetailUrl}
                  starOverride={v.link ? starOverrides[v.link] : undefined}
                  highlightYear={isExactWineMatch() && ocrVintage !== undefined && v.year === ocrVintage}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Autres vins du producteur */}
      {otherNames.length > 0 && (
        <div className="similar-section">
          <div className="similar-title" style={{ fontFamily: "'Space Grotesk', sans-serif", fontStyle: 'normal', color: 'var(--text-2)' }}>Autres vins du producteur</div>
          <div className="similar-list">
            {otherNames.slice(0, 8).map(name => (
              <button key={name} className="similar-chip" onClick={() => onSimilarClick(name)} style={{ color: 'var(--text-2)', transition: 'all 0.2s' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--amber)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)'; }}>{name}</button>
            ))}
          </div>
        </div>
      )}

      {/* Message de succès après ajout à un bac */}
      {addedWine && (
        <div role="status" style={{ marginTop: 10, padding: '8px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--amber)' }}>
          ✓ {addedWine.wineName} {addedWine.year} ajouté
        </div>
      )}

      {/* Modal de détail avec drag */}
      {detailUrl && (
        <WineDetailModalWithDrag
          url={detailUrl}
          onClose={() => setDetailUrl(null)}
          onDetailLoaded={handleDetailLoaded}
          onWineAdded={(category, wineName, year) => setAddedWine({ category, wineName, year })}
        />
      )}
    </div>
  );
}
