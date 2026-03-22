/**
 * ResetPasswordPage — Réinitialisation du mot de passe
 *
 * Deux modes :
 * - Sans token : formulaire email → envoie un lien de réinitialisation
 * - Avec token  : formulaire nouveau mdp → confirme le reset via l'API
 *
 * Le succès de l'envoi email est toujours affiché (sécurité anti-enumeration).
 */

import { useState } from 'react';
import { BACKEND_URL } from '../lib/wineSearch';
import type { Page } from '../types';

interface Props {
  token?: string;
  onNavigate: (p: Page) => void;
}

export default function ResetPasswordPage({ token, onNavigate }: Props) {
  // ── TOUS les states en premier, sans condition ──────────────────────
  // Mode confirmation (avec token depuis l'email)
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  // Mode demande (sans token)
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      setPwdMsg({ ok: false, text: 'Les mots de passe ne correspondent pas' });
      return;
    }
    if (newPwd.length < 8) {
      setPwdMsg({ ok: false, text: 'Minimum 8 caractères' });
      return;
    }
    setPwdLoading(true);
    setPwdMsg(null);
    try {
      const r = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: newPwd }),
      });
      const data = await r.json();
      if (data.ok) {
        setPwdMsg({ ok: true, text: 'Mot de passe mis à jour ! Vous pouvez vous connecter.' });
        setTimeout(() => onNavigate('login'), 2000);
      } else {
        setPwdMsg({ ok: false, text: data.error || 'Erreur' });
      }
    } catch {
      setPwdMsg({ ok: false, text: 'Impossible de contacter le serveur' });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${BACKEND_URL}/api/auth/request-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setSent(true); // Toujours afficher succès (sécurité anti-enumeration)
    } finally {
      setLoading(false);
    }
  };

  // Rendu conditionnel basé sur token (PAS de hooks après ce point)
  if (token) {
    return (
      <div className="page-enter" style={{ maxWidth: 420, margin: '60px auto', padding: '0 16px' }}>
        <div className="admin-card">
          <h2 className="admin-title" style={{ textAlign: 'center', marginBottom: 32 }}>Nouveau mot de passe</h2>
          {pwdMsg && (
            <div style={{
              background: pwdMsg.ok ? 'rgba(50,150,50,0.15)' : 'rgba(139,26,26,0.3)',
              border: `1px solid ${pwdMsg.ok ? 'rgba(50,200,50,0.3)' : 'rgba(139,26,26,0.5)'}`,
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              fontSize: '0.88rem', color: pwdMsg.ok ? '#90EE90' : '#F0A0A0',
            }}>{pwdMsg.text}</div>
          )}
          <form onSubmit={handleConfirmReset} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              className="admin-input" type="password"
              placeholder="Nouveau mot de passe (min. 8 caractères)"
              value={newPwd} onChange={e => setNewPwd(e.target.value)} required autoFocus
            />
            <input
              className="admin-input" type="password" placeholder="Confirmer le mot de passe"
              value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} required
            />
            <button type="submit" className="admin-btn" disabled={pwdLoading} style={{ marginTop: 8 }}>
              {pwdLoading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Mode demande (sans token)
  return (
    <div className="page-enter" style={{ maxWidth: 420, margin: '60px auto', padding: '0 16px' }}>
      <div className="admin-card">
        <h2 className="admin-title" style={{ textAlign: 'center', marginBottom: 8 }}>Mot de passe oublié</h2>
        {sent ? (
          <>
            <p style={{ color: 'rgba(245,245,220,0.7)', textAlign: 'center', lineHeight: 1.6, marginBottom: 20 }}>
              Si cet email existe, un lien de réinitialisation a été envoyé. Vérifiez vos spams.
            </p>
            <button onClick={() => onNavigate('login')} className="admin-btn" style={{ width: '100%' }}>
              Retour à la connexion
            </button>
          </>
        ) : (
          <>
            <p style={{ color: 'rgba(245,245,220,0.5)', fontSize: '0.9rem', marginBottom: 20, textAlign: 'center' }}>
              Entrez votre email pour recevoir un lien de réinitialisation.
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                className="admin-input" type="email" placeholder="Email"
                value={email} onChange={e => setEmail(e.target.value)} required autoFocus
              />
              <button type="submit" className="admin-btn" disabled={loading}>
                {loading ? 'Envoi...' : 'Envoyer le lien'}
              </button>
            </form>
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <button
                onClick={() => onNavigate('login')}
                style={{ background: 'none', border: 'none', color: 'rgba(245,245,220,0.4)', cursor: 'pointer', fontSize: '0.85rem' }}
              >Retour</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
