import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "KTH Thesis Tracker",
  description: "Kanban + timeline + deliverables tracker for a master thesis project.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                const root = document.documentElement;
                const STORAGE_KEY = "thesis-theme";
                const media = window.matchMedia("(prefers-color-scheme: dark)");
                const apply = (preference) => {
                  const mode = preference === "system"
                    ? (media.matches ? "dark" : "light")
                    : preference;
                  root.classList.toggle("dark", mode === "dark");
                  root.dataset.themePreference = preference;
                };
                const stored = localStorage.getItem(STORAGE_KEY);
                const preference =
                  stored === "light" || stored === "dark" || stored === "system"
                    ? stored
                    : "system";
                apply(preference);
                media.addEventListener?.("change", () => {
                  if ((root.dataset.themePreference ?? "system") === "system") {
                    apply("system");
                  }
                });
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen font-[var(--font-body)] antialiased">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
