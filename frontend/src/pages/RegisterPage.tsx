/**
 * RegisterPage — Formulaire de création de compte
 *
 * Envoie email + password + display_name à POST /api/auth/register.
 * Valide localement la longueur du mot de passe (min. 8 caractères).
 */

import { useState } from 'react';
import { BACKEND_URL } from '../lib/wineSearch';
import type { AuthUser } from '../lib/auth';
import type { Page } from '../types';

interface Props {
  onLogin: (token: string, user: AuthUser) => void;
  onNavigate: (p: Page) => void;
}

export default function RegisterPage({ onLogin, onNavigate }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
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
    if (password.length < 8) {
      setError('Mot de passe trop court (min. 8 caractères)');
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }
    try {
      const r = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, display_name: displayName }),
      });
      const data = await r.json();
      if (data.ok) {
        onLogin(data.token, data.user);
        onNavigate(data.user.role === 'admin' ? 'admin' : 'home');
      } else {
        setError(data.error || 'Erreur lors de la création du compte');
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
        <h2 className="admin-title" style={{ textAlign: 'center', marginBottom: 8 }}>Créer un compte</h2>
        <p style={{ textAlign: 'center', color: 'rgba(245,245,220,0.5)', fontSize: '0.9rem', marginBottom: 32 }}>
          Sauvegardez vos favoris partout
        </p>

        {error && (
          <div style={{
            background: 'rgba(139,26,26,0.3)', border: '1px solid rgba(139,26,26,0.5)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16,
            fontSize: '0.88rem', color: '#F0A0A0',
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label htmlFor="register-displayname" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
            Prénom ou pseudo
          </label>
          <input
            id="register-displayname"
            className="admin-input" type="text" placeholder="Prénom ou pseudo (optionnel)"
            value={displayName} onChange={e => setDisplayName(e.target.value)} autoFocus
          />
          <label htmlFor="register-email" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
            Adresse email
          </label>
          <input
            id="register-email"
            className="admin-input" type="email" placeholder="Email"
            value={email} onChange={e => setEmail(e.target.value)} required
          />
          <label htmlFor="register-password" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
            Mot de passe
          </label>
          <input
            id="register-password"
            className="admin-input" type="password" placeholder="Mot de passe (min. 8 caractères)"
            value={password} onChange={e => setPassword(e.target.value)} required
          />
          <label htmlFor="register-confirm" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
            Confirmer le mot de passe
          </label>
          <input
            id="register-confirm"
            className="admin-input" type="password" placeholder="Confirmer le mot de passe"
            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
          />
          <button type="submit" className="admin-btn" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: '0.85rem' }}>
          <button
            onClick={() => onNavigate('login')}
            style={{ background: 'none', border: 'none', color: 'var(--sauternes)', cursor: 'pointer' }}
          >Déjà un compte ? Se connecter</button>
        </div>
      </div>
    </div>
  );
}
