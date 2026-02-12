"use client";

import { useEffect, useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "thesis-theme";
type ThemePreference = "light" | "dark" | "system";

function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference !== "system") {
    return preference;
  }

  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  const resolved = resolveTheme(preference);
  root.classList.toggle("dark", resolved === "dark");
  root.dataset.themePreference = preference;
}

export function ThemeToggle({ className }: { className?: string }) {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const nextPreference: ThemePreference =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";

    setPreference(nextPreference);
    applyTheme(nextPreference);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((document.documentElement.dataset.themePreference ?? "system") === "system") {
        applyTheme("system");
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const nextLabel = useMemo(() => {
    if (preference === "system") return "Switch to dark mode";
    if (preference === "dark") return "Switch to light mode";
    return "Use system theme";
  }, [preference]);

  function cyclePreference() {
    const nextPreference: ThemePreference =
      preference === "system" ? "dark" : preference === "dark" ? "light" : "system";
    setPreference(nextPreference);
    localStorage.setItem(STORAGE_KEY, nextPreference);
    applyTheme(nextPreference);
  }

  const resolved = resolveTheme(preference);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={cyclePreference}
      aria-label={nextLabel}
      title={nextLabel}
      className={cn("gap-1.5", className)}
    >
      {resolved === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <span className="text-xs uppercase tracking-[0.12em]">
        {preference === "system" ? "Auto" : preference}
      </span>
    </Button>
  );
}
