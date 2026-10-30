import React from 'react';
import { Language } from '../types/index';
import { translations } from '../i18n/translations';
import { Shield, X, Lock, CheckCircle2 } from 'lucide-react';

interface PrivacyModalProps {
  lang: Language;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ lang, onClose }) => {
  const t = translations[lang];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border-3 border-[#111111] max-w-2xl w-full p-6 sm:p-8 shadow-[8px_8px_0_0_#111111] relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-500 hover:text-black rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="inline-flex items-center gap-1.5 bg-[#FFF3DD] text-[#5B2EFF] text-xs font-black px-3 py-1 rounded-full border border-[#111111] uppercase tracking-wider mb-3">
          <Shield className="w-4 h-4" />
          GLORIOUS YOUTH WORLDWIDE 2027
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-[#111111] font-['Space_Grotesk'] uppercase tracking-tight">
          {t.privacyTitle}
        </h1>

        <div className="mt-5 space-y-4 text-xs sm:text-sm text-gray-700 leading-relaxed font-medium">
          {/* Section 1 */}
          <div className="p-3.5 bg-[#FFF3DD]/40 rounded-xl border border-gray-200">
            <h2 className="font-extrabold text-[#111111] text-sm uppercase mb-1">
              {t.privacySection1Title}
            </h2>
            <p>{t.privacySection1Text}</p>
          </div>

          {/* Section 2 */}
          <div className="p-3.5 bg-[#FFF3DD]/40 rounded-xl border border-gray-200">
            <h2 className="font-extrabold text-[#111111] text-sm uppercase mb-1">
              {t.privacySection2Title}
            </h2>
            <p>{t.privacySection2Text}</p>
          </div>

          {/* Section 3 */}
          <div className="p-3.5 bg-[#FFF3DD]/40 rounded-xl border border-gray-200">
            <h2 className="font-extrabold text-[#111111] text-sm uppercase mb-1">
              {t.privacySection3Title}
            </h2>
            <p>{t.privacySection3Text}</p>
          </div>

          {/* Section 4 */}
          <div className="p-3.5 bg-[#FFF3DD]/40 rounded-xl border border-gray-200">
            <h2 className="font-extrabold text-[#111111] text-sm uppercase mb-1">
              {t.privacySection4Title}
            </h2>
            <p>{t.privacySection4Text}</p>
          </div>

          {/* Section 5 */}
          <div className="p-3.5 bg-[#FFF3DD]/40 rounded-xl border border-gray-200">
            <h2 className="font-extrabold text-[#111111] text-sm uppercase mb-1">
              {t.privacySection5Title}
            </h2>
            <p>{t.privacySection5Text}</p>
            <p className="mt-2 text-[11px] text-gray-500 italic">
              {t.privacyContactPlaceholder}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#111111] hover:bg-gray-900 text-white font-extrabold text-xs sm:text-sm rounded-xl cursor-pointer transition-all shadow-[2px_2px_0_0_#FF6A00]"
          >
            {lang === 'fr' ? 'J\'ai compris' : 'Understood'}
          </button>
        </div>
      </div>
    </div>
  );
};
