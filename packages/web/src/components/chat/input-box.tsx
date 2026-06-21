"use client";

import { useCallback, useRef } from "react";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { useChatStore } from "../../store/chat";

export function InputBox({ onSend }: { onSend: (content: string) => void }) {
  const input = useChatStore((s) => s.input);
  const setInput = useChatStore((s) => s.setInput);
  const clearInput = useChatStore((s) => s.clearInput);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const connectionStatus = useChatStore((s) => s.connectionStatus);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDisabled = isStreaming || connectionStatus !== "connected";

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isDisabled) return;
    onSend(trimmed);
    clearInput();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, isDisabled, onSend, clearInput]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      const el = e.target;
      el.style.height = "auto";
      const maxH = window.innerHeight * 0.3;
      el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
    },
    [setInput],
  );

  return (
    <div className="flex items-end gap-2 border-t border-border bg-panel p-3">
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Ask SuperAgent..."
        disabled={isDisabled}
        rows={1}
        className="min-h-[40px] max-h-[30vh] resize-none bg-[#050505] text-sm font-mono border-border
          focus-visible:ring-emerald-500"
      />
      <Button
        onClick={handleSend}
        disabled={isDisabled || !input.trim()}
        className="bg-emerald-500 text-white hover:bg-emerald-600 shrink-0 h-10 px-4"
      >
        Send
      </Button>
    </div>
  );
}
