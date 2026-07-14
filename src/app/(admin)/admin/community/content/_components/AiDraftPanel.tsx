"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { apiPost } from "@/lib/api";
import { Wand2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import type { ContentPost } from "../types";

interface AiDraftPanelProps {
  onDraftCreated: (post: ContentPost) => Promise<void> | void;
}

const defaultDraftForm = {
  title: "",
  brief: "",
  category: "swimming_tips",
  tier_access: "community",
};

export function AiDraftPanel({ onDraftCreated }: AiDraftPanelProps) {
  const [formData, setFormData] = useState(defaultDraftForm);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setError(null);
  };

  const handleGenerateDraft = async (event: FormEvent) => {
    event.preventDefault();
    setIsGenerating(true);
    setError(null);
    try {
      const post = await apiPost<ContentPost>(
        "/api/v1/content/ai-drafts",
        {
          title: formData.title.trim(),
          brief: formData.brief.trim() || null,
          category: formData.category,
          tier_access: formData.tier_access,
        },
        { auth: true },
      );
      setFormData(defaultDraftForm);
      await onDraftCreated(post);
    } catch (generationError) {
      console.error("Failed to generate AI draft:", generationError);
      setError("AI draft generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="p-4">
      <form onSubmit={handleGenerateDraft} className="space-y-4">
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-cyan-700" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900">AI Draft</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr]">
          <Input
            label="Title"
            value={formData.title}
            onChange={(event) => updateField("title", event.target.value)}
            required
            minLength={4}
            placeholder="e.g., How to breathe calmly in water"
          />

          <Select
            label="Category"
            value={formData.category}
            onChange={(event) => updateField("category", event.target.value)}
          >
            <option value="getting_started">Getting Started</option>
            <option value="swimming_tips">Swimming Tips</option>
            <option value="safety">Safety</option>
            <option value="breathing">Breathing Techniques</option>
            <option value="technique">Technique</option>
            <option value="health_recovery">Health &amp; Recovery</option>
            <option value="community_culture">Community &amp; Culture</option>
            <option value="news">News</option>
            <option value="education">Education</option>
          </Select>

          <Select
            label="Tier Access"
            value={formData.tier_access}
            onChange={(event) => updateField("tier_access", event.target.value)}
          >
            <option value="community">Community</option>
            <option value="club">Club</option>
            <option value="academy">Academy</option>
          </Select>
        </div>

        <Textarea
          label="Brief/context"
          value={formData.brief}
          onChange={(event) => updateField("brief", event.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Audience, angle, notes, or specific points to cover"
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {error ? <p className="text-sm text-rose-600">{error}</p> : <span />}
          <Button
            type="submit"
            disabled={isGenerating || formData.title.trim().length < 4}
            className="w-fit gap-2"
          >
            <Wand2 className="h-4 w-4" aria-hidden="true" />
            {isGenerating ? "Generating..." : "Generate Draft"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
