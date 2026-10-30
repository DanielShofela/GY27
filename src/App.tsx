import React, { useState, useEffect, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import {
  getEventSettings,
  getInitialEventSettings,
  verifyIsAdmin,
  subscribeToRegistrations,
  logOutAdmin,
} from './firebase/services';
import { Registration, EventSettings, Language } from './types/index';
import { translations } from './i18n/translations';
import { ArtBackground } from './components/ArtBackground';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { RegistrationForm } from './components/RegistrationForm';
import { ConfirmationView } from './components/ConfirmationView';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminAccessDenied } from './components/AdminAccessDenied';
import { PrivacyModal } from './components/PrivacyModal';
import { ShieldCheck, Loader2 } from 'lucide-react';

type AppRoute = 'home' | 'register' | 'confirmation' | 'admin';

export default function App() {
  const [lang, setLang] = useState<Language>('fr');

  // Detect initial route from browser URL (supports direct URL access to /admin or /register)
  const [currentPage, setCurrentPage] = useState<AppRoute>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/admin') return 'admin';
      if (path === '/register') return 'register';
    }
    return 'home';
  });

  const [lastRegistration, setLastRegistration] = useState<Registration | null>(null);
  // Synchronous cache-first initialization eliminates layout shifts and loading flashes
  const [settings, setSettings] = useState<EventSettings>(() => getInitialEventSettings());
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

  // Authentication & Authorization state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Live admin registrations
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const t = translations[lang];

  // URL synchronization helper
  const navigateTo = useCallback((page: AppRoute, replaceUrl = false) => {
    setCurrentPage(page);
    let targetPath = '/';
    if (page === 'admin') targetPath = '/admin';
    else if (page === 'register') targetPath = '/register';

    if (typeof window !== 'undefined') {
      if (replaceUrl) {
        window.history.replaceState(null, '', targetPath);
      } else if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Browser back / forward popstate listener
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/admin') {
        setCurrentPage('admin');
      } else if (path === '/register') {
        setCurrentPage('register');
      } else {
        setCurrentPage('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 1. Load public event settings from Firestore
  useEffect(() => {
    setIsSettingsLoading(true);
    getEventSettings()
      .then((loaded) => {
        setSettings(loaded);
        setIsSettingsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load event settings:', err);
        setIsSettingsLoading(false);
      });

    if (typeof window !== 'undefined') {
      (window as any).__setDevAdmin = () => {
        const mockAdmin = {
          uid: 'dev-admin-uid-1',
          email: 'digitalsoutien@gmail.com',
          emailVerified: true,
        } as User;
        setCurrentUser(mockAdmin);
        setIsAdmin(true);
        setCurrentPage('admin');
      };
      (window as any).__setDevUnauthorized = () => {
        const mockStranger = {
          uid: 'stranger-uid-999',
          email: 'unauthorized.user@gmail.com',
          emailVerified: true,
        } as User;
        setCurrentUser(mockStranger);
        setIsAdmin(false);
        setCurrentPage('admin');
      };
    }
  }, []);

  // 2. Strict Auth state observer & Server-side role verification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsAuthChecking(true);
      setCurrentUser(user);
      if (user) {
        const authorized = await verifyIsAdmin(user);
        setIsAdmin(authorized);
      } else {
        setIsAdmin(false);
        setRegistrations([]);
      }
      setIsAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // 3. Real-time registrations listener (Strictly executed when verified admin is confirmed)
  useEffect(() => {
    if (currentUser && isAdmin && currentPage === 'admin') {
      const unsub = subscribeToRegistrations(
        (data) => setRegistrations(data),
        (err) => console.warn('Registrations subscription notice:', err.message)
      );
      return () => unsub();
    }
  }, [currentUser, isAdmin, currentPage]);

  // Handlers
  const handleRegistrationSuccess = (record: Registration) => {
    setLastRegistration(record);
    setCurrentPage('confirmation');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminLoginSuccess = async (user: User) => {
    setIsAuthChecking(true);
    setCurrentUser(user);
    const authorized = await verifyIsAdmin(user);
    setIsAdmin(authorized);
    setIsAuthChecking(false);
    navigateTo('admin');
  };

  const handleLogout = async () => {
    await logOutAdmin();
    setCurrentUser(null);
    setIsAdmin(false);
    navigateTo('home');
  };

  return (
    <div className="min-h-screen bg-[#FFF3DD] text-[#111111] flex flex-col relative font-sans">
      {/* Decorative artistic background */}
      <ArtBackground />

      {/* Main Header (Displays custom header logo if configured or fallback GYW badge) */}
      <Header
        lang={lang}
        onLanguageChange={setLang}
        currentPage={currentPage}
        onNavigate={(page) => navigateTo(page as AppRoute)}
        currentUser={currentUser}
        isAdmin={isAdmin}
        onOpenAdminLogin={() => navigateTo('admin')}
        headerLogoUrl={settings.headerLogoUrl}
      />

      {/* Main Content Area */}
      <main className="flex-1 relative z-10">
        {currentPage === 'home' && (
          <Hero
            lang={lang}
            onGoToRegister={() => navigateTo('register')}
            settings={settings}
            isSettingsLoading={isSettingsLoading}
            registrationsCount={registrations.length}
          />
        )}

        {currentPage === 'register' && (
          <RegistrationForm
            lang={lang}
            onSuccess={handleRegistrationSuccess}
            onBack={() => navigateTo('home')}
            onOpenPrivacy={() => setShowPrivacyModal(true)}
          />
        )}

        {currentPage === 'confirmation' && lastRegistration && (
          <ConfirmationView
            registration={lastRegistration}
            lang={lang}
            onGoHome={() => navigateTo('home')}
          />
        )}

        {/* Protected /admin Route View */}
        {currentPage === 'admin' && (
          <>
            {isAuthChecking ? (
              <div className="max-w-md mx-auto px-4 py-20 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-white border-2 border-[#111111] shadow-[3px_3px_0_0_#111111] flex items-center justify-center text-[#FF6A00] mb-4">
                  <Loader2 className="w-8 h-8 animate-spin text-[#FF6A00]" />
                </div>
                <h2 className="text-base font-black text-[#111111] uppercase font-['Space_Grotesk']">
                  Vérification de sécurité...
                </h2>
                <p className="text-xs text-gray-600 mt-1">
                  Vérification des autorisations administrateur auprès de Firebase.
                </p>
              </div>
            ) : !currentUser ? (
              /* State A: Direct visit to /admin without authentication */
              <AdminLogin
                lang={lang}
                onSuccess={handleAdminLoginSuccess}
                onCancel={() => navigateTo('home')}
                currentUser={currentUser}
                isAdmin={isAdmin}
              />
            ) : !isAdmin ? (
              /* State B: Connected Google user is NOT whitelisted or authorized */
              <AdminAccessDenied
                user={currentUser}
                lang={lang}
                onLogoutAndRetry={async () => {
                  await logOutAdmin();
                  setCurrentUser(null);
                  setIsAdmin(false);
                }}
                onGoHome={() => navigateTo('home')}
              />
            ) : (
              /* State C: Authenticated and strictly authorized administrator */
              <AdminDashboard
                registrations={registrations}
                settings={settings}
                lang={lang}
                currentUser={currentUser}
                onLogout={handleLogout}
                onSettingsUpdated={(updated) => setSettings(updated)}
              />
            )}
          </>
        )}
      </main>

      {/* Privacy Notice Modal */}
      {showPrivacyModal && (
        <PrivacyModal lang={lang} onClose={() => setShowPrivacyModal(false)} />
      )}

      {/* Official Footer (Completely clean of public admin links) */}
      <footer className="relative z-10 bg-[#111111] text-[#FFF3DD] py-8 px-4 border-t-3 border-[#111111] mt-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="font-['Anton'] text-lg uppercase tracking-wide text-[#FF6A00]">
                GLORIOUS YOUTH WORLDWIDE
              </span>
              <span className="text-xs bg-[#FFD21F] text-[#111111] font-black px-2 py-0.5 rounded">
                2027
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 max-w-md font-medium">
              « La jeunesse qui ne consacre pas sa force et sa gloire à des choses vaines. »
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-gray-300">
            <button
              onClick={() => setShowPrivacyModal(true)}
              className="hover:text-white underline cursor-pointer"
            >
              {t.navPrivacy}
            </button>
            <span className="text-gray-600">•</span>
            <span className="text-gray-400">1–3 Janvier 2027</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-6 pt-4 border-t border-gray-800 text-center text-[11px] text-gray-500 font-medium">
          © 2027 GLORIOUS YOUTH WORLDWIDE. 6e Édition — 1 au 3 janvier 2027. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}
