import React from 'react';
import { User } from 'firebase/auth';
import { Language } from '../types/index';
import { translations } from '../i18n/translations';
import { ShieldAlert, LogOut, ArrowLeft, Server } from 'lucide-react';

interface AdminAccessDeniedProps {
  user: User;
  lang: Language;
  onLogoutAndRetry: () => void;
  onGoHome: () => void;
}

export const AdminAccessDenied: React.FC<AdminAccessDeniedProps> = ({
  user,
  lang,
  onLogoutAndRetry,
  onGoHome,
}) => {
  const t = translations[lang];

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl border-3 border-[#111111] p-6 sm:p-8 shadow-[8px_8px_0_0_#111111] text-center relative">
        {/* Shield Alert Icon */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#F0443E] border-2 border-[#111111] shadow-[3px_3px_0_0_#111111] flex items-center justify-center text-white mb-4">
          <ShieldAlert className="w-9 h-9 stroke-[2.2]" />
        </div>

        <div className="inline-block bg-[#F0443E] text-white text-[10px] sm:text-xs font-black uppercase px-2.5 py-0.5 rounded border border-[#111111] mb-2 tracking-wider">
          Erreur 403 • Accès Refusé
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-[#111111] font-['Space_Grotesk'] uppercase tracking-tight">
          Accès Non Autorisé
        </h1>

        <p className="text-xs text-gray-700 mt-2 font-medium leading-relaxed">
          Le compte Google connecté n'est pas autorisé à accéder aux données administratives de{' '}
          <strong>GLORIOUS YOUTH WORLDWIDE 2027</strong>.
        </p>

        {/* Diagnostic identity card */}
        <div className="my-5 p-3.5 bg-red-50 rounded-xl border-2 border-red-200 text-left text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="font-bold text-gray-500">Compte Google :</span>
            <span className="font-extrabold text-[#111111] truncate max-w-[180px]">
              {user.email || 'Email non fourni'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-gray-500">Identifiant UID :</span>
            <span className="font-mono text-[11px] text-gray-800 truncate max-w-[180px]">
              {user.uid}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-gray-500">Email vérifié :</span>
            <span
              className={`font-bold ${
                user.emailVerified ? 'text-green-700' : 'text-red-600'
              }`}
            >
              {user.emailVerified ? 'Oui' : 'Non'}
            </span>
          </div>
        </div>

        {/* Server security rule enforcement badge */}
        <div className="p-3 bg-[#FFF3DD] rounded-xl border border-[#111111] text-left text-[11px] text-gray-800 space-y-1 mb-6">
          <div className="flex items-center gap-1.5 font-black uppercase text-[#FF6A00]">
            <Server className="w-3.5 h-3.5" />
            <span>Protection serveur Firestore active</span>
          </div>
          <p className="leading-tight text-gray-600 font-medium">
            Toute requête de lecture de la liste des inscriptions est strictement bloquée au niveau de Google Cloud Firestore par les règles de sécurité.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={onLogoutAndRetry}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#111111] hover:bg-gray-900 text-white font-extrabold text-xs sm:text-sm py-3 px-4 rounded-xl border-2 border-[#111111] shadow-[2px_2px_0_0_#FF6A00] cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Changer de compte Google</span>
          </button>

          <button
            onClick={onGoHome}
            className="w-full inline-flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.backToHome}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
