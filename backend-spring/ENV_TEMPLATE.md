# Environment Variables Template for Production Deployment

## Required Environment Variables

### Database Configuration
SPRING_DATASOURCE_URL=jdbc:postgresql://your-db-host:5432/lms_db
SPRING_DATASOURCE_USERNAME=lms_user
SPRING_DATASOURCE_PASSWORD=<strong-password-here>

### Redis Configuration
SPRING_DATA_REDIS_HOST=your-redis-host
SPRING_DATA_REDIS_PORT=6379
SPRING_DATA_REDIS_PASSWORD=<redis-password>

### JWT Configuration
# Generate with: openssl rand -base64 64
JWT_SECRET=<256-bit-secret-key-generate-with-openssl>
JWT_EXPIRATION=3600000
JWT_REFRESH_EXPIRATION=604800000

### CORS Configuration
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

### Server Configuration
SERVER_PORT=8080
SSL_ENABLED=false

### Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=<app-password>
EMAIL_FROM=noreply@yourdomain.com

### Application Configuration
SPRING_PROFILES_ACTIVE=production

## Optional Environment Variables

### SSL/TLS Configuration (if using SSL at application level)
SSL_KEY_STORE=/path/to/keystore.p12
SSL_KEY_STORE_PASSWORD=<keystore-password>

### Monitoring & Observability
METRICS_EXPORT_ENABLED=true

### Logging
LOG_LEVEL=INFO

## Docker Compose Example

```yaml
version: '3.8'

services:
  user-service:
    image: lms-user-service:latest
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/lms_db
      - SPRING_DATASOURCE_USERNAME=lms_user
      - SPRING_DATASOURCE_PASSWORD=${DB_PASSWORD}
      - SPRING_DATA_REDIS_HOST=redis
      - SPRING_DATA_REDIS_PORT=6379
      - SPRING_DATA_REDIS_PASSWORD=${REDIS_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ALLOWED_ORIGINS=${CORS_ORIGINS}
      - SPRING_PROFILES_ACTIVE=production
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=lms_db
      - POSTGRES_USER=lms_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

## Kubernetes ConfigMap Example

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: lms-user-service-config
data:
  SPRING_PROFILES_ACTIVE: "production"
  SERVER_PORT: "8080"
  LOG_LEVEL: "INFO"
```

## Kubernetes Secret Example

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: lms-user-service-secrets
type: Opaque
stringData:
  SPRING_DATASOURCE_URL: "jdbc:postgresql://postgres:5432/lms_db"
  SPRING_DATASOURCE_USERNAME: "lms_user"
  SPRING_DATASOURCE_PASSWORD: "<password>"
  JWT_SECRET: "<jwt-secret>"
  SPRING_DATA_REDIS_PASSWORD: "<redis-password>"
```

## Security Notes

1. **Never commit secrets to version control**
2. **Use secrets management tools** (AWS Secrets Manager, HashiCorp Vault, etc.)
3. **Rotate secrets regularly** (JWT secret, database passwords)
4. **Use strong, randomly generated passwords** (minimum 32 characters)
5. **Enable audit logging** in production
6. **Monitor security metrics** (failed logins, rate limits)
7. **Set up alerts** for security events

## Generating Secrets

### JWT Secret (256-bit)
```bash
openssl rand -base64 64
```

### Strong Password
```bash
openssl rand -base64 32
```

### UUID
```bash
uuidgen
```

