"use client";

import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { ArrowLeft, Layers, Pencil, Plus, Settings, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_media_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface CollectionFormData {
  name: string;
  slug: string;
  description: string;
  sort_order: string;
  is_active: boolean;
}

const emptyForm: CollectionFormData = {
  name: "",
  slug: "",
  description: "",
  sort_order: "0",
  is_active: true,
};

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [formData, setFormData] = useState<CollectionFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState<string | null>(null);

  const loadCollections = useCallback(async () => {
    try {
      const data = await apiGet<Collection[]>("/api/v1/admin/store/collections", {
        auth: true,
      });
      setCollections(data);
    } catch {
      toast.error("Failed to load collections");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const name = target.name;
    const value = target.type === "checkbox" ? (target as HTMLInputElement).checked : target.value;

    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "name" && typeof value === "string" && !editing) {
        updated.slug = generateSlug(value);
      }
      return updated;
    });
  };

  const openCreate = () => {
    setEditing(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEdit = (coll: Collection) => {
    setEditing(coll);
    setFormData({
      name: coll.name,
      slug: coll.slug,
      description: coll.description || "",
      sort_order: String(coll.sort_order),
      is_active: coll.is_active,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Collection name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || generateSlug(formData.name),
        description: formData.description.trim() || null,
        sort_order: parseInt(formData.sort_order) || 0,
        is_active: formData.is_active,
      };

      if (editing) {
        await apiPatch(`/api/v1/admin/store/collections/${editing.id}`, payload, { auth: true });
        toast.success("Collection updated");
      } else {
        await apiPost("/api/v1/admin/store/collections", payload, { auth: true });
        toast.success("Collection created");
      }

      closeModal();
      loadCollections();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Failed to ${editing ? "update" : "create"} collection`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (coll: Collection) => {
    if (
      !confirm(
        `Are you sure you want to deactivate "${coll.name}"? This will hide it from the store.`
      )
    )
      return;

    setDeactivating(coll.id);
    try {
      await apiPatch(
        `/api/v1/admin/store/collections/${coll.id}`,
        { is_active: false },
        {
          auth: true,
        }
      );
      toast.success("Collection deactivated");
      loadCollections();
    } catch {
      toast.error("Failed to deactivate collection");
    } finally {
      setDeactivating(null);
    }
  };

  if (loading) {
    return <LoadingCard text="Loading collections..." />;
  }

  const activeCollections = collections.filter((c) => c.is_active);
  const inactiveCollections = collections.filter((c) => !c.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/store"
            className="text-slate-500 hover:text-slate-700 text-sm flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Store
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Collections</h1>
          <p className="text-slate-500">
            {activeCollections.length} active collection
            {activeCollections.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Collection
        </button>
      </div>

      {/* Collections Table */}
      {collections.length > 0 ? (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-sm text-slate-600">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Slug</th>
                <th className="px-6 py-3 text-center">Sort Order</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...activeCollections, ...inactiveCollections].map((coll) => (
                <tr
                  key={coll.id}
                  className={`border-b border-slate-100 hover:bg-slate-50 ${
                    !coll.is_active ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-slate-900">{coll.name}</p>
                      {coll.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {coll.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-mono">{coll.slug}</td>
                  <td className="px-6 py-4 text-center text-sm text-slate-500">
                    {coll.sort_order}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        coll.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {coll.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/store/collections/${coll.id}`}
                        className="p-2 text-slate-400 hover:text-cyan-600 transition-colors"
                        title="Manage Products"
                      >
                        <Settings className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => openEdit(coll)}
                        className="p-2 text-slate-400 hover:text-cyan-600 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {coll.is_active && (
                        <button
                          onClick={() => handleDeactivate(coll)}
                          disabled={deactivating === coll.id}
                          className="p-2 text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-50"
                          title="Deactivate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <Layers className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="font-medium text-slate-900 mb-2">No collections yet</h3>
          <p className="text-slate-500 mb-4">Create collections to curate product groups</p>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors font-medium"
          >
            Create First Collection
          </button>
        </Card>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                {editing ? "Edit Collection" : "New Collection"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. New Arrivals"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  required
                  autoFocus
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="auto-generated-from-name"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  URL-friendly identifier. Auto-generated if left blank.
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Brief description of this collection"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>

              {/* Sort Order & Active */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    name="sort_order"
                    value={formData.sort_order}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Lower numbers appear first</p>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                      className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <span className="text-sm text-slate-700">Active</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving
                    ? editing
                      ? "Saving..."
                      : "Creating..."
                    : editing
                      ? "Save Changes"
                      : "Create Collection"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
