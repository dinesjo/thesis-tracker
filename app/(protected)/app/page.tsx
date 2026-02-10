import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTimelineData, listDeliverablesForUser } from "@/lib/domain/service";
import { getUserOrNull } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ProjectSummaryEditor } from "@/app/(protected)/app/components/project-summary-editor";

export default async function AppOverviewPage() {
  const user = await getUserOrNull();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const [timeline, deliverables] = await Promise.all([
    getTimelineData(user.id),
    listDeliverablesForUser(user.id),
  ]);

  const doneCount = timeline.tasks.filter((task) => task.statusColumn === "done").length;

  const upcomingDeliverables = deliverables
    .filter((item) => item.dueDate)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-border/80 bg-card/90 p-6 shadow-editorial backdrop-blur">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Project Dashboard</p>
        <ProjectSummaryEditor
          title={timeline.project.title}
          description={timeline.project.description}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="outline">{timeline.tasks.length} tasks</Badge>
          <Badge variant="outline">{doneCount} done</Badge>
          <Badge>{timeline.currentPhase?.name ?? "No active phase"}</Badge>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Phase Progress</CardTitle>
            <CardDescription>Sequential thesis phases preloaded from your plan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {timeline.phases.map((phase) => {
              const phaseTasks = timeline.tasks.filter((task) => task.phaseId === phase.id);
              const phaseDone = phaseTasks.filter((task) => task.statusColumn === "done").length;
              const percentage = phaseTasks.length === 0 ? 0 : Math.round((phaseDone / phaseTasks.length) * 100);

              return (
                <div key={phase.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{phase.name}</span>
                    <span className="text-muted-foreground">{percentage}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deliverables</CardTitle>
            <CardDescription>Nearest due dates from your deliverable plan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingDeliverables.length === 0 ? (
              <p className="text-sm text-muted-foreground">No due dates set.</p>
            ) : (
              upcomingDeliverables.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                  <span className="font-medium">{item.title}</span>
                  <span className="text-muted-foreground">{item.dueDate}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
