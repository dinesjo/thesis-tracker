"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Link2, Plus, Save } from "lucide-react";
import { phaseColor } from "@/lib/phase-colors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DELIVERABLE_STATUS_LABELS,
  STATUS_COLUMN_LABELS,
  type DeliverableStatus,
  type StatusColumn,
} from "@/lib/domain/constants";
import { daysUntilDate, formatShortDate, relativeDayLabel } from "@/lib/date-utils";

type DeliverableItem = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  phaseId: string | null;
  status: DeliverableStatus;
  linkedTaskCount: number;
  completedTaskCount: number;
  resourceLinks: string[];
};

type TaskItem = {
  id: string;
  title: string;
  phaseId: string;
  statusColumn: StatusColumn;
  linkedDeliverableIds: string[];
};

type PhaseItem = {
  id: string;
  name: string;
  orderIndex: number;
};

type DeliverableDraft = {
  title: string;
  description: string;
  status: DeliverableStatus;
  dueDate: string;
  phaseId: string;
  resourceLinksText: string;
};

function toDraft(deliverable: DeliverableItem): DeliverableDraft {
  return {
    title: deliverable.title,
    description: deliverable.description ?? "",
    status: deliverable.status,
    dueDate: deliverable.dueDate ?? "",
    phaseId: deliverable.phaseId ?? "",
    resourceLinksText: (deliverable.resourceLinks ?? []).join("\n"),
  };
}

