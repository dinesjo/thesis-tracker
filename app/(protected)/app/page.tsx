import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTimelineData, listDeliverablesForUser } from "@/lib/domain/service";
import { getUserOrNull } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ProjectSummaryEditor } from "@/app/(protected)/app/components/project-summary-editor";
import { STATUS_COLUMN_LABELS, type StatusColumn } from "@/lib/domain/constants";
import { phaseColor } from "@/lib/phase-colors";
import {
  daysBetweenDates,
  daysUntilDate,
  formatDateRange,
  formatShortDate,
  relativeDayLabel,
} from "@/lib/date-utils";

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

  const phaseTasks = phase ? timeline.tasks.filter((task) => task.phaseId === phase.id) : [];
  const phaseDone = phaseTasks.filter((task) => task.statusColumn === "done").length;
  const phaseBlocked = phaseTasks.filter((task) => task.statusColumn === "blocked").length;
  const phaseInProgress = phaseTasks.filter((task) => task.statusColumn === "in_progress").length;
  const phasePct = phaseTasks.length === 0 ? 0 : Math.round((phaseDone / phaseTasks.length) * 100);

  const phaseDaysTotal = phase ? daysBetweenDates(phase.startDate, phase.endDate) : 0;
  const phaseDaysLeft = phase ? daysUntilDate(phase.endDate) : 0;
  const phaseDaysElapsed = Math.max(0, phaseDaysTotal - Math.max(0, phaseDaysLeft));
  const phaseTimePct =
    phaseDaysTotal === 0 ? 0 : Math.min(100, Math.round((phaseDaysElapsed / phaseDaysTotal) * 100));

  const phaseDeliverables = phase ? deliverables.filter((deliverable) => deliverable.phaseId === phase.id) : [];
  const phaseDelDone = phaseDeliverables.filter((deliverable) => deliverable.status === "done").length;

  const upNextTasks = phaseTasks
    .filter((task) => task.statusColumn !== "done")
    .sort((a, b) => {
      const ai = statusOrder.indexOf(a.statusColumn);
      const bi = statusOrder.indexOf(b.statusColumn);
      if (ai !== bi) return ai - bi;
      return a.columnOrder - b.columnOrder;
    })
    .slice(0, 8);

  const totalDone = timeline.tasks.filter((task) => task.statusColumn === "done").length;
  const totalPct = timeline.tasks.length === 0 ? 0 : Math.round((totalDone / timeline.tasks.length) * 100);

  const blockedTasks = timeline.tasks.filter((task) => task.statusColumn === "blocked");
  const overdueDeliverables = deliverables.filter((deliverable) => {
    if (!deliverable.dueDate || deliverable.status === "done") return false;
    return daysUntilDate(deliverable.dueDate) < 0;
  });
  const dueSoonDeliverables = deliverables.filter((deliverable) => {
    if (!deliverable.dueDate || deliverable.status === "done") return false;
    const days = daysUntilDate(deliverable.dueDate);
    return days >= 0 && days <= 7;
  });

  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-border bg-card/90 p-5 shadow-editorial backdrop-blur">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Project Dashboard</p>
        <ProjectSummaryEditor title={timeline.project.title} description={timeline.project.description} />
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Completion</p>
            <p className="mt-1 font-[var(--font-display)] text-3xl leading-none text-foreground">{totalPct}%</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {totalDone}/{timeline.tasks.length} tasks done
            </p>
          </CardContent>
        </Card>
        <Card className={blockedTasks.length > 0 ? "border-red-500/40 bg-red-500/5" : ""}>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Blocked Tasks</p>
            <p className="mt-1 font-[var(--font-display)] text-3xl leading-none text-foreground">{blockedTasks.length}</p>
            <p className="mt-2 text-xs text-muted-foreground">Needs immediate action</p>
          </CardContent>
        </Card>
        <Card className={overdueDeliverables.length > 0 ? "border-red-500/40 bg-red-500/5" : ""}>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Overdue Milestones</p>
            <p className="mt-1 font-[var(--font-display)] text-3xl leading-none text-foreground">{overdueDeliverables.length}</p>
            <p className="mt-2 text-xs text-muted-foreground">Deliverables past due date</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Due This Week</p>
            <p className="mt-1 font-[var(--font-display)] text-3xl leading-none text-foreground">{dueSoonDeliverables.length}</p>
            <p className="mt-2 text-xs text-muted-foreground">Upcoming deliverables in 7 days</p>
          </CardContent>
        </Card>
      </div>

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
          <div
            className="rounded-xl border p-5 shadow-editorial"
            style={{
              backgroundColor: phaseColor(phase.orderIndex).bg,
              borderColor: phaseColor(phase.orderIndex).fg,
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: phaseColor(phase.orderIndex).fg }}
                >
                  Current Phase
                </p>
                <p className="mt-0.5 font-[var(--font-display)] text-xl font-semibold text-foreground">
                  {phase.name}
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{formatDateRange(phase.startDate, phase.endDate)}</p>
                <p className="mt-0.5 font-medium text-foreground">
                  {phaseDaysLeft > 0
                    ? `${phaseDaysLeft} days left`
                    : phaseDaysLeft === 0
                      ? "Last day"
                      : `${Math.abs(phaseDaysLeft)}d overdue`}
                </p>
              </div>
            </div>
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full"
              style={{
                backgroundColor: `color-mix(in srgb, ${phaseColor(phase.orderIndex).fg} 20%, transparent)`,
              }}
            >
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ width: `${phaseTimePct}%`, backgroundColor: phaseColor(phase.orderIndex).fg }}
              />
            </div>

            <div
              className="mt-4 grid grid-cols-3 gap-4 border-t pt-4"
              style={{
                borderColor: `color-mix(in srgb, ${phaseColor(phase.orderIndex).fg} 25%, transparent)`,
              }}
            >
              <div>
                <p className="text-xs text-muted-foreground">Tasks</p>
                <p className="mt-0.5 font-[var(--font-display)] text-2xl font-semibold text-foreground">
                  {phaseDone}
                  <span className="text-base font-normal text-muted-foreground">/{phaseTasks.length}</span>
                </p>
                <p className="text-xs text-muted-foreground">{phasePct}% complete</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">In progress</p>
                <p className="mt-0.5 font-[var(--font-display)] text-2xl font-semibold text-foreground">
                  {phaseInProgress}
                </p>
                {phaseBlocked > 0 ? (
                  <p className="text-xs font-medium text-red-500">{phaseBlocked} blocked</p>
                ) : (
                  <p className="text-xs text-muted-foreground">none blocked</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Deliverables</p>
                <p className="mt-0.5 font-[var(--font-display)] text-2xl font-semibold text-foreground">
                  {phaseDelDone}
                  <span className="text-base font-normal text-muted-foreground">/{phaseDeliverables.length}</span>
                </p>
                <p className="text-xs text-muted-foreground">milestones done</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Up Next</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {upNextTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">All tasks in this phase are done.</p>
                ) : (
                  upNextTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/app/board?task=${task.id}`}
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
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Phase Deliverables</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {phaseDeliverables.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No deliverables linked to this phase.</p>
                ) : (
                  phaseDeliverables.map((item) => {
                    const days = item.dueDate ? daysUntilDate(item.dueDate) : null;
                    const overdue = days !== null && days < 0 && item.status !== "done";

                    return (
                      <Link
                        href={`/app/deliverables?deliverable=${item.id}`}
                        key={item.id}
                        className={`block rounded-md border p-3 ${
                          item.status === "done"
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : overdue
                              ? "border-red-500/30 bg-red-500/5"
                              : "border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-sm font-medium ${
                              item.status === "done" ? "text-muted-foreground line-through" : "text-foreground"
                            }`}
                          >
                            {item.title}
                          </p>
                          {item.dueDate ? (
                            <span
                              className={`shrink-0 text-xs ${
                                overdue ? "font-medium text-red-500" : "text-muted-foreground"
                              }`}
                            >
                              {formatShortDate(item.dueDate)} {days !== null ? `(${relativeDayLabel(days)})` : ""}
                            </span>
                          ) : null}
                        </div>
                        {item.linkedTaskCount > 0 ? (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1 flex-1 rounded-full bg-muted">
                              <div
                                className="h-1 rounded-full bg-emerald-500 transition-all"
                                style={{
                                  width: `${Math.round(
                                    (item.completedTaskCount / item.linkedTaskCount) * 100,
                                  )}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {item.completedTaskCount}/{item.linkedTaskCount}
                            </span>
                          </div>
                        ) : null}
                      </Link>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Radar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {blockedTasks.length === 0 && overdueDeliverables.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No critical risks detected right now.</p>
                ) : (
                  <>
                    {blockedTasks.slice(0, 4).map((task) => (
                      <Link
                        key={`blocked-${task.id}`}
                        href={`/app/board?task=${task.id}`}
                        className="flex items-center justify-between rounded-md border border-red-500/30 bg-red-500/5 p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                          <p className="text-xs text-red-600 dark:text-red-300">Blocked in board flow</p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-red-500" />
                      </Link>
                    ))}
                    {overdueDeliverables.slice(0, 4).map((item) => (
                      <Link
                        key={`overdue-${item.id}`}
                        href={`/app/deliverables?deliverable=${item.id}`}
                        className="flex items-center justify-between rounded-md border border-red-500/30 bg-red-500/5 p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                          <p className="text-xs text-red-600 dark:text-red-300">
                            {item.dueDate ? relativeDayLabel(daysUntilDate(item.dueDate)) : "Past planned date"}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-red-500" />
                      </Link>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Overall: {totalDone}/{timeline.tasks.length} tasks ({totalPct}%)
                </span>
                <span>{formatDateRange(timeline.project.startDate, timeline.project.endDate)}</span>
              </div>
              <div className="mt-2 flex gap-0.5">
                {timeline.phases.map((itemPhase) => {
                  const isCurrent = itemPhase.id === phase.id;
                  const pDone = timeline.tasks.filter(
                    (task) => task.phaseId === itemPhase.id && task.statusColumn === "done",
                  ).length;
                  const pTotal = timeline.tasks.filter((task) => task.phaseId === itemPhase.id).length;
                  const pPct = pTotal === 0 ? 0 : Math.round((pDone / pTotal) * 100);
                  const pc = phaseColor(itemPhase.orderIndex);

                  return (
                    <div key={itemPhase.id} className="flex-1" title={`${itemPhase.name}: ${pDone}/${pTotal}`}>
                      <div className="h-2 rounded-sm" style={{ backgroundColor: pc.bg }}>
                        <div
                          className="h-2 rounded-sm transition-all"
                          style={{ width: `${pPct}%`, backgroundColor: pc.fg, opacity: isCurrent ? 1 : 0.5 }}
                        />
                      </div>
                      <p
                        className={`mt-1 truncate text-[10px] ${
                          isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {itemPhase.name}
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
