# Fraud Detection Service Integration Guide

## System Context

The Fraud Detection Service is part of the Medical Coverage System's microservices architecture. It operates as an independent service that provides fraud risk assessment for claims, enrollments, and providers to other services in the ecosystem.

## Service Dependencies

### Input Dependencies
The Fraud Detection Service accepts data from:
- **Claims Service**: Claim details for fraud assessment
- **Core Service**: Member and enrollment information
- **Provider Service**: Provider credentials and history
- **Frontend**: Real-time fraud checking during user interactions

### Output Dependencies
The Fraud Detection Service provides data to:
- **Claims Service**: Risk scores, recommendations, automatic approval/denial decisions
- **Core Service**: Member risk flags, compliance notes
- **Finance Service**: Fraud cost tracking, payment authorization
- **Compliance Service**: Investigation cases, audit reports

## Integration Patterns

### 1. Synchronous Assessment (Real-time)
```
Claims Service
    ↓
POST /api/fraud-detection/claims/assess
    ↓
Fraud Detection Engine
    ├── External Database Service (parallel)
    ├── Geolocation Service (parallel)
    ├── Anomaly Detection Service (parallel)
    ├── NLP Service (parallel)
    ↓
Risk Score + Indicators + Recommendations (2 seconds)
    ↓
Claims Service → Apply decisions
```

**Use Cases**:
- Claim pre-approval screening
- Enrollment validation
- Provider credentialing

**Response Time**: < 2 seconds

### 2. Asynchronous Batch Processing
```
Historical Claims Data
    ↓
Scheduled Job (hourly/daily)
    ↓
Fraud Detection Engine (batch mode)
    ↓
Risk Report Generation
    ↓
Analytics Dashboard + Alerts
```

**Use Cases**:
- Pattern analysis across members
- Provider compliance reviews
- Historical fraud trend analysis

**Frequency**: Hourly/Daily/Weekly

### 3. Streaming Integration (Future)
```
Claim Event Stream (Kafka)
    ↓
Real-time Fraud Detector
    ↓
Immediate Alerts (milliseconds)
```

## API Integration Examples

### Example 1: Claims Workflow Integration

```typescript
// In Claims Service (claims-service/src/services/ClaimsService.ts)

import axios from 'axios';

async function submitClaimForApproval(claim: Claim) {
  // 1. Send to fraud detection
  const fraudAssessment = await axios.post(
    `${API_GATEWAY_URL}/api/fraud-detection/claims/assess`,
    {
      claimId: claim.id,
      memberId: claim.memberId,
      providerId: claim.providerId,
      claimAmount: claim.amount,
      claimType: claim.type,
      serviceDate: claim.serviceDate,
      submittedDate: new Date(),
      memberInfo: {
        firstName: claim.member.firstName,
        lastName: claim.member.lastName,
        dateOfBirth: claim.member.dateOfBirth,
        ssn: claim.member.ssn.substring(-4), // Masked
      },
      providerInfo: {
        npi: claim.provider.npi,
        tinEin: claim.provider.tinEin,
        providerName: claim.provider.name,
      },
      ipAddress: req.clientIp,
      userAgent: req.headers['user-agent'],
      clinicalNotes: claim.clinicalNotes,
      historicalClaims: await getHistoricalClaims(claim.memberId),
    },
    { headers: { Authorization: `Bearer ${serviceToken}` } }
  );

  // 2. Apply fraud assessment results
  if (fraudAssessment.data.assessment.riskLevel === 'critical') {
    claim.status = 'DENIED';
    claim.denialReason = 'Fraud risk - critical level';
    await notifyCompliance(claim, fraudAssessment.data.assessment);
  } else if (fraudAssessment.data.assessment.riskLevel === 'high') {
    claim.status = 'PENDING_REVIEW';
    claim.requiresManualReview = true;
    claim.reviewNotes = fraudAssessment.data.assessment.recommendations.join('; ');
  } else if (fraudAssessment.data.assessment.riskLevel === 'medium') {
    claim.status = 'APPROVED_WITH_AUDIT';
    claim.auditRequired = true;
  } else {
    claim.status = 'APPROVED';
  }

  // 3. Store assessment results
  claim.fraudAssessment = fraudAssessment.data.assessment;
  await claim.save();

  return claim;
}
```

### Example 2: Member Enrollment Integration

