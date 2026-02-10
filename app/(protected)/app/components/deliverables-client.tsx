"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link2, Plus } from "lucide-react";
import { phaseColor } from "@/lib/phase-colors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

type DeliverableItem = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  phaseId: string | null;
  status: DeliverableStatus;
  linkedTaskCount: number;
  completedTaskCount: number;
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
  const [selectedId, setSelectedId] = useState<string | null>(deliverables[0]?.id ?? null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => deliverables.find((deliverable) => deliverable.id === selectedId) ?? null,
    [deliverables, selectedId],
  );

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

  const linkedTasks = useMemo(() => {
    if (!selected) return [];
    return tasks.filter((task) => task.linkedDeliverableIds.includes(selected.id));
  }, [selected, tasks]);

  const unlinkedTasks = useMemo(() => {
    if (!selected) return [];
    return tasks.filter((task) => !task.linkedDeliverableIds.includes(selected.id));
  }, [selected, tasks]);

  async function createDeliverable(formData: FormData) {
    setSaving(true);

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
      setSaving(false);
    }
  }

  async function updateSelected(partial: Record<string, unknown>) {
    if (!selected) return;

    try {
      const response = await fetch(`/api/deliverables/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
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
    }
  }

  async function linkTask(taskId: string) {
    if (!selected) return;

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
    }
  }

  async function unlinkTask(taskId: string) {
    if (!selected) return;

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
    }
  }

  async function deleteSelected() {
    if (!selected) return;
    const confirmed = window.confirm(`Delete deliverable "${selected.title}"? This cannot be undone.`);
    if (!confirmed) return;

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
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>All Deliverables</span>
            <Button size="sm" variant="outline" onClick={() => setIsCreating((v) => !v)}>
              <Plus className="mr-1 h-4 w-4" />
              New
            </Button>
          </CardTitle>
          <CardDescription>Preloaded milestones, fully editable.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {deliverables.map((item) => {
            const itemPhase = phases.find((p) => p.id === item.phaseId);
            const pc = itemPhase ? phaseColor(itemPhase.orderIndex) : null;

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
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {itemPhase ? (
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: pc?.fg }}
                      />
                      {itemPhase.name}
                    </span>
                  ) : null}
                  <span>{DELIVERABLE_STATUS_LABELS[item.status]}</span>
                  <span>{item.completedTaskCount}/{item.linkedTaskCount} done</span>
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
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />

              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" />

              <Label htmlFor="phaseId">Phase</Label>
              <Select id="phaseId" name="phaseId" defaultValue="">
                <option value="">No phase</option>
                {phases.map((phase) => (
                  <option key={phase.id} value={phase.id}>
                    {phase.name}
                  </option>
                ))}
              </Select>

              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" name="dueDate" type="date" />

              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue="not_started">
                {Object.entries(DELIVERABLE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving..." : "Create deliverable"}
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
              <Button type="button" variant="destructive" size="sm" onClick={() => void deleteSelected()}>
                Delete
              </Button>
            ) : null}
          </CardTitle>
          <CardDescription>Manage status, due dates, and task links.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!selected ? (
            <p className="text-sm text-muted-foreground">Select a deliverable to view details.</p>
          ) : (
            <div key={selected.id} className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label>Title</Label>
                  <Input
                    defaultValue={selected.title}
                    onBlur={(event) => {
                      if (event.target.value !== selected.title) {
                        void updateSelected({ title: event.target.value });
                      }
                    }}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    defaultValue={selected.description ?? ""}
                    onBlur={(event) => {
                      if ((selected.description ?? "") !== event.target.value) {
                        void updateSelected({ description: event.target.value || null });
                      }
                    }}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={selected.status}
                    onChange={(event) => {
                      void updateSelected({ status: event.target.value });
                    }}
                  >
                    {Object.entries(DELIVERABLE_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Due date</Label>
                  <Input
                    type="date"
                    defaultValue={selected.dueDate ?? ""}
                    onBlur={(event) => {
                      void updateSelected({ dueDate: event.target.value || null });
                    }}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Phase</Label>
                  <Select
                    value={selected.phaseId ?? ""}
                    onChange={(event) => {
                      void updateSelected({ phaseId: event.target.value || null });
                    }}
                  >
                    <option value="">No phase</option>
                    {phases.map((phase) => (
                      <option key={phase.id} value={phase.id}>
                        {phase.name}
                      </option>
                    ))}
                  </Select>
                </div>
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
                        <Button size="sm" variant="ghost" onClick={() => void unlinkTask(task.id)}>
                          Unlink
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2 rounded-md border border-border p-3">
                  <p className="text-sm font-semibold text-foreground">Available tasks</p>
                  {unlinkedTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground">All tasks are already linked.</p>
                  ) : (
                    <>
                      {unlinkedTasks.slice(0, 12).map((task) => (
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
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            Link
                          </Button>
                        </div>
                      ))}
                      {unlinkedTasks.length > 12 ? (
                        <p className="pt-1 text-xs text-muted-foreground">
                          +{unlinkedTasks.length - 12} more tasks not shown
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              </div>

            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
