# Medical Coverage System - Microservices Architecture

A comprehensive medical coverage/insurance management system built with modern web technologies and microservices architecture.

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+
- Neon PostgreSQL account
- Vercel account (for deployment)
- 8 separate Neon databases (one per microservice)

### **Local Development Setup**

```bash
# Clone the repository
git clone <repository-url>
cd MedicalCoverageSystem

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your 8 Neon database URLs

# Deploy database schemas for all services
npm run db:push:all

# Start development server
npm run dev
```

### **Production Deployment**

#### **1. Database Setup (Neon)**
1. Create a [Neon](https://neon.tech) account
2. Create 8 separate databases:
   - `medical-coverage-core`
   - `medical-coverage-crm`
   - `medical-coverage-claims`
   - `medical-coverage-providers`
   - `medical-coverage-finance`
   - `medical-coverage-tokens`
   - `medical-coverage-schemes`
   - `medical-coverage-analytics`

#### **2. Environment Configuration**
Update your `.env` file with all 8 database connection strings:
```bash
CORE_DATABASE_URL=postgresql://...
CRM_DATABASE_URL=postgresql://...
CLAIMS_DATABASE_URL=postgresql://...
# ... etc for all 8 services
```

#### **3. Deploy to Vercel**
```bash
# Deploy frontend and serverless functions
vercel --prod
```

#### **4. Docker Deployment (Alternative)**
The project includes Docker support for containerized deployment.

```bash
# Ensure Docker and Docker Compose are installed

# Build and run all services
./run-all-services.sh  # Linux/Mac
# or
run-all-services.bat   # Windows

# Or build individually
docker build -t medical-client ./client
docker build -t medical-server ./server
# Build other services as needed

# For orchestrated deployment, create a docker-compose.yml
# See docs/DOCKER_README.md for details
```

---

## 🏗️ **Microservices Architecture**

This system is built on a **microservices architecture** with 9 independent services, each with its own database and domain responsibility.

### **Service Overview**

| Service | Database | Responsibility | Key Features |
|---------|----------|----------------|--------------|
| **API Gateway** | `medical-coverage-api-gateway` | API Routing & Authentication | Request routing, auth, rate limiting |
| **Billing** | `medical-coverage-billing` | Invoicing & Payments | Invoice generation, payment processing |
| **Core** | `medical-coverage-core` | Member & Company Management | Member registry, company management, cards |
| **CRM** | `medical-coverage-crm` | Sales & Commissions | Lead management, agent performance, commissions |
| **Finance** | `medical-coverage-finance` | Financial Operations | Premium billing, payment processing, ledger |
| **Hospital** | `medical-coverage-hospital` | Hospital Management | Hospital data, integrations |
| **Insurance** | `medical-coverage-insurance` | Insurance Policies | Policy management, underwriting |
| **Membership** | `medical-coverage-membership` | Membership Services | Enrollment, renewals, benefits |
| **Wellness** | `medical-coverage-wellness` | Wellness Programs | Health programs, incentives |

### **Architecture Benefits**
- ✅ **Independent Scaling**: Each service scales based on its load
- ✅ **Technology Flexibility**: Services can use different tech stacks
- ✅ **Fault Isolation**: Issues in one service don't affect others
- ✅ **Team Autonomy**: Development teams work independently
- ✅ **Data Sovereignty**: Each service owns its domain data

---

## 🛠️ **Technology Stack**

### **Frontend**
- **React 18** + **Vite** - Modern React development
- **TypeScript** - Type-safe development
- **Radix UI** - Accessible component library
- **Tailwind CSS** - Utility-first styling
- **React Query** - Server state management
- **Wouter** - Lightweight routing

### **Backend**
- **Node.js** + **Express** - RESTful API services
- **TypeScript** - Full-stack type safety
- **Modular Architecture** - Pluggable business modules
- **Serverless Functions** - Vercel deployment ready

### **Database**
- **PostgreSQL** (Neon Serverless) - Primary database
- **Drizzle ORM** - Type-safe database operations
- **Zod** - Runtime data validation
- **8 Separate Databases** - One per microservice

### **Deployment & DevOps**
- **Vercel** - Frontend and serverless deployment
- **Neon** - Serverless PostgreSQL
- **Docker** - Containerization (optional)
- **Jest** - Testing framework

---

## 📁 **Project Structure**

```
MedicalCoverageSystem/
├── client/                    # React frontend (Vercel)
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/            # Page components
│   │   ├── hooks/            # Custom React hooks
│   │   └── lib/              # Utilities & API clients
│   ├── vercel.json           # Vercel configuration
│   └── package.json
├── server/                    # Node.js backend services
│   ├── modules/              # Pluggable business modules
│   │   ├── core/            # Core service module
│   │   ├── crm/             # CRM service module
│   │   ├── claims/          # Claims service module
│   │   └── ...              # Other service modules
│   ├── services/             # Shared business logic
│   ├── api/                  # API route handlers
│   └── index.ts             # Server entry point
├── shared/                    # Shared types & schemas
│   ├── schemas/             # Database schemas (8 files)
│   │   ├── core.ts
│   │   ├── crm.ts
│   │   ├── claims.ts
│   │   └── ...
│   └── types.ts             # Shared TypeScript types
├── config/                    # Configuration files
│   ├── drizzle.*.config.ts   # Database configs (8 files)
│   ├── jest.config.js
│   └── tailwind.config.ts
├── scripts/                   # Automation scripts
├── docs/                     # Documentation
└── tests/                    # Test suites
```

---

## 🔧 **Development Workflow**

### **Available Scripts**
```bash
# Development
npm run dev              # Start all services in development
npm run dev:client       # Frontend only
npm run dev:server       # Backend only

# Database
npm run db:push:all      # Deploy all service schemas
npm run db:push:core     # Deploy core service schema only
npm run db:studio        # Open Drizzle Studio

# Testing
npm run test:all         # Run complete test suite
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests

# Deployment
npm run build            # Build all services
npm run vercel:deploy    # Deploy to Vercel
```

### **Environment Variables**
See `.env.example` for the complete list of required environment variables (8 database URLs + other configs).

### **Adding New Features**
1. **Identify Service**: Determine which microservice owns the feature
2. **Update Schema**: Modify the appropriate schema in `shared/schemas/`
3. **Run Migration**: `npm run db:push:[service]`
4. **Update Code**: Modify service module and API routes
5. **Test**: Run relevant test suites

---

## 🚀 **Deployment Guide**

### **Automated CI/CD**
1. Push to main branch
2. Vercel automatically builds and deploys frontend
3. Database migrations run automatically
4. All 8 services deploy independently

### **Manual Deployment**
```bash
# Deploy all services
npm run build
vercel --prod

# Deploy specific service
vercel --prod --scope [service-name]
```

### **Database Deployment**
```bash
# Deploy all schemas
npm run db:push:all

# Deploy individual service
CORE_DATABASE_URL="..." npm run db:push
```

---

## 📊 **Database Management**

### **Neon PostgreSQL Features**
- **Serverless Scaling**: Automatic scaling based on usage
- **Global Distribution**: Low-latency worldwide connections
- **Branching**: Database branching for development
- **Auto-pause**: Cost optimization for development databases

### **Schema Management**
- **Type Safety**: Full TypeScript integration with Drizzle
- **Migrations**: Automatic schema deployment
- **Validation**: Runtime data validation with Zod
- **Relationships**: Proper foreign key constraints

### **Multi-Database Architecture**
Each service has its own database for:
- **Performance**: Smaller, focused databases
- **Security**: Data isolation between domains
- **Scalability**: Independent database scaling
- **Maintenance**: Easier updates and rollbacks

---

## 🧪 **Testing Strategy**

### **Test Types**
```bash
# Unit Tests
npm run test:unit        # Service logic, utilities

# Integration Tests
npm run test:integration # Cross-service communication

# End-to-End Tests
npm run test:e2e         # Full user workflows

# Database Tests
npm run test:db          # Schema validation, migrations
```

### **Test Coverage**
- **Unit Tests**: 80%+ coverage for business logic
- **Integration Tests**: API contracts and data flow
- **E2E Tests**: Critical user journeys
- **Performance Tests**: Load and stress testing

---

## 🔒 **Security & Compliance**

### **Data Security**
- **Encryption**: SSL/TLS for all connections
- **Access Control**: Role-based permissions
- **Audit Logging**: Comprehensive activity tracking
- **Data Masking**: Sensitive data protection

### **Compliance**
- **HIPAA**: Healthcare data protection
- **GDPR**: Data privacy and consent
- **PCI DSS**: Payment data security
- **SOC 2**: Security and availability

---

## 📈 **Monitoring & Analytics**

### **Application Monitoring**
- **Performance**: Response times, throughput, error rates
- **Health Checks**: Automated service monitoring
- **Logging**: Structured logging with correlation IDs
- **Alerting**: Automated alerts for issues

### **Business Analytics**
- **Real-time Dashboards**: Executive and operational views
- **Custom Reports**: Ad-hoc reporting capabilities
- **Predictive Analytics**: ML-powered insights
- **Data Export**: Multiple format support

---

## 🤝 **Contributing**

### **Development Process**
1. **Choose Service**: Identify the relevant microservice
2. **Create Branch**: `git checkout -b feature/[service]/[feature-name]`
3. **Make Changes**: Update code, tests, and documentation
4. **Run Tests**: `npm run test:all`
5. **Submit PR**: Create pull request with detailed description

### **Code Standards**
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality and consistency
- **Prettier**: Automatic code formatting
- **Conventional Commits**: Standardized commit messages

---

## 📚 **Documentation**

- **[Microservices Setup](./MICROSERVICES_DATABASE_SETUP.md)** - Complete database setup guide
- **[Vercel Deployment](./VERCEL_NEON_README.md)** - Deployment and hosting guide
- **[API Documentation](./docs/)** - Service API references
- **[Migration Guide](./docs/migration.md)** - Legacy system migration

---

## 🆘 **Support & Troubleshooting**

### **Common Issues**
- **Database Connection**: Verify Neon connection strings
- **Migration Errors**: Check schema compatibility
- **Build Failures**: Ensure all dependencies installed
- **Deployment Issues**: Check Vercel logs and environment variables

### **Getting Help**
- **[GitHub Issues](https://github.com/your-repo/issues)** - Bug reports and feature requests
- **[Discussions](https://github.com/your-repo/discussions)** - Community support
- **Email**: support@your-domain.com
- **Documentation**: Comprehensive guides in `/docs`

---

## 📄 **License**

MIT License - see LICENSE file for details.

---

*Built with ❤️ using modern web technologies and microservices architecture*  
*Last Updated: December 19, 2025*