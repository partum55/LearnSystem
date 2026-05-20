import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const dockerCompose = fs.readFileSync(path.join(REPO_ROOT, 'docker-compose.yml'), 'utf8');
const learningDockerConfig = fs.readFileSync(
  path.join(
    REPO_ROOT,
    'backend-spring/lms-learning-service/src/main/resources/application-docker.yml',
  ),
  'utf8',
);
const runLocalScript = fs.readFileSync(path.join(REPO_ROOT, 'run-local.sh'), 'utf8');

test('learning-service docker compose must provide spring datasource env vars', () => {
  const learningSection = extractSection(dockerCompose, 'learning-service');

  assert.match(learningSection, /SPRING_DATASOURCE_URL=/);
  assert.match(learningSection, /SPRING_DATASOURCE_USERNAME=/);
  assert.match(learningSection, /SPRING_DATASOURCE_PASSWORD=/);
});

test('learning-service docker profile must accept both spring datasource and legacy database env vars', () => {
  assert.match(learningDockerConfig, /\$\{SPRING_DATASOURCE_URL:\$\{DATABASE_URL:/);
  assert.match(learningDockerConfig, /\$\{SPRING_DATASOURCE_USERNAME:\$\{DB_USERNAME:/);
  assert.match(learningDockerConfig, /\$\{SPRING_DATASOURCE_PASSWORD:\$\{DB_PASSWORD:/);
});

test('execution service remains internal to backend topology in docker compose', () => {
  const executionSection = extractSection(dockerCompose, 'execution-service');

  assert.doesNotMatch(executionSection, /ports:/);
  assert.doesNotMatch(runLocalScript, /execution-service:/);
});

function extractSection(source, serviceName) {
  const pattern = new RegExp(`^  ${serviceName}:[\\s\\S]*?(?=^  [^\\s].*?:|\\Z)`, 'm');
  const match = source.match(pattern);
  assert.ok(match, `Missing ${serviceName} section`);
  return match[0];
}
