import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { usuarioService } from '../services/api';
import { filtrarColaboradoresSelect } from '../utils/colaboradoresSelect';
import { queryKeys } from '../lib/queryClient';

async function fetchUsuarios() {
  const { data } = await usuarioService.listar();
  return Array.isArray(data) ? data : [];
}

/**
 * Lista de usuários do tenant com cache compartilhado.
 * Evita GET /usuarios repetido ao navegar Escalas ↔ Relatórios ↔ Ajustes.
 * @param {{ enabled?: boolean }} [opts]
 */
export function useUsuarios(opts = {}) {
  const { enabled = true } = opts;

  const query = useQuery({
    queryKey: queryKeys.usuarios,
    queryFn: fetchUsuarios,
    enabled,
    staleTime: 90_000,
  });

  const colaboradoresAtivos = useMemo(
    () => filtrarColaboradoresSelect(query.data || []),
    [query.data]
  );

  return {
    ...query,
    usuarios: query.data || [],
    colaboradoresAtivos,
  };
}

/** Invalida a lista após criar/editar/excluir colaborador. */
export function useInvalidateUsuarios() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.usuarios });
}
