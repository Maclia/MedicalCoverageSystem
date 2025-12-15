# Card Management System Implementation Test

## Overview
This document outlines the comprehensive testing approach for the newly implemented Card Management System in the MedicalCoverageSystem.

## Components Implemented

### Backend Components
1. **Database Schema Extensions** (`shared/schema.ts`)
   - `memberCards` table with card status, type, QR codes
   - `cardTemplates` table with design configurations
   - `cardVerificationEvents` table for audit trail
   - `cardProductionBatches` table for physical card tracking

2. **Storage Layer** (`server/storage.ts`)
   - Complete CRUD operations for all card entities
   - Card validation and verification methods
   - Production batch management
   - QR code generation utilities

3. **Service Layer** (`server/services/cardManagementService.ts`)
   - Card generation and issuance logic
   - Card verification and validation
   - Integration with eligibility engine
   - Fraud detection and security features

4. **API Routes** (`server/routes/cardManagement.ts`)
   - Member card management endpoints
   - Provider verification endpoints
   - Template management endpoints
   - Production batch endpoints
   - Analytics and reporting endpoints

### Frontend Components
1. **DigitalCard** (`client/src/components/cards/DigitalCard.tsx`)
   - Visual card display with customizable templates
   - QR code integration
   - Compact and full-size views

2. **CardGallery** (`client/src/components/cards/CardGallery.tsx`)
   - Member card gallery interface
   - Download functionality for digital cards
   - Card status management

3. **CardVerificationPortal** (`client/src/components/cards/CardVerificationPortal.tsx`)
   - Provider-facing verification interface
   - Multiple verification methods (QR scan, manual, NFC)
   - Real-time validation and feedback

4. **CardManagementDashboard** (`client/src/components/cards/CardManagementDashboard.tsx`)
   - Administrative interface for card management
   - Production batch tracking
   - Analytics and reporting

## Testing Scenarios

### 1. Database Schema Validation
```bash
# Test database table creation
# Verify all card-related tables exist with correct structure
# Test relationships between tables
# Test enum constraints and data types
```

### 2. Storage Layer Tests
```typescript
// Test card creation
const testCardCreation = async () => {
  const cardData: InsertMemberCard = {
    memberId: 1,
    cardType: 'digital',
    templateId: 1,
    cardStatus: 'active'
  };

  const card = await storage.createMemberCard(cardData);
  console.log('Created card:', card);

  // Test card retrieval
  const retrievedCard = await storage.getMemberCard(card.id);
  console.log('Retrieved card:', retrievedCard);
};

// Test card verification
const testCardVerification = async () => {
  const verificationData: InsertCardVerificationEvent = {
    cardId: 1,
    memberId: 1,
    verifiedBy: 'test_provider',
    verificationType: 'qr_scan',
    verificationResult: 'success'
  };

  const verification = await storage.createCardVerificationEvent(verificationData);
  console.log('Created verification:', verification);
};
```

### 3. API Endpoint Tests

#### Card Generation Tests
```bash
# Generate digital card
curl -X POST http://localhost:5000/api/cards/generate \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": 1,
    "cardType": "digital",
    "templateId": 1
  }'

# Generate physical card
curl -X POST http://localhost:5000/api/cards/generate \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": 1,
    "cardType": "physical",
    "templateId": 1,
    "expeditedShipping": true
  }'

# Generate both digital and physical
curl -X POST http://localhost:5000/api/cards/generate \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": 1,
    "cardType": "both",
    "templateId": 1
  }'
```

#### Card Retrieval Tests
```bash
# Get all cards for member
curl http://localhost:5000/api/cards/member/1

# Get specific card
curl http://localhost:5000/api/cards/1

# Get active cards for member
curl http://localhost:5000/api/cards/member/active-cards/1
```

