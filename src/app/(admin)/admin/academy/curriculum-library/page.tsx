"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  CurriculumDefinition,
  CurriculumKind,
  CurriculumLibraryApi,
  CurriculumVersion,
  curriculumKinds,
  starterContent,
} from "@/lib/academy/curriculum-library";

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "The request could not be completed.";

export default function CurriculumLibraryPage() {
  const [kind, setKind] = useState<CurriculumKind>("milestone");
  const [definitions, setDefinitions] = useState<CurriculumDefinition[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [versions, setVersions] = useState<CurriculumVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [versionLoading, setVersionLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [search, setSearch] = useState("");
  const [versionJson, setVersionJson] = useState(
    JSON.stringify(starterContent.milestone, null, 2),
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextKind: CurriculumKind) => {
    setLoading(true);
    setError(null);
    try {
      setDefinitions(await CurriculumLibraryApi.definitions(nextKind));
    } catch (err) {
      setError(errorMessage(err));
      setDefinitions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(kind);
  }, [kind, load]);

  useEffect(() => {
    if (!selectedId) {
      setVersions([]);
      return;
    }
    let cancelled = false;
    setVersionLoading(true);
    CurriculumLibraryApi.versions(kind, selectedId)
      .then((response) => {
        if (!cancelled) setVersions(response);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setVersionLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, selectedId]);

  const selected = definitions.find((item) => item.id === selectedId);
  const visibleDefinitions = definitions.filter((item) =>
    `${item.title} ${item.code}`.toLowerCase().includes(search.toLowerCase()),
  );

  const switchKind = (nextKind: CurriculumKind) => {
    setKind(nextKind);
    setSelectedId(null);
    setVersions([]);
    setSearch("");
    setVersionJson(JSON.stringify(starterContent[nextKind], null, 2));
    setError(null);
  };

  const createDefinition = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await CurriculumLibraryApi.createDefinition(kind, {
        title: newTitle.trim(),
        code: newCode.trim().toUpperCase(),
        description: newDescription.trim() || undefined,
      });
      setDefinitions((existing) => [...existing, created].sort((a, b) => a.code.localeCompare(b.code)));
      setSelectedId(created.id);
      setNewTitle("");
      setNewCode("");
      setNewDescription("");
      setVersions([]);
      toast.success("Reusable definition created");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const createVersion = async () => {
    if (!selectedId) return;
    let content: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(versionJson);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Version content must be a JSON object");
      }
      content = parsed as Record<string, unknown>;
    } catch (err) {
      setError(`Invalid version JSON: ${errorMessage(err)}`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await CurriculumLibraryApi.createVersion(kind, selectedId, content);
      setVersions((items) => [created, ...items]);
      toast.success(`Draft version ${created.version} created`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const publishVersion = async (version: CurriculumVersion) => {
    if (!selectedId || version.state === "published") return;
    if (!window.confirm("Publish this version? Published content is fixed and cannot be edited.")) return;
    setSaving(true);
    setError(null);
    try {
      const published = await CurriculumLibraryApi.publish(kind, selectedId, version.id);
      setVersions((items) => items.map((item) => item.id === published.id ? published : item));
      toast.success(`Version ${published.version} published`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-3 py-5 md:px-6">
      <header className="space-y-2">
        <Link href="/admin/academy" className="text-sm font-medium text-cyan-700 hover:underline">
          Back to Academy
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Curriculum Library</h1>
        <Link href="/admin/academy/requirements" className="inline-flex rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-800 hover:bg-cyan-100">
          Manage programme and cohort requirements
        </Link>
        <p className="max-w-3xl text-sm text-slate-600">
          Create reusable Academy content and publish fixed versions. This is the first
          authoring release. Publishing here does not yet assign content to cohorts,
          award competency credits, or change graduation requirements.
        </p>
      </header>

      <nav aria-label="Curriculum content types" className="flex flex-wrap gap-2">
        {curriculumKinds.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={kind === item.id}
            onClick={() => switchKind(item.id)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-cyan-500 ${
              kind === item.id
                ? "border-cyan-700 bg-cyan-50 text-cyan-900"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {item.title}
          </button>
        ))}
      </nav>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="space-y-4">
          <form onSubmit={createDefinition} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Create definition</h2>
            <Input label="Title" name="title" required minLength={3} maxLength={200}
              value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Controlled breathing"/>
            <Input label="Stable code" name="code" required
              value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              pattern="[A-Z][A-Z0-9_-]{2,79}"
              hint="Unique, permanent identifier. Use uppercase letters, numbers, - or _."
              placeholder="MS-BREATH-01"/>
            <Textarea label="Description" name="description" value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)} rows={2}/>
            <Button type="submit" disabled={saving}>Create {kind}</Button>
          </form>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">Library entries</h2>
              <Input label="Search" name="search" value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title or code"/>
            </div>
            {loading ? (
              <p role="status" className="text-sm text-slate-500">Loading library...</p>
            ) : visibleDefinitions.length === 0 ? (
              <p className="text-sm text-slate-500">No matching entries yet.</p>
            ) : (
              <ul className="max-h-[32rem] space-y-2 overflow-y-auto">
                {visibleDefinitions.map((item) => (
                  <li key={item.id}>
                    <button type="button" onClick={() => setSelectedId(item.id)}
                      aria-pressed={selectedId === item.id}
                      className={`w-full rounded-lg border p-3 text-left transition ${
                        selectedId === item.id ? "border-cyan-600 bg-cyan-50" : "border-slate-200 hover:bg-slate-50"
                      }`}>
                      <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
                      <span className="block text-xs text-slate-500">{item.code}</span>
                      {item.description && <span className="mt-1 block text-xs text-slate-600">{item.description}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          {!selected ? (
            <p className="text-sm text-slate-600">Choose a library entry to manage its versions.</p>
          ) : (
            <div className="space-y-5">
              <header>
                <h2 className="text-xl font-semibold text-slate-900">{selected.title}</h2>
                <p className="text-xs font-medium text-slate-500">{selected.code}</p>
              </header>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">Create next version</h3>
                <p className="text-xs text-slate-600">
                  Edit the structured content below. New versions start as drafts.
                  The published version is retained for historical consistency.
                </p>
                <Textarea label="Version details (JSON)" name="version-content"
                  value={versionJson} onChange={(e) => setVersionJson(e.target.value)}
                  rows={13} className="w-full font-mono text-xs"/>
                <Button type="button" disabled={saving} onClick={() => void createVersion()}>
                  Save draft version
                </Button>
              </div>
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-slate-900">Versions</h3>
                {versionLoading ? (
                  <p role="status" className="text-sm text-slate-500">Loading versions...</p>
                ) : versions.length === 0 ? (
                  <p className="text-sm text-slate-500">No versions saved yet.</p>
                ) : versions.map((version) => (
                  <article key={version.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">Version {version.version}</p>
                        <p className="text-xs text-slate-500">
                          {version.state === "published" ? "Published" : "Draft"}
                        </p>
                      </div>
                      {version.state === "draft" && (
                        <Button size="sm" type="button" disabled={saving}
                          onClick={() => void publishVersion(version)}>Publish</Button>
                      )}
                    </div>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-medium text-cyan-700">View content</summary>
                      <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs text-slate-700">
                        {JSON.stringify(version.content, null, 2)}
                      </pre>
                    </details>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
