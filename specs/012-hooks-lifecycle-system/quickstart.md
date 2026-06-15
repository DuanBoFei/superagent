# Quickstart: Hooks Lifecycle System

## Goal

Verify that a user can configure lifecycle hooks, observe hooks running at expected points, block unsafe prompts/tool calls, and continue working when a hook fails.

## Scenario 1: SessionStart command hook

1. Add a project hook under `hooks.SessionStart` named `announce-session`.
2. Use a local command that reads JSON from stdin and writes `{ "decision": "continue" }` to stdout.
3. Start a SuperAgent session in the project.
4. Confirm the hook ran once with session metadata.
5. Confirm observability logs include hook start/end with duration and success.

## Scenario 2: UserPromptSubmit blocks prompt

1. Configure a `UserPromptSubmit` hook with `blocking: true`.
2. Make the hook return `{ "decision": "block", "message": "Prompt blocked by project policy" }` for prompts containing `deploy`.
3. Submit a prompt containing `deploy`.
4. Confirm SuperAgent shows the safe hook message.
5. Confirm no model request is emitted for that prompt.

## Scenario 3: PreToolUse blocks Bash command

1. Configure a `PreToolUse` hook with matcher `{ "tool": "Bash", "inputPattern": "git push" }` and `blocking: true`.
2. Ask the Agent to run a Bash command containing `git push`.
3. Confirm the hook receives tool name and input summary.
4. Confirm the Bash command is not executed.
5. Confirm the Agent receives a blocked tool result.

## Scenario 4: PostToolUse observe-only audit

1. Configure a `PostToolUse` hook that logs tool metadata.
2. Ask the Agent to use a safe built-in tool such as Read.
3. Confirm the hook receives tool name, duration, and success summary.
4. Confirm the original tool result is unchanged even if the hook outputs `block`.

## Scenario 5: Hook failure isolation and redaction

1. Configure one hook that exits non-zero and prints a fake secret-like value to stderr.
2. Trigger the hook's lifecycle event.
3. Confirm SuperAgent records hook failure without crashing the session.
4. Confirm logs and terminal output redact the secret-like value.
5. Confirm later hooks/sessions remain usable.
