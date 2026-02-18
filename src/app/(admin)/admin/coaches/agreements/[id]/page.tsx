"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { AdminAgreementApi, type AgreementVersionDetail } from "@/lib/coaches";
import { formatDate } from "@/lib/format";
import {
  ArrowLeft,
  Calendar,
  FileSignature,
  Hash,
  PenTool,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AgreementVersionDetailPage() {
  const params = useParams();
  const versionId = params.id as string;

  const [version, setVersion] = useState<AgreementVersionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!versionId) return;

    const loadVersion = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await AdminAgreementApi.get(versionId);
        setVersion(data);
      } catch (err) {
        console.error("Failed to load agreement version:", err);
        setError("Failed to load agreement version.");
      } finally {
        setLoading(false);
      }
    };

    loadVersion();
  }, [versionId]);

  // Simple markdown-to-HTML renderer
  const renderMarkdown = (md: string) => {
    return md
      .replace(
        /^### (.+)$/gm,
        "<h3 class='text-lg font-semibold mt-4 mb-2'>$1</h3>",
      )
      .replace(
        /^## (.+)$/gm,
        "<h2 class='text-xl font-semibold mt-6 mb-2'>$1</h2>",
      )
      .replace(/^# (.+)$/gm, "<h1 class='text-2xl font-bold mt-6 mb-3'>$1</h1>")
      .replace(/^- (.+)$/gm, "<li class='ml-4 list-disc'>$1</li>")
      .replace(/\n\n/g, "<br/><br/>")
      .replace(/\n/g, "<br/>");
  };

  if (loading) {
    return <LoadingCard text="Loading agreement version..." />;
  }

  if (error || !version) {
    return (
      <Card className="p-8 text-center">
        <p className="text-rose-600">
          {error || "Agreement version not found."}
        </p>
        <Link
          href="/admin/coaches/agreements"
          className="text-cyan-600 hover:underline mt-4 inline-block"
        >
          Back to agreements
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/coaches/agreements"
          className="text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {version.title}
            </h1>
            <Badge variant={version.is_current ? "success" : "default"}>
              {version.is_current ? "Current" : "Archived"}
            </Badge>
          </div>
          <p className="text-slate-500 mt-1">Version {version.version}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-cyan-50 p-2">
              <FileSignature className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Version</p>
              <p className="text-lg font-semibold text-slate-900">
                v{version.version}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2">
              <PenTool className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Signatures</p>
              <p className="text-lg font-semibold text-slate-900">
                {version.signature_count}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Active Signatures</p>
              <p className="text-lg font-semibold text-slate-900">
                {version.active_signature_count}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-100 p-2">
              <Calendar className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Effective Date</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatDate(version.effective_date)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Metadata */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Metadata</h2>
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-slate-500">Created</dt>
            <dd className="font-medium text-slate-900">
              {formatDate(version.created_at)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Last Updated</dt>
            <dd className="font-medium text-slate-900">
              {formatDate(version.updated_at)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500 flex items-center gap-1">
              <Hash className="h-3 w-3" />
              Content Hash (SHA-256)
            </dt>
            <dd className="font-mono text-xs text-slate-600 mt-1 break-all">
              {version.content_hash}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Agreement Content */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Agreement Content
        </h2>
        <div
          className="prose prose-slate max-w-none border-t border-slate-100 pt-4"
          dangerouslySetInnerHTML={{
            __html: renderMarkdown(version.content),
          }}
        />
      </Card>
    </div>
  );
}
