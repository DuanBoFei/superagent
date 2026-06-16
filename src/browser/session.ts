import { randomUUID } from "node:crypto";
import { normalizeBrowserError } from "./errors";
import type { BrowserAdapter, BrowserAdapterSession } from "./playwright-adapter";
import type { BrowserProfile, BrowserSession } from "./types";

export type BrowserSessionStartResult =
  | { ok: true; session: BrowserSession; adapterSession: BrowserAdapterSession }
  | { ok: false; session: BrowserSession; safeError: string };

export class BrowserSessionManager {
  private session: BrowserSession | undefined;
  private adapterSession: BrowserAdapterSession | undefined;

  constructor(
    private readonly adapter: BrowserAdapter,
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = () => randomUUID(),
  ) {}

  get current(): BrowserSession | undefined {
    return this.session;
  }

  async start(profile: BrowserProfile): Promise<BrowserSessionStartResult> {
    if (this.session?.status === "running" && this.adapterSession !== undefined) {
      return { ok: true, session: this.session, adapterSession: this.adapterSession };
    }

    const startedAt = this.now();
    this.session = {
      id: this.createId(),
      status: "starting",
      createdAt: startedAt,
      updatedAt: startedAt,
    };

    try {
      this.adapterSession = await this.adapter.launch(profile);
      this.session = {
        ...this.session,
        status: "running",
        updatedAt: this.now(),
        adapterSessionId: this.adapterSession.id,
      };
      return { ok: true, session: this.session, adapterSession: this.adapterSession };
    } catch (error) {
      this.session = {
        ...this.session,
        status: "failed",
        updatedAt: this.now(),
      };
      return {
        ok: false,
        session: this.session,
        safeError: normalizeBrowserError("setup_failed", error instanceof Error ? error.message : String(error)),
      };
    }
  }

  markCurrentUrl(url: string): void {
    if (this.session === undefined) {
      return;
    }
    this.session = { ...this.session, currentUrl: url, updatedAt: this.now() };
  }

  async close(): Promise<void> {
    if (this.session === undefined) {
      return;
    }

    if (this.adapterSession !== undefined) {
      await this.adapter.close(this.adapterSession);
      this.adapterSession = undefined;
    }

    this.session = {
      ...this.session,
      status: "closed",
      updatedAt: this.now(),
    };
  }

  async cleanup(): Promise<void> {
    await this.close();
  }
}
