# Clarify: CLI Stability on Windows

**Feature**: `017-cli-stability-windows`  
**Created**: 2026-06-16  
**Status**: Draft

## Technical Clarifications

| ID | Question | Why it matters | Decision / Default |
|----|----------|----------------|--------------------|
| Q-017-01 | Which terminals must work for MVP? | Windows terminal behavior differs across hosts. | Support VS Code integrated terminal and PowerShell on Windows 11. Git Bash support is best-effort. |
| Q-017-02 | Is one-shot `--prompt` enough? | One-shot is a workaround, not REPL parity. | Keep `--prompt`, but interactive REPL must accept input without flicker. |
| Q-017-03 | Which failure is in scope? | The observed issue is input flicker and inability to type. | Focus on render/input loop stability; do not redesign the full TUI. |
| Q-017-04 | Should Windows use a simpler renderer? | Ink/TUI behavior may differ under Windows PTY. | Add a Windows-safe input/render path only if needed by tests/manual smoke. |
| Q-017-05 | Should terminal detection be automatic or config-driven? | Wrong mode selection can break Unix terminals. | Auto-detect Windows terminal host; allow explicit override via env/config only if needed. |
| Q-017-06 | What counts as success? | Typecheck/tests cannot prove terminal usability. | Manual smoke must prove typing `hello`, submitting, and exiting works in VS Code terminal and PowerShell. |
| Q-017-07 | Should output streaming remain real-time? | Buffering avoids flicker but harms UX. | Preserve streaming text; reduce only unnecessary re-renders around input. |
| Q-017-08 | Can this feature change model/runtime behavior? | CLI fixes should not alter agent semantics. | No runtime/model changes except CLI entry/input handling. |

## Scope Boundaries

- In scope: Windows terminal input, render throttling if needed, REPL smoke path, `--prompt` preservation.
- Out of scope: new GUI, Desktop app, VS Code extension, or cross-platform terminal emulator support matrix.
- Out of scope: fixing model tool-calling behavior.

## Rework Risks If Not Clarified

1. Treating `--prompt` as the only fix would leave the interactive product broken.
2. Changing runtime loop to fix UI could regress one-shot and tests.
3. A Windows-specific workaround could accidentally degrade macOS/Linux behavior.
4. Automated tests alone could falsely declare the terminal fixed.
