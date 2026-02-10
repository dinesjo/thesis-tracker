import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTimelineData, listDeliverablesForUser } from "@/lib/domain/service";
import { getUserOrNull } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ProjectSummaryEditor } from "@/app/(protected)/app/components/project-summary-editor";
import { STATUS_COLUMN_LABELS, type StatusColumn } from "@/lib/domain/constants";
import { phaseColor } from "@/lib/phase-colors";

function formatDate(iso: string): string {
  const date = new Date(iso + "T00:00:00");
  return date.toLocaleDateString("en-SE", { month: "short", day: "numeric" });
}

function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + "T00:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso + "T00:00:00");
  const end = new Date(endIso + "T00:00:00");
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function daysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `in ${days}d`;
}

const statusOrder: StatusColumn[] = ["in_progress", "todo", "blocked", "backlog"];

export default async function AppOverviewPage() {
  const user = await getUserOrNull();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const [timeline, deliverables] = await Promise.all([
    getTimelineData(user.id),
    listDeliverablesForUser(user.id),
  ]);

  const phase = timeline.currentPhase;

  const phaseTasks = phase
    ? timeline.tasks.filter((t) => t.phaseId === phase.id)
    : [];
  const phaseDone = phaseTasks.filter((t) => t.statusColumn === "done").length;
  const phaseBlocked = phaseTasks.filter((t) => t.statusColumn === "blocked").length;
  const phaseInProgress = phaseTasks.filter((t) => t.statusColumn === "in_progress").length;
  const phasePct = phaseTasks.length === 0 ? 0 : Math.round((phaseDone / phaseTasks.length) * 100);

  const phaseDaysTotal = phase ? daysBetween(phase.startDate, phase.endDate) : 0;
  const phaseDaysLeft = phase ? daysUntil(phase.endDate) : 0;
  const phaseDaysElapsed = Math.max(0, phaseDaysTotal - Math.max(0, phaseDaysLeft));
  const phaseTimePct = phaseDaysTotal === 0 ? 0 : Math.min(100, Math.round((phaseDaysElapsed / phaseDaysTotal) * 100));

  const phaseDeliverables = phase
    ? deliverables.filter((d) => d.phaseId === phase.id)
    : [];
  const phaseDelDone = phaseDeliverables.filter((d) => d.status === "done").length;

  // Tasks to show: in_progress first, then todo, then blocked, then backlog — skip done
  const upNextTasks = phaseTasks
    .filter((t) => t.statusColumn !== "done")
    .sort((a, b) => {
      const ai = statusOrder.indexOf(a.statusColumn);
      const bi = statusOrder.indexOf(b.statusColumn);
      if (ai !== bi) return ai - bi;
      return a.columnOrder - b.columnOrder;
    })
    .slice(0, 8);

  // Overall project progress for the phase timeline strip
  const totalDone = timeline.tasks.filter((t) => t.statusColumn === "done").length;
  const totalPct = timeline.tasks.length === 0 ? 0 : Math.round((totalDone / timeline.tasks.length) * 100);

  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-border bg-card/90 p-5 shadow-editorial backdrop-blur">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Project Dashboard</p>
        <ProjectSummaryEditor
          title={timeline.project.title}
          description={timeline.project.description}
        />
      </header>

      {!phase ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              No active phase right now. Check the timeline to see upcoming phases.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Current phase card with metrics ── */}
          <div
            className="rounded-xl border p-5 shadow-editorial"
            style={{ backgroundColor: phaseColor(phase.orderIndex).bg, borderColor: phaseColor(phase.orderIndex).fg }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: phaseColor(phase.orderIndex).fg }}>Current Phase</p>
                <p className="mt-0.5 font-[var(--font-display)] text-xl font-semibold text-foreground">{phase.name}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{formatDate(phase.startDate)} – {formatDate(phase.endDate)}</p>
                <p className="mt-0.5 font-medium text-foreground">
                  {phaseDaysLeft > 0 ? `${phaseDaysLeft} days left` : phaseDaysLeft === 0 ? "Last day" : `${Math.abs(phaseDaysLeft)}d overdue`}
                </p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${phaseColor(phase.orderIndex).fg} 20%, transparent)` }}>
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${phaseTimePct}%`, backgroundColor: phaseColor(phase.orderIndex).fg }} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4" style={{ borderColor: `color-mix(in srgb, ${phaseColor(phase.orderIndex).fg} 25%, transparent)` }}>
              <div>
                <p className="text-xs text-muted-foreground">Tasks</p>
                <p className="mt-0.5 font-[var(--font-display)] text-2xl font-semibold text-foreground">
                  {phaseDone}<span className="text-base font-normal text-muted-foreground">/{phaseTasks.length}</span>
                </p>
                <p className="text-xs text-muted-foreground">{phasePct}% complete</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">In progress</p>
                <p className="mt-0.5 font-[var(--font-display)] text-2xl font-semibold text-foreground">{phaseInProgress}</p>
                {phaseBlocked > 0 ? (
                  <p className="text-xs font-medium text-red-500">{phaseBlocked} blocked</p>
                ) : (
                  <p className="text-xs text-muted-foreground">none blocked</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Deliverables</p>
                <p className="mt-0.5 font-[var(--font-display)] text-2xl font-semibold text-foreground">
                  {phaseDelDone}<span className="text-base font-normal text-muted-foreground">/{phaseDeliverables.length}</span>
                </p>
                <p className="text-xs text-muted-foreground">milestones done</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* ── Up next tasks ── */}
            <Card>
              <CardHeader>
                <CardTitle>Up Next</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {upNextTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">All tasks in this phase are done.</p>
                ) : (
                  upNextTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between gap-3 rounded-md border p-3 ${
                        task.statusColumn === "blocked"
                          ? "border-red-500/30 bg-red-500/5"
                          : task.statusColumn === "in_progress"
                            ? "border-primary/30 bg-primary/5"
                            : "border-border"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                        {task.description ? (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{task.description}</p>
                        ) : null}
                      </div>
                      <Badge
                        variant={task.statusColumn === "in_progress" ? "default" : "outline"}
                        className="shrink-0"
                      >
                        {STATUS_COLUMN_LABELS[task.statusColumn]}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* ── Phase deliverables ── */}
            <Card>
              <CardHeader>
                <CardTitle>Phase Deliverables</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {phaseDeliverables.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No deliverables linked to this phase.</p>
                ) : (
                  phaseDeliverables.map((item) => {
                    const days = item.dueDate ? daysUntil(item.dueDate) : null;
                    const overdue = days !== null && days < 0 && item.status !== "done";

                    return (
                      <div
                        key={item.id}
                        className={`rounded-md border p-3 ${
                          item.status === "done"
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : overdue
                              ? "border-red-500/30 bg-red-500/5"
                              : "border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm font-medium ${item.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}>
                            {item.title}
                          </p>
                          {item.dueDate ? (
                            <span className={`shrink-0 text-xs ${overdue ? "font-medium text-red-500" : "text-muted-foreground"}`}>
                              {formatDate(item.dueDate)} {days !== null ? `(${daysLabel(days)})` : ""}
                            </span>
                          ) : null}
                        </div>
                        {item.linkedTaskCount > 0 ? (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1 flex-1 rounded-full bg-muted">
                              <div
                                className="h-1 rounded-full bg-emerald-500 transition-all"
                                style={{ width: `${Math.round((item.completedTaskCount / item.linkedTaskCount) * 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{item.completedTaskCount}/{item.linkedTaskCount}</span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Overall phases strip ── */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Overall: {totalDone}/{timeline.tasks.length} tasks ({totalPct}%)</span>
                <span>{formatDate(timeline.project.startDate)} – {formatDate(timeline.project.endDate)}</span>
              </div>
              <div className="mt-2 flex gap-0.5">
                {timeline.phases.map((p) => {
                  const isCurrent = p.id === phase.id;
                  const pDone = timeline.tasks.filter((t) => t.phaseId === p.id && t.statusColumn === "done").length;
                  const pTotal = timeline.tasks.filter((t) => t.phaseId === p.id).length;
                  const pPct = pTotal === 0 ? 0 : Math.round((pDone / pTotal) * 100);
                  const pc = phaseColor(p.orderIndex);

                  return (
                    <div key={p.id} className="flex-1" title={`${p.name}: ${pDone}/${pTotal}`}>
                      <div
                        className="h-2 rounded-sm"
                        style={{ backgroundColor: pc.bg }}
                      >
                        <div
                          className="h-2 rounded-sm transition-all"
                          style={{ width: `${pPct}%`, backgroundColor: pc.fg, opacity: isCurrent ? 1 : 0.5 }}
                        />
                      </div>
                      <p className={`mt-1 truncate text-[10px] ${isCurrent ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                        {p.name}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
