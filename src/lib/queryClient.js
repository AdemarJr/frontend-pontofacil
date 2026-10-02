import { QueryClient } from '@tanstack/react-query';

/**
 * Cache compartilhado entre telas admin (usuários, resumo de escalas, etc.).
 * staleTime evita refetch imediato ao navegar Escalas ↔ Relatórios ↔ Ajustes.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/** Chaves estáveis para invalidação cruzada de páginas. */
export const queryKeys = {
  usuarios: ['usuarios'],
  escalasResumo: ['escalas', 'resumo'],
  escalasPorUsuario: (usuarioId) => ['escalas', 'usuario', usuarioId],
};
