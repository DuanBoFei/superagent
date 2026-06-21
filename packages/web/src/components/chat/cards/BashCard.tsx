import React, { useState } from "react";
import type { BashCard as BashCardType } from "../../../types/cards";
import { ToolCard } from "./ToolCard";
import { TerminalRenderer } from "../terminal/TerminalRenderer";

const AUTO_COLLAPSE_LINES = 50;

interface BashCardProps {
  card: BashCardType;
  onToggle?: (cardId: string) => void;
  onCopy?: (cardId: string) => void;
}

export function BashCard({ card, onToggle, onCopy }: BashCardProps) {
  const { command, args, output, exitCode, durationMs } = card.content;
  const fullCommand = [command, ...args].join(" ");
  const totalLines = output.split("\n").length;
  const isLong = totalLines > AUTO_COLLAPSE_LINES;
  const [expanded, setExpanded] = useState(false);

  return (
    <ToolCard card={card} onToggle={onToggle} onCopy={onCopy}>
      <div className="bash-card flex flex-col gap-1">
        <div className="bash-command font-mono text-xs text-neutral-400 bg-neutral-900 rounded px-2 py-1">
          <span className="text-emerald-400">$</span> {fullCommand}
        </div>
        <div className={isLong && !expanded ? "bash-collapsible" : ""}>
          <TerminalRenderer
            content={output}
            maxLines={isLong && !expanded ? 10 : 10000}
            enableBlink={false}
          />
        </div>
        {isLong && (
          <button
            type="button"
            className="bash-expand-btn text-xs text-blue-400 hover:text-blue-300 mt-1"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "Collapse" : `Show all ${totalLines} lines`}
          </button>
        )}
        <div className="bash-meta flex items-center gap-3 text-[11px] text-neutral-500 mt-1">
          <ExitCodeBadge code={exitCode} />
          <DurationLabel ms={durationMs} />
        </div>
      </div>
    </ToolCard>
  );
}

function ExitCodeBadge({ code }: { code: number | null }) {
  if (code === null) {
    return <span className="bash-exit-code exit-pending">Exit: --</span>;
  }
  return (
    <span className={`bash-exit-code ${code === 0 ? "text-emerald-400" : "text-red-400"}`}>
      Exit: {code}
    </span>
  );
}

function DurationLabel({ ms }: { ms: number | null }) {
  if (ms === null) {
    return <span className="bash-duration duration-pending">--</span>;
  }
  const seconds = ms / 1000;
  const formatted = seconds >= 1 ? `${seconds.toFixed(1)}s` : `${ms}ms`;
  return <span className="bash-duration duration-value">{formatted}</span>;
}
