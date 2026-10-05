export function UploadProgress({ value }: { value?: number }) {
  return (
    <div>
      <progress aria-label="Upload progress" max={100} value={value} className="h-2 w-full accent-cyan-600" />
      <p role="status" className="mt-1 text-sm text-gray-600">
        {value == null ? "Uploading…" : value < 100 ? `Uploading… ${value}%` : "Upload sent. Finishing…"}
      </p>
    </div>
  );
}
