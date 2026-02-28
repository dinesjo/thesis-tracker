"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Gantt, { type GanttTask } from "frappe-gantt";
import { toast } from "sonner";
import "@/app/vendor/frappe-gantt.css";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STATUS_COLUMN_LABELS, type StatusColumn } from "@/lib/domain/constants";
import { phaseColor } from "@/lib/phase-colors";
import { formatDateRange, isoDateInTimeZone } from "@/lib/date-utils";

type TimelineData = {
  phases: {
    id: string;
    name: string;
    orderIndex: number;
    startDate: string;
    endDate: string;
  }[];
  tasks: {
    id: string;
    title: string;
    description: string | null;
    phaseId: string;
    statusColumn: StatusColumn;
    startAt: string;
    endAt: string;
  }[];
  currentPhase: {
    id: string;
    name: string;
  } | null;
};

export function TimelineClient({ data }: { data: TimelineData }) {
  const router = useRouter();
  const ganttRef = useRef<HTMLDivElement | null>(null);
  const ganttInstance = useRef<Gantt | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"Day" | "Week" | "Month">("Week");
  const [isEditingPhases, setIsEditingPhases] = useState(false);
  const [savingPhases, setSavingPhases] = useState(false);
  const todayIso = useMemo(() => isoDateInTimeZone(new Date()), []);

  const phaseById = useMemo(() => new Map(data.phases.map((phase) => [phase.id, phase])), [data.phases]);

  const ganttTasks = useMemo<GanttTask[]>(
    () =>
      data.tasks.map((task) => ({
        id: task.id,
        name: task.title,
        start: task.startAt,
        end: task.endAt,
        progress:
          task.statusColumn === "done"
            ? 100
            : task.statusColumn === "in_progress"
              ? 65
              : task.statusColumn === "blocked" || (task.statusColumn !== "done" && task.endAt < todayIso)
                ? 45
                : 12,
        custom_class:
          task.statusColumn === "done"
            ? "bar-done"
            : task.statusColumn === "in_progress"
              ? "bar-in-progress"
              : task.statusColumn === "blocked" || (task.statusColumn !== "done" && task.endAt < todayIso)
                ? "bar-alert"
                : "bar-todo",
      })),
    [data.tasks, todayIso],
  );

  const sortedPhases = useMemo(() => {
    return [...data.phases].sort((a, b) => a.orderIndex - b.orderIndex);
  }, [data.phases]);

  const phaseWindowPadding = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const firstPhaseStart = sortedPhases[0]?.startDate ?? todayIso;
    const lastPhaseEnd = sortedPhases[sortedPhases.length - 1]?.endDate ?? todayIso;

    const taskStarts = data.tasks.map((task) => task.startAt).sort();
    const taskEnds = data.tasks.map((task) => task.endAt).sort();
    const firstTaskStart = taskStarts[0] ?? todayIso;
    const lastTaskEnd = taskEnds[taskEnds.length - 1] ?? todayIso;

    const toUtc = (value: string) => new Date(`${value}T00:00:00Z`).getTime();
    const startPadDays = Math.max(7, Math.ceil((toUtc(firstTaskStart) - toUtc(firstPhaseStart)) / dayMs) + 2);
    const endPadDays = Math.max(7, Math.ceil((toUtc(lastPhaseEnd) - toUtc(lastTaskEnd)) / dayMs) + 2);

    return [`${startPadDays}d`, `${endPadDays}d`] as [string, string];
  }, [data.tasks, sortedPhases, todayIso]);

  const [phaseDrafts, setPhaseDrafts] = useState(() =>
    [...data.phases]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((phase) => ({
        id: phase.id,
        orderIndex: phase.orderIndex,
        name: phase.name,
        startDate: phase.startDate,
        endDate: phase.endDate,
      })),
  );

  useEffect(() => {
    if (!isEditingPhases) {
      setPhaseDrafts(
        sortedPhases.map((phase) => ({
          id: phase.id,
          orderIndex: phase.orderIndex,
          name: phase.name,
          startDate: phase.startDate,
          endDate: phase.endDate,
        })),
      );
    }
  }, [isEditingPhases, sortedPhases]);

  const phaseByDate = useMemo(() => {
    return (date: Date) => {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, "0");
      const d = String(date.getUTCDate()).padStart(2, "0");
      const iso = `${y}-${m}-${d}`;
      return sortedPhases.find((phase) => phase.startDate <= iso && iso <= phase.endDate) ?? null;
    };
  }, [sortedPhases]);

  const formatFallbackUpper = (date: Date) =>
    date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

  const getPhaseUpperHeader = (date: Date, previousDate?: Date) => {
    const current = phaseByDate(date);
    const previous = previousDate ? phaseByDate(previousDate) : null;

    if (current) {
      return previous?.id === current.id ? "" : current.name;
    }

    const fallback = formatFallbackUpper(date);
    if (!previousDate) {
      return fallback;
    }

    const previousFallback = formatFallbackUpper(previousDate);
    return fallback === previousFallback ? "" : fallback;
  };

  const phaseColorById = useMemo(() => {
    const map = new Map<string, string>();
    sortedPhases.forEach((phase) => {
      map.set(phase.id, phaseColor(phase.orderIndex).bg);
    });
    return map;
  }, [sortedPhases]);

  const phaseHolidays = useMemo(() => {
    const toDateStrings = (startDate: string, endDate: string) => {
      const values: string[] = [];
      const current = new Date(`${startDate}T00:00:00Z`);
      const end = new Date(`${endDate}T00:00:00Z`);
      while (current.getTime() <= end.getTime()) {
        const y = current.getUTCFullYear();
        const m = String(current.getUTCMonth() + 1).padStart(2, "0");
        const d = String(current.getUTCDate()).padStart(2, "0");
        values.push(`${y}-${m}-${d}`);
        current.setUTCDate(current.getUTCDate() + 1);
      }
      return values;
    };

    return sortedPhases.reduce<Record<string, string[]>>((acc, phase) => {
      const color = phaseColorById.get(phase.id) ?? phaseColor(phase.orderIndex).bg;
      acc[color] = toDateStrings(phase.startDate, phase.endDate);
      return acc;
    }, {});
  }, [phaseColorById, sortedPhases]);

  const ganttViewModes = useMemo(
    () => [
      {
        name: "Day",
        padding: phaseWindowPadding,
        step: "1d",
        date_format: "YYYY-MM-DD",
        lower_text: (d: Date) =>
          d.toLocaleDateString("en-US", {
            day: "numeric",
          }),
        upper_text: (d: Date, ld?: Date) => {
          return getPhaseUpperHeader(d, ld);
        },
        thick_line: (d: Date) => d.getUTCDay() === 1,
      },
      {
        name: "Week",
        padding: phaseWindowPadding,
        step: "7d",
        column_width: 140,
        date_format: "YYYY-MM-DD",
        lower_text: (d: Date) => {
          const end = new Date(d);
          end.setUTCDate(end.getUTCDate() + 6);
          const startLabel = d.toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
          });
          const endLabel = end.toLocaleDateString("en-US", {
            day: "numeric",
            month: end.getUTCMonth() === d.getUTCMonth() ? undefined : "short",
          });
          return `${startLabel} - ${endLabel}`;
        },
        upper_text: (d: Date, ld?: Date) => {
          return getPhaseUpperHeader(d, ld);
        },
      },
      {
        name: "Month",
        padding: phaseWindowPadding,
        step: "1m",
        column_width: 120,
        date_format: "YYYY-MM",
        lower_text: (d: Date) =>
          d.toLocaleDateString("en-US", {
            month: "long",
          }),
        upper_text: (d: Date, ld?: Date) => {
          if (!ld || d.getUTCFullYear() !== ld.getUTCFullYear()) {
            return String(d.getUTCFullYear());
          }
          return "";
        },
      },
    ],
    [phaseByDate, phaseWindowPadding],
  );

  const containerHeight = useMemo(() => {
    const taskCount = Math.max(1, data.tasks.length);
    return Math.max(230, Math.min(460, taskCount * 54 + 118));
  }, [data.tasks.length]);

  function updatePhaseDraft(
    phaseId: string,
    field: "name" | "startDate" | "endDate",
    value: string,
  ) {
    setPhaseDrafts((prev) =>
      prev.map((phase) =>
        phase.id === phaseId
          ? {
              ...phase,
              [field]: value,
            }
          : phase,
      ),
    );
  }

  function validatePhaseDrafts() {
    for (let index = 0; index < phaseDrafts.length; index += 1) {
      const phase = phaseDrafts[index];
      if (!phase.name.trim()) {
        return `Phase ${index + 1} name cannot be empty`;
      }
      if (phase.startDate > phase.endDate) {
        return `Phase ${index + 1} start date must be on or before end date`;
      }
      if (index > 0) {
        const previous = phaseDrafts[index - 1];
        if (previous.endDate >= phase.startDate) {
          return `Phase ${index + 1} must start after the previous phase`;
        }
      }
    }

    return null;
  }

  async function savePhases() {
    const validationError = validatePhaseDrafts();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSavingPhases(true);
    try {
      const response = await fetch("/api/phases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phases: phaseDrafts.map((phase) => ({
            id: phase.id,
            name: phase.name.trim(),
            startDate: phase.startDate,
            endDate: phase.endDate,
          })),
        }),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Failed to update phases");
      }

      toast.success("Phases updated");
      setIsEditingPhases(false);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update phases";
      toast.error(message);
    } finally {
      setSavingPhases(false);
    }
  }

  useEffect(() => {
    if (!ganttRef.current) return;

    ganttRef.current.innerHTML = "";

    ganttInstance.current = new Gantt(ganttRef.current, ganttTasks, {
      view_modes: ganttViewModes,
      on_click: (task) => {
        setSelectedTaskId(task.id);
      },
      date_format: "YYYY-MM-DD",
      language: "en",
      readonly: true,
      container_height: containerHeight,
      infinite_padding: false,
      auto_move_label: true,
      scroll_to: "today",
      popup_on: "click",
      popup: () => false,
      holidays: phaseHolidays,
      upper_header_height: 52,
      lower_header_height: 36,
      bar_height: 28,
      padding: 20,
    });
    return () => {
      if (ganttRef.current) {
        ganttRef.current.innerHTML = "";
      }
      ganttInstance.current = null;
    };
  }, [containerHeight, ganttTasks, ganttViewModes, phaseHolidays]);

  useEffect(() => {
    if (!ganttInstance.current) {
      return;
    }

    ganttInstance.current.change_view_mode(viewMode, false);
    ganttInstance.current.scroll_current();
  }, [viewMode]);

  useEffect(() => {
    if (selectedTaskId && !data.tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(null);
    }
  }, [data.tasks, selectedTaskId]);

  const selectedTask =
    selectedTaskId === null ? null : data.tasks.find((task) => task.id === selectedTaskId) ?? null;

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[1fr_320px]">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Gantt View</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                if (isEditingPhases) {
                  setIsEditingPhases(false);
                  return;
                }
                setIsEditingPhases(true);
              }}
            >
              {isEditingPhases ? "Cancel phase edits" : "Edit phases"}
            </Button>
          </CardTitle>
          <CardDescription>Tasks are rendered as dated bars across your thesis phases.</CardDescription>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button size="sm" variant={viewMode === "Day" ? "default" : "outline"} onClick={() => setViewMode("Day")}>
              Day
            </Button>
            <Button size="sm" variant={viewMode === "Week" ? "default" : "outline"} onClick={() => setViewMode("Week")}>
              Week
            </Button>
            <Button size="sm" variant={viewMode === "Month" ? "default" : "outline"} onClick={() => setViewMode("Month")}>
              Month
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditingPhases ? (
            <div className="space-y-3 rounded-md border border-dashed border-border p-3">
              <p className="text-sm text-muted-foreground">
                Update phase names and date windows. Phases must remain sequential and non-overlapping.
              </p>
              <div className="space-y-3">
                {phaseDrafts.map((phase) => (
                  <div key={phase.id} className="grid gap-2 md:grid-cols-[1.2fr_1fr_1fr]">
                    <div>
                      <Label htmlFor={`phase-name-${phase.id}`}>Phase {phase.orderIndex + 1}</Label>
                      <Input
                        id={`phase-name-${phase.id}`}
                        value={phase.name}
                        onChange={(event) => updatePhaseDraft(phase.id, "name", event.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`phase-start-${phase.id}`}>Start</Label>
                      <Input
                        id={`phase-start-${phase.id}`}
                        type="date"
                        value={phase.startDate}
                        onChange={(event) => updatePhaseDraft(phase.id, "startDate", event.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`phase-end-${phase.id}`}>End</Label>
                      <Input
                        id={`phase-end-${phase.id}`}
                        type="date"
                        value={phase.endDate}
                        onChange={(event) => updatePhaseDraft(phase.id, "endDate", event.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={() => void savePhases()} disabled={savingPhases}>
                  {savingPhases ? "Saving..." : "Save phase changes"}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {sortedPhases.map((phase) => (
              <Badge
                key={phase.id}
                variant="outline"
                className="gap-1.5"
                style={{
                  backgroundColor: phaseColor(phase.orderIndex).bg,
                  borderColor: phaseColor(phase.orderIndex).fg,
                }}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: phaseColor(phase.orderIndex).fg }}
                />
                {phase.name}
              </Badge>
            ))}
          </div>
          <div className="timeline-gantt-shell overflow-x-auto overflow-y-visible rounded-md border border-border bg-card p-3">
            <div ref={ganttRef} className="timeline-gantt w-full pb-4" />
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              Done
            </Badge>
            <Badge variant="outline" className="gap-1 border-primary/40 bg-primary/10 text-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-primary" />
              In progress
            </Badge>
            <Badge variant="outline" className="gap-1 border-red-500/40 bg-red-500/10 text-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              Blocked / overdue
            </Badge>
            <Badge variant="outline" className="gap-1 border-slate-500/40 bg-slate-500/10 text-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-slate-500" />
              Todo / backlog
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
          <CardDescription>Click a bar in the timeline to inspect task details.</CardDescription>
        </CardHeader>
        <CardContent>
          {selectedTask ? (
            <div className="space-y-3 text-sm">
              <h4 className="font-semibold text-foreground">{selectedTask.title}</h4>
              {selectedTask.description ? (
                <p className="text-muted-foreground">{selectedTask.description}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{STATUS_COLUMN_LABELS[selectedTask.statusColumn]}</Badge>
                <Badge>
                  {phaseById.get(selectedTask.phaseId)?.name ?? "No phase"}
                </Badge>
                <Badge variant="outline">
                  {formatDateRange(selectedTask.startAt, selectedTask.endAt)}
                </Badge>
              </div>
              <Button asChild size="sm" className="w-full">
                <Link href={`/app/board?task=${selectedTask.id}`}>Open in board</Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select a task bar from the timeline.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
