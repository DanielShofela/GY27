import React, { useState } from 'react';
import { Language } from '../types/index';
import { translations } from '../i18n/translations';
import { signInAdmin, verifyIsAdmin, logOutAdmin } from '../firebase/services';
import { Shield, Lock, AlertTriangle, ArrowLeft, LogOut } from 'lucide-react';
import { User } from 'firebase/auth';

interface AdminLoginProps {
  lang: Language;
  onSuccess: (user: User) => void;
  onCancel: () => void;
  currentUser: User | null;
  isAdmin: boolean;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  lang,
  onSuccess,
  onCancel,
  currentUser,
  isAdmin,
}) => {
  const t = translations[lang];
  const [loading, setLoading] = useState(false);
  const [unauthorizedEmail, setUnauthorizedEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setUnauthorizedEmail(null);

    try {
      const user = await signInAdmin();
      const authorized = await verifyIsAdmin(user);

      if (authorized) {
        onSuccess(user);
      } else {
        setUnauthorizedEmail(user.email || 'inconnu');
      }
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Erreur lors de la connexion Google');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await logOutAdmin();
    setUnauthorizedEmail(null);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      {/* Back button */}
      <button
        onClick={onCancel}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-black mb-4 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t.backToHome}</span>
      </button>

      <div className="bg-white rounded-3xl border-3 border-[#111111] p-6 sm:p-8 shadow-[6px_6px_0_0_#111111] text-center">
        {/* Shield Icon */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#5B2EFF] border-2 border-[#111111] shadow-[3px_3px_0_0_#111111] flex items-center justify-center text-white mb-4">
          <Shield className="w-9 h-9 stroke-[2.2]" />
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-[#111111] font-['Space_Grotesk'] uppercase tracking-tight">
          {t.adminTitle}
        </h1>
        <p className="text-xs text-gray-600 mt-1 font-semibold">{t.adminSubtitle}</p>

        {/* Unauthorized warning if account logged in is not admin */}
        {unauthorizedEmail && (
          <div className="my-5 p-4 rounded-xl bg-red-50 border-2 border-[#F0443E] text-left">
            <div className="flex items-center gap-2 text-[#F0443E] font-bold text-xs uppercase mb-1">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{t.adminUnauthorizedTitle}</span>
            </div>
            <p className="text-xs text-gray-800 leading-relaxed">
              {t.adminUnauthorizedMsg.replace('{email}', unauthorizedEmail)}
            </p>
            <button
              onClick={handleDisconnect}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#F0443E] underline cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.adminSignOut}</span>
            </button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="my-4 p-3 rounded-lg bg-red-50 border border-red-300 text-xs text-red-700 font-semibold text-left">
            {error}
          </div>
        )}

        {/* Login Prompt */}
        {!unauthorizedEmail && (
          <>
            <p className="text-xs text-gray-600 my-6 font-medium leading-relaxed">
              {t.adminLoginPrompt}
            </p>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-[#111111] font-extrabold text-sm py-3.5 px-4 rounded-xl border-2 border-[#111111] shadow-[3px_3px_0_0_#111111] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Connexion en cours...' : t.adminSignInButton}</span>
            </button>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[11px] text-gray-500 font-semibold">
              <Lock className="w-3 h-3 text-[#5B2EFF]" />
              <span>Contrôle d'accès sécurisé Firebase</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