#### Card Verification Tests
```bash
# Verify card with QR code
curl -X POST http://localhost:5000/api/cards/verify \
  -H "Content-Type: application/json" \
  -d '{
    "qrCodeData": "MC-1-1234567890-abc123",
    "providerId": "provider_123",
    "verificationType": "qr_scan",
    "location": "Office 101",
    "deviceInfo": "Scanner_v1.0"
  }'

# Manual verification
curl -X POST http://localhost:5000/api/cards/verify \
  -H "Content-Type: application/json" \
  -d '{
    "qrCodeData": "MC-1-1234567890-abc123",
    "providerId": "provider_123",
    "verificationType": "manual_entry"
  }'
```

#### Card Status Management Tests
```bash
# Deactivate card
curl -X PUT http://localhost:5000/api/cards/1/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "inactive",
    "reason": "Card lost"
  }'

# Report card as lost
curl -X PUT http://localhost:5000/api/cards/1/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "lost",
    "reason": "Card misplaced during travel"
  }'

# Request replacement
curl -X POST http://localhost:5000/api/cards/1/replace \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Card damaged",
    "expedited": true
  }'
```

### 4. Frontend Component Tests

#### DigitalCard Component Tests
```typescript
import { render, screen } from '@testing-library/react';
import DigitalCard from '../components/cards/DigitalCard';

test('DigitalCard renders with QR code', () => {
  const mockCard = {
    id: 1,
    memberId: 1,
    cardType: 'digital',
    templateId: 1,
    cardStatus: 'active',
    qrCodeData: 'test-qr-data',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  render(<DigitalCard card={mockCard} showQRCode={true} />);

  expect(screen.getByText('Card Holder')).toBeInTheDocument();
  expect(screen.getByText('#0000000000000001')).toBeInTheDocument();
  expect(screen.getByText('Member ID: #00000001')).toBeInTheDocument();
});
```

#### CardVerificationPortal Tests
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CardVerificationPortal from '../components/cards/CardVerificationPortal';

