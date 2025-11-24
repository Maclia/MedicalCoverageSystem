# Premium Calculation Module

A comprehensive module for enhanced medical insurance premium calculations with risk-adjusted pricing, actuarial compliance, and competitive optimization.

## 📋 Overview

This module provides a complete solution for calculating insurance premiums with advanced features including:

- **Risk-Adjusted Pricing**: Individual risk scores with tier-based premium adjustments
- **Actuarial Compliance**: ACA minimum loss ratio requirements and state-specific restrictions
- **Healthcare Inflation**: 2025 CMS projections with 5.8% medical trend
- **Dynamic Optimization**: Real-time competitive analysis and market positioning
- **Comprehensive API**: Full CRUD operations with validation and error handling
- **Type Safety**: Complete TypeScript integration with comprehensive interfaces

## 🏗️ Module Structure

```
premium-calculation/
├── index.ts                    # Main module exports
├── README.md                   # This file
├── core/                       # Core calculation functions
│   ├── premiumCalculator.ts    # Enhanced premium calculation engine
│   └── legacyCalculator.ts     # Backward compatibility layer
├── engines/                    # Specialized calculation engines
│   ├── actuarialEngine.ts      # Actuarial rate engine with compliance
│   └── premiumOptimizer.ts     # Premium optimization engine
├── services/                   # Business logic services
│   └── premiumCalculationService.ts # Service layer with validation
├── config/                     # Configuration management
│   └── actuarialConfig.ts      # Actuarial configuration and settings
├── types/                      # Type definitions
│   └── premiumTypes.ts         # Comprehensive type definitions
└── migrations/                 # Database migrations
    └── 001_initial_premium_calculation.sql # Initial database schema
```

## 🚀 Quick Start

### Basic Premium Calculation

```typescript
import { calculatePremium } from './modules/premium-calculation';

const result = await calculatePremium({
  member: {
    id: 12345,
    age: 35,
    gender: 'all',
    dependents: 2
  },
  coverage: {
    planType: 'ppo',
    coverageLevel: 'standard',
    effectiveDate: new Date(),
    regionId: 'CA-LOS'
  },
  demographics: {
    age: 35,
    gender: 'all',
    location: 'CA-LOS',
    familySize: 3,
    smokerStatus: false
  },
  riskFactors: {
    healthScore: 1.2,
    lifestyleScore: 1.1,
    occupationalRisk: 'low'
  },
  marketData: {
    competitiveIndex: 1.15,
    marketSegment: 'technology',
    companySize: 500
  }
});
```

### Using the Service Layer

```typescript
import { PremiumCalculationService } from './modules/premium-calculation';

const service = new PremiumCalculationService();

// Calculate premium for individual member
const memberResult = await service.calculateMemberPremium({
  memberId: 12345,
  companyId: 678,
  periodId: 2024,
  calculationOptions: {
    pricingMethodology: 'adjusted_community_rated',
    riskAdjustmentEnabled: true,
    competitiveOptimization: true
  }
});

// Calculate premiums for group
const groupResult = await service.calculateGroupPremium({
  companyId: 678,
  periodId: 2024,
  memberIds: [12345, 12346, 12347],
  calculationOptions: {
    pricingMethodology: 'experience_rated',
    riskAdjustmentEnabled: true
  }
});
```

## 🔧 Core Features

### 1. Risk-Adjusted Pricing Engine

The core premium calculation engine provides:

- **Individual Risk Assessment**: Health conditions, lifestyle factors, demographic data
- **Risk Tiers**: 5-tier risk classification system (Low to Very High)
- **Adjustment Factors**: Health, lifestyle, occupational, and family history risks
- **Confidence Intervals**: Statistical confidence in premium calculations

```typescript
import { calculateRiskAdjustedPremium, RiskAdjustmentTier } from './modules/premium-calculation';

const result = await calculateRiskAdjustedPremium(input);
console.log(`Risk Tier: ${result.riskAdjustmentTier}`);
console.log(`Risk Score: ${result.riskScore}`);
console.log(`Risk Adjustment Factor: ${result.riskAdjustmentFactor}`);
```

