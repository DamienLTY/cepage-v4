import type { WineResult } from '../../lib/wineSearch';

interface Props {
  compareList: WineResult[];
  onOpenCompare: () => void;
  onClear: () => void;
}

export default function CompareBar({ compareList, onOpenCompare, onClear }: Props) {
  if (compareList.length === 0) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(10,10,24,0.97)', backdropFilter: 'blur(24px)',
      border: '1px solid rgba(139,38,53,0.25)',
      borderRadius: 20, padding: '12px 20px', zIndex: 500,
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,38,53,0.1), 0 0 30px rgba(139,38,53,0.15)',
      maxWidth: '90vw', animation: 'slideUp 0.4s cubic-bezier(0.22,1,0.36,1)',
    }}>
      <span style={{ color: '#F4A0A0', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'Space Grotesk, sans-serif' }}>
        ⇄ {compareList.length}/3 vin{compareList.length > 1 ? 's' : ''}
      </span>
      {compareList.map((w, i) => (
        <span key={i} style={{ color: 'var(--text-2)', fontSize: '0.8rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {w.foundName}
        </span>
      ))}
      <button onClick={onOpenCompare} style={{
        background: 'rgba(139,38,53,0.15)', border: '1px solid rgba(139,38,53,0.3)',
        borderRadius: 10, padding: '5px 14px', color: '#F4A0A0', cursor: 'pointer',
        fontSize: '0.8rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600,
      }}>Comparer</button>
      <button onClick={onClear} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
    </div>
  );
}
