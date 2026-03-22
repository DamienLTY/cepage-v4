/**
 * AdminPage — Panneau d'administration Cépage V5
 * Design : "Deep Space Vineyard"
 *
 * Onglets :
 *  1. Scraping   — contrôles scraping Hachette + SSE progression
 *  2. Users      — liste utilisateurs, rôles, suppression, création test
 *  3. Visite     — salons Mode Balade, détection nouveaux salons
 *  4. Evenements — gestion événements dynamiques (CRUD)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BACKEND_URL, resetBackendCache } from '../lib/wineSearch';
import { getCached, invalidateCache } from '../lib/apiCache';
import { safeParse, BackendStatusSchema } from '../lib/schemas';
import type { BackendStatus, ScrapeProgress, SiteUser } from '../types';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

// ── Types locaux ──────────────────────────────────────────────────────────────

interface Props {
  isAdmin: boolean;
  currentUserId?: string;
}

type AdminTab = 'scraping' | 'users' | 'visite' | 'events';

type SalonItem = {
  file: string;
  eventId: string;
  eventName: string;
  location: string;
  dates: string;
  totalExposants: number;
  matchesFound: number;
  generatedAt: string;
  fileSize: number;
};

type NewSalonItem = {
  slug: string;
  eventId: string;
  contentId: number | null;
  exposantCount: number;
  pageUrl: string;
  warning?: string;
  title?: string;
};

type DynEvent = {
  id: string;
  title: string;
  dates: string;
  location: string;
  description: string;
  image: string;
  category: string;
  sourceUrl: string;
  dateEnd: string;
  details?: { fullDescription: string };
};

// ── Palette Deep Space Vineyard ───────────────────────────────────────────────

const clr = {
  bg:       '#07070F',
  surface:  'rgba(255,255,255,0.025)',
  surface2: 'rgba(255,255,255,0.05)',
  border:   'rgba(255,255,255,0.08)',
  border2:  'rgba(255,255,255,0.12)',
  text1:    '#F1F5F9',
  text2:    '#94A3B8',
  text3:    '#475569',
  indigo:   '#6366F1',
  violet:   '#8B5CF6',
  cyan:     '#22D3EE',
  amber:    '#F59E0B',
  crimson:  '#F43F5E',
  emerald:  '#10B981',
  rose:     '#D4778A',
  gold:     '#C8A951',
};

// ── Composants UI réutilisables ────────────────────────────────────────────────

const btnBase: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: 10,
  fontWeight: 600,
  fontSize: '0.85rem',
  fontFamily: 'Space Grotesk, sans-serif',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  border: '1px solid',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  lineHeight: 1,
};

function Btn({
  onClick,
  disabled,
  variant = 'default',
  children,
  style,
}: {
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger' | 'success' | 'amber' | 'cyan' | 'ghost' | 'violet';
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.14))',
      borderColor: 'rgba(99,102,241,0.45)',
      color: '#a5b4fc',
    },
    danger: {
      background: 'rgba(244,63,94,0.12)',
      borderColor: 'rgba(244,63,94,0.4)',
      color: '#fb7185',
    },
    success: {
      background: 'rgba(16,185,129,0.1)',
      borderColor: 'rgba(16,185,129,0.35)',
      color: '#6ee7b7',
    },
    amber: {
      background: 'rgba(245,158,11,0.1)',
      borderColor: 'rgba(245,158,11,0.35)',
      color: '#fcd34d',
    },
    cyan: {
      background: 'rgba(34,211,238,0.08)',
      borderColor: 'rgba(34,211,238,0.3)',
      color: '#67e8f9',
    },
    violet: {
      background: 'rgba(139,92,246,0.12)',
      borderColor: 'rgba(139,92,246,0.35)',
      color: '#c4b5fd',
    },
    ghost: {
      background: 'rgba(255,255,255,0.04)',
      borderColor: 'rgba(255,255,255,0.1)',
      color: clr.text2,
    },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...btnBase,
        ...variantStyles[variant],
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      padding: '16px 18px',
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      margin: '0 0 16px',
      fontFamily: 'Space Grotesk, sans-serif',
      fontWeight: 700,
      color: clr.text1,
      fontSize: '0.95rem',
      letterSpacing: '-0.01em',
    }}>
      {children}
    </h3>
  );
}

function StatusBadge({ online, checking }: { online: boolean; checking: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600,
      background: online ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
      color:      online ? clr.emerald : clr.crimson,
      border:     `1px solid ${online ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.25)'}`,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', background: 'currentColor',
        animation: online ? 'neonPulse 2s ease-in-out infinite' : 'none',
        flexShrink: 0,
      }} />
      {checking ? 'Verification...' : online ? 'Backend connecte' : 'Backend hors ligne'}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const cfg: Record<string, { bg: string; color: string; border: string }> = {
    admin:   { bg: 'rgba(245,158,11,0.12)',  color: '#fcd34d',  border: 'rgba(245,158,11,0.3)'  },
    premium: { bg: 'rgba(212,119,138,0.12)', color: '#f9a8c9',  border: 'rgba(212,119,138,0.3)' },
    user:    { bg: 'rgba(71,85,105,0.2)',    color: clr.text3,  border: 'rgba(71,85,105,0.3)'   },
  };
  const c = cfg[role] ?? cfg.user;
  return (
    <span style={{
      fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px',
      borderRadius: 6, letterSpacing: '0.04em', textTransform: 'uppercase',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {role}
    </span>
  );
}

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `2px solid rgba(255,255,255,0.12)`,
      borderTopColor: clr.indigo,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  );
}

function Alert({ type, children }: { type: 'error' | 'success' | 'warn'; children: React.ReactNode }) {
  const cfg = {
    error:   { bg: 'rgba(244,63,94,0.08)',   border: 'rgba(244,63,94,0.25)',   color: '#fca5a5', icon: '!' },
    success: { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)', color: '#6ee7b7', icon: '\u2713' },
    warn:    { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)', color: '#fcd34d', icon: '\u26a0' },
  }[type];
  return (
    <div style={{
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 10, padding: '10px 14px', fontSize: '0.83rem', color: cfg.color,
      display: 'flex', gap: 8, alignItems: 'flex-start',
    }}>
      <span style={{ fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
      <span>{children}</span>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card style={{ textAlign: 'center', padding: '14px 12px' }}>
      <div style={{ fontWeight: 700, fontSize: '1.15rem', color }}>{value}</div>
      <div style={{ fontSize: '0.73rem', color: clr.text3, marginTop: 4, letterSpacing: '0.03em' }}>{label}</div>
    </Card>
  );
}

// ── Modal générique ────────────────────────────────────────────────────────────

function Modal({
  onClose,
  children,
  maxWidth = 460,
  borderColor = 'rgba(99,102,241,0.25)',
}: {
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
  borderColor?: string;
}) {
  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.78)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(8px)', padding: 20, overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0D0A16',
          border: `1px solid ${borderColor}`,
          borderRadius: 18, padding: '28px 24px',
          maxWidth, width: '100%',
          boxShadow: '0 24px 80px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function AdminPage({ isAdmin, currentUserId }: Props) {
  const [adminTab, setAdminTab] = useState<AdminTab>('scraping');

  // ── Backend status + SSE ─────────────────────────────────────────────────
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);
  const [backendChecking, setBackendChecking] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState<ScrapeProgress | null>(null);
  const [sseError, setSseError] = useState<string | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const [scrapYear, setScrapYear] = useState(new Date().getFullYear().toString());
  const [guideYear, setGuideYear] = useState<number>(2026);
  const [repairStatus, setRepairStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  // ── Users ────────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<SiteUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [roleChanging, setRoleChanging] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [testForm, setTestForm] = useState({ displayName: '', email: '', role: 'user' });
  const [testCreating, setTestCreating] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; password?: string } | null>(null);

  // ── Visite ───────────────────────────────────────────────────────────────
  const [visiteList, setVisiteList] = useState<SalonItem[]>([]);
  const [visiteListLoading, setVisiteListLoading] = useState(false);
  const [newSalons, setNewSalons] = useState<NewSalonItem[]>([]);
  const [checkLoading, setCheckLoading] = useState(false);
  const [checkDone, setCheckDone] = useState(false);
  const [reloadingId, setReloadingId] = useState<string | null>(null);
  const [reloadResults, setReloadResults] = useState<Record<string, string>>({});
  const [scrapeForm, setScrapeForm] = useState({ contentId: '', eventId: '', eventName: '', location: '', dates: '' });
  const [scrapeRunning, setScrapeRunning] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<{ ok: boolean; message: string } | null>(null);

  // ── Events ───────────────────────────────────────────────────────────────
  const [dynEvents, setDynEvents] = useState<DynEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventDeleteId, setEventDeleteId] = useState<string | null>(null);
  const [eventDeleteLoading, setEventDeleteLoading] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState<Partial<DynEvent>>({});
  const [savingEvent, setSavingEvent] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [medocScraping, setMedocScraping] = useState(false);
  const [medocResult, setMedocResult] = useState<{ ok: boolean; message: string } | null>(null);

  // ── Helpers auth header ──────────────────────────────────────────────────
  const authHeaders = useCallback(async (): Promise<HeadersInit> => {
    const { getStoredToken } = await import('../lib/auth');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getStoredToken()}`,
    };
  }, []);

  // ── Backend status ───────────────────────────────────────────────────────
  const refreshBackendStatus = useCallback(async (forceRefresh = false) => {
    setBackendChecking(true);
    if (forceRefresh) { resetBackendCache(); invalidateCache('backend-status'); }
    try {
      const raw = await getCached(
        'backend-status',
        async () => {
          const r = await fetch(`${BACKEND_URL}/api/status`, { signal: AbortSignal.timeout(3000) });
          return r.ok ? r.json() : null;
        },
        30000
      );
      setBackendStatus(safeParse(BackendStatusSchema, raw));
    } catch {
      setBackendStatus(null);
    }
    setBackendChecking(false);
  }, []);

  // ── SSE scraping ─────────────────────────────────────────────────────────
  const startSSE = useCallback(() => {
    if (sseRef.current) sseRef.current.close();
    setSseError(null);
    setScrapeProgress(null);
    let hasSeenRunning = false;
    const es = new EventSource(`${BACKEND_URL}/api/scrape/progress`);
    sseRef.current = es;
    es.onmessage = (e) => {
      const data: ScrapeProgress = JSON.parse(e.data);
      setScrapeProgress(data);
      if (data.running) hasSeenRunning = true;
      if (!data.running && hasSeenRunning) {
        es.close();
        sseRef.current = null;
        refreshBackendStatus();
      }
    };
    es.onerror = () => {
      setSseError('Connexion perdue avec le backend');
      es.close();
      sseRef.current = null;
    };
  }, [refreshBackendStatus]);

  useEffect(() => {
    if (backendStatus?.scraping_now && !sseRef.current) startSSE();
  }, [backendStatus, startSSE]);

  useEffect(() => () => { sseRef.current?.close(); }, []);

  // ── Users — chargement ───────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const headers = await authHeaders();
      const r = await fetch(`${BACKEND_URL}/api/auth/users`, { headers });
      const data = await r.json();
      if (data.ok) setUsers(data.users);
      else setUsersError(data.error || 'Erreur chargement utilisateurs');
    } catch {
      setUsersError('Impossible de contacter le backend');
    } finally {
      setUsersLoading(false);
    }
  }, [authHeaders]);

  const handleDeleteUser = async (userId: string) => {
    setDeleteLoading(true);
    try {
      const headers = await authHeaders();
      const r = await fetch(`${BACKEND_URL}/api/auth/users/${userId}`, { method: 'DELETE', headers });
      const data = await r.json();
      if (data.ok) setUsers(prev => prev.filter(u => u.id !== userId));
    } catch { /* silencieux */ }
    finally { setDeleteLoading(false); setDeleteConfirm(null); }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setRoleChanging(userId);
    try {
      const headers = await authHeaders();
      const r = await fetch(`${BACKEND_URL}/api/auth/users/${userId}/role`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ role: newRole }),
      });
      const data = await r.json();
      if (data.ok) setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch { /* silencieux */ }
    finally { setRoleChanging(null); }
  };

  const handleCreateTestAccount = async () => {
    setTestCreating(true);
    setTestResult(null);
    try {
      const headers = await authHeaders();
      const r = await fetch(`${BACKEND_URL}/api/auth/users/create-test`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          display_name: testForm.displayName || undefined,
          email: testForm.email || undefined,
          role: testForm.role,
        }),
      });
      const data = await r.json();
      if (data.ok) {
        setTestResult({ ok: true, message: data.message, password: data.password });
        setTestForm({ displayName: '', email: '', role: 'user' });
        loadUsers();
      } else {
        setTestResult({ ok: false, message: data.error || 'Erreur inconnue' });
      }
    } catch {
      setTestResult({ ok: false, message: 'Impossible de contacter le backend' });
    }
    setTestCreating(false);
  };

  // ── Visite — guards anti-double-appel (StrictMode + dep loop) ───────────
  const visiteLoadedRef = useRef(false);
  const eventsLoadedRef = useRef(false);

  // ── Visite — chargement ──────────────────────────────────────────────────
  const loadVisiteList = useCallback(async () => {
    setVisiteListLoading(true);
    try {
      const headers = await authHeaders();
      const r = await fetch(`${BACKEND_URL}/api/admin/visite/list`, { headers });
      const data = await r.json();
      if (data.ok) setVisiteList(data.salons);
    } catch { /* ignore */ }
    finally { setVisiteListLoading(false); }
  }, [authHeaders]);

  const checkNewSalons = async () => {
    setCheckLoading(true);
    setCheckDone(false);
    setNewSalons([]);
    try {
      const headers = await authHeaders();
      const r = await fetch(`${BACKEND_URL}/api/admin/visite/check-new-salons`, { headers });
      const data = await r.json();
      if (data.ok) setNewSalons(data.newSalons);
    } catch { /* ignore */ }
    finally { setCheckLoading(false); setCheckDone(true); }
  };

  const handleReloadSalon = async (eventId: string) => {
    setReloadingId(eventId);
    try {
      const headers = await authHeaders();
      const r = await fetch(`${BACKEND_URL}/api/admin/visite/reload/${eventId}`, { method: 'POST', headers });
      const data = await r.json();
      if (data.ok) {
        setVisiteList(prev => prev.map(s =>
          s.eventId === eventId
            ? { ...s, totalExposants: data.totalExposants, matchesFound: data.matchesFound, generatedAt: data.generatedAt }
            : s
        ));
        setReloadResults(prev => ({ ...prev, [eventId]: `Recharge : ${data.totalExposants} exposants` }));
        setTimeout(() => setReloadResults(prev => { const n = { ...prev }; delete n[eventId]; return n; }), 4000);
      }
    } catch { /* ignore */ }
    finally { setReloadingId(null); }
  };

  const runScrape = async () => {
    if (!scrapeForm.contentId || !scrapeForm.eventId) {
      setScrapeResult({ ok: false, message: 'contentId et eventId sont requis' });
      return;
    }
    setScrapeRunning(true);
    setScrapeResult(null);
    try {
      const headers = await authHeaders();
      const r = await fetch(`${BACKEND_URL}/api/admin/visite/scrape`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...scrapeForm, contentId: parseInt(scrapeForm.contentId) }),
      });
      const data = await r.json();
      if (data.ok) {
        setScrapeResult({ ok: true, message: `${data.stats.totalExposants} exposants scrapes (${data.stats.matchesFound} matches)` });
        loadVisiteList();
      } else {
        setScrapeResult({ ok: false, message: data.error || 'Erreur inconnue' });
      }
    } catch (e: unknown) {
      setScrapeResult({ ok: false, message: String(e) });
    } finally {
      setScrapeRunning(false);
    }
  };

  // ── Events — chargement ──────────────────────────────────────────────────
  const loadDynEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const headers = await authHeaders();
      const r = await fetch(`${BACKEND_URL}/api/admin/events/dynamic`, { headers });
      const data = await r.json();
      if (data.ok) setDynEvents(data.events);
    } catch { /* ignore */ }
    finally { setEventsLoading(false); }
  }, [authHeaders]);

  const handleSaveEvent = async () => {
    if (!eventForm.id || !eventForm.title) {
      setSaveResult({ ok: false, message: 'ID et titre requis' });
      return;
    }
    setSavingEvent(true);
    setSaveResult(null);
    try {
      const headers = await authHeaders();
      const r = await fetch(`${BACKEND_URL}/api/admin/events/save`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ event: eventForm }),
      });
      const data = await r.json();
      if (data.ok) {
        setSaveResult({ ok: true, message: `Evenement "${eventForm.title}" sauvegarde` });
        loadDynEvents();
        setEventForm({});
        setShowEventModal(false);
      } else {
        setSaveResult({ ok: false, message: data.error || 'Erreur inconnue' });
      }
    } catch {
      setSaveResult({ ok: false, message: 'Erreur de connexion' });
    }
    setSavingEvent(false);
  };

  const handleDeleteEvent = async (eventId: string) => {
    setEventDeleteLoading(true);
    try {
      const headers = await authHeaders();
      const r = await fetch(`${BACKEND_URL}/api/admin/events/delete/${eventId}`, { method: 'DELETE', headers });
      const data = await r.json();
      if (data.ok) setDynEvents(prev => prev.filter(e => e.id !== eventId));
    } catch { /* ignore */ }
    finally { setEventDeleteLoading(false); setEventDeleteId(null); }
  };

  const scrapeMedoc = async () => {
    setMedocScraping(true);
    setMedocResult(null);
    try {
      const headers = await authHeaders();
      const r = await fetch(`${BACKEND_URL}/api/admin/events/scrape-medoc`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          eventId: 'po-medoc-2026',
          eventName: 'Portes Ouvertes des Chateaux du Medoc',
          location: 'Medoc, Gironde',
          dates: '28 & 29 mars 2026',
        }),
      });
      const data = await r.json();
      if (data.ok) {
        setMedocResult({ ok: true, message: `${data.stats?.totalExposants || '?'} chateaux scrapes avec succes` });
      } else {
        setMedocResult({ ok: false, message: data.error });
      }
    } catch {
      setMedocResult({ ok: false, message: 'Erreur de connexion au backend' });
    }
    setMedocScraping(false);
  };

  // ── Scraping handlers ────────────────────────────────────────────────────
  const handleScrapeFull = async () => {
    try {
      const r = await fetch(`${BACKEND_URL}/api/scrape/full`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guideYear }),
      });
      const d = await r.json();
      if (d.ok) startSSE();
      else alert(`Erreur : ${d.error}`);
    } catch { alert('Impossible de joindre le backend.'); }
  };

  const handleScrapeYear = async () => {
    try {
      const r = await fetch(`${BACKEND_URL}/api/scrape/year`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: parseInt(scrapYear), guideYear }),
      });
      const d = await r.json();
      if (d.ok) startSSE();
      else alert(`Erreur : ${d.error}`);
    } catch { alert('Impossible de joindre le backend.'); }
  };

  const handleScrapeProducers = async () => {
    try {
      const r = await fetch(`${BACKEND_URL}/api/scrape/producers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const d = await r.json();
      if (d.ok) startSSE();
      else alert(`Erreur : ${d.error}`);
    } catch { alert('Impossible de joindre le backend.'); }
  };

  const handleFixGuideStars = async () => {
    try {
      const r = await fetch(`${BACKEND_URL}/api/scrape/fix-guide-stars`, { method: 'POST' });
      const d = await r.json();
      if (d.ok) startSSE();
      else alert(`Erreur : ${d.error}`);
    } catch { alert('Impossible de joindre le backend.'); }
  };

  const handleBackfillRegions = async () => {
    try {
      const r = await fetch(`${BACKEND_URL}/api/scrape/backfill-regions`, { method: 'POST' });
      const d = await r.json();
      if (d.ok) startSSE();
      else alert(`Erreur : ${d.error}`);
    } catch { alert('Impossible de joindre le backend.'); }
  };

  const handleClearProducers = async () => {
    if (!confirm('Vider la table des producteurs ? Relancez ensuite un scraping par annee.')) return;
    setRepairStatus('loading');
    try {
      const r = await fetch(`${BACKEND_URL}/api/db/clear-producers`, { method: 'POST' });
      const d = await r.json();
      if (d.ok) { setRepairStatus('done'); refreshBackendStatus(); }
      else { setRepairStatus('error'); alert(`Erreur : ${d.error}`); }
    } catch {
      setRepairStatus('error');
      alert('Impossible de joindre le backend.');
    }
  };

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isAdmin) {
      refreshBackendStatus();
      loadUsers();
    }
  }, [isAdmin, refreshBackendStatus, loadUsers]);

  useEffect(() => {
    if (adminTab === 'visite' && !visiteLoadedRef.current) {
      visiteLoadedRef.current = true;
      loadVisiteList();
    }
  }, [adminTab, loadVisiteList]);

  useEffect(() => {
    if (adminTab === 'events' && !eventsLoadedRef.current) {
      eventsLoadedRef.current = true;
      loadDynEvents();
    }
  }, [adminTab, loadDynEvents]);

  // ── Filtrage users + scroll infini ───────────────────────────────────────
  const filteredUsers = userSearch.trim()
    ? users.filter(u =>
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.display_name || '').toLowerCase().includes(userSearch.toLowerCase())
      )
    : users;
  const { visibleItems: visibleUsers, sentinelRef: usersSentinelRef, hasMore: usersHasMore } = useInfiniteScroll(filteredUsers, 20);

  // ── Computed ─────────────────────────────────────────────────────────────
  const backendOnline = backendStatus?.ok === true;
  const scrapingNow = scrapeProgress?.running || backendStatus?.scraping_now;
  const stats = backendStatus?.db_stats;
  const lastScrape = stats?.last_scrape;
  const years = Array.from({ length: new Date().getFullYear() - 1995 }, (_, i) => (new Date().getFullYear() - i).toString());

  // ── Accès refusé ─────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="admin-page page-enter">
        <div style={{
          maxWidth: 420, margin: '80px auto', textAlign: 'center',
          background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)',
          borderRadius: 16, padding: '40px 32px',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>&#128274;</div>
          <h2 style={{ color: clr.crimson, fontFamily: 'Space Grotesk, sans-serif', margin: '0 0 8px' }}>
            Acces refuse
          </h2>
          <p style={{ color: clr.text2, marginTop: 8 }}>
            Cette page est reservee aux administrateurs.
          </p>
        </div>
      </div>
    );
  }

  const tabLabels: Record<AdminTab, string> = {
    scraping: 'Scraping',
    users:    'Utilisateurs',
    visite:   'Mode Visite',
    events:   'Evenements',
  };

  const tabCounts: Partial<Record<AdminTab, number>> = {
    users:  users.length   || undefined,
    visite: visiteList.length || undefined,
    events: dynEvents.length  || undefined,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="admin-page page-enter" style={{ paddingBottom: 60 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .admin-row-hover { transition: background 0.15s; }
        .admin-row-hover:hover { background: rgba(255,255,255,0.04) !important; }
        .admin-tab-btn { transition: color 0.2s, border-color 0.2s, background 0.2s; }
        .admin-tab-btn:hover { color: #F1F5F9 !important; }
        .admin-input-ds {
          width: 100%;
          padding: 9px 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 9px;
          color: #F1F5F9;
          font-size: 0.85rem;
          font-family: Inter, sans-serif;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .admin-input-ds:focus { border-color: rgba(99,102,241,0.5); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        .admin-input-ds::placeholder { color: #475569; }
        .admin-select-ds {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          padding: 7px 10px;
          color: #F1F5F9;
          font-size: 0.83rem;
          font-family: Inter, sans-serif;
          cursor: pointer;
          outline: none;
          transition: border-color 0.2s;
        }
        .admin-select-ds:focus { border-color: rgba(99,102,241,0.5); }
        .admin-select-ds:disabled { opacity: 0.4; cursor: not-allowed; }
        @media (max-width: 640px) {
          .users-grid { grid-template-columns: 1fr 1fr auto !important; }
          .users-grid .col-date,
          .users-grid .col-verified { display: none !important; }
        }
      `}</style>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: '1.5rem', fontWeight: 700,
            fontFamily: 'Space Grotesk, sans-serif', color: clr.text1,
            letterSpacing: '-0.02em',
          }}>
            Administration
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: clr.text3 }}>
            Panneau de gestion Cepage V5
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StatusBadge online={backendOnline} checking={backendChecking} />
          <Btn onClick={() => refreshBackendStatus(true)} variant="ghost" style={{ padding: '5px 10px', minWidth: 36, justifyContent: 'center' }}>
            &#8635;
          </Btn>
        </div>
      </div>

      {/* ── Stats DB ─────────────────────────────────────────────────────────── */}
      {backendOnline && stats && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 10, marginBottom: 22,
        }}>
          <StatCard label="Producteurs" value={stats.producers.toLocaleString('fr')} color={clr.indigo} />
          <StatCard label="Millesimes"  value={stats.vintages.toLocaleString('fr')}  color={clr.violet} />
          <StatCard
            label="Scrapling"
            value={backendStatus?.scrapling ? 'Actif' : 'Fallback'}
            color={backendStatus?.scrapling ? clr.emerald : clr.amber}
          />
          <StatCard
            label="Dernier scraping"
            value={lastScrape ? new Date(lastScrape.started_at).toLocaleDateString('fr') : 'Jamais'}
            color={clr.rose}
          />
        </div>
      )}

      {/* ── Card principale avec onglets ─────────────────────────────────────── */}
      <div style={{
        background: 'rgba(255,255,255,0.015)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 18,
        overflow: 'hidden',
      }}>

        {/* Barre d'onglets */}
        <div style={{
          display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
          padding: '0 4px',
        }}>
          {(['scraping', 'users', 'visite', 'events'] as AdminTab[]).map(tab => {
            const active = adminTab === tab;
            return (
              <button
                key={tab}
                className="admin-tab-btn"
                onClick={() => setAdminTab(tab)}
                style={{
                  padding: '13px 20px',
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.85rem',
                  fontFamily: 'Space Grotesk, sans-serif',
                  flexShrink: 0, whiteSpace: 'nowrap',
                  color: active ? clr.text1 : clr.text3,
                  borderBottom: active ? `2px solid ${clr.indigo}` : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {tabLabels[tab]}
                {tabCounts[tab] !== undefined && (
                  <span style={{
                    marginLeft: 7, fontSize: '0.72rem', padding: '1px 7px',
                    borderRadius: 10,
                    background: active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
                    color: active ? '#a5b4fc' : clr.text3, fontWeight: 600,
                  }}>
                    {tabCounts[tab]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Contenu onglets ──────────────────────────────────────────────────── */}
        <div style={{ padding: '24px 20px' }}>

          {/* ═══════════════════════════════════════ SCRAPING ══════════════ */}
          {adminTab === 'scraping' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {!backendOnline && (
                <Alert type="warn">
                  <div>
                    <strong>Backend non demarre</strong> — lancez le backend local pour activer le scraping :<br />
                    <code style={{ display: 'block', marginTop: 8, padding: '8px 12px', background: 'rgba(0,0,0,0.4)', borderRadius: 7, fontSize: '0.83rem', color: '#67e8f9', fontFamily: 'monospace' }}>
                      cd backend &amp;&amp; node src/server.js
                    </code>
                  </div>
                </Alert>
              )}

              {/* Scraping complet */}
              <Card style={{ border: '1px solid rgba(99,102,241,0.18)', background: 'rgba(99,102,241,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <p style={{ color: clr.text1, fontWeight: 600, margin: '0 0 4px', fontSize: '0.9rem' }}>
                      Scraping complet — Toute la base (1996 a aujourd'hui)
                    </p>
                    <p style={{ color: clr.text3, fontSize: '0.8rem', margin: 0 }}>
                      Toutes les regions, producteurs et millesimes. Duree estimee : 2 a 6h.
                    </p>
                  </div>
                  <Btn onClick={handleScrapeFull} disabled={!backendOnline || !!scrapingNow} variant="default">
                    {scrapingNow ? <><Spinner /> En cours...</> : 'Lancer scraping complet'}
                  </Btn>
                </div>
              </Card>

              {/* Sélecteur année du Guide */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '10px 12px', background: 'rgba(255,255,255,0.025)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ color: 'rgba(245,245,220,0.7)', fontSize: '0.85rem' }}>
                  Année du guide :
                </span>
                <select
                  value={guideYear}
                  onChange={e => setGuideYear(Number(e.target.value))}
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 8,
                    color: '#FCD34D',
                    padding: '6px 12px',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <option value={2024}>Guide 2024</option>
                  <option value={2025}>Guide 2025</option>
                  <option value={2026}>Guide 2026 (actuel)</option>
                  <option value={2027}>Guide 2027</option>
                </select>
              </div>

              {/* MaJ millesime */}
              <Card style={{ border: '1px solid rgba(16,185,129,0.15)', background: 'rgba(16,185,129,0.03)' }}>
                <p style={{ color: clr.emerald, fontWeight: 600, margin: '0 0 4px', fontSize: '0.9rem' }}>
                  Mise a jour millesime
                </p>
                <p style={{ color: clr.text3, fontSize: '0.8rem', margin: '0 0 12px' }}>
                  Scrape uniquement le millesime selectionne. Duree : 20 a 45 min.
                </p>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={scrapYear}
                    onChange={e => setScrapYear(e.target.value)}
                    className="admin-select-ds"
                    style={{ minWidth: 100 }}
                  >
                    {years.map(y => <option key={y} value={y} style={{ background: '#12121e' }}>{y}</option>)}
                  </select>
                  <Btn onClick={handleScrapeYear} disabled={!backendOnline || !!scrapingNow} variant="success">
                    {scrapingNow ? <><Spinner /> En cours...</> : `Lancer MaJ ${scrapYear}`}
                  </Btn>
                </div>
              </Card>

              {/* Corriger regions */}
              <Card style={{ border: '1px solid rgba(245,158,11,0.15)', background: 'rgba(245,158,11,0.03)' }}>
                <p style={{ color: clr.amber, fontWeight: 600, margin: '0 0 4px', fontSize: '0.9rem' }}>
                  Corriger les regions
                </p>
                <p style={{ color: clr.text3, fontSize: '0.8rem', margin: '0 0 12px' }}>
                  Peuple la colonne region des producteurs. A lancer apres scraping complet. Duree : 30 a 60 min.
                </p>
                <Btn onClick={handleBackfillRegions} disabled={!backendOnline || !!scrapingNow} variant="amber">
                  {scrapingNow ? <><Spinner /> En cours...</> : 'Corriger les regions'}
                </Btn>
              </Card>

              {/* Options avancees */}
              <details style={{ borderRadius: 12, overflow: 'hidden' }}>
                <summary style={{
                  cursor: 'pointer', color: clr.text3, fontSize: '0.82rem',
                  padding: '10px 14px', userSelect: 'none',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10,
                  listStyle: 'none',
                }}>
                  &#9654; Options avancees
                </summary>
                <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Card>
                    <p style={{ color: clr.text2, fontWeight: 600, margin: '0 0 6px', fontSize: '0.85rem' }}>
                      Scraper les producteurs (listing)
                    </p>
                    <p style={{ color: clr.text3, fontSize: '0.78rem', margin: '0 0 10px' }}>
                      Scrape les pages /producteurs/. Duree : 1 a 3h.
                    </p>
                    <Btn onClick={handleScrapeProducers} disabled={!backendOnline || !!scrapingNow} variant="ghost">
                      Scraper producteurs
                    </Btn>
                  </Card>
                  <Card>
                    <p style={{ color: clr.text2, fontWeight: 600, margin: '0 0 6px', fontSize: '0.85rem' }}>
                      Corriger les etoiles Guide 2026+
                    </p>
                    <p style={{ color: clr.text3, fontSize: '0.78rem', margin: '0 0 10px' }}>
                      Recupere les etoiles masquees depuis les pages detail.
                    </p>
                    <Btn onClick={handleFixGuideStars} disabled={!backendOnline || !!scrapingNow} variant="ghost">
                      Corriger etoiles
                    </Btn>
                  </Card>
                  <Card style={{ border: '1px solid rgba(244,63,94,0.18)' }}>
                    <p style={{ color: clr.crimson, fontWeight: 600, margin: '0 0 6px', fontSize: '0.85rem' }}>
                      Vider les producteurs
                    </p>
                    <p style={{ color: clr.text3, fontSize: '0.78rem', margin: '0 0 10px' }}>
                      Vide la table producers. Relancez un scraping par annee ensuite.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Btn
                        onClick={handleClearProducers}
                        disabled={!backendOnline || !!scrapingNow || repairStatus === 'loading'}
                        variant="danger"
                      >
                        {repairStatus === 'loading' ? <><Spinner /> Nettoyage...</> : 'Vider'}
                      </Btn>
                      {repairStatus === 'done' && <span style={{ color: clr.emerald, fontSize: '0.8rem' }}>Table videe</span>}
                    </div>
                  </Card>
                </div>
              </details>

              {/* Barre SSE */}
              {scrapeProgress && (
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: clr.text1, fontWeight: 600, fontSize: '0.88rem' }}>{scrapeProgress.phase}</span>
                    <span style={{ color: clr.text2, fontSize: '0.82rem' }}>{scrapeProgress.percent}%</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      width: `${scrapeProgress.percent}%`,
                      background: `linear-gradient(90deg, ${clr.violet}, ${clr.indigo})`,
                      transition: 'width 0.5s ease',
                      boxShadow: `0 0 12px rgba(99,102,241,0.4)`,
                    }} />
                  </div>
                  <p style={{ color: clr.text3, fontSize: '0.8rem', margin: 0 }}>
                    {scrapeProgress.detail}
                    {scrapeProgress.producers > 0 && ` · ${scrapeProgress.producers.toLocaleString('fr')} producteurs`}
                    {scrapeProgress.vintages > 0 && ` · ${scrapeProgress.vintages.toLocaleString('fr')} millesimes`}
                  </p>
                  {scrapeProgress.error && (
                    <p style={{ color: clr.crimson, fontSize: '0.8rem', marginTop: 6 }}>{scrapeProgress.error}</p>
                  )}
                </Card>
              )}

              {sseError && <Alert type="error">{sseError}</Alert>}

              {lastScrape && (
                <div style={{
                  fontSize: '0.78rem', color: clr.text3,
                  padding: '10px 14px', background: 'rgba(255,255,255,0.02)',
                  borderRadius: 9, border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                }}>
                  <span>Dernier scraping :</span>
                  <strong style={{ color: clr.text2 }}>{lastScrape.scrape_type}</strong>
                  <span>{new Date(lastScrape.started_at).toLocaleString('fr')}</span>
                  <span style={{ color: lastScrape.status === 'done' ? clr.emerald : clr.amber, fontWeight: 600 }}>
                    {lastScrape.status === 'done' ? 'Succes' : lastScrape.status}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════ UTILISATEURS ═══════════ */}
          {adminTab === 'users' && (
            <div>
              {/* Header + controles */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <h3 style={{ margin: 0, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: clr.text1, fontSize: '1rem' }}>
                  Utilisateurs inscrits
                  {users.length > 0 && (
                    <span style={{ marginLeft: 8, fontSize: '0.8rem', color: clr.text3, fontWeight: 400 }}>
                      ({users.length} total)
                    </span>
                  )}
                </h3>
                <Btn onClick={loadUsers} disabled={usersLoading} variant="ghost" style={{ padding: '6px 14px' }}>
                  {usersLoading ? <><Spinner /> Chargement...</> : <><span>&#8635;</span> Actualiser</>}
                </Btn>
              </div>

              {/* Barre de recherche */}
              <div style={{ marginBottom: 14 }}>
                <input
                  className="admin-input-ds"
                  type="text"
                  placeholder="Rechercher un utilisateur (nom ou email)..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  style={{ maxWidth: 400 }}
                />
              </div>

              {usersError && (
                <div style={{ marginBottom: 14 }}>
                  <Alert type="error">{usersError}</Alert>
                </div>
              )}

              {/* Etat chargement initial */}
              {usersLoading && users.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: clr.text3 }}>
                  <Spinner size={20} />
                  <p style={{ marginTop: 12, fontSize: '0.85rem' }}>Chargement des utilisateurs...</p>
                </div>
              ) : (
                <>
                  {/* En-tetes */}
                  <div
                    className="users-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 100px 110px 80px 100px',
                      gap: 8,
                      padding: '8px 14px',
                      fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em',
                      color: clr.text3, textTransform: 'uppercase',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      marginBottom: 6,
                    }}
                  >
                    <span>Utilisateur</span>
                    <span>Email</span>
                    <span>Role</span>
                    <span className="col-date">Inscrit le</span>
                    <span className="col-verified">Verifie</span>
                    <span>Actions</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {visibleUsers.map(u => {
                      const isCurrentUser = currentUserId && u.id === currentUserId;

                      return (
                        <div
                          key={u.id}
                          className="admin-row-hover users-grid"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 100px 110px 80px 100px',
                            gap: 8,
                            padding: '10px 14px',
                            borderRadius: 10,
                            background: isCurrentUser ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.015)',
                            border: `1px solid ${isCurrentUser ? 'rgba(99,102,241,0.18)' : 'transparent'}`,
                            alignItems: 'center',
                          }}
                        >
                          {/* Nom */}
                          <div style={{ minWidth: 0 }}>
                            <div style={{
                              fontWeight: 600, fontSize: '0.85rem', color: clr.text1,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              display: 'flex', alignItems: 'center', gap: 6,
                            }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {u.display_name || '(sans nom)'}
                              </span>
                              {isCurrentUser && (
                                <span style={{
                                  fontSize: '0.68rem', color: '#a5b4fc',
                                  background: 'rgba(99,102,241,0.18)', padding: '1px 6px',
                                  borderRadius: 5, fontWeight: 700, flexShrink: 0,
                                }}>
                                  vous
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Email */}
                          <div style={{
                            fontSize: '0.78rem', color: clr.text2,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {u.email}
                          </div>

                          {/* Role */}
                          <div>
                            {isCurrentUser ? (
                              <RoleBadge role={u.role} />
                            ) : (
                              <div style={{ position: 'relative' }}>
                                <select
                                  value={u.role}
                                  onChange={e => handleRoleChange(u.id, e.target.value)}
                                  disabled={roleChanging === u.id}
                                  className="admin-select-ds"
                                  style={{
                                    width: '100%', padding: '5px 8px', fontSize: '0.78rem',
                                    opacity: roleChanging === u.id ? 0.5 : 1,
                                  }}
                                >
                                  <option value="user"    style={{ background: '#12121e' }}>Utilisateur</option>
                                  <option value="premium" style={{ background: '#12121e' }}>Premium</option>
                                  <option value="admin"   style={{ background: '#12121e' }}>Admin</option>
                                </select>
                                {roleChanging === u.id && (
                                  <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
                                    <Spinner size={12} />
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Date inscription */}
                          <div className="col-date" style={{ fontSize: '0.76rem', color: clr.text3 }}>
                            {new Date(u.created_at).toLocaleDateString('fr')}
                          </div>

                          {/* Email verifie */}
                          <div className="col-verified" style={{ textAlign: 'center' }}>
                            <span style={{
                              fontSize: '0.73rem', fontWeight: 700,
                              color: u.email_verified ? clr.emerald : clr.amber,
                              background: u.email_verified ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                              padding: '2px 8px', borderRadius: 6,
                              border: `1px solid ${u.email_verified ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
                            }}>
                              {u.email_verified ? 'Oui' : 'Non'}
                            </span>
                          </div>

                          {/* Actions */}
                          <div>
                            {!isCurrentUser && (
                              <Btn
                                onClick={() => setDeleteConfirm(u.id)}
                                variant="danger"
                                style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                              >
                                Supprimer
                              </Btn>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {usersHasMore && <div ref={usersSentinelRef} style={{ height: 1 }} />}

                    {filteredUsers.length === 0 && !usersLoading && (
                      <div style={{
                        textAlign: 'center', padding: '30px 0', color: clr.text3,
                        fontSize: '0.85rem',
                      }}>
                        {userSearch ? `Aucun utilisateur trouvé pour "${userSearch}"` : 'Aucun utilisateur inscrit.'}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Creer un compte utilisateur */}
              <div style={{ marginTop: 28, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 22 }}>
                <h4 style={{
                  color: clr.text2, fontSize: '0.88rem', margin: '0 0 16px',
                  fontWeight: 700, letterSpacing: '0.03em', fontFamily: 'Space Grotesk, sans-serif',
                }}>
                  Creer un compte utilisateur
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: '0.73rem', color: clr.text3, display: 'block', marginBottom: 4 }}>Nom affiche</label>
                    <input
                      className="admin-input-ds"
                      type="text"
                      placeholder="Test User"
                      value={testForm.displayName}
                      onChange={e => setTestForm(f => ({ ...f, displayName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.73rem', color: clr.text3, display: 'block', marginBottom: 4 }}>Email (auto si vide)</label>
                    <input
                      className="admin-input-ds"
                      type="text"
                      placeholder="test@test.local"
                      value={testForm.email}
                      onChange={e => setTestForm(f => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.73rem', color: clr.text3, display: 'block', marginBottom: 4 }}>Role</label>
                    <select
                      value={testForm.role}
                      onChange={e => setTestForm(f => ({ ...f, role: e.target.value }))}
                      className="admin-select-ds"
                      style={{ width: '100%' }}
                    >
                      <option value="user">Utilisateur</option>
                      <option value="premium">Premium</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Btn onClick={handleCreateTestAccount} disabled={testCreating} variant="default">
                    {testCreating ? <><Spinner /> Creation...</> : '+ Creer le compte'}
                  </Btn>
                </div>
                {testResult && (
                  <div style={{ marginTop: 12 }}>
                    <Alert type={testResult.ok ? 'success' : 'error'}>
                      {testResult.message}
                      {testResult.ok && testResult.password && (
                        <div style={{
                          marginTop: 8, fontFamily: 'monospace',
                          background: 'rgba(0,0,0,0.35)', padding: '7px 11px', borderRadius: 7,
                          fontSize: '0.85rem',
                        }}>
                          Mot de passe genere : <strong>{testResult.password}</strong>
                        </div>
                      )}
                    </Alert>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════ MODE VISITE ═══════════ */}
          {adminTab === 'visite' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Salons existants */}
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                  <SectionTitle>
                    Salons disponibles{' '}
                    <span style={{ fontSize: '0.78rem', color: clr.text3, fontWeight: 400 }}>
                      ({visiteList.length})
                    </span>
                  </SectionTitle>
                  <Btn onClick={loadVisiteList} disabled={visiteListLoading} variant="ghost" style={{ padding: '5px 12px', fontSize: '0.78rem' }}>
                    {visiteListLoading ? <><Spinner size={12} /> Chargement...</> : <><span>&#8635;</span> Rafraichir</>}
                  </Btn>
                </div>

                {visiteListLoading && visiteList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: clr.text3 }}>
                    <Spinner size={20} />
                  </div>
                ) : visiteList.length === 0 ? (
                  <p style={{ color: clr.text3, fontSize: '0.83rem', margin: 0 }}>
                    Aucun fichier exposants trouve dans frontend/public/.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {visiteList.map(s => (
                      <div key={s.file} style={{
                        padding: '12px 14px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 10,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: clr.text1, marginBottom: 4 }}>
                              {s.eventName || s.eventId}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 12px', fontSize: '0.75rem', color: clr.text3 }}>
                              {s.location && <span>&#128205; {s.location}</span>}
                              <span>{s.totalExposants} exposants</span>
                              <span style={{ color: clr.emerald }}>{s.matchesFound} matche{s.matchesFound !== 1 ? 's' : ''}</span>
                              {s.generatedAt && <span>Genere le {new Date(s.generatedAt).toLocaleDateString('fr')}</span>}
                              {s.fileSize && <span>{Math.round(s.fileSize / 1024)} Ko</span>}
                            </div>
                            {reloadResults[s.eventId] && (
                              <div style={{ marginTop: 6, fontSize: '0.75rem', color: clr.emerald }}>
                                {reloadResults[s.eventId]}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            <Btn
                              onClick={() => handleReloadSalon(s.eventId)}
                              disabled={reloadingId === s.eventId}
                              variant="ghost"
                              style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                            >
                              {reloadingId === s.eventId ? <><Spinner size={11} /> Rechargement...</> : 'Recharger'}
                            </Btn>
                            <Btn
                              onClick={() => setScrapeForm({
                                contentId: '',
                                eventId: s.eventId,
                                eventName: s.eventName || '',
                                location: s.location || '',
                                dates: s.dates || '',
                              })}
                              variant="amber"
                              style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                            >
                              Re-scraper
                            </Btn>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Detecter nouveaux salons */}
              <Card style={{ border: '1px solid rgba(34,211,238,0.12)', background: 'rgba(34,211,238,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: clr.cyan, fontWeight: 600, margin: '0 0 6px', fontSize: '0.9rem' }}>
                      Detecter nouveaux salons VI
                    </p>
                    <p style={{ color: clr.text3, fontSize: '0.8rem', margin: 0 }}>
                      Analyse vignerons-independants.com et retourne les salons non encore scrapes.
                    </p>
                  </div>
                  <Btn onClick={checkNewSalons} disabled={checkLoading} variant="cyan">
                    {checkLoading ? <><Spinner /> Verification...</> : 'Verifier maintenant'}
                  </Btn>
                </div>

                {checkDone && !checkLoading && (
                  <div style={{ marginTop: 16 }}>
                    {newSalons.length === 0 ? (
                      <Alert type="success">Tous les salons detectes sont deja scrapes.</Alert>
                    ) : (
                      <>
                        <p style={{ color: clr.text2, fontSize: '0.82rem', marginBottom: 10 }}>
                          {newSalons.length} nouveau{newSalons.length > 1 ? 'x' : ''} salon{newSalons.length > 1 ? 's' : ''} trouve{newSalons.length > 1 ? 's' : ''} :
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                          {newSalons.map(s => (
                            <div key={s.slug} style={{
                              padding: '10px 13px', background: 'rgba(255,255,255,0.02)',
                              border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9,
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
                            }}>
                              <div>
                                <span style={{ fontWeight: 600, fontSize: '0.83rem', color: clr.text1 }}>
                                  {s.title || s.slug}
                                </span>
                                <code style={{ color: clr.text3, fontSize: '0.72rem', marginLeft: 8 }}>
                                  {s.eventId}
                                </code>
                                {s.warning && (
                                  <span style={{ color: clr.amber, fontSize: '0.72rem', marginLeft: 8 }}>
                                    &#9888; {s.warning}
                                  </span>
                                )}
                              </div>
                              <Btn
                                onClick={() => setScrapeForm({
                                  contentId: s.contentId ? String(s.contentId) : '',
                                  eventId: `vi-${s.slug}`,
                                  eventName: `Salon VI - ${s.slug}`,
                                  location: '', dates: '',
                                })}
                                variant="amber"
                                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                              >
                                Preselectionner
                              </Btn>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </Card>

              {/* Formulaire scraping salon */}
              <Card>
                <p style={{ color: clr.text1, fontWeight: 600, margin: '0 0 16px', fontSize: '0.9rem' }}>
                  Scraper un salon VI
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                  {([
                    { key: 'contentId', label: 'Content ID (VI)', placeholder: 'ex: 297' },
                    { key: 'eventId',   label: 'Event ID',        placeholder: 'vi-bordeaux-2026' },
                    { key: 'eventName', label: 'Nom du salon',    placeholder: 'Salon VI Bordeaux 2026' },
                    { key: 'location',  label: 'Lieu',            placeholder: 'Bordeaux Lac Hall 3' },
                    { key: 'dates',     label: 'Dates',           placeholder: '13-15 mars 2026' },
                  ] as const).map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: '0.73rem', color: clr.text3, display: 'block', marginBottom: 4 }}>
                        {f.label}
                        {(f.key === 'contentId' || f.key === 'eventId') && (
                          <span style={{ color: clr.crimson, marginLeft: 2 }}>*</span>
                        )}
                      </label>
                      <input
                        className="admin-input-ds"
                        value={scrapeForm[f.key as keyof typeof scrapeForm]}
                        onChange={e => setScrapeForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Btn
                    onClick={runScrape}
                    disabled={scrapeRunning || !scrapeForm.contentId || !scrapeForm.eventId}
                    variant="amber"
                  >
                    {scrapeRunning ? <><Spinner /> Scraping en cours...</> : 'Lancer le scraping'}
                  </Btn>
                  {scrapeResult && (
                    <Alert type={scrapeResult.ok ? 'success' : 'error'}>
                      {scrapeResult.message}
                    </Alert>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* ═════════════════════════════════════════ EVENEMENTS ══════════ */}
          {adminTab === 'events' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Scraping Medoc */}
              <Card style={{ border: '1px solid rgba(244,63,94,0.15)', background: 'rgba(244,63,94,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: clr.text1, fontWeight: 600, margin: '0 0 4px', fontSize: '0.9rem' }}>
                      Mode Visite — Portes Ouvertes du Medoc
                    </p>
                    <p style={{ color: clr.text3, fontSize: '0.8rem', margin: '0 0 10px' }}>
                      Scrape les chateaux depuis portesouvertesenmedoc.fr.
                    </p>
                    <Alert type="warn">
                      <div>
                        <strong>Local uniquement</strong> — ce script ne peut pas ecrire sur Render.
                        Lancez en local puis deployez le JSON.<br />
                        <code style={{
                          display: 'block', marginTop: 6,
                          fontFamily: 'monospace', fontSize: '0.78rem',
                          background: 'rgba(0,0,0,0.35)', padding: '5px 9px', borderRadius: 6, color: '#67e8f9',
                        }}>
                          python scrape_medoc.py --event-id po-medoc-2026
                        </code>
                      </div>
                    </Alert>
                  </div>
                  <Btn onClick={scrapeMedoc} disabled={medocScraping} variant="danger" style={{ flexShrink: 0 }}>
                    {medocScraping ? <><Spinner /> Scraping...</> : 'Scraper le Medoc'}
                  </Btn>
                </div>
                {medocResult && (
                  <div style={{ marginTop: 12 }}>
                    <Alert type={medocResult.ok ? 'success' : 'error'}>{medocResult.message}</Alert>
                  </div>
                )}
              </Card>

              {/* Liste evenements */}
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                  <SectionTitle>
                    Evenements dynamiques{' '}
                    <span style={{ fontSize: '0.78rem', color: clr.text3, fontWeight: 400 }}>
                      ({dynEvents.length})
                    </span>
                  </SectionTitle>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn onClick={loadDynEvents} disabled={eventsLoading} variant="ghost" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                      {eventsLoading ? <><Spinner size={12} /></> : <span>&#8635;</span>} Actualiser
                    </Btn>
                    <Btn
                      onClick={() => {
                        setEventForm({ category: 'salon' });
                        setSaveResult(null);
                        setShowEventModal(true);
                      }}
                      variant="success"
                      style={{ padding: '6px 14px', fontSize: '0.83rem' }}
                    >
                      + Ajouter evenement
                    </Btn>
                  </div>
                </div>

                {eventsLoading && dynEvents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: clr.text3 }}>
                    <Spinner size={20} />
                  </div>
                ) : dynEvents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <p style={{ color: clr.text3, fontSize: '0.83rem', margin: '0 0 12px' }}>
                      Aucun evenement dynamique.
                    </p>
                    <Btn
                      onClick={() => {
                        setEventForm({ category: 'salon' });
                        setSaveResult(null);
                        setShowEventModal(true);
                      }}
                      variant="success"
                    >
                      + Creer le premier evenement
                    </Btn>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* En-tetes */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 160px 140px 110px',
                      gap: 8, padding: '6px 12px',
                      fontSize: '0.71rem', fontWeight: 700, color: clr.text3,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <span>Titre / ID</span>
                      <span>Lieu</span>
                      <span>Dates</span>
                      <span>Actions</span>
                    </div>

                    {dynEvents.map(ev => (
                      <div
                        key={ev.id}
                        className="admin-row-hover"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 160px 140px 110px',
                          gap: 8, padding: '10px 12px',
                          background: 'rgba(255,255,255,0.015)',
                          border: '1px solid transparent',
                          borderRadius: 10, alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: clr.text1, marginBottom: 2 }}>
                            {ev.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: clr.text3 }}>
                            <code>{ev.id}</code>
                            {ev.category && (
                              <span style={{
                                marginLeft: 8, fontSize: '0.68rem', padding: '1px 6px',
                                borderRadius: 5, background: 'rgba(99,102,241,0.12)',
                                color: '#a5b4fc', fontWeight: 600, textTransform: 'capitalize',
                              }}>
                                {ev.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: clr.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.location || <span style={{ color: clr.text3 }}>—</span>}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: clr.text3 }}>
                          {ev.dates || <span>—</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <Btn
                            onClick={() => { setEventForm(ev); setSaveResult(null); setShowEventModal(true); }}
                            variant="ghost"
                            style={{ padding: '4px 10px', fontSize: '0.73rem' }}
                          >
                            Editer
                          </Btn>
                          <Btn
                            onClick={() => setEventDeleteId(ev.id)}
                            variant="danger"
                            style={{ padding: '4px 10px', fontSize: '0.73rem' }}
                          >
                            Supp.
                          </Btn>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

        </div>{/* fin padding contenu */}
      </div>{/* fin card principale */}

      {/* ══════════════════════════ MODALS ═══════════════════════════════════ */}

      {/* Modal confirmation suppression user */}
      {deleteConfirm && (() => {
        const target = users.find(u => u.id === deleteConfirm);
        return (
          <Modal
            onClose={() => !deleteLoading && setDeleteConfirm(null)}
            maxWidth={420}
            borderColor="rgba(244,63,94,0.3)"
          >
            <h3 style={{
              color: clr.crimson, fontFamily: 'Space Grotesk, sans-serif',
              margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 700,
            }}>
              Supprimer le compte ?
            </h3>
            {target && (
              <div style={{
                background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)',
                borderRadius: 10, padding: '12px 14px', marginBottom: 16,
              }}>
                <p style={{ color: clr.text1, fontWeight: 600, fontSize: '0.9rem', margin: '0 0 4px' }}>
                  {target.display_name || '(sans nom)'}
                </p>
                <p style={{ color: clr.text2, fontSize: '0.8rem', margin: 0 }}>
                  {target.email}
                </p>
              </div>
            )}
            <p style={{ color: clr.text2, fontSize: '0.85rem', lineHeight: 1.6, margin: '0 0 24px' }}>
              Cette action est <strong style={{ color: clr.crimson }}>irreversible</strong>.
              Le compte, ses favoris et ses tokens seront definiticement supprimes.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn onClick={() => setDeleteConfirm(null)} disabled={deleteLoading} variant="ghost">
                Annuler
              </Btn>
              <Btn
                onClick={() => handleDeleteUser(deleteConfirm)}
                disabled={deleteLoading}
                variant="danger"
              >
                {deleteLoading ? <><Spinner /> Suppression...</> : 'Supprimer definitivement'}
              </Btn>
            </div>
          </Modal>
        );
      })()}

      {/* Modal confirmation suppression evenement */}
      {eventDeleteId && (() => {
        const target = dynEvents.find(e => e.id === eventDeleteId);
        return (
          <Modal
            onClose={() => !eventDeleteLoading && setEventDeleteId(null)}
            maxWidth={380}
            borderColor="rgba(244,63,94,0.3)"
          >
            <h3 style={{
              color: clr.crimson, fontFamily: 'Space Grotesk, sans-serif',
              margin: '0 0 10px', fontSize: '1.05rem', fontWeight: 700,
            }}>
              Supprimer l'evenement ?
            </h3>
            {target && (
              <div style={{
                background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 16,
              }}>
                <p style={{ color: clr.text1, fontWeight: 600, fontSize: '0.88rem', margin: '0 0 3px' }}>
                  {target.title}
                </p>
                <p style={{ color: clr.text3, fontSize: '0.75rem', margin: 0 }}>
                  <code>{target.id}</code>
                </p>
              </div>
            )}
            <p style={{ color: clr.text2, fontSize: '0.83rem', margin: '0 0 20px' }}>
              L'evenement sera supprime du fichier events_dynamic.json. Cette action est irreversible.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn onClick={() => setEventDeleteId(null)} disabled={eventDeleteLoading} variant="ghost">
                Annuler
              </Btn>
              <Btn
                onClick={() => handleDeleteEvent(eventDeleteId)}
                disabled={eventDeleteLoading}
                variant="danger"
              >
                {eventDeleteLoading ? <><Spinner /> Suppression...</> : 'Supprimer'}
              </Btn>
            </div>
          </Modal>
        );
      })()}

      {/* Modal creation / edition evenement */}
      {showEventModal && (
        <Modal
          onClose={() => !savingEvent && setShowEventModal(false)}
          maxWidth={520}
          borderColor="rgba(99,102,241,0.25)"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{
              color: clr.text1, fontFamily: 'Space Grotesk, sans-serif',
              margin: 0, fontSize: '1.1rem', fontWeight: 700,
            }}>
              {eventForm.id && dynEvents.some(e => e.id === eventForm.id)
                ? 'Modifier l\'evenement'
                : 'Ajouter un evenement'}
            </h3>
            <button
              onClick={() => !savingEvent && setShowEventModal(false)}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, color: clr.text3, cursor: 'pointer',
                width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', lineHeight: 1,
              }}
            >
              &times;
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {(([
              { key: 'id',          label: 'ID unique',              placeholder: 'salon-bordeaux-2026', required: true },
              { key: 'title',       label: 'Titre',                  placeholder: 'Nom de l\'evenement', required: true },
              { key: 'dates',       label: 'Dates (texte libre)',     placeholder: '28 & 29 mars 2026',  required: false },
              { key: 'dateEnd',     label: 'Date fin (YYYY-MM-DD)',   placeholder: '2026-03-29',          required: false },
              { key: 'location',    label: 'Lieu',                   placeholder: 'Bordeaux, Gironde',   required: false },
              { key: 'description', label: 'Description courte',     placeholder: 'Description...',      required: false },
              { key: 'image',       label: 'Image URL',              placeholder: 'https://...',         required: false },
              { key: 'sourceUrl',   label: 'URL source',             placeholder: 'https://...',         required: false },
            ] as Array<{ key: string; label: string; placeholder: string; required: boolean }>)).map(f => (
              <div key={f.key}>
                <label style={{ fontSize: '0.73rem', color: clr.text3, display: 'block', marginBottom: 4 }}>
                  {f.label}
                  {f.required && <span style={{ color: clr.crimson, marginLeft: 2 }}>*</span>}
                </label>
                <input
                  className="admin-input-ds"
                  value={(eventForm as Record<string, string>)[f.key] || ''}
                  onChange={e => setEventForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                />
              </div>
            ))}

            <div>
              <label style={{ fontSize: '0.73rem', color: clr.text3, display: 'block', marginBottom: 4 }}>
                Categorie
              </label>
              <select
                value={(eventForm as Record<string, string>).category || 'salon'}
                onChange={e => setEventForm(prev => ({ ...prev, category: e.target.value }))}
                className="admin-select-ds"
                style={{ width: '100%' }}
              >
                <option value="salon"           style={{ background: '#12121e' }}>Salon</option>
                <option value="portes-ouvertes" style={{ background: '#12121e' }}>Portes Ouvertes</option>
                <option value="festival"        style={{ background: '#12121e' }}>Festival</option>
                <option value="professionnel"   style={{ background: '#12121e' }}>Professionnel</option>
              </select>
            </div>
          </div>

          {saveResult && (
            <div style={{ marginTop: 14 }}>
              <Alert type={saveResult.ok ? 'success' : 'error'}>{saveResult.message}</Alert>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <Btn onClick={() => setShowEventModal(false)} disabled={savingEvent} variant="ghost">
              Annuler
            </Btn>
            <Btn
              onClick={handleSaveEvent}
              disabled={savingEvent || !eventForm.id || !eventForm.title}
              variant="success"
            >
              {savingEvent ? <><Spinner /> Sauvegarde...</> : 'Sauvegarder'}
            </Btn>
          </div>
        </Modal>
      )}

    </div>
  );
}
