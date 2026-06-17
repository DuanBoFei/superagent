# Feature Specification: Skill System

**Feature Branch**: `024-skill-system`  
**Created**: 2026-06-17  
**Status**: Draft  
**Input**: Add a first-class skill system for reusable project workflows. First version loads hand-written local skills and exposes them to the runtime/CLI. It must not implement automatic skill generation or a plugin marketplace.

## User Scenarios & Testing

### User Story 1 - User invokes a reusable workflow skill (Priority: P0)

As a developer, I want to run a named skill such as `run-feature`, `finish-branch`, or `release-check` so repeated workflows are consistent and not re-explained each time.

**Why this priority**: The project already uses workflow-like skills manually. Making them first-class improves reliability and reuse.

**Independent Test**: Create a fixture skill directory with `SKILL.md`, load it, list it, and invoke it with arguments through a fake runtime.

**Acceptance Scenarios**:

1. **Given** a valid local skill exists, **When** skill discovery runs, **Then** the skill appears in the registry.
2. **Given** user invokes `/skill run-feature 020`, **When** the skill exists, **Then** runtime injects the skill instructions and arguments.
3. **Given** the skill is missing, **When** user invokes it, **Then** a clear error lists available skills.

---

### User Story 2 - Skill metadata is safe and bounded (Priority: P0)

As a developer, I want skills to have explicit metadata and limited loading behavior so a skill cannot silently become arbitrary code execution.

**Independent Test**: Load malformed skill metadata and verify it is rejected with diagnostics.

**Acceptance Scenarios**:

1. **Given** skill metadata is missing required fields, **When** discovery runs, **Then** the skill is skipped with a validation error.
2. **Given** skill instructions exceed size limits, **When** discovery runs, **Then** the skill is skipped or truncated with a visible diagnostic.
3. **Given** skill content contains tool guidance, **When** runtime injects it, **Then** existing permission system still controls tool execution.

---

### User Story 3 - Skills integrate with planning and multi-agent flows (Priority: P1)

As a developer, I want skills to be usable from normal execution, plan mode, and future multi-agent orchestration.

**Independent Test**: Invoke a skill that asks for planning and verify the output can route to plan mode.

**Acceptance Scenarios**:

1. **Given** skill metadata declares `suggestedMode: plan`, **When** invoked, **Then** runtime routes through plan mode.
2. **Given** skill metadata declares `allowedRoles`, **When** used in 020, **Then** only compatible role prompts include it.

## Requirements

### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-SK-01 | The system SHALL discover local skills from configured directories. |
| FR-SK-02 | A skill SHALL be represented by metadata plus markdown instructions. |
| FR-SK-03 | The system SHALL validate skill name, description, version, arguments, and body size. |
| FR-SK-04 | The CLI/runtime SHALL support explicit skill invocation. |
| FR-SK-05 | Missing or invalid skills SHALL produce clear non-crashing errors. |
| FR-SK-06 | Skill instructions SHALL be injected as context, not executed as code. |
| FR-SK-07 | Tool permissions SHALL remain governed by the existing permission system. |
| FR-SK-08 | Skills SHALL be listable for user discovery. |
| FR-SK-09 | Skill invocation events SHALL be observable and persisted. |
| FR-SK-10 | The first version SHALL NOT auto-generate or self-modify skills. |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-SK-01 | No new npm dependencies. |
| NFR-SK-02 | Skill discovery must be deterministic and snapshot-testable. |
| NFR-SK-03 | Invalid skills must not block valid skills from loading. |
| NFR-SK-04 | Skill content must have a configurable maximum size. |

### Key Entities

- **SkillManifest**: name, description, version, entry file, optional arguments, optional suggested mode.
- **SkillDefinition**: manifest plus loaded markdown instructions.
- **SkillRegistry**: discovered valid skills and diagnostics for invalid skills.
- **SkillInvocation**: skill name, arguments, source, injected context.

### Edge Cases

- Duplicate skill names → project-local overrides user-global, with diagnostic.
- Skill file missing → invalid skill diagnostic.
- Skill body too large → skip or truncate based on config; proposed default skip.
- Skill invocation with invalid args → return validation error.
- Skill suggests tools → permission system still decides at tool-call time.
