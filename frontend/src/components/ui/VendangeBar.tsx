/**
 * VendangeBar — Barre de chargement animée affichée pendant les recherches
 *
 * Simule une progression jusqu'à 90%, puis complète rapidement dès que
 * la recherche est terminée (prop realDone=true).
 */

import { useState, useEffect, useRef } from 'react';
import { WINE_QUOTES } from '../../constants';

interface Props {
  /** La vraie recherche est-elle terminée ? */
  realDone: boolean;
  /** Callback appelé quand l'animation est complète */
  onComplete: () => void;
}

export default function VendangeBar({ realDone, onComplete }: Props) {
  const [percent, setPercent] = useState(0);
  // Citation aléatoire sélectionnée une seule fois au montage
  const [quote] = useState(() => WINE_QUOTES[Math.floor(Math.random() * WINE_QUOTES.length)]);
  const startTime = useRef(Date.now());
  const completed = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime.current;

      if (realDone) {
        // Recherche terminée : finir rapidement (attendre au moins 1,5s)
        const minDuration = 1500;
        const remaining = Math.max(0, minDuration - elapsed);
        if (remaining > 0) {
          setPercent(p => Math.min(p + 5, 95));
        } else {
          setPercent(100);
          if (!completed.current) {
            completed.current = true;
            setTimeout(onComplete, 400);
          }
          clearInterval(interval);
        }
      } else {
        // Recherche en cours : progression lente jusqu'à 90%
        const maxDuration = 3000;
        const progress = Math.min(elapsed / maxDuration, 0.9);
        const eased = 1 - Math.pow(1 - progress, 2);
        setPercent(Math.floor(eased * 90));
        if (elapsed > maxDuration) setPercent(90);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [realDone, onComplete]);

  return (
    <div className="vendange-container page-enter">
      <div className="vendange-bar">
        <div className="vendange-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="vendange-quote">{quote}</p>
    </div>
  );
}
