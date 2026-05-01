# Production Grade Deployment Pipeline
## Medical Coverage System Monorepo

---

## 🚀 Architecture Overview

### **Deployment Options**
| Strategy | Complexity | Scalability | Best For |
|----------|------------|-------------|----------|
| **Single VPS + Docker Compose** | Low | Vertical | < 1M users, early stage |
| **Kubernetes (K3s)** | Medium | Horizontal | > 1M users, production |
| **Managed Kubernetes (EKS/GKE)** | High | Unlimited | Enterprise scale |

---

## 🐳 Docker Standardization

### 1. Root Dockerfile (Build Stage)
```dockerfile
# turbo-build.Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# Each service extracts only what it needs from this builder
```

### 2. Standard Service Dockerfile
Used for ALL 13 microservices:
```dockerfile
# service.Dockerfile
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/services/${SERVICE_NAME}/dist ./dist
COPY --from=builder /app/services/${SERVICE_NAME}/package.json ./

EXPOSE 3000

USER node
CMD ["node", "dist/server.js"]
```

### 3. Client Dockerfile
```dockerfile
# client.Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:client

FROM nginx:alpine
COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

---

## 📦 Docker Compose Production Stack (VPS Deployment)

File: `docker-compose.prod.yml`

```yaml
version: '3.8'

networks:
  medical-system:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
  prometheus-data:
  grafana-data:

services:
  # Reverse Proxy / SSL Termination
  traefik:
    image: traefik:v2.11
    command:
      - "--api.insecure=false"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@yourdomain.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "./letsencrypt:/letsencrypt"
    networks:
      - medical-system
    restart: always

  # Database Cluster
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: medical_admin
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
      POSTGRES_DB: medical_system
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    secrets:
      - db_password
    networks:
      - medical-system
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U medical_admin"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Cache / Message Broker
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - medical-system
    restart: always
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # API Gateway
  api-gateway:
    build:
      context: .
      dockerfile: service.Dockerfile
      args:
        SERVICE_NAME: api-gateway
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.yourdomain.com`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
    networks:
      - medical-system
    restart: always

  # All microservices follow exact same pattern
  claims-service:
    build:
      context: .
      dockerfile: service.Dockerfile
      args:
        SERVICE_NAME: claims-service
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - medical-system
    restart: always
    deploy:
      replicas: 2

  billing-service:
    build:
      context: .
      dockerfile: service.Dockerfile
      args:
        SERVICE_NAME: billing-service
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - medical-system
    restart: always
    deploy:
      replicas: 2

  # Client Application
  client:
    build:
      context: .
      dockerfile: client.Dockerfile
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.client.rule=Host(`app.yourdomain.com`)"
      - "traefik.http.routers.client.entrypoints=websecure"
      - "traefik.http.routers.client.tls.certresolver=letsencrypt"
    networks:
      - medical-system
    restart: always

  # Monitoring Stack
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    networks:
      - medical-system
    restart: always

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - medical-system
    restart: always

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

---

## 🔄 CI/CD Pipeline (Github Actions)

File: `.github/workflows/deploy.yml`

```yaml
name: Production Deployment

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Turbo Build
        run: npm run build

      - name: Run tests
        run: npm run test:ci

      - name: Build & Push Docker images
        run: |
          docker compose -f docker-compose.prod.yml build
          docker compose -f docker-compose.prod.yml push

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/medical-system
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d --remove-orphans
            docker system prune -af
```

---

## ☸️ Kubernetes Production Deployment

### Core Components:
1. **Ingress Controller**: NGINX Ingress with Cert Manager
2. **Service Mesh**: Linkerd for mTLS, retries, circuit breaking
3. **Database**: Crunchy Data PostgreSQL Operator
4. **Redis**: Redis Cluster Operator
5. **Observability**: Prometheus + Grafana + Loki
6. **GitOps**: ArgoCD for deployments

### Recommended Node Pool (K3s):
| Node Size | Count | Purpose |
|-----------|-------|---------|
| 4vCPU 8GB | 3 | Control Plane |
| 8vCPU 16GB | 4 | Workload Nodes |
| 4vCPU 8GB | 2 | Monitoring / System |

---

## 🛡️ Production Hardening Checklist

✅ **Secrets Management**:
- Never commit .env files
- Use Docker Secrets / Kubernetes Secrets
- Rotate credentials every 90 days

✅ **Network Security**:
- All internal communication on private network
- Only Traefik / Ingress exposed publicly
- mTLS between all services
- Network Policies restricting pod communication

✅ **Reliability**:
- 2+ replicas for all stateless services
- Liveness + Readiness probes
- Pod disruption budgets
- Automatic rollbacks on failure

✅ **Observability**:
- Structured JSON logging
- Metrics on all endpoints
- Distributed tracing
- Alerting for SLO breaches

✅ **Backup Strategy**:
- Daily PostgreSQL backups to S3
- Point-in-time recovery enabled
- Weekly disaster recovery tests

---

## 🚀 Deployment Commands

### Initial VPS Setup:
```bash
# Provision Ubuntu 22.04 VPS
ssh root@your-vps-ip

# Install Docker
curl -fsSL https://get.docker.com | bash

# Prepare deployment directory
mkdir -p /opt/medical-system
cd /opt/medical-system

# Copy secrets
mkdir secrets
echo "your-secure-db-password" > secrets/db_password.txt

# First deployment
docker compose -f docker-compose.prod.yml up -d
```

### Zero Downtime Deployments:
```bash
# Pull new images
docker compose -f docker-compose.prod.yml pull

# Rolling update
docker compose -f docker-compose.prod.yml up -d --no-deps --scale claims-service=3 claims-service
docker compose -f docker-compose.prod.yml up -d --no-deps --scale claims-service=2 claims-service
```

---

## 📊 SLO Targets

| Metric | Target |
|--------|--------|
| API Availability | 99.9% |
| Response Time P95 | < 500ms |
| Build Time | < 10 minutes |
| Deployment Time | < 2 minutes |
| Recovery Time Objective | < 15 minutes |

---

## 🔮 Scaling Roadmap

1. **Vertical**: Scale VPS up to 16vCPU 64GB
2. **Horizontal**: Add second VPS + Docker Swarm
3. **Kubernetes**: Migrate to K3s cluster at ~500k users
4. **Managed**: Move to EKS/GKE at >2M users

This pipeline is designed to grow with your system while maintaining production grade reliability from day one.