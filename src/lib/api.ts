const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

async function request<T = any>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T = any>(path: string) => request<T>("GET", path),
  post: <T = any>(path: string, body: unknown) => request<T>("POST", path, body),
  patch: <T = any>(path: string, body: unknown) => request<T>("PATCH", path, body),
  put: <T = any>(path: string, body: unknown) => request<T>("PUT", path, body),
  delete: <T = any>(path: string) => request<T>("DELETE", path),
};
