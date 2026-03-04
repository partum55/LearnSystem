# CDN Deployment Configuration

## Overview

This document describes the CDN configuration for serving the LearnSystemUCU frontend.

## Recommended CDN Options

1. **CloudFlare** (Recommended) - Free tier available, excellent performance
2. **AWS CloudFront** - If using AWS infrastructure
3. **Azure CDN** - If using Azure infrastructure
4. **Nginx with caching** - Self-hosted option

## Configuration

### Option 1: CloudFlare Configuration

```yaml
# cloudflare-config.yml
zone:
  name: learnsystem.example.com
  plan: free

dns:
  - type: CNAME
    name: app
    content: origin.learnsystem.example.com
    proxied: true

page_rules:
  # Cache static assets aggressively
  - url: "*.learnsystem.example.com/static/*"
    actions:
      cache_level: cache_everything
      edge_cache_ttl: 2592000  # 30 days
      browser_cache_ttl: 2592000

  # Don't cache API calls
  - url: "*.learnsystem.example.com/api/*"
    actions:
      cache_level: bypass

  # Don't cache index.html (for SPA routing)
  - url: "*.learnsystem.example.com/"
    actions:
      cache_level: bypass

caching:
  level: standard
  
security:
  ssl: full_strict
  min_tls_version: "1.2"
  
performance:
  minify:
    javascript: true
    css: true
    html: true
  brotli: true
  http2: true
  http3: true
```

### Option 2: Nginx CDN/Caching Configuration

```nginx
# nginx-cdn.conf
# Use this for self-hosted caching layer

upstream frontend_origin {
    server frontend:80;
    keepalive 64;
}

proxy_cache_path /var/cache/nginx/frontend 
    levels=1:2 
    keys_zone=frontend_cache:100m 
    max_size=10g 
    inactive=60d 
    use_temp_path=off;

server {
    listen 80;
    listen 443 ssl http2;
    server_name app.learnsystem.example.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss text/javascript image/svg+xml;

    # Brotli compression (if module installed)
    brotli on;
    brotli_comp_level 6;
    brotli_types text/plain text/css text/xml application/json application/javascript application/xml+rss text/javascript image/svg+xml;

    # Static assets - aggressive caching
    location /static/ {
        proxy_pass http://frontend_origin;
        proxy_cache frontend_cache;
        proxy_cache_valid 200 30d;
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_background_update on;
        proxy_cache_lock on;

        add_header X-Cache-Status $upstream_cache_status;
        add_header Cache-Control "public, max-age=31536000, immutable";

        # Enable HTTP/2 push for critical assets
        http2_push_preload on;
    }

    # Favicon and manifest
    location ~* \.(ico|manifest\.json|robots\.txt)$ {
        proxy_pass http://frontend_origin;
        proxy_cache frontend_cache;
        proxy_cache_valid 200 7d;
        add_header Cache-Control "public, max-age=604800";
    }

    # API calls - no caching, proxy to gateway
    location /api/ {
        proxy_pass http://api-gateway:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # No caching for API
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # SPA fallback - minimal caching
    location / {
        proxy_pass http://frontend_origin;
        proxy_cache frontend_cache;
        proxy_cache_valid 200 5m;
        
        # Don't cache HTML for SPA
        add_header Cache-Control "no-cache, must-revalidate";
    }
}
```

### Option 3: AWS CloudFront Configuration

```json
{
  "DistributionConfig": {
    "Origins": {
      "Items": [
        {
          "Id": "frontend-origin",
          "DomainName": "frontend-alb.example.com",
          "CustomOriginConfig": {
            "HTTPPort": 80,
            "HTTPSPort": 443,
            "OriginProtocolPolicy": "https-only"
          }
        },
        {
          "Id": "api-origin",
          "DomainName": "api-gateway.example.com",
          "CustomOriginConfig": {
            "HTTPPort": 80,
            "HTTPSPort": 443,
            "OriginProtocolPolicy": "https-only"
          }
        }
      ]
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": "frontend-origin",
      "ViewerProtocolPolicy": "redirect-to-https",
      "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
      "CachedMethods": ["GET", "HEAD"],
      "Compress": true,
      "DefaultTTL": 300,
      "MaxTTL": 86400,
      "MinTTL": 0
    },
    "CacheBehaviors": {
      "Items": [
        {
          "PathPattern": "/static/*",
          "TargetOriginId": "frontend-origin",
          "ViewerProtocolPolicy": "https-only",
          "DefaultTTL": 2592000,
          "MaxTTL": 31536000,
          "Compress": true
        },
        {
          "PathPattern": "/api/*",
          "TargetOriginId": "api-origin",
          "ViewerProtocolPolicy": "https-only",
          "AllowedMethods": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
          "DefaultTTL": 0,
          "MaxTTL": 0,
          "MinTTL": 0
        }
      ]
    },
    "PriceClass": "PriceClass_100",
    "Enabled": true,
    "HttpVersion": "http2and3"
  }
}
```

## Build Configuration for CDN

Update `package.json` to include content hashing:

```json
{
  "scripts": {
    "build": "tsc -b && vite build",
    "build:production": "tsc -b && vite build --mode production"
  }
}
```

## Cache Headers Reference

| Resource Type | Cache-Control | TTL |
|---------------|---------------|-----|
| Static JS/CSS (hashed) | public, max-age=31536000, immutable | 1 year |
| Images/Fonts | public, max-age=2592000 | 30 days |
| index.html | no-cache, must-revalidate | 0 |
| API responses | no-store | 0 |
| favicon.ico | public, max-age=604800 | 7 days |

## Verification

After CDN deployment, verify:

1. **Cache headers**: `curl -I https://app.example.com/static/js/main.*.js`
2. **Compression**: Check `Content-Encoding: br` or `gzip`
3. **Cache hit rate**: Monitor CDN dashboard
4. **TTFB improvement**: Compare with origin directly