```typescript
// In Core Service (core-service/src/services/EnrollmentService.ts)

async function processEnrollment(enrollmentData: EnrollmentData) {
  // 1. Submit for fraud check
  const enrollmentRisk = await axios.post(
    `${API_GATEWAY_URL}/api/fraud-detection/enrollments/assess`,
    {
      enrollmentId: enrollmentData.id,
      memberId: enrollmentData.memberId,
      memberInfo: {
        firstName: enrollmentData.firstName,
        lastName: enrollmentData.lastName,
        dateOfBirth: enrollmentData.dateOfBirth,
      },
      ipAddress: enrollmentData.ipAddress,
      userAgent: enrollmentData.userAgent,
      submittedData: JSON.stringify(enrollmentData.formData),
      memberLocationData: await getHistoricalLocationData(enrollmentData.memberId),
    }
  );

  // 2. Handle risk assessment
  if (enrollmentRisk.data.assessment.riskLevel === 'critical') {
    throw new Error('Enrollment rejected due to fraud risk');
  } else if (enrollmentRisk.data.assessment.riskLevel === 'high') {
    // Require identity verification
    await requestIdentityVerification(enrollmentData.memberId);
    return { status: 'PENDING_VERIFICATION' };
  }

  // 3. Flag high-risk member
  if (enrollmentRisk.data.assessment.riskLevel === 'medium') {
    await flagMemberForMonitoring(enrollmentData.memberId, 'enhanced');
  }

  return { status: 'APPROVED' };
}
```

### Example 3: Analytics Integration

```typescript
// In Analytics Service (analytics-service)

async function generateFraudReport(period: DateRange) {
  // 1. Query fraud assessment results
  const assessments = await queryAdminDatabase(
    `SELECT * FROM claim_fraud_assessments 
     WHERE timestamp BETWEEN $1 AND $2`,
    [period.start, period.end]
  );

  // 2. Aggregate metrics
  const fraudMetrics = {
    totalAssessments: assessments.length,
    criticalRiskClaims: assessments.filter(a => a.riskLevel === 'critical').length,
    averageRiskScore: assessments.reduce((sum, a) => sum + a.overallRiskScore, 0) / assessments.length,
    topFraudIndicators: aggregateIndicators(assessments),
    costPrevented: estimateFraudCost(assessments),
  };

  // 3. Create dashboard data
  return {
    period,
    metrics: fraudMetrics,
    trends: calculateTrends(assessments),
    topRisks: getTopRisks(assessments),
  };
}
```

## Database Schema Integration

### Schema References in Shared Database

The fraud detection service should create tables in the shared database for assessment history:

```sql
-- Claim Fraud Assessments
CREATE TABLE IF NOT EXISTS claim_fraud_assessments (
  id SERIAL PRIMARY KEY,
  claim_id VARCHAR(50) NOT NULL,
  member_id VARCHAR(50) NOT NULL,
  provider_id VARCHAR(50) NOT NULL,
  overall_risk_score DECIMAL(5,2),
  fraud_probability DECIMAL(3,2),
  risk_level VARCHAR(20),
  indicators JSONB,
  recommendations JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (claim_id) REFERENCES claims(id),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

-- Enrollment Fraud Assessments
CREATE TABLE IF NOT EXISTS enrollment_fraud_assessments (
  id SERIAL PRIMARY KEY,
  enrollment_id VARCHAR(50) NOT NULL,
  member_id VARCHAR(50) NOT NULL,
  overall_risk_score DECIMAL(5,2),
  fraud_probability DECIMAL(3,2),
  risk_level VARCHAR(20),
  indicators JSONB,
  recommendations JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Provider Fraud Assessments
CREATE TABLE IF NOT EXISTS provider_fraud_assessments (
  id SERIAL PRIMARY KEY,
  provider_id VARCHAR(50) NOT NULL,
  compliance_score DECIMAL(5,2),
  fraud_risk_score DECIMAL(5,2),
  risk_level VARCHAR(20),
  indicators JSONB,
  recommendations JSONB,
  last_audit_date TIMESTAMP,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

-- Member Risk Flags
CREATE TABLE IF NOT EXISTS member_risk_flags (
  id SERIAL PRIMARY KEY,
  member_id VARCHAR(50) NOT NULL,
  risk_level VARCHAR(20),
  fraud_indicators TEXT[],
  monitoring_status VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id)
);
```

## Environment Configuration

### Docker Compose Addition

```yaml
# services/fraud-detection-service in docker-compose.yml

fraud-detection-service:
  build:
    context: ./services/fraud-detection-service
    dockerfile: Dockerfile
  container_name: medical-fraud-detection
  ports:
    - "5009:5009"
  environment:
    - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/medical_coverage_fraud_detection
    - API_GATEWAY_URL=http://api-gateway:5000
    - LOG_LEVEL=${LOG_LEVEL:-info}
    - MIB_API_URL=${MIB_API_URL}
    - MIB_API_KEY=${MIB_API_KEY}
    - NICB_API_URL=${NICB_API_URL}
    - NICB_API_KEY=${NICB_API_KEY}
    - NDH_API_URL=${NDH_API_URL}
    - NDH_API_KEY=${NDH_API_KEY}
    - GEOLOCATION_API_URL=${GEOLOCATION_API_URL}
    - GEOLOCATION_API_KEY=${GEOLOCATION_API_KEY}
    - NLP_API_URL=${NLP_API_URL}
    - NLP_API_KEY=${NLP_API_KEY}
  depends_on:
    - postgres
    - api-gateway
  networks:
    - medical-network
  volumes:
    - ./services/fraud-detection-service/logs:/app/logs
```

