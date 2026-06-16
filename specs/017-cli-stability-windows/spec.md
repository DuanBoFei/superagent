# Feature Specification: CLI Stability on Windows

**Feature Branch**: `017-cli-stability-windows`  
**Created**: 2026-06-16  
**Status**: Draft  
**Input**: Fix Windows interactive REPL flicker/input failure while preserving one-shot `--prompt` mode.

## User Scenarios & Testing

### User Story 1 - Interactive REPL accepts input on Windows (Priority: P0)

As a Windows user running SuperAgent in VS Code terminal or PowerShell, I can type a prompt, submit it, and see the agent respond without the input area flickering or rejecting keystrokes.

**Why this priority**: The CLI product is not usable interactively if users cannot type.

**Independent Test**: Manual smoke in Windows VS Code terminal and PowerShell: start app, type `hello`, submit, observe response, exit cleanly.

**Acceptance Scenarios**:

1. **Given** SuperAgent is launched in VS Code integrated terminal on Windows, **When** I type `hello`, **Then** characters remain visible and can be submitted.
2. **Given** SuperAgent is launched in PowerShell on Windows, **When** I type `hello`, **Then** the input line does not flicker uncontrollably and submission works.
3. **Given** the agent streams output, **When** text arrives, **Then** the input area remains stable after the response completes.

---

### User Story 2 - One-shot mode remains reliable (Priority: P0)

As a user, I can keep using `pnpm start -- --prompt "..."` for deterministic smoke tests and automation.

**Why this priority**: One-shot mode is the current workaround and a useful test harness.

**Independent Test**: Run one-shot prompt and verify the process prints output then exits with code 0.

**Acceptance Scenarios**:

1. **Given** a prompt is passed with `--prompt`, **When** SuperAgent starts, **Then** it executes one turn and exits without entering REPL.
2. **Given** `--prompt` is empty, **When** SuperAgent starts, **Then** it exits with a clear error.

---

### User Story 3 - Non-Windows behavior does not regress (Priority: P1)

As a maintainer, I can fix Windows input without breaking the cross-platform CLI path.

**Why this priority**: The primary CLI target remains Unix-like terminals, and Windows fixes must be isolated.

**Independent Test**: Existing CLI argument tests and runtime tests pass unchanged.

**Acceptance Scenarios**:

1. **Given** the app runs in non-Windows mode, **When** REPL initializes, **Then** existing input/render behavior remains unchanged.
2. **Given** Windows-safe mode is enabled, **When** the UI renders, **Then** only terminal/input behavior changes, not runtime event semantics.

## Requirements

### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-CW-01 | SuperAgent MUST allow text entry in Windows VS Code integrated terminal. |
| FR-CW-02 | SuperAgent MUST allow text entry in Windows PowerShell. |
| FR-CW-03 | SuperAgent MUST preserve `--prompt` one-shot behavior. |
| FR-CW-04 | SuperAgent MUST exit one-shot mode after the turn completes. |
| FR-CW-05 | SuperAgent MUST show a clear error for empty `--prompt`. |
| FR-CW-06 | SuperAgent MUST avoid continuous input-area flicker during idle REPL input. |
| FR-CW-07 | SuperAgent MUST preserve streaming assistant text output. |
| FR-CW-08 | SuperAgent MUST isolate Windows-specific terminal handling from runtime/model logic. |
| FR-CW-09 | SuperAgent MUST provide a repeatable manual smoke checklist for Windows terminals. |
| FR-CW-10 | SuperAgent MUST keep existing CLI startup tests green. |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-CW-01 | Interactive input latency should feel immediate for normal typing. |
| NFR-CW-02 | Windows-specific code should be small and locally contained. |
| NFR-CW-03 | One-shot mode should remain suitable for CI/manual smoke commands. |
| NFR-CW-04 | No terminal fix may require changing user shell configuration. |

## Key Entities

| Entity | Description |
|--------|-------------|
| TerminalProfile | Detected terminal environment such as Windows PowerShell, VS Code terminal, or Unix-like. |
| InputRenderer | CLI input component/path responsible for stable text entry. |
| OneShotPrompt | Non-interactive CLI path that executes one turn and exits. |
| WindowsSmokeChecklist | Manual verification steps for terminal usability. |

## Success Criteria

- In Windows VS Code terminal, user can type and submit `hello` in interactive REPL.
- In Windows PowerShell, user can type and submit `hello` in interactive REPL.
- `pnpm start -- --prompt "hello"` prints a response and exits.
- Existing targeted CLI/runtime tests pass.
