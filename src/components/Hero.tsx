import React from 'react';
import { Language, EventSettings } from '../types/index';
import { translations } from '../i18n/translations';
import { Sparkles, Calendar, MapPin, Clock, Phone, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface HeroProps {
  lang: Language;
  onGoToRegister: () => void;
  settings: EventSettings;
  isSettingsLoading?: boolean;
  registrationsCount?: number;
}

export const Hero: React.FC<HeroProps> = ({
  lang,
  onGoToRegister,
  settings,
  isSettingsLoading = false,
  registrationsCount,
}) => {
  const t = translations[lang];

  // 3-state architecture: 'loading' | 'ready' | 'empty'
  const logoState: 'loading' | 'ready' | 'empty' = React.useMemo(() => {
    if (settings.logoUrl && settings.logoUrl.trim() !== '') {
      return 'ready';
    }
    if (isSettingsLoading) {
      return 'loading';
    }
    return 'empty';
  }, [settings.logoUrl, isSettingsLoading]);

  return (
    <section className="relative pt-6 pb-14 px-4 overflow-hidden">
      <div className="max-w-4xl mx-auto text-center">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 bg-[#FFD21F] text-[#111111] text-xs sm:text-sm font-black px-3.5 py-1 rounded-full border-2 border-[#111111] shadow-[2px_2px_0_0_#111111] uppercase tracking-wide transform -rotate-1">
            <Sparkles className="w-4 h-4 text-[#FF6A00]" />
            {t.editionTag}
          </span>

          <span className="inline-flex items-center gap-1.5 bg-[#2457FF] text-white text-xs sm:text-sm font-black px-3.5 py-1 rounded-full border-2 border-[#111111] shadow-[2px_2px_0_0_#111111] uppercase tracking-wide transform rotate-1">
            <Calendar className="w-3.5 h-3.5 text-[#FFD21F]" />
            {t.eventDatesBadge}
          </span>

          {/* 100% Free Badge - MANDATORY */}
          <span className="inline-flex items-center gap-1.5 bg-[#F0443E] text-white text-xs sm:text-sm font-black px-3.5 py-1 rounded-full border-2 border-[#111111] shadow-[2px_2px_0_0_#111111] uppercase tracking-wider animate-bounce">
            {t.freeBadge}
          </span>
        </div>

        {/* 
          Official Logo Section with 3 distinct states:
          1. LOADING: Configuration is being fetched. Reserved dimensions, neutral subtle placeholder, ZERO layout shift, NEVER display temporary title.
          2. READY: Valid official logo active. Transparent, responsive, object-fit contain, no deformation.
          3. EMPTY: Absence of logo confirmed. Fallback title displayed.
        */}
        <div className="my-6 sm:my-8 flex justify-center items-center px-2 min-h-[120px] xs:min-h-[140px] sm:min-h-[180px] md:min-h-[200px]">
          {logoState === 'loading' && (
            <div
              role="status"
              aria-label="Chargement du logo..."
              className="w-full max-w-[280px] xs:max-w-[340px] sm:max-w-md md:max-w-lg h-28 xs:h-36 sm:h-44 md:h-52 rounded-2xl bg-black/[0.02] border-2 border-transparent animate-pulse flex items-center justify-center pointer-events-none select-none"
            >
              {/* Neutral subtle reservation - Never displays temporary title during loading */}
            </div>
          )}

          {logoState === 'ready' && settings.logoUrl && (
            <img
              src={settings.logoUrl}
              alt="Logo officiel GLORIOUS YOUTH WORLDWIDE 2027"
              className="w-full max-w-[280px] xs:max-w-[340px] sm:max-w-md md:max-w-lg max-h-56 sm:max-h-72 object-contain mx-auto select-none pointer-events-none transition-opacity duration-300"
              loading="eager"
              fetchPriority="high"
            />
          )}

          {logoState === 'empty' && (
            <div className="max-w-lg mx-auto py-5 px-6 rounded-2xl border-2 border-dashed border-[#111111]/40 bg-white/40 text-center animate-in fade-in">
              <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                {lang === 'fr'
                  ? 'Titre de secours • Aucun logo configuré'
                  : 'Fallback Title • No Logo Configured'}
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-[#111111] uppercase tracking-tight font-['Space_Grotesk'] leading-tight">
                GLORIOUS YOUTH <span className="text-[#FF6A00]">WORLDWIDE</span> 2027
              </h1>
            </div>
          )}
        </div>

        {/* Official Theme Card */}
        <div className="my-6 max-w-2xl mx-auto bg-white rounded-2xl border-3 border-[#111111] p-5 sm:p-7 shadow-[5px_5px_0_0_#111111] relative text-left sm:text-center">
          <div className="inline-block bg-[#5B2EFF] text-white text-[10px] sm:text-xs font-black uppercase px-2.5 py-0.5 rounded border border-[#111111] mb-2.5">
            {t.officialThemeLabel}
          </div>
          <p className="text-lg sm:text-2xl font-black text-[#111111] leading-snug font-['Space_Grotesk']">
            {t.officialTheme}
          </p>
          <div className="mt-3 pt-3 border-t-2 border-dashed border-gray-200 text-xs sm:text-sm text-gray-700 font-medium">
            {t.themeDescription}
          </div>
        </div>

        {/* Primary Call-To-Action Button */}
        <div className="mt-7 flex flex-col items-center gap-3">
          {settings.registrationsOpen ? (
            <button
              onClick={onGoToRegister}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-[#FF6A00] hover:bg-[#e05e00] text-white text-lg sm:text-xl font-black px-8 py-4 rounded-2xl border-3 border-[#111111] shadow-[5px_5px_0_0_#111111] active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0_0_#111111] cursor-pointer transition-all transform hover:-translate-y-0.5"
            >
              <div className="text-left sm:text-center">
                <span className="block text-xl sm:text-2xl font-black leading-none uppercase tracking-wide font-['Space_Grotesk']">
                  {t.heroCta}
                </span>
                <span className="block text-xs font-bold text-[#FFF3DD] uppercase tracking-wider mt-0.5">
                  {t.heroCtaSub}
                </span>
              </div>
              <ArrowRight className="w-6 h-6 stroke-[3]" />
            </button>
          ) : (
            <div className="bg-[#FFF3DD] border-2 border-[#F0443E] text-[#111111] p-4 rounded-xl max-w-md">
              <p className="font-bold text-[#F0443E] flex items-center justify-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {t.registrationsClosedTitle}
              </p>
              <p className="text-xs text-gray-700 mt-1">{t.registrationsClosedText}</p>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mt-1">
            <ShieldCheck className="w-4 h-4 text-[#2457FF]" />
            <span>{t.freeBadgeSub}</span>
          </div>
        </div>

        {/* Why register explanation - Truthful, transparent */}
        <div className="mt-10 max-w-lg mx-auto bg-[#FFF3DD] border-2 border-[#111111] rounded-xl p-4 text-left shadow-[3px_3px_0_0_#111111]">
          <h2 className="text-xs sm:text-sm font-extrabold text-[#111111] uppercase tracking-wider mb-1 font-['Space_Grotesk']">
            {t.whyRegisterTitle}
          </h2>
          <p className="text-xs text-gray-700 leading-relaxed font-medium">
            {t.whyRegisterText}
          </p>
        </div>

        {/* Event Logistics from Live Settings */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto text-left">
          {/* Location */}
          <div className="bg-white p-3.5 rounded-xl border-2 border-[#111111] shadow-[2px_2px_0_0_#111111]">
            <div className="flex items-center gap-2 text-[#FF6A00] font-bold text-xs uppercase mb-1">
              <MapPin className="w-4 h-4" />
              <span>{lang === 'fr' ? 'Lieu' : 'Location'}</span>
            </div>
            <p className="text-xs font-bold text-[#111111]">{settings.location}</p>
          </div>

          {/* Schedule */}
          <div className="bg-white p-3.5 rounded-xl border-2 border-[#111111] shadow-[2px_2px_0_0_#111111]">
            <div className="flex items-center gap-2 text-[#2457FF] font-bold text-xs uppercase mb-1">
              <Clock className="w-4 h-4" />
              <span>{lang === 'fr' ? 'Horaires' : 'Schedule'}</span>
            </div>
            <p className="text-xs font-bold text-[#111111]">{settings.schedules}</p>
          </div>

          {/* Contact */}
          <div className="bg-white p-3.5 rounded-xl border-2 border-[#111111] shadow-[2px_2px_0_0_#111111]">
            <div className="flex items-center gap-2 text-[#5B2EFF] font-bold text-xs uppercase mb-1">
              <Phone className="w-4 h-4" />
              <span>{lang === 'fr' ? 'Contact WhatsApp' : 'Contact'}</span>
            </div>
            <p className="text-xs font-bold text-[#111111]">{settings.contactPhone}</p>
          </div>
        </div>

        {/* Announcement if configured by admin */}
        {settings.announcement && (
          <div className="mt-4 bg-[#FFD21F]/30 border border-[#111111] rounded-xl p-3 max-w-2xl mx-auto text-xs font-semibold text-[#111111]">
            📢 {settings.announcement}
          </div>
        )}
      </div>
    </section>
  );
};
