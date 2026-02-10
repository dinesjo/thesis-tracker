"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ProjectSummaryEditor({
  title,
  description,
}: {
  title: string;
  description: string | null;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftDescription, setDraftDescription] = useState(description ?? "");

  useEffect(() => {
    if (!isEditing) {
      setDraftTitle(title);
      setDraftDescription(description ?? "");
    }
  }, [description, isEditing, title]);

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/project", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draftTitle.trim(),
          description: draftDescription.trim() ? draftDescription.trim() : null,
        }),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Failed to update project");
      }

      toast.success("Project details updated");
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update project";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (!isEditing) {
    return (
      <div>
        <h2 className="mt-1 font-[var(--font-display)] text-3xl text-foreground">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          {description ?? "Add a short subtitle to describe your thesis scope."}
        </p>
        <div className="mt-4">
          <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            Edit title and subtitle
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-3">
      <Input
        value={draftTitle}
        onChange={(event) => setDraftTitle(event.target.value)}
        placeholder="Thesis title"
        maxLength={200}
      />
      <Textarea
        value={draftDescription}
        onChange={(event) => setDraftDescription(event.target.value)}
        placeholder="Subtitle / short description"
        maxLength={4000}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setDraftTitle(title);
            setDraftDescription(description ?? "");
            setIsEditing(false);
          }}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