test('Card verification process', async () => {
  const mockOnComplete = jest.fn();

  render(<CardVerificationPortal providerId="test_provider" onVerificationComplete={mockOnComplete} />);

  // Enter QR code data
  const qrInput = screen.getByPlaceholderText('Enter QR code data or scan with camera');
  fireEvent.change(qrInput, { target: { value: 'test-qr-data' } });

  // Click verify button
  const verifyButton = screen.getByText('Verify QR Code');
  fireEvent.click(verifyButton);

  // Wait for verification result
  await waitFor(() => {
    expect(mockOnComplete).toHaveBeenCalled();
  });
});
```

### 5. Integration Tests

#### End-to-End Card Flow
```typescript
// Test complete card lifecycle
const testCardLifecycle = async () => {
  // 1. Generate card
  const generateResponse = await fetch('/api/cards/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      memberId: 1,
      cardType: 'digital'
    })
  });

  const { data: cards } = await generateResponse.json();
  expect(cards).toHaveLength(1);
  const card = cards[0];

  // 2. Verify card exists
  const getCardResponse = await fetch(`/api/cards/${card.id}`);
  const { data: retrievedCard } = await getCardResponse.json();
  expect(retrievedCard.id).toBe(card.id);

  // 3. Test verification
  const verifyResponse = await fetch('/api/cards/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      qrCodeData: card.qrCodeData,
      providerId: 'test_provider',
      verificationType: 'qr_scan'
    })
  });

  const { data: verificationResult } = await verifyResponse.json();
  expect(verificationResult.valid).toBe(true);
  expect(verificationResult.card.id).toBe(card.id);

  // 4. Test status update
  const updateResponse = await fetch(`/api/cards/${card.id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'inactive',
      reason: 'Test deactivation'
    })
  });

  const { data: updatedCard } = await updateResponse.json();
  expect(updatedCard.cardStatus).toBe('inactive');
};
```

### 6. Performance Tests

#### Load Testing Card Verification
```bash
# Concurrent verification requests
for i in {1..100}; do
  curl -X POST http://localhost:5000/api/cards/verify \
    -H "Content-Type: application/json" \
    -d '{
      "qrCodeData": "MC-1-test-'"$i"'",
      "providerId": "provider_'$i'",
      "verificationType": "qr_scan"
    }' &
done

wait # Wait for all requests to complete
```

#### Database Performance Tests
```sql
-- Test query performance
EXPLAIN ANALYZE SELECT * FROM member_cards WHERE member_id = 1;
EXPLAIN ANALYZE SELECT * FROM card_verification_events WHERE verified_at > NOW() - INTERVAL '1 day';
EXPLAIN ANALYZE SELECT * FROM card_production_batches WHERE batch_status = 'pending';
```

### 7. Security Tests

#### Input Validation Tests
```typescript
// Test SQL injection attempts
const testSQLInjection = async () => {
  const maliciousInput = "'; DROP TABLE member_cards; --";

  const response = await fetch('/api/cards/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      qrCodeData: maliciousInput,
      providerId: 'test_provider',
      verificationType: 'qr_scan'
    })
  });

  // Should return validation error, not execute SQL
  expect(response.status).not.toBe(200);
};

// Test authentication requirements
const testAuthentication = async () => {
  // Test unauthenticated access
  const response = await fetch('/api/cards/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      memberId: 1,
      cardType: 'digital'
    })
  });

  // Should require authentication
  expect(response.status).toBe(401);
};
```

## Test Data Setup

### Sample Member Creation
```sql
-- Insert test member
INSERT INTO members (id, first_name, last_name, email, date_of_birth, member_type, company_id, created_at)
VALUES (1, 'John', 'Doe', 'john.doe@example.com', '1990-01-01', 'principal', 1, NOW());

-- Insert test company
INSERT INTO companies (id, name, created_at)
VALUES (1, 'Test Company', NOW());
```

### Template Creation
```typescript
// Create default card template
const createDefaultTemplate = async () => {
  await fetch('/api/cards/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyId: 1,
      templateType: 'standard',
      templateName: 'Test Template',
      cardDesign: JSON.stringify({
        backgroundColor: '#1e40af',
        textColor: '#ffffff',
        logoPosition: 'top-left'
      }),
      isActive: true
    })
  });
};
```

## Expected Results

### Successful Implementation Should:
1. ✅ Generate cards for eligible members
2. ✅ Verify cards using multiple methods
3. ✅ Track card usage and verification history
4. ✅ Manage card lifecycle (activation, deactivation, replacement)
5. ✅ Handle production batches for physical cards
6. ✅ Provide analytics and reporting
7. ✅ Integrate with existing eligibility system
8. ✅ Prevent fraud and ensure security

### Performance Targets:
1. Card verification: < 500ms response time
2. Card generation: < 2s response time
3. Dashboard loading: < 1s initial load
4. Database queries: < 100ms for indexed queries
5. Concurrent verification: Handle 100+ simultaneous requests

### Security Requirements:
1. All API endpoints require authentication
2. Input validation prevents SQL injection
3. QR code data is cryptographically signed
4. Rate limiting on verification endpoints
5. Audit trail for all card operations
6. Error messages don't leak sensitive information

## Rollback Plan

If issues are discovered during testing:

### Database Rollback:
```sql
-- Drop card management tables
DROP TABLE IF EXISTS card_production_batches CASCADE;
DROP TABLE IF EXISTS card_verification_events CASCADE;
DROP TABLE IF EXISTS member_cards CASCADE;
DROP TABLE IF EXISTS card_templates CASCADE;
```

### Code Rollback:
```bash
# Remove card management files
rm server/routes/cardManagement.ts
rm server/services/cardManagementService.ts
rm -rf client/src/components/cards/

# Remove route registration from routes.ts
# Revert changes to storage.ts
# Revert changes to schema.ts
```

This comprehensive testing plan ensures the card management system is robust, secure, and performs well under various conditions.