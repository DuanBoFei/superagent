"use client";

import { useCallback, useRef, useState } from "react";

export interface TitleEditProps {
  initialTitle: string;
  onSave?: (title: string) => void;
  onCancel?: () => void;
}

function buildDefaultTitle(title: string): string {
  const trimmed = title.trim();
  return trimmed.length === 0 ? "Untitled Session" : trimmed;
}

export function TitleEdit({ initialTitle, onSave, onCancel }: TitleEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  const enterEditMode = useCallback(() => {
    setIsEditing(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, []);

  const exitEditMode = useCallback(() => {
    setIsEditing(false);
  }, []);

  const commitTitle = useCallback(
    (newTitle: string) => {
      const resolved = buildDefaultTitle(newTitle.trim());
      if (resolved === buildDefaultTitle(currentTitle)) {
        exitEditMode();
        return;
      }
      setCurrentTitle(resolved);
      onSave?.(resolved);
      exitEditMode();
    },
    [currentTitle, onSave, exitEditMode],
  );

  const revertTitle = useCallback(() => {
    onCancel?.();
    exitEditMode();
  }, [onCancel, exitEditMode]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitTitle(e.currentTarget.value);
      } else if (e.key === "Escape") {
        e.preventDefault();
        revertTitle();
      }
    },
    [commitTitle, revertTitle],
  );

  const handleDisplayKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        enterEditMode();
      }
    },
    [enterEditMode],
  );

  const displayTitle = buildDefaultTitle(currentTitle);

  return (
    <span className="title-edit inline-flex items-center gap-1 group">
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          className="title-edit-input w-full bg-zinc-950 border border-emerald-500/50 rounded px-1.5 py-0.5 text-[14px] font-medium text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none"
          defaultValue={displayTitle}
          onKeyDown={handleInputKeyDown}
          onBlur={(e) => commitTitle(e.currentTarget.value)}
          aria-label="Edit session title"
        />
      ) : (
        <span
          className="title-edit-display text-[14px] font-medium text-zinc-200 cursor-pointer hover:text-zinc-100 transition-colors border-b border-dotted border-transparent hover:border-emerald-500/50"
          role="button"
          tabIndex={0}
          title="Click to edit title"
          onClick={enterEditMode}
          onKeyDown={handleDisplayKeyDown}
        >
          {displayTitle}
        </span>
      )}
    </span>
  );
}
