// ── SkillArgument ──

export interface SkillArgument {
  readonly name: string;
  readonly description: string;
  readonly required: boolean;
}

export interface SkillArgumentInput {
  name: string;
  description: string;
  required: boolean;
}

export function createSkillArgument(input: SkillArgumentInput): SkillArgument {
  return {
    name: input.name,
    description: input.description,
    required: input.required,
  };
}

// ── SkillManifest ──

export interface SkillManifest {
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly entry: string;
  readonly arguments: SkillArgument[];
  readonly suggestedMode?: "plan";
  readonly allowedRoles?: string[];
}

export interface SkillManifestInput {
  name: string;
  description: string;
  version: string;
  entry: string;
  arguments?: SkillArgument[];
  suggestedMode?: "plan";
  allowedRoles?: string[];
}

export function createSkillManifest(input: SkillManifestInput): SkillManifest {
  const m: SkillManifest = {
    name: input.name,
    description: input.description,
    version: input.version,
    entry: input.entry,
    arguments: input.arguments ?? [],
  };
  if (input.suggestedMode) (m as Record<string, unknown>).suggestedMode = input.suggestedMode;
  if (input.allowedRoles) (m as Record<string, unknown>).allowedRoles = input.allowedRoles;
  return m;
}

// ── SkillDefinition ──

export interface SkillDefinition {
  readonly manifest: SkillManifest;
  readonly body: string;
}

export interface SkillDefinitionInput {
  manifest: SkillManifest;
  body: string;
}

export function createSkillDefinition(
  manifest: SkillManifest,
  body: string,
): SkillDefinition {
  return { manifest, body };
}

// ── SkillDiagnostic ──

export type SkillDiagnosticReason =
  | "missing-name"
  | "missing-description"
  | "missing-version"
  | "invalid-name"
  | "invalid-version"
  | "parse-error"
  | "body-too-large"
  | "file-missing"
  | "duplicate-name"
  | "not-found"
  | "missing-arg";

export interface SkillDiagnostic {
  readonly skillName: string;
  readonly filePath: string;
  readonly reason: SkillDiagnosticReason;
  readonly message: string;
}

export interface SkillDiagnosticInput {
  skillName: string;
  filePath: string;
  reason: SkillDiagnosticReason;
  message: string;
}

export function createSkillDiagnostic(input: SkillDiagnosticInput): SkillDiagnostic {
  return {
    skillName: input.skillName,
    filePath: input.filePath,
    reason: input.reason,
    message: input.message,
  };
}

// ── SkillRegistry ──

export interface SkillRegistry {
  readonly skills: Map<string, SkillDefinition>;
  readonly diagnostics: SkillDiagnostic[];
  readonly sourceOrder: string[];
}

export interface SkillRegistryInput {
  skills?: Map<string, SkillDefinition>;
  diagnostics?: SkillDiagnostic[];
  sourceOrder?: string[];
}

export function createSkillRegistry(input?: SkillRegistryInput): SkillRegistry {
  return {
    skills: input?.skills ?? new Map(),
    diagnostics: input?.diagnostics ?? [],
    sourceOrder: input?.sourceOrder ?? [],
  };
}

// ── SkillInvocation ──

export interface SkillInvocation {
  readonly skillName: string;
  readonly args: Record<string, string>;
}

export function createSkillInvocation(
  skillName: string,
  args: Record<string, string>,
): SkillInvocation {
  return { skillName, args };
}

// ── SkillSource ──

export interface SkillSource {
  readonly path: string;
  readonly priority: "project" | "user";
}
