"use client";

import { UploadProgress } from "./UploadProgress";
import { Loader2, Upload } from "lucide-react";
import { useRef } from "react";

/** Shared file selection and transfer feedback. Callers own their upload protocol. */
export function FileUpload({
  onFiles, accept, multiple = false, disabled = false, uploading = false,
  progress, label = "Upload file", filename, helpText,
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  uploading?: boolean;
  progress?: number;
  label?: string;
  filename?: string;
  helpText?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const blocked = disabled || uploading;
  const select = (files: File[]) => {
    if (!blocked && files.length) onFiles(multiple ? files : files.slice(0, 1));
  };
  return (
    <div className="min-w-0 space-y-2">
      <button
        type="button"
        disabled={blocked}
        aria-label={`${label} drop zone`}
        onClick={() => input.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          select(Array.from(event.dataTransfer.files));
        }}
        className="flex w-full min-w-0 flex-col items-center rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-cyan-400 hover:bg-cyan-50/50 disabled:cursor-not-allowed disabled:bg-gray-50"
      >
        {uploading ? <Loader2 className="h-8 w-8 animate-spin text-cyan-600" /> : <Upload className="h-8 w-8 text-gray-400" />}
        <span className="mt-2 text-sm text-gray-600">
          {uploading ? "Uploading file" : <>Drop file here or <span className="text-cyan-600">browse</span></>}
        </span>
        {filename && <span className="mt-2 max-w-full [overflow-wrap:anywhere] text-sm text-gray-700">{filename}</span>}
        {helpText && <span className="mt-1 text-xs text-gray-500">{helpText}</span>}
      </button>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={blocked}
        aria-label={label}
        className="hidden"
        onChange={(event) => {
          select(Array.from(event.currentTarget.files ?? []));
          event.currentTarget.value = "";
        }}
      />
      {uploading && <UploadProgress value={progress} />}
    </div>
  );
}
