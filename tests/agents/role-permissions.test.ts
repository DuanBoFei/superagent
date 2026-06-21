import { describe, expect, it, vi } from "vitest";
import { createRolePermissionSystem } from "../../src/agents/role-permissions";
import type { PermissionSystem } from "../../src/scheduling/types";

function basePermission(result: "approved" | "denied" | "always" = "approved"): PermissionSystem {
  return {
    checkPermission: vi.fn(async () => result),
  };
}

describe("role-scoped permission system", () => {
  it("denies mutating tools for Explore", async () => {
    const base = basePermission("approved");
    const permission = createRolePermissionSystem("explore", base);

    await expect(permission.checkPermission("Write", {})).resolves.toBe("denied");
    await expect(permission.checkPermission("Edit", {})).resolves.toBe("denied");
    await expect(permission.checkPermission("Bash", {})).resolves.toBe("denied");
    expect(base.checkPermission).not.toHaveBeenCalled();
  });

  it("denies mutating tools for Review", async () => {
    const base = basePermission("approved");
    const permission = createRolePermissionSystem("review", base);

    await expect(permission.checkPermission("Write", {})).resolves.toBe("denied");
    await expect(permission.checkPermission("Edit", {})).resolves.toBe("denied");
    await expect(permission.checkPermission("Bash", {})).resolves.toBe("denied");
    expect(base.checkPermission).not.toHaveBeenCalled();
  });

  it("delegates Implement permissions to the existing checker", async () => {
    const base = basePermission("always");
    const permission = createRolePermissionSystem("implement", base);

    await expect(permission.checkPermission("Bash", { command: "pnpm test" })).resolves.toBe("always");
    expect(base.checkPermission).toHaveBeenCalledWith("Bash", { command: "pnpm test" });
  });

  it("allows read-only tools and MCP tools through the base checker for Explore and Review", async () => {
    const base = basePermission("approved");
    const explore = createRolePermissionSystem("explore", base);
    const review = createRolePermissionSystem("review", base);

    await expect(explore.checkPermission("Read", { file_path: "src/index.ts" })).resolves.toBe("approved");
    await expect(review.checkPermission("mcp__repo__inspect", {})).resolves.toBe("approved");
    expect(base.checkPermission).toHaveBeenCalledTimes(2);
  });
});
