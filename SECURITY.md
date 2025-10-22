# 🔒 Security Guide - LMS Project

## ✅ Implemented Security Features

### 1. **Authentication & Authorization**
- ✅ JWT tokens stored in **HttpOnly cookies** (not localStorage)
- ✅ Automatic token refresh mechanism
- ✅ Cookie-based authentication with CSRF protection
- ✅ Secure password hashing with Django's PBKDF2

### 2. **Rate Limiting**
- ✅ API endpoints: 100 req/min/IP
- ✅ Auth endpoints: 5 req/15min/IP (brute-force protection)
- ✅ File uploads: 10 req/hour/user

### 3. **Security Headers**
- ✅ Content-Security-Policy (CSP)
- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options: DENY
- ✅ Strict-Transport-Security (HSTS)
- ✅ Referrer-Policy
- ✅ Permissions-Policy

### 4. **Input Validation & Sanitization**
- ✅ DOMPurify for HTML sanitization in frontend
- ✅ Django REST Framework serializers for backend validation
- ✅ No dangerous functions: eval, exec, shell=True

### 5. **CORS & CSRF Protection**
- ✅ Whitelist-based CORS configuration
- ✅ Credentials allowed only for trusted origins
- ✅ CSRF tokens for state-changing operations

### 6. **Secrets Management**
- ✅ Environment variables for all secrets
- ✅ `.env` files in `.gitignore`
- ✅ `secrets.token_urlsafe()` for key generation
- ✅ `.env.example` templates provided

---

## 🚀 Setup Instructions

### 1. **Backend Setup**
```bash
cd backend
cp .env.example .env
# Edit .env and set secure values:
# - Generate SECRET_KEY: python -c "import secrets; print(secrets.token_urlsafe(50))"
# - Set strong DB_PASSWORD
# - Configure EMAIL_* settings
# - Set DEBUG=False for production
```

### 2. **Frontend Setup**
```bash
cd frontend
cp .env.example .env
# Edit .env:
# - Set REACT_APP_API_URL to your backend URL
```

### 3. **Docker Setup**
```bash
# In root directory:
cp .env.example .env
# Edit .env and set DB_PASSWORD
```

---

## 🔧 Production Deployment Checklist

### Environment Variables
- [ ] Set `DEBUG=False` in backend/.env
- [ ] Generate secure `SECRET_KEY` (50+ random characters)
- [ ] Set strong database password
- [ ] Configure email credentials
- [ ] Update `ALLOWED_HOSTS` with your domain
- [ ] Update `CORS_ALLOWED_ORIGINS` with your frontend URL
- [ ] Update `CSRF_TRUSTED_ORIGINS` with your frontend URL
- [ ] Set AWS S3 credentials if using cloud storage

### HTTPS Configuration
- [ ] Enable `SECURE_SSL_REDIRECT=True` (automatic when DEBUG=False)
- [ ] Set `SESSION_COOKIE_SECURE=True` (automatic when DEBUG=False)
- [ ] Set `CSRF_COOKIE_SECURE=True` (automatic when DEBUG=False)
- [ ] Configure reverse proxy (nginx/Apache) with SSL certificate

### Database
- [ ] Use PostgreSQL in production (not SQLite)
- [ ] Enable database backups
- [ ] Use strong database passwords
- [ ] Restrict database access to backend only

### Monitoring & Logging
- [ ] Enable audit logging middleware in settings.py
- [ ] Set up log rotation
- [ ] Monitor failed login attempts
- [ ] Set up error tracking (Sentry, etc.)

### Dependencies
- [ ] Run `pip-audit` to check Python dependencies
- [ ] Run `npm audit` to check Node.js dependencies
- [ ] Keep dependencies updated

---

## 🛡️ Security Best Practices

### For Developers

1. **Never commit secrets**
   - Always use `.env` files
   - Check `.gitignore` before committing
   - Use `git-secrets` or `detect-secrets` tools

2. **Input validation**
   - Validate all user input on backend
   - Sanitize HTML with DOMPurify on frontend
   - Use Django serializers for validation

3. **SQL Injection Prevention**
   - Always use Django ORM (not raw SQL)
   - If raw SQL needed, use parameterized queries

4. **XSS Prevention**
   - Use `DOMPurify.sanitize()` before rendering HTML
   - Avoid `dangerouslySetInnerHTML` when possible
   - CSP headers block inline scripts

5. **CSRF Prevention**
   - CSRF tokens automatically included in API requests
   - Use `@csrf_exempt` only when absolutely necessary

6. **File Upload Security**
   - Validate file types and sizes
   - Store uploads outside web root
   - Scan files for malware in production

---

## 🔍 Security Scanning

### Python Backend
```bash
# Dependency vulnerabilities
pip install pip-audit safety
pip-audit -r requirements.txt
safety check -r requirements.txt

# Code security issues
pip install bandit
bandit -r backend/ -x tests,venv

# General security scanner
pip install semgrep
semgrep --config=p/owasp-top-ten backend/
```

### JavaScript Frontend
```bash
# Dependency vulnerabilities
npm audit --audit-level=high
npm audit fix

# Outdated/vulnerable libraries
npx retire --path frontend/
```

### Secrets Detection
```bash
pip install detect-secrets
detect-secrets scan > .secrets.baseline
detect-secrets audit .secrets.baseline
```

---

## 📝 Known Security Considerations

### 1. **dangerouslySetInnerHTML in RichTextEditor**
- **Status**: ✅ Safe
- **Reason**: HTML is sanitized with DOMPurify before rendering
- **Location**: `frontend/src/components/RichTextEditor.tsx:175`

### 2. **localStorage usage**
- **Status**: ✅ Safe
- **Reason**: Only used for theme/language preferences (non-sensitive)
- **Auth tokens**: Stored in HttpOnly cookies (not localStorage)

### 3. **Docker Compose Passwords**
- **Status**: ✅ Fixed
- **Reason**: Now uses environment variables from .env file

---

## 🚨 Reporting Security Issues

If you discover a security vulnerability, please email: **security@your-domain.com**

**Do NOT** open a public GitHub issue for security vulnerabilities.

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Django Security](https://docs.djangoproject.com/en/stable/topics/security/)
- [React Security Best Practices](https://react.dev/learn/keeping-components-pure)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

Last Updated: October 22, 2025

