import { createPortal } from 'react-dom';

interface Props {
  eventName: string;
  eventDates?: string;
  eventLocation?: string;
  onSelect: (mode: 'decouverte' | 'guide') => void;
}

export default function VisiteModePicker({ eventName, eventDates, eventLocation, onSelect }: Props) {
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1500,
      background: 'linear-gradient(160deg, rgba(7,7,15,0.97) 0%, rgba(18,5,10,0.97) 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      animation: 'pageWarpIn 0.4s ease-out',
    }}>
      {/* En-tête événement */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: '2rem', marginBottom: 10 }}>🚶</div>
        <h1 style={{
          color: 'var(--champagne)', fontFamily: 'Playfair Display, serif',
          fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', fontWeight: 700,
          margin: '0 0 8px', textShadow: '0 0 30px rgba(212,175,55,0.3)',
        }}>
          Mode Visite
        </h1>
        <p style={{ color: 'rgba(245,245,220,0.6)', fontSize: '0.9rem', margin: '0 0 4px', fontWeight: 600 }}>
          {eventName}
        </p>
        {(eventDates || eventLocation) && (
          <p style={{ color: 'rgba(245,245,220,0.35)', fontSize: '0.78rem', margin: 0 }}>
            {eventDates && `📅 ${eventDates}`}
            {eventDates && eventLocation && ' · '}
            {eventLocation && `📍 ${eventLocation}`}
          </p>
        )}
      </div>

      {/* Les 2 tuiles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 20,
        width: '100%',
        maxWidth: 560,
      }}>
        {/* Tuile Découverte */}
        <button
          onClick={() => onSelect('decouverte')}
          style={{
            padding: '32px 24px', borderRadius: 20, cursor: 'pointer',
            background: 'linear-gradient(145deg, rgba(114,47,55,0.18) 0%, rgba(80,20,30,0.1) 100%)',
            border: '1px solid rgba(114,47,55,0.35)',
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12,
            textAlign: 'left', transition: 'all 0.2s ease',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(145deg, rgba(114,47,55,0.28) 0%, rgba(80,20,30,0.18) 100%)';
            (e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(114,47,55,0.6)';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 16px 48px rgba(0,0,0,0.4), 0 0 30px rgba(114,47,55,0.2)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(145deg, rgba(114,47,55,0.18) 0%, rgba(80,20,30,0.1) 100%)';
            (e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(114,47,55,0.35)';
            (e.currentTarget as HTMLButtonElement).style.transform = '';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
          }}
        >
          <div style={{ fontSize: '2.5rem' }}>🗺️</div>
          <div>
            <div style={{ color: 'var(--champagne)', fontWeight: 700, fontSize: '1.15rem', fontFamily: 'Playfair Display, serif', marginBottom: 6 }}>
              Mode Découverte
            </div>
            <p style={{ color: 'rgba(245,245,220,0.6)', fontSize: '0.82rem', lineHeight: 1.5, margin: 0 }}>
              Explorez librement tous les exposants. Recherchez par nom, filtrez par couleur, région ou étoiles, et consultez les millésimes de chaque châteaux.
            </p>
          </div>
          <div style={{
            marginTop: 4, padding: '6px 16px', borderRadius: 10,
            background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)',
            color: 'rgba(212,175,55,0.8)', fontSize: '0.78rem', fontWeight: 600,
          }}>
            Explorer →
          </div>
        </button>

        {/* Tuile Parcours Guidé */}
        <button
          onClick={() => onSelect('guide')}
          style={{
            padding: '32px 24px', borderRadius: 20, cursor: 'pointer',
            background: 'linear-gradient(145deg, rgba(99,102,241,0.12) 0%, rgba(60,70,200,0.06) 100%)',
            border: '1px solid rgba(99,102,241,0.3)',
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12,
            textAlign: 'left', transition: 'all 0.2s ease',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(145deg, rgba(99,102,241,0.22) 0%, rgba(60,70,200,0.14) 100%)';
            (e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(99,102,241,0.55)';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 16px 48px rgba(0,0,0,0.4), 0 0 30px rgba(99,102,241,0.2)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(145deg, rgba(99,102,241,0.12) 0%, rgba(60,70,200,0.06) 100%)';
            (e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(99,102,241,0.3)';
            (e.currentTarget as HTMLButtonElement).style.transform = '';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
          }}
        >
          <div style={{ fontSize: '2.5rem' }}>✨</div>
          <div>
            <div style={{ color: '#a5b4fc', fontWeight: 700, fontSize: '1.15rem', fontFamily: 'Playfair Display, serif', marginBottom: 6 }}>
              Parcours Guidé
            </div>
            <p style={{ color: 'rgba(245,245,220,0.6)', fontSize: '0.82rem', lineHeight: 1.5, margin: 0 }}>
              Sélectionnez vos couleurs préférées (Rouge, Rosé, Blanc) et laissez l'algorithme vous proposer les meilleurs exposants classés par notes Hachette.
            </p>
          </div>
          <div style={{
            marginTop: 4, padding: '6px 16px', borderRadius: 10,
            background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
            color: '#a5b4fc', fontSize: '0.78rem', fontWeight: 600,
          }}>
            Commencer →
          </div>
        </button>
      </div>

      {/* Indication aide */}
      <p style={{ marginTop: 32, color: 'rgba(245,245,220,0.25)', fontSize: '0.72rem', textAlign: 'center' }}>
        Vous pouvez changer de mode à tout moment via le bouton en haut à gauche
      </p>
    </div>,
    document.body
  );
}
