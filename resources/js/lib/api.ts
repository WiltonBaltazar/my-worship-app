const TOKEN_KEY = 'wora_auth_token';
const AUTH_CACHE_KEY = 'wora_auth_cache';
const TOKEN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function getFromLocalStorage(key: string): string | null {
  if (!isBrowserEnvironment()) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setInLocalStorage(key: string, value: string): void {
  if (!isBrowserEnvironment()) {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures (e.g. private mode restrictions).
  }
}

function removeFromLocalStorage(key: string): void {
  if (!isBrowserEnvironment()) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures (e.g. private mode restrictions).
  }
}

function getCookie(name: string): string | null {
  if (!isBrowserEnvironment()) {
    return null;
  }

  const prefix = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix));

  if (!cookie) {
    return null;
  }

  try {
    return decodeURIComponent(cookie.slice(prefix.length));
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string, maxAgeSeconds = TOKEN_COOKIE_MAX_AGE_SECONDS): void {
  if (!isBrowserEnvironment()) {
    return;
  }

  const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${secureFlag}`;
}

function removeCookie(name: string): void {
  setCookie(name, '', 0);
}

export function getAuthToken(): string | null {
  const localToken = getFromLocalStorage(TOKEN_KEY);

  if (localToken) {
    return localToken;
  }

  const cookieToken = getCookie(TOKEN_KEY);

  if (cookieToken) {
    setInLocalStorage(TOKEN_KEY, cookieToken);
  }

  return cookieToken;
}

export function setAuthToken(token: string): void {
  setInLocalStorage(TOKEN_KEY, token);
  setCookie(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  removeFromLocalStorage(TOKEN_KEY);
  removeFromLocalStorage(AUTH_CACHE_KEY);
  removeCookie(TOKEN_KEY);
}

export interface AuthCache {
  user: { id: string; name: string; email: string };
  profile: Record<string, unknown> | null;
  roles: string[];
}

export function saveAuthCache(data: AuthCache): void {
  setInLocalStorage(AUTH_CACHE_KEY, JSON.stringify(data));
}

export function loadAuthCache(): AuthCache | null {
  try {
    const raw = getFromLocalStorage(AUTH_CACHE_KEY);
    return raw ? (JSON.parse(raw) as AuthCache) : null;
  } catch {
    return null;
  }
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  auth?: boolean;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  const token = getAuthToken();

  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const raw = await response.text();
  let payload: unknown = null;

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
  }

  const responseObject =
    payload !== null && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : null;

  if (!response.ok) {
    const shouldClearToken =
      response.status === 401
      && (path.startsWith('/api/auth/me') || path.startsWith('/api/auth/logout'));

    if (shouldClearToken) {
      clearAuthToken();
    }

    const validationErrors = responseObject?.errors;

    const firstValidationMessage =
      validationErrors && typeof validationErrors === 'object'
        ? Object.values(validationErrors as Record<string, unknown>)
          .flat()
          .find((entry): entry is string => typeof entry === 'string')
        : null;

    const htmlResponse = raw.trim().startsWith('<');

    const message =
      (typeof responseObject?.message === 'string' ? responseObject.message : null) ||
      (typeof responseObject?.error === 'string' ? responseObject.error : null) ||
      firstValidationMessage ||
      (htmlResponse ? 'Servidor retornou HTML em vez de JSON. Verifique logs e configuração do deploy.' : null) ||
      'Request failed.';

    throw new ApiError(message, response.status);
  }

  if (raw && payload === null) {
    throw new ApiError('Resposta inválida do servidor (JSON esperado).', response.status);
  }

  return payload as T;
}
