/**
 * LoginPage — Formulaire de connexion
 *
 * Envoie email + mot de passe à POST /api/auth/login.
 * Redirige vers admin si l'utilisateur est admin, sinon home.
 */

import { useState } from 'react';
import { BACKEND_URL } from '../lib/wineSearch';
import type { AuthUser } from '../lib/auth';
import type { Page } from '../types';

interface Props {
  onLogin: (token: string, user: AuthUser) => void;
  onNavigate: (p: Page) => void;
}

export default function LoginPage({ onLogin, onNavigate }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!email.includes('@') || !email.includes('.')) {
      setError('Adresse email invalide');
      setLoading(false);
      return;
    }
    try {
      const r = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (data.ok) {
        onLogin(data.token, data.user);
        onNavigate(data.user.role === 'admin' ? 'admin' : 'home');
      } else {
        setError(data.error || 'Erreur de connexion');
      }
    } catch {
      setError('Impossible de contacter le serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter" style={{ maxWidth: 420, margin: '60px auto', padding: '0 16px' }}>
      <div className="admin-card">
        <h2 className="admin-title" style={{ textAlign: 'center', marginBottom: 8 }}>Connexion</h2>
        <p style={{ textAlign: 'center', color: 'rgba(245,245,220,0.5)', fontSize: '0.9rem', marginBottom: 32 }}>
          Accédez à vos vins favoris
        </p>

        {error && (
          <div style={{
            background: 'rgba(139,26,26,0.3)', border: '1px solid rgba(139,26,26,0.5)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16,
            fontSize: '0.88rem', color: '#F0A0A0',
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }} autoComplete="off">
          <label htmlFor="login-email" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
            Adresse email
          </label>
          <input
            id="login-email"
            className="admin-input" type="email" placeholder="Email"
            value={email} onChange={e => setEmail(e.target.value)}
            required autoFocus autoComplete="off"
          />
          <label htmlFor="login-password" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
            Mot de passe
          </label>
          <input
            id="login-password"
            className="admin-input" type="password" placeholder="Mot de passe"
            value={password} onChange={e => setPassword(e.target.value)}
            required autoComplete="off"
          />
          <button type="submit" className="admin-btn" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <button
            onClick={() => onNavigate('register')}
            style={{ background: 'none', border: 'none', color: 'var(--sauternes)', cursor: 'pointer' }}
          >Créer un compte</button>
          <button
            onClick={() => onNavigate('reset-password')}
            style={{ background: 'none', border: 'none', color: 'rgba(245,245,220,0.4)', cursor: 'pointer' }}
          >Mot de passe oublié ?</button>
        </div>
      </div>
    </div>
  );
}
