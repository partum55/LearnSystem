# AI Generation Polish Production Verify

Date: 2026-05-28

## Deployment

- Pushed AI error UX and test-connection polish to `main` in commit `4b54cee`.
- Deployed on `root@167.99.240.242:/opt/learnsystem` with:
  - `git pull`
  - `docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.prod.yml build --progress=plain ai-service gateway caddy`
  - `docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.prod.yml up -d --force-recreate ai-service gateway caddy`
- Production health check returned `HTTP/2 200` with `{"status":"UP"}`.
- Waited 90 seconds after the frontend push before headed browser verification.

## Follow-up Gateway Fix

During headed verification, AI material generation reached `/api/v1/ai/tasks` but timed out at the gateway AI circuit-breaker limit and forwarded the original `POST` to a GET-only fallback, causing a `405 Method Not Allowed`.

Fixed in commit `a80c326`:

- Gateway AI fallback now accepts any HTTP method.
- Gateway AI fallback returns structured code `AI_PROVIDER_UNAVAILABLE`.
- Gateway AI timeout increased from `60s` to `180s` for longer Gemini generations.

Redeployed `gateway` and `caddy`; Docker build compiled the gateway successfully and production health again returned `HTTP/2 200`.

## Verification Results

- Teacher Profile -> AI Settings -> Test connection: verified real backend call. Result was `OK`.
- Raw key visibility: no raw Gemini key was visible in Profile or student views; key display remained masked.
- Create course with AI: `/courses/ai-create` opened the real wizard with `Generate Course with AI`, topic, audience, and curriculum controls. The old "coming next" placeholder was absent.
- Generate material with AI: verified POST path to `/api/v1/ai/tasks` with `GENERATE_RTE_MATERIAL`. Gemini returned `AI_OUTPUT_INVALID`; UI rendered `AI returned an invalid draft. Try regenerating.` with code `AI_OUTPUT_INVALID`, not generic `Request failed`.
- Generate assignment with AI: verified POST path to `/api/v1/ai/tasks` with `GENERATE_ASSIGNMENT`. Gemini returned `AI_OUTPUT_INVALID`; UI rendered `AI returned an invalid draft. Try regenerating.` with code `AI_OUTPUT_INVALID`, not generic `Request failed`.
- Student access: logged in as the E2E student. Student navigation did not show `Teacher To-do` or `Question Bank`; courses page did not show `Create course with AI`, `Add material`, or `Add assignment`.

## Verification Commands

- `npm run typecheck`: passed.
- `npm run build`: passed.
- Local Maven tests: blocked because `mvn` is not installed on this workstation.
- Production Docker build: gateway compiled successfully; Dockerfile uses `-DskipTests`.
- Production `ai-service` build from the initial deploy compiled successfully; Dockerfile uses `-DskipTests`.

## Remaining Notes

- Gemini was not rate-limited during the final smoke. The rate-limit-specific text was not triggered in this run, but the structured AI error rendering path was verified with `AI_OUTPUT_INVALID`.
- AI generation is reaching the real provider. The remaining observed provider-side issue is invalid draft shape from Gemini output, not missing routes, placeholders, or generic frontend error collapse.
