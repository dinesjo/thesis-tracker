import { redirect } from "next/navigation";
import { getBoardData, listDeliverablesForUser } from "@/lib/domain/service";
import { getUserOrNull } from "@/lib/auth/session";
import { DeliverablesClient } from "@/app/(protected)/app/components/deliverables-client";

export default async function DeliverablesPage() {
  const user = await getUserOrNull();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const [deliverables, board] = await Promise.all([
    listDeliverablesForUser(user.id),
    getBoardData(user.id),
  ]);

  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-border bg-card/90 p-5 shadow-editorial backdrop-blur">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Deliverables</p>
        <h2 className="font-[var(--font-display)] text-2xl text-foreground">Milestones and Linked Tasks</h2>
      </header>
      <DeliverablesClient
        deliverables={deliverables}
        tasks={board.tasks}
        phases={board.phases}
      />
    </div>
  );
}
