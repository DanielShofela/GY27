import React, { useState, useMemo } from 'react';
import { Registration, RegistrationStatus, AttendanceDay, AgeCategory, Language } from '../types/index';
import { translations } from '../i18n/translations';
import { exportRegistrationsToCsv, triggerCsvDownload } from '../utils/csv';
import { updateRegistration, updateRegistrationStatus, deleteRegistration } from '../firebase/services';
import { User } from 'firebase/auth';
import {
  Search,
  Download,
  Trash2,
  Eye,
  CheckCircle,
  AlertTriangle,
  X,
  Phone,
  MapPin,
  Calendar,
  Building,
  Edit3,
  Save,
  Loader2,
  UserCheck,
} from 'lucide-react';

interface AdminRegistrationsProps {
  registrations: Registration[];
  lang: Language;
  currentUser?: User | null;
}

export const AdminRegistrations: React.FC<AdminRegistrationsProps> = ({
  registrations,
  lang,
  currentUser,
}) => {
  const t = translations[lang];

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Selected registration for details modal
  const [activeItem, setActiveItem] = useState<Registration | null>(null);

  // Edit modal state
  const [itemToEdit, setItemToEdit] = useState<Registration | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editChurch, setEditChurch] = useState('');
  const [editAgeCategory, setEditAgeCategory] = useState<AgeCategory>('not_specified');
  const [editDays, setEditDays] = useState<AttendanceDay[]>(['jan_1', 'jan_2', 'jan_3']);
  const [editStatus, setEditStatus] = useState<RegistrationStatus>('confirmed');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete modal state
  const [itemToDelete, setItemToDelete] = useState<Registration | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Status updating indicator & feedback
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [globalFeedback, setGlobalFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setGlobalFeedback({ type, message });
    setTimeout(() => setGlobalFeedback(null), 4000);
  };

  // Extract distinct cities for dropdown filter
  const distinctCities = useMemo(() => {
    const set = new Set<string>();
    registrations.forEach((r) => {
      if (r.city) set.add(r.city.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [registrations]);

  // Filtered registrations
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((item) => {
      const matchSearch =
        !searchTerm.trim() ||
        `${item.firstName} ${item.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.whatsappPhone.includes(searchTerm) ||
        item.referenceCode.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCity = !selectedCity || item.city.trim() === selectedCity;
      const matchStatus = selectedStatus === 'all' || item.status === selectedStatus;

      return matchSearch && matchCity && matchStatus;
    });
  }, [registrations, searchTerm, selectedCity, selectedStatus]);

  // CSV Export
  const handleExportCsv = () => {
    const csv = exportRegistrationsToCsv(filteredRegistrations);
    const dateStr = new Date().toISOString().slice(0, 10);
    triggerCsvDownload(csv, `glorious-youth-2027-inscriptions-${dateStr}.csv`);
  };

  // Status update
  const handleStatusChange = async (docId: string, newStatus: RegistrationStatus) => {
    setUpdatingId(docId);
    try {
      await updateRegistrationStatus(docId, newStatus, currentUser);
      if (activeItem && activeItem.id === docId) {
        setActiveItem({ ...activeItem, status: newStatus });
      }
      showNotification('success', 'Statut mis à jour dans Firebase !');
    } catch (err: any) {
      console.error('Failed to update status:', err);
      showNotification('error', err.message || 'Erreur lors de la mise à jour du statut dans Firebase.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: Registration) => {
    setItemToEdit(item);
    setEditFirstName(item.firstName);
    setEditLastName(item.lastName);
    setEditPhone(item.whatsappPhone);
    setEditCity(item.city);
    setEditChurch(item.church || '');
    setEditAgeCategory(item.ageCategory || 'not_specified');
    setEditDays(item.attendanceDays || ['jan_1', 'jan_2', 'jan_3']);
    setEditStatus(item.status);
    setEditError(null);
  };

  // Submit Edit Modal
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToEdit) return;

    if (!editFirstName.trim() || !editLastName.trim()) {
      setEditError('Le nom et le prénom sont obligatoires.');
      return;
    }
    if (!editCity.trim()) {
      setEditError('La commune ou ville est obligatoire.');
      return;
    }
    if (editDays.length === 0) {
      setEditError('Sélectionnez au moins un jour de participation.');
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);

    try {
      const updated = await updateRegistration(
        itemToEdit.id,
        {
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          whatsappPhone: editPhone.trim(),
          city: editCity.trim(),
          church: editChurch.trim(),
          ageCategory: editAgeCategory,
          attendanceDays: editDays,
          status: editStatus,
        },
        currentUser
      );

      if (activeItem && activeItem.id === itemToEdit.id) {
        setActiveItem(updated);
      }
      setItemToEdit(null);
      showNotification('success', 'Informations du participant enregistrées avec succès dans Firebase !');
    } catch (err: any) {
      console.error('Failed to save registration edit:', err);
      setEditError(err.message || 'Erreur lors de l\'enregistrement dans Firebase.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete confirmation
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteRegistration(itemToDelete.id, currentUser);
      if (activeItem && activeItem.id === itemToDelete.id) {
        setActiveItem(null);
      }
      setItemToDelete(null);
      showNotification('success', 'Inscription supprimée définitivement de Firestore.');
    } catch (err: any) {
      console.error('Failed to delete registration:', err);
      setDeleteError(err.message || 'Erreur lors de la suppression dans Firestore.');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleEditDay = (day: AttendanceDay) => {
    if (editDays.includes(day)) {
      setEditDays(editDays.filter((d) => d !== day));
    } else {
      setEditDays([...editDays, day]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Global feedback toast */}
      {globalFeedback && (
        <div
          className={`p-3.5 rounded-xl border-2 text-xs font-bold flex items-center gap-2 animate-in fade-in shadow-[2px_2px_0_0_#111111] ${
            globalFeedback.type === 'success'
              ? 'bg-green-50 border-green-600 text-green-900'
              : 'bg-red-50 border-[#F0443E] text-red-900'
          }`}
        >
          {globalFeedback.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-[#F0443E] shrink-0" />
          )}
          <span>{globalFeedback.message}</span>
        </div>
      )}

      {/* Top action bar: Search, filters, and CSV Export */}
      <div className="bg-white p-4 rounded-2xl border-2 border-[#111111] shadow-[3px_3px_0_0_#111111] space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 bg-[#FFF3DD]/50 border-2 border-[#111111] rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Export CSV button */}
          <button
            onClick={handleExportCsv}
            disabled={filteredRegistrations.length === 0}
            className="inline-flex items-center justify-center gap-2 bg-[#FF6A00] hover:bg-[#e05e00] text-white text-xs sm:text-sm font-black px-4 py-2.5 rounded-xl border-2 border-[#111111] shadow-[2px_2px_0_0_#111111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer disabled:opacity-50 transition-all shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>{t.exportCsvButton}</span>
          </button>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100 text-xs">
          <span className="font-bold text-gray-600 uppercase text-[11px]">Filtres :</span>

          {/* Filter City */}
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="bg-[#FFF3DD]/50 border-2 border-[#111111] rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none"
          >
            <option value="">{t.filterAllCities}</option>
            {distinctCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Filter Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#FFF3DD]/50 border-2 border-[#111111] rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none"
          >
            <option value="all">{t.filterAllStatuses}</option>
            <option value="confirmed">{t.statusConfirmed}</option>
            <option value="attended">{t.statusAttended}</option>
            <option value="cancelled">{t.statusCancelled}</option>
          </select>

          {/* Count Badge */}
          <span className="ml-auto text-[11px] font-bold text-gray-500">
            {filteredRegistrations.length} résultat{filteredRegistrations.length > 1 ? 's' : ''} sur{' '}
            {registrations.length}
          </span>
        </div>
      </div>

      {/* Registrations List */}
      {filteredRegistrations.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-[#111111] p-10 text-center shadow-[3px_3px_0_0_#111111]">
          <p className="text-sm font-bold text-gray-600">Aucun participant ne correspond aux critères.</p>
          {(searchTerm || selectedCity || selectedStatus !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCity('');
                setSelectedStatus('all');
              }}
              className="mt-3 text-xs font-black text-[#FF6A00] underline cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredRegistrations.map((item) => {
            const isUpdating = updatingId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white p-3.5 sm:p-4 rounded-xl border-2 border-[#111111] shadow-[2px_2px_0_0_#111111] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#FF6A00] transition-colors"
              >
                {/* Info block */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-black bg-[#FFF3DD] text-[#111111] px-2 py-0.5 rounded border border-[#111111]">
                      {item.referenceCode}
                    </span>
                    <span className="font-black text-sm sm:text-base text-[#111111] truncate">
                      {item.lastName} {item.firstName}
                    </span>
                    {/* Status badge */}
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        item.status === 'confirmed'
                          ? 'bg-green-100 text-green-800 border-green-600'
                          : item.status === 'attended'
                          ? 'bg-blue-100 text-blue-800 border-blue-600'
                          : 'bg-red-100 text-red-800 border-red-600'
                      }`}
                    >
                      {item.status === 'confirmed'
                        ? t.statusConfirmed
                        : item.status === 'attended'
                        ? t.statusAttended
                        : t.statusCancelled}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-600 font-medium">
                    <span className="flex items-center gap-1 font-semibold text-gray-800">
                      <Phone className="w-3 h-3 text-[#2457FF]" />
                      {item.whatsappPhone}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#FF6A00]" />
                      {item.city}
                    </span>
                    {item.church && (
                      <span className="flex items-center gap-1 text-gray-500">
                        <Building className="w-3 h-3" />
                        {item.church}
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('fr-FR') : ''}
                    </span>
                  </div>
                </div>

                {/* Actions group */}
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  {/* Status Toggle Quick Buttons */}
                  {item.status !== 'attended' && (
                    <button
                      onClick={() => handleStatusChange(item.id, 'attended')}
                      disabled={isUpdating}
                      title="Marquer présent à l'événement"
                      className="px-2 py-1 text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-300 rounded-lg cursor-pointer"
                    >
                      {isUpdating ? '...' : '✓ Présent'}
                    </button>
                  )}

                  {item.status !== 'confirmed' && (
                    <button
                      onClick={() => handleStatusChange(item.id, 'confirmed')}
                      disabled={isUpdating}
                      title="Marquer confirmé"
                      className="px-2 py-1 text-[11px] font-bold bg-green-50 text-green-700 hover:bg-green-100 border border-green-300 rounded-lg cursor-pointer"
                    >
                      {isUpdating ? '...' : 'Confirmer'}
                    </button>
                  )}

                  {/* Edit details */}
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 bg-[#FFD21F]/30 hover:bg-[#FFD21F] text-[#111111] rounded-lg border border-[#111111] cursor-pointer"
                    title="Modifier les informations"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {/* View Details */}
                  <button
                    onClick={() => setActiveItem(item)}
                    className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg border border-gray-400 cursor-pointer"
                    title="Voir la fiche complète"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => setItemToDelete(item)}
                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-300 cursor-pointer"
                    title="Supprimer définitivement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          MODAL 1: VIEW DETAILS
         ========================================================================= */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-3 border-[#111111] max-w-lg w-full p-6 shadow-[8px_8px_0_0_#111111] relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveItem(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-black p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b-2 border-gray-100 pb-3 mb-4">
              <span className="font-mono text-xs font-black bg-[#FFF3DD] text-[#111111] px-2.5 py-0.5 rounded border border-[#111111]">
                {activeItem.referenceCode}
              </span>
              <h3 className="text-xl font-black text-[#111111] mt-2 font-['Space_Grotesk']">
                {activeItem.lastName} {activeItem.firstName}
              </h3>
              <p className="text-xs text-gray-500 font-semibold">
                Inscrit le {new Date(activeItem.createdAt).toLocaleString('fr-FR')}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#FFF3DD]/50 rounded-xl border border-[#111111] space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-500">Numéro WhatsApp :</span>
                  <span className="font-mono font-bold text-[#111111]">{activeItem.whatsappPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-gray-500">Commune / Ville :</span>
                  <span className="font-bold text-[#111111]">{activeItem.city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-gray-500">Église chrétienne :</span>
                  <span className="font-bold text-[#111111]">{activeItem.church || 'Non spécifiée'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-gray-500">Tranche d'âge :</span>
                  <span className="font-bold text-[#111111]">{activeItem.ageCategory || 'Non précisée'}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-gray-600 block mb-1">Jours de participation :</span>
                <div className="flex flex-wrap gap-1.5">
                  {(activeItem.attendanceDays || []).map((day) => (
                    <span
                      key={day}
                      className="px-2 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 rounded font-bold text-[11px]"
                    >
                      {day === 'jan_1' ? '1er Janvier' : day === 'jan_2' ? '2 Janvier' : '3 Janvier'}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-bold text-gray-600 block mb-1">Statut actuel :</span>
                <select
                  value={activeItem.status}
                  onChange={(e) => handleStatusChange(activeItem.id, e.target.value as RegistrationStatus)}
                  className="bg-white border-2 border-[#111111] rounded-lg px-2.5 py-1 text-xs font-bold"
                >
                  <option value="confirmed">Confirmé</option>
                  <option value="attended">Présent à l'événement</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-between gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => {
                  const item = activeItem;
                  setActiveItem(null);
                  handleOpenEdit(item);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF6A00] hover:bg-[#e05e00] text-white font-bold text-xs rounded-xl border border-[#111111] cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modifier les données</span>
              </button>

              <button
                onClick={() => setActiveItem(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs rounded-xl cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: EDIT REGISTRATION FORM
         ========================================================================= */}
      {itemToEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-3 border-[#111111] max-w-lg w-full p-6 shadow-[8px_8px_0_0_#111111] relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setItemToEdit(null)}
              disabled={isSavingEdit}
              className="absolute top-4 right-4 text-gray-400 hover:text-black p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b-2 border-gray-100 pb-3 mb-4">
              <div className="inline-block bg-[#FFD21F] text-[#111111] text-[10px] font-black uppercase px-2 py-0.5 rounded border border-[#111111] mb-1">
                Modification Participant
              </div>
              <h3 className="text-lg font-black text-[#111111] uppercase font-['Space_Grotesk']">
                {itemToEdit.referenceCode}
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                Mettre à jour les informations enregistrées dans Firestore.
              </p>
            </div>

            {editError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border-2 border-[#F0443E] text-xs font-bold text-red-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#F0443E] shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-700 block mb-1 uppercase">Nom</label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full bg-[#FFF3DD]/40 border-2 border-[#111111] rounded-xl px-3 py-2 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1 uppercase">Prénom</label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full bg-[#FFF3DD]/40 border-2 border-[#111111] rounded-xl px-3 py-2 font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1 uppercase">Numéro WhatsApp</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-[#FFF3DD]/40 border-2 border-[#111111] rounded-xl px-3 py-2 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-700 block mb-1 uppercase">Commune / Ville</label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full bg-[#FFF3DD]/40 border-2 border-[#111111] rounded-xl px-3 py-2 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1 uppercase">Église (facultatif)</label>
                  <input
                    type="text"
                    value={editChurch}
                    onChange={(e) => setEditChurch(e.target.value)}
                    className="w-full bg-[#FFF3DD]/40 border-2 border-[#111111] rounded-xl px-3 py-2 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-700 block mb-1 uppercase">Tranche d'âge</label>
                  <select
                    value={editAgeCategory}
                    onChange={(e) => setEditAgeCategory(e.target.value as AgeCategory)}
                    className="w-full bg-[#FFF3DD]/40 border-2 border-[#111111] rounded-xl px-2.5 py-2 font-semibold"
                  >
                    <option value="under_15">Moins de 15 ans</option>
                    <option value="15_17">15 – 17 ans</option>
                    <option value="18_25">18 – 25 ans</option>
                    <option value="26_35">26 – 35 ans</option>
                    <option value="over_35">Plus de 35 ans</option>
                    <option value="not_specified">Non précisée</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1 uppercase">Statut d'inscription</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as RegistrationStatus)}
                    className="w-full bg-[#FFF3DD]/40 border-2 border-[#111111] rounded-xl px-2.5 py-2 font-bold"
                  >
                    <option value="confirmed">Confirmé</option>
                    <option value="attended">Présent</option>
                    <option value="cancelled">Annulé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1.5 uppercase">Jours de présence</label>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-1.5 bg-[#FFF3DD]/60 border border-[#111111] px-2.5 py-1.5 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editDays.includes('jan_1')}
                      onChange={() => toggleEditDay('jan_1')}
                    />
                    <span>1er Janvier</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 bg-[#FFF3DD]/60 border border-[#111111] px-2.5 py-1.5 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editDays.includes('jan_2')}
                      onChange={() => toggleEditDay('jan_2')}
                    />
                    <span>2 Janvier</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 bg-[#FFF3DD]/60 border border-[#111111] px-2.5 py-1.5 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editDays.includes('jan_3')}
                      onChange={() => toggleEditDay('jan_3')}
                    />
                    <span>3 Janvier</span>
                  </label>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setItemToEdit(null)}
                  disabled={isSavingEdit}
                  className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF6A00] hover:bg-[#e05e00] text-white font-black text-xs rounded-xl border-2 border-[#111111] shadow-[2px_2px_0_0_#111111] cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Enregistrer dans Firestore</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: DELETE CONFIRMATION
         ========================================================================= */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-3 border-[#111111] max-w-sm w-full p-6 shadow-[8px_8px_0_0_#111111] text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-100 border-2 border-[#111111] flex items-center justify-center text-[#F0443E] mb-3">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-black text-[#111111] uppercase font-['Space_Grotesk']">
              {t.deleteConfirmTitle}
            </h3>
            <p className="text-xs text-gray-600 mt-2 font-medium">
              Supprimer l'inscription de{' '}
              <strong className="text-[#111111]">
                {itemToDelete.firstName} {itemToDelete.lastName}
              </strong>{' '}
              ({itemToDelete.referenceCode}) ?
            </p>
            <p className="text-[11px] text-red-600 font-semibold mt-1">{t.deleteConfirmMsg}</p>

            {deleteError && (
              <div className="mt-3 p-2 bg-red-50 border border-red-300 rounded text-[11px] text-red-700 font-bold">
                {deleteError}
              </div>
            )}

            <div className="mt-5 flex gap-2 justify-center">
              <button
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs rounded-xl border border-gray-400 cursor-pointer"
              >
                {t.btnCancel}
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-[#F0443E] hover:bg-red-700 text-white font-black text-xs rounded-xl border-2 border-[#111111] cursor-pointer shadow-[2px_2px_0_0_#111111]"
              >
                {isDeleting ? 'Suppression...' : t.btnConfirmDelete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
