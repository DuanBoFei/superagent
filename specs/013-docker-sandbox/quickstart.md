# Quickstart: Docker Sandbox

## Goal

Verify that a user can enable local Docker sandbox execution, run approved commands inside a container, preserve existing permission behavior, and continue working when Docker is unavailable or a command times out.

## Scenario 1: Run command in sandbox

1. Ensure Docker is running and the configured image is available locally.
2. Add project sandbox config with `enabled: true`, `type: "docker"`, image, workspace mount, and network disabled.
3. Start a SuperAgent session in the project.
4. Ask the Agent to run an approved command such as `pwd` or `node --version`.
5. Confirm the command runs inside the configured container workdir.
6. Confirm stdout/stderr/exitCode are returned in the normal Bash result shape.

## Scenario 2: Permission still gates execution

1. Enable Docker sandbox mode.
2. Configure deny for a dangerous Bash pattern.
3. Ask the Agent to run a matching command.
4. Confirm no Docker container starts.
5. Confirm the user sees the same deny/ask behavior as non-sandboxed Bash.

## Scenario 3: Workspace mount

1. Create a test file in the project workspace.
2. Run a sandboxed command that lists or reads the file under `/workspace`.
3. Confirm the file is visible at the configured mount path.
4. Confirm arbitrary host paths are not mounted by default.

## Scenario 4: Docker unavailable

1. Enable sandbox mode while Docker is unavailable or mock Docker unavailable in tests.
2. Ask the Agent to run a sandboxed command.
3. Confirm SuperAgent returns a safe setup error.
4. Confirm the Agent session continues and non-sandboxed read/search tools remain usable.

## Scenario 5: Timeout and redaction

1. Configure a short sandbox timeout.
2. Run a command that sleeps longer than the timeout and prints a fake secret-like value.
3. Confirm SuperAgent terminates the sandbox execution.
4. Confirm result includes `timedOut: true`.
5. Confirm logs and terminal diagnostics redact the secret-like value.
