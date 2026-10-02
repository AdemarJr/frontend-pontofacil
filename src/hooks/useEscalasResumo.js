import { useQuery, useQueryClient } from '@tanstack/react-query';
import { escalaService } from '../services/api';
import { queryKeys } from '../lib/queryClient';

async function fetchEscalasResumo() {
  const { data } = await escalaService.resumo();
  return data?.escalas || [];
}

/** Resumo de escalas por colaborador (tela Escalas). */
export function useEscalasResumo(opts = {}) {
  const { enabled = true } = opts;

  const query = useQuery({
    queryKey: queryKeys.escalasResumo,
    queryFn: fetchEscalasResumo,
    enabled,
    staleTime: 45_000,
  });

  return {
    ...query,
    resumo: query.data || [],
  };
}

export function useInvalidateEscalasResumo() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.escalasResumo });
}
