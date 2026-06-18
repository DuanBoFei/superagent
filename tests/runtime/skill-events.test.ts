import { describe, expect, it, vi } from "vitest";
import { createRuntime } from "../../src/runtime/runtime";
import { createSkillManifest, createSkillDefinition } from "../../src/skills/types";
import { discoverSkills } from "../../src/skills/discovery";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

describe("T036: skill lifecycle event emission", () => {
  describe("skill:invoked event", () => {
    it("emits skill:invoked event when setActiveSkill succeeds", () => {
      const events: Array<{ type: string; [key: string]: unknown }> = [];
      const emit = (event: { type: string; [key: string]: unknown }) => events.push(event);

      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-event-"));
      try {
        const skillDir = path.join(dir, "my-skill");
        fs.mkdirSync(skillDir);
        fs.writeFileSync(
          path.join(skillDir, "SKILL.md"),
          ["---", "name: my-skill", "version: 1.0.0", "description: A test skill", "---", "# Instructions", "Do the thing."].join(
            "\n",
          ),
          "utf-8",
        );

        const { registry } = discoverSkills([dir], { maxBodySize: 65536 });
        const runtime = createRuntime({ skillRegistry: registry, emit });

        const diags = runtime.setActiveSkill("my-skill", { arg0: "value" });

        expect(diags).toEqual([]);
        expect(events).toContainEqual({
          type: "skill:invoked",
          skillName: "my-skill",
          args: { arg0: "value" },
        });
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("does NOT emit skill:invoked event when skill not found in registry", () => {
      const events: Array<{ type: string; [key: string]: unknown }> = [];
      const emit = (event: { type: string; [key: string]: unknown }) => events.push(event);

      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-notfound-"));
      try {
        const skillDir = path.join(dir, "my-skill");
        fs.mkdirSync(skillDir);
        fs.writeFileSync(
          path.join(skillDir, "SKILL.md"),
          ["---", "name: my-skill", "version: 1.0.0", "description: A test skill", "---", "# Instructions"].join("\n"),
          "utf-8",
        );

        const { registry } = discoverSkills([dir], { maxBodySize: 65536 });
        const runtime = createRuntime({ skillRegistry: registry, emit });

        const diags = runtime.setActiveSkill("non-existent-skill", {});

        expect(diags.length).toBe(1);
        expect(diags[0].reason).toBe("not-found");
        expect(events.filter((e) => e.type === "skill:invoked")).toEqual([]);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("does NOT emit skill:invoked event when argument validation fails", () => {
      const events: Array<{ type: string; [key: string]: unknown }> = [];
      const emit = (event: { type: string; [key: string]: unknown }) => events.push(event);

      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-argfail-"));
      try {
        const skillDir = path.join(dir, "req-arg-skill");
        fs.mkdirSync(skillDir);
        fs.writeFileSync(
          path.join(skillDir, "SKILL.md"),
          [
            "---",
            "name: req-arg-skill",
            "version: 1.0.0",
            "description: A test skill",
            "arguments:",
            "  - name: requiredArg",
            "    description: Required arg",
            "    required: true",
            "---",
            "# Instructions",
          ].join("\n"),
          "utf-8",
        );

        const { registry } = discoverSkills([dir], { maxBodySize: 65536 });
        const runtime = createRuntime({ skillRegistry: registry, emit });

        const diags = runtime.setActiveSkill("req-arg-skill", {});

        expect(diags.length).toBe(1);
        expect(diags[0].reason).toBe("missing-arg");
        expect(events.filter((e) => e.type === "skill:invoked")).toEqual([]);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("does nothing and emits no events when skillRegistry is not provided", () => {
      const events: Array<{ type: string; [key: string]: unknown }> = [];
      const emit = (event: { type: string; [key: string]: unknown }) => events.push(event);

      const runtime = createRuntime({ emit });
      const diags = runtime.setActiveSkill("any-skill", {});

      expect(diags).toEqual([]);
      expect(events.filter((e) => e.type === "skill:invoked")).toEqual([]);
    });
  });

  describe("skill:discovered event", () => {
    it("emits skill:discovered event during startup when discovery happens", () => {
      const events: Array<{ type: string; [key: string]: unknown }> = [];
      const emit = (event: { type: string; [key: string]: unknown }) => events.push(event);

      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-disc-event-"));
      try {
        const skillDir = path.join(dir, "skill1");
        fs.mkdirSync(skillDir);
        fs.writeFileSync(
          path.join(skillDir, "SKILL.md"),
          ["---", "name: skill1", "version: 1.0.0", "description: First test skill", "---"].join("\n"),
          "utf-8",
        );

        const { registry, diagnostics } = discoverSkills([dir], { maxBodySize: 65536 });

        emit({
          type: "skill:discovered",
          skillCount: registry.skills.size,
          diagnosticCount: diagnostics.length,
          sourceDirectories: registry.sourceOrder,
        });

        const discEvent = events.find((e) => e.type === "skill:discovered");
        expect(discEvent).toBeDefined();
        expect(discEvent?.skillCount).toBe(1);
        expect(discEvent?.diagnosticCount).toBe(0);
        expect(discEvent?.sourceDirectories).toEqual([dir]);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });
});
