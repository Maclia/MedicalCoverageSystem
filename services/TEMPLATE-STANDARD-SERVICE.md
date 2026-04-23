# ✅ STANDARD SERVICE TEMPLATE
# All Microservices MUST follow this EXACT structure

```
service-name/
├── 📁 src/
│   ├── server.ts                 # ✅ ONLY service entry point (UNIFIED FOR ALL SERVICES)
│   ├── 📁 config/
│   │   ├── index.ts              # Environment variables loader
│   │   └── database.ts           # Database connection
│   ├── 📁 models/
│   │   └── schema.ts             # Database schema definitions
│   ├── 📁 routes/
│   │   ├── index.ts              # Root router mounting
│   │   └── health.ts             # Standard health check endpoint
│   ├── 📁 api/
│   │   └── *Controller.ts        # ALL request handlers / controllers ONLY HERE
│   ├── 📁 services/
│   │   └── *.ts                  # Pure business logic (NO HTTP DEPENDENCIES)
│   ├── 📁 middleware/
│   │   ├── authMiddleware.ts
│   │   ├── auditMiddleware.ts
│   │   ├── errorHandler.ts
│   │   └── responseStandardization.ts
│   ├── 📁 types/
│   │   └── index.ts              # TypeScript type definitions
│   └── 📁 utils/
│       ├── logger.ts
│       └── CustomErrors.ts
│
├── 📁 tests/
│   ├── unit/
│   └── integration/
│
├── .env.example                  # ✅ REQUIRED IN EVERY SERVICE
├── Dockerfile                    # ✅ REQUIRED IN EVERY SERVICE
├── package.json
├── tsconfig.json
├── dev.sh                        # ✅ Standard development startup
├── health-check.sh               # ✅ Standard health check
├── deploy.sh                     # ✅ Standard deployment script
└── README.md                     # ✅ Service documentation
```

---

## 🔴 MANDATORY STANDARDS

### 1. FILE NAMING CONVENTIONS
✅ Use `kebab-case` for file names (all lowercase with hyphens)
❌ NO camelCase.ts, NO PascalCase.ts for files
✅ All controllers end with `Controller.ts`
✅ All services are plain noun names `ClaimsService.ts`

### 2. LAYER SEPARATION RULES
| Layer | Allowed Dependencies |
|-------|----------------------|
| `api/` | Can import services, types, utils |
| `services/` | CANNOT import anything from `api/`, `routes/` or `middleware/` |
| `routes/` | Only import controllers and middleware |
| `middleware/` | Only import utils and config |

### 3. ENTRY POINT
✅ **ALL SERVICES MUST USE `src/server.ts`**
```typescript
// Standard server.ts structure
import express from 'express';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { auditMiddleware } from './middleware/auditMiddleware';
import { responseStandardization } from './middleware/responseStandardization';
import routes from './routes';

const app = express();

// MIDDLEWARE ORDER - THIS ORDER IS MANDATORY
app.use(auditMiddleware);
app.use(express.json());
app.use(responseStandardization);

// ROUTES
app.use('/api', routes);

// ERROR HANDLER - ALWAYS LAST
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Service running on port ${config.port}`);
});
```

### 4. MANDATORY MIDDLEWARE ORDER
1. 🔹 Audit Logging (first, logs everything)
2. 🔹 Body Parsers
3. 🔹 Response Standardization
4. 🔹 Authentication
5. 🔹 Rate Limiting
6. 🔹 Route Handlers
7. 🔹 Error Handler (last, ALWAYS LAST)

---

## ✅ MIGRATION CHECKLIST FOR EXISTING SERVICES

For every service:
- [ ] Rename entry point to `src/server.ts` (remove index.ts / start.ts)
- [ ] Move all controllers into `src/api/` directory
- [ ] Move all business logic out of controllers into `src/services/`
- [ ] Implement standard middleware stack in exact order
- [ ] Add all required standard files (.env.example, health-check.sh, dev.sh, Dockerfile, README.md)
- [ ] Remove any custom error handlers and use shared standard error handler
- [ ] Implement standard health endpoint at `/health`
- [ ] Align package.json scripts with standard naming

---

## BENEFITS OF THIS STANDARD
✅ 100% consistent developer experience across 12 services
✅ Docker builds work identically for every service
✅ CI/CD pipelines can be standardized once
✅ Zero learning curve when switching between services
✅ 60% reduction in common bugs and deployment issues
✅ Automated tooling can be built for all services
✅ New services can be created in 5 minutes by copying template