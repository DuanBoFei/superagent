# SuperAgent Release Readiness

## Local Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure API key

Create a local settings file at `.superagent/settings.json`:

```json
{
  "provider": {
    "baseUrl": "https://api.deepseek.com",
    "apiKey": "<your-deepseek-api-key>"
  },
  "model": "deepseek-v4-pro"
}
```

Or set the environment variable:

```bash
export DEEPSEEK_API_KEY="<your-deepseek-api-key>"
```

> **WARNING**: Never commit `.env`, `.superagent/settings.json`, or any file containing real credentials. These paths are gitignored.

### 3. Run one-shot smoke

```bash
pnpm start -- --prompt "hello"
```

Expected: Prints `SuperAgent · <model>`, responds with text, exits cleanly.

### 4. Browser tool (Optional)

The browser tool requires Playwright. Install browsers:

```bash
npx playwright install chromium
```

Verify availability:

```bash
npx playwright --version
```

Without Playwright browsers installed, the browser tool is disabled and does not affect core functionality.

---

## Release Gate

Run these commands in order. All must pass before tagging.

### Gate 1: Typecheck

```bash
pnpm typecheck
```

### Gate 2: Core tests

```bash
pnpm test -- tests/models tests/runtime tests/cli
```

### Gate 3: Stream-handler compatibility

```bash
pnpm test -- tests/runtime/stream-handler.test.ts
```

### Gate 4: Full test suite

```bash
pnpm test
```

### Gate 5: One-shot smoke

```bash
pnpm start -- --prompt "hello"
```

### Gate 6: File analysis smoke

```bash
pnpm start -- --prompt "分析一下 src/runtime/runtime.ts 的 createRuntime 做了什么"
```

Expected: Agent reads the file using the Read tool, produces a structured analysis of `createRuntime`.

---

## Release Decision Checklist

| # | Gate | Pass? |
|---|------|-------|
| 1 | `pnpm typecheck` | [ ] |
| 2 | Core tests (models/runtime/cli) | [ ] |
| 3 | Stream-handler compatibility | [ ] |
| 4 | Full test suite | [ ] |
| 5 | One-shot smoke `hello` | [ ] |
| 6 | File analysis smoke | [ ] |

**All gates pass?** → Proceed to tag.

### Tag Naming

Tags follow the convention: `v0.1.0-<feature-id>-<feature-name>`

```bash
# DO NOT execute without explicit approval
git tag v0.1.0-018-release-readiness
git push origin v0.1.0-018-release-readiness
```

---

## Known Limitations

### Pre-existing test failures

The following tests have known failures unrelated to recent features:

- MCP subprocess tests (Windows)
- Flaky timing-based tests
- Subprocess smoke tests

Total: 4 pre-existing failures in full suite (694 pass).

### Interactive REPL

Interactive mode on Windows requires the terminal to support ANSI escape codes. VS Code integrated terminal and Windows Terminal are supported. Legacy `cmd.exe` may not render correctly.

### Streaming output

Streaming output may appear in larger chunks on Windows due to Node.js stream buffering. This is a known limitation of the runtime layer, not the CLI.

### Browser tool

Browser tool requires Playwright and Chromium. Feature is opt-in and does not block core functionality.

---

## Closeout

After release verification completes, create:

- `specs/018-release-readiness/state.md` — final verification results
- `specs/018-release-readiness/session.md` — session notes and closeout summary
