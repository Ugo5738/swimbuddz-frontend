"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import type { MediaVault, VaultList } from "@/lib/media-vault";
import { VaultUploader } from "./VaultUploader";

export function MyCollections() {
  const [items, setItems] = useState<MediaVault[]>([]);
  const [active, setActive] = useState<MediaVault | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [shared, setShared] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    try {
      const data = await apiGet<VaultList>("/api/v1/media/vaults/my-collections", {auth:true});
      setItems(data.items);
      if (active) setActive(data.items.find(item=>item.id===active.id) || null);
    } catch(e) { setError(e instanceof Error ? e.message : "Could not load collections"); }
  };
  useEffect(()=>{void refresh();},[]);
  const create = async () => {
    if (title.trim().length < 2) return;
    setBusy(true); setError("");
    try {
      const created = await apiPost<MediaVault>(
        "/api/v1/media/vaults/my-collections",
        { title:title.trim(), description:description.trim() || null, share_with_community:shared },
        {auth:true}
      );
      setTitle(""); setDescription("");
      await refresh(); setActive(created);
    } catch(e) {setError(e instanceof Error ? e.message : "Could not create collection");}
    finally {setBusy(false);}
  };
  const rename = async () => {
    if(!active || title.trim().length < 2) return;
    setBusy(true); setError("");
    try {
      const updated = await apiPatch<MediaVault>(
        `/api/v1/media/vaults/my-collections/${active.id}`,
        {title:title.trim(), description:description.trim() || null, share_with_community:shared},
        {auth:true}
      );
      setActive(updated); await refresh();
    } catch(e) {setError(e instanceof Error ? e.message : "Could not save changes");}
    finally {setBusy(false);}
  };
  return <section className="space-y-5">
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold">My Collections</h2>
      <p className="mt-1 text-sm text-slate-600">Organise personal swim recordings into named collections. Files start private and are never automatically shared with attendees.</p>
      <div className="mt-4 space-y-3">
        <label className="block text-sm font-semibold">Collection name
          <input value={title} onChange={e=>setTitle(e.target.value)} maxLength={255} placeholder="My Freestyle Progress" className="mt-1 w-full rounded-lg border p-3" />
        </label>
        <label className="block text-sm font-semibold">Description (optional)
          <textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={2000} rows={2} className="mt-1 w-full rounded-lg border p-3" />
        </label>
        <label className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-800"><input type="checkbox" checked={shared} onChange={e=>setShared(e.target.checked)} className="mt-1" /><span>Share future approved recordings with logged-in SwimBuddz members. Files are only visible after review and consent clearance. Leave unchecked to keep the collection personal.</span></label>
        <div className="flex gap-2">
          <button type="button" disabled={busy || title.trim().length<2} onClick={()=>void create()} className="rounded-lg bg-cyan-700 px-4 py-2 font-semibold text-white disabled:opacity-40">Create collection</button>
          {active && <button type="button" disabled={busy || title.trim().length<2} onClick={()=>void rename()} className="rounded-lg border px-4 py-2 disabled:opacity-40">Rename selected</button>}
        </div>
      </div>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    <div className="grid gap-3 sm:grid-cols-2">
      {items.filter(item=>Boolean(item.settings_json?.personal_collection)).map(item=>
        <button type="button" key={item.id} onClick={()=>{
          setActive(item);setTitle(item.title);setDescription(item.description || "");setShared(item.default_session_visibility === "community");
        }} className={`rounded-xl border p-4 text-left ${active?.id===item.id?"border-cyan-600 bg-cyan-50":"border-slate-200 bg-white"}`}>
          <strong>{item.title}</strong><p className="mt-1 text-xs text-slate-600">{item.item_count} files · {item.default_session_visibility === "community" ? "Community after approval" : "Private"}</p>
        </button>)}
    </div>
    {active && <div className="space-y-3">
      <h3 className="font-semibold">{active.title}</h3>
      <Link href={`/account/media-vault/${active.id}`} className="text-sm font-semibold text-cyan-700 underline">Browse collection contents</Link>
      <VaultUploader key={active.id} vault={active} scope={{kind:"member",vaultId:active.id}} />
    </div>}
  </section>;
}
