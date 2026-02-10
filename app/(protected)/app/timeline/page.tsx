import { redirect } from "next/navigation";
import { getTimelineData } from "@/lib/domain/service";
import { getUserOrNull } from "@/lib/auth/session";
import { TimelineClient } from "@/app/(protected)/app/components/timeline-client";

export default async function TimelinePage() {
  const user = await getUserOrNull();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const timeline = await getTimelineData(user.id);

  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-border/80 bg-card/90 p-5 shadow-editorial backdrop-blur">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Timeline</p>
        <h2 className="font-[var(--font-display)] text-2xl text-foreground">Phase + Task Schedule</h2>
      </header>
      <TimelineClient data={timeline} />
    </div>
  );
}