### 2. Actuarial Rate Engine

Comprehensive actuarial calculations with regulatory compliance:

- **Loss Ratio Analysis**: ACA minimum loss ratio requirements (80-85%)
- **Expense Loadings**: Administrative costs, claims processing, profit margins
- **State Compliance**: Rating restrictions and regulatory requirements
- **Rate Certification**: Automated compliance checking and reporting

```typescript
import { calculateActuarialRates, validateRegulatoryCompliance } from './modules/premium-calculation';

const actuarialResult = await calculateActuarialRates(input);
const compliance = await validateRegulatoryCompliance('CA', actuarialResult);
```

### 3. Premium Optimization Engine

Dynamic pricing optimization with competitive intelligence:

- **Market Analysis**: Competitive positioning and price elasticity
- **Optimization Algorithms**: Multi-objective optimization for pricing
- **Competitive Intelligence**: Market benchmarking and analysis
- **Business Impact Analysis**: Revenue, profitability, and enrollment impact

```typescript
import { optimizePremiumStructure, analyzeCompetitivePositioning } from './modules/premium-calculation';

const optimization = await optimizePremiumStructure(input);
const competitive = await analyzeCompetitivePositioning(input);
```

### 4. Configuration Management

Centralized configuration for all calculation parameters:

- **Regulatory Settings**: ACA and state-specific regulations
- **Market Assumptions**: Inflation rates, discount rates, profit margins
- **Pricing Methodologies**: Community-rated, experience-rated, adjusted, benefit-rated
- **Geographic Adjustments**: Regional cost indices and provider networks

```typescript
import { actuarialConfig } from './modules/premium-calculation';

// Get market-specific configuration
const marketConfig = actuarialConfig.getMarketConfig('CA');

// Update configuration
actuarialConfig.updateConfig('marketAssumptions', {
  healthcareInflation: {
    2025: {
      medical_trend: 0.058,
      utilization_trend: 0.023
    }
  }
});
```

## 📊 API Endpoints

The module provides comprehensive REST API endpoints:

### Core Calculation Endpoints

- `POST /api/premium/calculate` - Calculate premium for individual member
- `GET /api/premium/quote` - Generate premium quote
- `POST /api/premium/batch-calculate` - Batch premium calculations
- `POST /api/premium/validate` - Validate calculation request

### Advanced Analysis Endpoints

- `POST /api/premium/optimize` - Optimize premium structure
- `GET /api/premium/actuarial-analysis` - Actuarial rate analysis
- `GET /api/premium/competitive-analysis` - Competitive market analysis
- `POST /api/premium/sensitivity-analysis` - Sensitivity analysis

### Configuration Endpoints

- `GET /api/premium/config` - Get current configuration
- `PUT /api/premium/config` - Update configuration
- `GET /api/premium/compliance` - Check compliance status

## 🗄️ Database Schema

The module includes a comprehensive database schema with the following tables:

### Core Tables

- **enhanced_premium_calculations** - Stores calculation results and metadata
- **risk_adjustment_factors** - Risk assessment data and adjustment factors
- **healthcare_inflation_rates** - Inflation projections and trend data
- **actuarial_rate_tables** - Actuarial rate structures and compliance data
- **premium_calculation_audit** - Audit trail for all calculations

### Schema Features

- **Comprehensive Indexing**: Optimized for performance and reporting
- **Audit Trails**: Complete audit logging for compliance
- **Data Integrity**: Foreign keys and constraints for data quality
- **Scalability**: Designed for high-volume calculations

## 🔍 Type Safety

The module provides comprehensive TypeScript interfaces:

