# Fraud Detection Service

## Overview

The Fraud Detection Service is a comprehensive, AI-powered microservice within the Medical Coverage System designed to detect, analyze, and prevent fraudulent activities across claims, enrollments, and provider operations. It integrates multiple advanced fraud detection engines, external databases, geolocation analysis, and natural language processing to provide detailed risk assessments.

## Architecture

### Key Components

#### 1. **External Database Service** (`ExternalDatabaseService.ts`)
Integrates with three major national fraud databases:

- **MIB (Medical Information Bureau)**: Medical history and fraud indicators
- **NICB (National Insurance Crime Bureau)**: Insurance fraud database for healthcare workers and members
- **NDH (National Dental History)**: Dental fraud indicators

**Key Features:**
- Real-time member and provider fraud history checks
- Risk scoring based on match severity
- Support for exact, probable, and possible matches
- Automatic risk score calculation

**Configuration:**
```typescript
externalDabases: {
  mib: {
    enabled: true,
    apiUrl: process.env.MIB_API_URL,
    apiKey: process.env.MIB_API_KEY,
    timeout: 5000,
  },
  nicb: {
    enabled: true,
    apiUrl: process.env.NICB_API_URL,
    apiKey: process.env.NICB_API_KEY,
    timeout: 5000,
  },
  ndh: {
    enabled: true,
    apiUrl: process.env.NDH_API_URL,
    apiKey: process.env.NDH_API_KEY,
    timeout: 5000,
  },
}
```

#### 2. **Geolocation Service** (`GeolocationService.ts`)
Advanced geolocation and device analysis for fraud detection:

**Features:**
- IP-based location analysis
- VPN/Proxy detection
- Bot activity detection
- Device fingerprinting
- Impossible travel detection (500 mph max speed check)
- Location-device correlation analysis
- Trusted device registry

**Analysis Methods:**
- Haversine formula for distance calculation
- User agent parsing for device/OS/browser detection
- 24-hour location cache
- Temporal analysis of device access patterns

**Configuration:**
```typescript
geolocation: {
  enabled: true,
  apiUrl: process.env.GEOLOCATION_API_URL,
  apiKey: process.env.GEOLOCATION_API_KEY,
  timeout: 3000,
  highRiskCountries: ['IR', 'SY', 'KP', 'CU', ...],
}
```

#### 3. **Anomaly Detection Service** (`AnomalyDetectionService.ts`)
Statistical anomaly detection using multiple methods:

**Detection Methods:**
- **Z-Score Analysis**: Detects values > 3 standard deviations from mean
- **Isolation Forest**: Advanced outlier detection algorithm
- **Ensemble Methods**: Combines multiple detection methods for robust results

**Detectable Patterns:**
- Claim amount anomalies (member-specific baseline comparisons)
- Claim frequency anomalies (population-level statistical analysis)
- Provider utilization anomalies (>50% new providers flag)
- Billing pattern anomalies:
  - Duplicate claims (same code, amount, provider, date)
  - Unbundling patterns (many related claims instead of bundled)
  - Weekend/holiday billing patterns
  - Multiple claim frequency thresholds

**Key Metrics:**
- Mean, standard deviation, median
- Quartiles (Q1, Q3) and IQR
- Min/max values for range analysis

#### 4. **NLP Service** (`NlpService.ts`)
Natural language processing for unstructured data analysis:

**Features:**
- Sentiment analysis of clinical notes
- Entity extraction (phone, email, location, amounts, dates)
- Keyword weighting for fraud indicators
- Medical code manipulation detection
- Suspicious pattern identification

**Fraud Keywords (30+):**
Fake, fraudulent, counterfeit, forged, stolen, unauthorized, illegal, upcoding, unbundling, duplicate, kickback, bribery, etc.

**Suspicious Patterns:**
- DRG/CPT/ICD code variations
- Billing code manipulation attempts
- Pharmacy abuse indicators
- Controlled substance references
- Unnecessary procedure indicators
- Frequent ER visits
- Billing errors and coding anomalies

**Configuration:**
```typescript
nlp: {
  enabled: true,
  apiUrl: process.env.NLP_API_URL,
  apiKey: process.env.NLP_API_KEY,
  timeout: 3000,
}
```

#### 5. **Fraud Detection Engine** (`FraudDetectionEngine.ts`)
Orchestrates all detection services for comprehensive fraud assessment:

**Assessment Types:**
- **Claim Fraud Assessment**: Detailed risk scoring for individual claims
- **Enrollment Fraud Assessment**: Risk evaluation for new member enrollments
- **Provider Fraud Assessment**: Compliance and fraud risk scoring for healthcare providers

**Weighted Risk Calculation:**
```
Overall Risk Score = 
  (External DB Match × 0.30) +
  (Geolocation Anomaly × 0.15) +
  (Location-Device Correlation × 0.15) +
  (Claim Amount Anomaly × 0.20) +
  (Claim Frequency Anomaly × 0.10) +
  (Billing Pattern Anomaly × 0.15) +
  (Suspicious Clinical Notes × 0.15)
```

