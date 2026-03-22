import type { Page } from '../../types';
import type { AuthUser } from '../../lib/auth';
import type { WineEvent } from '../../lib/events';
import type { useSearch } from '../../hooks/useSearch';
import type { useCompare } from '../../hooks/useCompare';

import HomePage from '../../pages/HomePage';
import SearchPage from '../../pages/SearchPage';
import EventsPage from '../../pages/EventsPage';
import VisitePage from '../../pages/VisitePage';
import FavoritesPage from '../../pages/FavoritesPage';
import AdminPage from '../../pages/AdminPage';
import AccountPage from '../../pages/AccountPage';
import LoginPage from '../../pages/LoginPage';
import RegisterPage from '../../pages/RegisterPage';
import VerifyEmailPage from '../../pages/VerifyEmailPage';
import ResetPasswordPage from '../../pages/ResetPasswordPage';
import SelectionSommelierPage from '../../pages/SelectionSommelierPage';

type AccountTab = 'tasted' | 'liked' | 'favorite' | 'cellar' | 'settings' | 'visited';

interface Props {
  page: Page;
  pageKey: number;
  authUser: AuthUser | null;
  isAdmin: boolean;
  accountTab: AccountTab;
  accountPageKey: number;
  currentVisiteEventId: string;
  search: ReturnType<typeof useSearch>;
  compare: ReturnType<typeof useCompare>;
  urlToken: string;
  onNavigate: (p: Page) => void;
  onNavigateToVisite: (id?: string) => void;
  onLogin: (token: string, user: AuthUser) => void;
  onLogout: () => void;
  setHomeEventModal: (e: WineEvent | null) => void;
  onRefreshCategoryCounts: () => void;
}

export default function PageRouter({ page, pageKey, authUser, isAdmin, accountTab, accountPageKey, currentVisiteEventId, search, compare, urlToken, onNavigate, onNavigateToVisite, onLogin, onLogout, setHomeEventModal, onRefreshCategoryCounts }: Props) {
  return (
    <div key={pageKey}>
      {page === 'home' && !search.showVendange && (
        <HomePage onSearch={search.doSearch} onRegionSearch={search.doRegionSearch} onNavigate={onNavigate} onNavigateToVisite={onNavigateToVisite} setHomeEventModal={setHomeEventModal} />
      )}

      {page === 'search' && !search.showVendange && (
        <div style={{ opacity: search.showResults ? 1 : 0, transition: 'opacity 0.5s ease', minHeight: search.searched ? 'auto' : 0 }}>
          <SearchPage
            results={search.results} mainResults={search.mainResults} similarResults={search.similarResults}
            searched={search.searched} searching={search.searching} query={search.query}
            onSearch={search.doSearch} isRegion={search.isRegionSearch} searchError={search.searchError}
            compareList={compare.compareList} onCompare={compare.handleCompare}
            regionPage={search.regionPage} regionPages={search.regionPages} regionTotal={search.regionTotal}
            ocrVintage={search.ocrVintage} ocrWineName={search.ocrWineName}
            filterColor={search.filterColor} setFilterColor={search.setFilterColor}
            filterStars={search.filterStars} setFilterStars={search.setFilterStars}
            filterEffervescent={search.filterEffervescent} setFilterEffervescent={search.setFilterEffervescent}
          />
        </div>
      )}

      {page === 'favorites' && <FavoritesPage onSearch={search.doSearch} />}
      {page === 'events' && <EventsPage onNavigate={onNavigate} onNavigateToVisite={onNavigateToVisite} />}
      {page === 'visite' && <VisitePage eventId={currentVisiteEventId} onNavigate={onNavigate} />}
      {page === 'selection-sommelier' && <SelectionSommelierPage onNavigate={onNavigate} />}

      {page === 'login' && <LoginPage onLogin={onLogin} onNavigate={onNavigate} />}
      {page === 'register' && <RegisterPage onLogin={onLogin} onNavigate={onNavigate} />}
      {page === 'reset-password' && <ResetPasswordPage token={urlToken || undefined} onNavigate={onNavigate} />}
      {page === 'verify-email' && <VerifyEmailPage token={urlToken} onLogin={onLogin} onNavigate={onNavigate} />}

      {page === 'account' && authUser && (
        <AccountPage
          user={authUser} initialTab={accountTab} key={accountPageKey}
          onLogout={onLogout} onSearch={search.doSearch}
          onRefreshFavCount={() => {}} onRefreshCategoryCounts={onRefreshCategoryCounts}
        />
      )}

      {page === 'admin' && <AdminPage isAdmin={isAdmin} currentUserId={authUser?.id} />}
    </div>
  );
}
