export interface ContentPost {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  featured_image_url: string | null;
  featured_image_media_id: string | null;
  status: string;
  tier_access: string;
  published_at: string | null;
  scheduled_for: string | null;
  email_on_publish: boolean;
  email_sent_count: number;
  email_failed_count: number;
  last_email_sent_at: string | null;
  created_at: string;
}

export type ContentStatusFilter = "all" | "draft" | "scheduled" | "published";
