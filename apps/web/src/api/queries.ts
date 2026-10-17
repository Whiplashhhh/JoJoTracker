import type { CatalogResponse, MeResponse } from '@jojo/shared/client';
import { QueryCache, QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { revealStore } from '../lib/reveal-store';
import { toast } from '../lib/toast-store';
import { writeTracker } from '../lib/write-tracker';
import { ApiError, api } from './client';

export const queryKeys = {
  me: ['me'] as const,
  authConfig: ['auth-config'] as const,
  catalog: ['catalog'] as const,
};

/**
 * Fin de session (déconnexion, expiration, compte supprimé) : on oublie tout ce qui concerne
 * l'utilisateur sur cet appareil — catalogue (titres vus), titres révélés, toasts « Annuler ».
 */
export function clearSession(client: QueryClient): void {
  forgetUserData(client);
  client.setQueryData(queryKeys.me, null);
}

/**
 * Déconnexion volontaire en cours : la garde d'authentification ne mémorise alors pas la
 * page courante comme « page demandée » (on revient à l'accueil après la reconnexion).
 */
let explicitSignOut = false;
export const signOutIntent = {
  mark(): void {
    explicitSignOut = true;
  },
  reset(): void {
    explicitSignOut = false;
  },
  get active(): boolean {
    return explicitSignOut;
  },
};

/** Purge locale de tout ce qui est propre à un compte (sans toucher à `me`). */
export function forgetUserData(client: QueryClient): void {
  revealStore.clear();
  toast.clear();
  client.removeQueries({ queryKey: queryKeys.catalog });
}

export function isUnauthenticated(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError(error) {
        // Session expirée : on bascule vers l'écran de connexion.
        if (isUnauthenticated(error)) clearSession(client);
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
  const client = useQueryClient();
  return useQuery<MeResponse | null>({
    queryKey: queryKeys.me,
    queryFn: async () => {
      try {
        return await api.me();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          // Session expirée détectée ici plutôt que par le catalogue : même purge.
          forgetUserData(client);
          return null;
        }
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

async function fetchCatalog(): Promise<CatalogResponse> {
  await writeTracker.idle();
  return api.catalog();
}

export function useCatalog(enabled = true) {
  return useQuery<CatalogResponse>({ queryKey: queryKeys.catalog, queryFn: fetchCatalog, enabled });
}
