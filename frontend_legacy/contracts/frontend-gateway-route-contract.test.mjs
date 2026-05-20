import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, '..');
const FRONTEND_SRC_DIR = path.join(FRONTEND_DIR, 'src');
const GATEWAY_CONFIG_FILES = [
  path.resolve(
    FRONTEND_DIR,
    '../backend-spring/lms-api-gateway/src/main/resources/application.yml',
  ),
  path.resolve(
    FRONTEND_DIR,
    '../backend-spring/lms-api-gateway/src/main/resources/application-docker.yml',
  ),
];

const EXCLUDED_SOURCE_FILES = new Set([
  // This feature is not routed through API gateway yet.
  path.join(FRONTEND_SRC_DIR, 'features/authoring/api/authoringApi.ts'),
]);

const LOCAL_GATEWAY_PATTERNS = ['/api/admin/**'];
const REQUIRED_FRONTEND_PREFIXES = ['/submissions', '/notifications'];
const REQUIRED_DEADLINE_PREFIXES = ['/calendar', '/deadlines'];

test('frontend API endpoints must match gateway route contracts', () => {
  const frontendEndpoints = collectFrontendApiEndpoints();
  assert.ok(frontendEndpoints.length > 0, 'No frontend API endpoints were discovered');

  for (const configFile of GATEWAY_CONFIG_FILES) {
    const patterns = [...extractGatewayPathPatterns(configFile), ...LOCAL_GATEWAY_PATTERNS];
    assert.ok(patterns.length > 0, `No gateway Path predicates found in ${configFile}`);

    const unmatched = frontendEndpoints.filter(({ gatewayPath }) => {
      return !patterns.some((pattern) => wildcardMatch(gatewayPath, pattern));
    });

    assert.equal(
      unmatched.length,
      0,
      [
        `Frontend API endpoints do not match gateway config: ${path.basename(configFile)}`,
        ...unmatched.map(
          ({ file, endpoint, gatewayPath }) => `- ${relative(file)} -> ${endpoint} (${gatewayPath})`,
        ),
      ].join('\n'),
    );
  }
});

test('frontend must keep submissions and deadline-related integrations', () => {
  const frontendEndpoints = collectFrontendApiEndpoints();
  const paths = new Set(frontendEndpoints.map(({ endpoint }) => normalizeEndpoint(endpoint)));

  for (const prefix of REQUIRED_FRONTEND_PREFIXES) {
    assert.ok(
      [...paths].some((endpoint) => endpoint.startsWith(prefix)),
      `Missing frontend integration endpoint for ${prefix}`,
    );
  }

  assert.ok(
    [...paths].some((endpoint) =>
      REQUIRED_DEADLINE_PREFIXES.some((prefix) => endpoint.startsWith(prefix)),
    ),
    'Missing deadline integration endpoint. Expected at least one /calendar or /deadlines endpoint.',
  );
});

function collectFrontendApiEndpoints() {
  const endpoints = [];
  const sourceFiles = walkTsFiles(FRONTEND_SRC_DIR).filter((file) => !EXCLUDED_SOURCE_FILES.has(file));

  for (const file of sourceFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const clientAliases = extractApiClientAliases(content);
    if (clientAliases.size === 0) continue;

    for (const endpoint of extractApiCallEndpoints(content, clientAliases)) {
      const normalizedEndpoint = normalizeEndpoint(endpoint);
      endpoints.push({
        file,
        endpoint: normalizedEndpoint,
        gatewayPath: toGatewayPath(normalizedEndpoint),
      });
    }
  }

  endpoints.push(...extractCalendarSubscriptionEndpoint());

  return dedupeEndpoints(endpoints);
}

function extractApiClientAliases(source) {
  const aliases = new Set();
  const importPatterns = [
    /import\s+([A-Za-z_$][\w$]*)\s+from\s+['"][^'"]*\/api\/client['"]/g,
    /import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]\.\/client['"]/g,
  ];

  for (const pattern of importPatterns) {
    let match;
    while ((match = pattern.exec(source)) !== null) {
      aliases.add(match[1]);
    }
  }
  return aliases;
}

function extractApiCallEndpoints(source, aliases) {
  const endpoints = [];
  const callPattern =
    /\b([A-Za-z_$][\w$]*)\.(?:get|post|put|patch|delete|upload)\s*(?:<[^()]*>)?\s*\(\s*([`'"])(\/[^`'"]*)\2/g;

  let match;
  while ((match = callPattern.exec(source)) !== null) {
    const alias = match[1];
    if (!aliases.has(alias)) continue;
    endpoints.push(match[3]);
  }

  return endpoints;
}

function extractCalendarSubscriptionEndpoint() {
  const calendarPage = path.join(FRONTEND_SRC_DIR, 'pages/CalendarPage.tsx');
  if (!fs.existsSync(calendarPage)) return [];

  const source = fs.readFileSync(calendarPage, 'utf8');
  const calendarPattern = /\/api\/calendar\/student\/\$\{[^}]+\}\/subscribe/;
  assert.match(
    source,
    calendarPattern,
    `${relative(calendarPage)} must keep calendar subscription URL integration`,
  );

  return [
    {
      file: calendarPage,
      endpoint: '/calendar/student/__param__/subscribe',
      gatewayPath: '/api/calendar/student/__param__/subscribe',
    },
  ];
}

function normalizeEndpoint(endpoint) {
  return endpoint.replace(/\$\{[^}]+\}/g, '__param__').split('?')[0];
}

function toGatewayPath(endpoint) {
  if (endpoint.startsWith('/api/')) return endpoint;
  return `/api${endpoint}`;
}

function extractGatewayPathPatterns(file) {
  const config = fs.readFileSync(file, 'utf8');
  const patterns = [];
  const pathLinePattern = /^\s*-\s*Path=(.+)$/gm;

  let match;
  while ((match = pathLinePattern.exec(config)) !== null) {
    const values = match[1]
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    patterns.push(...values);
  }

  return patterns;
}

function wildcardMatch(value, pattern) {
  if (pattern.endsWith('/**')) {
    const base = pattern.slice(0, -3);
    if (value === base) {
      return true;
    }
  }
  return wildcardToRegex(pattern).test(value);
}

function wildcardToRegex(pattern) {
  const doubled = '__DOUBLE_STAR__';
  const single = '__SINGLE_STAR__';

  const escaped = escapeRegex(pattern)
    .replaceAll('\\*\\*', doubled)
    .replaceAll('\\*', single)
    .replaceAll(doubled, '.*')
    .replaceAll(single, '[^/]*');

  return new RegExp(`^${escaped}$`);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function walkTsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkTsFiles(fullPath));
      continue;
    }

    if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }

  return files;
}

function dedupeEndpoints(endpoints) {
  const byKey = new Map();
  for (const entry of endpoints) {
    byKey.set(`${entry.file}::${entry.endpoint}`, entry);
  }
  return [...byKey.values()];
}

function relative(file) {
  return path.relative(FRONTEND_DIR, file);
}
