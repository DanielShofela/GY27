import React, { useState } from 'react';
import { Language, AttendanceDay, AgeCategory, Registration } from '../types/index';
import { translations } from '../i18n/translations';
import { normalizePhoneNumber } from '../utils/phone';
import { submitRegistration } from '../firebase/services';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
  ArrowLeft,
  CalendarCheck2,
  Phone,
  MapPin,
  Church,
  User,
  HeartHandshake,
} from 'lucide-react';

interface RegistrationFormProps {
  lang: Language;
  onSuccess: (registration: Registration) => void;
  onBack: () => void;
  onOpenPrivacy: () => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  lang,
  onSuccess,
  onBack,
  onOpenPrivacy,
}) => {
  const t = translations[lang];

  // Form states
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phoneRaw, setPhoneRaw] = useState('');
  const [city, setCity] = useState('');
  const [church, setChurch] = useState('');
  const [ageCategory, setAgeCategory] = useState<AgeCategory>('not_specified');
  const [attendanceDays, setAttendanceDays] = useState<AttendanceDay[]>([
    'jan_1',
    'jan_2',
    'jan_3',
  ]);
  const [consentAccepted, setConsentAccepted] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Toggle days
  const handleToggleDay = (day: AttendanceDay) => {
    if (attendanceDays.includes(day)) {
      if (attendanceDays.length > 1) {
        setAttendanceDays(attendanceDays.filter((d) => d !== day));
      }
    } else {
      setAttendanceDays([...attendanceDays, day]);
    }
  };

  const handleSelectAllDays = () => {
    setAttendanceDays(['jan_1', 'jan_2', 'jan_3']);
  };

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const errors: Record<string, string> = {};

    if (!lastName.trim()) errors.lastName = t.errorRequired;
    if (!firstName.trim()) errors.firstName = t.errorRequired;
    if (!city.trim()) errors.city = t.errorRequired;

    // Phone validation
    const phoneCheck = normalizePhoneNumber(phoneRaw);
    if (!phoneCheck.isValid) {
      errors.phone = t.errorPhoneInvalid;
    }

    if (attendanceDays.length === 0) {
      errors.days = t.errorDaysRequired;
    }

    if (!consentAccepted) {
      errors.consent = t.errorConsentRequired;
    }

    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitRegistration({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        whatsappPhone: phoneCheck.displayFormatted,
        normalizedPhone: phoneCheck.normalized,
        city: city.trim(),
        church: church.trim() || undefined,
        ageCategory: ageCategory !== 'not_specified' ? ageCategory : undefined,
        attendanceDays,
        consentAccepted: true,
      });

      // Fire festive confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FF6A00', '#FFD21F', '#2457FF', '#E83DFF'],
        });
      } catch (err) {
        // ignore if confetti fails in headless env
      }

      onSuccess(result.registration);
    } catch (err: any) {
      console.error('Registration submission error:', err);
      if (
        err.message === 'ALREADY_REGISTERED' ||
        err.message === 'REGISTRATION_FAILED_OR_DUPLICATE'
      ) {
        setErrorMessage(t.errorAlreadyRegistered);
      } else if (err.message === 'REGISTRATIONS_CLOSED') {
        setErrorMessage(t.registrationsClosedTitle);
      } else {
        setErrorMessage(t.errorGeneric);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-black mb-4 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t.backToHome}</span>
      </button>

      {/* Card container */}
      <div className="bg-white rounded-3xl border-3 border-[#111111] p-5 sm:p-8 shadow-[6px_6px_0_0_#111111] relative">
        {/* Header sticker */}
        <div className="inline-block bg-[#FF6A00] text-white text-xs font-black px-3 py-1 rounded-md border-2 border-[#111111] shadow-[2px_2px_0_0_#111111] uppercase tracking-wider mb-2">
          {t.freeBadge}
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-[#111111] font-['Space_Grotesk'] tracking-tight uppercase leading-tight">
          {t.formTitle}
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1 font-medium">{t.formSubtitle}</p>

        {/* Global Error Banner if duplicate or error */}
        {errorMessage && (
          <div className="mt-5 p-4 rounded-xl bg-[#FFF3DD] border-2 border-[#F0443E] text-[#111111] text-xs sm:text-sm font-semibold flex items-start gap-3 shadow-[2px_2px_0_0_#F0443E]">
            <AlertCircle className="w-5 h-5 text-[#F0443E] shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Form fields */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Nom & Prénom grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Nom */}
            <div>
              <label className="block text-xs font-black uppercase text-[#111111] mb-1">
                {t.lastNameLabel} <span className="text-[#F0443E]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (validationErrors.lastName) {
                      setValidationErrors({ ...validationErrors, lastName: '' });
                    }
                  }}
                  placeholder={t.lastNamePlaceholder}
                  className={`w-full bg-[#FFF3DD]/50 border-2 ${
                    validationErrors.lastName ? 'border-[#F0443E]' : 'border-[#111111]'
                  } rounded-xl px-3 py-2.5 text-sm font-bold text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#FF6A00] focus:bg-white transition-all`}
                  required
                />
              </div>
              {validationErrors.lastName && (
                <p className="text-[11px] font-bold text-[#F0443E] mt-1">
                  {validationErrors.lastName}
                </p>
              )}
            </div>

            {/* Prénom */}
            <div>
              <label className="block text-xs font-black uppercase text-[#111111] mb-1">
                {t.firstNameLabel} <span className="text-[#F0443E]">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (validationErrors.firstName) {
                    setValidationErrors({ ...validationErrors, firstName: '' });
                  }
                }}
                placeholder={t.firstNamePlaceholder}
                className={`w-full bg-[#FFF3DD]/50 border-2 ${
                  validationErrors.firstName ? 'border-[#F0443E]' : 'border-[#111111]'
                } rounded-xl px-3 py-2.5 text-sm font-bold text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#FF6A00] focus:bg-white transition-all`}
                required
              />
              {validationErrors.firstName && (
                <p className="text-[11px] font-bold text-[#F0443E] mt-1">
                  {validationErrors.firstName}
                </p>
              )}
            </div>
          </div>

          {/* Numéro WhatsApp */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-black uppercase text-[#111111]">
                {t.whatsappLabel} <span className="text-[#F0443E]">*</span>
              </label>
              <span className="text-[10px] font-bold text-[#2457FF]">
                Ex: Côte d'Ivoire (+225)
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <Phone className="w-4 h-4 text-[#2457FF]" />
              </div>
              <input
                type="tel"
                value={phoneRaw}
                onChange={(e) => {
                  setPhoneRaw(e.target.value);
                  if (validationErrors.phone) {
                    setValidationErrors({ ...validationErrors, phone: '' });
                  }
                }}
                placeholder={t.whatsappPlaceholder}
                className={`w-full pl-9 bg-[#FFF3DD]/50 border-2 ${
                  validationErrors.phone ? 'border-[#F0443E]' : 'border-[#111111]'
                } rounded-xl px-3 py-2.5 text-sm font-bold text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#FF6A00] focus:bg-white transition-all`}
                required
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1 font-medium">{t.whatsappHelp}</p>
            {validationErrors.phone && (
              <p className="text-[11px] font-bold text-[#F0443E] mt-1">{validationErrors.phone}</p>
            )}
          </div>

          {/* Commune ou Ville */}
          <div>
            <label className="block text-xs font-black uppercase text-[#111111] mb-1">
              {t.cityLabel} <span className="text-[#F0443E]">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <MapPin className="w-4 h-4 text-[#FF6A00]" />
              </div>
              <input
                type="text"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  if (validationErrors.city) {
                    setValidationErrors({ ...validationErrors, city: '' });
                  }
                }}
                placeholder={t.cityPlaceholder}
                className={`w-full pl-9 bg-[#FFF3DD]/50 border-2 ${
                  validationErrors.city ? 'border-[#F0443E]' : 'border-[#111111]'
                } rounded-xl px-3 py-2.5 text-sm font-bold text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#FF6A00] focus:bg-white transition-all`}
                required
              />
            </div>
            {validationErrors.city && (
              <p className="text-[11px] font-bold text-[#F0443E] mt-1">{validationErrors.city}</p>
            )}
          </div>

          {/* Église ou communauté (facultatif) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-black uppercase text-[#111111]">
                {t.churchLabel}
              </label>
              <span className="text-[10px] font-semibold text-gray-500">
                {lang === 'fr' ? 'Facultatif' : 'Optional'}
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <Church className="w-4 h-4 text-[#5B2EFF]" />
              </div>
              <input
                type="text"
                value={church}
                onChange={(e) => setChurch(e.target.value)}
                placeholder={t.churchPlaceholder}
                className="w-full pl-9 bg-[#FFF3DD]/50 border-2 border-[#111111] rounded-xl px-3 py-2.5 text-sm font-bold text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#FF6A00] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Tranche d'âge (facultatif, catégorie) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-black uppercase text-[#111111]">
                {t.ageCategoryLabel}
              </label>
              <span className="text-[10px] font-semibold text-gray-500">
                {lang === 'fr' ? 'Catégorie' : 'Category'}
              </span>
            </div>
            <select
              value={ageCategory}
              onChange={(e) => setAgeCategory(e.target.value as AgeCategory)}
              className="w-full bg-[#FFF3DD]/50 border-2 border-[#111111] rounded-xl px-3 py-2.5 text-sm font-bold text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#FF6A00] focus:bg-white transition-all"
            >
              <option value="not_specified">{t.ageNotSpecified}</option>
              <option value="under_15">{t.ageUnder15}</option>
              <option value="15_17">{t.age1517}</option>
              <option value="18_25">{t.age1825}</option>
              <option value="26_35">{t.age2635}</option>
              <option value="over_35">{t.ageOver35}</option>
            </select>
          </div>

          {/* Jours de participation envisagés */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-black uppercase text-[#111111]">
                {t.daysLabel} <span className="text-[#F0443E]">*</span>
              </label>
              <button
                type="button"
                onClick={handleSelectAllDays}
                className="text-[11px] font-bold text-[#FF6A00] underline cursor-pointer hover:text-[#e05e00]"
              >
                {t.allDaysSelected}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Day 1 */}
              <button
                type="button"
                onClick={() => handleToggleDay('jan_1')}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  attendanceDays.includes('jan_1')
                    ? 'bg-[#FFD21F] border-[#111111] shadow-[2px_2px_0_0_#111111]'
                    : 'bg-white border-gray-300 opacity-60'
                }`}
              >
                <div className="text-[10px] font-extrabold uppercase text-gray-700">Jour 1</div>
                <div className="text-xs font-black text-[#111111]">1er Janvier</div>
              </button>

              {/* Day 2 */}
              <button
                type="button"
                onClick={() => handleToggleDay('jan_2')}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  attendanceDays.includes('jan_2')
                    ? 'bg-[#FFD21F] border-[#111111] shadow-[2px_2px_0_0_#111111]'
                    : 'bg-white border-gray-300 opacity-60'
                }`}
              >
                <div className="text-[10px] font-extrabold uppercase text-gray-700">Jour 2</div>
                <div className="text-xs font-black text-[#111111]">2 Janvier</div>
              </button>

              {/* Day 3 */}
              <button
                type="button"
                onClick={() => handleToggleDay('jan_3')}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  attendanceDays.includes('jan_3')
                    ? 'bg-[#FFD21F] border-[#111111] shadow-[2px_2px_0_0_#111111]'
                    : 'bg-white border-gray-300 opacity-60'
                }`}
              >
                <div className="text-[10px] font-extrabold uppercase text-gray-700">Jour 3</div>
                <div className="text-xs font-black text-[#111111]">3 Janvier</div>
              </button>
            </div>
            {validationErrors.days && (
              <p className="text-[11px] font-bold text-[#F0443E] mt-1">{validationErrors.days}</p>
            )}
          </div>

          {/* Informed Consent Checkbox */}
          <div className="pt-3 border-t border-gray-200">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => {
                  setConsentAccepted(e.target.checked);
                  if (validationErrors.consent) {
                    setValidationErrors({ ...validationErrors, consent: '' });
                  }
                }}
                className="mt-0.5 w-5 h-5 rounded border-2 border-[#111111] text-[#FF6A00] focus:ring-[#FF6A00] cursor-pointer"
                required
              />
              <span className="text-xs text-gray-800 font-medium leading-relaxed">
                {t.consentLabel}{' '}
                <button
                  type="button"
                  onClick={onOpenPrivacy}
                  className="text-[#2457FF] font-bold underline hover:text-[#5B2EFF] inline ml-1 cursor-pointer"
                >
                  {t.privacyLink}
                </button>
              </span>
            </label>
            {validationErrors.consent && (
              <p className="text-[11px] font-bold text-[#F0443E] mt-1">
                {validationErrors.consent}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-2xl border-3 border-[#111111] font-black text-base sm:text-lg uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-all ${
                isSubmitting
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed shadow-none'
                  : 'bg-[#FF6A00] hover:bg-[#e05e00] text-white shadow-[4px_4px_0_0_#111111] active:translate-x-0.5 active:translate-y-0.5'
              }`}
            >
              {isSubmitting ? (
                <span>{t.submittingButton}</span>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>{t.submitButton}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
