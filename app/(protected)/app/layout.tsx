import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut as authSignOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MobileTopNav, SidebarNav } from "@/app/(protected)/app/components/sidebar-nav";
import { getUserOrNull } from "@/lib/auth/session";
import { bootstrapWorkspace } from "@/lib/domain/service";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserOrNull();
  if (!user) {
    redirect("/auth/sign-in");
  }

  await bootstrapWorkspace(user.id, user.username);

  async function signOut() {
    "use server";
    await authSignOut({ redirectTo: "/auth/sign-in" });
  }

  return (
    <div className="editorial-grid min-h-screen">
      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden self-start rounded-xl border border-border bg-sidebar p-4 shadow-editorial lg:sticky lg:top-6 lg:block">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">KTH Master Thesis</p>
            <h1 className="mt-2 font-[var(--font-display)] text-xl font-semibold leading-tight text-foreground">
              Thesis Tracker
            </h1>
          </div>

          <SidebarNav />

          <div className="mt-8">
            <ThemeToggle className="w-full justify-start" />
          </div>

          <form action={signOut} className="mt-3">
            <Button type="submit" variant="outline" className="w-full justify-start gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </form>
        </aside>

        <main className="min-w-0 space-y-4">
          <div className="space-y-3 rounded-xl border border-border bg-card/90 p-4 shadow-editorial backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">KTH Master Thesis</p>
                <h1 className="font-[var(--font-display)] text-xl text-foreground">Thesis Tracker</h1>
              </div>
              <ThemeToggle />
            </div>
            <MobileTopNav />
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm" className="w-full justify-center gap-2">
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </form>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
