# Quickstart: Playwright Browser Tool

## Goal

Verify that a user can enable browser tooling, inspect a page, perform approved interactions, preserve permissions, and continue working when browser setup or actions fail.

## Scenario 1: Inspect a local page

1. Enable browser tools in project config.
2. Start a SuperAgent session in a project with a local dev server running.
3. Ask the Agent to open the local page URL.
4. Confirm the Agent returns final URL, title, visible text summary, and screenshot artifact metadata.
5. Confirm artifacts are stored locally under the configured artifact directory.

## Scenario 2: Permission gates browser action

1. Enable browser tools.
2. Configure a deny or ask rule for a browser click or type action.
3. Ask the Agent to perform a matching browser action.
4. Confirm denied actions do not reach the Playwright adapter.
5. Confirm approved actions execute and return normalized browser results.

## Scenario 3: Interact with a form

1. Open a local test page containing a form.
2. Ask the Agent to type test values and submit the form.
3. Confirm the result includes the updated page state and a redacted action trace.
4. Confirm secret-like typed values do not appear in logs or summaries.

## Scenario 4: Browser unavailable

1. Enable browser tools in a test environment where Playwright browser executable is unavailable, or mock unavailability.
2. Ask the Agent to open a page.
3. Confirm SuperAgent returns a safe setup error.
4. Confirm the Agent session continues and non-browser tools remain usable.

## Scenario 5: Timeout and large page output

1. Configure a short browser action timeout.
2. Open a page that hangs or produces very large visible text.
3. Confirm timeout returns `timedOut: true` when exceeded.
4. Confirm large visible text is truncated before context/log injection.
5. Confirm browser lifecycle events remain redacted.
