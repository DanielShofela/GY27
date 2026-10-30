import React from 'react';
import { Language } from '../types/index';
import { translations } from '../i18n/translations';
import { Shield, Sparkles, Globe, UserCheck } from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  currentPage: string;
  onNavigate: (page: string) => void;
  currentUser: User | null;
  isAdmin: boolean;
  onOpenAdminLogin: () => void;
  headerLogoUrl?: string;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onLanguageChange,
  currentPage,
  onNavigate,
  currentUser,
  isAdmin,
  onOpenAdminLogin,
  headerLogoUrl,
}) => {
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-40 bg-[#FFF3DD]/90 backdrop-blur-md border-b-2 border-[#111111] shadow-[0_4px_0_0_#111111]">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Brand / Logo official or customized header logo */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 text-left group cursor-pointer"
        >
          {/* Header logo display: Custom SVG if configured, or GYW badge fallback */}
          {headerLogoUrl && headerLogoUrl.trim() !== '' ? (
            <div className="h-10 sm:h-11 flex items-center justify-center shrink-0 transition-transform group-hover:-translate-y-0.5">
              <img
                src={headerLogoUrl}
                alt="Logo officiel GLORIOUS YOUTH 2027"
                className="h-9 sm:h-10 max-h-10 sm:max-h-11 w-auto max-w-[105px] xs:max-w-[125px] sm:max-w-[150px] object-contain select-none pointer-events-none"
                loading="eager"
              />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-xl bg-[#FF6A00] border-2 border-[#111111] shadow-[2px_2px_0_0_#111111] flex items-center justify-center text-white font-black text-xl tracking-tighter shrink-0 transition-transform group-hover:-translate-y-0.5">
              GYW
            </div>
          )}

          <div className="flex flex-col">
            <span className="font-extrabold text-[#111111] text-sm sm:text-base leading-tight tracking-tight uppercase font-['Space_Grotesk']">
              Glorious Youth
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-[#FF6A00] uppercase tracking-wider">
                6th Edition • 2027
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#2457FF]" />
              <span className="text-[9px] font-semibold text-gray-500">1–3 Jan</span>
            </div>
          </div>
        </button>

        {/* Right action group */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher */}
          <div className="flex items-center rounded-lg border-2 border-[#111111] bg-white p-0.5 shadow-[1px_1px_0_0_#111111]">
            <button
              onClick={() => onLanguageChange('fr')}
              className={`px-2 py-0.5 text-xs font-bold rounded cursor-pointer transition-colors ${
                lang === 'fr' ? 'bg-[#FF6A00] text-white' : 'text-[#111111] hover:bg-gray-100'
              }`}
            >
              FR
            </button>
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-2 py-0.5 text-xs font-bold rounded cursor-pointer transition-colors ${
                lang === 'en' ? 'bg-[#FF6A00] text-white' : 'text-[#111111] hover:bg-gray-100'
              }`}
            >
              EN
            </button>
          </div>

          {/* Quick Register button if on another page */}
          {currentPage !== 'register' && (
            <button
              onClick={() => onNavigate('register')}
              className="hidden xs:inline-flex items-center gap-1.5 bg-[#FF6A00] hover:bg-[#e05e00] text-white font-bold text-xs sm:text-sm px-3.5 py-1.5 rounded-lg border-2 border-[#111111] shadow-[2px_2px_0_0_#111111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === 'fr' ? 'S\'inscrire' : 'Register'}</span>
            </button>
          )}

          {/* Authenticated Admin quick indicator only (hidden for all public users) */}
          {currentUser && isAdmin && (
            <button
              onClick={() => onNavigate('admin')}
              className="inline-flex items-center gap-1.5 bg-[#2457FF] hover:bg-[#1a44d1] text-white text-xs font-bold px-3 py-1.5 rounded-lg border-2 border-[#111111] shadow-[2px_2px_0_0_#111111] cursor-pointer"
              title="Tableau de bord Admin"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
