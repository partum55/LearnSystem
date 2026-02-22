# Deploying LearnSystemUCU to DigitalOcean + Supabase

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
   Supabase (PostgreSQL)
```

**What you'll need:**
- A DigitalOcean account
- A Supabase account (free tier works)
- A Groq API key (free tier works)
- An SSH client (Terminal on Mac/Linux, or PuTTY on Windows)

**Estimated time:** ~30 minutes

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account)
2. Click **New Project**
3. Fill in:
   - **Name:** `learnsystem-lms` (or any name)
   - **Database Password:** generate a strong one and **save it somewhere safe** — you'll need it later
   - **Region:** choose one close to where your Droplet will be (e.g., **US East (N. Virginia)** if your Droplet is in NYC)
4. Click **Create new project** and wait for it to provision (~2 minutes)

### Get your database connection details

5. Once the project is ready, go to **Settings** (gear icon in the left sidebar)
6. Click **Database** in the left menu
7. Scroll to **Connection string** section and select **URI** tab
8. You need these values:

| What | Where to find it | Example |
|------|-------------------|---------|
| **Host** | In the connection string, after `@` | `aws-0-us-east-1.pooler.supabase.com` |
| **Port** | Use **6543** (Transaction pooler) | `6543` |
| **Database** | Always | `postgres` |
| **User** | In the connection string, before `@` | `postgres.abcdefghijklmnop` |
| **Password** | The one you set in step 3 | (your password) |

> **Important:** Use the **Transaction pooler** connection (port `6543`), not the direct connection (port `5432`). The pooler handles connection limits much better for multiple services.

---

## Step 2: Create a DigitalOcean Droplet

1. Go to [cloud.digitalocean.com](https://cloud.digitalocean.com) and sign in
2. Click **Create** → **Droplets**
3. Configure:

| Setting | Value |
|---------|-------|
| **Region** | Same region as Supabase (e.g., **New York - NYC1**) |
| **Image** | **Ubuntu 24.04 (LTS)** |
| **Size** | **4 GB RAM / 2 vCPU** ($24/mo) minimum. **8 GB / 4 vCPU** ($48/mo) recommended |
| **Authentication** | **SSH Key** (add your public key if you haven't already) |
| **Hostname** | `learnsystem-lms` (or any name) |

4. Click **Create Droplet**
5. Wait for it to be created (~1 minute)
6. **Copy the Droplet's IP address** from the dashboard

> **Why 4GB minimum?** The app runs 7 Docker containers (5 Java services + Redis + Nginx). Each Spring Boot service needs ~384-768MB of RAM. With 4GB you'll be tight but it works. 8GB is comfortable.

---

## Step 3: Get a Groq API Key

1. Go to [console.groq.com/keys](https://console.groq.com/keys)
2. Sign in (or create an account)
3. Click **Create API Key**
4. Give it a name (e.g., `learnsystem-lms`)
5. **Copy the API key** — you can only see it once

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

**Copy it and save it.** This will be your JWT signing secret.

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

Run these commands one block at a time:

```bash
# Update the system
apt-get update && apt-get upgrade -y
```

```bash
# Install Docker prerequisites
apt-get install -y ca-certificates curl gnupg
```

```bash
# Add Docker's GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
```

```bash
# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null
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

---

## Step 7: Clone the Repository

```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/LearnSystemUCU.git lms
cd /opt/lms
```

Replace the URL with your actual GitHub repository URL.

