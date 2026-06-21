import React, { useEffect, useRef, useState } from "react";

const BELL_COOLDOWN_MS = 1000;

export interface BellFlashProps {
  trigger: number;
}

export function BellFlash({ trigger }: BellFlashProps) {
  const [visible, setVisible] = useState(false);
  const lastBellRef = useRef(0);

  useEffect(() => {
    if (trigger === 0) return;
    const now = Date.now();
    if (now - lastBellRef.current < BELL_COOLDOWN_MS) return;
    lastBellRef.current = now;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 100);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (!visible) return null;
  return <span className="terminal-bell-flash" aria-label="bell" />;
}
