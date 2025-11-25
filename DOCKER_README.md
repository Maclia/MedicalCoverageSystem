# Medical Coverage System - Docker Setup

This guide covers how to set up and run the Medical Coverage System using Docker and Docker Compose.

## 🚀 Quick Start

### Prerequisites

- Docker (>= 20.10)
- Docker Compose (>= 2.0)
- Git
- At least 4GB of available RAM
- At least 10GB of free disk space

### 1. Clone and Setup

```bash
git clone <repository-url>
cd MedicalCoverageSystem

# Copy environment configuration
cp .env.example .env

# Make the startup script executable
chmod +x docker-start.sh
```

### 2. Edit Environment Configuration

Edit the `.env` file with your specific configuration:

```bash
# Database
DATABASE_URL=postgresql://postgres:medical_secure_password_2024@localhost:5432/medical_coverage_db

# Security (IMPORTANT: Change these in production!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production

# Email
SMTP_HOST=your-smtp-server
SMTP_USER=your-email@example.com
SMTP_PASS=your-app-password
```

### 3. Start the System

#### Development Mode
```bash
./docker-start.sh dev
```

#### Production Mode
```bash
./docker-start.sh prod
```

## 📋 Available Services

The Docker setup includes the following services:

| Service | Description | Port | Health Check |
|---------|-------------|------|-------------|
| **postgres** | PostgreSQL Database | 5432 | `/api/health` |
| **redis** | Redis Cache | 6379 | Redis ping |
| **backend** | Node.js API Server | 5000 | `/api/health` |
| **frontend** | React Frontend | 3000 | HTTP request |
| **nginx** | Reverse Proxy (Production) | 80, 443 | HTTP request |

## 🛠️ Management Commands

The `docker-start.sh` script provides convenient commands:

### Development Operations

```bash
# Start development environment
./docker-start.sh dev

# Stop all services
./docker-start.sh stop

# Restart services
./docker-start.sh restart

# View logs
./docker-start.sh logs
```

### Database Operations

```bash
# Run database migrations
./docker-start.sh migrate

# Seed database with sample data
./docker-start.sh seed

# Create database backup
./docker-start.sh backup
```

### System Management

```bash
# Check service health
./docker-start.sh health

# Clean up all containers and volumes
./docker-start.sh clean

# Show help
./docker-start.sh help
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Nginx (Port 80/443)                  │
│                    ┌─────────────────────────────┐         │
│                    │     Frontend (Port 3000)     │         │
│                    │      React Application       │         │
│                    └─────────────────────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                    Backend API (Port 5000)                   │
│  ┌─────────────────┬─────────────────┬─────────────────────┐ │
│  │  Provider       │   Contract      │   Tariff            │ │
│  │  Networks       │   Management    │   Catalogs          │ │
│  └─────────────────┴─────────────────┴─────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                        Infrastructure                        │
│  ┌─────────────────┬─────────────────┬─────────────────────┐ │
│  │ PostgreSQL      │     Redis       │   File Storage      │ │
│  │   (Port 5432)   │   (Port 6379)   │   (/app/uploads)    │ │
│  └─────────────────┴─────────────────┴─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Configuration

### Environment Variables

Key environment variables in `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `DATABASE_URL` | PostgreSQL connection string | See above |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` |
| `JWT_SECRET` | JWT signing secret | **Must be changed** |
| `UPLOAD_DIR` | File upload directory | `/app/uploads` |
| `MAX_FILE_SIZE` | Maximum file size (bytes) | `10485760` |

### SSL Configuration (Production)

For production deployment with SSL:

1. Place SSL certificates in `nginx/ssl/`:
   ```
   nginx/ssl/cert.pem
   nginx/ssl/key.pem
   ```

2. Ensure `.env` includes:
   ```
   NODE_ENV=production
   FORCE_HTTPS=true
   ```

## 📊 Accessing the Application

### Development Mode

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api/docs
- **Database**: localhost:5432 (with any PostgreSQL client)
- **Redis**: localhost:6379 (with any Redis client)

### Production Mode

- **Application**: https://localhost (via Nginx)
- **Direct Backend**: http://localhost:5000
- **Direct Frontend**: http://localhost:3000

## 🔍 Monitoring and Logs

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Health Checks

```bash
# Check all service health
./docker-start.sh health

# Manual health check
curl http://localhost:5000/api/health
curl http://localhost:3000/health
```

### Performance Monitoring

The system includes built-in health checks and metrics:

- **Response times**: Monitored via health check endpoints
- **Database connections**: Tracked in application logs
- **Memory usage**: Available via Docker stats

## 🗄️ Database Management

### Connecting to Database

```bash
# Using docker-compose
docker-compose exec postgres psql -U postgres -d medical_coverage_db

# Using external client
# Host: localhost
# Port: 5432
# Database: medical_coverage_db
# Username: postgres
# Password: medical_secure_password_2024
```

### Running Migrations

```bash
# Push schema changes
docker-compose exec backend npm run db:push

# Generate migrations
docker-compose exec backend npm run db:generate
```

### Backups

```bash
# Create backup
./docker-start.sh backup

# Restore backup
docker-compose exec postgres psql -U postgres -d medical_coverage_db < backup-file.sql
```

## 🔒 Security Considerations

### Production Security Checklist

- [ ] Change default passwords and secrets
- [ ] Configure SSL certificates
- [ ] Set up firewall rules
- [ ] Enable rate limiting (configured in Nginx)
- [ ] Review CORS settings
- [ ] Set up log rotation
- [ ] Configure backup retention
- [ ] Enable monitoring and alerts

### File Uploads

- All uploads are scanned for viruses (placeholder implementation)
- File types are restricted by MIME type and extension
- Uploads are stored in `/app/uploads` directory
- Maximum file size: 10MB (configurable)

## 🚀 Deployment Options

### Development Deployment

```bash
# Start with hot reload
./docker-start.sh dev

# View logs in separate terminal
./docker-start.sh logs
```

### Production Deployment

```bash
# Start production services
./docker-start.sh prod

# Scale services if needed
docker-compose up -d --scale backend=2
```

### Staging Deployment

```bash
# Create staging environment file
cp .env.example .env.staging

# Edit staging configuration
# ... edit .env.staging ...

# Deploy with staging config
docker-compose --env-file .env.staging up -d
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Services Won't Start

```bash
# Check Docker status
docker info

# Check for port conflicts
netstat -tulpn | grep :3000
netstat -tulpn | grep :5000

# Check disk space
df -h
```

#### 2. Database Connection Errors

```bash
# Check database container
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Test connection manually
docker-compose exec backend npm run db:test
```

#### 3. Build Failures

```bash
# Clean build without cache
./docker-start.sh dev --no-cache

# Remove node_modules and rebuild
docker-compose exec backend rm -rf node_modules
docker-compose restart backend
```

#### 4. Permission Issues

```bash
# Fix file permissions
sudo chown -R $USER:$USER uploads/
sudo chown -R $USER:$USER logs/
sudo chown -R $USER:$USER backups/
```

### Getting Help

1. Check the logs: `./docker-start.sh logs`
2. Verify service health: `./docker-start.sh health`
3. Review environment configuration: `.env`
4. Check Docker resources: `docker system df`

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [React Documentation](https://react.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## 🤝 Contributing

When contributing to this project:

1. Test your changes in the Docker environment
2. Update documentation as needed
3. Follow the existing code style
4. Add health checks for new services
5. Update the docker-start.sh script if adding new services

---

For questions or issues, please refer to the main project documentation or create an issue in the repository.