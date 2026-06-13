import type { Config } from "../config/types";
import { createChecker } from "./checker";
import type { PromptFn } from "./types";

export function createPermissionSystem(config: Config, promptFn: PromptFn) {
  return createChecker(
    {
      autoApprove: config.permissions.autoApprove,
      deny: config.permissions.deny,
      askTimeout: config.permissions.askTimeout,
    },
    promptFn,
  );
}
