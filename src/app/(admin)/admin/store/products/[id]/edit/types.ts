// Types extracted from page.tsx during the file-size sweep.

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Supplier {
  id: string;
  name: string;
  slug: string;
}

export interface SuppliersResponse {
  items: Supplier[];
  total: number;
  page: number;
  page_size: number;
}

export interface Variant {
  id: string;
  sku: string;
  name: string | null;
  options: Record<string, string>;
  price_override_ngn: number | null;
  is_active: boolean;
  quantity_available?: number;
  quantity_on_hand?: number;
}

export interface ProductImage {
  id: string;
  url: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
  variant_id: string | null;
}

export interface ProductVideo {
  id: string;
  url: string;
  thumbnail_url: string | null;
  title: string | null;
  is_processed: boolean;
  media_item_id: string | null;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  supplier_id: string | null;
  description: string | null;
  short_description: string | null;
  base_price_ngn: number;
  compare_at_price_ngn: number | null;
  status: string;
  is_featured: boolean;
  sourcing_type: string;
  preorder_lead_days: number | null;
  has_variants: boolean;
  requires_size_chart_ack: boolean;
  size_chart_url: string | null;
  size_chart_media_id: string | null;
  variant_options: Record<string, unknown> | null;
  cost_price_ngn: number | null;
  variants: Variant[];
  images: ProductImage[];
  videos: ProductVideo[];
}

export interface ProductFormData {
  name: string;
  slug: string;
  category_id: string;
  supplier_id: string;
  description: string;
  short_description: string;
  base_price_ngn: string;
  compare_at_price_ngn: string;
  status: string;
  is_featured: boolean;
  sourcing_type: string;
  preorder_lead_days: string;
  has_variants: boolean;
  requires_size_chart_ack: boolean;
  size_chart_url: string;
  size_chart_media_id: string;
  cost_price_ngn: string;
}
