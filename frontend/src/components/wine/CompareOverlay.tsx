/**
 * CompareOverlay — Fenêtre modale de comparaison côte-à-côte
 *
 * Affiche jusqu'à 3 vins en colonnes avec :
 * - Nombre de millésimes, moyenne d'étoiles, meilleure année, couleurs
 * - Barre visuelle de progression de la note
 * - Bouton pour retirer un vin de la comparaison
 */

import type { WineResult } from '../../lib/wineSearch';

interface Props {
  wines: WineResult[];
  onRemove: (r: WineResult) => void;
  onClose: () => void;
}

export default function CompareOverlay({ wines, onRemove, onClose }: Props) {
  const MAX_STARS = 3;

  const avgStars = (r: WineResult) => {
    const all = r.vintages.map(v => v.stars);
    return all.length ? (all.reduce((a, b) => a + b, 0) / all.length).toFixed(1) : '—';
  };

  const bestYear = (r: WineResult) =>
    r.vintages.filter(v => v.stars === 3).sort((a, b) => b.year - a.year)[0]?.year || '—';

  const colors = (r: WineResult) =>
    [...new Set(r.vintages.map(v => v.color))].join(', ');

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div style={{
        background: 'var(--fond-resultats)', borderRadius: 20,
        maxWidth: 800, width: '100%', maxHeight: '90vh',
        overflow: 'auto', padding: 28,
      }}>
        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <h2 style={{ color: 'var(--bordeaux)', fontFamily: 'Playfair Display, serif' }}>⇄ Comparaison</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1.4rem' }}
          >✕</button>
        </div>

        {/* Colonnes de vins */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${wines.length}, 1fr)`, gap: 16 }}>
          {wines.map((r, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 14, padding: 20, position: 'relative' }}>
              {/* Bouton retirer */}
              <button
                onClick={() => onRemove(r)}
                style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '1rem' }}
              >✕</button>

              {/* Nom du vin */}
              <h3 style={{
                color: 'var(--bordeaux)', fontFamily: 'Playfair Display, serif',
                fontSize: '1rem', marginBottom: 14, paddingRight: 24, lineHeight: 1.3,
              }}>{r.foundName}</h3>

              {/* Tableau de statistiques */}
              <table style={{ width: '100%', fontSize: '0.83rem', borderCollapse: 'collapse', color: '#333' }}>
                <tbody>
                  {[
                    ['Millésimes', r.vintages.length],
                    ['Moyenne ★', avgStars(r)],
                    ['Meilleure année', bestYear(r)],
                    ['Couleurs', colors(r)],
                    ['Note max', MAX_STARS + ' ★'],
                  ].map(([label, val]) => (
                    <tr key={label as string} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '7px 0', color: '#888', width: '50%' }}>{label}</td>
                      <td style={{ padding: '7px 0', fontWeight: 600 }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Barre visuelle de note */}
              <div style={{ marginTop: 14 }}>
                <p style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: 6 }}>Note moyenne</p>
                <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(parseFloat(avgStars(r) as string) / 3) * 100}%`,
                    background: 'linear-gradient(90deg, #8B1A1A, #D4AF37)',
                    borderRadius: 4,
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
