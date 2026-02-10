import { redirect } from "next/navigation";
import { getBoardData } from "@/lib/domain/service";
import { getUserOrNull } from "@/lib/auth/session";
import { BoardClient } from "@/app/(protected)/app/components/board-client";

export default async function BoardPage() {
  const user = await getUserOrNull();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const board = await getBoardData(user.id);

  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-border bg-card/90 p-5 shadow-editorial backdrop-blur">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Kanban Board</p>
        <h2 className="font-[var(--font-display)] text-2xl text-foreground">Task Flow</h2>
      </header>
      <BoardClient initialData={board} />
    </div>
  );
}
