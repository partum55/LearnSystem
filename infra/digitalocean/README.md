# DigitalOcean Deployment Guide

Deploy the Java microservices using Docker Compose.

## Deployment Method
We use **Docker Compose** on a DigitalOcean Droplet.

## Files
The canonical compose file is `infra/docker/docker-compose.yml`.

## Steps
1. SSH into your Droplet.
2. Clone the repository.
3. Copy the production env template and fill in real secrets:
   ```bash
   cp config/env/.env.production.example config/env/.env.production
   # edit config/env/.env.production
   ```
4. Run:
   ```bash
   ./scripts/prod.sh
   ```

## Domain Configuration
Point `api.learnsystem.app` to your Droplet IP.
Caddy will automatically handle HTTPS for the API Gateway.
