/**
 * VerifyEmailPage — Vérifie le token reçu par email
 *
 * Appelée automatiquement depuis le lien de vérification email.
 * Affiche : chargement → succès / erreur.
 * En cas de succès, connecte directement l'utilisateur.
 */

import { useState, useEffect } from 'react';
import { BACKEND_URL } from '../lib/wineSearch';
import type { AuthUser } from '../lib/auth';
import type { Page } from '../types';

interface Props {
  token: string;
  onLogin: (token: string, user: AuthUser) => void;
  onNavigate: (p: Page) => void;
}

export default function VerifyEmailPage({ token, onLogin, onNavigate }: Props) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token manquant.');
      return;
    }
    fetch(`${BACKEND_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          if (data.token && data.user) onLogin(data.token, data.user);
          setStatus('success');
          setMessage('Votre compte est maintenant actif !');
        } else {
          setStatus('error');
          setMessage(data.error || 'Lien invalide ou expiré.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Impossible de contacter le serveur.');
      });
  }, [token]); // eslint-disable-line

  return (
    <div className="page-enter" style={{ maxWidth: 420, margin: '60px auto', padding: '0 16px' }}>
      <div className="admin-card" style={{ textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>⏳</div>
            <p style={{ color: 'var(--champagne)' }}>Vérification en cours…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
            <h2 className="admin-title" style={{ marginBottom: 10 }}>Email vérifié !</h2>
            <p style={{ color: 'rgba(245,245,220,0.65)', marginBottom: 32, lineHeight: 1.6 }}>{message}</p>
            <button onClick={() => onNavigate('home')} className="admin-btn" style={{ width: '100%' }}>
              Accéder au site
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>❌</div>
            <h2 className="admin-title" style={{ marginBottom: 10 }}>Erreur de vérification</h2>
            <p style={{ color: '#f87171', marginBottom: 32, lineHeight: 1.6 }}>{message}</p>
            <button onClick={() => onNavigate('login')} className="admin-btn" style={{ width: '100%' }}>
              Retour à la connexion
            </button>
          </>
        )}
      </div>
    </div>
  );
}
