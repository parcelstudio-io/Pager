# ADR 0009 — Use server-owned contextual prompt assembly

Status: Accepted for EVT
Date: 2026-08-31

## Context

Mochi needs a stable companion identity plus optional past conversation, user facts, device state, and retrieved/search context when a Realtime session begins. Putting prompt assembly in the browser or pager would expose private context, let an untrusted client choose system instructions, and make template/version changes require device releases. Treating history retention as automatic permission to personalize would also violate the separate-consent design in [ADR 0007](0007_use_companion_app_and_cloud_history_sync.md).

## Decision

The trusted gateway owns a version-controlled Realtime instruction template and renders it immediately before session creation. The template begins `You are a companion`, keeps behavioral and privacy rules static, and exposes only five scalar slots: companion name, user context, reconstructed history selected as finalized by the production context service, retrieved/search context, and device/session context.

The file uses `.ftl` and FreeMarker's `${name}` spelling, but the dependency-free V1 renderer intentionally supports only those exact scalar placeholders. It does not execute FreeMarker directives, lists, method calls, JavaScript, or recursively introduced placeholders. Each context category has an allowlisted schema and independent count/size limits; unknown fields, malformed records, several recognizable credential shapes, unsupported template syntax, and an oversized final prompt fail closed. Retrieval URL userinfo, query values, and fragments are stripped. Dynamic data is serialized as JSON and lexically escaped inside labelled context boundaries. This preserves structure but does not make untrusted search or history intrinsically safe, so the static template explicitly labels those blocks as data rather than instructions. Tool authorization and device/capture truth remain code-enforced outside the model.

Only authenticated, binding-current, purpose-authorized records may reach the production renderer. History retention, retained-history prompt context, structured memory, and retrieval/search are distinct permissions. Deletion, account change, release/rebinding, or consent withdrawal removes the affected records and derived retrieval/index/cache entries from future prompt eligibility. The production selector/redactor—not the generic renderer alone—must prove history finalization and exclude raw audio, unfinalized deltas, unheard assistant suffixes, Wi-Fi/cellular credentials, provider keys, and arbitrary secrets. The V1 renderer adds only recognizable-pattern defense in depth. Rendered prompts and private values are not routinely logged.

The localhost V1 has no account or history service. Its defaults therefore say user/history context is unavailable and retrieval was not requested; tests may inject fixtures server-side. The browser continues sending SDP only. Production current-session turns remain native Realtime conversation items; the history block is for bounded reconstruction across sessions, not a duplicate transcript database.

## Why

- OpenAI's Realtime session `instructions` field is the default system guidance for model calls and is therefore the right V1 integration seam.
- Server ownership protects the instruction hierarchy, provider credential, private records, authorization scope, and version rollout.
- A constrained renderer is small enough to audit and preserves the repository's zero-runtime-dependency beginner setup.
- Explicit unavailable/not-authorized states prevent the model from interpreting missing context as a negative fact.

## Consequences

- The gateway gains context authorization/retrieval, template versioning, deterministic rendering, size budgets, and deletion/cache invalidation responsibilities.
- Instruction compliance is guidance, not an authorization boundary or guarantee. Consequential tools still need schema validation, user confirmation, and server policy.
- Context placed in session instructions is processed by the provider and may be visible in session configuration events, so it must contain no secrets and privacy copy must cover that processing.
- The V1 `.ftl` is FreeMarker-compatible only for scalar placeholders; adopting a full engine later requires a new security review and migration tests.

## Revisit when

Revisit the constrained renderer if conditional localization or template composition becomes necessary, or if structured conversation replay can replace cross-session history reconstruction without losing product behavior. Do not expand the template language merely for convenience.

## Primary reference

- [OpenAI Realtime call/session configuration](https://developers.openai.com/api/reference/python/resources/realtime/subresources/calls/methods/accept)
