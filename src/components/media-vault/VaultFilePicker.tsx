"use client";

import { formatBytes } from "@/lib/media-vault";
import { CloudUpload } from "lucide-react";
import type { ChangeEvent, DragEvent, RefObject } from "react";

export function VaultFilePicker({
  inputRef,
  choosing,
  selectionHelp,
  maxFileBytes,
  remainingBytes,
  onChoose,
  onFiles,
  onEmptySelection,
}: {
  inputRef: RefObject<HTMLInputElement>;
  choosing: boolean;
  selectionHelp: boolean;
  maxFileBytes: number;
  remainingBytes: number;
  onChoose: () => void;
  onFiles: (files: FileList) => void;
  onEmptySelection: () => void;
}) {
  const receiveInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) onFiles(event.target.files);
    else onEmptySelection();
    event.currentTarget.value = "";
  };
  const receiveDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files.length) onFiles(event.dataTransfer.files);
  };

  return (
    <div
      className="rounded-2xl border-2 border-dashed border-cyan-300 bg-cyan-50/50 p-8 text-center transition hover:border-cyan-500"
      onDragOver={(event) => event.preventDefault()}
      onDrop={receiveDrop}
    >
      <CloudUpload className="mx-auto h-12 w-12 text-cyan-600" />
      <h2 className="mt-3 text-lg font-semibold text-slate-900">
        Add full-quality photos and videos
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
        Large iPhone HEIC, 4K, ProRes and MOV files are uploaded directly to private S3 in resumable
        chunks. Originals are not compressed.
      </p>
      <p className="mx-auto mt-2 max-w-xl text-xs font-medium text-slate-600">
        Upload time is mainly determined by the phone&apos;s upload speed. Once it starts, the queue
        shows the measured speed and estimated time remaining. Keep Safari in the foreground and the
        screen awake; an interrupted upload can be resumed.
      </p>
      <button
        type="button"
        onClick={onChoose}
        className="mt-5 rounded-xl bg-cyan-600 px-5 py-2.5 font-semibold text-white hover:bg-cyan-500"
      >
        {choosing ? "Preparing selection from Photos…" : "Choose files"}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*,.heic,.heif,.mov"
        className="hidden"
        onChange={receiveInput}
      />
      <p className="mt-3 text-xs text-slate-500">
        Up to {formatBytes(maxFileBytes)} per file · {formatBytes(Math.max(0, remainingBytes))} remaining
      </p>
      <p className="mx-auto mt-2 max-w-xl text-xs text-slate-500">
        Selecting a file does not upload it yet. On iPhone, Photos must first download every selected
        original from iCloud before Safari can return the files to this page.
      </p>
      {selectionHelp && (
        <div
          role="alert"
          className="mx-auto mt-4 max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-900"
        >
          No files reached the page. Open each cloud-only video in Photos and wait for it to load, or
          save the originals to the Files app first. For multi-GB videos, select one or two at a time,
          then return here to confirm consent and upload.
        </div>
      )}
    </div>
  );
}
