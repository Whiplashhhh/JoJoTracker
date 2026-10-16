import type { CatalogResponse, MeResponse } from '@jojo/shared/client';
import { QueryCache, QueryClient, useQuery } from '@tanstack/react-query';
import { ApiError, api } from './client';

export const queryKeys = {
  me: ['me'] as const,
  authConfig: ['auth-config'] as const,
  catalog: ['catalog'] as const,
};

export function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError(error) {
        // Session expirée : on bascule vers l'écran de connexion.
        if (error instanceof ApiError && error.status === 401) {
          client.setQueryData(queryKeys.me, null);
        }
      },
    }),
    defaultOptions: {
      queries: {
        // « always » : hors ligne, la requête échoue (NetworkError → écran dédié) au lieu de rester en pause.
        networkMode: 'always',
        staleTime: 30_000,
        // Pas de nouvel essai hors ligne : l'écran « Pas de réseau » s'affiche tout de suite.
        retry: (count, error) => !(error instanceof ApiError) && navigator.onLine && count < 2,
        refetchOnWindowFocus: true,
      },
      mutations: { retry: false, networkMode: 'always' },
    },
  });
  return client;
}

/** Profil de l'utilisateur connecté, ou `null` si personne n'est connecté. */
export function useMe() {
  return useQuery<MeResponse | null>({
    queryKey: queryKeys.me,
    queryFn: async () => {
      try {
        return await api.me();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60_000,
  });
}

export function useAuthConfig() {
  return useQuery({
    queryKey: queryKeys.authConfig,
    queryFn: api.authConfig,
    staleTime: 5 * 60_000,
  });
}

export function useCatalog(enabled = true) {
  return useQuery<CatalogResponse>({ queryKey: queryKeys.catalog, queryFn: api.catalog, enabled });
}