> If the repo is private, you'll need to either:
> - Use an HTTPS URL with a [personal access token](https://github.com/settings/tokens): `https://YOUR_TOKEN@github.com/YOUR_USERNAME/LearnSystemUCU.git`
> - Or set up an SSH key on the Droplet: `ssh-keygen -t ed25519` then add the public key to GitHub

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

> **Double-check** there are no extra spaces around the `=` signs and no trailing whitespace.

---

## Step 9: Build and Start the Application

```bash
cd /opt/lms
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

This will:
1. Build 6 Docker images (5 Java services + 1 frontend) — **takes 10-20 minutes** on the first run
2. Pull Redis image
3. Start all 7 containers

You can watch the build progress with:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f --tail=50
```

Press `Ctrl+C` to stop watching logs (the containers keep running).

---

## Step 10: Wait for Services to Start

After the build finishes, the Java services need 2-4 minutes to start up. Check their status:

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

If a service shows `(health: starting)`, wait and re-run the `ps` command in a minute.

### Troubleshooting: If a service keeps restarting

Check its logs:

```bash
# Replace SERVICE_NAME with the failing container name
docker logs lms-user-service --tail=100
```

Common issues:
- **"Connection refused" to database** → double-check `SUPABASE_DB_HOST` and `SUPABASE_DB_PASSWORD` in `.env.production`
- **"relation does not exist"** → the Flyway migrations haven't run yet; the user-service and learning-service run migrations on first start. Wait or restart them.
- **Out of memory** → your Droplet is too small. Upgrade to 8GB RAM.

---

## Step 11: Verify the Deployment

### Test from the Droplet itself

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
| `http://YOUR_DROPLET_IP:8761` | Eureka dashboard showing all registered services |
| `http://YOUR_DROPLET_IP:8080/actuator/health` | `{"status":"UP"}` |

### Log in

1. Go to `http://YOUR_DROPLET_IP:3000`
2. Log in with the admin credentials you set in Step 8:
   - **Email:** `admin@ucu.edu.ua` (or what you configured)
   - **Password:** what you set for `BOOTSTRAP_ADMIN_PASSWORD`

---

## Step 12: Disable Bootstrap Admin

After your first successful login, disable the bootstrap admin so it doesn't recreate the account on every restart:

```bash
cd /opt/lms
nano .env.production
```

Change:
```
BOOTSTRAP_ADMIN_ENABLED=false
```

Then restart the user service:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production restart user-service
```

---

## Step 13: Open Firewall Ports (if needed)

If you're using DigitalOcean's Cloud Firewall or UFW:

```bash
# If using UFW (Ubuntu firewall)
ufw allow 22/tcp     # SSH
ufw allow 3000/tcp   # Frontend
ufw allow 8080/tcp   # API Gateway (needed for frontend API calls)
ufw enable
```

> **Do NOT expose** ports 8081, 8085, 8088, 8089, 8761 publicly — they are only used internally between containers. If you want to access Eureka dashboard remotely, temporarily allow port 8761 for debugging, then remove it.

---

## Everyday Operations

All commands assume you're in `/opt/lms` on the Droplet:

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

> This rebuilds only changed images and restarts affected containers.

### View resource usage
```bash
docker stats --no-stream
```

### Clean up old Docker images (reclaim disk space)
```bash
docker image prune -f
```

---

## Troubleshooting

### Service won't start — "Connection refused" to database

1. Verify your Supabase project is active (not paused). Free-tier Supabase projects pause after 1 week of inactivity.
2. Check credentials:
   ```bash
   # Test connection from the Droplet
   apt-get install -y postgresql-client
   psql "postgresql://postgres.YOUR_REF:YOUR_PASSWORD@YOUR_HOST:6543/postgres"
   ```
3. Make sure you're using port `6543` (pooler), not `5432`.

### Supabase project paused

Free-tier Supabase projects automatically pause after 7 days of inactivity. Go to the Supabase dashboard and click **Restore** to unpause it. To prevent this, upgrade to Supabase Pro ($25/mo).

### Out of memory / services keep restarting

```bash
# Check available memory
free -h

# Check which container uses the most
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}"
```

If you're on a 4GB Droplet, memory is tight. Options:
- Upgrade to 8GB ($48/mo) — recommended
- Reduce Java heap sizes in `docker-compose.prod.yml` (e.g., `-Xmx256m` instead of `-Xmx384m`)

### Frontend loads but API calls fail

1. Check the browser's Developer Tools → Network tab for failed requests
2. The frontend nginx proxies `/api/` to the gateway internally — this should work out of the box
3. If you see CORS errors when accessing the API directly (not through the frontend), you may need to add your Droplet IP to the gateway's CORS config:
   ```bash
   # In docker-compose.prod.yml, add to api-gateway environment:
   - GATEWAY_CORS_ALLOWED_ORIGINS=http://YOUR_IP:3000,http://YOUR_IP:8080
   ```

### AI features not working

1. Check the AI service logs:
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production logs ai-service --tail=50
   ```
2. Verify your Groq API key is correct and has remaining quota at [console.groq.com](https://console.groq.com)

### Viewing Flyway migration status

```bash
# Connect to a running container
docker exec -it lms-user-service sh

# Inside the container — check the health endpoint
curl localhost:8081/api/actuator/health
```

### Completely reset and redeploy

```bash
cd /opt/lms
docker compose -f docker-compose.prod.yml --env-file .env.production down -v
docker system prune -af
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

> **Warning:** `down -v` removes the Redis data volume and the submissions volume. Database data is safe in Supabase.

---

## Cost Summary

| Service | Cost | Notes |
|---------|------|-------|
| DigitalOcean Droplet (4GB) | $24/mo | Minimum viable |
| DigitalOcean Droplet (8GB) | $48/mo | Recommended |
| Supabase (Free tier) | $0/mo | 500MB database, pauses after 7 days inactive |
| Supabase (Pro) | $25/mo | 8GB database, no auto-pause |
| Groq API (Free tier) | $0/mo | Rate-limited, sufficient for light use |
| **Total (minimum)** | **$24/mo** | |
| **Total (recommended)** | **$73/mo** | 8GB Droplet + Supabase Pro |

---

## Security Notes

- **Change the default admin password** immediately after first login
- **Set `BOOTSTRAP_ADMIN_ENABLED=false`** after the first deploy (Step 12)
- **Do not expose internal service ports** (8081, 8085, 8088, 8089) to the internet
- **JWT_SECRET** must be long and random — never use the default dev secret
- The `.env.production` file contains secrets — it is gitignored and should never be committed
- Consider setting up DigitalOcean Cloud Firewall for additional network-level protection
