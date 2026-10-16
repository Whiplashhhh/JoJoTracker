import type {
  ApiErrorBody,
  AuthConfig,
  CatalogResponse,
  ChangePasswordBody,
  LoginBody,
  MeResponse,
  RegisterBody,
  RevealResponse,
  SetWatchedBody,
  SetWatchedResponse,
  Settings,
  UpdateSettingsBody,
} from '@jojo/shared/client';

/** Erreur renvoyée par l'API (format JSON homogène). */
export class ApiError extends Error {
  override name = 'ApiError';
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

/** Le serveur est injoignable (hors ligne, coupure réseau…). */
export class NetworkError extends Error {
  override name = 'NetworkError';
  constructor() {
    super('Pas de réseau.');
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function send(method: Method, path: string, body?: unknown): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new NetworkError();
  }
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as Partial<ApiErrorBody> | null;
    const error = data?.error;
    if (error && typeof error.code === 'string' && typeof error.message === 'string') {
      throw new ApiError(response.status, error.code, error.message, error.fields ?? {});
    }
    if (response.status >= 502 && response.status <= 504) throw new NetworkError();
    throw new ApiError(response.status, 'INTERNAL', 'Erreur inattendue du serveur.');
  }
  return response;
}

/**
 * Requête JSON typée par les contrats partagés. Le serveur (même origine) valide tout ;
 * le front ne revalide pas les réponses pour ne pas embarquer zod dans le bundle.
 */
async function json<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const response = await send(method, path, body);
  return (await response.json()) as T;
}

async function empty(method: Method, path: string, body?: unknown): Promise<void> {
  await send(method, path, body);
}

export const api = {
  authConfig: () => json<AuthConfig>('GET', '/api/auth/config'),
  me: () => json<MeResponse>('GET', '/api/me'),
  login: (body: LoginBody) => json<MeResponse>('POST', '/api/auth/login', body),
  register: (body: RegisterBody) => json<MeResponse>('POST', '/api/auth/register', body),
  logout: () => empty('POST', '/api/auth/logout'),
  catalog: () => json<CatalogResponse>('GET', '/api/catalog'),
  setWatched: (body: SetWatchedBody) => json<SetWatchedResponse>('PUT', '/api/watched', body),
  reveal: (episodeId: string) =>
    json<RevealResponse>('POST', `/api/episodes/${encodeURIComponent(episodeId)}/reveal`),
  updateSettings: (body: UpdateSettingsBody) => json<Settings>('PATCH', '/api/me/settings', body),
  changePassword: (body: ChangePasswordBody) => empty('POST', '/api/me/password', body),
  logoutAll: () => empty('POST', '/api/me/logout-all'),
  deleteAccount: (confirmUsername: string) => empty('DELETE', '/api/me', { confirmUsername }),
  /** Télécharge l'export JSON (déclenche l'enregistrement du fichier). */
  async downloadExport(): Promise<void> {
    const response = await send('GET', '/api/me/export');
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'jojo-tracker-export.json';
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  },
};

export function errorMessage(error: unknown): string {
  if (error instanceof NetworkError) return 'Pas de réseau… réessaie quand la connexion revient.';
  if (error instanceof ApiError) return error.message;
  return 'Une erreur inattendue est survenue.';
}
