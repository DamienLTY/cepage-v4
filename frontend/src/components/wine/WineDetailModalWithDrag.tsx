/**
 * WineDetailModalWithDrag — Modal de détail vin avec drag & drop vers les bacs
 *
 * Fonctionnement :
 * - Affiche les détails d'un vin (image, étoiles, garde, température…)
 * - La carte est draggable (Pointer Events API) vers les 4 bacs de catégorie
 * - setPointerCapture garantit la réception de pointermove/pointerup hors de l'élément
 * - touch-action:none + Pointer Events résout le problème "passive listener" iOS
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BACKEND_URL } from '../../lib/wineSearch';
import { addToCategory, getCategoryWines } from '../../hooks/useWineCategories';
import type { WineCategory, WineDetailData, WineCardData } from '../../types';
import DropZones from '../layout/DropZones';
import DetailBlock from './DetailBlock';

interface Props {
  /** URL Hachette de la fiche millésime */
  url: string;
  onClose: () => void;
  /** Callback appelé quand les détails sont chargés (pour mettre à jour les étoiles dans ResultCard) */
  onDetailLoaded?: (url: string, data: WineDetailData) => void;
  /** Callback appelé quand un vin est ajouté à une catégorie */
  onCategoryChange?: () => void;
  /** Callback appelé après dépôt réussi */
  onWineAdded?: (category: WineCategory, wineName: string, year: number) => void;
}

