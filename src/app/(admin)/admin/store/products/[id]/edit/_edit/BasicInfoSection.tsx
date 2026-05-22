"use client";

import type { Category, ProductFormData, Supplier } from "../types";

type Props = {
  formData: ProductFormData;
  categories: Category[];
  suppliers: Supplier[];
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
};

export function BasicInfoSection({ formData, categories, suppliers, onChange }: Props) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Product Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={onChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
          <input
            type="text"
            name="slug"
            value={formData.slug}
            onChange={onChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
          <select
            name="category_id"
            value={formData.category_id}
            onChange={onChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
          <select
            name="supplier_id"
            value={formData.supplier_id}
            onChange={onChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          >
            <option value="">No supplier</option>
            {suppliers.map((sup) => (
              <option key={sup.id} value={sup.id}>
                {sup.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">Third-party supplier for this product</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Short Description
        </label>
        <input
          type="text"
          name="short_description"
          value={formData.short_description}
          onChange={onChange}
          maxLength={500}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={onChange}
          rows={4}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
        />
      </div>
    </>
  );
}
