# Enterprise Performance Engine - Production Deployment Guide

Complete guide for deploying the Enterprise Performance Engine to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Docker Deployment](#docker-deployment)
3. [Kubernetes Deployment](#kubernetes-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [SSL/TLS Configuration](#ssltls-configuration)
7. [Monitoring & Logging](#monitoring--logging)
8. [Backup & Recovery](#backup--recovery)
9. [Scaling](#scaling)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Services

- **PostgreSQL 14+**: Relational database
- **Redis 7+**: Caching and job queue
- **Node.js 18+**: Runtime environment (for non-Docker deployments)

### Required API Keys

- **Anthropic API Key**: For AI content generation with Claude 3.5 Sonnet
- **OpenAI API Key**: For vector embeddings (text-embedding-ada-002)
- **Pinecone API Key**: For vector database and semantic search

### Infrastructure Requirements

**Minimum Production Specs:**
- **API Server**: 2 vCPU, 4GB RAM, 20GB storage
- **Admin Dashboard**: 1 vCPU, 2GB RAM, 10GB storage
- **PostgreSQL**: 2 vCPU, 4GB RAM, 50GB storage (SSD recommended)
- **Redis**: 1 vCPU, 2GB RAM, 10GB storage

**Recommended Production Specs:**
- **API Server**: 4 vCPU, 8GB RAM, 50GB storage
- **Admin Dashboard**: 2 vCPU, 4GB RAM, 20GB storage
- **PostgreSQL**: 4 vCPU, 8GB RAM, 100GB storage (SSD)
- **Redis**: 2 vCPU, 4GB RAM, 20GB storage

---

## Docker Deployment

### Quick Start with Docker Compose

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd enterprise-performance-engine
```

#### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.docker.example .env

# Edit the .env file with your production values
nano .env
```

**Critical variables to change:**
- `DATABASE_PASSWORD`: Strong PostgreSQL password
- `REDIS_PASSWORD`: Strong Redis password
- `JWT_SECRET`: Generate with `openssl rand -base64 32`
- `JWT_REFRESH_SECRET`: Generate with `openssl rand -base64 32`
- `ANTHROPIC_API_KEY`: Your Claude API key
- `OPENAI_API_KEY`: Your OpenAI API key
- `PINECONE_API_KEY`: Your Pinecone API key

#### 3. Start All Services

```bash
# Build and start all containers
docker-compose up -d

# View logs
docker-compose logs -f

# Check container status
docker-compose ps
```

#### 4. Initialize Database

The database migrations run automatically on API container startup. To manually run migrations:

```bash
docker-compose exec api npx prisma migrate deploy
```

#### 5. Create First User

```bash
# Access the API container
docker-compose exec api sh

# Run Prisma Studio (optional, for GUI)
npx prisma studio

# Or use the API endpoint to register the first super admin
```

#### 6. Access the Applications

- **Admin Dashboard**: http://localhost:3000
- **API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs
- **Health Check**: http://localhost:3001/api/v1/health

### Production Docker Deployment

#### Using Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml epe

# Check services
docker service ls

# View logs
docker service logs epe_api
```

#### Using Docker with NGINX Reverse Proxy

Create `nginx.conf`:

```nginx
upstream api {
    server localhost:3001;
}

upstream admin {
    server localhost:3000;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name admin.yourdomain.com;

    location / {
        proxy_pass http://admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Kubernetes Deployment

### Kubernetes Manifests

#### Namespace

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: epe
```

#### ConfigMap

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: epe-config
  namespace: epe
data:
  NODE_ENV: "production"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  DATABASE_HOST: "postgres-service"
  DATABASE_PORT: "5432"
  DATABASE_NAME: "epe"
```

#### Secrets

```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: epe-secrets
  namespace: epe
type: Opaque
stringData:
  DATABASE_PASSWORD: "your-db-password"
  REDIS_PASSWORD: "your-redis-password"
  JWT_SECRET: "your-jwt-secret"
  JWT_REFRESH_SECRET: "your-jwt-refresh-secret"
  ANTHROPIC_API_KEY: "your-anthropic-key"
  OPENAI_API_KEY: "your-openai-key"
  PINECONE_API_KEY: "your-pinecone-key"
```

#### PostgreSQL Deployment

```yaml
# postgres-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: epe
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:14-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          valueFrom:
            configMapKeyRef:
              name: epe-config
              key: DATABASE_NAME
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: epe-secrets
              key: DATABASE_PASSWORD
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: epe
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

#### API Deployment

```yaml
# api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: epe
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: your-registry/epe-api:latest
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          value: "postgresql://epe_user:$(DATABASE_PASSWORD)@postgres-service:5432/epe"
        envFrom:
        - configMapRef:
            name: epe-config
        - secretRef:
            name: epe-secrets
        livenessProbe:
          httpGet:
            path: /api/v1/health/liveness
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/v1/health/readiness
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: epe
spec:
  type: LoadBalancer
  selector:
    app: api
  ports:
  - port: 80
    targetPort: 3001
```

### Deploy to Kubernetes

```bash
# Apply manifests
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f postgres-deployment.yaml
kubectl apply -f redis-deployment.yaml
kubectl apply -f api-deployment.yaml
kubectl apply -f admin-deployment.yaml

# Check status
kubectl get all -n epe

# View logs
kubectl logs -n epe deployment/api -f

# Scale API
kubectl scale deployment/api --replicas=5 -n epe
```

---

## Environment Configuration

### Security Best Practices

1. **Strong Passwords**: Use 32+ character random passwords
2. **Rotate Secrets**: Regularly rotate JWT secrets and API keys
3. **HTTPS Only**: Always use SSL/TLS in production
4. **Rate Limiting**: Configure appropriate rate limits
5. **CORS**: Set specific allowed origins (not wildcards)

### Environment-Specific Configs

#### Development
```env
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_MAX=1000
```

#### Staging
```env
NODE_ENV=staging
CORS_ORIGIN=https://staging.yourdomain.com
RATE_LIMIT_MAX=200
```

#### Production
```env
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_MAX=100
```

---

## Database Setup

### Initial Migration

```bash
# Using Docker
docker-compose exec api npx prisma migrate deploy

# Using local install
cd apps/api
npx prisma migrate deploy
```

### Prisma Studio (Database GUI)

```bash
# Access database GUI
docker-compose exec api npx prisma studio

# Access at http://localhost:5555
```

### Creating Organizations

```sql
-- Connect to PostgreSQL
psql -U epe_user -d epe

-- Create organization
INSERT INTO organizations (id, name, slug, status, settings, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'ACME Corporation',
  'acme-corp',
  'ACTIVE',
  '{"branding":{"primaryColor":"#3b82f6"},"features":{"aiGeneration":true,"analytics":true},"limits":{"maxUsers":1000,"maxCourses":100}}',
  NOW(),
  NOW()
);
```

---

## SSL/TLS Configuration

### Using Let's Encrypt with Certbot

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.yourdomain.com -d admin.yourdomain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

### Update NGINX for HTTPS

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3001;
        # ... proxy settings
    }
}
```

---

## Monitoring & Logging

### Health Checks

- **Basic Health**: `GET /api/v1/health`
- **Detailed Health**: `GET /api/v1/health/detailed`
- **Liveness Probe**: `GET /api/v1/health/liveness`
- **Readiness Probe**: `GET /api/v1/health/readiness`

### Viewing Logs

```bash
# Docker Compose
docker-compose logs -f api
docker-compose logs -f admin

# Kubernetes
kubectl logs -n epe deployment/api -f
```

### Log Aggregation

Logs are written to:
- **Combined logs**: `apps/api/logs/combined.log`
- **Error logs**: `apps/api/logs/error.log`
- **Access logs**: `apps/api/logs/access.log`

Use tools like:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Grafana Loki**
- **Datadog**
- **CloudWatch** (AWS)

### Metrics

Monitor these key metrics:
- API response times
- Database connection pool usage
- Redis memory usage
- AI generation job queue length
- Error rates
- User authentication failures

---

## Backup & Recovery

### Database Backup

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)

docker-compose exec -T postgres pg_dump -U epe_user epe > "$BACKUP_DIR/epe_$DATE.sql"

# Compress backup
gzip "$BACKUP_DIR/epe_$DATE.sql"

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

### Database Restore

```bash
# Restore from backup
gunzip epe_20240115_120000.sql.gz
docker-compose exec -T postgres psql -U epe_user epe < epe_20240115_120000.sql
```

### Redis Backup

Redis automatically creates snapshots in `/data` volume.

```bash
# Manual backup
docker-compose exec redis redis-cli BGSAVE

# Copy snapshot
docker cp epe-redis:/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb
```

---

## Scaling

### Horizontal Scaling (Multiple Instances)

#### API Scaling

```bash
# Docker Compose
docker-compose up -d --scale api=3

# Kubernetes
kubectl scale deployment/api --replicas=5 -n epe
```

#### Load Balancing

Use NGINX or a cloud load balancer:

```nginx
upstream api_backend {
    least_conn;
    server api1:3001;
    server api2:3001;
    server api3:3001;
}
```

### Vertical Scaling (Resource Limits)

#### Docker Compose

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

#### Kubernetes

```yaml
resources:
  requests:
    memory: "2Gi"
    cpu: "1000m"
  limits:
    memory: "4Gi"
    cpu: "2000m"
```

---

## Troubleshooting

### Common Issues

#### 1. API Won't Start

**Check logs:**
```bash
docker-compose logs api
```

**Common causes:**
- Database not ready (wait for health check)
- Missing environment variables
- Port already in use

**Solution:**
```bash
docker-compose down
docker-compose up -d postgres redis
# Wait 10 seconds
docker-compose up -d api
```

#### 2. Database Connection Errors

**Check connection:**
```bash
docker-compose exec api npx prisma db pull
```

**Verify DATABASE_URL format:**
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

#### 3. AI Generation Not Working

**Verify API keys:**
```bash
docker-compose exec api sh
echo $ANTHROPIC_API_KEY
echo $OPENAI_API_KEY
```

**Check Pinecone index exists:**
```bash
# Use Pinecone console to verify index
```

#### 4. High Memory Usage

**Check Redis memory:**
```bash
docker-compose exec redis redis-cli INFO memory
```

**Clear cache if needed:**
```bash
docker-compose exec redis redis-cli FLUSHDB
```

#### 5. Slow API Response

**Check database queries:**
```bash
# Enable query logging in Prisma
DATABASE_URL="postgresql://...?connection_limit=10&pool_timeout=20"
```

**Optimize database:**
```sql
-- Analyze tables
ANALYZE;

-- Vacuum database
VACUUM ANALYZE;
```

### Getting Help

- **Documentation**: Check `/docs` directory
- **Logs**: Always check application logs first
- **Health Endpoint**: Use `/api/v1/health/detailed` for diagnostics
- **GitHub Issues**: Report bugs at repository issues page

---

## Production Checklist

Before going live:

- [ ] Change all default passwords
- [ ] Generate strong JWT secrets
- [ ] Configure SSL/TLS certificates
- [ ] Set up database backups
- [ ] Configure monitoring and alerts
- [ ] Test disaster recovery plan
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Set up log aggregation
- [ ] Test health check endpoints
- [ ] Configure firewall rules
- [ ] Enable security headers (Helmet.js)
- [ ] Review and test scaling strategy
- [ ] Document runbook for on-call team
- [ ] Load test the application
- [ ] Set up CDN for static assets (optional)

---

**Enterprise Performance Engine** is now production-ready! 🚀

For additional support, consult the main [README.md](../README.md) and [SETUP.md](./SETUP.md) documentation.