### Root Package.json Addition

```json
{
  "scripts": {
    "dev:fraud-detection": "cd services/fraud-detection-service && npm run dev",
    "build:fraud-detection": "cd services/fraud-detection-service && npm run build",
    "test:fraud-detection": "cd services/fraud-detection-service && npm test",
    "db:push:fraud-detection": "cd services/fraud-detection-service && npm run db:push"
  }
}
```

## Deployment Checklist

- [ ] Create dedicated PostgreSQL database for fraud detection
- [ ] Configure external database API credentials (MIB, NICB, NDH, Geolocation, NLP)
- [ ] Set up logging infrastructure
- [ ] Initialize database schema
- [ ] Configure high-risk countries list
- [ ] Set risk threshold values
- [ ] Deploy Docker container
- [ ] Configure API Gateway routing
- [ ] Set up monitoring and alerting
- [ ] Create compliance audit logs
- [ ] Train team on fraud assessment interpretation

## Monitoring and Alerts

### Key Metrics to Monitor

```javascript
// Prometheus metrics exported
fraud_detection_assessment_duration_seconds
fraud_detection_assessments_total
fraud_detection_risk_scores
fraud_detection_external_db_latency
fraud_detection_geolocation_latency
fraud_detection_nlp_latency
fraud_detection_critical_alerts
fraud_detection_error_rate
```

### Alert Conditions

1. Assessment latency > 3 seconds
2. External DB service unavailable
3. Critical risk claims > threshold
4. False positive rate > 10%
5. Service error rate > 1%

## Performance Optimization

### Caching Strategy

```typescript
// Location cache - 24 hour TTL
cache.set(`geo:${ipAddress}`, locationData, 86400);

// Member patterns - hourly update
cache.set(`pattern:member:${memberId}`, patterns, 3600);

// Assessment results - 1 hour TTL
cache.set(`assessment:claim:${claimId}`, assessment, 3600);
```

### Parallel Processing

All services run in parallel using Promise.all() for assessment speedup:
- External DB checks (3-5 services)
- Geolocation analysis
- Anomaly detection
- NLP analysis

### Database Indexing

```sql
CREATE INDEX idx_claim_fraud_assessments_member_id 
ON claim_fraud_assessments(member_id);

CREATE INDEX idx_claim_fraud_assessments_timestamp 
ON claim_fraud_assessments(timestamp DESC);

CREATE INDEX idx_member_risk_flags_member_id 
ON member_risk_flags(member_id);
```

## Troubleshooting Guide

### Issue: High False Positive Rate

**Symptoms**: Legitimate claims being flagged as high risk

**Solutions**:
1. Review Z-score threshold (currently 3.0) - consider increasing to 3.5
2. Adjust weight distribution in ensemble calculations
3. Analyze flagged claims for common patterns
4. Increase context window for member pattern analysis
5. Consider machine learning model retraining

### Issue: Assessment Timeout

**Symptoms**: Request takes > 3 seconds

**Solutions**:
1. Check external database API latency
2. Verify database query performance
3. Consider implementing circuit breaker
4. Add caching for frequently checked items
5. Scale service horizontally

### Issue: Member Risk Flag Accuracy

**Symptoms**: Incorrect risk levels assigned

**Solutions**:
1. Review indicator weights
2. Check data quality in external databases
3. Validate geolocation API responses
4. Test NLP pattern matching accuracy
5. Compare with manual reviews

## Future Roadmap

### Q1 2025
- [ ] Machine learning model integration
- [ ] Real-time Kafka streaming
- [ ] Network graph analysis

### Q2 2025
- [ ] Multi-language NLP support
- [ ] Enhanced provider analytics
- [ ] Automated investigation case creation

### Q3 2025
- [ ] Graph database integration (Neo4j)
- [ ] Advanced pattern visualization
- [ ] Predictive fraud modeling

## References

- [Fraud Detection Service README](./services/fraud-detection-service/README.md)
- [Implementation Summary](./services/fraud-detection-service/IMPLEMENTATION_SUMMARY.md)
- [System Architecture](./SYSTEMS_ARCHITECTURE.md)
- [API Documentation](./docs/API_DOCUMENTATION.md)

## Support

For questions about fraud detection integration:
- Review service logs: `docker logs medical-fraud-detection`
- Check status: `curl http://localhost:5009/api/fraud-detection/status`
- Contact: platform-team@medicalsystem.com
