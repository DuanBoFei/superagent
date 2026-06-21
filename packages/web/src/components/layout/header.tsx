"use client";

import { useChatStore } from "../../store/chat";
import { computeCost } from "../../lib/model-pricing";

function formatTokens(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}k`;
  }
  return String(count);
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

const DEFAULT_MODEL = "claude-sonnet-4-6";

export function Header() {
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const sessionStats = useChatStore((s) => s.sessionStats);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const connectionStatus = useChatStore((s) => s.connectionStatus);

  const stats = activeSessionId ? (sessionStats[activeSessionId] ?? null) : null;
  const totalInput = stats?.totalInputTokens ?? 0;
  const totalOutput = stats?.totalOutputTokens ?? 0;
  const estimated = stats?.estimatedOutputTokens ?? 0;
  const effectiveOutput = totalOutput + estimated;
  const cost = computeCost(DEFAULT_MODEL, totalInput, effectiveOutput);
  const hasData = stats !== null;

  const statusLabel =
    connectionStatus === "connected" ? "Connected"
    : connectionStatus === "connecting" ? "Connecting..."
    : "Disconnected";

  const statusColor =
    connectionStatus === "connected" ? "bg-green-500"
    : connectionStatus === "connecting" ? "bg-yellow-500"
    : "bg-red-500";

  return (
    <div className="flex items-center justify-between border-b border-border bg-panel px-4 py-2 text-sm">
      <div className="flex items-center gap-4">
        {hasData ? (
          <>
            <span className="text-muted">
              Input: <span className="text-foreground font-mono">{formatTokens(totalInput)}</span>
            </span>
            <span className="text-muted">
              Output:{" "}
              <span className={`text-foreground font-mono ${isStreaming ? "italic" : ""}`}>
                {formatTokens(effectiveOutput)}
                {isStreaming ? " (estimating...)" : ""}
              </span>
            </span>
            <span className="text-muted">
              Cost: <span className="text-foreground font-mono">{formatCost(cost)}</span>
            </span>
          </>
        ) : (
          <span className="text-muted">--</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${statusColor}`} />
        <span className="text-xs text-muted">{statusLabel}</span>
      </div>
    </div>
  );
}
