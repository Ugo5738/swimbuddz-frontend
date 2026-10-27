"use client";

import { useEffect, useState } from "react";
import { VolunteerMediaWorkspace } from "@/components/media-vault/VolunteerMediaWorkspace";
import { SessionMediaHistory } from "@/components/media-vault/SessionMediaHistory";
import { MySessionVideos } from "@/components/media-vault/MySessionVideos";
import { UploadMySwim } from "@/components/media-vault/UploadMySwim";
import { MyCollections } from "@/components/media-vault/MyCollections";
import { SessionMediaWorkspace } from "@/components/media-vault/SessionMediaWorkspace";
import { FilterTabs } from "@/components/ui/FilterTabs";

import { CloudUpload } from "lucide-react";
import Link from "next/link";

export default function MemberMediaVaultPage() {
  const [view, setView] = useState("videos");
  const [session, setSession] = useState("");
  const [sessionAction, setSessionAction] = useState<"view" | "contribute">("view");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session") || "";
    const viewParam = params.get("view");
    if (viewParam === "assignments") setView("vaults");
    if (viewParam === "volunteer") setView("all");
    if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(sessionId)) {
      setSession(sessionId);
      setSessionAction(params.get("action") === "contribute" ? "contribute" : "view");
      setView("session");
    }
  },[]);


  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-600 p-3">
            <CloudUpload className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">My Media</h1>
            <p className="text-sm text-slate-600">
              Browse photos and videos from your swims, session history and personal uploads.
            </p>
          </div>
        </div>
      </div>

      <Link href="/community/volunteers" className="inline-block text-sm font-semibold text-cyan-700 underline">Volunteer media tools are managed in Volunteer Hub</Link>
      <FilterTabs options={[{ value: "videos", label: "My Media" }, { value: "upload", label: "Upload My Swim" }, { value: "collections", label: "My Collections" }, { value: "session", label: "By Swim Session" }]} value={view} onChange={setView} />
      {view === "videos" ? <MySessionVideos /> : view === "upload" ? <UploadMySwim /> : view === "collections" ? <MyCollections /> : view === "session" ? (session ? <SessionMediaWorkspace sessionId={session} action={sessionAction}/> : <SessionMediaHistory onSelect={(id)=>{setSession(id);setSessionAction("view");}} />) : view === "all" ? <VolunteerMediaWorkspace library/> : <VolunteerMediaWorkspace />}
    </div>
  );
}
