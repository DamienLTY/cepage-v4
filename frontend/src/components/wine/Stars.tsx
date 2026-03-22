/**
 * Stars — Affichage des étoiles de notation Hachette (0-3 étoiles)
 *
 * Utilise les classes CSS .vintage-stars, .star.filled, .star.empty
 * définies dans index.css.
 */

interface Props {
  /** Nombre d'étoiles (0 à 3) */
  count: number;
}

export default function Stars({ count }: Props) {
  return (
    <span className="vintage-stars">
      {[0, 1, 2].map(i => (
        <span key={i} className={`star ${i < count ? 'filled' : 'empty'}`}>★</span>
      ))}
    </span>
  );
}
