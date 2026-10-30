import React, { useState, useMemo } from 'react';
import { Registration, RegistrationStatus, Language } from '../types/index';
import { translations } from '../i18n/translations';
import { exportRegistrationsToCsv, triggerCsvDownload } from '../utils/csv';
import { updateRegistrationStatus, deleteRegistration } from '../firebase/services';
import {
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  UserCheck,
  AlertTriangle,
  X,
  Phone,
  MapPin,
  Calendar,
  Building,
} from 'lucide-react';

interface AdminRegistrationsProps {
  registrations: Registration[];
  lang: Language;
}

export const AdminRegistrations: React.FC<AdminRegistrationsProps> = ({
  registrations,
  lang,
}) => {
  const t = translations[lang];

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Selected registration for details modal
  const [activeItem, setActiveItem] = useState<Registration | null>(null);

  // Delete modal state
  const [itemToDelete, setItemToDelete] = useState<Registration | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status updating indicator
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
      await updateRegistrationStatus(docId, newStatus);
      if (activeItem && activeItem.id === docId) {
        setActiveItem({ ...activeItem, status: newStatus });
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Delete confirmation
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await deleteRegistration(itemToDelete.id);
      if (activeItem && activeItem.id === itemToDelete.id) {
        setActiveItem(null);
      }
      setItemToDelete(null);
    } catch (err) {
      console.error('Failed to delete registration:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-black"
              >
                ✕
              </button>
            )}
          </div>

          {/* Export CSV button */}
          <button
            onClick={handleExportCsv}
            disabled={filteredRegistrations.length === 0}
            className="inline-flex items-center justify-center gap-2 bg-[#2457FF] hover:bg-[#1a44d1] text-white font-extrabold text-xs sm:text-sm px-4 py-2 rounded-xl border-2 border-[#111111] shadow-[2px_2px_0_0_#111111] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>{t.exportCsvButton}</span>
          </button>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
            <Filter className="w-3.5 h-3.5 text-[#FF6A00]" />
            <span>Filtres :</span>
          </div>

          {/* City filter */}
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="bg-white border-2 border-[#111111] rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none"
          >
            <option value="">{t.filterAllCities}</option>
            {distinctCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white border-2 border-[#111111] rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none"
          >
            <option value="all">{t.filterAllStatuses}</option>
            <option value="confirmed">{t.statusConfirmed}</option>
            <option value="attended">{t.statusAttended}</option>
            <option value="cancelled">{t.statusCancelled}</option>
          </select>

          <span className="text-xs font-bold text-gray-600 ml-auto">
            {filteredRegistrations.length} résultat{filteredRegistrations.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Registrations List (Mobile card layout + Desktop table) */}
      {filteredRegistrations.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-[#111111] text-center">
          <p className="text-sm font-bold text-gray-600">Aucune inscription ne correspond à ces critères.</p>
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
                  {/* Status Toggle Buttons */}
                  {item.status !== 'attended' && (
                    <button
                      onClick={() => handleStatusChange(item.id, 'attended')}
                      disabled={isUpdating}
                      title="Marquer présent à l'événement"
                      className="px-2 py-1 text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-300 rounded-lg cursor-pointer"
                    >
                      ✓ Présent
                    </button>
                  )}

                  {item.status !== 'confirmed' && (
                    <button
                      onClick={() => handleStatusChange(item.id, 'confirmed')}
                      disabled={isUpdating}
                      title="Marquer confirmé"
                      className="px-2 py-1 text-[11px] font-bold bg-green-50 text-green-700 hover:bg-green-100 border border-green-300 rounded-lg cursor-pointer"
                    >
                      Confirmer
                    </button>
                  )}

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

      {/* Attendee Details Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-3 border-[#111111] max-w-lg w-full p-6 shadow-[8px_8px_0_0_#111111] relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveItem(null)}
              className="absolute top-4 right-4 p-1 text-gray-500 hover:text-black cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="inline-block bg-[#FFD21F] text-[#111111] text-xs font-black px-3 py-0.5 rounded border border-[#111111] uppercase mb-2">
              Fiche Participant
            </div>

            <h3 className="text-xl font-black text-[#111111] uppercase font-['Space_Grotesk']">
              {activeItem.lastName} {activeItem.firstName}
            </h3>
            <p className="font-mono text-sm font-bold text-[#FF6A00] mt-0.5">
              Réf: {activeItem.referenceCode}
            </p>

            <div className="mt-4 space-y-3 text-xs sm:text-sm">
              <div className="p-3 bg-[#FFF3DD]/60 rounded-xl border border-[#111111] space-y-2">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-600">Numéro WhatsApp :</span>
                  <a
                    href={`https://wa.me/${activeItem.normalizedPhone.replace('+', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-[#2457FF] underline flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    {activeItem.whatsappPhone}
                  </a>
                </div>

                <div className="flex justify-between">
                  <span className="font-bold text-gray-600">Commune / Ville :</span>
                  <span className="font-bold text-[#111111]">{activeItem.city}</span>
                </div>

                <div className="flex justify-between">
                  <span className="font-bold text-gray-600">Église :</span>
                  <span className="font-bold text-[#111111]">
                    {activeItem.church || 'Non renseignée'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="font-bold text-gray-600">Tranche d'âge :</span>
                  <span className="font-bold text-[#111111]">
                    {activeItem.ageCategory || 'Non précisé'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="font-bold text-gray-600">Jours de participation :</span>
                  <span className="font-bold text-[#111111]">
                    {(activeItem.attendanceDays || []).join(', ')}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="font-bold text-gray-600">Date d'inscription :</span>
                  <span className="font-bold text-[#111111]">
                    {new Date(activeItem.createdAt).toLocaleString('fr-FR')}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="font-bold text-gray-600">Statut :</span>
                  <span className="font-extrabold uppercase text-[#FF6A00]">
                    {activeItem.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
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

      {/* Delete Confirmation Modal */}
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
