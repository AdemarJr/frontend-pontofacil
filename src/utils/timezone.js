export const DEFAULT_TZ = 'America/Sao_Paulo';

export const BRAZIL_TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'Brasília — SP, RJ, MG, RS, DF, etc. (UTC−3)' },
  { value: 'America/Manaus', label: 'Amazonas, Roraima, Rondônia, etc. (UTC−4)' },
  { value: 'America/Rio_Branco', label: 'Acre (UTC−5)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (UTC−2)' },
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function getPartsInTz(date, timeZone = DEFAULT_TZ) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value;

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour') === '24' ? '0' : get('hour')),
    minute: Number(get('minute')),
    second: Number(get('second')),
  };
}

/** Formata instante UTC no fuso da empresa (espelho, batidas, inputs datetime-local). */
export function formatTimeInTz(isoOrDate, timeZone = DEFAULT_TZ, pattern = 'HH:mm') {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return '—';

  const parts = getPartsInTz(d, timeZone);
  if (!parts) return '—';

  switch (pattern) {
    case 'HH:mm':
      return `${pad2(parts.hour)}:${pad2(parts.minute)}`;
    case 'HH:mm:ss':
      return `${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`;
    case "yyyy-MM-dd'T'HH:mm":
      return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}`;
    case 'dd/MM/yyyy HH:mm':
      return `${pad2(parts.day)}/${pad2(parts.month)}/${parts.year} ${pad2(parts.hour)}:${pad2(parts.minute)}`;
    case 'dd/MM/yyyy HH:mm:ss':
      return `${pad2(parts.day)}/${pad2(parts.month)}/${parts.year} ${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`;
    default:
      return `${pad2(parts.hour)}:${pad2(parts.minute)}`;
  }
}

export function timezoneLabel(value) {
  return BRAZIL_TIMEZONES.find((t) => t.value === value)?.label || value || DEFAULT_TZ;
}
