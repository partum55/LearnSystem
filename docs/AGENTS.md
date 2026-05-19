# Repository Guidelines

## Project Structure & Module Organization

This repository contains a multi-service LMS. `frontend/` is the React 18 + TypeScript + Vite app; source lives in `frontend/src`, with pages in `src/pages`, shared UI in `src/components`, API clients in `src/api`, and hooks in `src/queries` and `src/mutations`. `backend-spring/` is a Java 21 multi-module Maven project with services such as `lms-user-service`, `lms-learning-service`, `lms-ai-service`, and `lms-api-gateway`. `execution-service/` contains the Python code runner. `e2e-tests/` contains Playwright/pytest browser tests. Deployment files live in `docker-compose.yml`, `k8s/`, `deploy.sh`, and `run-local.sh`.

## Build, Test, and Development Commands

- `./run-local.sh`: start the local stack.
- `docker-compose up -d`: run the containerized services; use `docker-compose down` to stop them.
- `cd frontend && npm run dev`: start the Vite development server.
- `cd frontend && npm run build`: type-check and build production frontend assets.
- `cd frontend && npm run lint`: run ESLint over TypeScript/React code.
- `cd frontend && npm run test:contracts`: run route contract tests.
- `cd backend-spring && mvn clean install`: build and test all Maven modules.
- `cd backend-spring && mvn test`: run backend unit and contract tests.
- `cd e2e-tests && pytest`: run browser end-to-end tests after configuring `.env`.

## Coding Style & Naming Conventions

Follow `.editorconfig`: UTF-8, LF endings, final newline, spaces, 2-space default indentation, and 4-space indentation for Java. Frontend code uses TypeScript ES modules, React function components, and ESLint flat config. Name React components in `PascalCase`, hooks as `useSomething`, and API helpers by domain, for example `src/api/courses.ts`. Java packages stay under `com.university.lms`; service tests use `ClassNameTest`.

## Testing Guidelines

Place backend tests in each module’s `src/test/java`. Keep frontend component tests near components and contract tests in `frontend/contracts`. E2E tests use `e2e-tests/tests/test_*.py`, with page objects in `e2e-tests/pages`. Use markers such as `smoke`, `auth`, `course`, `quiz`, `assignment`, `ai`, and `critical`, for example `pytest -m smoke`.

## Commit & Pull Request Guidelines

Recent history uses short, imperative summaries such as `Fix frontend build...`, `Refactor Docker...`, and `Update ...`. Prefer a clear scope and outcome over vague messages like `changes`. Pull requests should describe the change, list verification commands, link related issues, and include screenshots for UI changes. Mention database, environment, or deployment impact explicitly.

## Security & Configuration Tips

Copy `.env.example` files rather than committing local secrets. Keep JWT, database, Redis, and AI service credentials out of source control. When changing embedded content or code execution behavior, review `frontend/src/features/editor-core/embedSecurity.ts` and `execution-service/`.