**Risk Levels:**
- **Low**: 0-25 points (routine monitoring)
- **Medium**: 25-50 points (manual review recommended)
- **High**: 50-75 points (escalated investigation)
- **Critical**: 75-100 points (immediate action required)

## API Endpoints

### Claim Assessment
```http
POST /api/fraud-detection/claims/assess
Content-Type: application/json

{
  "claimId": "CLM-123456",
  "memberId": "MEM-789",
  "providerId": "PROV-456",
  "claimAmount": 1500,
  "claimType": "hospitalization",
  "serviceDate": "2024-01-15T00:00:00Z",
  "submittedDate": "2024-01-20T00:00:00Z",
  "memberInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1980-05-15",
    "ssn": "***-**-1234"
  },
  "providerInfo": {
    "npi": "1234567890",
    "providerName": "ABC Hospital",
    "speciality": "General Hospital"
  },
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "clinicalNotes": "Patient admitted for routine surgery...",
  "historicalClaims": [...]
}
```

**Response:**
```json
{
  "success": true,
  "assessment": {
    "claimId": "CLM-123456",
    "memberId": "MEM-789",
    "providerId": "PROV-456",
    "overallRiskScore": 35,
    "fraudProbability": 0.35,
    "riskLevel": "medium",
    "indicators": [
      {
        "type": "Claim Amount Anomaly",
        "severity": "medium",
        "description": "Claim amount is 2.5 standard deviations from member's average",
        "evidence": {
          "deviations": 2.5,
          "amount": 1500
        },
        "riskScore": 45
      }
    ],
    "recommendations": [
      "Review claim documentation thoroughly",
      "Verify claims with provider if amount is high",
      "Add to monitoring queue"
    ],
    "timestamp": "2024-01-20T10:30:00Z",
    "details": {
      "externalDatabase": [...],
      "geolocation": {...},
      "anomalies": [...],
      "nlpAnalysis": {...}
    }
  }
}
```

### Enrollment Assessment
```http
POST /api/fraud-detection/enrollments/assess
Content-Type: application/json

{
  "enrollmentId": "ENR-123456",
  "memberId": "MEM-789",
  "memberInfo": {
    "firstName": "Jane",
    "lastName": "Smith",
    "dateOfBirth": "1990-03-20"
  },
  "ipAddress": "203.0.113.45",
  "userAgent": "Mozilla/5.0...",
  "submittedData": "Enrollment application data...",
  "memberLocationData": [...]
}
```

### Provider Assessment
```http
POST /api/fraud-detection/providers/assess
Content-Type: application/json

{
  "providerId": "PROV-456",
  "providerInfo": {
    "npi": "1234567890",
    "tinEin": "12-3456789",
    "providerName": "ABC Hospital",
    "speciality": "General Hospital"
  },
  "claimHistory": [...]
}
```

## Service Status
```http
GET /api/fraud-detection/status
```

## Integration with Other Services

### API Gateway Integration
The fraud detection service is accessed through the API Gateway:
```
GET  /api/fraud-detection/status
POST /api/fraud-detection/claims/assess
POST /api/fraud-detection/enrollments/assess
POST /api/fraud-detection/providers/assess
GET  /api/fraud-detection/claims/:claimId
GET  /api/fraud-detection/enrollments/:enrollmentId
GET  /api/fraud-detection/providers/:providerId
```

### Claims Service Integration
- Claims service submits claims for fraud assessment before approval
- Receives risk scores and recommendations
- Applies automated approval/denial based on risk level

### Core Service Integration
- Provides member fraud history for enrollment validation
- Flags members with fraud indicators for manual review

### Finance Service Integration
- Assists in payment authorization decisions
- Identifies potentially fraudulent billing patterns
- Supports audit and compliance reporting

## Configuration

