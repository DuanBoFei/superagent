import type { DiffViewMode } from "../../../types/diff";

interface DiffViewModeToggleProps {
  currentMode: DiffViewMode;
  onSetMode: (mode: DiffViewMode) => void;
}

function ModeButton({ mode, label, icon, active, onSetMode }: {
  mode: DiffViewMode;
  label: string;
  icon: string;
  active: boolean;
  onSetMode: (mode: DiffViewMode) => void;
}) {
  return (
    <button
      type="button"
      className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${
        active
          ? "bg-emerald-950/30 border-emerald-500/50 text-emerald-300"
          : "bg-neutral-900 border-neutral-700 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
      }`}
      onClick={() => onSetMode(mode)}
      title={`${label} view`}
    >
      <span className="mr-1">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export function DiffViewModeToggle({ currentMode, onSetMode }: DiffViewModeToggleProps) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Diff view mode">
      <ModeButton mode="unified" label="Unified" icon="⊟" active={currentMode === "unified"} onSetMode={onSetMode} />
      <ModeButton mode="split" label="Split" icon="⊞" active={currentMode === "split"} onSetMode={onSetMode} />
    </div>
  );
}
