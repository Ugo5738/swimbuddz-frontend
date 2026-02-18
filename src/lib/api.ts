import { getCurrentAccessToken } from "./auth";
import { API_BASE_URL } from "./config";

if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
  console.warn(
    "API base URL env var is not set (expected NEXT_PUBLIC_API_BASE_URL). Using defaults.",
  );
}

type RequestOptions = {
  auth?: boolean;
  headers?: HeadersInit;
  body?: unknown;
};

async function buildHeaders(
  auth?: boolean,
  headers?: HeadersInit,
): Promise<HeadersInit> {
  const result = new Headers(headers);

  if (!result.has("Content-Type")) {
    result.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = await getCurrentAccessToken();
    if (token) result.set("Authorization", `Bearer ${token}`);
  }

  return result;
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = await buildHeaders(options.auth, options.headers);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });
  const responseText = await response.text();
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    // Prefer structured API errors: FastAPI typically returns { detail: "..." }.
    if (responseText) {
      if (contentType.includes("application/json")) {
        try {
          const data = JSON.parse(responseText);
          const detail =
            typeof data?.detail === "string"
              ? data.detail
              : JSON.stringify(data);
          throw new Error(
            detail || `Request failed with status ${response.status}`,
          );
        } catch {
          // Fall back to raw text when JSON parsing fails.
        }
      }
      throw new Error(responseText);
    }
    throw new Error(`Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  if (!responseText) {
    return null as T;
  }

  if (contentType.includes("application/json")) {
    return JSON.parse(responseText) as T;
  }

  return responseText as T;
}

export function apiGet<T>(path: string, options?: RequestOptions) {
  return request<T>("GET", path, options);
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  options?: RequestOptions,
) {
  return request<T>("POST", path, { ...options, body });
}

export function apiPut<T>(
  path: string,
  body?: unknown,
  options?: RequestOptions,
) {
  return request<T>("PUT", path, { ...options, body });
}

export function apiPatch<T>(
  path: string,
  body?: unknown,
  options?: RequestOptions,
) {
  return request<T>("PATCH", path, { ...options, body });
}

export function apiDelete<T>(path: string, options?: RequestOptions) {
  return request<T>("DELETE", path, options);
}
