/**
 * Shared API Client with automatic cookie credential passing
 * and single-flight token refresh mutex.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RequestOptions extends RequestInit {
  skipAuthRefresh?: boolean;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Single-flight refresh mutex state
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  endpoint: string;
  options: RequestOptions;
}> = [];

const processQueue = (error: Error | null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      apiFetch(promise.endpoint, promise.options).then(promise.resolve).catch(promise.reject);
    }
  });

  failedQueue = [];
};

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}/api/v1${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Always send and receive HttpOnly cookies
  };

  try {
    const response = await fetch(url, config);

    // 401 Unauthorized handling for expired access tokens
    if (
      response.status === 401 &&
      !options.skipAuthRefresh &&
      !endpoint.includes('/auth/refresh') &&
      !endpoint.includes('/auth/customer/verify-otp') &&
      !endpoint.includes('/auth/staff/login')
    ) {
      if (isRefreshing) {
        // Queue the request until active refresh completes
        return new Promise<T>((resolve, reject) => {
          failedQueue.push({
            resolve: resolve as (val: unknown) => void,
            reject,
            endpoint,
            options,
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshRes = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });

        if (!refreshRes.ok) {
          throw new Error('Refresh token expired');
        }

        isRefreshing = false;
        processQueue(null);

        // Replay original request
        return apiFetch<T>(endpoint, { ...options, skipAuthRefresh: true });
      } catch (refreshErr) {
        isRefreshing = false;
        processQueue(refreshErr as Error);
        throw new ApiError(401, 'Session expired. Please log in again.');
      }
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null as T;
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message =
        typeof data === 'object' && data !== null && 'message' in data
          ? Array.isArray((data as { message: unknown }).message)
            ? (data as { message: unknown[] }).message.join(', ')
            : String((data as { message: unknown }).message)
          : `Request failed with status ${response.status}`;
      throw new ApiError(response.status, message, data);
    }

    if (typeof data === 'string' && data.trim() === '') {
      return null as T;
    }

    return data as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Network error';
    throw new ApiError(500, message);
  }
}
