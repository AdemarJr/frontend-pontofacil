import { useAuth } from './useAuth';
import { DEFAULT_TZ, formatTimeInTz } from '../utils/timezone';

export function useTenantTimezone() {
  const { fusoHorario: fusoFromAuth } = useAuth();
  const fusoHorario = fusoFromAuth || DEFAULT_TZ;

  return {
    fusoHorario,
    formatTime: (isoOrDate, pattern = 'HH:mm') => formatTimeInTz(isoOrDate, fusoHorario, pattern),
  };
}
