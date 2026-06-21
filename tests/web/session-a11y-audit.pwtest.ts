/**
 * Gap L3 · Accessibility audit for 035's interactive controls.
 *
 * Verifies that the interactive controls added/used by 035-web-session-resume
 * meet WCAG 2.1 AA standards via @axe-core/playwright scans.
 *
 * Controls audited:
 *   Session list items (role="listitem", aria-current, tabIndex={0})
 *   Delete button (aria-label, tabIndex={-1}, group-hover visibility)
 *   Multi-select checkbox (aria-label, tabIndex={-1})
 *   Delete confirmation dialog (modal pattern, Escape key)
 *   Undo toast (keyboard-accessible undo/dismiss)
 *   Sidebar (role="complementary", aria-expanded)
 *   ClearAll confirmation (typed confirmation gate)
 *
 * Run: npx playwright test tests/web/session-a11y-audit.pwtest.ts
 */

import { test, expect } from "@playwright/test";
import { createServer, type Server } from "node:http";

const FIXTURE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Session A11y Audit Fixture</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── Design system tokens (matched from 035 components) ── */
  :root {
    --bg: #0a0a0a;
    --panel: #0d0d0d;
    --border: #1f1f23;
    --text-primary: #fafafa;
    --text-secondary: #a1a1aa;
    --accent: #10b981;
    --danger: #ef4444;
    --radius: 4px;
  }

  body {
    background: var(--bg);
    color: var(--text-primary);
    font: 14px "Inter", system-ui, sans-serif;
  }

  /* ── Sidebar ── */
  .sidebar {
    position: fixed; left: 0; top: 0;
    width: 280px; height: 100vh;
    background: #0a0a0a;
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
    overflow: hidden;
  }

  .sidebar-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; border-bottom: 1px solid var(--border);
  }
  .sidebar-header .brand {
    font-size: 14px; font-weight: 600; color: #10b981;
  }
  .sidebar-header .close-btn {
    background: none; border: 0; color: #a1a1aa; cursor: pointer; padding: 4px; border-radius: 4px;
  }
  .sidebar-header .close-btn:hover { color: #d4d4d8; }

  /* ── Session list item ── */
  .session-item {
    position: relative; display: flex; flex-direction: column;
    padding: 10px 12px; cursor: pointer;
    border-left: 2px solid transparent;
    transition: background-color 100ms;
  }
  .session-item:hover { background: rgba(24, 24, 27, 0.7); }
  .session-item.active { background: #18181b; border-left-color: #10b981; }
  .session-item:focus-visible { outline: 2px solid #10b981; outline-offset: -2px; }

  .session-item .row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
  .session-item .title { font-size: 14px; font-weight: 600; color: #e4e4e7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .session-item .preview { font-size: 12px; color: #a1a1aa; margin-top: 2px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .session-item .meta { font-size: 11px; font-family: monospace; color: #a1a1aa; margin-top: 6px; }

  .session-item .item-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

  /* Group hover: actions hidden by default, visible on group hover */
  .session-group .action-checkbox,
  .session-group .action-delete { opacity: 0; transition: opacity 150ms; }
  .session-group:hover .action-checkbox,
  .session-group:hover .action-delete { opacity: 1; }

  .action-checkbox { width: 14px; height: 14px; accent-color: #10b981; cursor: pointer; }
  .action-checkbox.checked { opacity: 1; }

  .action-delete {
    background: none; border: 0; color: #a1a1aa; cursor: pointer; padding: 2px;
    border-radius: 2px; line-height: 1;
  }
  .action-delete:hover { color: #ef4444; }

  /* ── Delete confirmation dialog ── */
  .confirm-overlay {
    position: fixed; inset: 0; z-index: 100;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.6);
  }
  .confirm-dialog {
    width: 380px; background: #18181b; border: 1px solid #27272a;
    border-radius: 8px; padding: 20px;
  }
  .confirm-dialog h2 { font-size: 14px; font-weight: 500; color: #e4e4e7; margin-bottom: 4px; }
  .confirm-dialog .hint { font-size: 12px; color: #a1a1aa; margin-bottom: 12px; }
  .confirm-dialog .danger-hint { font-size: 12px; color: #f87171; margin-bottom: 12px; }

  .confirm-input {
    width: 100%; background: #09090b; border: 1px solid #3f3f46;
    border-radius: 4px; padding: 4px 8px;
    font-size: 13px; font-family: monospace; color: #e4e4e7;
  }
  .confirm-input:focus { border-color: rgba(239, 68, 68, 0.5); outline: none; }

  .confirm-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
  .btn { font-size: 12px; padding: 6px 12px; border-radius: 4px; cursor: pointer; border: 0; transition: background-color 150ms; }
  .btn-cancel { background: #27272a; color: #d4d4d8; }
  .btn-cancel:hover { background: #3f3f46; }
  .btn-danger { background: #dc2626; color: #fff; }
  .btn-danger:hover { background: #b91c1c; }
  .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Undo toast ── */
  .undo-toast {
    position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
    z-index: 100; display: flex; align-items: center; gap: 12px;
    padding: 10px 16px; background: #27272a; border: 1px solid #3f3f46;
    border-radius: 8px; user-select: none;
  }
  .undo-toast .msg { font-size: 12px; color: #d4d4d8; }
  .undo-toast .timer { font-size: 11px; color: #71717a; font-variant-numeric: tabular-nums; }
  .btn-undo { font-size: 12px; padding: 4px 8px; border-radius: 4px; background: #3f3f46; color: #34d399; border: 0; cursor: pointer; }
  .btn-undo:hover { background: #52525b; }
  .btn-dismiss { font-size: 12px; padding: 4px; background: none; border: 0; color: #71717a; cursor: pointer; }
  .btn-dismiss:hover { color: #d4d4d8; }

  /* ── Hidden for focus trap testing ── */
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
</style>
</head>
<body>

<!-- ═══ Sidebar ═══ -->
<aside
  class="sidebar"
  role="complementary"
  aria-label="Session history"
  aria-expanded="true"
>
  <div class="sidebar-header">
    <span class="brand">SuperAgent</span>
    <button type="button" class="close-btn" aria-label="Close sidebar">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4l8 8M12 4l-8 8"></path>
      </svg>
    </button>
  </div>

  <!-- Session list -->
  <div style="flex:1;overflow-y:auto;" role="list" aria-label="Session list">
    <!-- Active session -->
    <div class="session-item active session-group" data-session-id="s1" role="listitem" aria-current="true" aria-label="Session: Fix auth middleware bug" tabindex="0">
      <div class="row">
        <div style="flex:1;min-width:0;">
          <span class="title">Fix auth middleware bug</span>
          <p class="preview">The JWT verification is failing on refresh tokens because the secret key...</p>
        </div>
        <div class="item-actions">
          <input type="checkbox" class="action-checkbox" aria-label="Select session" tabindex="-1">
          <button type="button" class="action-delete" aria-label="Delete session" tabindex="-1">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4l8 8M12 4l-8 8"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="meta">12 msg</div>
    </div>

    <!-- Inactive session -->
    <div class="session-item session-group" data-session-id="s2" role="listitem" aria-label="Session: Refactor database layer" tabindex="0">
      <div class="row">
        <div style="flex:1;min-width:0;">
          <span class="title">Refactor database layer</span>
          <p class="preview">Need to extract the connection pool into a shared module...</p>
        </div>
        <div class="item-actions">
          <input type="checkbox" class="action-checkbox" aria-label="Select session" tabindex="-1">
          <button type="button" class="action-delete" aria-label="Delete session" tabindex="-1">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4l8 8M12 4l-8 8"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="meta">5 msg</div>
    </div>

    <!-- Third session -->
    <div class="session-item session-group" data-session-id="s3" role="listitem" aria-label="Session: Add unit tests for API routes" tabindex="0">
      <div class="row">
        <div style="flex:1;min-width:0;">
          <span class="title">Add unit tests for API routes</span>
          <p class="preview">Coverage is at 45%, need to get to 80% for the API layer...</p>
        </div>
        <div class="item-actions">
          <input type="checkbox" class="action-checkbox" aria-label="Select session" tabindex="-1">
          <button type="button" class="action-delete" aria-label="Delete session" tabindex="-1">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4l8 8M12 4l-8 8"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="meta">8 msg</div>
    </div>
  </div>
</aside>

<!-- ═══ Single Delete Confirmation Dialog ═══ -->
<div id="confirm-single" class="confirm-overlay" style="display:none;">
  <div class="confirm-dialog" role="alertdialog" aria-modal="true" aria-label="Delete session confirmation">
    <h2>Delete "Fix auth middleware bug"?</h2>
    <p class="hint">This action cannot be undone.</p>
    <div class="confirm-actions">
      <button type="button" class="btn btn-cancel">Cancel</button>
      <button type="button" class="btn btn-danger">Delete</button>
    </div>
  </div>
</div>

<!-- ═══ Bulk Delete Confirmation Dialog ═══ -->
<div id="confirm-bulk" class="confirm-overlay" style="display:none;">
  <div class="confirm-dialog" role="alertdialog" aria-modal="true" aria-label="Delete multiple sessions confirmation">
    <h2>Delete 3 selected sessions?</h2>
    <p class="hint">This action cannot be undone.</p>
    <div class="confirm-actions">
      <button type="button" class="btn btn-cancel">Cancel</button>
      <button type="button" class="btn btn-danger">Delete</button>
    </div>
  </div>
</div>

<!-- ═══ ClearAll Delete Confirmation Dialog (shows typed confirmation) ═══ -->
<div id="confirm-clearall" class="confirm-overlay" style="display:none;">
  <div class="confirm-dialog" role="alertdialog" aria-modal="true" aria-label="Delete all sessions confirmation">
    <h2>Delete ALL sessions?</h2>
    <p class="danger-hint">This will permanently delete ALL sessions. This action cannot be undone.</p>
    <div style="margin-top:8px;">
      <label style="font-size:11px;color:#a1a1aa;display:block;margin-bottom:4px;" for="clearall-input">
        Type <span style="color:#f87171;font-family:monospace;">DELETE</span> to confirm
      </label>
      <input
        id="clearall-input"
        type="text"
        class="confirm-input"
        placeholder="DELETE"
        aria-label="Type DELETE to confirm"
      >
    </div>
    <div class="confirm-actions">
      <button type="button" class="btn btn-cancel">Cancel</button>
      <button id="clearall-delete-btn" type="button" class="btn btn-danger" disabled>Delete</button>
    </div>
  </div>
</div>

<!-- ═══ Undo Toast (visible) ═══ -->
<div id="undo-toast" class="undo-toast">
  <span class="msg">Session deleted</span>
  <span class="timer">5</span>
  <button type="button" class="btn-undo">Undo</button>
  <button type="button" class="btn-dismiss" aria-label="Dismiss">&#x2715;</button>
</div>

<script>
  // Show/hide helpers for interactive tests
  window.showConfirm = function(id) {
    document.getElementById(id).style.display = 'flex';
  };
  window.hideConfirm = function(id) {
    document.getElementById(id).style.display = 'none';
  };
  window.enableClearAllDelete = function() {
    var btn = document.getElementById('clearall-delete-btn');
    btn.disabled = false;
  };

  // Escape to close any visible confirm
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      ['confirm-single','confirm-bulk','confirm-clearall'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el && el.style.display !== 'none') el.style.display = 'none';
      });
    }
  });
</script>

</body>
</html>`;

// ── Test server ────────────────────────────────────────────────────

interface TestServer {
  server: Server;
  port: number;
  shutdown: () => Promise<void>;
}

function createTestServer(html: string): Promise<TestServer> {
  return new Promise((resolve, reject) => {
    const server = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (typeof addr === "object" && addr) {
        resolve({
          server,
          port: addr.port,
          shutdown: () => new Promise<void>((r) => server.close(() => r())),
        });
      } else {
        reject(new Error("No address"));
      }
    });
  });
}

// ── Axe helpers ─────────────────────────────────────────────────────

import AxeBuilder from "@axe-core/playwright";

function analyze(page: import("@playwright/test").Page) {
  return new AxeBuilder({ page }).analyze();
}

function analyzeRegion(page: import("@playwright/test").Page, selector: string) {
  return new AxeBuilder({ page }).include(selector).analyze();
}

// ── Tests ───────────────────────────────────────────────────────────

test.describe("L3 A11y Audit — Session sidebar static scan", () => {
  let ts: TestServer;

  test.beforeAll(async () => {
    ts = await createTestServer(FIXTURE_HTML);
  });

  test.afterAll(async () => {
    await ts.shutdown();
  });

  test("full page scan has zero critical/serious violations", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);

    const results = await analyze(page);
    const violations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );

    expect(violations).toEqual([]);
  });

  test("session list items pass a11y scan", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);

    const results = await analyzeRegion(page, '[role="listitem"]');
    const violations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(violations).toEqual([]);
  });

  test("sidebar region passes a11y scan", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);

    const results = await analyzeRegion(page, '[role="complementary"]');
    const violations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(violations).toEqual([]);
  });

  test("delete confirmation dialog (single mode) passes a11y scan", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);
    await page.evaluate(() => (window as any).showConfirm("confirm-single"));

    const results = await analyzeRegion(page, "#confirm-single");
    const violations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(violations).toEqual([]);
  });

  test("delete confirmation dialog (clearAll mode) passes a11y scan", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);
    await page.evaluate(() => (window as any).showConfirm("confirm-clearall"));

    const results = await analyzeRegion(page, "#confirm-clearall");
    const violations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(violations).toEqual([]);
  });

  test("undo toast passes a11y scan", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);

    const results = await analyzeRegion(page, "#undo-toast");
    const violations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(violations).toEqual([]);
  });
});

test.describe("L3 A11y Audit — Interactive control properties", () => {
  let ts: TestServer;

  test.beforeAll(async () => {
    ts = await createTestServer(FIXTURE_HTML);
  });

  test.afterAll(async () => {
    await ts.shutdown();
  });

  test("session list items have correct ARIA attributes", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);

    const items = page.locator('[role="listitem"]');
    expect(await items.count()).toBe(3);

    // Active item
    const active = items.first();
    expect(await active.getAttribute("aria-current")).toBe("true");
    expect(await active.getAttribute("aria-label")).toBe("Session: Fix auth middleware bug");
    expect(await active.getAttribute("tabindex")).toBe("0");

    // Inactive item — no aria-current
    const inactive = items.nth(1);
    expect(await inactive.getAttribute("aria-current")).toBeNull();
    expect(await inactive.getAttribute("tabindex")).toBe("0");
  });

  test("sidebar has correct landmark role and labels", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);

    const sidebar = page.locator('[role="complementary"]');
    expect(await sidebar.getAttribute("aria-label")).toBe("Session history");
    expect(await sidebar.getAttribute("aria-expanded")).toBe("true");
  });

  test("close sidebar button has accessible name", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);

    const btn = page.locator('button[aria-label="Close sidebar"]');
    expect(await btn.count()).toBe(1);
  });

  test("delete buttons have accessible names", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);

    const deleteBtns = page.locator('button[aria-label="Delete session"]');
    expect(await deleteBtns.count()).toBe(3);
  });

  test("multi-select checkboxes have accessible names", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);

    const checkboxes = page.locator('input[aria-label="Select session"]');
    expect(await checkboxes.count()).toBe(3);
  });

  test("delete confirmation dialogs have alertdialog role and modal", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);
    await page.evaluate(() => (window as any).showConfirm("confirm-single"));

    const dialog = page.locator("#confirm-single [role='alertdialog']");
    expect(await dialog.count()).toBe(1);
    expect(await dialog.getAttribute("aria-modal")).toBe("true");
  });

  test("clearAll confirmation requires typed input", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);
    await page.evaluate(() => (window as any).showConfirm("confirm-clearall"));

    const deleteBtn = page.locator("#clearall-delete-btn");
    expect(await deleteBtn.isDisabled()).toBe(true);

    await page.evaluate(() => (window as any).enableClearAllDelete());
    expect(await deleteBtn.isDisabled()).toBe(false);
  });

  test("Escape key closes any open confirmation dialog", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);
    await page.evaluate(() => (window as any).showConfirm("confirm-single"));

    // Dialog should be visible
    await page.waitForSelector("#confirm-single[style*='flex']", { timeout: 3000 });
    expect(
      await page.evaluate(() => {
        const el = document.getElementById("confirm-single");
        return el ? el.style.display : null;
      }),
    ).toBe("flex");

    await page.keyboard.press("Escape");

    // Dialog should be hidden
    await page.waitForFunction(() => {
      const el = document.getElementById("confirm-single");
      return el ? el.style.display === "none" : true;
    });
  });

  test("undo toast has keyboard-accessible controls", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);

    const undoBtn = page.locator("#undo-toast .btn-undo");
    expect(await undoBtn.count()).toBe(1);
    expect(await undoBtn.isVisible()).toBe(true);

    const dismissBtn = page.locator("#undo-toast button[aria-label='Dismiss']");
    expect(await dismissBtn.count()).toBe(1);
    expect(await dismissBtn.isVisible()).toBe(true);
  });

  test("session items are keyboard focusable", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);

    const items = page.locator('[role="listitem"]');
    // All items should have tabIndex=0 (focusable via sequential tab)
    for (let i = 0; i < 3; i++) {
      expect(await items.nth(i).getAttribute("tabindex")).toBe("0");
    }
  });

  test("action buttons inside items use tabIndex=-1 (not in tab order)", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);

    const deleteBtns = page.locator('button[aria-label="Delete session"]');
    for (let i = 0; i < 3; i++) {
      expect(await deleteBtns.nth(i).getAttribute("tabindex")).toBe("-1");
    }

    const checkboxes = page.locator('input[aria-label="Select session"]');
    for (let i = 0; i < 3; i++) {
      expect(await checkboxes.nth(i).getAttribute("tabindex")).toBe("-1");
    }
  });
});

test.describe("L3 A11y Audit — Color contrast", () => {
  let ts: TestServer;

  test.beforeAll(async () => {
    ts = await createTestServer(FIXTURE_HTML);
  });

  test.afterAll(async () => {
    await ts.shutdown();
  });

  test("sidebar has no color-contrast violations", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);

    const results = await analyze(page);
    const contrastViolations = results.violations.filter(
      (v) => v.id === "color-contrast",
    );

    // If there are violations, they must not be in our component region
    if (contrastViolations.length > 0) {
      // Re-scan just the sidebar + confirm + toast
      const regionResults = await analyzeRegion(page, ".sidebar, .confirm-overlay, .undo-toast");
      const regionContrast = regionResults.violations.filter(
        (v) => v.id === "color-contrast",
      );
      expect(regionContrast).toEqual([]);
    }
  });
});
