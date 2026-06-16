# Clarify: Model Fallback

**Feature**: `016-model-fallback`  
**Created**: 2026-06-16  
**Status**: Draft

## Technical Clarifications

| ID | Question | Why it matters | Decision / Default |
|----|----------|----------------|--------------------|
| Q-016-01 | Which fallback order is authoritative for MVP? | Different model tiers have different cost and latency tradeoffs. | DeepSeek V4 Pro first, DeepSeek V4 Flash second. No third provider in this feature. |
| Q-016-02 | Which failures trigger fallback? | Falling back on prompt/schema bugs hides product defects; not falling back on transient API failures hurts usability. | Fallback only on timeout, network error, 429, and 5xx. Do not fallback on 4xx request/schema errors except 429. |
| Q-016-03 | Should fallback retry the same model first? | Retry-before-fallback changes latency and cost. | Retry the primary once for 429/5xx if Retry-After or retry policy allows, then fallback. Timeout/network errors go directly to fallback. |
| Q-016-04 | Should fallback preserve full prompt and tools? | Changing the prompt between models can alter behavior and break cache/debugging. | Fallback uses the exact same prompt, messages, tool definitions, and tool_choice. Only model id changes. |
| Q-016-05 | How should users see fallback? | Silent fallback makes cost/quality confusing. | Emit an observability event and optional verbose log; normal CLI output remains focused on task result. |
| Q-016-06 | How many fallback attempts per model request? | Infinite retries can hang one-shot runs. | Maximum two model attempts total: primary attempt plus fallback attempt, except one primary retry for 429/5xx before fallback. |
| Q-016-07 | What happens if fallback also fails? | Users need actionable failure, not a hanging loop. | Surface a deterministic error TurnEvent with redacted provider details and save session state. |
| Q-016-08 | Should fallback change future turns permanently? | Sticky fallback may hide primary recovery; non-sticky fallback may re-hit outage. | Non-sticky for MVP. Each model request starts with primary again. |

## Scope Boundaries

- In scope: model request retry/fallback policy, timeout handling, fallback observability, tests.
- Out of scope: adding GLM/OpenAI/Anthropic fallback providers.
- Out of scope: cost-aware dynamic routing or model quality scoring.
- Out of scope: user-facing model selector UI changes beyond existing config.

## Rework Risks If Not Clarified

1. Retrying all errors could mask invalid request bodies from real tool calling.
2. Sticky fallback could make users unknowingly stay on a lower quality model.
3. Changing prompts during fallback would make debugging model behavior impossible.
4. Missing observability would make cost and reliability claims unverifiable.
