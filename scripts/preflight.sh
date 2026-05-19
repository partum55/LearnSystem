#!/usr/bin/env bash
# ==========================================
# LearnSystem Preflight Check
# ==========================================
# Validates tools, env file, security, URLs, Docker config, and Dockerfiles.
# Fails fast with clear error messages.
#
# Usage:
#   scripts/preflight.sh local
#   scripts/preflight.sh production
#
# Or with explicit env file:
#   scripts/preflight.sh --env config/env/.env.local
#   scripts/preflight.sh --env config/env/.env.production --mode production

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
WARN=0
FAIL=0
ERRORS=()
WARNINGS=()

pass()   { echo -e "  ${GREEN}✓${NC} $1"; ((PASS++))  || true; }
warn()   { echo -e "  ${YELLOW}⚠${NC} $1"; ((WARN++)) || true; WARNINGS+=("$1"); }
fail()   { echo -e "  ${RED}✗${NC} $1"; ((FAIL++))    || true; ERRORS+=("$1"); }
header() { echo -e "\n${BLUE}▶ $1${NC}"; }

# ==========================================
# Parse arguments
# ==========================================
MODE=""
ENV_FILE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        local|production|prod)
            MODE="$1"
            shift
            ;;
        --env)
            ENV_FILE="$2"
            shift 2
            ;;
        --mode)
            MODE="$2"
            shift 2
            ;;
        *)
            echo "Usage: $0 {local|production} [--env <file>] [--mode <local|production>]"
            exit 1
            ;;
    esac
done

[[ "$MODE" == "prod" ]] && MODE="production"

if [[ -z "$MODE" ]]; then
    echo -e "${RED}Error: specify mode — 'local' or 'production'${NC}"
    echo "Usage: $0 {local|production}"
    exit 1
fi

if [[ -z "$ENV_FILE" ]]; then
    if [[ "$MODE" == "local" ]]; then
        ENV_FILE="config/env/.env.local"
    else
        ENV_FILE="config/env/.env.production"
    fi
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║          LearnSystem Preflight Check                 ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "  Mode: ${BLUE}${MODE}${NC}"
echo -e "  Env:  ${BLUE}${ENV_FILE}${NC}"

# ==========================================
# 1. Required tools
# ==========================================
header "1. Required tools"

check_tool() {
    local tool="$1"
    if command -v "$tool" &>/dev/null; then
        pass "$tool ($(command -v "$tool"))"
    else
        fail "$tool not found in PATH"
    fi
}

check_tool docker
check_tool java

if docker compose version &>/dev/null 2>&1; then
    pass "docker compose v2"
elif command -v docker-compose &>/dev/null; then
    warn "docker-compose v1 found — upgrade to Docker Compose v2 is recommended"
else
    fail "docker compose not installed"
fi

if command -v mvn &>/dev/null; then
    pass "mvn"
elif [[ -x "services/mvnw" ]]; then
    pass "services/mvnw wrapper"
else
    warn "mvn not found — Java builds will fail if run outside Docker"
fi

if command -v node &>/dev/null; then
    pass "node $(node --version)"
else
    warn "node not found — frontend checks skipped"
fi

# ==========================================
# 2. Env file: existence, required vars, placeholders
# ==========================================
header "2. Environment file"

if [[ ! -f "$ENV_FILE" ]]; then
    fail "Env file not found: $ENV_FILE"
    echo ""
    echo -e "${RED}Cannot continue — env file missing.${NC}"
    echo -e "Copy the template:  cp ${ENV_FILE}.example ${ENV_FILE}"
    echo -e "Then fill in your secrets."
    exit 1
fi
pass "Env file found: $ENV_FILE"

