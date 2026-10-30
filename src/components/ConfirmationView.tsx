import React, { useState } from 'react';
import { Registration, Language } from '../types/index';
import { translations } from '../i18n/translations';
import { CheckCircle, Share2, Copy, Check, Home, Calendar, Sparkles } from 'lucide-react';

interface ConfirmationViewProps {
  registration: Registration;
  lang: Language;
  onGoHome: () => void;
}

export const ConfirmationView: React.FC<ConfirmationViewProps> = ({
  registration,
  lang,
  onGoHome,
}) => {
  const t = translations[lang];
  const [copied, setCopied] = useState(false);

  const handleCopyReference = () => {
    if (registration.referenceCode) {
      navigator.clipboard.writeText(registration.referenceCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `${t.whatsappShareText} https://ais-pre-fcqquovzkgqmrc6afc3sfb-294693009847.europe-west2.run.app`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl border-3 border-[#111111] p-6 sm:p-9 shadow-[8px_8px_0_0_#111111] text-center relative overflow-hidden">
        {/* Decorative badge */}
        <div className="inline-flex items-center gap-2 bg-[#FFD21F] text-[#111111] font-black text-xs px-3 py-1 rounded-full border-2 border-[#111111] mb-4 uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-[#FF6A00]" />
          GLORIOUS YOUTH WORLDWIDE 2027
        </div>

        {/* Big Success icon */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-[#FF6A00] border-3 border-[#111111] shadow-[4px_4px_0_0_#111111] flex items-center justify-center text-white mb-5">
          <CheckCircle className="w-12 h-12 stroke-[2.5]" />
        </div>

        {/* Success Headings */}
        <h1 className="text-2xl sm:text-3xl font-black text-[#111111] uppercase tracking-tight font-['Anton'] leading-tight">
          {t.successTitle}
        </h1>
        <p className="text-xs font-bold text-[#FF6A00] uppercase tracking-widest mt-1">
          {t.successSubtitle}
        </p>

        {/* Personal Thank you note */}
        <div className="my-5 p-4 rounded-2xl bg-[#FFF3DD] border-2 border-[#111111] text-[#111111] text-left sm:text-center">
          <p className="font-extrabold text-base sm:text-lg font-['Space_Grotesk']">
            {t.successThanks.replace('{name}', registration.firstName)}
          </p>
          <p className="text-xs sm:text-sm font-semibold text-gray-700 mt-1">
            {t.successAppointment}
          </p>
        </div>

        {/* Unique Registration Reference Code */}
        <div className="my-6 p-4 rounded-2xl bg-white border-2 border-dashed border-[#111111]">
          <div className="text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1">
            {t.referenceCodeLabel}
          </div>
          <div className="text-3xl sm:text-4xl font-black text-[#111111] tracking-wider font-mono">
            {registration.referenceCode}
          </div>
          <p className="text-[11px] text-gray-500 font-medium mt-1">
            {t.referenceCodeNotice}
          </p>

          <button
            onClick={handleCopyReference}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold bg-[#FFF3DD] hover:bg-[#ffeac2] text-[#111111] px-3 py-1.5 rounded-lg border-2 border-[#111111] cursor-pointer shadow-[2px_2px_0_0_#111111] active:translate-x-0.5 active:translate-y-0.5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-600" />
                <span>{lang === 'fr' ? 'Copié !' : 'Copied!'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{lang === 'fr' ? 'Copier la référence' : 'Copy code'}</span>
              </>
            )}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={handleShareWhatsApp}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold text-sm py-3.5 px-4 rounded-xl border-2 border-[#111111] shadow-[3px_3px_0_0_#111111] cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5"
          >
            <Share2 className="w-4 h-4" />
            <span>{t.shareOnWhatsapp}</span>
          </button>

          <button
            onClick={onGoHome}
            className="inline-flex items-center justify-center gap-2 bg-[#111111] hover:bg-gray-900 text-white font-extrabold text-sm py-3.5 px-5 rounded-xl border-2 border-[#111111] shadow-[3px_3px_0_0_#111111] cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5"
          >
            <Home className="w-4 h-4" />
            <span>{t.backToHome}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
