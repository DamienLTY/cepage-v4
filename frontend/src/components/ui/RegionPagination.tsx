import React from 'react';
import type { Page } from '../../types';

interface Props {
  page: Page;
  isRegionSearch: boolean;
  searched: boolean;
  searching: boolean;
  regionPage: number;
  regionPages: number;
  onPageChange: (p: number) => void;
}

export default function RegionPagination({ page, isRegionSearch, searched, searching, regionPage, regionPages, onPageChange }: Props) {
  if (page !== 'search' || !isRegionSearch || !searched || searching || regionPages <= 1) return null;

  const p = regionPage;
  const last = regionPages;
  const btn = (disabled: boolean): React.CSSProperties => ({
    width: 32, height: 32, borderRadius: '50%', fontSize: '0.85rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: `1px solid ${disabled ? 'rgba(139,38,53,0.1)' : 'rgba(139,38,53,0.35)'}`,
    background: disabled ? 'transparent' : 'rgba(139,38,53,0.08)',
    color: disabled ? 'rgba(148,163,184,0.2)' : '#F4A0A0',
    cursor: disabled ? 'default' : 'pointer',
    flexShrink: 0,
  });

  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 600,
      display: 'flex', alignItems: 'center', gap: 14,
      background: 'rgba(10,10,24,0.96)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(139,38,53,0.2)',
      animation: 'neonPulse 3s ease-in-out infinite',
      borderRadius: 40, padding: '8px 14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(139,38,53,0.15)',
    }}>
      <button style={btn(p <= 1)} disabled={p <= 1} title="Première page" onClick={() => onPageChange(1)}>⏮</button>
      <button style={btn(p <= 1)} disabled={p <= 1} title="Page précédente" onClick={() => onPageChange(p - 1)}>◀</button>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-2)', padding: '0 6px', whiteSpace: 'nowrap', fontFamily: 'Space Grotesk, sans-serif' }}>
        <strong style={{ color: '#F4A0A0', fontSize: '0.9rem' }}>{p}</strong>
        <span style={{ margin: '0 4px', opacity: 0.3 }}>/</span>
        {last}
      </span>
      <button style={btn(p >= last)} disabled={p >= last} title="Page suivante" onClick={() => onPageChange(p + 1)}>▶</button>
      <button style={btn(p >= last)} disabled={p >= last} title="Dernière page" onClick={() => onPageChange(last)}>⏭</button>
    </div>
  );
}
