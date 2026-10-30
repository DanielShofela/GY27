import { Registration } from '../types/index';

/**
 * Escapes a cell for CSV formatting (RFC 4180).
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const stringValue = String(value);
  // Replace quotes with double quotes and wrap in quotes
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Builds a UTF-8 CSV string with BOM for Excel/Google Sheets compatibility.
 */
export function exportRegistrationsToCsv(registrations: Registration[]): string {
  const headers = [
    'Référence',
    'Nom',
    'Prénom',
    'Numéro WhatsApp',
    'Commune / Ville',
    'Église / Communauté',
    'Tranche d\'âge',
    'Jours de participation',
    'Statut',
    'Date d\'inscription',
  ];

  const rows: string[] = [headers.map(escapeCsvCell).join(';')];

  const ageLabels: Record<string, string> = {
    under_15: 'Moins de 15 ans',
    '15_17': '15 - 17 ans',
    '18_25': '18 - 25 ans',
    '26_35': '26 - 35 ans',
    over_35: 'Plus de 35 ans',
    not_specified: 'Non précisé',
  };

  const dayLabels: Record<string, string> = {
    jan_1: '1er Janvier',
    jan_2: '2 Janvier',
    jan_3: '3 Janvier',
  };

  for (const reg of registrations) {
    const daysFormatted = (reg.attendanceDays || [])
      .map((d) => dayLabels[d] || d)
      .join(', ');

    const dateFormatted = reg.createdAt
      ? new Date(reg.createdAt).toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' })
      : '';

    const row = [
      reg.referenceCode || '',
      reg.lastName || '',
      reg.firstName || '',
      `="${reg.whatsappPhone || ''}"`, // Protect phone from numeric truncation in Excel
      reg.city || '',
      reg.church || '',
      ageLabels[reg.ageCategory || ''] || reg.ageCategory || 'Non précisé',
      daysFormatted,
      reg.status || 'confirmed',
      dateFormatted,
    ];

    rows.push(row.map(escapeCsvCell).join(';'));
  }

  // Prepend UTF-8 BOM so Excel opens accents properly
  const BOM = '\uFEFF';
  return BOM + rows.join('\r\n');
}

/**
 * Triggers a browser download of the CSV content.
 */
export function triggerCsvDownload(csvContent: string, fileName = 'inscriptions-glorious-youth-2027.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
