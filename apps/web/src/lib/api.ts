import type { ListResponse } from './types';

export const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: Array<{ field: string; issue: string }>;
  public readonly requestId?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Array<{ field: string; issue: string }>,
    requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  formData?: FormData;
  auth?: boolean;
  retry?: boolean;
  headers?: Record<string, string>;
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        accessToken = null;
        return null;
      }
      const payload = (await response.json()) as { data?: { accessToken?: string } };
      accessToken = payload.data?.accessToken ?? null;
      return accessToken;
    } catch {
      accessToken = null;
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    formData,
    auth = true,
    retry = true,
    headers = {},
  } = options;

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  if (auth && accessToken) {
    finalHeaders.Authorization = `Bearer ${accessToken}`;
  }

  let payload: BodyInit | undefined;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: payload,
    credentials: 'include',
  });

  if (response.status === 401 && auth && retry && !path.startsWith('/auth/')) {
    const renewed = await refreshAccessToken();
    if (renewed) {
      return apiRequest<T>(path, { ...options, retry: false });
    }
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    const error = (data as any)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'ERROR_INTERNO',
      error?.message ?? 'No fue posible completar la operación.',
      error?.details,
      error?.requestId
    );
  }

  return data as T;
}

function unwrap<T>(response: unknown): T {
  return (response as { data?: T } | null)?.data as T;
}

export const api = {
  get<T>(path: string): Promise<T> {
    return apiRequest<{ data: T }>(path).then((response) => unwrap<T>(response));
  },
  list<T>(path: string): Promise<ListResponse<T>> {
    return apiRequest<ListResponse<T>>(path);
  },
  post<T>(path: string, body?: unknown, options: Partial<RequestOptions> = {}): Promise<T> {
    return apiRequest<{ data: T }>(path, { ...options, method: 'POST', body }).then(
      (response) => unwrap<T>(response)
    );
  },
  patch<T>(path: string, body?: unknown): Promise<T> {
    return apiRequest<{ data: T }>(path, { method: 'PATCH', body }).then(
      (response) => unwrap<T>(response)
    );
  },
  put<T>(path: string, body?: unknown): Promise<T> {
    return apiRequest<{ data: T }>(path, { method: 'PUT', body }).then(
      (response) => unwrap<T>(response)
    );
  },
  delete(path: string): Promise<void> {
    return apiRequest<null>(path, { method: 'DELETE' }).then(() => undefined);
  },
  upload<T>(path: string, file: File): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequest<{ data: T }>(path, { method: 'POST', formData }).then(
      (response) => unwrap<T>(response)
    );
  },
};

export async function apiDownload(path: string, retry = true): Promise<Blob> {
  const headers: Record<string, string> = { Accept: '*/*' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(`${API_URL}${path}`, {
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && retry) {
    const renewed = await refreshAccessToken();
    if (renewed) return apiDownload(path, false);
  }

  if (!response.ok) {
    throw new ApiError(response.status, 'ERROR_DESCARGA', 'No fue posible descargar el archivo.');
  }

  return response.blob();
}