export default function WineDetailModalWithDrag({
  url, onClose, onDetailLoaded, onCategoryChange, onWineAdded,
}: Props) {
  const [data, setData] = useState<WineDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // États drag & drop
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);   // Ref synchrone (setState est async)
  const [isOverZone, setIsOverZone] = useState(false);
  const isOverZoneRef = useRef(false);

  // Feedback visuel après dépôt
  const [showSuccess, setShowSuccess] = useState(false);
  const [successCategory, setSuccessCategory] = useState<WineCategory | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });
  // Ref pour éviter la stale closure dans les listeners permanents
  const handleDropRef = useRef<(cat: WineCategory) => void>(() => {});

  // ── Chargement des données ────────────────────────────────
  useEffect(() => {
    setLoading(true); setError(null); setData(null);
    fetch(`${BACKEND_URL}/api/wine/detail?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then((d: WineDetailData) => {
        setData(d);
        setLoading(false);
        if (d.ok && onDetailLoaded) onDetailLoaded(url, d);
      })
      .catch(() => { setError('Impossible de charger les détails'); setLoading(false); });
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fermer avec Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  // Bloquer le scroll du fond pendant que la modal est ouverte
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ── Zones de drop (coins de l'écran) ─────────────────────
  const buildZones = useCallback(() => {
    const w = window.innerWidth, h = window.innerHeight;
    const size = 110, gap = 8, margin = 30; // marge de tolérance
    return [
      { cat: 'tasted'   as WineCategory, x: gap - margin,         y: gap - margin,         w: size + margin * 2, h: size + margin * 2 },
      { cat: 'liked'    as WineCategory, x: gap - margin,         y: h - gap - size - margin, w: size + margin * 2, h: size + margin * 2 },
      { cat: 'favorite' as WineCategory, x: w - gap - size - margin, y: gap - margin,         w: size + margin * 2, h: size + margin * 2 },
      { cat: 'cellar'   as WineCategory, x: w - gap - size - margin, y: h - gap - size - margin, w: size + margin * 2, h: size + margin * 2 },
    ];
  }, []);

  // ── Dépôt dans une catégorie ─────────────────────────────
  const handleDrop = (category: WineCategory) => {
    if (!data?.ok) return;
    const wineData: WineCardData = {
      wineName:    data.wine_name || '',
      year:        data.year || 0,
      stars:       data.stars || 0,
      region:      data.region,
      appellation: data.appellation,
      image:       data.image,
      url:         data.url,
      addedAt:     Date.now(),
    };
    addToCategory(category, wineData);
    setSuccessCategory(category);
    setShowSuccess(true);
    if (onCategoryChange) onCategoryChange();
    if (onWineAdded) onWineAdded(category, data.wine_name || '', data.year || 0);

    // Animation de dépôt
    if (cardRef.current) {
      cardRef.current.style.transition = 'all 0.3s ease-out';
      cardRef.current.style.transform = 'scale(0.3)';
      cardRef.current.style.opacity = '0';
    }
    // Délai pour laisser le toast de succès s'afficher avant de démonter le composant
    setTimeout(() => onClose(), 1600);
  };

  // Maintenir handleDropRef à jour pour les listeners permanents
  useEffect(() => { handleDropRef.current = handleDrop; });

  // ── Pointer Events API — drag ─────────────────────────────
  // setPointerCapture redirige tous les événements pointer vers cet élément,
  // même si le pointeur sort du composant ou de la fenêtre.
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Ne pas déclencher le drag sur les boutons et liens
    if (
      target.tagName === 'A' || target.tagName === 'BUTTON' ||
      target.closest('a') || target.closest('button') ||
      target.classList.contains('no-drag') || target.closest('.no-drag')
    ) return;

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const { clientX, clientY } = e;
    lastMousePos.current = { x: clientX, y: clientY };

    // Appliquer position:fixed IMMÉDIATEMENT sur le DOM
    // (avant le re-render React pour éviter le freeze au premier toucher)
    if (cardRef.current) {
      const el = cardRef.current;
      el.style.position = 'fixed';
      el.style.width = '260px';
      el.style.height = '260px';
      el.style.minHeight = '260px';
      el.style.zIndex = '99999';
      el.style.cursor = 'grabbing';
      el.style.transition = 'transform 0.15s, border 0.15s, border-radius 0.15s, background 0.15s';
      el.style.left = `${clientX - 130}px`;
      el.style.top = `${clientY - 90}px`;
    }

    isDraggingRef.current = true;
    setIsDragging(true);
  };

  // Listeners permanents sur la carte (ajoutés une seule fois à l'ouverture de la modal)
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || !cardRef.current) return;
      e.preventDefault();
      const { clientX, clientY } = e;
      lastMousePos.current = { x: clientX, y: clientY };

      const zones = buildZones();
      const hit = zones.some(z =>
        clientX >= z.x && clientX <= z.x + z.w &&
        clientY >= z.y && clientY <= z.y + z.h
      );
      if (hit !== isOverZoneRef.current) { isOverZoneRef.current = hit; setIsOverZone(hit); }

      cardRef.current.style.left = `${clientX - 130}px`;
      cardRef.current.style.top  = `${clientY - 90}px`;
    };

    const onPointerUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      const { x: clientX, y: clientY } = lastMousePos.current;
      const zones = buildZones();
      const hit = zones.find(z =>
        clientX >= z.x && clientX <= z.x + z.w &&
        clientY >= z.y && clientY <= z.y + z.h
      );

      if (hit) {
        handleDropRef.current(hit.cat);
      } else {
        // Annuler le drag : réinitialiser les styles inline
        setIsDragging(false);
        isOverZoneRef.current = false;
        setIsOverZone(false);
        if (cardRef.current) {
          const c = cardRef.current;
          c.style.position = '';
          c.style.left = '';
          c.style.top = '';
          c.style.width = '';
          c.style.height = '';
          c.style.minHeight = '';
          c.style.zIndex = '';
          c.style.cursor = '';
          c.style.transition = '';
        }
      }
    };

    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup',    onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    return () => {
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup',    onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fonction style selon type de vin ──────────────────────
  const getWineStyle = (wineTypeLabel: string | undefined): { background: string; color: string } => {
    if (!wineTypeLabel) return { background: '#f8f4ec', color: '#2D1B1B' };
    const lower = wineTypeLabel.toLowerCase();
    if (lower.includes('rouge')) {
      return {
        background: 'linear-gradient(145deg, rgba(90,10,10,0.97), rgba(60,5,5,0.97))',
        color: '#FFD0D5',
      };
    }
    if (lower.includes('rosé') || lower.includes('rose')) {
      return {
        background: 'linear-gradient(145deg, rgba(160,40,80,0.95), rgba(200,70,110,0.95))',
        color: '#FFE4EF',
      };
    }
    if (lower.includes('blanc')) {
      return {
        background: 'linear-gradient(145deg, rgba(30,25,5,0.97), rgba(50,40,10,0.97))',
        color: '#FFF8DC',
      };
    }
    if (lower.includes('effervescent') || lower.includes('champagne') || lower.includes('crémant') || lower.includes('sparkling')) {
      return {
        background: 'linear-gradient(145deg, rgba(5,20,60,0.97), rgba(10,30,80,0.97))',
        color: '#E0EAFF',
      };
    }
    return { background: '#f8f4ec', color: '#2D1B1B' };
  };

  // ── Labels ───────────────────────────────────────────────
  const categoryLabels: Record<WineCategory, string> = {
    tasted: 'Vins goutés', liked: 'Vins appréciés', favorite: 'Favoris', cellar: 'votre cave',
  };

  // Catégories dans lesquelles ce vin est déjà présent
  const wineCategories = data?.ok
    ? (['tasted', 'liked', 'favorite', 'cellar'] as WineCategory[]).filter(cat =>
        getCategoryWines(cat).some(w => w.wineName === data.wine_name && w.year === data.year)
      )
    : [];

  const renderStars = (stars: number, size = '1rem') => (
    <span style={{ color: '#D4AF37', fontSize: size, letterSpacing: 1 }}>
      {'★'.repeat(stars)}{'☆'.repeat(3 - stars)}
    </span>
  );

  // ── Render ───────────────────────────────────────────────
  return createPortal(
    <>
      {/* Zones de drop visibles pendant le drag */}
      <DropZones onDrop={handleDrop} visible={true} />

      {/* Overlay sombre */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: isDragging ? 'rgba(80,40,50,0.25)' : 'rgba(0,0,0,0.6)',
          zIndex: isDragging ? 99998 : 9999,
          pointerEvents: isDragging ? 'none' : 'auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}
        onClick={() => { if (!isDragging) onClose(); }}
      >
        {/* Carte draggable */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="wine-modal-title"
          ref={cardRef}
          style={{
            background: isDragging ? getWineStyle(data?.wine_type_label).background : getWineStyle(data?.wine_type_label).background,
            color: isDragging ? getWineStyle(data?.wine_type_label).color : 'inherit',
            borderRadius: isOverZone ? 20 : 16,
            width: isDragging ? 260 : '100%',
            maxWidth: isDragging ? 260 : 'min(380px, calc(100vw - 32px))',
            height: isDragging ? 260 : 'auto',
            minHeight: isDragging ? 260 : 'auto',
            maxHeight: '90vh',
            overflow: isDragging ? 'hidden' : 'auto',
            overflowY: isDragging ? 'hidden' : 'auto',
            boxShadow: isDragging
              ? '0 25px 60px rgba(0,0,0,0.7), 0 0 40px rgba(212,175,55,0.5)'
              : '0 24px 80px rgba(0,0,0,0.5)',
            position: isDragging ? 'fixed' : 'relative',
            cursor: isDragging ? 'grabbing' : 'grab',
            transform: isDragging ? `scale(${isOverZone ? 0.385 : 1})` : 'none',
            transformOrigin: 'center center',
            transition: isDragging ? 'transform 0.15s, border 0.15s, border-radius 0.15s, background 0.15s' : 'all 0.2s ease-out',
            border: isDragging ? '3px solid #D4AF37' : '1px solid rgba(212,175,55,0.25)',
            zIndex: isDragging ? 99999 : 9999,
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'none',
            WebkitTouchCallout: 'none',
          }}
          onClick={e => e.stopPropagation()}
          onPointerDown={handlePointerDown}
        >
          {/* Bouton fermer (masqué pendant le drag) */}
          {!isDragging && !isOverZone && (
            <button onClick={onClose} aria-label="Fermer" style={{
              position: 'absolute', top: 12, right: 12, zIndex: 2,
              background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%',
              width: 32, height: 32, cursor: 'pointer', color: 'rgba(255,255,255,0.8)',
              fontSize: '1.2rem', lineHeight: '32px', textAlign: 'center', transition: 'all 0.2s',
            }}>×</button>
          )}

          {/* Badges des catégories existantes */}
          {wineCategories.length > 0 && !isDragging && !isOverZone && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '12px 20px 0' }}>
              {wineCategories.map(cat => (
                <div key={cat} style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px',
                  background: 'rgba(255,255,255,0.1)',
                  border: `1px solid ${cat === 'favorite' ? 'rgba(255,215,0,0.5)' : cat === 'liked' ? 'rgba(39,174,96,0.5)' : cat === 'cellar' ? 'rgba(180,130,70,0.5)' : 'rgba(200,200,200,0.3)'}`,
                  borderRadius: 10,
                }}>
                  <span style={{ fontSize: '0.75rem' }}>
                    {cat === 'favorite' ? '💛' : cat === 'liked' ? '🥂' : cat === 'cellar' ? '🏠' : '🍷'}
                  </span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 600, color: cat === 'favorite' ? '#FFD700' : cat === 'liked' ? '#5AE89A' : cat === 'cellar' ? '#D4A76A' : 'rgba(255,255,255,0.7)' }}>
                    {cat === 'favorite' ? 'Favoris' : cat === 'liked' ? 'Apprécié' : cat === 'cellar' ? 'En Cave' : 'Gouté'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* État chargement */}
          {loading && (
            <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🍷</div>
              Consultation de la fiche...
            </div>
          )}

          {/* État erreur */}
          {error && !loading && (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 18, fontSize: '0.88rem' }}>{error}</p>
              <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#FFD700', textDecoration: 'underline' }}>Voir la fiche →</a>
            </div>
          )}

          {/* Vue compacte pendant le drag (pas sur un bac) */}
          {isDragging && data?.ok && !isOverZone && (
            <div style={{ padding: '60px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#F5F5DC' }}>
              <span style={{ fontSize: '2.5rem', marginBottom: 8, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>🍷</span>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', fontWeight: 700, margin: '0 0 4px', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                {data.wine_name && data.wine_name.length > 25 ? data.wine_name.slice(0, 23) + '...' : data.wine_name}
              </h3>
              <p style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 4px', color: '#D4AF37', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                {data.year}
              </p>
              <div style={{ marginTop: 4 }}>{renderStars(data.stars || 0, '1.1rem')}</div>
            </div>
          )}

          {/* Icône de dépôt quand au-dessus d'un bac */}
          {isDragging && isOverZone && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <span style={{ fontSize: '7rem', animation: 'bounce 0.5s infinite' }}>📥</span>
            </div>
          )}

          {/* Contenu normal (quand pas en drag) */}
          {data?.ok && !loading && !isDragging && (() => {
            const wineStyle = getWineStyle(data.wine_type_label);
            const textColor = wineStyle.color;
            const textMuted = textColor + 'BB';
            return (
            <>
              {/* Indice de drag discret */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '6px 16px', margin: '12px 20px 0',
                background: 'rgba(255,255,255,0.08)', border: '1px dashed rgba(255,255,255,0.2)',
                borderRadius: 8, fontSize: '0.68rem', color: textMuted,
              }}>
                <span style={{ fontSize: '0.8rem' }}>☝️</span>
                Maintenez et glissez cette carte vers un coin pour la ranger dans vos bacs
              </div>

              <div style={{ display: 'flex', gap: 16, padding: '16px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                {data.image && (
                  <img src={data.image} alt={data.wine_name}
                    style={{ width: 44, maxHeight: 90, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0, paddingRight: 28 }}>
                  <h2 id="wine-modal-title" style={{ fontFamily: 'Playfair Display, serif', color: textColor, fontSize: '1.1rem', fontWeight: 700, margin: 0, lineHeight: 1.25 }}>
                    {data.wine_name || '—'}
                  </h2>
                  {data.year && <p style={{ color: '#FFD700', fontWeight: 700, fontSize: '1rem', margin: '4px 0 0' }}>Millésime {data.year}</p>}
                  {(data.appellation || data.region) && (
                    <p style={{ color: textMuted, fontSize: '0.78rem', margin: '5px 0 0' }}>
                      {[data.appellation, data.region].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                    {data.stars !== undefined && data.stars > 0 && (
                      <span style={{ color: '#FFD700', fontSize: '1.1rem', letterSpacing: 2, textShadow: '0 0 8px rgba(255,215,0,0.6)' }}>{'★'.repeat(data.stars)}{'☆'.repeat(3 - data.stars)}</span>
                    )}
                    {data.coup_de_coeur && (
                      <span style={{ background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.35)', borderRadius: 6, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600, color: '#FFD700' }}>💛 Coup de Cœur</span>
                    )}
                    {data.wine_type_label && (
                      <span style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '2px 8px', fontSize: '0.72rem', color: textColor }}>{data.wine_type_label}</span>
                    )}
                  </div>
                </div>
              </div>

              {(data.garde || data.temperature || data.elevage || data.a_boire) && (
                <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 10, color: textColor }}>
                  {data.garde && <DetailBlock icon="📅" label="Garde" value={data.garde} />}
                  {data.temperature && <DetailBlock icon="🌡️" label="Température" value={data.temperature} />}
                  {data.elevage && <DetailBlock icon="🪣" label="Élevage" value={data.elevage} />}
                  {data.a_boire && <DetailBlock icon="🍷" label="Conseil" value={data.a_boire} />}
                </div>
              )}

              <div style={{ padding: '12px 20px 20px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {data.producer_url && (
                  <a href={data.producer_url} target="_blank" rel="noopener noreferrer"
                    style={{ padding: '7px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 500, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#FFD700', textDecoration: 'none' }}>
                    Fiche producteur →
                  </a>
                )}
                <a href={url} target="_blank" rel="noopener noreferrer" style={{ padding: '7px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 500, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: textColor, textDecoration: 'none' }}>
                  Voir la fiche →
                </a>
              </div>
            </>
            );
          })()}
        </div>
      </div>

      {/* Bandeau de succès après dépôt */}
      {showSuccess && data && successCategory && createPortal(
        <div style={{
          position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, rgba(212,175,55,0.95) 0%, rgba(160,130,30,0.95) 100%)',
          padding: '12px 24px', borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 40px rgba(212,175,55,0.5)',
          zIndex: 10001, animation: 'successSlideIn 0.4s ease-out',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: '1.5rem' }}>
            {successCategory === 'tasted' ? '🍷' : successCategory === 'liked' ? '🥂' : successCategory === 'favorite' ? '💛' : '🏠'}
          </span>
          <div style={{ color: '#2D0A0D' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Vin ajouté à vos {categoryLabels[successCategory]} !</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{data.wine_name} {data.year}</div>
          </div>
        </div>,
        document.body
      )}
    </>,
    document.body
  );
}
