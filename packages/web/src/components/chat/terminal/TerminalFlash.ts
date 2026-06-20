// Bell flash visual feedback with cooldown.
// BEL character (\x07) triggers a brief white flash overlay.
// Consecutive BELs within 1 second are suppressed.

const BELL_COOLDOWN_MS = 1000;
let lastBellTime = 0;

export function renderTerminalFlash(): string {
  const now = Date.now();
  if (now - lastBellTime < BELL_COOLDOWN_MS) {
    return "";
  }
  lastBellTime = now;
  return `<span class="terminal-bell-flash" aria-label="bell"></span>`;
}

export function resetBellCooldown(): void {
  lastBellTime = 0;
}

// CSS styles for the bell flash animation.
// Respects prefers-reduced-motion — disables animation when set.
export function renderBellStyles(): string {
  return `<style>
.terminal-bell-flash {
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.08);
  pointer-events: none;
  animation: bell-flash 100ms ease-out;
}
@keyframes bell-flash {
  from { opacity: 1; }
  to { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .terminal-bell-flash {
    animation: none;
    background: transparent;
  }
}
</style>`;
}
