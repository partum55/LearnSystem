#!/bin/bash
# Security Audit Script for LMS Project
# Run this script to check for common security issues

set -e

echo "🔒 Starting Security Audit..."
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env files exist
echo ""
echo "📋 Checking environment files..."
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}❌ backend/.env not found! Copy from backend/.env.example${NC}"
else
    echo -e "${GREEN}✅ backend/.env exists${NC}"
fi

if [ ! -f "frontend/.env" ]; then
    echo -e "${YELLOW}⚠️  frontend/.env not found (optional)${NC}"
else
    echo -e "${GREEN}✅ frontend/.env exists${NC}"
fi

# Check if .env files are in .gitignore
echo ""
echo "📋 Checking .gitignore..."
if grep -q "^\.env$" .gitignore 2>/dev/null; then
    echo -e "${GREEN}✅ .env is in .gitignore${NC}"
else
    echo -e "${RED}❌ .env is NOT in .gitignore!${NC}"
fi

# Check if .env files are committed to git
echo ""
echo "📋 Checking if .env files are committed..."
if git ls-files | grep -E '\.env$' > /dev/null 2>&1; then
    echo -e "${RED}❌ WARNING: .env files are committed to git!${NC}"
    git ls-files | grep -E '\.env$'
else
    echo -e "${GREEN}✅ No .env files committed to git${NC}"
fi

# Check for default/weak passwords in .env
echo ""
echo "📋 Checking for default credentials..."
if [ -f "backend/.env" ]; then
    if grep -q "SECRET_KEY=django-insecure" backend/.env; then
        echo -e "${RED}❌ Default SECRET_KEY detected in backend/.env${NC}"
    else
        echo -e "${GREEN}✅ SECRET_KEY appears to be customized${NC}"
    fi

    if grep -q "DB_PASSWORD=postgres" backend/.env; then
        echo -e "${YELLOW}⚠️  Default DB_PASSWORD detected (postgres)${NC}"
    else
        echo -e "${GREEN}✅ DB_PASSWORD appears to be customized${NC}"
    fi

    if grep -q "DEBUG=True" backend/.env; then
        echo -e "${YELLOW}⚠️  DEBUG=True (OK for development, change in production)${NC}"
    else
        echo -e "${GREEN}✅ DEBUG is False${NC}"
    fi
fi

# Check Python dependencies for vulnerabilities (if pip-audit is installed)
echo ""
echo "📋 Checking Python dependencies..."
if command -v pip-audit &> /dev/null; then
    cd backend
    echo "Running pip-audit..."
    pip-audit -r requirements.txt || echo -e "${YELLOW}⚠️  Vulnerabilities found${NC}"
    cd ..
else
    echo -e "${YELLOW}⚠️  pip-audit not installed. Install with: pip install pip-audit${NC}"
fi

# Check for dangerous Python patterns
echo ""
echo "📋 Scanning for dangerous Python patterns..."
DANGEROUS_PATTERNS=(
    "eval\("
    "exec\("
    "os.system\("
    "subprocess.*shell=True"
    "pickle.load"
    "yaml.load\("
)

FOUND_ISSUES=0
for pattern in "${DANGEROUS_PATTERNS[@]}"; do
    if grep -r -n --include="*.py" -E "$pattern" backend/ 2>/dev/null | grep -v "\.pyc" | grep -v "__pycache__"; then
        echo -e "${RED}❌ Found dangerous pattern: $pattern${NC}"
        FOUND_ISSUES=$((FOUND_ISSUES + 1))
    fi
done

if [ $FOUND_ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ No dangerous Python patterns found${NC}"
fi

# Check Node.js dependencies (if npm is available)
echo ""
echo "📋 Checking Node.js dependencies..."
if [ -f "frontend/package.json" ]; then
    cd frontend
    if command -v npm &> /dev/null; then
        echo "Running npm audit..."
        npm audit --audit-level=high || echo -e "${YELLOW}⚠️  Vulnerabilities found${NC}"
    else
        echo -e "${YELLOW}⚠️  npm not installed${NC}"
    fi
    cd ..
fi

# Check for dangerous JavaScript patterns
echo ""
echo "📋 Scanning for dangerous JavaScript patterns..."
JS_DANGEROUS=(
    "eval\("
    "new Function\("
    "innerHTML\s*="
)

JS_FOUND=0
for pattern in "${JS_DANGEROUS[@]}"; do
    results=$(grep -r -n --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" -E "$pattern" frontend/src/ 2>/dev/null | grep -v "node_modules" || true)
    if [ ! -z "$results" ]; then
        # Check if it's the known safe case (RichTextEditor with DOMPurify)
        if echo "$results" | grep -q "RichTextEditor.*dangerouslySetInnerHTML.*DOMPurify"; then
            echo -e "${GREEN}✅ Found $pattern but it's sanitized with DOMPurify${NC}"
        else
            echo -e "${RED}❌ Found dangerous pattern: $pattern${NC}"
            echo "$results"
            JS_FOUND=$((JS_FOUND + 1))
        fi
    fi
done

if [ $JS_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ No dangerous JavaScript patterns found${NC}"
fi

# Summary
echo ""
echo "================================"
echo "🏁 Security Audit Complete!"
echo ""
echo "📚 For more information, see SECURITY.md"
echo ""
echo "Recommended tools:"
echo "  - pip install pip-audit safety bandit semgrep"
echo "  - npm install -g retire"
echo ""

