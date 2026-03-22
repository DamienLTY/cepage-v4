import type { AuthUser } from '../../lib/auth';
import type { Page } from '../../types';

type AccountTab = 'tasted' | 'liked' | 'favorite' | 'cellar' | 'settings';

interface Props {
  isOpen: boolean;
  page: Page;
  authUser: AuthUser | null;
  isAdmin: boolean;
  accountExpanded: boolean;
  categoryCounts: { tasted: number; liked: number; favorite: number; cellar: number };
  onNavigate: (p: Page) => void;
  onToggleAccount: () => void;
  onAccountTab: (tab: AccountTab) => void;
  onLogout: () => void;
}

export default function AppSidebar({ isOpen, page, authUser, isAdmin, accountExpanded, categoryCounts, onNavigate, onToggleAccount, onAccountTab, onLogout }: Props) {
  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <button className={`sidebar-item ${page === 'home' ? 'sidebar-item-active' : ''}`} onClick={() => onNavigate('home')}>
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
        Accueil
      </button>
      <button className={`sidebar-item ${page === 'search' ? 'sidebar-item-active' : ''}`} onClick={() => onNavigate('search')}>
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
        Recherche
      </button>
      <button className={`sidebar-item ${page === 'events' ? 'sidebar-item-active' : ''}`} onClick={() => onNavigate('events')}>
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
        Événements
      </button>
      {authUser ? (
        <>
          <button
            className={`sidebar-item ${page === 'account' ? 'sidebar-item-active' : ''}`}
            onClick={() => onToggleAccount()}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
            <span style={{ flex: 1, textAlign: 'left' }}>{authUser.display_name || authUser.email.split('@')[0]}</span>
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ width: 14, height: 14, flexShrink: 0, transition: 'transform 0.2s', transform: accountExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <div className={`sidebar-submenu ${accountExpanded ? 'open' : ''}`}>
            <button onClick={() => { onNavigate('account'); onToggleAccount(); }} style={{ color: 'var(--text-1)' }}>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
              👤 Voir mon compte
            </button>
            <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
            <button onClick={() => onAccountTab('tasted')}>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 22h8M12 11v11M5 3l14 0M5 3l2 8h10l2-8"/></svg>
              Vins Goûtés
              {categoryCounts.tasted > 0 && <span style={{ marginLeft: 'auto', background: '#7B8794', color: 'white', borderRadius: 10, padding: '1px 6px', fontSize: '0.7rem', fontWeight: 700 }}>{categoryCounts.tasted}</span>}
            </button>
            <button onClick={() => onAccountTab('liked')}>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
              Vins Appréciés
              {categoryCounts.liked > 0 && <span style={{ marginLeft: 'auto', background: '#27AE60', color: 'white', borderRadius: 10, padding: '1px 6px', fontSize: '0.7rem', fontWeight: 700 }}>{categoryCounts.liked}</span>}
            </button>
            <button onClick={() => onAccountTab('favorite')}>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
              Favoris
              {categoryCounts.favorite > 0 && <span style={{ marginLeft: 'auto', background: '#D4AF37', color: 'white', borderRadius: 10, padding: '1px 6px', fontSize: '0.7rem', fontWeight: 700 }}>{categoryCounts.favorite}</span>}
            </button>
            <button onClick={() => onAccountTab('cellar')}>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              En Cave
              {categoryCounts.cellar > 0 && <span style={{ marginLeft: 'auto', background: '#8B4513', color: 'white', borderRadius: 10, padding: '1px 6px', fontSize: '0.7rem', fontWeight: 700 }}>{categoryCounts.cellar}</span>}
            </button>
            <button onClick={() => onAccountTab('settings')}>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              Paramètres
            </button>
            <button onClick={onLogout} style={{ color: 'var(--danger)' }}>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Se déconnecter
            </button>
          </div>
          {isAdmin && (
            <button className={`sidebar-item ${page === 'admin' ? 'sidebar-item-active' : ''}`} onClick={() => onNavigate('admin')}>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
              Administration
            </button>
          )}
        </>
      ) : (
        <button className={`sidebar-item ${page === 'login' ? 'sidebar-item-active' : ''}`} onClick={() => onNavigate('login')}>
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          Connexion
        </button>
      )}
    </div>
  );
}
