# Medical Coverage System - File Structure

This document outlines the organized file structure of the Medical Coverage System after cleanup and reorganization.

## 📁 Project Structure

```
MedicalCoverageSystem/
├── 📁 client/                    # Frontend React application
│   └── 📁 src/                  # Client source code
│       ├── 📁 components/       # React components
│       ├── 📁 contexts/         # React contexts (Auth, etc.)
│       ├── 📁 pages/           # Page components
│       ├── 📁 services/        # API service functions
│       └── 📁 main.tsx         # Application entry point
├── 📁 server/                    # Backend Express application
│   ├── 📁 api/                 # API route handlers
│   ├── 📁 middleware/          # Authentication and other middleware
│   ├── 📁 routes/              # Route definitions
│   ├── 📁 services/            # Business logic services
│   ├── 📁 utils/               # Utility functions
│   ├── 📁 database/            # Database configurations
│   └── 📁 index.ts             # Server entry point
├── 📁 shared/                    # Shared TypeScript definitions
│   ├── 📁 types/               # Common type definitions
│   └── 📁 schema.ts            # Database schema
├── 📁 config/                    # Configuration files
│   ├── 📄 jest.config.js       # Jest testing configuration
│   ├── 📄 drizzle.config.ts    # Database ORM configuration
│   ├── 📄 tailwind.config.ts   # Tailwind CSS configuration
│   ├── 📄 vite.config.ts       # Vite bundler configuration
│   ├── 📄 cypress.config.ts    # Cypress E2E testing configuration
│   └── 📄 postcss.config.js    # PostCSS configuration
├── 📁 scripts/                   # Utility and deployment scripts
│   ├── 📁 development/         # Development utilities
│   ├── 📁 production/          # Production deployment scripts
│   ├── 📁 testing/             # Testing utilities
│   ├── 📄 deploy-production.sh # Production deployment
│   ├── 📄 seed-data.ts         # Database seeding scripts
│   └── 📄 seed-users.ts        # User seeding scripts
├── 📁 docs/                      # Documentation
│   ├── 📁 implementation/      # Implementation documentation
│   └── 📁 reports/             # System reports
├── 📁 tests/                     # Test files
│   ├── 📁 integration/         # Integration tests
│   ├── 📁 __mocks__/           # Test mocks
│   └── 📄 setup.ts             # Test setup configuration
├── 📁 database/                  # Database related files
├── 📁 cypress/                   # Cypress E2E test configurations
├── 📁 nginx/                     # Nginx configuration
└── 📁 dist/                      # Built application output
```

## 🚀 Key Improvements Made

### ✅ **Removed Temporary Files**
- Removed temporary import fix scripts (`fix-*.sh`)
- Removed temporary test files (`test-auth-server.ts`)
- Cleaned up development artifacts

### ✅ **Consolidated Directory Structure**
- Consolidated duplicate `server/src/routes` → `server/routes`
- Consolidated duplicate `server/src/services` → `server/services`
- Removed empty directories and redundant structures

### ✅ **Organized Configuration Files**
- Moved all config files to `config/` directory
- Centralized all framework configurations
- Improved maintainability and accessibility

### ✅ **Structured Scripts Directory**
- Organized scripts by purpose: `development/`, `production/`, `testing/`
- Moved deployment scripts to appropriate locations
- Maintained script accessibility with npm commands

### ✅ **Consolidated Documentation**
- Moved all markdown documentation to `docs/` directory
- Organized into `implementation/` and `reports/` subdirectories
- Improved documentation accessibility

## 🔧 Usage Commands

### Development
```bash
npm run dev                    # Start development server
npm run check                  # TypeScript type checking
npm run build                  # Build application for production
```

### Testing
```bash
npm run test                   # Run all tests
npm run test:watch             # Run tests in watch mode
npm run test:coverage          # Generate coverage reports
```

### Database
```bash
npm run db:push               # Push database schema changes
```

### Deployment
```bash
npm run docker:start          # Run Docker deployment script
```

## 📝 Notes

- All configuration files are now in the `config/` directory
- Scripts are organized by purpose in the `scripts/` directory
- Documentation is centralized in the `docs/` directory
- The structure follows Node.js best practices for maintainability

## 🏗️ Architecture Benefits

- **Scalability**: Clear separation of concerns
- **Maintainability**: Organized file structure reduces complexity
- **Development Speed**: Easy to locate and modify relevant files
- **Team Collaboration**: Intuitive structure for new developers
- **Deployment Ready**: Clean production-ready structure