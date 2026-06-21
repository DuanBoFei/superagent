import React, { useState } from "react";

export interface ErrorCardContent {
  errorType: string;
  message: string;
  stackTrace?: string;
}

export interface ErrorCardState {
  id: string;
  status: "error";
  timestamp: number;
  title: string;
  isExpanded: boolean;
  content: ErrorCardContent;
}

interface ErrorCardProps {
  card: ErrorCardState;
  onCopy?: (cardId: string) => void;
}

export function ErrorCard({ card, onCopy }: ErrorCardProps) {
  const { errorType, message, stackTrace } = card.content;
  const [showStack, setShowStack] = useState(false);
  const hasStack = stackTrace && stackTrace.length > 0;

  return (
    <div className="error-card flex flex-col gap-1 border-l-2 border-red-600 pl-3 py-1">
      <div className="error-header flex items-center gap-2">
        <span className="error-icon text-red-500 text-sm">&#10060;</span>
        <span className="error-type font-mono text-xs font-medium text-red-400">{errorType}</span>
      </div>
      <div className="error-message text-sm text-red-200">{message}</div>
      {hasStack && (
        <button
          type="button"
          className="error-toggle-btn text-[11px] text-red-400 hover:text-red-300 mt-1 text-left"
          onClick={() => setShowStack((s) => !s)}
        >
          {showStack ? "Hide" : "Show"} stack trace
        </button>
      )}
      {hasStack && showStack && (
        <pre className="error-stack font-mono text-xs text-red-300/80 bg-red-950/30 rounded border border-red-900/40 mt-2 px-3 py-2 overflow-x-auto max-h-60 overflow-y-auto">
          {stackTrace}
        </pre>
      )}
      <button
        type="button"
        className="error-copy-btn text-[11px] text-neutral-500 hover:text-neutral-300 mt-1 text-left"
        onClick={() => onCopy?.(card.id)}
      >
        Copy error details
      </button>
    </div>
  );
}
