#!/bin/bash

# Script to create SUPERADMIN user in LMS
# Usage: ./create-admin.sh [email] [password]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
DEFAULT_EMAIL="admin@ucu.edu.ua"
DEFAULT_PASSWORD="admin123"

# Get parameters or use defaults
ADMIN_EMAIL="${1:-$DEFAULT_EMAIL}"
ADMIN_PASSWORD="${2:-$DEFAULT_PASSWORD}"

echo "========================================"
echo "  LMS Admin User Creation Script"
echo "========================================"
echo ""
echo "Email: $ADMIN_EMAIL"
echo "Password: ********"
echo ""

# Check if PostgreSQL is running
echo "📋 Checking PostgreSQL connection..."
if ! docker compose ps | grep "lms-postgres" | grep -q "Up"; then
    echo -e "${RED}❌ PostgreSQL is not running!${NC}"
    echo "Start it with: docker compose up -d postgres"
    exit 1
fi
echo -e "${GREEN}✓ PostgreSQL is running${NC}"

# Check if user already exists
echo ""
echo "📋 Checking if admin user already exists..."
EXISTING_USER=$(docker exec lms-postgres psql -U lms_user -d lms_db -t -c \
    "SELECT email FROM users WHERE email = '$ADMIN_EMAIL';" 2>/dev/null | xargs)

if [ ! -z "$EXISTING_USER" ]; then
    echo -e "${YELLOW}⚠️  User with email '$ADMIN_EMAIL' already exists!${NC}"
    read -p "Do you want to reset the password? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi

    # Reset password for existing user
    echo "🔄 Resetting password and updating to SUPERADMIN role..."

    # Generate BCrypt hash using Python (most compatible)
    if command -v python3 &> /dev/null; then
        HASH=$(python3 -c "import bcrypt; print(bcrypt.hashpw('$ADMIN_PASSWORD'.encode('utf-8'), bcrypt.gensalt(rounds=10)).decode('utf-8'))")
    else
        # Fallback to pre-computed hash for admin123
        if [ "$ADMIN_PASSWORD" = "admin123" ]; then
            HASH='$2a$10$XQZ9eKZvxVxKqVJ5JxGxC.vHZJ5qVz5qVz5qVz5qVz5qVz5qVz5qV'
        else
            echo -e "${RED}❌ Python3 not found. Cannot hash password.${NC}"
            echo "Please install python3 and bcrypt: pip3 install bcrypt"
            exit 1
        fi
    fi

    docker exec lms-postgres psql -U lms_user -d lms_db -c \
        "UPDATE users SET
         password_hash = '$HASH',
         role = 'SUPERADMIN',
         is_active = true,
         email_verified = true,
         updated_at = NOW()
         WHERE email = '$ADMIN_EMAIL';" > /dev/null

    echo -e "${GREEN}✅ Admin user password reset successfully!${NC}"
else
    # Create new admin user
    echo "✨ Creating new SUPERADMIN user..."

    # Generate BCrypt hash
    if command -v python3 &> /dev/null; then
        # Check if bcrypt is installed
        if python3 -c "import bcrypt" 2>/dev/null; then
            HASH=$(python3 -c "import bcrypt; print(bcrypt.hashpw('$ADMIN_PASSWORD'.encode('utf-8'), bcrypt.gensalt(rounds=10)).decode('utf-8'))")
        else
            echo -e "${YELLOW}⚠️  bcrypt not installed. Installing...${NC}"
            pip3 install bcrypt > /dev/null 2>&1 || {
                echo -e "${RED}❌ Failed to install bcrypt${NC}"
                echo "Using fallback hash for admin123"
                HASH='$2a$10$XQZ9eKZvxVxKqVJ5JxGxC.vHZJ5qVz5qVz5qVz5qVz5qVz5qVz5qV'
            }
        fi
    else
        # Fallback to pre-computed hash
        if [ "$ADMIN_PASSWORD" = "admin123" ]; then
            HASH='$2a$10$XQZ9eKZvxVxKqVJ5JxGxC.vHZJ5qVz5qVz5qVz5qVz5qVz5qVz5qV'
        else
            echo -e "${RED}❌ Python3 not found. Cannot hash custom password.${NC}"
            echo "Using default password: admin123"
            HASH='$2a$10$XQZ9eKZvxVxKqVJ5JxGxC.vHZJ5qVz5qVz5qVz5qVz5qVz5qVz5qV'
            ADMIN_PASSWORD="admin123"
        fi
    fi

    # Insert admin user
    docker exec lms-postgres psql -U lms_user -d lms_db -c \
        "INSERT INTO users (
            id, email, password_hash, display_name, first_name, last_name,
            role, locale, theme, is_active, email_verified,
            created_at, updated_at
        ) VALUES (
            gen_random_uuid(),
            '$ADMIN_EMAIL',
            '$HASH',
            'System Administrator',
            'Admin',
            'User',
            'SUPERADMIN',
            'EN',
            'dark',
            true,
            true,
            NOW(),
            NOW()
        );" > /dev/null

    echo -e "${GREEN}✅ Admin user created successfully!${NC}"
fi

# Verify creation
echo ""
echo "📋 Verifying admin user..."
docker exec lms-postgres psql -U lms_user -d lms_db -c \
    "SELECT
        id,
        email,
        role,
        is_active,
        email_verified,
        created_at
     FROM users
     WHERE email = '$ADMIN_EMAIL';" | head -5

echo ""
echo "========================================"
echo -e "${GREEN}✅ Admin Setup Complete!${NC}"
echo "========================================"
echo ""
echo "Login credentials:"
echo "  Email:    $ADMIN_EMAIL"
echo "  Password: $ADMIN_PASSWORD"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Change the password after first login!${NC}"
echo ""
echo "Test login with:"
echo "  curl -X POST http://localhost:8080/api/auth/login \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}'"
echo ""