# Load env into associative array (strips comments and inline whitespace)
declare -A ENV_VARS=()
while IFS= read -r line; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue
    key="${line%%=*}"
    value="${line#*=}"
    key="${key//[[:space:]]/}"
    value="${value%%#*}"
    value="${value#"${value%%[![:space:]]*}"}"  # ltrim
    value="${value%"${value##*[![:space:]]}"}"  # rtrim
    [[ -n "$key" ]] && ENV_VARS["$key"]="$value"
done < "$ENV_FILE"

REQUIRED_VARS=(
    SUPABASE_URL
    SUPABASE_JWKS_URL
    SUPABASE_DB_URL
    SUPABASE_DB_USER
    SUPABASE_DB_PASSWORD
    SUPABASE_SECRET_KEY
    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    SPRING_PROFILES_ACTIVE
    FRONTEND_URL
    LLAMA_API_KEY
    GATEWAY_HOST_PORT
)

for var in "${REQUIRED_VARS[@]}"; do
    val="${ENV_VARS[$var]:-}"
    if [[ -z "$val" ]]; then
        fail "Missing or empty: $var"
    elif [[ "$val" == *"<"*">"* ]] || [[ "$val" == *"TODO"* ]] || \
         [[ "$val" == *"your-"* ]] || [[ "$val" == *"CHANGE-ME"* ]] || \
         [[ "$val" == *"your_"* ]]; then
        fail "Placeholder not replaced: $var"
    else
        pass "$var is set"
    fi
done

# ==========================================
# 3. Security checks
# ==========================================
header "3. Security checks"

# Frontend env files must not contain backend secrets
FRONTEND_ENV_FILES=(
    "apps/web/.env.local"
    "apps/web/.env.production"
    "apps/web/.env"
    "apps/web/.env.production.local"
)
for f in "${FRONTEND_ENV_FILES[@]}"; do
    [[ ! -f "$f" ]] && continue
    if grep -q "^SUPABASE_SERVICE_ROLE_KEY=" "$f" 2>/dev/null; then
        fail "SUPABASE_SERVICE_ROLE_KEY in frontend env $f — leaks admin credentials"
    else
        pass "No SUPABASE_SERVICE_ROLE_KEY in $f"
    fi
    if grep -q "^SUPABASE_DB_PASSWORD=" "$f" 2>/dev/null; then
        fail "SUPABASE_DB_PASSWORD in frontend env $f — leaks DB credentials"
    else
        pass "No SUPABASE_DB_PASSWORD in $f"
    fi
done

# Real env files must not be git-tracked
SENSITIVE_FILES=(
    ".env"
    ".env.local"
    ".env.production"
    "config/env/.env.local"
    "config/env/.env.production"
    "infra/docker/.env.local"
)
for f in "${SENSITIVE_FILES[@]}"; do
    if git ls-files --error-unmatch "$f" &>/dev/null 2>&1; then
        fail "Real env file is git-tracked: $f  →  git rm --cached $f"
    else
        pass "Not git-tracked: $f"
    fi
done

# ==========================================
# 4. URL validation
# ==========================================
header "4. URL validation"

FRONTEND_URL_VAL="${ENV_VARS[FRONTEND_URL]:-}"
NEXT_API_URL_VAL="${ENV_VARS[NEXT_PUBLIC_API_URL]:-}"

if [[ "$MODE" == "local" ]]; then
    if [[ "$FRONTEND_URL_VAL" == "http://localhost"* ]]; then
        pass "FRONTEND_URL is localhost"
    else
        warn "FRONTEND_URL should be http://localhost:3000 in local mode (got: $FRONTEND_URL_VAL)"
    fi
    if [[ "$NEXT_API_URL_VAL" == "http://localhost"* ]]; then
        pass "NEXT_PUBLIC_API_URL is localhost"
    else
        warn "NEXT_PUBLIC_API_URL should be http://localhost:8080/api in local mode (got: $NEXT_API_URL_VAL)"
    fi
    if grep -qE "https://app\.learnsystem\.app|https://api\.learnsystem\.app" "$ENV_FILE" 2>/dev/null; then
        warn "Production URLs detected in local env file — double-check you're using the right env"
    fi
fi

if [[ "$MODE" == "production" ]]; then
    if [[ "$FRONTEND_URL_VAL" == "https://app.learnsystem.app" ]]; then
        pass "FRONTEND_URL is production URL"
    else
        warn "FRONTEND_URL should be https://app.learnsystem.app in production (got: $FRONTEND_URL_VAL)"
    fi
    if [[ "$NEXT_API_URL_VAL" == "https://api.learnsystem.app"* ]]; then
        pass "NEXT_PUBLIC_API_URL is production URL"
    else
        warn "NEXT_PUBLIC_API_URL should be https://api.learnsystem.app/api in production (got: $NEXT_API_URL_VAL)"
    fi
    if grep -q "http://localhost" "$ENV_FILE" 2>/dev/null; then
        fail "localhost URLs found in production env file — use production URLs"
    else
        pass "No localhost URLs in production env file"
    fi
    # Verify gateway binds to 127.0.0.1 in production
    GW_PORT="${ENV_VARS[GATEWAY_HOST_PORT]:-}"
    if [[ "$GW_PORT" == "127.0.0.1:"* ]]; then
        pass "GATEWAY_HOST_PORT binds to localhost only (secure)"
    else
        warn "GATEWAY_HOST_PORT='$GW_PORT' — in production, use 127.0.0.1:8080 to prevent direct internet access"
    fi
fi

# ==========================================
# 5. Docker Compose validation
# ==========================================
header "5. Docker Compose config"

COMPOSE_FILE="infra/docker/docker-compose.yml"

if [[ -f "$COMPOSE_FILE" ]]; then
    pass "Canonical compose file: $COMPOSE_FILE"
else
    fail "Canonical compose file missing: $COMPOSE_FILE"
fi

# Check for obsolete competing compose files
OLD_COMPOSE=(
    "infra/docker/docker-compose.dev.yml"
    "infra/docker/docker-compose.prod.yml"
    "docker-compose.yml"
    "docker-compose.dev.yml"
    "docker-compose.prod.yml"
    "docker-compose.local.yml"
)
for f in "${OLD_COMPOSE[@]}"; do
    if [[ -f "$f" ]]; then
        warn "Obsolete compose file exists: $f — remove it to avoid confusion"
    fi
done

# Validate compose config parses correctly
if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" config --quiet 2>/dev/null; then
    pass "docker compose config is valid"
else
    fail "docker compose config invalid — run: docker compose -f $COMPOSE_FILE --env-file $ENV_FILE config"
fi

# Check all expected Dockerfiles exist
EXPECTED_DOCKERFILES=(
    "services/user-service/Dockerfile"
    "services/learning-service/Dockerfile"
    "services/ai-service/Dockerfile"
    "services/analytics-service/Dockerfile"
    "services/gateway/Dockerfile"
    "services/execution-service/Dockerfile"
)
for df in "${EXPECTED_DOCKERFILES[@]}"; do
    if [[ -f "$df" ]]; then
        pass "Dockerfile: $df"
    else
        fail "Dockerfile missing: $df"
    fi
done

# In production, verify execution-service is not publicly exposed
if [[ "$MODE" == "production" ]]; then
    if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" --profile prod config 2>/dev/null \
        | grep -A5 "execution-service" | grep -q "ports:"; then
        fail "execution-service has public ports in production config — it must be internal-only"
    else
        pass "execution-service is internal-only (no public ports in prod config)"
    fi
fi

# ==========================================
# 6. Supabase format checks
# ==========================================
header "6. Supabase format"

SUPA_URL="${ENV_VARS[SUPABASE_URL]:-}"
SUPA_JWKS="${ENV_VARS[SUPABASE_JWKS_URL]:-}"
SUPA_DB="${ENV_VARS[SUPABASE_DB_URL]:-}"
SUPA_SECRET="${ENV_VARS[SUPABASE_SECRET_KEY]:-}"
SUPA_PUB="${ENV_VARS[NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY]:-}"

if [[ "$SUPA_URL" =~ ^https://[a-z0-9]+\.supabase\.co$ ]]; then
    pass "SUPABASE_URL format valid"
else
    fail "SUPABASE_URL format invalid — expected https://<ref>.supabase.co (got: $SUPA_URL)"
fi

if [[ "$SUPA_JWKS" == "https://"*".supabase.co/auth/v1/.well-known/jwks.json" ]]; then
    pass "SUPABASE_JWKS_URL format valid"
else
    warn "SUPABASE_JWKS_URL format unexpected: $SUPA_JWKS"
fi

if [[ "$SUPA_DB" == "jdbc:postgresql://"* ]]; then
    pass "SUPABASE_DB_URL is JDBC PostgreSQL format"
else
    fail "SUPABASE_DB_URL must start with jdbc:postgresql:// (got: $SUPA_DB)"
fi

if [[ "$SUPA_SECRET" == "sb_secret_"* ]]; then
    pass "SUPABASE_SECRET_KEY format valid (sb_secret_...)"
else
    warn "SUPABASE_SECRET_KEY format unexpected — should start with sb_secret_"
fi

if [[ "$SUPA_PUB" == "sb_publishable_"* ]]; then
    pass "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY format valid (sb_publishable_...)"
else
    warn "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY format unexpected — should start with sb_publishable_"
fi

# ==========================================
# Summary
# ==========================================
echo ""
echo "══════════════════════════════════════════════════════"
echo -e "  ${GREEN}Passed:${NC}   $PASS"
echo -e "  ${YELLOW}Warnings:${NC} $WARN"
echo -e "  ${RED}Failed:${NC}   $FAIL"
echo "══════════════════════════════════════════════════════"

if [[ $FAIL -gt 0 ]]; then
    echo ""
    echo -e "${RED}Preflight FAILED. Fix these issues before starting:${NC}"
    for err in "${ERRORS[@]}"; do
        echo -e "  ${RED}✗${NC} $err"
    done
    echo ""
    exit 1
fi

if [[ $WARN -gt 0 ]]; then
    echo ""
    echo -e "${YELLOW}Warnings (non-blocking):${NC}"
    for w in "${WARNINGS[@]}"; do
        echo -e "  ${YELLOW}⚠${NC} $w"
    done
fi

echo ""
echo -e "${GREEN}✓ Preflight passed — safe to start.${NC}"
echo ""
