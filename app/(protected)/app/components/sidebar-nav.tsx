"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import type { ComponentType } from "react";
import { CalendarRange, ClipboardList, KanbanSquare, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems: Array<{
  href: Route;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { href: "/app", label: "Overview", icon: LayoutDashboard },
  { href: "/app/board", label: "Kanban", icon: KanbanSquare },
  { href: "/app/timeline", label: "Timeline", icon: CalendarRange },
  { href: "/app/deliverables", label: "Deliverables", icon: ClipboardList },
];

function isItemActive(pathname: string, href: Route) {
  if (href === "/app") {
    return pathname === "/app";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1.5">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isItemActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition",
              active
                ? "border-primary/35 bg-primary/12 text-foreground shadow-sm"
                : "border-transparent text-muted-foreground hover:border-border/80 hover:bg-muted/70 hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "absolute left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full transition",
                active ? "bg-primary/85" : "bg-transparent group-hover:bg-border",
              )}
            />
            <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
            <span className={cn("tracking-[0.01em]", active ? "font-semibold" : "font-medium")}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
