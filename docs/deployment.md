# Deployment Guide

LearnSystem is designed for a split deployment model to ensure scalability and production readiness.

## Deployment Overview

| Component | Provider | Domain | Root Directory |
| :--- | :--- | :--- | :--- |
| **Frontend** | Vercel | `app.learnsystem.app` | `apps/web` |
| **Landing** | Vercel / DO | `learnsystem.app` | `apps/landing` |
| **API Gateway** | DigitalOcean | `api.learnsystem.app` | `services/gateway` |
| **Microservices** | DigitalOcean | (Internal Only) | `services/*` |
| **Database/Auth** | Supabase | `<project>.supabase.co` | `supabase/` |

---

## 1. Supabase Setup

1. Create a new project at [Supabase](https://supabase.com).
2. Go to **Settings > API**:
   - Note your **Project URL**.
   - Note your **Publishable key** (`sb_publishable_...`).
   - Note your **Secret key** (`sb_secret_...`).
3. Construct your **JWKS URL**: `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`
4. Run migrations from the root:
   ```bash
   supabase link --project-ref your-project-ref
   supabase db push
   ```

---

## 2. Frontend Deployment (Vercel)

1. Connect your repository to Vercel.
2. Create a new project.
3. Set **Root Directory** to `apps/web`.
4. Configure Environment Variables:
   - `NEXT_PUBLIC_APP_URL`: `https://app.learnsystem.app`
   - `NEXT_PUBLIC_API_URL`: `https://api.learnsystem.app/api`
   - `NEXT_PUBLIC_SUPABASE_URL`: (From Supabase)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: (From Supabase)
5. Deploy.

---

## 3. Backend Deployment (DigitalOcean)

### Preparation
1. Create a DigitalOcean Droplet (Ubuntu 24.04, 4GB RAM minimum).
2. Install Docker and Docker Compose.

### Deployment
1. SSH into the Droplet.
2. Clone the repo to `/opt/learnsystem`.
3. Create a `.env` file in the root based on `config/env/.env.production.example`.
4. Update the values with real secrets.
5. Start the services:
   ```bash
   ./scripts/prod.sh
   ```

### Caddy / HTTPS
Caddy is included in the Docker Compose file. It will automatically provision an SSL certificate for `api.learnsystem.app`.

Ensure your domain's A record points to the Droplet's IP.

---

## 4. Production Security Checklist

- [ ] Hibernate `ddl-auto` is set to `validate`.
- [ ] No internal microservices (User, Learning, AI) have public `ports:` in Docker Compose.
- [ ] `SUPABASE_JWKS_URL` is set correctly.
- [ ] `SUPABASE_SECRET_KEY` is kept private and not exposed to frontend.
- [ ] CORS allowed origins in the Gateway match `https://app.learnsystem.app`.
- [ ] All sensitive files in Supabase Storage are protected by RLS or Java-controlled permits.
