const TOKEN_KEY = 'wora_auth_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
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
    if (response.status === 401) {
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