function parseResourceLinks(resourceLinksText: string): string[] {
  return resourceLinksText
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function DeliverablesClient({
  deliverables,
  tasks,
  phases,
}: {
  deliverables: DeliverableItem[];
  tasks: TaskItem[];
  phases: PhaseItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(deliverables[0]?.id ?? null);
  const [isCreating, setIsCreating] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingDetail, setSavingDetail] = useState(false);
  const [savingLinks, setSavingLinks] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [taskSearch, setTaskSearch] = useState("");
  const [draft, setDraft] = useState<DeliverableDraft | null>(null);

  const selected = useMemo(
    () => deliverables.find((deliverable) => deliverable.id === selectedId) ?? null,
    [deliverables, selectedId],
  );

  useEffect(() => {
    const selectedFromQuery = searchParams.get("deliverable");
    if (selectedFromQuery && deliverables.some((item) => item.id === selectedFromQuery)) {
      setSelectedId(selectedFromQuery);
    }
  }, [deliverables, searchParams]);

  useEffect(() => {
    if (deliverables.length === 0) {
      if (selectedId !== null) {
        setSelectedId(null);
      }
      return;
    }

    if (!selectedId || !deliverables.some((item) => item.id === selectedId)) {
      setSelectedId(deliverables[0].id);
    }
  }, [deliverables, selectedId]);

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      return;
    }

    setDraft(toDraft(selected));
  }, [selected]);

  const taskCountsByDeliverable = useMemo(() => {
    const counts = new Map<string, { linked: number; completed: number }>();
    tasks.forEach((task) => {
      task.linkedDeliverableIds.forEach((deliverableId) => {
        const curr = counts.get(deliverableId) ?? { linked: 0, completed: 0 };
        counts.set(deliverableId, {
          linked: curr.linked + 1,
          completed: curr.completed + (task.statusColumn === "done" ? 1 : 0),
        });
      });
    });
    return counts;
  }, [tasks]);

  const linkedTasks = useMemo(() => {
    if (!selected) return [];
    return tasks.filter((task) => task.linkedDeliverableIds.includes(selected.id));
  }, [selected, tasks]);

  const unlinkedTasks = useMemo(() => {
    if (!selected) return [];
    const normalizedSearch = taskSearch.trim().toLowerCase();
    const pool = tasks.filter((task) => !task.linkedDeliverableIds.includes(selected.id));
    if (!normalizedSearch) {
      return pool;
    }
    return pool.filter((task) => task.title.toLowerCase().includes(normalizedSearch));
  }, [selected, taskSearch, tasks]);

  const isDirty = useMemo(() => {
    if (!selected || !draft) return false;

    const draftLinks = parseResourceLinks(draft.resourceLinksText);
    const selectedLinks = selected.resourceLinks ?? [];

    return (
      draft.title !== selected.title ||
      draft.description !== (selected.description ?? "") ||
      draft.status !== selected.status ||
      draft.dueDate !== (selected.dueDate ?? "") ||
      draft.phaseId !== (selected.phaseId ?? "") ||
      draftLinks.join("\n") !== selectedLinks.join("\n")
    );
  }, [draft, selected]);

  async function createDeliverable(formData: FormData) {
    setSavingCreate(true);

    const payload = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? "") || null,
      dueDate: String(formData.get("dueDate") ?? "") || null,
      phaseId: String(formData.get("phaseId") ?? "") || null,
      status: String(formData.get("status") ?? "not_started"),
      resourceLinks: [],
    };

    try {
      const response = await fetch("/api/deliverables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Failed to create deliverable");
      }

      toast.success("Deliverable created");
      setIsCreating(false);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create deliverable";
      toast.error(message);
    } finally {
      setSavingCreate(false);
    }
  }

  async function saveSelected() {
    if (!selected || !draft) return;

    if (!draft.title.trim()) {
      toast.error("Title cannot be empty");
      return;
    }

    setSavingDetail(true);

    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim() ? draft.description.trim() : null,
      status: draft.status,
      dueDate: draft.dueDate || null,
      phaseId: draft.phaseId || null,
      resourceLinks: parseResourceLinks(draft.resourceLinksText),
    };

    try {
      const response = await fetch(`/api/deliverables/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Failed to update deliverable");
      }

      toast.success("Deliverable updated");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update deliverable";
      toast.error(message);
    } finally {
      setSavingDetail(false);
    }
  }

  async function linkTask(taskId: string) {
    if (!selected) return;

    setSavingLinks(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/link-deliverable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliverableId: selected.id }),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Failed to link task");
      }

      toast.success("Task linked");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to link task";
      toast.error(message);
    } finally {
      setSavingLinks(false);
    }
  }

  async function unlinkTask(taskId: string) {
    if (!selected) return;

    setSavingLinks(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/link-deliverable/${selected.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Failed to unlink task");
      }

      toast.success("Task unlinked");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to unlink task";
      toast.error(message);
    } finally {
      setSavingLinks(false);
    }
  }

  async function deleteSelected() {
    if (!selected) return;

    setDeleteConfirmOpen(false);
    setDeleting(true);
    try {
      const response = await fetch(`/api/deliverables/${selected.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Failed to delete deliverable");
      }

      toast.success("Deliverable deleted");
      setSelectedId(null);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete deliverable";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>All Deliverables</span>
            <Button size="sm" variant="outline" onClick={() => setIsCreating((value) => !value)}>
              <Plus className="mr-1 h-4 w-4" />
              New
            </Button>
          </CardTitle>
          <CardDescription>Milestones grouped by phase and completion state.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {deliverables.map((item) => {
            const itemPhase = phases.find((phase) => phase.id === item.phaseId);
            const pc = itemPhase ? phaseColor(itemPhase.orderIndex) : null;
            const days = item.dueDate ? daysUntilDate(item.dueDate) : null;
            const overdue = days !== null && days < 0 && item.status !== "done";
            const taskCounts = taskCountsByDeliverable.get(item.id) ?? { linked: 0, completed: 0 };

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`w-full rounded-md border p-3 text-left transition ${
                  selectedId === item.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:bg-muted/60"
                }`}
                style={pc ? { borderLeftWidth: 3, borderLeftColor: pc.fg } : undefined}
              >
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {itemPhase ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: pc?.fg }} />
                      {itemPhase.name}
                    </span>
                  ) : null}
                  <span>{DELIVERABLE_STATUS_LABELS[item.status]}</span>
                  <span>
                    {taskCounts.completed}/{taskCounts.linked} done
                  </span>
                  {item.dueDate ? (
                    <span className={overdue ? "font-medium text-red-500" : "text-muted-foreground"}>
                      {formatShortDate(item.dueDate)}
                      {days !== null && (item.status !== "done" || days >= 0)
                        ? ` (${relativeDayLabel(days)})`
                        : null}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}

          {isCreating ? (
            <form
              className="mt-3 space-y-2 rounded-md border border-dashed border-border p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void createDeliverable(new FormData(event.currentTarget));
              }}
            >
              <Label htmlFor="create-title">Title</Label>
              <Input id="create-title" name="title" required />

              <Label htmlFor="create-description">Description</Label>
              <Textarea id="create-description" name="description" />

              <Label htmlFor="create-phaseId">Phase</Label>
              <Select id="create-phaseId" name="phaseId" defaultValue="">
                <option value="">No phase</option>
                {phases.map((phase) => (
                  <option key={phase.id} value={phase.id}>
                    {phase.name}
                  </option>
                ))}
              </Select>

              <Label htmlFor="create-dueDate">Due date</Label>
              <Input id="create-dueDate" name="dueDate" type="date" />

              <Label htmlFor="create-status">Status</Label>
              <Select id="create-status" name="status" defaultValue="not_started">
                {Object.entries(DELIVERABLE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>

              <Button type="submit" className="w-full" disabled={savingCreate}>
                {savingCreate ? "Saving..." : "Create deliverable"}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Deliverable Detail</span>
            {selected ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                Delete
              </Button>
            ) : null}
          </CardTitle>
          <CardDescription>Manage status, dates, links, and evidence URLs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!selected || !draft ? (
            <p className="text-sm text-muted-foreground">Select a deliverable to view details.</p>
          ) : (
            <div key={selected.id} className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="detail-title">Title</Label>
                  <Input
                    id="detail-title"
                    value={draft.title}
                    onChange={(event) => setDraft((current) => (current ? { ...current, title: event.target.value } : current))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="detail-description">Description</Label>
                  <Textarea
                    id="detail-description"
                    value={draft.description}
                    onChange={(event) => setDraft((current) => (current ? { ...current, description: event.target.value } : current))}
                  />
                </div>
                <div>
                  <Label htmlFor="detail-status">Status</Label>
                  <Select
                    id="detail-status"
                    value={draft.status}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              status: event.target.value as DeliverableStatus,
                            }
                          : current,
                      )
                    }
                  >
                    {Object.entries(DELIVERABLE_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="detail-dueDate">Due date</Label>
                  <Input
                    id="detail-dueDate"
                    type="date"
                    value={draft.dueDate}
                    onChange={(event) =>
                      setDraft((current) => (current ? { ...current, dueDate: event.target.value } : current))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="detail-phase">Phase</Label>
                  <Select
                    id="detail-phase"
                    value={draft.phaseId}
                    onChange={(event) =>
                      setDraft((current) => (current ? { ...current, phaseId: event.target.value } : current))
                    }
                  >
                    <option value="">No phase</option>
                    {phases.map((phase) => (
                      <option key={phase.id} value={phase.id}>
                        {phase.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="detail-links">Resource links (one URL per line)</Label>
                  <Textarea
                    id="detail-links"
                    value={draft.resourceLinksText}
                    onChange={(event) =>
                      setDraft((current) =>
                        current ? { ...current, resourceLinksText: event.target.value } : current,
                      )
                    }
                    placeholder="https://example.com/reference"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDraft(toDraft(selected))}
                  disabled={!isDirty || savingDetail}
                >
                  Reset
                </Button>
                <Button type="button" onClick={() => void saveSelected()} disabled={!isDirty || savingDetail} className="gap-2">
                  <Save className="h-4 w-4" />
                  {savingDetail ? "Saving..." : "Save changes"}
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 rounded-md border border-border p-3">
                  <p className="text-sm font-semibold text-foreground">Linked tasks</p>
                  {linkedTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No linked tasks yet.</p>
                  ) : (
                    linkedTasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between rounded bg-muted/55 p-2">
                        <div>
                          <p className="text-sm font-medium">{task.title}</p>
                          <p className="text-xs text-muted-foreground">{STATUS_COLUMN_LABELS[task.statusColumn]}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void unlinkTask(task.id)}
                          disabled={savingLinks}
                        >
                          Unlink
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2 rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">Available tasks</p>
                    <Input
                      value={taskSearch}
                      onChange={(event) => setTaskSearch(event.target.value)}
                      placeholder="Search tasks"
                      className="h-8 w-40 text-xs"
                    />
                  </div>
                  {unlinkedTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No matching unlinked tasks.</p>
                  ) : (
                    unlinkedTasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between rounded bg-muted/55 p-2">
                        <div>
                          <p className="text-sm font-medium">{task.title}</p>
                          <p className="text-xs text-muted-foreground">{STATUS_COLUMN_LABELS[task.statusColumn]}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void linkTask(task.id)}
                          className="gap-1"
                          disabled={savingLinks}
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          Link
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete deliverable"
        description={selected ? `Delete "${selected.title}"? This cannot be undone.` : "Delete this deliverable?"}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onCancel={() => {
          if (!deleting) {
            setDeleteConfirmOpen(false);
          }
        }}
        onConfirm={() => {
          void deleteSelected();
        }}
      />
    </div>
  );
}
