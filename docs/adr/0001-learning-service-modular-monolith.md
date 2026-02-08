# ADR 0001: Learning Domain Architecture

## Status
Accepted

## Date
2026-02-08

## Context
The platform previously evolved from multiple small services into a merged `lms-learning-service` domain.
This reduced operational overhead, but the codebase still contained same-service network calls (Feign to self),
stale service references, and unclear boundaries between modules.

## Decision
Adopt a **modular monolith** architecture for the learning domain:

- `lms-learning-service` is the single runtime/service boundary for:
  - courses
  - assessments
  - gradebook
  - submissions
  - deadlines
- communication between these modules is **in-process** (service/repository calls), not HTTP/Feign.
- API Gateway keeps a unified external API surface and routes all learning domain paths to `lms-learning-service`.
- `lms-user-service`, `lms-ai-service`, and `lms-analytics-service` remain separate runtime services.

## Consequences

### Positive
- lower latency and fewer failure modes inside the learning domain
- simpler deployment and local development
- easier transactional consistency for cross-module learning workflows

### Tradeoffs
- larger single deployable artifact for learning features
- stricter internal module discipline is required to avoid tangled code

## Guardrails
- no new `@FeignClient` declarations inside `lms-learning-service` for learning-domain modules
- shared contracts belong in `lms-common` only when used by more than one runtime service
- learning-domain module boundaries must be package-level, not network-level

## Next Steps
1. Remove remaining dead self-integration code and stale docs.
2. Add integration tests for cross-module learning flows (submission, grading, deadlines).
3. Split `lms-common` into:
   - core shared contracts
   - security support library
4. Add CI checks that fail if new self-Feign clients are introduced in `lms-learning-service`.
