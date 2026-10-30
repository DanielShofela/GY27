import React, { useState, useMemo } from 'react';
import { Registration, EventSettings, Language } from '../types/index';
import { translations } from '../i18n/translations';
import { calculateRegistrationStats } from '../utils/stats';
import { AdminRegistrations } from './AdminRegistrations';
import { AdminSettings } from './AdminSettings';
import { AdminLogoManager } from './AdminLogoManager';
import {
  Users,
  CalendarDays,
  TrendingUp,
  MapPin,
  Clock,
  LogOut,
  Sliders,
  ListFilter,
  BarChart3,
  Calendar,
  Image as ImageIcon,
} from 'lucide-react';
import { User } from 'firebase/auth';

interface AdminDashboardProps {
  registrations: Registration[];
  settings: EventSettings;
  lang: Language;
  currentUser: User | null;
  onLogout: () => void;
  onSettingsUpdated: (updated: EventSettings) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  registrations,
  settings,
  lang,
  currentUser,
  onLogout,
  onSettingsUpdated,
}) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'stats' | 'list' | 'identity' | 'settings'>('stats');

  // Compute live statistics
  const stats = useMemo(() => {
    return calculateRegistrationStats(registrations);
  }, [registrations]);

  // Sort cities by attendance
  const sortedCities = useMemo(() => {
    return Object.entries(stats.cityBreakdown).sort(([, a], [, b]) => b - a);
  }, [stats.cityBreakdown]);

  // Age categories friendly labels
  const ageLabels: Record<string, string> = {
    under_15: t.ageUnder15,
    '15_17': t.age1517,
    '18_25': t.age1825,
    '26_35': t.age2635,
    over_35: t.ageOver35,
    not_specified: t.ageNotSpecified,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border-3 border-[#111111] shadow-[4px_4px_0_0_#111111] mb-6">
        <div>
          <div className="inline-block bg-[#5B2EFF] text-white text-[10px] sm:text-xs font-black uppercase px-2 py-0.5 rounded border border-[#111111] mb-1">
            Administration Sécurisée
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111111] uppercase font-['Space_Grotesk'] leading-tight">
            GLORIOUS YOUTH WORLDWIDE 2027
          </h1>
          <p className="text-xs text-gray-600 font-semibold mt-0.5">
            Connecté en tant que : <span className="text-[#FF6A00] font-bold">{currentUser?.email}</span>
          </p>
        </div>

        <button
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-[#F0443E] font-bold text-xs px-3.5 py-2 rounded-xl border-2 border-red-300 self-start sm:self-auto cursor-pointer transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>{t.adminSignOut}</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b-2 border-[#111111] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('stats')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wide cursor-pointer transition-all ${
            activeTab === 'stats'
              ? 'bg-[#FF6A00] text-white border-2 border-[#111111] shadow-[2px_2px_0_0_#111111]'
              : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-transparent'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>{t.dashboardTab}</span>
        </button>

        <button
          onClick={() => setActiveTab('list')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wide cursor-pointer transition-all ${
            activeTab === 'list'
              ? 'bg-[#FF6A00] text-white border-2 border-[#111111] shadow-[2px_2px_0_0_#111111]'
              : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-transparent'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>
            {t.registrationsTab} ({registrations.length})
          </span>
        </button>

        <button
          onClick={() => setActiveTab('identity')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wide cursor-pointer transition-all ${
            activeTab === 'identity'
              ? 'bg-[#FF6A00] text-white border-2 border-[#111111] shadow-[2px_2px_0_0_#111111]'
              : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-transparent'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Identité Visuelle</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wide cursor-pointer transition-all ${
            activeTab === 'settings'
              ? 'bg-[#FF6A00] text-white border-2 border-[#111111] shadow-[2px_2px_0_0_#111111]'
              : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-transparent'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>{t.settingsTab}</span>
        </button>
      </div>

      {/* Tab 1: Stats Overview */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Top key metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total registrations */}
            <div className="bg-white p-5 rounded-2xl border-3 border-[#111111] shadow-[4px_4px_0_0_#111111]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-gray-600">
                  {t.statsTotalRegistrations}
                </span>
                <div className="p-2 bg-[#FF6A00]/10 rounded-lg text-[#FF6A00]">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-[#111111] mt-2 font-mono">
                {stats.total}
              </div>
              <p className="text-[11px] text-gray-500 font-semibold mt-1">
                Inscriptions actives enregistrées
              </p>
            </div>

            {/* Today */}
            <div className="bg-white p-5 rounded-2xl border-3 border-[#111111] shadow-[4px_4px_0_0_#111111]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-gray-600">
                  {t.statsToday}
                </span>
                <div className="p-2 bg-[#FFD21F]/20 rounded-lg text-[#111111]">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-[#111111] mt-2 font-mono">
                {stats.todayCount}
              </div>
              <p className="text-[11px] text-gray-500 font-semibold mt-1">
                Dernières 24 heures
              </p>
            </div>

            {/* Last 7 days */}
            <div className="bg-white p-5 rounded-2xl border-3 border-[#111111] shadow-[4px_4px_0_0_#111111]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-gray-600">
                  {t.statsLast7Days}
                </span>
                <div className="p-2 bg-[#2457FF]/10 rounded-lg text-[#2457FF]">
                  <CalendarDays className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-[#111111] mt-2 font-mono">
                {stats.last7DaysCount}
              </div>
              <p className="text-[11px] text-gray-500 font-semibold mt-1">
                Dynamique hebdomadaire
              </p>
            </div>
          </div>

          {/* Daily attendance forecast cards */}
          <div className="bg-white p-5 rounded-2xl border-2 border-[#111111] shadow-[3px_3px_0_0_#111111]">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#111111] mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#FF6A00]" />
              <span>Prévisions de présence par journée</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-[#FFF3DD] rounded-xl border border-[#111111]">
                <div className="text-[11px] font-bold text-gray-600 uppercase">{t.statsDay1}</div>
                <div className="text-2xl font-black text-[#111111] font-mono mt-0.5">
                  {stats.day1Expected}
                </div>
                <div className="text-[10px] text-gray-500 font-semibold">1er Janvier</div>
              </div>

              <div className="p-3 bg-[#FFF3DD] rounded-xl border border-[#111111]">
                <div className="text-[11px] font-bold text-gray-600 uppercase">{t.statsDay2}</div>
                <div className="text-2xl font-black text-[#111111] font-mono mt-0.5">
                  {stats.day2Expected}
                </div>
                <div className="text-[10px] text-gray-500 font-semibold">2 Janvier</div>
              </div>

              <div className="p-3 bg-[#FFF3DD] rounded-xl border border-[#111111]">
                <div className="text-[11px] font-bold text-gray-600 uppercase">{t.statsDay3}</div>
                <div className="text-2xl font-black text-[#111111] font-mono mt-0.5">
                  {stats.day3Expected}
                </div>
                <div className="text-[10px] text-gray-500 font-semibold">3 Janvier</div>
              </div>

              <div className="p-3 bg-[#FFD21F]/30 rounded-xl border border-[#111111]">
                <div className="text-[11px] font-bold text-gray-700 uppercase">{t.statsAll3Days}</div>
                <div className="text-2xl font-black text-[#FF6A00] font-mono mt-0.5">
                  {stats.all3DaysExpected}
                </div>
                <div className="text-[10px] text-gray-600 font-semibold">Les 3 jours pleins</div>
              </div>
            </div>
          </div>

          {/* Breakdown Grids: Commune & Age */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Commune / Ville Breakdown */}
            <div className="bg-white p-5 rounded-2xl border-2 border-[#111111] shadow-[3px_3px_0_0_#111111]">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#111111] mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#FF6A00]" />
                <span>{t.cityDistributionTitle}</span>
              </h2>

              {sortedCities.length === 0 ? (
                <p className="text-xs text-gray-500 py-4 text-center">
                  Aucune commune enregistrée pour l'instant.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {sortedCities.map(([cityName, count]) => {
                    const percentage = Math.round((count / (stats.total || 1)) * 100);
                    return (
                      <div key={cityName} className="text-xs">
                        <div className="flex justify-between font-bold text-gray-800 mb-0.5">
                          <span>{cityName}</span>
                          <span>
                            {count} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-300">
                          <div
                            className="h-full bg-[#FF6A00] rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Age Category Breakdown */}
            <div className="bg-white p-5 rounded-2xl border-2 border-[#111111] shadow-[3px_3px_0_0_#111111]">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#111111] mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#2457FF]" />
                <span>{t.ageDistributionTitle}</span>
              </h2>

              <div className="space-y-2">
                {Object.entries(stats.ageBreakdown).map(([ageKey, count]) => {
                  const percentage = Math.round((count / (stats.total || 1)) * 100);
                  const label = ageLabels[ageKey] || ageKey;
                  return (
                    <div key={ageKey} className="text-xs">
                      <div className="flex justify-between font-bold text-gray-800 mb-0.5">
                        <span>{label}</span>
                        <span>
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-300">
                        <div
                          className="h-full bg-[#2457FF] rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Registrations List */}
      {activeTab === 'list' && (
        <AdminRegistrations registrations={registrations} lang={lang} />
      )}

      {/* Tab 3: Visual Identity (Official SVG Logo Management) */}
      {activeTab === 'identity' && (
        <AdminLogoManager
          settings={settings}
          lang={lang}
          currentUser={currentUser}
          onSettingsUpdated={onSettingsUpdated}
        />
      )}

      {/* Tab 4: Settings */}
      {activeTab === 'settings' && (
        <AdminSettings
          settings={settings}
          lang={lang}
          currentUser={currentUser}
          onSettingsUpdated={onSettingsUpdated}
          onGoToIdentity={() => setActiveTab('identity')}
        />
      )}
    </div>
  );
};
