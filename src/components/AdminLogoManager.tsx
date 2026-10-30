import React, { useState, useRef } from 'react';
import { EventSettings, Language } from '../types/index';
import { sanitizeAndValidateSvg } from '../utils/svgSecurity';
import {
  updateOfficialLogo,
  removeOfficialLogo,
  resetOfficialLogoToDefault,
  updateHeaderLogo,
  removeHeaderLogo,
  useMainLogoAsHeaderLogo,
} from '../firebase/services';
import { User } from 'firebase/auth';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Eye,
  ShieldCheck,
  FileCheck,
  Copy,
  LayoutTemplate,
  RotateCcw,
} from 'lucide-react';

interface AdminLogoManagerProps {
  settings: EventSettings;
  lang: Language;
  currentUser?: User | null;
  onSettingsUpdated: (updated: EventSettings) => void;
}

export const AdminLogoManager: React.FC<AdminLogoManagerProps> = ({
  settings,
  lang,
  currentUser,
  onSettingsUpdated,
}) => {
  // Tab selector between Main Logo and Header Logo
  const [activeSubTab, setActiveSubTab] = useState<'main' | 'header'>('main');

  // File input refs for each location
  const mainFileInputRef = useRef<HTMLInputElement>(null);
  const headerFileInputRef = useRef<HTMLInputElement>(null);

  // Staged states for Main Logo
  const [mainPreviewUri, setMainPreviewUri] = useState<string | null>(null);
  const [mainRawSvg, setMainRawSvg] = useState<string | null>(null);
  const [mainFileName, setMainFileName] = useState<string | null>(null);
  const [mainFileSizeKb, setMainFileSizeKb] = useState<number | null>(null);

  // Staged states for Header Logo
  const [headerPreviewUri, setHeaderPreviewUri] = useState<string | null>(null);
  const [headerRawSvg, setHeaderRawSvg] = useState<string | null>(null);
  const [headerFileName, setHeaderFileName] = useState<string | null>(null);
  const [headerFileSizeKb, setHeaderFileSizeKb] = useState<number | null>(null);

  // Status feedback
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearNotifications = () => {
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  // Helper to read and securely sanitize an SVG file
  const processSvgFile = (
    file: File,
    onSuccess: (dataUri: string, rawSvg: string, name: string, sizeKb: number) => void
  ) => {
    clearNotifications();

    if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') {
      setErrorMessage(
        lang === 'fr'
          ? 'Format non supporté. Veuillez sélectionner un fichier vectoriel SVG.'
          : 'Unsupported format. Please select an SVG vector file.'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawContent = event.target?.result;
      if (typeof rawContent !== 'string') {
        setErrorMessage(
          lang === 'fr'
            ? 'Impossible de lire le fichier sélectionné.'
            : 'Could not read the selected file.'
        );
        return;
      }

      const validation = sanitizeAndValidateSvg(rawContent, file.size);
      if (!validation.isValid) {
        if (validation.error === 'FILE_TOO_LARGE') {
          setErrorMessage(
            lang === 'fr'
              ? 'Le fichier est trop volumineux. La taille maximale autorisée est de 2,5 Mo.'
              : 'File is too large. Maximum allowed size is 2.5MB.'
          );
        } else if (validation.error === 'ACTIVE_CODE_OR_DANGEROUS_ELEMENTS_DETECTED') {
          setErrorMessage(
            lang === 'fr'
              ? 'Sécurité : Le fichier SVG a été rejeté car il contient des scripts ou du code actif potentiellement malveillant.'
              : 'Security: SVG rejected because it contains active scripts or code.'
          );
        } else {
          setErrorMessage(
            lang === 'fr'
              ? 'Le fichier sélectionné n\'est pas un SVG valide.'
              : 'The selected file is not a valid SVG.'
          );
        }
        return;
      }

      onSuccess(
        validation.dataUri || '',
        validation.sanitizedSvg || '',
        file.name,
        Math.round(file.size / 1024)
      );
    };

    reader.onerror = () => {
      setErrorMessage(
        lang === 'fr' ? 'Erreur lors de la lecture du fichier.' : 'Error reading file.'
      );
    };

    reader.readAsText(file);
  };

  // --- Handlers for Main Logo ---
  const handleMainFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSvgFile(file, (dataUri, rawSvg, name, sizeKb) => {
      setMainPreviewUri(dataUri);
      setMainRawSvg(rawSvg);
      setMainFileName(name);
      setMainFileSizeKb(sizeKb);
    });
  };

  const handleSaveMainLogo = async () => {
    if (!mainPreviewUri) return;
    setIsProcessing(true);
    clearNotifications();

    try {
      const finalUrl = await updateOfficialLogo(mainPreviewUri, mainRawSvg || undefined, currentUser);
      const updated: EventSettings = {
        ...settings,
        logoUrl: finalUrl,
        logoUpdatedAt: new Date().toISOString(),
      };
      onSettingsUpdated(updated);
      setSuccessMessage(
        lang === 'fr'
          ? 'Logo principal enregistré avec succès ! Il est immédiatement actif sur la page d\'accueil.'
          : 'Main logo saved successfully! It is now active on the homepage.'
      );
      setMainPreviewUri(null);
      setMainRawSvg(null);
      setMainFileName(null);
    } catch (err: any) {
      console.error('Error saving main logo:', err);
      const isSizeError = err?.message?.includes('exceeds the maximum') || err?.message?.includes('1048576');
      setErrorMessage(
        err.message === 'NOT_AUTHORIZED'
          ? (lang === 'fr' ? 'Action non autorisée. Votre compte administrateur doit être vérifié.' : 'Unauthorized action.')
          : isSizeError
          ? (lang === 'fr' ? 'Le fichier SVG dépasse les limites de stockage. Veuillez utiliser un fichier SVG vectoriel optimisé.' : 'SVG exceeds document limit. Please use an optimized SVG.')
          : (err.message || 'Erreur lors de l\'enregistrement du logo principal dans Firebase.')
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveMainLogo = async () => {
    if (
      !window.confirm(
        lang === 'fr'
          ? 'Êtes-vous sûr de vouloir supprimer le logo principal ? La page d\'accueil affichera le titre textuel de secours.'
          : 'Are you sure you want to remove the main logo?'
      )
    ) {
      return;
    }

    setIsProcessing(true);
    clearNotifications();

    try {
      await removeOfficialLogo(currentUser);
      onSettingsUpdated({
        ...settings,
        logoUrl: '',
        logoUpdatedAt: new Date().toISOString(),
      });
      setSuccessMessage(
        lang === 'fr'
          ? 'Logo principal retiré. Le titre de secours est maintenant actif.'
          : 'Main logo removed.'
      );
    } catch (err: any) {
      console.error('Error removing main logo:', err);
      setErrorMessage('Erreur lors de la suppression du logo principal.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetMainToDefault = async () => {
    setIsProcessing(true);
    clearNotifications();

    try {
      const defaultUrl = await resetOfficialLogoToDefault(currentUser);
      onSettingsUpdated({
        ...settings,
        logoUrl: defaultUrl,
        logoUpdatedAt: new Date().toISOString(),
      });
      setSuccessMessage(
        lang === 'fr'
          ? 'Logo officiel par défaut restauré avec succès !'
          : 'Default official logo restored successfully!'
      );
    } catch (err: any) {
      console.error('Error restoring default logo:', err);
      setErrorMessage('Erreur lors de la restauration du logo par défaut.');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Handlers for Header Logo ---
  const handleHeaderFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSvgFile(file, (dataUri, rawSvg, name, sizeKb) => {
      setHeaderPreviewUri(dataUri);
      setHeaderRawSvg(rawSvg);
      setHeaderFileName(name);
      setHeaderFileSizeKb(sizeKb);
    });
  };

  const handleSaveHeaderLogo = async () => {
    if (!headerPreviewUri) return;
    setIsProcessing(true);
    clearNotifications();

    try {
      const finalUrl = await updateHeaderLogo(headerPreviewUri, headerRawSvg || undefined, currentUser);
      const updated: EventSettings = {
        ...settings,
        headerLogoUrl: finalUrl,
        headerLogoUpdatedAt: new Date().toISOString(),
      };
      onSettingsUpdated(updated);
      setSuccessMessage(
        lang === 'fr'
          ? 'Logo du header enregistré avec succès ! Il remplace l\'icône GYW dans la barre de navigation.'
          : 'Header logo saved successfully! It now replaces the GYW icon in navigation.'
      );
      setHeaderPreviewUri(null);
      setHeaderRawSvg(null);
      setHeaderFileName(null);
    } catch (err: any) {
      console.error('Error saving header logo:', err);
      setErrorMessage(
        err.message === 'NOT_AUTHORIZED'
          ? 'Action non autorisée. Votre compte administrateur doit être vérifié.'
          : 'Erreur lors de l\'enregistrement du logo du header dans Firebase.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveHeaderLogo = async () => {
    if (
      !window.confirm(
        lang === 'fr'
          ? 'Rétablir l\'icône GYW par défaut pour le header ?'
          : 'Reset header logo to default GYW badge?'
      )
    ) {
      return;
    }

    setIsProcessing(true);
    clearNotifications();

    try {
      await removeHeaderLogo(currentUser);
      onSettingsUpdated({
        ...settings,
        headerLogoUrl: '',
        headerLogoUpdatedAt: new Date().toISOString(),
      });
      setSuccessMessage(
        lang === 'fr'
          ? 'Logo du header retiré. L\'icône GYW par défaut est de nouveau affichée.'
          : 'Header logo removed. Default GYW icon restored.'
      );
    } catch (err: any) {
      console.error('Error removing header logo:', err);
      setErrorMessage('Erreur lors de la suppression du logo du header.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReuseMainLogoAsHeader = async () => {
    setIsProcessing(true);
    clearNotifications();

    try {
      const reusedUrl = await useMainLogoAsHeaderLogo(currentUser);
      onSettingsUpdated({
        ...settings,
        headerLogoUrl: reusedUrl,
        headerLogoUpdatedAt: new Date().toISOString(),
      });
      setSuccessMessage(
        lang === 'fr'
          ? 'Le logo principal est désormais également utilisé dans le header !'
          : 'Main logo is now used in the navigation header!'
      );
    } catch (err: any) {
      console.error('Error copying main logo to header:', err);
      setErrorMessage('Erreur lors de la réutilisation du logo principal.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-[#111111] p-5 sm:p-7 shadow-[4px_4px_0_0_#111111] max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b-2 border-gray-100 pb-3">
        <div className="flex items-center gap-2 text-[#FF6A00] font-black text-xs uppercase mb-1">
          <ImageIcon className="w-4 h-4" />
          <span>Administration • Paramètres • Identité Visuelle</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-[#111111] uppercase font-['Space_Grotesk']">
          Gestion des Logos Officiels
        </h2>
        <p className="text-xs text-gray-600 mt-1 font-medium">
          Configurez indépendamment le logo officiel de la page d'accueil et le logo de navigation du header.
        </p>
      </div>

      {/* Sub-tab Switcher: Logo Principal vs Logo Header */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-[#FFF3DD] rounded-xl border-2 border-[#111111]">
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('main');
            clearNotifications();
          }}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-black uppercase transition-all cursor-pointer ${
            activeSubTab === 'main'
              ? 'bg-[#FF6A00] text-white shadow-[2px_2px_0_0_#111111] border border-[#111111]'
              : 'text-gray-700 hover:text-[#111111] hover:bg-white/50'
          }`}
        >
          <LayoutTemplate className="w-4 h-4" />
          <span>A. Logo Principal</span>
          {settings.logoUrl && (
            <span className="hidden xs:inline-block w-2 h-2 rounded-full bg-green-400" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('header');
            clearNotifications();
          }}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-black uppercase transition-all cursor-pointer ${
            activeSubTab === 'header'
              ? 'bg-[#FF6A00] text-white shadow-[2px_2px_0_0_#111111] border border-[#111111]'
              : 'text-gray-700 hover:text-[#111111] hover:bg-white/50'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>B. Logo du Header</span>
          {settings.headerLogoUrl && (
            <span className="hidden xs:inline-block w-2 h-2 rounded-full bg-green-400" />
          )}
        </button>
      </div>

      {/* Hidden Mobile-compatible file inputs */}
      <input
        type="file"
        ref={mainFileInputRef}
        onChange={handleMainFileChange}
        accept=".svg,image/svg+xml"
        className="hidden"
      />
      <input
        type="file"
        ref={headerFileInputRef}
        onChange={handleHeaderFileChange}
        accept=".svg,image/svg+xml"
        className="hidden"
      />

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-green-50 border-2 border-green-500 text-xs font-bold text-green-900 flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border-2 border-[#F0443E] text-xs font-bold text-red-900 flex items-start gap-2 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-[#F0443E] shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* =========================================================================
          SECTION A : LOGO PRINCIPAL (PAGE D'ACCUEIL)
         ========================================================================= */}
      {activeSubTab === 'main' && (
        <div className="space-y-5 animate-in fade-in">
          <div className="p-4 rounded-xl border-2 border-[#111111] bg-[#FFF3DD]/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black uppercase text-[#111111] flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#2457FF]" />
                Logo Principal Actuel (Page d'accueil)
              </span>
              {settings.logoUrl ? (
                <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full border border-green-300">
                  Actif sur l'accueil
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                  Titre de secours actif
                </span>
              )}
            </div>

            {/* Current Active Main Logo Preview */}
            {settings.logoUrl ? (
              <div className="space-y-3">
                <div
                  className="p-6 rounded-xl border-2 border-[#111111] flex items-center justify-center min-h-[170px] overflow-hidden"
                  style={{
                    backgroundColor: '#FFF3DD',
                    backgroundImage:
                      'linear-gradient(45deg, #f7e6c9 25%, transparent 25%), linear-gradient(-45deg, #f7e6c9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f7e6c9 75%), linear-gradient(-45deg, transparent 75%, #f7e6c9 75%)',
                    backgroundSize: '16px 16px',
                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                  }}
                >
                  <img
                    src={settings.logoUrl}
                    alt="Logo principal en ligne"
                    className="max-h-40 w-auto max-w-full object-contain"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-gray-500 font-medium">
                    {settings.logoUpdatedAt
                      ? `Mis à jour le ${new Date(settings.logoUpdatedAt).toLocaleString('fr-FR')}`
                      : 'Logo enregistré'}
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        clearNotifications();
                        mainFileInputRef.current?.click();
                      }}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 bg-[#FF6A00] hover:bg-[#e05e00] text-white font-bold text-xs px-3 py-1.5 rounded-lg border-2 border-[#111111] shadow-[2px_2px_0_0_#111111] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Remplacer le logo</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetMainToDefault}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1 bg-white hover:bg-gray-100 text-[#111111] font-semibold text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 cursor-pointer"
                      title="Rétablir le logo officiel vectoriel d'origine"
                    >
                      <RotateCcw className="w-3 h-3 text-[#2457FF]" />
                      <span>Logo d'origine</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRemoveMainLogo}
                      disabled={isProcessing}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-300 cursor-pointer"
                      title="Supprimer le logo principal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl border-2 border-dashed border-gray-400 bg-white/70 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700">Aucun logo principal configuré</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    La page d'accueil affiche actuellement le titre textuel de secours.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearNotifications();
                      mainFileInputRef.current?.click();
                    }}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-2 bg-[#FF6A00] hover:bg-[#e05e00] text-white font-extrabold text-xs px-4 py-2 rounded-xl border-2 border-[#111111] shadow-[2px_2px_0_0_#111111] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Importer un logo SVG</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetMainToDefault}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1.5 bg-white hover:bg-gray-100 text-[#111111] font-bold text-xs px-3.5 py-2 rounded-xl border-2 border-[#111111] shadow-[2px_2px_0_0_#111111] cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
                  >
                    <RotateCcw className="w-4 h-4 text-[#2457FF]" />
                    <span>Utiliser le logo officiel par défaut</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Staged Preview Before Saving Main Logo */}
          {mainPreviewUri && (
            <div className="p-4 rounded-xl border-3 border-[#2457FF] bg-blue-50/50 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#2457FF] flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4" />
                  Aperçu avant enregistrement (Logo Principal)
                </span>
                <span className="text-[10px] font-bold text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-300">
                  {mainFileName} ({mainFileSizeKb} Ko)
                </span>
              </div>

              <div
                className="p-6 rounded-xl border-2 border-[#111111] flex items-center justify-center min-h-[160px] overflow-hidden"
                style={{
                  backgroundColor: '#FFF3DD',
                  backgroundImage:
                    'linear-gradient(45deg, #f7e6c9 25%, transparent 25%), linear-gradient(-45deg, #f7e6c9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f7e6c9 75%), linear-gradient(-45deg, transparent 75%, #f7e6c9 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                }}
              >
                <img
                  src={mainPreviewUri}
                  alt="Aperçu nouveau logo principal"
                  className="max-h-40 w-auto max-w-full object-contain"
                />
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-green-700 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>SVG assaini et validé avec succès (aucun code actif dangereux, taille &lt; 2 Mo).</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveMainLogo}
                  disabled={isProcessing}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-[#2457FF] hover:bg-[#1a44d1] text-white font-black text-xs sm:text-sm py-3 px-4 rounded-xl border-2 border-[#111111] shadow-[3px_3px_0_0_#111111] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{isProcessing ? 'Enregistrement en cours...' : 'Enregistrer le logo principal'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMainPreviewUri(null);
                    setMainRawSvg(null);
                    setMainFileName(null);
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs rounded-xl border border-gray-400 cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SECTION B : LOGO DU HEADER (BARRE DE NAVIGATION)
         ========================================================================= */}
      {activeSubTab === 'header' && (
        <div className="space-y-5 animate-in fade-in">
          <div className="p-4 rounded-xl border-2 border-[#111111] bg-[#FFF3DD]/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black uppercase text-[#111111] flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#2457FF]" />
                Logo Actuel du Header (Navigation)
              </span>
              {settings.headerLogoUrl ? (
                <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full border border-green-300">
                  Logo personnalisé actif
                </span>
              ) : (
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-300">
                  Icône GYW par défaut
                </span>
              )}
            </div>

            {/* Live simulation of the Header navbar */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-gray-600 block uppercase">
                Aperçu en situation dans la barre de navigation :
              </span>
              <div className="p-3 rounded-xl border-2 border-[#111111] bg-[#FFF3DD] shadow-[2px_2px_0_0_#111111] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {settings.headerLogoUrl ? (
                    <div className="h-10 sm:h-11 flex items-center justify-center shrink-0">
                      <img
                        src={settings.headerLogoUrl}
                        alt="Logo Header"
                        className="h-9 sm:h-10 max-h-10 sm:max-h-11 w-auto max-w-[120px] object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-[#FF6A00] border-2 border-[#111111] shadow-[2px_2px_0_0_#111111] flex items-center justify-center text-white font-black text-xl tracking-tighter shrink-0">
                      GYW
                    </div>
                  )}

                  <div className="flex flex-col">
                    <span className="font-extrabold text-[#111111] text-sm leading-tight tracking-tight uppercase font-['Space_Grotesk']">
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
                </div>

                <div className="text-[10px] font-bold bg-white px-2 py-1 rounded border border-[#111111] text-gray-600">
                  Navbar
                </div>
              </div>
            </div>

            {/* Action buttons for Header Logo */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <span className="text-[11px] text-gray-500 font-medium">
                {settings.headerLogoUpdatedAt
                  ? `Mis à jour le ${new Date(settings.headerLogoUpdatedAt).toLocaleString('fr-FR')}`
                  : 'Configuration actuelle'}
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearNotifications();
                    headerFileInputRef.current?.click();
                  }}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 bg-[#FF6A00] hover:bg-[#e05e00] text-white font-bold text-xs px-3 py-1.5 rounded-lg border-2 border-[#111111] shadow-[2px_2px_0_0_#111111] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{settings.headerLogoUrl ? 'Remplacer le logo' : 'Importer un logo'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleReuseMainLogoAsHeader}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 bg-white hover:bg-gray-100 text-[#111111] font-bold text-xs px-3 py-1.5 rounded-lg border-2 border-[#111111] shadow-[2px_2px_0_0_#111111] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all"
                  title="Utiliser automatiquement le logo principal dans le header"
                >
                  <Copy className="w-3.5 h-3.5 text-[#5B2EFF]" />
                  <span>Réutiliser le logo principal</span>
                </button>

                {settings.headerLogoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveHeaderLogo}
                    disabled={isProcessing}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-300 cursor-pointer"
                    title="Rétablir l'icône GYW par défaut"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Staged Preview Before Saving Header Logo */}
          {headerPreviewUri && (
            <div className="p-4 rounded-xl border-3 border-[#2457FF] bg-blue-50/50 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#2457FF] flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4" />
                  Aperçu avant enregistrement (Logo Header)
                </span>
                <span className="text-[10px] font-bold text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-300">
                  {headerFileName} ({headerFileSizeKb} Ko)
                </span>
              </div>

              {/* Simulated header preview with the staged file */}
              <div className="p-3 rounded-xl border-2 border-[#111111] bg-[#FFF3DD] shadow-[2px_2px_0_0_#111111] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 sm:h-11 flex items-center justify-center shrink-0">
                    <img
                      src={headerPreviewUri}
                      alt="Nouveau logo header"
                      className="h-9 sm:h-10 max-h-10 sm:max-h-11 w-auto max-w-[120px] object-contain"
                    />
                  </div>

                  <div className="flex flex-col">
                    <span className="font-extrabold text-[#111111] text-sm leading-tight tracking-tight uppercase font-['Space_Grotesk']">
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
                </div>

                <span className="text-[10px] font-black uppercase text-green-700 bg-green-100 px-2 py-0.5 rounded border border-green-300">
                  Nouveau
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-green-700 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Fichier SVG assaini et prêt pour le header (hauteur adaptée, proportions préservées).</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveHeaderLogo}
                  disabled={isProcessing}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-[#2457FF] hover:bg-[#1a44d1] text-white font-black text-xs sm:text-sm py-3 px-4 rounded-xl border-2 border-[#111111] shadow-[3px_3px_0_0_#111111] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{isProcessing ? 'Enregistrement en cours...' : 'Enregistrer le logo du header'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHeaderPreviewUri(null);
                    setHeaderRawSvg(null);
                    setHeaderFileName(null);
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs rounded-xl border border-gray-400 cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Security guarantee notice */}
      <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-[11px] text-gray-600 space-y-1">
        <div className="font-extrabold text-[#111111] uppercase flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#5B2EFF]" />
          <span>Garanties de sécurité &amp; conformité visuelle</span>
        </div>
        <p className="leading-relaxed">
          • Contrôle d'accès strict : Seuls les comptes administrateurs vérifiés sont autorisés à modifier les logos.<br />
          • Assainissement DOMPurify : Suppression totale des balises script, iframes, foreignObject et attributs on*. <br />
          • Rendu sécurisé : Les logos sont affichés exclusivement via des balises HTML img natives sans injection directe de code HTML.<br />
          • Performance &amp; Cache : Invalidation immédiate du cache à chaque mise à jour grâce au versionnage horodaté.
        </p>
      </div>
    </div>
  );
};
