/** Browser primitives for resumable S3 multipart uploads. */

export type UploadScope =
  | { kind: "member"; vaultId: string }
  | { kind: "guest"; guestToken: string; vaultId: string };

export type SavedUpload = {
  batchId: string;
  itemId: string;
  partSize: number;
  partCount: number;
  fingerprint: string;
};

export const PART_URL_BATCH = 20;
export const PART_CONCURRENCY = 3;

export function uploadBase(scope: UploadScope, batchId: string) {
  return scope.kind === "guest"
    ? `/api/v1/media/vaults/guest/${scope.guestToken}/batches/${batchId}/uploads`
    : `/api/v1/media/vaults/${scope.vaultId}/batches/${batchId}/uploads`;
}

export async function fileFingerprint(file: File) {
  const sampleSize = 1024 * 1024;
  const first = new Uint8Array(await file.slice(0, Math.min(sampleSize, file.size)).arrayBuffer());
  const last = new Uint8Array(
    await file.slice(Math.max(0, file.size - sampleSize), file.size).arrayBuffer()
  );
  const metadata = new TextEncoder().encode(
    `${file.name}:${file.size}:${file.lastModified}:${file.type}`
  );
  const combined = new Uint8Array(first.length + last.length + metadata.length);
  combined.set(first, 0);
  combined.set(last, first.length);
  combined.set(metadata, first.length + last.length);
  const digest = await crypto.subtle.digest("SHA-256", combined);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export function uploadPart(
  url: string,
  blob: Blob,
  onProgress: (loaded: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (event) => onProgress(event.loaded);
    xhr.onerror = () => reject(new Error("Network interrupted while uploading"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`S3 rejected a file chunk (${xhr.status})`));
        return;
      }
      const etag = xhr.getResponseHeader("ETag");
      if (!etag) {
        reject(new Error("S3 did not expose ETag. Add ETag to the bucket CORS ExposeHeaders."));
        return;
      }
      resolve(etag.replaceAll('"', ""));
    };
    xhr.send(blob);
  });
}

export async function withRetry<T>(operation: () => Promise<T>, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 700 * 2 ** (attempt - 1)));
      }
    }
  }
  throw lastError;
}

export async function runConcurrent<T>(jobs: (() => Promise<T>)[], concurrency: number) {
  const results: T[] = new Array(jobs.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
      while (next < jobs.length) {
        const index = next;
        next += 1;
        results[index] = await jobs[index]();
      }
    })
  );
  return results;
}
