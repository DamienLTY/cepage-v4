import type { WineEvent } from '../../lib/events';

interface Props {
  event: WineEvent;
  onClose: () => void;
}

export default function EventDetailModal({ event, onClose }: Props) {
  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div className="event-modal" onClick={e => e.stopPropagation()}>
        <button className="event-modal-close" onClick={onClose}>✕</button>
        <img src={event.image} alt={event.title} className="event-modal-image"
          onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80'; }} />
        <div className="event-modal-content">
          <span className={`event-modal-cat event-card-category ${event.category}`}>
            {event.category === 'salon' ? 'Salon' : event.category === 'portes-ouvertes' ? 'Portes ouvertes' : event.category === 'festival' ? 'Festival' : 'Professionnel'}
          </span>
          <h3 className="event-modal-title">{event.title}</h3>
          <div className="event-modal-meta">
            <span>📅 {event.dates}</span>
            <span>📍 {event.location}</span>
          </div>
          <p className="event-modal-desc">{event.description}</p>
          {event.details.fullDescription && (
            <div className="event-modal-section">
              <h4>Description</h4>
              <p>{event.details.fullDescription}</p>
            </div>
          )}
          {event.details.schedule && (
            <div className="event-modal-section">
              <h4>Programme</h4>
              <ul>{event.details.schedule.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
          {event.details.highlights && (
            <div className="event-modal-section">
              <h4>Points forts</h4>
              <ul>{event.details.highlights.map((h: string, i: number) => <li key={i}>{h}</li>)}</ul>
            </div>
          )}
          {event.details.practicalInfo && (
            <div className="event-modal-section">
              <h4>Infos pratiques</h4>
              <ul>{event.details.practicalInfo.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul>
            </div>
          )}
          <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer" className="event-source-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
            </svg>
            Source officielle
          </a>
        </div>
      </div>
    </div>
  );
}
