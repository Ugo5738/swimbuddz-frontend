import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiUpload } from "../api";
vi.mock("../auth", () => ({ getCurrentAccessToken: vi.fn().mockResolvedValue("session-token") }));
vi.mock("../config", () => ({ API_BASE_URL: "https://api.example.test" }));

class UploadRequest {
  static current: UploadRequest;
  upload = { onprogress: null as null | ((event: { loaded: number; total: number; lengthComputable: boolean }) => void) };
  onload?: () => void;
  onerror?: () => void;
  onabort?: () => void;
  onloadend?: () => void;
  status = 200;
  responseText = '{"id":"media-1"}';
  open = vi.fn();
  setRequestHeader = vi.fn();
  send = vi.fn();
  abort = vi.fn(() => { this.onabort?.(); this.onloadend?.(); });
  constructor() { UploadRequest.current = this; }
}
beforeEach(() => {
  vi.stubGlobal("XMLHttpRequest", UploadRequest);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiUpload", () => {
  it("reports measured progress but resolves only after the server saves the upload", async () => {
    const onProgress = vi.fn();
    const promise = apiUpload("/media/uploads", new FormData(), { auth: true, onProgress });
    await vi.waitFor(() => {
      expect(UploadRequest.current).toBeDefined();
    });
    const request = UploadRequest.current;
    expect(request.setRequestHeader).toHaveBeenCalledWith("Authorization", "Bearer session-token");
    request.upload.onprogress?.({ loaded: 32, total: 100, lengthComputable: true });
    expect(onProgress).toHaveBeenCalledWith(32);
    request.onload?.();
    await expect(promise).resolves.toEqual({ id: "media-1" });
  });
  it("turns proxy HTML failures into a useful retry message", async () => {
    const promise = apiUpload("/media/uploads", new FormData());
    UploadRequest.current.status = 500;
    UploadRequest.current.responseText = "<html>Internal Server Error</html>";
    UploadRequest.current.onload?.();
    await expect(promise).rejects.toThrow("The server could not finish this upload");
  });
  it("preserves validation errors and handles cancellation", async () => {
    const promise = apiUpload("/media/uploads", new FormData());
    UploadRequest.current.status = 422;
    UploadRequest.current.responseText = '{"detail":"File must be a video"}';
    UploadRequest.current.onload?.();
    await expect(promise).rejects.toThrow("File must be a video");
    const controller = new AbortController();
    const cancelled = apiUpload("/media/uploads", new FormData(), { signal: controller.signal });
    controller.abort();
    await expect(cancelled).rejects.toMatchObject({ name: "AbortError" });
  });
});
