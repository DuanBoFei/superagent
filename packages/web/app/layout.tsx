import type { Metadata } from "next";
import { AppShell } from "../src/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "SuperAgent Web",
  description: "Model-free, MIT-licensed CLI coding agent — Web UI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
