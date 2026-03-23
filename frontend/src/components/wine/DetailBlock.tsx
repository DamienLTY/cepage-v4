/**
 * DetailBlock — Bloc d'information d'un détail vin (garde, température, etc.)
 * Utilisé dans WineDetailModal et WineDetailModalWithDrag.
 */

interface Props {
  icon: string;
  label: string;
  value: string;
}

export default function DetailBlock({ icon, label, value }: Props) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 10,
      padding: '8px 12px',
      flex: '1 1 110px',
      minWidth: 110,
    }}>
      <div style={{
        fontSize: '0.68rem',
        color: 'inherit',
        opacity: 0.6,
        marginBottom: 2,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '0.85rem', color: 'inherit', fontWeight: 600 }}>
        {value}
      </div>
    </div>
  );
}
