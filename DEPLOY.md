# Deploying LearnSystemUCU

> **Last updated:** February 2026
> **Tested with:** Docker 27.x, Ubuntu 24.04 LTS, Supabase (Supavisor pooler), Groq API (llama-3.3-70b-versatile), Vercel (Vite framework preset), DigitalOcean App Platform

> **Branch note:** Deploy from the **`main`** branch. Its `docker-compose.yml` is production-ready (Supabase, tight memory limits, `restart: always`). The `dev` branch uses a local postgres container for local development.

---

## Choose Your Deployment Option

| | Option A: All-in-One | Option B: Split + Domain | Option C: Split + Vercel Proxy | Option D: App Platform (recommended) |
|---|---|---|---|---|
| **Frontend** | Docker/Nginx on Droplet | Vercel (free CDN) | Vercel (free CDN) | Vercel (free CDN) |
| **Backend** | DigitalOcean Droplet | DigitalOcean Droplet | DigitalOcean Droplet | DigitalOcean App Platform |
| **Database** | Supabase | Supabase | Supabase | Supabase |
| **HTTPS** | Not included | DuckDNS + Let's Encrypt | Handled by Vercel (no setup) | Automatic (managed SSL) |
| **Domain needed** | No | Yes (free or paid) | No | No (`.ondigitalocean.app` free) |
| **CORS config** | Not needed | Required | Not needed | Required (Vercel → App URL) |
| **Cost** | $24/mo | $24/mo | $24/mo | ~$72–84/mo |
| **CI/CD for frontend** | Manual rebuild | Auto (push → Vercel) | Auto (push → Vercel) | Auto (push → Vercel) |
| **CI/CD for backend** | Manual rebuild | Manual rebuild | Manual rebuild | Auto (push → App Platform) |
| **Server management** | You manage everything | You manage Droplet | You manage Droplet | Fully managed (zero ops) |
| **Best for** | Quick demo | Custom domain, full control | Cheapest split, no domain | Production, no server management |

