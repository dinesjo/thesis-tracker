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
                const media = window.matchMedia("(prefers-color-scheme: dark)");
                const apply = () => root.classList.toggle("dark", media.matches);
                apply();
                media.addEventListener?.("change", apply);
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
