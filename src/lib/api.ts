import { getCurrentAccessToken } from "./auth";
import { API_BASE_URL } from "./config";

if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
  console.warn(
    "API base URL env var is not set (expected NEXT_PUBLIC_API_BASE_URL). Using defaults."
  );
}

type RequestOptions = {
  auth?: boolean;
  headers?: HeadersInit;
  body?: unknown;
  /** Forwarded to fetch() so callers (e.g. useApi) can cancel in-flight
   * requests on unmount / param change. */
  signal?: AbortSignal;
};

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function buildHeaders(auth?: boolean, headers?: HeadersInit): Promise<HeadersInit> {
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

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers = await buildHeaders(options.auth, options.headers);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
    signal: options.signal,
  });
  const responseText = await response.text();
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    // Prefer structured API errors: FastAPI typically returns { detail: "..." }.
    if (responseText) {
      if (contentType.includes("application/json")) {
        let parsed: { detail?: unknown } | null = null;
        try {
          parsed = JSON.parse(responseText);
        } catch {
          parsed = null;
        }
        if (parsed) {
          const detail =
            typeof parsed?.detail === "string" ? parsed.detail : JSON.stringify(parsed);
          throw new ApiError(detail || `Request failed with status ${response.status}`, response.status);
        }
      }
      throw new ApiError(responseText, response.status);
    }
    throw new ApiError(`Request failed with status ${response.status}`, response.status);
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

export function apiPost<T>(path: string, body?: unknown, options?: RequestOptions) {
  return request<T>("POST", path, { ...options, body });
}

export function apiPut<T>(path: string, body?: unknown, options?: RequestOptions) {
  return request<T>("PUT", path, { ...options, body });
}

export function apiPatch<T>(path: string, body?: unknown, options?: RequestOptions) {
  return request<T>("PATCH", path, { ...options, body });
}

export function apiDelete<T>(path: string, options?: RequestOptions) {
  return request<T>("DELETE", path, options);
}

export type UploadOptions = Pick<RequestOptions, "auth" | "signal"> & {
  onProgress?: (percent: number) => void;
};

/** Multipart transport with real byte progress and safe, actionable errors. */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  options: UploadOptions = {}
): Promise<T> {
  const token = options.auth ? await getCurrentAccessToken() : null;
  if (options.signal?.aborted) throw new DOMException("Upload cancelled", "AbortError");
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}${path}`);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    // Let the browser supply the multipart boundary. Large phone videos can
    // take minutes on mobile connections; progress remains visible throughout.
    xhr.timeout = 30 * 60 * 1000;
    const abort = () => xhr.abort();
    options.signal?.addEventListener("abort", abort, { once: true });
    xhr.onloadend = () => options.signal?.removeEventListener("abort", abort);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) options.onProgress?.(Math.round(event.loaded / event.total * 100));
    };
    xhr.onerror = () => reject(new Error("Upload interrupted. Check your connection and try again."));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    xhr.ontimeout = () => reject(new Error("Upload timed out. Check your connection or try a smaller file."));
    xhr.onload = () => {
      let body: unknown = null;
      try { body = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch { /* Proxy may return HTML. */ }
      if (xhr.status < 200 || xhr.status >= 300) {
        const detail = body && typeof body === "object" && "detail" in body ? body.detail : null;
        const message = xhr.status === 413
          ? "This file is too large. Choose a smaller file and try again."
          : xhr.status >= 500
            ? "The server could not finish this upload. Please try again; if it repeats, try a smaller file."
            : typeof detail === "string" ? detail : `Upload failed (${xhr.status}). Please try again.`;
        reject(new ApiError(message, xhr.status));
        return;
      }
      if (!body) {
        reject(new Error("The server returned an invalid upload response. Please try again."));
        return;
      }
      resolve(body as T);
    };
    xhr.send(formData);
  });
}