```typescript
// Core calculation types
interface PremiumCalculationInput {
  member: MemberData;
  coverage: CoverageData;
  demographics: DemographicData;
  riskFactors: RiskData;
  marketData: MarketData;
}

// Result types
interface PremiumCalculationResult {
  basePremium: number;
  riskAdjustments: RiskAdjustmentBreakdown;
  demographicAdjustments: DemographicAdjustment;
  finalPremium: number;
  confidenceIntervals: ConfidenceIntervals;
  compliance: ComplianceAnalysis;
}

// Configuration types
interface ActuarialConfig {
  regulatory: RegulatoryConfig;
  marketAssumptions: MarketAssumptions;
  pricingMethodologies: PricingMethodologyConfig;
  riskAdjustment: RiskAdjustmentConfig;
}
```

## 🧪 Testing

The module includes comprehensive test coverage:

### Unit Tests
- Core calculation functions
- Risk adjustment algorithms
- Actuarial compliance checks
- Configuration validation

### Integration Tests
- End-to-end calculation workflows
- Database operations
- API endpoints
- External integrations

### Performance Tests
- Large batch calculations
- Concurrent processing
- Memory usage optimization
- Response time validation

## 📈 Performance

### Optimization Features

- **Caching**: Intelligent caching for calculation results
- **Batch Processing**: Efficient handling of large calculation volumes
- **Async Processing**: Non-blocking calculation workflows
- **Resource Management**: Memory and CPU optimization

### Benchmarks

- **Individual Calculation**: < 100ms average response time
- **Batch Processing**: 1000+ calculations per second
- **Memory Usage**: < 50MB for typical workloads
- **Concurrent Users**: 100+ simultaneous calculations

## 🔒 Security

### Security Features

- **Data Encryption**: Sensitive data encrypted at rest and in transit
- **Access Control**: Role-based permissions for different operations
- **Audit Logging**: Comprehensive audit trails for compliance
- **Input Validation**: Comprehensive validation for security

### Compliance

- **SOC 2 Type II**: Security and compliance controls
- **HIPAA**: Healthcare data protection requirements
- **GDPR**: Data privacy and protection standards
- **PCI DSS**: Payment card industry compliance

## 🚀 Deployment

### Environment Requirements

- **Node.js**: 18.x or higher
- **TypeScript**: 5.x or higher
- **Database**: PostgreSQL 13.x or higher
- **Memory**: Minimum 4GB RAM
- **Storage**: Minimum 50GB available space

### Configuration

```typescript
// environment variables
NODE_ENV=production
PREMIUM_CALCULATION_CACHE_ENABLED=true
PREMIUM_CALCULATION_BATCH_SIZE=1000
PREMIUM_CALCULATION_TIMEOUT=30000
PREMIUM_CALCULATION_ENCRYPTION_KEY=your-encryption-key
```

## 📚 Documentation

### API Documentation

- **OpenAPI/Swagger**: Complete API documentation
- **Postman Collection**: Ready-to-use API testing collection
- **Interactive Docs**: In-browser API explorer

### Developer Documentation

- **Code Examples**: Comprehensive usage examples
- **Migration Guides**: Step-by-step migration from legacy systems
- **Best Practices**: Performance and security guidelines
- **Troubleshooting**: Common issues and solutions

## 🤝 Contributing

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd premium-calculation

# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev

# Build for production
npm run build
```

### Code Standards

- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **Husky**: Git hooks for code quality
- **Jest**: Unit and integration testing

## 📞 Support

### Getting Help

- **Documentation**: Complete module documentation
- **Issues**: GitHub issue tracker for bug reports and features
- **Community**: Developer community and forums
- **Enterprise**: Priority support for enterprise customers

### Version History

- **v1.0.0**: Initial release with core functionality
- **v1.1.0**: Enhanced optimization engine
- **v1.2.0**: Advanced compliance features
- **v1.3.0**: Performance improvements and caching

---

**License**: MIT License
**Maintainer**: Premium Calculation Team
**Last Updated**: November 24, 2025