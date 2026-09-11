"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FileVideo, Image as ImageIcon, Tags } from "lucide-react";
import {
  mediaVaultApi,
  type MediaVault,
  type VaultMedia,
  type VaultMediaList,
} from "@/lib/media-vault";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { VaultMediaLabels } from "./VaultMediaDialogs";

export function VaultLibrary({ vaults, admin = false }: { vaults: MediaVault[]; admin?: boolean }) {
  const [data, setData] = useState<VaultMediaList | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagsLoadError, setTagsLoadError] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [match, setMatch] = useState<"any" | "all">("any");
  const [vaultId, setVaultId] = useState("");
  const [kind, setKind] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<VaultMedia | null>(null);
  const [draft, setDraft] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const editButton = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    mediaVaultApi
      .tags()
      .then((value) => {
        if (!cancelled) {
          setTags(value);
          setTagsLoadError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setTagsLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [revision]);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timeout = setTimeout(
      () => {
        const query = new URLSearchParams({
          page: String(page),
          page_size: "24",
          tag_match: match,
        });
        selectedTags.forEach((tag) => query.append("tags", tag));
        if (vaultId) query.set("vault_id", vaultId);
        if (kind !== "all") query.set("media_type", kind);
        if (search.trim()) query.set("search", search.trim());
        mediaVaultApi
          .library(query)
          .then((value) => {
            if (!cancelled) {
              setData(value);
              setError(null);
            }
          })
          .catch((failure) => {
            if (!cancelled)
              setError(failure instanceof Error ? failure.message : "Could not load media");
          })
          .finally(() => {
            if (!cancelled) setLoading(false);
          });
      },
      search ? 300 : 0
    );
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [selectedTags, match, vaultId, kind, search, page, revision]);
  useEffect(() => {
    if (editing) editorRef.current?.focus();
  }, [editing]);

  const toggle = (values: string[], value: string) =>
    values.includes(value) ? values.filter((tag) => tag !== value) : [...values, value];
  const closeEditor = () => {
    setEditing(null);
    editButton.current?.focus();
  };
  const addTag = () => {
    const value = newTag.trim().replace(/\s+/g, " ");
    if (!value) return;
    if (value.length > 40 || draft.length >= 20) {
      setTagError("Use up to 20 tags, with 40 characters per tag.");
      return;
    }
    const canonical = tags.find((tag) => tag.toLowerCase() === value.toLowerCase()) ?? value;
    if (!draft.some((tag) => tag.toLowerCase() === canonical.toLowerCase()))
      setDraft([...draft, canonical]);
    setNewTag("");
    setTagError(null);
  };
  const save = async () => {
    if (!editing || newTag.trim()) {
      setTagError("Add your new tag before saving.");
      return;
    }
    setSaving(true);
    setTagError(null);
    try {
      await mediaVaultApi.review(editing.vault_id, [editing.id], { labels: draft });
      closeEditor();
      setRevision((value) => value + 1);
    } catch (failure) {
      setTagError(failure instanceof Error ? failure.message : "Could not save tags");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5" aria-label="Media library">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Search media
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Filename or tag"
            className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Vault
          <select
            value={vaultId}
            onChange={(e) => {
              setVaultId(e.target.value);
              setPage(1);
            }}
            className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base"
          >
            <option value="">All vaults</option>
            {vaults.map((vault) => (
              <option key={vault.id} value={vault.id}>
                {vault.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <FilterTabs
        options={[
          { value: "all", label: "All media" },
          { value: "VIDEO", label: "Videos" },
          { value: "IMAGE", label: "Photos" },
        ]}
        value={kind}
        onChange={(value) => {
          setKind(value);
          setPage(1);
        }}
      />
      {tagsLoadError && (
        <p role="status" className="text-sm text-amber-800">
          Tags could not be loaded.{" "}
          <button
            type="button"
            className="min-h-11 underline"
            onClick={() => setRevision((value) => value + 1)}
          >
            Retry tags
          </button>
        </p>
      )}
      <details className="rounded-xl border border-slate-200 bg-white p-4">
        <summary className="min-h-11 cursor-pointer font-semibold text-slate-800">
          Filter by tags {selectedTags.length > 0 && `(${selectedTags.length} selected)`}
        </summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-pressed={selectedTags.includes(tag)}
              onClick={() => {
                setSelectedTags(toggle(selectedTags, tag));
                setPage(1);
              }}
              className={`min-h-11 rounded-full border px-3 text-sm ${selectedTags.includes(tag) ? "border-cyan-500 bg-cyan-50 text-cyan-800" : "border-slate-200 text-slate-600"}`}
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-sm">
            Show media matching{" "}
            <select
              value={match}
              onChange={(e) => {
                setMatch(e.target.value as "any" | "all");
                setPage(1);
              }}
              className="min-h-11 rounded-lg border bg-white px-2"
            >
              <option value="any">Any selected tag</option>
              <option value="all">All selected tags</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setSelectedTags([]);
              setPage(1);
            }}
            className="min-h-11 text-sm font-semibold text-cyan-700"
          >
            Clear tags
          </button>
        </div>
      </details>
      {error && (
        <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          {error}{" "}
          <button
            type="button"
            className="min-h-11 underline"
            onClick={() => setRevision((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      )}
      <p role="status" className="text-sm text-slate-600">
        {loading ? "Loading media…" : `${data?.total ?? 0} files`}
      </p>
      {!loading && !error && data?.total === 0 && (
        <div className="rounded-xl border bg-white p-8 text-center text-slate-600">
          No media matches these filters.
        </div>
      )}
      {!error && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy={loading}>
          {!loading &&
            data?.items.map((item) => {
              const vault = vaults.find((value) => value.id === item.vault_id);
              const canTag =
                admin || vault?.effective_role === "curator" || vault?.effective_role === "admin";
              return (
                <article
                  key={item.id}
                  className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="flex aspect-video items-center justify-center bg-slate-100">
                    {item.media_type === "VIDEO" && item.preview_url ? (
                      <video
                        controls
                        preload="none"
                        playsInline
                        poster={item.thumbnail_url ?? undefined}
                        src={item.preview_url}
                        className="h-full w-full object-contain"
                        aria-label={item.original_filename ?? "Video preview"}
                      />
                    ) : item.thumbnail_url ? (
                      <Image
                        unoptimized
                        width={640}
                        height={360}
                        src={item.thumbnail_url}
                        alt={item.original_filename ?? "Media preview"}
                        loading="lazy"
                        className="h-full w-full object-contain"
                      />
                    ) : item.media_type === "VIDEO" ? (
                      <FileVideo className="h-10 w-10 text-slate-400" aria-label="Video" />
                    ) : (
                      <ImageIcon className="h-10 w-10 text-slate-400" aria-label="Photo" />
                    )}
                  </div>
                  <div className="space-y-2 p-4">
                    <h3 className="break-words font-semibold text-slate-900">
                      {item.original_filename ?? "Untitled media"}
                    </h3>
                    <Link
                      href={`${admin ? "/admin" : "/account"}/media-vault/${item.vault_id}`}
                      className="inline-flex min-h-11 items-center text-sm text-cyan-700"
                    >
                      {vault?.title ?? "Open vault"} →
                    </Link>
                    <VaultMediaLabels labels={item.labels ?? []} />
                    {canTag && (
                      <button
                        type="button"
                        onClick={(event) => {
                          editButton.current = event.currentTarget;
                          setEditing(item);
                          setDraft(item.labels ?? []);
                          setNewTag("");
                          setTagError(null);
                        }}
                        className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-semibold"
                      >
                        <Tags className="h-4 w-4" />
                        Edit tags<span className="sr-only"> for {item.original_filename}</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
        </div>
      )}
      {data && data.total > data.page_size && (
        <nav aria-label="Media pages" className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={loading || page === 1}
            onClick={() => setPage(page - 1)}
            className="min-h-11 rounded-lg border bg-white px-4 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm">
            Page {page} of {Math.ceil(data.total / data.page_size)}
          </span>
          <button
            type="button"
            disabled={loading || page * data.page_size >= data.total}
            onClick={() => setPage(page + 1)}
            className="min-h-11 rounded-lg border bg-white px-4 disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      )}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div
            ref={editorRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="media-tags-title"
            className="max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !saving) closeEditor();
              if (event.key === "Tab") {
                const controls = editorRef.current?.querySelectorAll<HTMLElement>(
                  'button:not(:disabled), input, select, [tabindex="0"]'
                );
                if (!controls?.length) return;
                const first = controls[0],
                  last = controls[controls.length - 1];
                if (
                  event.shiftKey &&
                  (document.activeElement === first || document.activeElement === editorRef.current)
                ) {
                  event.preventDefault();
                  last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <h2 id="media-tags-title" className="text-xl font-bold">
              Tag this media
            </h2>
            <p className="mt-1 break-words text-sm text-slate-500">{editing.original_filename}</p>
            <div className="my-4 flex flex-wrap gap-2">
              {Array.from(new Set([...tags, ...draft])).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  disabled={saving || (!draft.includes(tag) && draft.length >= 20)}
                  aria-pressed={draft.includes(tag)}
                  onClick={() => setDraft(toggle(draft, tag))}
                  className={`min-h-11 rounded-full border px-3 text-sm ${draft.includes(tag) ? "border-cyan-500 bg-cyan-50 text-cyan-800" : "border-slate-200"}`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                addTag();
              }}
              className="flex items-end gap-2"
            >
              <label className="min-w-0 flex-1 text-sm font-medium">
                Create a tag
                <input
                  disabled={saving}
                  value={newTag}
                  maxLength={40}
                  onChange={(event) => setNewTag(event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-lg border px-3 text-base"
                />
              </label>
              <button disabled={saving} type="submit" className="min-h-11 rounded-lg border px-4">
                Add
              </button>
            </form>
            {tagError && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {tagError}
              </p>
            )}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={closeEditor}
                className="min-h-11 flex-1 rounded-xl border px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="min-h-11 flex-1 rounded-xl bg-cyan-700 px-4 font-semibold text-white"
              >
                {saving ? "Saving…" : "Save tags"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
