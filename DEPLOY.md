# Deploying LearnSystemUCU to DigitalOcean + Supabase

> **Last updated:** February 2026
> **Tested with:** Docker 27.x, Ubuntu 24.04 LTS, Supabase (Supavisor pooler), Groq API (llama-3.3-70b-versatile)

Full step-by-step guide to deploy the LMS on a single DigitalOcean Droplet with Supabase as the external PostgreSQL database.

**Architecture:**
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

**What you'll need:**
- A DigitalOcean account
- A Supabase account (free tier works)
- A Groq API key (free tier works)
- An SSH client (Terminal on Mac/Linux, or PuTTY / Windows Terminal on Windows)

**Estimated time:** ~30 minutes

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

> **Why 4GB minimum?** The app runs 8 containers (5 Java services + Eureka + Redis + Nginx). Each Spring Boot service needs 384-768 MB of RAM. Memory limits in `docker-compose.prod.yml` total ~3.3 GB. With 4 GB you're tight but it works. 8 GB gives comfortable headroom for build-time Docker layer caching and JVM overhead.

> **Disk note:** First build downloads ~2 GB of Maven dependencies and Docker base images. The 80 GB disk on the $24 plan is more than sufficient.

---

## Step 3: Get a Groq API Key

1. Go to [console.groq.com/keys](https://console.groq.com/keys)
2. Sign in (or create an account)
3. Click **Create API Key**
4. Give it a name (e.g., `learnsystem-lms`)
5. **Copy the API key** — you can only see it once

The default model is `llama-3.3-70b-versatile` (131K context, ~280 tokens/sec on Groq). This is a production model on Groq. Other available models:
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

## Step 8: Create the Production Environment File

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
```

Save and exit: press `Ctrl+O`, `Enter`, `Ctrl+X`.

> **Double-check** there are no extra spaces around the `=` signs and no trailing whitespace. Env parsing is sensitive to this.

---

## Step 9: Build and Start the Application

```bash
cd /opt/lms
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

This will:
1. Build 6 Docker images (5 Java services + 1 frontend) — **takes 10-20 minutes** on the first run (Maven downloads ~1.5 GB of dependencies)
2. Pull Redis 7 Alpine and other base images
3. Start all 8 containers

You can watch the build progress with:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f --tail=50
```

Press `Ctrl+C` to stop watching logs (the containers keep running).

> **Subsequent builds are fast** (~2-3 minutes) because Docker caches Maven dependencies and base image layers. Only changed code gets recompiled.

---

## Step 10: Wait for Services to Start

After the build finishes, the Java services need 2-4 minutes to start up (Eureka registration, Flyway migrations, Spring context initialization). Check their status:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
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

### Startup troubleshooting

If a service keeps restarting, check its logs:

```bash
# Check a specific service
docker logs lms-user-service --tail=100

# Or watch live
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f user-service
```

Common first-deploy issues:

| Error | Cause | Fix |
|-------|-------|-----|
| `Connection refused` to database | Wrong Supabase host/port/password | Double-check all `SUPABASE_DB_*` values in `.env.production` |
| `FATAL: password authentication failed` | Wrong user or password | Verify `SUPABASE_DB_USER` includes the project ref (e.g., `postgres.abcdef`) |
| `relation "xxx" does not exist` | Flyway hasn't run yet | Wait — user-service and learning-service run migrations on first start. If analytics-service fails first, restart it after the others are healthy |
| `java.lang.OutOfMemoryError` | Not enough RAM | Upgrade Droplet to 8 GB |
| `connect timed out` to Supabase | Firewall or wrong region | Ensure Supabase project isn't paused; try `curl -v telnet://YOUR_HOST:6543` to test connectivity |

---

## Step 11: Verify the Deployment

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
2. Log in with the admin credentials you set in Step 8:
   - **Email:** `admin@ucu.edu.ua` (or what you configured for `BOOTSTRAP_ADMIN_EMAIL`)
   - **Password:** what you set for `BOOTSTRAP_ADMIN_PASSWORD`

> If login fails, check user-service logs: `docker logs lms-user-service --tail=50`. Look for "Bootstrap admin created" to confirm the admin account was initialized.

---

## Step 12: Disable Bootstrap Admin

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
docker compose -f docker-compose.prod.yml --env-file .env.production restart user-service
```

---

## Step 13: Configure Firewall

DigitalOcean Droplets have all ports open by default. You should restrict access.

### Option A: DigitalOcean Cloud Firewall (recommended)

1. Go to **Networking** → **Firewalls** in the DigitalOcean dashboard
2. Create a firewall with these **inbound rules**:

| Type | Port | Source |
|------|------|--------|
| SSH | 22 | Your IP (or All) |
| Custom | 3000 | All IPv4, All IPv6 |
| Custom | 8080 | All IPv4, All IPv6 |

3. Apply it to your Droplet

### Option B: UFW (on the Droplet)

```bash
ufw allow 22/tcp     # SSH
ufw allow 3000/tcp   # Frontend
ufw allow 8080/tcp   # API Gateway
ufw --force enable
```

> **Do NOT expose** ports 8081, 8085, 8088, 8089, or 8761 publicly — they are only used internally between Docker containers on the bridge network. If you need the Eureka dashboard for debugging, temporarily allow `8761` and remove it afterward.

---

## Everyday Operations

All commands assume you're in `/opt/lms` on the Droplet. For convenience, you can create a shell alias:

```bash
echo 'alias lms="cd /opt/lms && docker compose -f docker-compose.prod.yml --env-file .env.production"' >> ~/.bashrc
source ~/.bashrc
```

Then use `lms ps`, `lms logs -f`, `lms down`, etc.

### Without the alias

```bash
cd /opt/lms
```

### View status
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

### View logs
```bash
# All services
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f --tail=100

# Single service
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f user-service
```

### Stop everything
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production down
```

### Restart a single service
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production restart learning-service
```

### Update to latest code
```bash
cd /opt/lms
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

> Subsequent builds are fast (~2-3 min) because Docker layer caching reuses unchanged layers. Only changed source code triggers a recompile.

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

## Troubleshooting

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

### Supabase project paused

Free-tier Supabase projects automatically pause after **7 days of inactivity** (no database queries). When paused:
- All database connections fail with "connection refused"
- Your data is **not deleted** — it's preserved

To fix:
1. Go to the Supabase dashboard
2. Select your project
3. Click **Restore** — takes ~1 minute
4. Restart affected services: `docker compose -f docker-compose.prod.yml --env-file .env.production restart`

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

1. Open browser **Developer Tools → Network tab** and look at failed requests
2. The frontend Nginx container proxies `/api/` requests to the gateway internally via Docker networking — this should work automatically
3. If you see CORS errors when accessing the API directly (not through the frontend), add your Droplet IP to the gateway's CORS config. Edit `docker-compose.prod.yml` and add to the `api-gateway` environment:
   ```yaml
   - GATEWAY_CORS_ALLOWED_ORIGINS=http://YOUR_IP:3000,http://YOUR_IP:8080
   ```
   Then restart: `docker compose -f docker-compose.prod.yml --env-file .env.production restart api-gateway`

### AI features not working

1. Check the AI service logs:
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production logs ai-service --tail=50
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
docker compose -f docker-compose.prod.yml --env-file .env.production down -v
docker system prune -af
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

> **Warning:** `down -v` removes the Redis cache and the submissions volume. Database data is safe in Supabase. If you also want to wipe the database, go to Supabase dashboard → SQL Editor and run `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` (this deletes everything).

---

## Cost Summary

| Service | Cost | Notes |
|---------|------|-------|
| DigitalOcean Droplet (4 GB / 2 vCPU) | $24/mo | Minimum viable. 80 GB SSD, 4 TB transfer |
| DigitalOcean Droplet (8 GB / 4 vCPU) | $48/mo | Recommended. 160 GB SSD, 5 TB transfer |
| Supabase Free | $0/mo | 500 MB database, auto-pauses after 7 days inactive |
| Supabase Pro | $25/mo | 8 GB database, no auto-pause, daily backups |
| Groq Free | $0/mo | Rate-limited (~30 req/min), sufficient for light use |
| **Total (minimum)** | **$24/mo** | 4 GB Droplet + Supabase Free + Groq Free |
| **Total (recommended)** | **$73/mo** | 8 GB Droplet + Supabase Pro + Groq Free |

---

## Security Checklist

- [ ] **Changed the default admin password** after first login
- [ ] **Set `BOOTSTRAP_ADMIN_ENABLED=false`** after the first deploy (Step 12)
- [ ] **Firewall configured** — only ports 22, 3000, 8080 exposed (Step 13)
- [ ] **JWT_SECRET** is a long random string (not the dev default)
- [ ] **`.env.production` is not committed to git** — it's in `.gitignore`
- [ ] **No internal ports exposed** (8081, 8085, 8088, 8089, 8761 are Docker-internal only)
- [ ] **Supabase database password** is strong and unique
- [ ] **SSH key authentication** is used (not password auth)

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
- **Enable DigitalOcean Cloud Firewall** for network-level protection (see Step 13)
- **Set up DigitalOcean monitoring** — free built-in alerts for CPU, RAM, disk
- **Enable Supabase database backups** — included in Pro plan, or use `pg_dump` manually