**Option A** — everything on one Droplet (Steps 1–13A).
**Option B** — Vercel + DigitalOcean + own domain with HTTPS (Steps 1–7, then 8B–15B).
**Option C** — Vercel proxies API calls to DigitalOcean, no domain or HTTPS setup needed (Steps 1–7, then 8C–13C).
**Option D** — DigitalOcean App Platform (managed PaaS) + Vercel + Supabase. Auto HTTPS, auto-deploy, no servers ([jump to Option D](#option-d-digitalocean-app-platform--vercel--supabase)).

**Architecture — Option A (All-in-One):**
```
User Browser
    │
    ▼
DigitalOcean Droplet (Ubuntu 24.04)
┌──────────────────────────────────────────────┐
│  Nginx (:3000)  ──►  API Gateway (:8080)     │
│                       │                       │
│       ┌───────────────┼───────────────┐       │
│       ▼               ▼               ▼       │
│  User Service   Learning Service  AI Service  │
│    (:8081)        (:8089)          (:8085)     │
│       │               │               │       │
│       ▼               ▼               ▼       │
│  Analytics Service  Eureka Server   Redis     │
│    (:8088)           (:8761)                  │
└──────────────────────────────────────────────┘
        │
        ▼
   Supabase (PostgreSQL via Supavisor pooler)
```

**Architecture — Option B (Split + Domain):**
```
User Browser
    │
    ├── Static files ──► Vercel CDN  (your-app.vercel.app)
    │                     React build served globally
    │
    └── API calls ──────► https://api.yourdomain.com
                               │
                     nginx (HTTPS termination)
                               │
                     DigitalOcean Droplet
                     ┌─────────────────────────────┐
                     │  API Gateway (:8080)         │
                     │  User Service (:8081)        │
                     │  Learning Service (:8089)    │
                     │  AI Service (:8085)          │
                     │  Analytics Service (:8088)   │
                     │  Eureka (:8761) + Redis      │
                     └─────────────────────────────┘
                               │
                     Supabase (PostgreSQL)
```

**Architecture — Option C (Split + Vercel Proxy, recommended):**
```
User Browser
    │
    └── ALL requests ──► Vercel  (your-app.vercel.app)
                           │
                    ┌──────┴──────┐
                    │             │
              Static files    /api/* rewrites
              (React build)       │
                           Vercel proxies to
                           http://DROPLET_IP:8080
                                  │
                     DigitalOcean Droplet
                     ┌─────────────────────────────┐
                     │  API Gateway (:8080)         │
                     │  User Service (:8081)        │
                     │  Learning Service (:8089)    │
                     │  AI Service (:8085)          │
                     │  Analytics Service (:8088)   │
                     │  Eureka (:8761) + Redis      │
                     └─────────────────────────────┘
                               │
                     Supabase (PostgreSQL)
```
**Architecture — Option D (App Platform + Vercel, recommended):**
```
User Browser
    │
    ├── Static files ──► Vercel CDN  (your-app.vercel.app)
    │                     React build served globally
    │
    └── API calls ──────► https://your-app.ondigitalocean.app
                               │  (automatic HTTPS, managed SSL)
                    DigitalOcean App Platform
                    ┌─────────────────────────────────────┐
                    │  api-gateway (public, :8080)         │
                    │       │                              │
                    │  ┌────┴──────────────────────┐       │
                    │  ▼         ▼          ▼      ▼       │
                    │ user    learning    ai    analytics   │
                    │ (:8081) (:8089)   (:8085) (:8088)    │
                    │  └────┬──────────────────────┘       │
                    │       ▼                              │
                    │  eureka-server (:8761) + Redis (managed) │
                    └─────────────────────────────────────┘
                               │
                    Supabase (PostgreSQL via Supavisor pooler)
```
> **Why Option D:** All API calls are HTTPS automatically — App Platform provides managed SSL certificates with zero config. Auto-deploy on `git push`. No SSH, no Docker, no server management. Trade-off: ~3x more expensive than a Droplet ($72–84/mo vs $24/mo).

> **Why Option C is simplest:** The browser only ever talks to Vercel (HTTPS by default). Vercel's edge network proxies `/api/*` requests to your Droplet over HTTP server-side. No CORS issues (same origin), no SSL certificates to manage, no domain to configure.

---

## Shared Setup (both options)

**What you'll need:**
- A DigitalOcean account
- A Supabase account (free tier works)
- A Groq API key (free tier works)
- An SSH client (Terminal on Mac/Linux, or PuTTY / Windows Terminal on Windows)
- **(Option B only)** A Vercel account (free) and a domain name (free via [DuckDNS](https://www.duckdns.org/))
- **(Option C only)** A Vercel account (free) — no domain needed
- **(Option D only)** A Vercel account (free) — App Platform provides HTTPS automatically

**Estimated time:** ~30 minutes (Option A) · ~45 minutes (Option B) · ~35 minutes (Option C) · ~20 minutes (Option D)

> **Option D users:** You only need Steps 1, 3, and 4 from the shared setup below (Supabase, Groq key, JWT secret). Skip Steps 2, 5, 6, 7 (those are Droplet-specific). Then jump to [Option D](#option-d-digitalocean-app-platform--vercel--supabase).

---

## Step 1: Create a Supabase Project

### 1a. Sign up / Sign in

1. Go to [supabase.com](https://supabase.com)
2. Click **Start your project** (or **Sign In** if you already have an account)
3. You can sign up with GitHub, or with email + password

### 1b. Create a new project

4. Once signed in, you'll land on the **Dashboard** at `supabase.com/dashboard`
5. Click the **New Project** button
6. If prompted, select your **Organization** (Supabase creates a default "Personal" org)
7. Fill in the form:

| Field | What to enter |
|-------|---------------|
| **Project name** | `learnsystem-lms` (or anything you like) |
| **Database Password** | Click **Generate a password** or type a strong one. **Copy and save this password now** — you'll need it later and it won't be shown again |
| **Region** | Pick the one closest to your DigitalOcean Droplet. E.g., if your Droplet is in New York, pick **US East (N. Virginia)** |
| **Pricing Plan** | **Free** is fine to start |

8. Click **Create new project**
9. Wait ~2 minutes for provisioning. You'll see a progress screen — once it finishes, you'll be on the project home page

### 1c. Get database connection details

10. At the top of your project page, find and click the **Connect** button (top-right area, next to the project name)
11. A panel opens showing connection options. You'll see tabs or sections for different connection types
12. Select **Transaction pooler** — this is the mode we need (it uses Supavisor and port `6543`)
13. You should see a connection string that looks like:
    ```
    postgresql://postgres.abcdefghijklmnop:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
    ```
14. Extract these values from the connection string and write them down:

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
               │     │       │    │      │
               │     │       │    │      └── SUPABASE_DB_NAME   = postgres
               │     │       │    └───────── SUPABASE_DB_PORT   = 6543
               │     │       └────────────── SUPABASE_DB_HOST   = aws-0-us-east-1.pooler.supabase.com
               │     └───────────────────── SUPABASE_DB_PASSWORD = (your password from step 7)
               └─────────────────────────── SUPABASE_DB_USER    = postgres.abcdefghijklmnop
```

> **Tip:** You can also copy the full URI string and extract the parts. The `Connect` panel often has a "Copy" button.

### 1d. Quick summary — what you should have now

Write these 5 values somewhere (a text file, a note, etc.):

```
SUPABASE_DB_HOST=aws-0-us-east-1.pooler.supabase.com   ← your actual host
SUPABASE_DB_PORT=6543
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres.abcdefghijklmnop              ← your actual user
SUPABASE_DB_PASSWORD=YourPasswordHere                   ← your actual password
```

> **Why Transaction pooler (port 6543)?** Supabase uses **Supavisor** as its connection pooler. Transaction mode multiplexes connections efficiently. We run 4 backend services, each with a HikariCP pool of 5-10 connections — without the pooler, you'd hit Supabase's direct connection limits (especially on the free tier, which allows ~60 direct connections). Don't use port `5432` (direct/session mode) for this deployment.

> **Free tier limits:** 500 MB database storage, auto-pauses after 7 days of inactivity (your data is preserved — see troubleshooting section).

---

## Step 2: Create a DigitalOcean Droplet

1. Go to [cloud.digitalocean.com](https://cloud.digitalocean.com) and sign in
2. Click **Create** → **Droplets**
3. Configure:

| Setting | Value |
|---------|-------|
| **Region** | Same region as Supabase (e.g., **New York - NYC1**) |
| **Image** | **Ubuntu 24.04 (LTS)** |
| **Size** | **4 GB RAM / 2 vCPU / 80 GB SSD** ($24/mo) minimum. **8 GB / 4 vCPU / 160 GB SSD** ($48/mo) recommended |
| **Authentication** | **SSH Key** (add your public key if you haven't already) |
| **Hostname** | `learnsystem-lms` (or any name) |

4. Click **Create Droplet**
5. Wait for it to be created (~1 minute)
6. **Copy the Droplet's IP address** from the dashboard

> **Why 4GB minimum?** The app runs 7–8 containers (5 Java services + Eureka + Redis + optionally Nginx). Each Spring Boot service needs 384-768 MB of RAM. Memory limits in `docker-compose.yml` total ~3.3 GB. With 4 GB you're tight but it works. 8 GB gives comfortable headroom for build-time Docker layer caching and JVM overhead.

> **Disk note:** First build downloads ~2 GB of Maven dependencies and Docker base images. The 80 GB disk on the $24 plan is more than sufficient.

---

## Step 3: Get a Groq API Key

1. Go to [console.groq.com/keys](https://console.groq.com/keys)
2. Sign in (or create an account)
3. Click **Create API Key**
4. Give it a name (e.g., `learnsystem-lms`)
5. **Copy the API key** — you can only see it once

The default model is `llama-3.3-70b-versatile` (131K context, ~280 tokens/sec on Groq). Other available models:
- `llama-3.1-8b-instant` — faster, lower quality
- `meta-llama/llama-4-scout-17b-16e-instruct` — newer, currently in preview

The Groq free tier is rate-limited but sufficient for light use (a few dozen requests per minute).

---

## Step 4: Generate a JWT Secret

On your local machine (Mac/Linux), run:

```bash
openssl rand -base64 64
```

This outputs a long random string like:
```
a3Bf9k2Lm8Np4Qr1St6Uv0Wx5Yz7Ab3Cd9Ef2Gh8Ij4Kl0Mn6Op1Qr5St8Uv3Wx9Yz2Ab7Cd4Ef0Gh6Ij1Kl5Mn8Op
```

**Copy it and save it.** This will be your JWT signing secret. It must be at least 256 bits (32 bytes) for HS256 — the base64 output above is 64 bytes, which is plenty.

> On Windows (PowerShell): `[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])`

---

## Step 5: SSH into the Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

Replace `YOUR_DROPLET_IP` with the IP you copied in Step 2 (e.g., `164.92.105.42`).

If this is your first time connecting, type `yes` when asked about the fingerprint.

---

## Step 6: Install Docker

Run these commands one block at a time on the Droplet:

```bash
# Update the system
apt-get update && apt-get upgrade -y
```

```bash
# Install prerequisites
apt-get install -y ca-certificates curl
```

```bash
# Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
```

```bash
# Add Docker repository (DEB822 format — current as of 2025+)
tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF
```

```bash
# Install Docker Engine + Compose plugin
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Verify it works:

```bash
docker --version
docker compose version
```

You should see something like `Docker version 27.x.x` and `Docker Compose version v2.x.x`.

> Docker starts automatically after installation on Ubuntu 24.04. No need to run `systemctl enable docker` manually.

---

## Step 7: Clone the Repository

```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/LearnSystemUCU.git lms
cd /opt/lms
```

Replace the URL with your actual GitHub repository URL.

> **If the repo is private**, you have two options:
> - **HTTPS + personal access token:** `git clone https://YOUR_TOKEN@github.com/YOUR_USERNAME/LearnSystemUCU.git lms` — generate a token at [github.com/settings/tokens](https://github.com/settings/tokens) with `repo` scope
> - **SSH key on the Droplet:**
>   ```bash
>   ssh-keygen -t ed25519 -C "droplet" -f ~/.ssh/id_ed25519 -N ""
>   cat ~/.ssh/id_ed25519.pub
>   ```
>   Copy the output and add it at [github.com/settings/ssh/new](https://github.com/settings/ssh/new), then clone via SSH: `git clone git@github.com:YOUR_USERNAME/LearnSystemUCU.git lms`

---

# Option A: All-in-One Deployment

> Everything runs on the single DigitalOcean Droplet — backend services **and** the frontend (served by an Nginx container on port 3000). Skip to [Option B](#option-b-split-deployment--vercel-frontend--digitalocean-backend) if you want the frontend on Vercel.

## Step 8A: Create the Production Environment File

```bash
cp .env.production.example .env.production
nano .env.production
```

Fill in **every value** with the credentials you gathered in Steps 1-4:

```env
# ==========================================
# SUPABASE DATABASE
# ==========================================
SUPABASE_DB_HOST=aws-0-us-east-1.pooler.supabase.com    # ← from Step 1
SUPABASE_DB_PORT=6543
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres.abcdefghijklmnop               # ← from Step 1
SUPABASE_DB_PASSWORD=YourSupabasePasswordHere             # ← from Step 1

# ==========================================
# SECURITY
# ==========================================
JWT_SECRET=paste-your-openssl-output-here                 # ← from Step 4
JWT_EXPIRATION=86400000

# ==========================================
# AI SERVICE (Groq)
# ==========================================
LLAMA_API_URL=https://api.groq.com/openai/v1
LLAMA_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx                    # ← from Step 3
LLAMA_MODEL=llama-3.3-70b-versatile

# ==========================================
# BOOTSTRAP ADMIN
# ==========================================
BOOTSTRAP_ADMIN_ENABLED=true                              # ← true for FIRST deploy
BOOTSTRAP_ADMIN_EMAIL=admin@ucu.edu.ua                    # ← change if desired
BOOTSTRAP_ADMIN_PASSWORD=YourStrongAdminPassword123!      # ← CHANGE THIS

# ==========================================
# CORS (leave default for all-in-one)
# ==========================================
GATEWAY_CORS_ALLOWED_ORIGINS=http://localhost:3000
```

Save and exit: press `Ctrl+O`, `Enter`, `Ctrl+X`.

> **Double-check** there are no extra spaces around the `=` signs and no trailing whitespace. Env parsing is sensitive to this.

---

## Step 9A: Build and Start the Application

```bash
cd /opt/lms
docker compose --env-file .env.production up -d --build
```

This will:
1. Build 6 Docker images (5 Java services + 1 frontend) — **takes 10-20 minutes** on the first run (Maven downloads ~1.5 GB of dependencies)
2. Pull Redis 7 Alpine and other base images
3. Start all 8 containers

You can watch the build progress with:

```bash
docker compose --env-file .env.production logs -f --tail=50
```

Press `Ctrl+C` to stop watching logs (the containers keep running).

> **Subsequent builds are fast** (~2-3 minutes) because Docker caches Maven dependencies and base image layers. Only changed code gets recompiled.

---

## Step 10A: Wait for Services to Start

After the build finishes, the Java services need 2-4 minutes to start up (Eureka registration, Flyway migrations, Spring context initialization). Check their status:

```bash
docker compose --env-file .env.production ps
```

Wait until all services show **"healthy"** in the STATUS column:

```
NAME                   STATUS
lms-redis              Up (healthy)
lms-eureka-server      Up (healthy)
lms-user-service       Up (healthy)
lms-learning-service   Up (healthy)
lms-ai-service         Up (healthy)
lms-analytics-service  Up (healthy)
lms-api-gateway        Up (healthy)
lms-frontend           Up (healthy)
```

If a service shows `(health: starting)`, wait and re-run the `ps` command in a minute. The start order is: Redis → Eureka → all backend services → Gateway → Frontend.

---

## Step 11A: Verify the Deployment

### Test from the Droplet

```bash
# Frontend loads
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# Should print: 200

# API Gateway is up
curl -s http://localhost:8080/actuator/health
# Should print: {"status":"UP"}

# Eureka dashboard
curl -s -o /dev/null -w "%{http_code}" http://localhost:8761
# Should print: 200
```

### Test from your browser

Open these URLs (replace `YOUR_DROPLET_IP` with your actual IP):

| URL | What you should see |
|-----|---------------------|
| `http://YOUR_DROPLET_IP:3000` | LMS login page |
| `http://YOUR_DROPLET_IP:8761` | Eureka dashboard showing 5 registered services |
| `http://YOUR_DROPLET_IP:8080/actuator/health` | `{"status":"UP"}` |

### Log in

1. Go to `http://YOUR_DROPLET_IP:3000`
2. Log in with the admin credentials you set in Step 8A:
   - **Email:** `admin@ucu.edu.ua` (or what you configured for `BOOTSTRAP_ADMIN_EMAIL`)
   - **Password:** what you set for `BOOTSTRAP_ADMIN_PASSWORD`

> If login fails, check user-service logs: `docker logs lms-user-service --tail=50`. Look for "Bootstrap admin created" to confirm the admin account was initialized.

---

## Step 12A: Disable Bootstrap Admin

After your first successful login, disable the bootstrap admin so it doesn't try to recreate the account on every restart:

```bash
cd /opt/lms
nano .env.production
```

Change:
```
BOOTSTRAP_ADMIN_ENABLED=false
```

Then restart the user service to pick up the change:

```bash
docker compose --env-file .env.production restart user-service
```

---

## Step 13A: Configure Firewall

DigitalOcean Droplets have all ports open by default. You should restrict access.

### DigitalOcean Cloud Firewall (recommended)

1. Go to **Networking** → **Firewalls** in the DigitalOcean dashboard
2. Create a firewall with these **inbound rules**:

| Type | Port | Source |
|------|------|--------|
| SSH | 22 | Your IP (or All) |
| Custom | 3000 | All IPv4, All IPv6 |
| Custom | 8080 | All IPv4, All IPv6 |

3. Apply it to your Droplet

### Alternative: UFW (on the Droplet)

```bash
ufw allow 22/tcp     # SSH
ufw allow 3000/tcp   # Frontend
ufw allow 8080/tcp   # API Gateway
ufw --force enable
```

> **Do NOT expose** ports 8081, 8085, 8088, 8089, or 8761 publicly — they are only used internally between Docker containers on the bridge network. If you need the Eureka dashboard for debugging, temporarily allow `8761` and remove it afterward.

**You're done with Option A!** Skip to [Everyday Operations](#everyday-operations).

---

# Option B: Split Deployment — Vercel Frontend + DigitalOcean Backend

> Frontend on Vercel (free CDN, auto-deploy on push), backend on DigitalOcean, database on Supabase. This section assumes you've completed **Steps 1–7** above.

### Why HTTPS is required

Vercel serves your frontend over `https://`. Modern browsers block API calls from HTTPS pages to plain HTTP endpoints (mixed content policy). You **must** serve the API over HTTPS too. We'll use a free domain (DuckDNS) + free SSL certificate (Let's Encrypt).

---

## Step 8B: Get a Free Domain (DuckDNS)

1. Go to [duckdns.org](https://www.duckdns.org/)
2. Sign in with GitHub (or another provider)
3. In the **sub domain** field, type a name for your API, e.g. `learnsystem-api`
4. Click **add domain** — this gives you `learnsystem-api.duckdns.org`
5. In the **current ip** field, enter your **Droplet IP** from Step 2
6. Click **update ip**

Write down your domain: `API_DOMAIN=learnsystem-api.duckdns.org`

> DuckDNS is free forever, no credit card required, no expiration. Alternatively, you can buy a domain from Namecheap (~$10/year) and point its A record to the Droplet IP.

---

## Step 9B: Create the Production Environment File

```bash
cd /opt/lms
cp .env.production.example .env.production
nano .env.production
```

Fill in **every value**. Note the extra `GATEWAY_CORS_ALLOWED_ORIGINS` line at the bottom — you'll update this with your Vercel URL in Step 14B:

```env
# ==========================================
# SUPABASE DATABASE
# ==========================================
SUPABASE_DB_HOST=aws-0-us-east-1.pooler.supabase.com    # ← from Step 1
SUPABASE_DB_PORT=6543
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres.abcdefghijklmnop               # ← from Step 1
SUPABASE_DB_PASSWORD=YourSupabasePasswordHere             # ← from Step 1

# ==========================================
# SECURITY
# ==========================================
JWT_SECRET=paste-your-openssl-output-here                 # ← from Step 4
JWT_EXPIRATION=86400000

# ==========================================
# AI SERVICE (Groq)
# ==========================================
LLAMA_API_URL=https://api.groq.com/openai/v1
LLAMA_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx                    # ← from Step 3
LLAMA_MODEL=llama-3.3-70b-versatile

# ==========================================
# BOOTSTRAP ADMIN
# ==========================================
BOOTSTRAP_ADMIN_ENABLED=true                              # ← true for FIRST deploy only
BOOTSTRAP_ADMIN_EMAIL=admin@ucu.edu.ua
BOOTSTRAP_ADMIN_PASSWORD=YourStrongAdminPassword123!      # ← CHANGE THIS

# ==========================================
# CORS — Vercel frontend URL
# ==========================================
# Leave as placeholder for now. Update with your actual Vercel URL in Step 14B.
GATEWAY_CORS_ALLOWED_ORIGINS=https://placeholder.vercel.app
```

Save and exit: `Ctrl+O`, `Enter`, `Ctrl+X`.

---

## Step 10B: Disable the Frontend Container

Since the frontend will be on Vercel, you don't need the Nginx frontend container on the Droplet. Comment it out to save ~128 MB of RAM:

```bash
nano /opt/lms/docker-compose.yml
```

Find the `frontend:` service block (near the bottom) and comment out every line of it with `#`:

```yaml
  # ==========================================
  # FRONTEND (disabled — hosted on Vercel)
  # ==========================================

  # frontend:
  #   build:
  #     context: ./frontend
  #     dockerfile: Dockerfile
  #   container_name: lms-frontend
  #   restart: always
  #   ports:
  #     - "3000:80"
  #   depends_on:
  #     - api-gateway
  #   networks:
  #     - lms-network
  #   healthcheck:
  #     test: ["CMD", "curl", "-f", "http://localhost/health"]
  #     interval: 30s
  #     timeout: 3s
  #     retries: 3
  #     start_period: 10s
  #   deploy:
  #     resources:
  #       limits:
  #         memory: 128M
```

Save and exit.

> **Don't commit this change** — it's a local-only override for your Droplet. The repo keeps the frontend service for Option A users.

---

## Step 11B: Build and Start the Backend

```bash
cd /opt/lms
docker compose --env-file .env.production up -d --build
```

First build takes 10-20 minutes. Watch progress:

```bash
docker compose --env-file .env.production logs -f --tail=50
```

Wait until all services show **healthy** (no `lms-frontend` this time):

```bash
docker compose --env-file .env.production ps
```

```
NAME                   STATUS
lms-redis              Up (healthy)
lms-eureka-server      Up (healthy)
lms-user-service       Up (healthy)
lms-learning-service   Up (healthy)
lms-ai-service         Up (healthy)
lms-analytics-service  Up (healthy)
lms-api-gateway        Up (healthy)
```

Quick sanity check:

```bash
curl http://localhost:8080/actuator/health
# Expected: {"status":"UP"}
```

---

## Step 12B: Set Up HTTPS with nginx + Let's Encrypt

### 12B-a. Install nginx and certbot

```bash
apt-get install -y nginx certbot python3-certbot-nginx
```

### 12B-b. Create nginx config for your API domain

```bash
nano /etc/nginx/sites-available/lms-api
```

Paste this (replace `learnsystem-api.duckdns.org` with your domain from Step 8B):

```nginx
server {
    listen 80;
    server_name learnsystem-api.duckdns.org;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

Enable the site and reload:

```bash
ln -s /etc/nginx/sites-available/lms-api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default    # remove the default "Welcome to nginx" page
nginx -t && systemctl reload nginx
```

### 12B-c. Open ports 80 and 443 in the firewall

Before certbot can verify your domain, ports 80 and 443 must be open.

**DigitalOcean Cloud Firewall:**

| Type | Port | Source |
|------|------|--------|
| SSH | 22 | Your IP |
| HTTP | 80 | All IPv4, All IPv6 |
| HTTPS | 443 | All IPv4, All IPv6 |

**Or UFW:**

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

> **Do NOT expose** ports 3000, 8080, 8081, 8085, 8088, 8089, or 8761. The API is served through nginx on 443, not directly on 8080.

### 12B-d. Get a free SSL certificate

```bash
certbot --nginx -d learnsystem-api.duckdns.org
```

Follow the prompts:
- Enter your email (for renewal notices)
- Agree to the ToS
- Certbot automatically configures HTTPS in nginx and sets up auto-renewal

### 12B-e. Verify HTTPS works

```bash
curl https://learnsystem-api.duckdns.org/actuator/health
# Expected: {"status":"UP"}
```

Open in your browser too: `https://learnsystem-api.duckdns.org/actuator/health` — should show `{"status":"UP"}`.

> **SSL auto-renewal:** Certbot installs a systemd timer that auto-renews certificates before they expire (every 90 days). No action needed. You can verify with: `certbot renew --dry-run`

---

## Step 13B: Deploy Frontend on Vercel

### 13B-a. Push latest code to GitHub

On your **local machine** (not the Droplet):

```bash
cd /path/to/LearnSystemUCU
git push origin main
```

### 13B-b. Import project on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository** → connect your GitHub account → select `LearnSystemUCU`
3. Vercel will detect it as a monorepo. Configure the project:

| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend` (click "Edit" and type `frontend`) |
| **Framework Preset** | Vite (auto-detected) |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

4. **Add Environment Variables** (expand the "Environment Variables" section before clicking Deploy):

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://learnsystem-api.duckdns.org/api` |
| `VITE_AI_SERVICE_URL` | `https://learnsystem-api.duckdns.org/api/ai` |

> **Critical:** `VITE_API_URL` must end with `/api` because the frontend's API client appends paths like `/auth/login`, `/users`, etc. The full request URL will be `https://learnsystem-api.duckdns.org/api/auth/login`.

5. Click **Deploy**

6. Wait 1-2 minutes for the build. Vercel will show you a deployment URL like:
   ```
   https://learn-system-ucu.vercel.app
   ```

7. **Copy this URL** — you need it for the next step.

> **Auto-deploy:** From now on, every push to `main` on GitHub automatically triggers a new Vercel deployment. No manual rebuild needed for frontend changes.

---

## Step 14B: Wire Together — Update CORS

Now that you have the Vercel URL, go back to the Droplet and update the CORS config.

### 14B-a. Update `.env.production`

```bash
ssh root@YOUR_DROPLET_IP
nano /opt/lms/.env.production
```

Replace the placeholder CORS line with your actual Vercel URL (no trailing slash):

```env
GATEWAY_CORS_ALLOWED_ORIGINS=https://learn-system-ucu.vercel.app
```

If you later add a custom domain on Vercel, add it too (comma-separated):

```env
GATEWAY_CORS_ALLOWED_ORIGINS=https://learn-system-ucu.vercel.app,https://lms.yourdomain.com
```

Save and exit.

### 14B-b. Restart the API gateway

```bash
cd /opt/lms
docker compose --env-file .env.production restart api-gateway
```

Wait ~30 seconds, then verify CORS works:

```bash
curl -H "Origin: https://learn-system-ucu.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://learnsystem-api.duckdns.org/api/auth/login \
     -v 2>&1 | grep -i "access-control"
```

You should see headers like:
```
< Access-Control-Allow-Origin: https://learn-system-ucu.vercel.app
< Access-Control-Allow-Methods: GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD
```

---

## Step 15B: Verify and Finalize

### 15B-a. Test in browser

1. Open your Vercel URL: `https://learn-system-ucu.vercel.app`
2. You should see the LMS login page
3. Log in with:
   - **Email:** `admin@ucu.edu.ua`
   - **Password:** what you set for `BOOTSTRAP_ADMIN_PASSWORD`
4. Navigate around — create a course, check analytics, test AI features

### 15B-b. If login fails — debug checklist

| Symptom | Check |
|---------|-------|
| Network error / request failed | Open DevTools → Network tab. Are requests going to your API domain? Check `VITE_API_URL` in Vercel dashboard |
| CORS error | Check `GATEWAY_CORS_ALLOWED_ORIGINS` matches your Vercel URL exactly (including `https://`, no trailing slash) |
| 502 Bad Gateway | nginx can't reach the API gateway. Check: `docker compose --env-file .env.production ps` — is `lms-api-gateway` healthy? |
| SSL error | Run `certbot renew --dry-run` to verify. Check: `curl https://YOUR_DOMAIN/actuator/health` from your local machine |
| Mixed content blocked | Your `VITE_API_URL` must start with `https://`, not `http://` |

### 15B-c. Disable bootstrap admin

After confirming login works:

```bash
nano /opt/lms/.env.production
```

Change:
```
BOOTSTRAP_ADMIN_ENABLED=false
```

Restart:
```bash
docker compose --env-file .env.production restart user-service
```

---

# Option C: Split Deployment — Vercel Proxy (no domain needed)

> Simplest split deployment. Vercel serves the frontend **and** proxies `/api/*` requests to your Droplet. The browser only talks to Vercel (HTTPS), so there's no CORS, no SSL certs, and no domain to set up on the Droplet.

> This section assumes you've completed **Steps 1–7** above.

---

## Step 8C: Create the Production Environment File

```bash
cd /opt/lms
cp .env.production.example .env.production
nano .env.production
```

Fill in the same values as Option A. You do **not** need `GATEWAY_CORS_ALLOWED_ORIGINS` — Vercel's proxy makes all API requests come from `localhost` on the Droplet:

```env
# ==========================================
# SUPABASE DATABASE
# ==========================================
SUPABASE_DB_HOST=aws-0-us-east-1.pooler.supabase.com    # ← from Step 1
SUPABASE_DB_PORT=6543
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres.abcdefghijklmnop               # ← from Step 1
SUPABASE_DB_PASSWORD=YourSupabasePasswordHere             # ← from Step 1

# ==========================================
# SECURITY
# ==========================================
JWT_SECRET=paste-your-openssl-output-here                 # ← from Step 4
JWT_EXPIRATION=86400000

# ==========================================
# AI SERVICE (Groq)
# ==========================================
LLAMA_API_URL=https://api.groq.com/openai/v1
LLAMA_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx                    # ← from Step 3
LLAMA_MODEL=llama-3.3-70b-versatile

# ==========================================
# BOOTSTRAP ADMIN
# ==========================================
BOOTSTRAP_ADMIN_ENABLED=true                              # ← true for FIRST deploy only
BOOTSTRAP_ADMIN_EMAIL=admin@ucu.edu.ua
BOOTSTRAP_ADMIN_PASSWORD=YourStrongAdminPassword123!      # ← CHANGE THIS
```

Save and exit: `Ctrl+O`, `Enter`, `Ctrl+X`.

---

## Step 9C: Disable the Frontend Container

Same as Step 10B — comment out the `frontend:` service block in `docker-compose.yml`:

```bash
nano /opt/lms/docker-compose.yml
```

Comment out the entire `frontend:` block with `#`. The frontend is on Vercel.

---

## Step 10C: Build and Start the Backend

```bash
cd /opt/lms
docker compose --env-file .env.production up -d --build
```

First build takes 10-20 minutes. Wait until all services show **healthy**:

```bash
docker compose --env-file .env.production ps
```

Quick sanity check:

```bash
curl http://localhost:8080/actuator/health
# Expected: {"status":"UP"}
```

---

## Step 11C: Firewall — Expose Port 8080

Vercel's edge servers need to reach your Droplet on port 8080. In the **DigitalOcean dashboard → Networking → Firewalls**:

| Type | Port | Source |
|------|------|--------|
| SSH | 22 | Your IP |
| Custom | 8080 | All IPv4, All IPv6 |

> Port 8080 serves plain HTTP. This is fine — Vercel's proxy connects server-side, and users never see this URL. Their browser only talks to `https://your-app.vercel.app`.

---

## Step 12C: Deploy Frontend on Vercel

### 12C-a. Push latest code to GitHub

On your **local machine**:

```bash
git push origin main
```

### 12C-b. Import project on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository** → connect GitHub → select `LearnSystemUCU`
3. Configure:

| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend` |
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

4. **Add Environment Variables** (expand the section before clicking Deploy):

| Name | Value |
|------|-------|
| `BACKEND_URL` | `YOUR_DROPLET_IP:8080` (e.g. `164.92.105.42:8080`) |

> **Do NOT set `VITE_API_URL`** — leave it unset. The frontend defaults to `/api` (same-origin), and `vercel.json` rewrites `/api/*` to your Droplet. This is the key: the browser calls `https://your-app.vercel.app/api/auth/login`, Vercel proxies it to `http://164.92.105.42:8080/api/auth/login` server-side.

5. Click **Deploy**
6. Wait 1-2 minutes. Copy your Vercel URL: `https://your-app.vercel.app`

### How the rewrite works

The `frontend/vercel.json` file contains:
```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "http://${BACKEND_URL}/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- `/api/auth/login` → proxied to `http://DROPLET_IP:8080/api/auth/login`
- `/dashboard` → served as `index.html` (SPA routing)
- No CORS needed — the browser sees everything as same-origin (`your-app.vercel.app`)
- No HTTPS on the Droplet — Vercel handles HTTPS for the user, then talks HTTP to your backend

---

## Step 13C: Verify and Finalize

### 13C-a. Test in browser

1. Open `https://your-app.vercel.app`
2. Log in with `admin@ucu.edu.ua` / your bootstrap password
3. Navigate around — create a course, test AI features

### 13C-b. If something fails

| Symptom | Check |
|---------|-------|
| API calls return 500/502 | Vercel can't reach the Droplet. Check: is port 8080 open in the firewall? Is the API gateway healthy? (`docker logs lms-api-gateway --tail=50`) |
| API calls return 404 | The `BACKEND_URL` env var in Vercel might be wrong. Check Vercel dashboard → Settings → Environment Variables. It should be `YOUR_IP:8080` (no `http://`, no trailing slash) |
| Login works but other pages fail | Check that all backend services are healthy: `docker compose --env-file .env.production ps` |
| "FUNCTION_INVOCATION_TIMEOUT" | Vercel Hobby has a 10s timeout for rewrites. If a backend request takes longer (e.g., AI generation), it will time out. Consider upgrading to Vercel Pro ($20/mo, 60s timeout) or using Option B with a direct HTTPS connection |

### 13C-c. Disable bootstrap admin

After confirming login works:

```bash
nano /opt/lms/.env.production
# Change: BOOTSTRAP_ADMIN_ENABLED=false
docker compose --env-file .env.production restart user-service
```

---

### Updating with Option C

- **Frontend:** Push to `main` → Vercel auto-deploys. No action on the Droplet.
- **Backend:** SSH into Droplet → `cd /opt/lms && git pull && docker compose --env-file .env.production up -d --build`
- **Changed Droplet IP?** Update `BACKEND_URL` in Vercel dashboard → Settings → Environment Variables → Redeploy.

---

# Option D: DigitalOcean App Platform + Vercel + Supabase

> Fully managed backend on App Platform (automatic HTTPS, auto-deploy on push), frontend on Vercel, database on Supabase. **No servers to manage, no SSH, no Docker commands.** This section assumes you've completed **Steps 1, 3, and 4** above (Supabase project, Groq key, JWT secret).

> **Cost:** ~$72–84/mo for the backend. Each Spring Boot service runs as a separate App Platform component ($12/mo each for 1 GB RAM). This is ~3x more than a Droplet but you get zero ops.

---

## Step 8D: Create the App on DigitalOcean App Platform

### 8D-a. Push code to GitHub

Make sure your latest code is pushed:

```bash
git push origin main
```

### 8D-b. Create the app — Method A (CLI, recommended)

If you have `doctl` installed:

```bash
# Install: https://docs.digitalocean.com/reference/doctl/how-to/install/
doctl auth init                           # authenticate
doctl apps create --spec .do/app.yaml     # create app from spec
```

This creates the entire app with all 6 services + Redis from the spec file. Skip to [Step 8D-d](#8d-d-configure-environment-variables).

### 8D-c. Create the app — Method B (Dashboard UI)

The dashboard **does not auto-detect** the `.do/app.yaml` file. You need to add each component manually:

1. Go to [cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)
2. Click **Create App**
3. Select **GitHub** as the source → authorize DigitalOcean if prompted → select your repo
4. Select the **`main`** branch
5. You'll see **"No components detected"** — this is expected. Click **Add Resource**

Now add each of the 6 services. For each one:

#### Component 1: eureka-server (add this FIRST — other services depend on it)

1. Click **Add Resource** → **Create a Resource From Source Code**
2. Select same repo + `main` branch
3. Configure:

| Setting | Value |
|---------|-------|
| **Resource Type** | Service |
| **Source Directory** | `backend-spring` |
| **Type** | Dockerfile |
| **Name** | `eureka-server` |
| **HTTP Port** | `8761` |
| **Visibility** | Internal |
| **Plan** | Professional (1 vCPU, 1 GB RAM) — $12/mo |

4. Add these **Environment Variables**:

| Key | Value | Scope |
|-----|-------|-------|
| `SERVICE_NAME` | `lms-eureka-server` | Build-time |
| `SPRING_PROFILES_ACTIVE` | `docker` | Run-time |
| `JAVA_OPTS` | `-Xmx256m -Xms128m` | Run-time |

5. Click **Add Resource**

#### Component 2: api-gateway (the only PUBLIC service)

1. **Add Resource** → **Create a Resource From Source Code**
2. Same repo + `main` branch
3. Configure:

| Setting | Value |
|---------|-------|
| **Resource Type** | Service |
| **Source Directory** | `backend-spring` |
| **Type** | Dockerfile |
| **Name** | `api-gateway` |
| **HTTP Port** | `8080` |
| **Visibility** | External (public) |
| **Plan** | Professional (1 vCPU, 1 GB RAM) — $12/mo |

4. **Environment Variables:**

| Key | Value | Scope |
|-----|-------|-------|
| `SERVICE_NAME` | `lms-api-gateway` | Build-time |
| `SPRING_PROFILES_ACTIVE` | `docker` | Run-time |
| `EUREKA_URI` | `http://${eureka-server.PRIVATE_URL}:8761/eureka` | Run-time |
| `JAVA_OPTS` | `-Xmx384m -Xms192m` | Run-time |
| `GATEWAY_CORS_ALLOWED_ORIGINS` | `https://placeholder.vercel.app` | Run-time |

> **Note:** `${eureka-server.PRIVATE_URL}` is an App Platform variable reference — it resolves to the internal hostname of the eureka-server component. Type it exactly as shown.

#### Component 3: user-service

| Setting | Value |
|---------|-------|
| **Source Directory** | `backend-spring` |
| **Type** | Dockerfile |
| **Name** | `user-service` |
| **HTTP Port** | `8081` |
| **Visibility** | Internal |
| **Plan** | Professional — $12/mo |

**Environment Variables:**

| Key | Value | Scope |
|-----|-------|-------|
| `SERVICE_NAME` | `lms-user-service` | Build-time |
| `SPRING_PROFILES_ACTIVE` | `docker,supabase` | Run-time |
| `SERVER_PORT` | `8081` | Run-time |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://YOUR_HOST:6543/postgres` | Run-time, Encrypt |
| `SPRING_DATASOURCE_USERNAME` | `postgres.YOUR_REF` | Run-time, Encrypt |
| `SPRING_DATASOURCE_PASSWORD` | (your Supabase password) | Run-time, Encrypt |
| `SPRING_DATA_REDIS_HOST` | `${redis.HOSTNAME}` | Run-time |
| `SPRING_DATA_REDIS_PORT` | `${redis.PORT}` | Run-time |
| `SPRING_DATA_REDIS_PASSWORD` | `${redis.PASSWORD}` | Run-time |
| `JWT_SECRET` | (your JWT secret) | Run-time, Encrypt |
| `JWT_EXPIRATION` | `86400000` | Run-time |
| `EUREKA_URI` | `http://${eureka-server.PRIVATE_URL}:8761/eureka` | Run-time |
| `JAVA_OPTS` | `-Xmx384m -Xms192m` | Run-time |
| `BOOTSTRAP_ADMIN_ENABLED` | `true` | Run-time |
| `BOOTSTRAP_ADMIN_EMAIL` | `admin@ucu.edu.ua` | Run-time |
| `BOOTSTRAP_ADMIN_PASSWORD` | (strong password) | Run-time, Encrypt |

#### Component 4: learning-service

| Setting | Value |
|---------|-------|
| **Source Directory** | `backend-spring` |
| **Type** | Dockerfile |
| **Name** | `learning-service` |
| **HTTP Port** | `8089` |
| **Visibility** | Internal |
| **Plan** | Professional — $12/mo |

**Environment Variables:**

| Key | Value | Scope |
|-----|-------|-------|
| `SERVICE_NAME` | `lms-learning-service` | Build-time |
| `SPRING_PROFILES_ACTIVE` | `docker,supabase` | Run-time |
| `SERVER_PORT` | `8089` | Run-time |
| `DATABASE_URL` | `jdbc:postgresql://YOUR_HOST:6543/postgres` | Run-time, Encrypt |
| `DB_USERNAME` | `postgres.YOUR_REF` | Run-time, Encrypt |
| `DB_PASSWORD` | (your Supabase password) | Run-time, Encrypt |
| `SPRING_DATA_REDIS_HOST` | `${redis.HOSTNAME}` | Run-time |
| `SPRING_DATA_REDIS_PORT` | `${redis.PORT}` | Run-time |
| `SPRING_DATA_REDIS_PASSWORD` | `${redis.PASSWORD}` | Run-time |
| `JWT_SECRET` | (your JWT secret) | Run-time, Encrypt |
| `EUREKA_URI` | `http://${eureka-server.PRIVATE_URL}:8761/eureka` | Run-time |
| `SUBMISSION_STORAGE_PATH` | `/data/submissions` | Run-time |
| `JAVA_OPTS` | `-Xmx512m -Xms256m` | Run-time |

#### Component 5: ai-service

| Setting | Value |
|---------|-------|
| **Source Directory** | `backend-spring` |
| **Type** | Dockerfile |
| **Name** | `ai-service` |
| **HTTP Port** | `8085` |
| **Visibility** | Internal |
| **Plan** | Professional — $12/mo |

**Environment Variables:**

| Key | Value | Scope |
|-----|-------|-------|
| `SERVICE_NAME` | `lms-ai-service` | Build-time |
| `SPRING_PROFILES_ACTIVE` | `docker,supabase` | Run-time |
| `SERVER_PORT` | `8085` | Run-time |
| `DB_URL` | `jdbc:postgresql://YOUR_HOST:6543/postgres` | Run-time, Encrypt |
| `DB_USERNAME` | `postgres.YOUR_REF` | Run-time, Encrypt |
| `DB_PASSWORD` | (your Supabase password) | Run-time, Encrypt |
| `REDIS_HOST` | `${redis.HOSTNAME}` | Run-time |
| `REDIS_PORT` | `${redis.PORT}` | Run-time |
| `REDIS_PASSWORD` | `${redis.PASSWORD}` | Run-time |
| `LLAMA_API_URL` | `https://api.groq.com/openai/v1` | Run-time |
| `LLAMA_API_KEY` | (your Groq API key) | Run-time, Encrypt |
| `LLAMA_MODEL` | `llama-3.3-70b-versatile` | Run-time |
| `EUREKA_URI` | `http://${eureka-server.PRIVATE_URL}:8761/eureka` | Run-time |
| `JWT_SECRET` | (your JWT secret) | Run-time, Encrypt |
| `JAVA_OPTS` | `-Xmx768m -Xms384m -XX:+UseG1GC` | Run-time |

#### Component 6: analytics-service

| Setting | Value |
|---------|-------|
| **Source Directory** | `backend-spring` |
| **Type** | Dockerfile |
| **Name** | `analytics-service` |
| **HTTP Port** | `8088` |
| **Visibility** | Internal |
| **Plan** | Professional — $12/mo |

**Environment Variables:**

| Key | Value | Scope |
|-----|-------|-------|
| `SERVICE_NAME` | `lms-analytics-service` | Build-time |
| `SPRING_PROFILES_ACTIVE` | `docker,supabase` | Run-time |
| `SERVER_PORT` | `8088` | Run-time |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://YOUR_HOST:6543/postgres` | Run-time, Encrypt |
| `SPRING_DATASOURCE_USERNAME` | `postgres.YOUR_REF` | Run-time, Encrypt |
| `SPRING_DATASOURCE_PASSWORD` | (your Supabase password) | Run-time, Encrypt |
| `SPRING_FLYWAY_ENABLED` | `false` | Run-time |
| `SPRING_DATA_REDIS_HOST` | `${redis.HOSTNAME}` | Run-time |
| `SPRING_DATA_REDIS_PORT` | `${redis.PORT}` | Run-time |
| `SPRING_DATA_REDIS_PASSWORD` | `${redis.PASSWORD}` | Run-time |
| `JWT_SECRET` | (your JWT secret) | Run-time, Encrypt |
| `EUREKA_URI` | `http://${eureka-server.PRIVATE_URL}:8761/eureka` | Run-time |
| `JAVA_OPTS` | `-Xmx384m -Xms192m` | Run-time |

#### Add Redis Database

1. Click **Add Resource** → **Add Database**
2. Select **Redis**
3. Choose **Dev Database** ($0/mo, 256 MB) for testing, or **Managed** ($15/mo) for production
4. Name it `redis`

> **Important:** The name must be exactly `redis` so the `${redis.HOSTNAME}`, `${redis.PORT}`, and `${redis.PASSWORD}` references in the service env vars resolve correctly.

### 8D-d. Configure environment variables

If you used **Method A (CLI)**, the app was created with placeholder values. Update them now:

1. Go to [cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps) → click your app
2. Go to **Settings** → click each component → **Environment Variables**
3. Replace all `{PLACEHOLDER}` values with real credentials from Steps 1, 3, and 4:

| Placeholder | Replace with | Found in |
|-------------|-------------|----------|
| `{SUPABASE_JDBC_URL}` | `jdbc:postgresql://YOUR_HOST:6543/postgres` | user-service, learning-service, ai-service, analytics-service |
| `{SUPABASE_DB_USER}` | `postgres.YOUR_REF` | user-service, learning-service, ai-service, analytics-service |
| `{SUPABASE_DB_PASSWORD}` | Your Supabase password | user-service, learning-service, ai-service, analytics-service |
| `{JWT_SECRET}` | Your JWT secret (from Step 4) | user-service, learning-service, ai-service, analytics-service |
| `{LLAMA_API_KEY}` | Your Groq API key (from Step 3) | ai-service |
| `{ADMIN_EMAIL}` | `admin@ucu.edu.ua` | user-service |
| `{ADMIN_PASSWORD}` | Strong admin password | user-service |
| `{YOUR_VERCEL_URL}` | Leave for now — update in Step 11D | api-gateway |

4. Click **Save** after each component — this triggers a redeploy

---

## Step 9D: Wait for Build and Deploy

App Platform will now:
1. Clone your repo
2. Build 6 Docker images (each service separately) — **first build takes 15-25 minutes**
3. Deploy all components
4. Provision the Redis database

Watch the build progress in the App Platform dashboard under the **Activity** tab.

### How the builds work

Each component builds from the same `backend-spring/Dockerfile`. The `SERVICE_NAME` build-time env var tells the Dockerfile which Maven module to compile:

```
SERVICE_NAME=lms-api-gateway      → builds lms-api-gateway
SERVICE_NAME=lms-eureka-server    → builds lms-eureka-server
SERVICE_NAME=lms-user-service     → builds lms-user-service
... etc
```

> **If a build fails** with "SERVICE_NAME not set" or "No such module", verify the `SERVICE_NAME` env var is set with **Build-time** scope (not Run-time) for that component.

### Check deployment status

Once all components show **Active** with a green checkmark:

1. Click on the **api-gateway** component
2. Find the **Live App URL** — it looks like:
   ```
   https://learnsystem-ucu-xxxxx.ondigitalocean.app
   ```
3. **Copy this URL** — this is your HTTPS API endpoint

### Verify the gateway

Open in your browser:
```
https://learnsystem-ucu-xxxxx.ondigitalocean.app/actuator/health
```
Should show: `{"status":"UP"}`

### If services fail to start

| Symptom | Check |
|---------|-------|
| Build fails: "SERVICE_NAME not set" | Verify `SERVICE_NAME` env var has **Build-time** scope |
| Build fails: "Could not find artifact" | The `source_dir` must be `backend-spring` |
| Service crashes on start | Click component → **Runtime Logs** → look for Spring Boot errors |
| "Connection refused" to database | Wrong Supabase credentials — verify `SPRING_DATASOURCE_URL` / `DATABASE_URL` |
| "Connection refused" to Eureka | Eureka may not be ready yet. Services auto-retry every 30s. Wait 2-3 minutes |
| Components can't find each other | Verify `EUREKA_URI` uses `${eureka-server.PRIVATE_URL}` (not a hardcoded IP) |
| Redis connection fails | Verify the database is named exactly `redis` so `${redis.HOSTNAME}` resolves |

> **Services may need 1-2 restart cycles** on first deploy. Eureka takes ~60s to start, then other services register over the next 30-60s. If a service started before Eureka was ready, it will retry automatically.

---

## Step 10D: Deploy Frontend on Vercel

### 10D-a. Import project on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository** → connect GitHub → select your repo
3. Configure:

| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend` |
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

4. **Add Environment Variables:**

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://learnsystem-ucu-xxxxx.ondigitalocean.app/api` |

> **Important:** Use the App Platform URL from Step 9D. It must start with `https://` and end with `/api`.

5. Click **Deploy**
6. Wait 1-2 minutes. Copy your Vercel URL: `https://your-app.vercel.app`

---

## Step 11D: Wire Together — Update CORS

### 11D-a. Update the api-gateway CORS setting

1. Go to your app in [DigitalOcean App Platform dashboard](https://cloud.digitalocean.com/apps)
2. Click **Settings** → select the **api-gateway** component
3. Scroll to **Environment Variables**
4. Find `GATEWAY_CORS_ALLOWED_ORIGINS` and change it to your actual Vercel URL:
   ```
   https://your-app.vercel.app
   ```
   (No trailing slash)
5. Click **Save** — App Platform will auto-redeploy the api-gateway component

### 11D-b. Verify CORS

After the gateway redeploys (~2 minutes), test from your terminal:

```bash
curl -H "Origin: https://your-app.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://learnsystem-ucu-xxxxx.ondigitalocean.app/api/auth/login \
     -v 2>&1 | grep -i "access-control"
```

You should see:
```
< Access-Control-Allow-Origin: https://your-app.vercel.app
```

---

## Step 12D: Verify and Finalize

### 12D-a. Test in browser

1. Open your Vercel URL: `https://your-app.vercel.app`
2. Log in with:
   - **Email:** `admin@ucu.edu.ua` (or what you set for `BOOTSTRAP_ADMIN_EMAIL`)
   - **Password:** what you set for `BOOTSTRAP_ADMIN_PASSWORD`
3. Navigate around — create a course, test AI features

### 12D-b. If something fails

| Symptom | Check |
|---------|-------|
| CORS error | `GATEWAY_CORS_ALLOWED_ORIGINS` must match your Vercel URL exactly (`https://`, no trailing slash) |
| Network error / 502 | Check App Platform dashboard — are all components Active? Check Runtime Logs for errors |
| Login returns 500 | Check user-service Runtime Logs for database connection errors. Verify Supabase credentials |
| Mixed content blocked | `VITE_API_URL` in Vercel must start with `https://` |
| Services can't find each other | Eureka may need time. Check eureka-server Runtime Logs. Services auto-retry registration |

### 12D-c. Disable bootstrap admin

1. Go to App Platform dashboard → **Settings** → **user-service** component
2. Change `BOOTSTRAP_ADMIN_ENABLED` from `true` to `false`
3. Save — auto-redeploys

---

## Updating with Option D

- **Frontend:** Push to `main` → Vercel auto-deploys
- **Backend:** Push to `main` → App Platform auto-builds and deploys all components
- **Environment variables:** Change in App Platform dashboard → auto-redeploys affected component
- **No SSH, no Docker commands, no server management** — everything is in the dashboard or `git push`

### Scale up/down

In the App Platform dashboard, you can:
- Change instance size (more RAM/CPU) per component
- Change instance count (horizontal scaling) per component
- Switch Redis from dev ($0) to managed ($15/mo) for persistence

### Using the CLI

```bash
# Install doctl (DigitalOcean CLI)
# See: https://docs.digitalocean.com/reference/doctl/how-to/install/

# List apps
doctl apps list

# View app details
doctl apps get YOUR_APP_ID

# View runtime logs
doctl apps logs YOUR_APP_ID --component api-gateway --follow

# Update app spec from file
doctl apps update YOUR_APP_ID --spec .do/app.yaml

# Force redeploy
doctl apps create-deployment YOUR_APP_ID --force-build
```

---

# Everyday Operations

All commands assume you're SSH'd into the Droplet at `/opt/lms`.

### Shell alias (optional convenience)

```bash
echo 'alias lms="cd /opt/lms && docker compose --env-file .env.production"' >> ~/.bashrc
source ~/.bashrc
```

Then use: `lms ps`, `lms logs -f`, `lms down`, etc.

### View status
```bash
docker compose --env-file .env.production ps
```

### View logs
```bash
# All services
docker compose --env-file .env.production logs -f --tail=100

# Single service
docker compose --env-file .env.production logs -f user-service
```

### Stop everything
```bash
docker compose --env-file .env.production down
```

### Restart a single service
```bash
docker compose --env-file .env.production restart learning-service
```

### Update backend (DigitalOcean)
```bash
cd /opt/lms
git pull
docker compose --env-file .env.production up -d --build
```

> Subsequent builds are fast (~2-3 min) because Docker layer caching reuses unchanged layers.

### Update frontend

- **Option A:** Same as backend — `git pull` + rebuild on the Droplet.
- **Options B, C, D:** Just push to `main` on GitHub — Vercel auto-deploys. No action needed.

### Update backend (Option D — App Platform)

Just push to `main` — App Platform auto-builds and deploys. No SSH or Docker commands needed.

### View resource usage
```bash
docker stats --no-stream
```

### Clean up old Docker images (reclaim disk space)
```bash
docker image prune -f
# Or to reclaim everything (stopped containers, unused networks, build cache):
docker system prune -f
```

---

# Troubleshooting

### Service won't start — "Connection refused" to database

1. **Verify your Supabase project is active** (not paused). Go to [supabase.com/dashboard](https://supabase.com/dashboard) and check. Free-tier projects show a "Paused" badge.
2. **Test connectivity from the Droplet:**
   ```bash
   apt-get install -y postgresql-client
   psql "postgresql://postgres.YOUR_REF:YOUR_PASSWORD@YOUR_HOST:6543/postgres"
   ```
   If this connects and shows a `postgres=>` prompt, the credentials are correct. Type `\q` to exit.
3. **Check you're using port `6543`** (Supavisor transaction pooler), not `5432`.
4. **Check for IP restrictions** — by default, Supabase allows all IPs. If you've configured IP allowlisting in Supabase (Settings → Database → Network restrictions), add your Droplet's IP.

### Startup troubleshooting

```bash
# Check a specific service
docker logs lms-user-service --tail=100

# Or watch live
docker compose --env-file .env.production logs -f user-service
```

Common first-deploy issues:

| Error | Cause | Fix |
|-------|-------|-----|
| `Connection refused` to database | Wrong Supabase host/port/password | Double-check all `SUPABASE_DB_*` values in `.env.production` |
| `FATAL: password authentication failed` | Wrong user or password | Verify `SUPABASE_DB_USER` includes the project ref (e.g., `postgres.abcdef`) |
| `relation "xxx" does not exist` | Flyway hasn't run yet | Wait — user-service and learning-service run migrations on first start. If analytics-service fails first, restart it after the others are healthy |
| `java.lang.OutOfMemoryError` | Not enough RAM | Upgrade Droplet to 8 GB |
| `connect timed out` to Supabase | Firewall or wrong region | Ensure Supabase project isn't paused; try `curl -v telnet://YOUR_HOST:6543` to test connectivity |

### Supabase project paused

Free-tier Supabase projects automatically pause after **7 days of inactivity** (no database queries). When paused:
- All database connections fail with "connection refused"
- Your data is **not deleted** — it's preserved

To fix:
1. Go to the Supabase dashboard
2. Select your project
3. Click **Restore** — takes ~1 minute
4. Restart affected services: `docker compose --env-file .env.production restart`

To prevent auto-pause:
- **Upgrade to Supabase Pro** ($25/mo) — no auto-pause
- **Or** set up a cron job on the Droplet to ping the database every 6 days:
  ```bash
  # Add to root's crontab: crontab -e
  0 0 */5 * * docker exec lms-user-service curl -sf http://localhost:8081/api/actuator/health > /dev/null 2>&1
  ```

### Out of memory / services keep restarting

```bash
# Check available memory
free -h

# Check per-container memory usage
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"
```

If you're on a 4 GB Droplet and running out of memory:
- **Recommended:** Upgrade to 8 GB ($48/mo) — resize via DigitalOcean dashboard with no data loss
- **Workaround:** Add swap space:
  ```bash
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ```
  Swap is slower than RAM but prevents OOM kills.

### Frontend loads but API calls fail

**Option A (all-in-one):**
1. Open browser **Developer Tools → Network tab** and look at failed requests
2. The frontend Nginx container proxies `/api/` requests to the gateway internally via Docker networking — this should work automatically
3. If you see CORS errors, add your Droplet IP to the CORS config:
   ```bash
   nano /opt/lms/.env.production
   # Set: GATEWAY_CORS_ALLOWED_ORIGINS=http://YOUR_IP:3000,http://YOUR_IP:8080
   docker compose --env-file .env.production restart api-gateway
   ```

**Option B (Vercel + DigitalOcean):**
1. Open browser **Developer Tools → Network tab**
2. Check that requests go to your HTTPS API domain (`https://learnsystem-api.duckdns.org/api/...`)
3. If you see **CORS errors**: verify `GATEWAY_CORS_ALLOWED_ORIGINS` in `.env.production` matches your Vercel URL exactly
4. If you see **mixed content blocked**: your `VITE_API_URL` in Vercel must start with `https://`
5. If you see **502 Bad Gateway**: check nginx → `nginx -t && systemctl status nginx`, then check the API gateway → `docker logs lms-api-gateway --tail=50`

### AI features not working

1. Check the AI service logs:
   ```bash
   docker compose --env-file .env.production logs ai-service --tail=50
   ```
2. Look for `401 Unauthorized` (invalid API key) or `429 Too Many Requests` (rate limit hit)
3. Verify your Groq API key is valid and has remaining quota at [console.groq.com](https://console.groq.com)
4. Test the key directly from the Droplet:
   ```bash
   curl -s https://api.groq.com/openai/v1/models \
     -H "Authorization: Bearer YOUR_GROQ_KEY" | head -c 200
   ```
   If this returns a JSON list of models, the key works.

### Viewing database state

```bash
# Install psql on the Droplet (if not already installed)
apt-get install -y postgresql-client

# Connect to Supabase
psql "postgresql://postgres.YOUR_REF:YOUR_PASSWORD@YOUR_HOST:6543/postgres"

# Useful queries:
\dt                                    -- list all tables
SELECT * FROM user_flyway_schema_history ORDER BY installed_rank;  -- migration status
SELECT count(*) FROM users;            -- user count
\q                                     -- exit
```

### Completely reset and redeploy

```bash
cd /opt/lms
docker compose --env-file .env.production down -v
docker system prune -af
git pull
docker compose --env-file .env.production up -d --build
```

> **Warning:** `down -v` removes the Redis cache and the submissions volume. Database data is safe in Supabase. If you also want to wipe the database, go to Supabase dashboard → SQL Editor and run `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` (this deletes everything).

---

# Cost Summary

### Option A: All-in-One

| Service | Cost | Notes |
|---------|------|-------|
| DigitalOcean Droplet (4 GB / 2 vCPU) | $24/mo | Minimum viable. 80 GB SSD, 4 TB transfer |
| DigitalOcean Droplet (8 GB / 4 vCPU) | $48/mo | Recommended. 160 GB SSD, 5 TB transfer |
| Supabase Free | $0/mo | 500 MB database, auto-pauses after 7 days inactive |
| Supabase Pro | $25/mo | 8 GB database, no auto-pause, daily backups |
| Groq Free | $0/mo | Rate-limited (~30 req/min), sufficient for light use |
| **Total (minimum)** | **$24/mo** | 4 GB Droplet + Supabase Free + Groq Free |
| **Total (recommended)** | **$73/mo** | 8 GB Droplet + Supabase Pro + Groq Free |

### Option B: Split (Vercel + DigitalOcean + Supabase)

| Service | Cost | Notes |
|---------|------|-------|
| DigitalOcean Droplet (4 GB / 2 vCPU) | $24/mo | Backend only (no frontend container, saves ~128 MB RAM) |
| Supabase Free | $0/mo | 500 MB database |
| Vercel Hobby | $0/mo | Unlimited static deploys, global CDN, auto-deploy on push |
| DuckDNS | $0/mo | Free subdomain for API HTTPS |
| Let's Encrypt | $0/mo | Free SSL certificate, auto-renews |
| Groq Free | $0/mo | Rate-limited, sufficient for light use |
| **Total** | **$24/mo** | Everything on free tiers except the Droplet |

### Option C: Split + Vercel Proxy (no domain)

| Service | Cost | Notes |
|---------|------|-------|
| DigitalOcean Droplet (4 GB / 2 vCPU) | $24/mo | Backend only |
| Supabase Free | $0/mo | 500 MB database |
| Vercel Hobby | $0/mo | Static deploys + API proxy, global CDN |
| Groq Free | $0/mo | Rate-limited, sufficient for light use |
| **Total** | **$24/mo** | No domain, no SSL — Vercel handles everything |

> **Option C caveat:** Vercel Hobby plan has a **10-second timeout** on rewrite/proxy requests. If your AI service takes longer than 10s to respond, those requests will fail. Upgrade to Vercel Pro ($20/mo, 60s timeout) or use Option B for long-running requests.

### Option D: App Platform + Vercel + Supabase

| Service | Cost | Notes |
|---------|------|-------|
| DO App Platform — api-gateway (professional-xs) | $12/mo | Public HTTPS service, 1 GB RAM |
| DO App Platform — eureka-server (professional-xs) | $12/mo | Internal service, 1 GB RAM |
| DO App Platform — user-service (professional-xs) | $12/mo | Internal service, 1 GB RAM |
| DO App Platform — learning-service (professional-s) | $12/mo | Internal service, 2 GB RAM |
| DO App Platform — ai-service (professional-s) | $12/mo | Internal service, 2 GB RAM |
| DO App Platform — analytics-service (professional-xs) | $12/mo | Internal service, 1 GB RAM |
| DO App Platform — Redis (dev) | $0/mo | 256 MB, no persistence. Upgrade to managed ($15/mo) for production |
| Supabase Free | $0/mo | 500 MB database |
| Vercel Hobby | $0/mo | Static deploys, global CDN |
| Groq Free | $0/mo | Rate-limited, sufficient for light use |
| **Total (minimum)** | **$72/mo** | Dev Redis + Supabase Free |
| **Total (recommended)** | **$112/mo** | Managed Redis + Supabase Pro |

> **Why it costs more:** Each Spring Boot service is a separate managed component. You're paying for zero-ops: no SSH, no Docker, no server updates, automatic HTTPS, auto-deploy, built-in monitoring, and horizontal scaling.

---

# Security Checklist

- [ ] **Changed the default admin password** after first login
- [ ] **Set `BOOTSTRAP_ADMIN_ENABLED=false`** after the first deploy
- [ ] **Firewall configured** — only necessary ports exposed
  - Option A: 22, 3000, 8080
  - Option B: 22, 80, 443 (8080 stays internal — nginx proxies to it)
  - Option C: 22, 8080
  - Option D: N/A — App Platform manages networking, no ports to configure
- [ ] **JWT_SECRET** is a long random string (not the dev default)
- [ ] **`.env.production` is not committed to git** — it's in `.gitignore`
- [ ] **No internal ports exposed** (8081, 8085, 8088, 8089, 8761 are Docker-internal only)
- [ ] **Supabase database password** is strong and unique
- [ ] **SSH key authentication** is used (not password auth)
- [ ] **(Options B & D)** `GATEWAY_CORS_ALLOWED_ORIGINS` only lists your actual frontend domains

### Optional hardening

- **Disable root SSH login** and create a regular user:
  ```bash
  adduser deploy
  usermod -aG docker deploy
  # Copy SSH key to new user
  mkdir -p /home/deploy/.ssh
  cp ~/.ssh/authorized_keys /home/deploy/.ssh/
  chown -R deploy:deploy /home/deploy/.ssh
  # Edit /etc/ssh/sshd_config: set PermitRootLogin no
  systemctl restart sshd
  ```
- **Enable DigitalOcean Cloud Firewall** for network-level protection
- **Set up DigitalOcean monitoring** — free built-in alerts for CPU, RAM, disk
- **Enable Supabase database backups** — included in Pro plan, or use `pg_dump` manually
