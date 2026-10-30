import React, { useState } from 'react';
import { EventSettings, Language } from '../types/index';
import { translations } from '../i18n/translations';
import { updateEventSettings } from '../firebase/services';
import { User } from 'firebase/auth';
import {
  Save,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  MapPin,
  Clock,
  Phone,
  Calendar,
  Megaphone,
  Link,
  Image as ImageIcon,
  ArrowRight,
} from 'lucide-react';

interface AdminSettingsProps {
  settings: EventSettings;
  lang: Language;
  currentUser?: User | null;
  onSettingsUpdated: (updated: EventSettings) => void;
  onGoToIdentity?: () => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  settings,
  lang,
  currentUser,
  onSettingsUpdated,
  onGoToIdentity,
}) => {
  const t = translations[lang];

  const [location, setLocation] = useState(settings.location);
  const [schedules, setSchedules] = useState(settings.schedules);
  const [contactPhone, setContactPhone] = useState(settings.contactPhone);
  const [closingDate, setClosingDate] = useState(settings.closingDate || '');
  const [announcement, setAnnouncement] = useState(settings.announcement || '');
  const [whatsappChannelUrl, setWhatsappChannelUrl] = useState(
    settings.whatsappChannelUrl || ''
  );
  const [registrationsOpen, setRegistrationsOpen] = useState(settings.registrationsOpen);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updatedPayload: EventSettings = {
        ...settings,
        location: location.trim(),
        schedules: schedules.trim(),
        contactPhone: contactPhone.trim(),
        closingDate: closingDate.trim(),
        announcement: announcement.trim(),
        whatsappChannelUrl: whatsappChannelUrl.trim(),
        registrationsOpen,
        updatedAt: new Date().toISOString(),
      };

      await updateEventSettings(updatedPayload, currentUser);
      onSettingsUpdated(updatedPayload);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setError(
        err.message === 'NOT_AUTHORIZED'
          ? 'Action non autorisée. Votre compte administrateur doit être vérifié.'
          : err.message || 'Erreur lors de la sauvegarde'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-[#111111] p-5 sm:p-7 shadow-[4px_4px_0_0_#111111] max-w-2xl mx-auto space-y-5">
      <div className="border-b-2 border-gray-100 pb-3">
        <h2 className="text-xl font-black text-[#111111] uppercase font-['Space_Grotesk']">
          {t.settingsHeading}
        </h2>
        <p className="text-xs text-gray-600 mt-1">{t.settingsDesc}</p>
      </div>

      {/* Visual Identity Shortcut Banner */}
      {onGoToIdentity && (
        <div className="p-4 rounded-xl border-2 border-[#111111] bg-[#FFD21F]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[2px_2px_0_0_#111111]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#FF6A00] text-white rounded-lg border border-[#111111]">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black uppercase text-[#111111]">
                Identité Visuelle (Logos Officiels)
              </div>
              <div className="text-[11px] text-gray-600 font-medium">
                Gérer indépendamment le logo principal de l'accueil et le logo du header.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onGoToIdentity}
            className="inline-flex items-center justify-center gap-1.5 bg-[#FF6A00] hover:bg-[#e05e00] text-white text-xs font-black px-3.5 py-2 rounded-lg border-2 border-[#111111] shadow-[2px_2px_0_0_#111111] cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
          >
            <span>Gérer les logos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 rounded-xl bg-green-50 border-2 border-green-500 text-xs font-bold text-green-800 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span>{t.savedSuccess}</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-300 text-xs font-bold text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Toggle Registrations Open / Closed */}
        <div className="p-4 rounded-xl border-2 border-[#111111] bg-[#FFF3DD]/60 flex items-center justify-between">
          <div>
            <div className="text-xs font-black uppercase text-[#111111]">
              {t.settingIsOpenLabel}
            </div>
            <div className="text-[11px] text-gray-600 font-medium">{t.settingIsOpenSub}</div>
            <div className="mt-1">
              <span
                className={`text-[11px] font-black uppercase px-2 py-0.5 rounded ${
                  registrationsOpen
                    ? 'bg-green-200 text-green-900 border border-green-700'
                    : 'bg-red-200 text-red-900 border border-red-700'
                }`}
              >
                {registrationsOpen ? t.statusOpen : t.statusClosed}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setRegistrationsOpen(!registrationsOpen)}
            className="cursor-pointer text-[#FF6A00] hover:text-[#e05e00] transition-colors"
          >
            {registrationsOpen ? (
              <ToggleRight className="w-12 h-12 fill-[#FF6A00]" />
            ) : (
              <ToggleLeft className="w-12 h-12 text-gray-400" />
            )}
          </button>
        </div>

        {/* Lieu */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-black uppercase text-[#111111] mb-1">
            <MapPin className="w-3.5 h-3.5 text-[#FF6A00]" />
            <span>{t.settingLocationLabel}</span>
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full bg-[#FFF3DD]/30 border-2 border-[#111111] rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
            required
          />
        </div>

        {/* Horaires */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-black uppercase text-[#111111] mb-1">
            <Clock className="w-3.5 h-3.5 text-[#2457FF]" />
            <span>{t.settingSchedulesLabel}</span>
          </label>
          <input
            type="text"
            value={schedules}
            onChange={(e) => setSchedules(e.target.value)}
            className="w-full bg-[#FFF3DD]/30 border-2 border-[#111111] rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
            required
          />
        </div>

        {/* Contact Phone */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-black uppercase text-[#111111] mb-1">
            <Phone className="w-3.5 h-3.5 text-[#5B2EFF]" />
            <span>{t.settingContactPhoneLabel}</span>
          </label>
          <input
            type="text"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="w-full bg-[#FFF3DD]/30 border-2 border-[#111111] rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
            required
          />
        </div>

        {/* Closing Date */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-black uppercase text-[#111111] mb-1">
            <Calendar className="w-3.5 h-3.5 text-[#F0443E]" />
            <span>{t.settingClosingDateLabel}</span>
          </label>
          <input
            type="text"
            value={closingDate}
            onChange={(e) => setClosingDate(e.target.value)}
            className="w-full bg-[#FFF3DD]/30 border-2 border-[#111111] rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
            placeholder="Ex: 31 décembre 2026 à 23h59"
          />
        </div>

        {/* Public announcement banner */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-black uppercase text-[#111111] mb-1">
            <Megaphone className="w-3.5 h-3.5 text-[#FFD21F]" />
            <span>{t.settingAnnouncementLabel}</span>
          </label>
          <textarea
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            rows={2}
            className="w-full bg-[#FFF3DD]/30 border-2 border-[#111111] rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
            placeholder="Annonce affichée aux participants sur la page d'accueil..."
          />
        </div>

        {/* WhatsApp Channel / community URL */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-black uppercase text-[#111111] mb-1">
            <Link className="w-3.5 h-3.5 text-[#25D366]" />
            <span>{t.settingWhatsappUrlLabel}</span>
          </label>
          <input
            type="url"
            value={whatsappChannelUrl}
            onChange={(e) => setWhatsappChannelUrl(e.target.value)}
            className="w-full bg-[#FFF3DD]/30 border-2 border-[#111111] rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
            placeholder="https://whatsapp.com/channel/..."
          />
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#FF6A00] hover:bg-[#e05e00] text-white font-black text-sm py-3 px-4 rounded-xl border-2 border-[#111111] shadow-[3px_3px_0_0_#111111] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Enregistrement dans Firestore...' : t.btnSave}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
