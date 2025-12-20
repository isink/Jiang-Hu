import Constants from 'expo-constants';

// Centralized API client for authenticated requests

const FALLBACK_BASE_URL = 'http://localhost:3000';
const configBaseUrl =
  // Prefer runtime config from app.json extra
  (Constants.expoConfig as any)?.extra?.apiBaseUrl ||
  // Allow build-time public env from Expo
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  FALLBACK_BASE_URL;

let accessToken: string | null = null;

export const apiConfig = {
  get baseUrl() {
    return configBaseUrl;
  },
};

export function setAccessToken(token: string | null) {
  accessToken = token;
}

type RequestOptions = RequestInit & {
  tokenOverride?: string | null;
};

export async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${apiConfig.baseUrl}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = options.tokenOverride ?? accessToken;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const message = await safeReadError(res);
    throw new Error(message || `Request failed: ${res.status}`);
  }

  // Some endpoints might return 204
  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}

async function safeReadError(res: Response) {
  try {
    const data = await res.json();
    return data?.message || JSON.stringify(data);
  } catch (e) {
    try {
      return await res.text();
    } catch (err) {
      return '';
    }
  }
}

export const api = {
  get: <T = unknown>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'GET' }),
  post: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  del: <T = unknown>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'DELETE' }),
};
