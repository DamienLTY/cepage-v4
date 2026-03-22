import React from 'react';
import LogoSVG from '../ui/LogoSVG';
import { SITE_NAME } from '../../constants';
import type { AuthUser } from '../../lib/auth';
import type { Page } from '../../types';

type AccountTab = 'tasted' | 'liked' | 'favorite' | 'cellar' | 'settings';

interface Props {
  authUser: AuthUser | null;
  isAdmin: boolean;
  sidebarOpen: boolean;
  accountExpanded: boolean;
  accountDropdownRef: React.RefObject<HTMLDivElement | null>;
  categoryCounts: { tasted: number; liked: number; favorite: number; cellar: number };
  onNavigate: (p: Page) => void;
  onLogout: () => void;
  onHamburgerToggle: () => void;
  onAccountExpand: (v: boolean) => void;
  onAccountTabNavigate: (tab: AccountTab) => void;
}

export default function AppHeader({ authUser, isAdmin, sidebarOpen, accountExpanded, accountDropdownRef, onNavigate, onLogout, onHamburgerToggle, onAccountExpand, onAccountTabNavigate }: Props) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="site-logo" onClick={() => onNavigate('home')}>
          <LogoSVG />
          <span className="logo-text">{SITE_NAME}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {!authUser && (
            <button onClick={() => onNavigate('login')} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              background: 'var(--border-wine)', border: '1px solid var(--border)',
              borderRadius: 12, cursor: 'pointer', color: 'var(--gold)', fontSize: '0.85rem', fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
            }}>
              <span>👤</span><span>Se Connecter</span>
            </button>
          )}

          {authUser && (
            <div style={{ position: 'relative' }} ref={accountDropdownRef}>
              <button
                onClick={() => onAccountExpand(!accountExpanded)}
                aria-label="Mon Compte"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
                  background: 'var(--border-wine)', border: '1px solid var(--border)',
                  borderRadius: 12, cursor: 'pointer', color: 'var(--gold)', fontSize: '0.82rem', fontWeight: 600,
                  fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
                }}
              >
                <span>👤</span>
                <span className="account-btn-label">Mon Compte</span>
                <svg
                  width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ transition: 'transform 0.2s', transform: accountExpanded ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {accountExpanded && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 8,
                  background: 'var(--bg-elevated)', backdropFilter: 'blur(24px)',
                  border: '1px solid var(--border)', borderRadius: 16,
                  padding: '8px 0', minWidth: 190, zIndex: 1000,
                  boxShadow: '0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px var(--border)',
                }}>
                  <button onClick={() => {
                    onNavigate('account');
                    onAccountExpand(false);
                  }} style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '10px 16px', background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--text-1)', fontSize: '0.85rem', textAlign: 'left',
                    fontFamily: 'DM Sans, sans-serif', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-wine)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    👤 Voir mon compte
                  </button>
                  <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0' }} />
                  {(['tasted', 'liked', 'favorite', 'cellar'] as const).map((t) => {
                    const labels = { tasted: '🍷 Vins Goûtés', liked: '⭐ Vins Appréciés', favorite: '💙 Favoris', cellar: '🏠 En Cave' };
                    return (
                      <button key={t} onClick={() => {
                        onAccountTabNavigate(t);
                        onAccountExpand(false);
                      }} style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        padding: '10px 16px', background: 'none', border: 'none',
                        cursor: 'pointer', color: 'var(--text-1)', fontSize: '0.85rem', textAlign: 'left',
                        fontFamily: 'DM Sans, sans-serif', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-wine)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        {labels[t]}
                      </button>
                    );
                  })}
                  <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0' }} />
                  <button onClick={() => {
                    onAccountTabNavigate('settings');
                    onAccountExpand(false);
                  }} style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '10px 16px', background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--text-1)', fontSize: '0.85rem', textAlign: 'left',
                    fontFamily: 'DM Sans, sans-serif', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-wine)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    ⚙️ Paramètres
                  </button>
                  {isAdmin && (
                    <button onClick={() => { onNavigate('admin'); onAccountExpand(false); }} style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                      padding: '10px 16px', background: 'none', border: 'none',
                      cursor: 'pointer', color: 'var(--text-1)', fontSize: '0.85rem', textAlign: 'left',
                      fontFamily: 'DM Sans, sans-serif', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-wine)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      🔑 Administration
                    </button>
                  )}
                  <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                  <button onClick={onLogout} style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '10px 16px', background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'left',
                    fontFamily: 'DM Sans, sans-serif', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-glow)'; e.currentTarget.style.color = 'var(--danger)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--danger)'; }}
                  >
                    🚪 Déconnexion
                  </button>
                </div>
              )}
            </div>
          )}

          <button className={`hamburger ${sidebarOpen ? 'open' : ''}`} onClick={onHamburgerToggle} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </div>
    </header>
  );
}
