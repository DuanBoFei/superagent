"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Header } from "./layout/header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] border-r border-border bg-panel
          transform transition-transform duration-200 ease-in-out
          lg:static lg:z-auto lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-sm font-medium text-foreground">Sessions</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              &times;
            </Button>
          </div>
          <div className="flex-1 px-3 py-2">
            <p className="text-xs text-muted">Session history coming in Phase 3</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header: desktop token+cost, mobile hamburger */}
        <div className="hidden lg:block">
          <Header />
        </div>
        <div className="flex items-center gap-3 border-b border-border px-4 py-2 lg:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </Button>
          <span className="text-sm font-medium">SuperAgent Web</span>
        </div>

        {children}
      </div>
    </div>
  );
}
