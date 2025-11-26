# Modules Directory Structure

This directory contains all system modules organized by business domain. Each module is self-contained with its own services, types, routes, and tests.

## Module Structure

```
modules/
├── core/                           # Core system modules
│   ├── authentication/            # Authentication & authorization
│   ├── users/                     # User management
│   └── audit/                     # Audit logging & compliance
├── billing/                       # Finance Module 1: Billing & Invoicing
│   ├── services/                  # Billing services
│   ├── types/                     # Type definitions
│   ├── routes/                    # API routes
│   ├── tests/                     # Unit & integration tests
│   └── config/                    # Module configuration
├── payments/                      # Finance Module 2: Payment Management
│   ├── services/                  # Payment services
│   ├── types/                     # Type definitions
│   ├── routes/                    # API routes
│   ├── tests/                     # Tests
│   └── config/                    # Configuration
├── commissions/                   # Finance Module 3: Commission Payments
│   ├── services/                  # Commission services
│   ├── types/                     # Type definitions
│   ├── routes/                    # API routes
│   ├── tests/                     # Tests
│   └── config/                    # Configuration
├── claims-financial/              # Finance Module 4: Claims Financial Management
│   ├── services/                  # Claims financial services
│   ├── types/                     # Type definitions
│   ├── routes/                    # API routes
│   ├── tests/                     # Tests
│   └── config/                    # Configuration
├── policies/                      # Policy management
├── members/                       # Member management
├── providers/                     # Provider management
├── claims/                        # Claims processing
├── reports/                       # Reporting & analytics
└── integrations/                  # External system integrations
```

## Module Definition

Each module must contain:

1. **index.ts** - Module entry point with exports
2. **module.config.ts** - Module configuration
3. **module.types.ts** - Module-specific types
4. **services/** - Business logic services
5. **routes/** - API endpoints
6. **tests/** - Test files

## Module Registration

Modules are automatically discovered and registered through the ModuleRegistry.

## Benefits

- **Scalability** - Easy to add new modules
- **Maintainability** - Clear separation of concerns
- **Testing** - Isolated module testing
- **Deployment** - Selective module deployment
- **Development** - Focused development by domain