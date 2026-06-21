import React, { useState } from "react";
import type { TerminalLine } from "../../../types/terminal";
import { TerminalFromLines } from "./TerminalRenderer";

export interface AlternateScreenBannerProps {
  savedLines: TerminalLine[];
  defaultExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
}

export function AlternateScreenBanner({
  savedLines,
  defaultExpanded = false,
  onToggle,
}: AlternateScreenBannerProps) {
  const [collapsed, setCollapsed] = useState(!defaultExpanded);

  if (savedLines.length === 0) return null;

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    onToggle?.(!next);
  };

  return (
    <div
      className="alternate-screen-banner bg-neutral-800/60 rounded border border-neutral-700 mt-2"
      role="region"
      aria-label="Saved full-screen output"
      data-collapsed={collapsed ? "true" : "false"}
    >
      <button
        type="button"
        className="alternate-screen-toggle flex items-center gap-2 w-full px-3 py-2 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50 rounded-t transition-colors"
        onClick={toggle}
        aria-expanded={!collapsed}
      >
        <span className={`alternate-screen-chevron inline-block transition-transform ${collapsed ? "" : "rotate-90"}`}>
          &#9654;
        </span>
        <span>Full-screen application output</span>
        <span className="text-neutral-500">({savedLines.length} lines)</span>
        <span className="ml-auto text-neutral-500 text-[11px]">Show full-screen output</span>
      </button>
      {!collapsed && (
        <div className="alternate-screen-content px-3 pb-3">
          <TerminalFromLines lines={savedLines} maxLines={500} fontSize={12} />
        </div>
      )}
    </div>
  );
}
