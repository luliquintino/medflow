import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";

function clearSessionCookie() {
  if (typeof document !== "undefined") {
    document.cookie = "medflow-has-session=; path=/; SameSite=Strict; max-age=0";
  }
}

const BASE_URL = "/api/v1";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor: inject Bearer token ───────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("medflow-auth");
      if (raw) {
        const parsed = JSON.parse(raw);
        const token = parsed?.state?.accessToken;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {}
  }
  return config;
});

// ── Response interceptor: handle 401 + refresh ─────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string | null) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't retry auth endpoints
    if (originalRequest.url?.includes("/auth/")) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const raw = localStorage.getItem("medflow-auth");
      const parsed = raw ? JSON.parse(raw) : null;
      const refreshToken = parsed?.state?.refreshToken;

      if (!refreshToken) throw new Error("No refresh token");

      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
      const newAccessToken = data.data?.accessToken || data.accessToken;
      const newRefreshToken = data.data?.refreshToken || data.refreshToken;

      // Update localStorage directly (zustand persist reads from here)
      const newState = {
        state: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
        version: parsed?.version || 0,
      };
      localStorage.setItem("medflow-auth", JSON.stringify(newState));

      processQueue(null, newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // Clear auth and redirect to login
      clearSessionCookie();
      localStorage.removeItem("medflow-auth");
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ── Helpers ──────────────────────────────────────────────────────────────────
export function unwrap<T>(response: { data: { data: T } }): T {
  return response.data.data;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (!error.response) {
      return "Sem conexão com o servidor. Verifique sua internet ou tente novamente.";
    }
    const msg = error.response.data?.message;
    if (Array.isArray(msg)) return msg[0];
    return msg || "Algo deu errado. Tente novamente.";
  }
  return "Algo deu errado. Tente novamente.";
}