### Environment Variables
```bash
# External Database APIs
MIB_API_URL=https://api.mib.com/v1
MIB_API_KEY=your_mib_key
NICB_API_URL=https://api.nicb.com/v1
NICB_API_KEY=your_nicb_key
NDH_API_URL=https://api.ndh.com/v1
NDH_API_KEY=your_ndh_key

# Geolocation API
GEOLOCATION_API_URL=https://api.geolocation.com/v1
GEOLOCATION_API_KEY=your_geo_key

# NLP API
NLP_API_URL=https://api.nlp.com/v1
NLP_API_KEY=your_nlp_key

# Database
DATABASE_URL=postgresql://user:password@host:5432/medical-coverage-fraud-detection

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### Configuration File (`config/index.ts`)
```typescript
export const config = {
  fraudDetection: {
    enabled: true,
    methods: {
      rulesBased: true,
      statistical: true,
      machinelearning: true,
      networkAnalysis: true,
    },
    riskThresholds: {
      autoReview: 50,
      investigation: 25,
      alert: 20,
    },
  },
  externalDatabases: {
    mib: { ... },
    nicb: { ... },
    ndh: { ... },
  },
  geolocation: { ... },
  nlp: { ... },
};
```

## Risk Scoring Methodology

### Claim Risk Assessment
1. External database checks (30% weight)
   - If found in MIB/NICB/NDH: +20-50 points

2. Geolocation analysis (15% weight)
   - VPN/Proxy detected: +15-20 points
   - High-risk country: +20-30 points
   - Bot detected: +25-35 points

3. Device analysis (15% weight)
   - New device: +15 points
   - Impossible travel: +20-40 points
   - Suspicious user agent: +10-20 points

4. Amount anomaly (20% weight)
   - 2-3 std dev: +15 points
   - 3+ std dev: +30 points

5. Frequency anomaly (10% weight)
   - Above threshold: +10-20 points

6. Billing patterns (15% weight)
   - Duplicates detected: +20-25 points
   - Unbundling: +15-20 points
   - Weekend billing: +5-10 points

7. Clinical notes (15% weight)
   - Suspicious language: +10-30 points
   - Fraud keywords: +20 per keyword
   - Negative sentiment: varies

### Enrollment Risk Assessment
- External database fraud history: +30 points
- Unusual enrollment location: +20 points
- VPN/Proxy usage: +15 points
- Data inconsistencies: +15-25 points

### Provider Risk Assessment
- Compliance Score: 100 (baseline)
- Fraud history: -20 points each
- Unusual billing patterns: -15 points each
- Fraud Risk Score = 100 - Compliance Score

## Analytics and Reporting

### Key Metrics
- **Fraud Detection Rate**: % of fraudulent claims detected
- **False Positive Rate**: % of legitimate claims flagged
- **Average Assessment Time**: Time to complete assessment
- **Cost Avoidance**: Estimated fraud prevented
- **System Accuracy**: Compared to manual investigations

### Dashboard Integration
- Real-time fraud alerts
- Historical trend analysis
- Provider performance monitoring
- Member risk profiles
- Investigative case management

## Security Considerations

1. **Data Privacy**
   - PII encryption at rest and in transit
   - Sanitized logging (no SSNs, DOBs in logs)
   - GDPR/HIPAA compliance

2. **API Security**
   - JWT authentication for all endpoints
   - Rate limiting (100 req/min default)
   - API key rotation every 90 days

3. **External Database Access**
   - Encrypted API credentials
   - Timeout protection (5-30 seconds)
   - Fallback mechanisms if service unavailable

4. **Data Retention**
   - Assessment history: 7 years
   - Cache cleanup: 24 hours

## Performance Optimization

### Caching Strategy
- Location data: 24-hour TTL
- Member patterns: Updated hourly
- Assessment results: 1-hour TTL

### Parallel Processing
- All external database checks run in parallel
- Independent module execution
- Async/await pattern throughout

### Response Time Targets
- Claim assessment: < 2 seconds
- Enrollment assessment: < 1.5 seconds
- Provider assessment: < 3 seconds

## Testing

```bash
# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run fraud detection specific tests
npm run test:fraud-detection

# Coverage report
npm run test:coverage
```

### Test Coverage
- Service initialization: ✓
- External database integration: ✓
- Geolocation analysis: ✓
- Anomaly detection: ✓
- NLP analysis: ✓
- Risk scoring: ✓
- API endpoints: ✓
- Error handling: ✓

## Troubleshooting

### Common Issues

**1. External Database API Timeouts**
```
Configure longer timeouts or implement circuit breaker
Check API endpoint availability
Verify API credentials
```

**2. Geolocation Service Unavailable**
```
Falls back to local IP analysis
Returns "unknown" for location data
Risk score adjusted accordingly
```

**3. High False Positive Rate**
```
Adjust Z-score thresholds (currently 3.0)
Review weight distribution
Analyze flagged claims for patterns
Retrain anomaly detection models
```

## Future Enhancements

1. **Machine Learning Integration**
   - Random Forest model for claim fraud
   - Gradient Boosting for pattern recognition
   - Real-time model retraining

2. **Network Analysis**
   - Provider-member relationship graphs
   - Circular fraud ring detection
   - Collusion pattern identification

3. **Real-time Streaming**
   - Kafka integration for claim events
   - Real-time pattern detection
   - Immediate fraud alerts

4. **Advanced NLP**
   - Transformer-based sentiment analysis
   - Multi-language support
   - Medical terminology knowledge base

5. **Graph Database**
   - Neo4j integration for relationships
   - Complex pattern queries
   - Visualization of fraud networks

## Support

For issues or questions about the Fraud Detection Service:
- Check logs: `/logs/fraud-detection.log`
- Review service status: `GET /api/fraud-detection/status`
- Contact: platform-team@medicalsystem.com

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## License

Medical Coverage System - Internal Use Only
