import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options: any = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Medical Coverage System API',
      version: '1.0.0',
      description: 'Complete API documentation for Medical Coverage System microservices',
      contact: {
        name: 'Medical Coverage System Support',
        email: 'support@medical-coverage.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'https://api.medical-coverage.com',
        description: 'Production server',
      },
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme. Enter your token in the text input below.'
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  example: 'Validation failed',
                },
                details: {
                  type: 'object',
                },
              },
            },
            correlationId: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
            },
            message: {
              type: 'string',
            },
            correlationId: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            userType: { type: 'string', enum: ['insurance', 'hospital', 'provider'], example: 'insurance' },
            entityId: { type: 'integer', example: 123 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        InsuranceScheme: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Premium Health Plan' },
            description: { type: 'string', example: 'Comprehensive health coverage' },
            pricingMethodology: { type: 'string', enum: ['community_rated', 'experience_rated'], example: 'community_rated' },
            status: { type: 'string', enum: ['active', 'inactive'], example: 'active' },
            effectiveDate: { type: 'string', format: 'date', example: '2025-01-01' },
            expiryDate: { type: 'string', format: 'date', example: '2025-12-31' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Patient: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            dateOfBirth: { type: 'string', format: 'date', example: '1980-01-01' },
            gender: { type: 'string', enum: ['male', 'female', 'other'], example: 'male' },
            contactNumber: { type: 'string', example: '+1234567890' },
            email: { type: 'string', format: 'email', example: 'john.doe@example.com' },
            address: { type: 'string', example: '123 Main St' },
            emergencyContact: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Jane Doe' },
                relationship: { type: 'string', example: 'spouse' },
                contactNumber: { type: 'string', example: '+1234567891' }
              }
            }
          }
        },
        Appointment: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            patientId: { type: 'integer', example: 456 },
            doctorId: { type: 'integer', example: 123 },
            appointmentDate: { type: 'string', format: 'date-time', example: '2025-12-21T10:00:00Z' },
            duration: { type: 'integer', example: 30 },
            appointmentType: { type: 'string', enum: ['consultation', 'follow-up', 'emergency'], example: 'consultation' },
            status: { type: 'string', enum: ['scheduled', 'confirmed', 'completed', 'cancelled'], example: 'scheduled' },
            notes: { type: 'string', example: 'Follow-up visit' }
          }
        },
        Invoice: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            patientId: { type: 'integer', example: 456 },
            invoiceNumber: { type: 'string', example: 'INV-2025-001' },
            status: { type: 'string', enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'], example: 'sent' },
            dueDate: { type: 'string', format: 'date', example: '2025-01-15' },
            totalAmount: { type: 'number', format: 'decimal', example: 150.00 },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string', example: 'Consultation' },
                  quantity: { type: 'integer', example: 1 },
                  unitPrice: { type: 'number', format: 'decimal', example: 150.00 },
                  total: { type: 'number', format: 'decimal', example: 150.00 }
                }
              }
            },
            notes: { type: 'string', example: 'Medical consultation fee' }
          }
        },
        Claim: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            patientId: { type: 'integer', example: 456 },
            serviceDate: { type: 'string', format: 'date', example: '2025-12-15' },
            diagnosisCode: { type: 'string', example: 'J00' },
            procedureCode: { type: 'string', example: '99201' },
            claimedAmount: { type: 'number', format: 'decimal', example: 150.00 },
            approvedAmount: { type: 'number', format: 'decimal', example: 150.00 },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'paid'], example: 'approved' },
            serviceProvider: { type: 'string', example: 'Dr. Smith' },
            documents: {
              type: 'array',
              items: { type: 'string' },
              example: ['receipt.pdf', 'prescription.pdf']
            },
            notes: { type: 'string', example: 'Routine consultation' }
          }
        },
        Company: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'ABC Insurance Corp' },
            registrationNumber: { type: 'string', example: 'REG123456' },
            taxId: { type: 'string', example: 'TAX789012' },
            address: { type: 'string', example: '123 Business Ave' },
            contactEmail: { type: 'string', format: 'email', example: 'contact@abcinsurance.com' },
            contactPhone: { type: 'string', example: '+1234567890' },
            status: { type: 'string', enum: ['active', 'inactive', 'suspended'], example: 'active' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Member: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            companyId: { type: 'integer', example: 123 },
            employeeId: { type: 'string', example: 'EMP001' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            dateOfBirth: { type: 'string', format: 'date', example: '1980-01-01' },
            gender: { type: 'string', enum: ['male', 'female', 'other'], example: 'male' },
            email: { type: 'string', format: 'email', example: 'john.doe@company.com' },
            phone: { type: 'string', example: '+1234567890' },
            address: { type: 'string', example: '123 Employee St' },
            department: { type: 'string', example: 'Engineering' },
            jobTitle: { type: 'string', example: 'Software Engineer' },
            enrollmentDate: { type: 'string', format: 'date', example: '2025-01-01' },
            status: { type: 'string', enum: ['active', 'inactive', 'terminated'], example: 'active' },
            cardNumber: { type: 'string', example: 'CARD123456789' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        MemberCard: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            memberId: { type: 'integer', example: 456 },
            cardNumber: { type: 'string', example: 'CARD123456789' },
            cardType: { type: 'string', enum: ['primary', 'secondary'], example: 'primary' },
            issueDate: { type: 'string', format: 'date', example: '2025-01-01' },
            expiryDate: { type: 'string', format: 'date', example: '2026-01-01' },
            status: { type: 'string', enum: ['active', 'inactive', 'lost', 'stolen'], example: 'active' },
            qrCode: { type: 'string', example: 'QR123456789' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Lead: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            companyName: { type: 'string', example: 'XYZ Corp' },
            contactPerson: { type: 'string', example: 'Jane Smith' },
            email: { type: 'string', format: 'email', example: 'jane.smith@xyzcorp.com' },
            phone: { type: 'string', example: '+1234567890' },
            companySize: { type: 'integer', example: 500 },
            industry: { type: 'string', example: 'Technology' },
            leadSource: { type: 'string', enum: ['website', 'referral', 'cold_call', 'email_campaign'], example: 'website' },
            status: { type: 'string', enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'], example: 'qualified' },
            assignedAgentId: { type: 'integer', example: 123 },
            estimatedValue: { type: 'number', format: 'decimal', example: 50000.00 },
            notes: { type: 'string', example: 'Interested in premium health plan' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Agent: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            firstName: { type: 'string', example: 'Sarah' },
            lastName: { type: 'string', example: 'Johnson' },
            email: { type: 'string', format: 'email', example: 'sarah.johnson@company.com' },
            phone: { type: 'string', example: '+1234567890' },
            employeeId: { type: 'string', example: 'AGT001' },
            department: { type: 'string', example: 'Sales' },
            hireDate: { type: 'string', format: 'date', example: '2023-01-15' },
            status: { type: 'string', enum: ['active', 'inactive', 'terminated'], example: 'active' },
            commissionRate: { type: 'number', format: 'decimal', example: 0.05 },
            totalCommission: { type: 'number', format: 'decimal', example: 25000.00 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Commission: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            agentId: { type: 'integer', example: 123 },
            leadId: { type: 'integer', example: 456 },
            companyId: { type: 'integer', example: 789 },
            amount: { type: 'number', format: 'decimal', example: 2500.00 },
            commissionRate: { type: 'number', format: 'decimal', example: 0.05 },
            status: { type: 'string', enum: ['pending', 'paid', 'cancelled'], example: 'paid' },
            paymentDate: { type: 'string', format: 'date', example: '2025-12-01' },
            notes: { type: 'string', example: 'Commission for XYZ Corp deal' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            companyId: { type: 'integer', example: 123 },
            memberId: { type: 'integer', example: 456 },
            invoiceId: { type: 'integer', example: 789 },
            amount: { type: 'number', format: 'decimal', example: 1500.00 },
            currency: { type: 'string', example: 'USD' },
            paymentMethod: { type: 'string', enum: ['credit_card', 'bank_transfer', 'check', 'cash'], example: 'credit_card' },
            paymentDate: { type: 'string', format: 'date-time', example: '2025-12-01T10:00:00Z' },
            status: { type: 'string', enum: ['pending', 'completed', 'failed', 'refunded'], example: 'completed' },
            transactionId: { type: 'string', example: 'TXN123456789' },
            referenceNumber: { type: 'string', example: 'REF987654321' },
            notes: { type: 'string', example: 'Monthly premium payment' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        LedgerEntry: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            companyId: { type: 'integer', example: 123 },
            memberId: { type: 'integer', example: 456 },
            transactionType: { type: 'string', enum: ['premium', 'claim', 'adjustment', 'refund'], example: 'premium' },
            amount: { type: 'number', format: 'decimal', example: 1500.00 },
            balance: { type: 'number', format: 'decimal', example: 1500.00 },
            description: { type: 'string', example: 'Monthly premium payment' },
            transactionDate: { type: 'string', format: 'date', example: '2025-12-01' },
            referenceId: { type: 'string', example: 'REF123456' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Enrollment: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            memberId: { type: 'integer', example: 456 },
            schemeId: { type: 'integer', example: 123 },
            enrollmentDate: { type: 'string', format: 'date', example: '2025-01-01' },
            effectiveDate: { type: 'string', format: 'date', example: '2025-01-01' },
            status: { type: 'string', enum: ['active', 'inactive', 'cancelled', 'expired'], example: 'active' },
            coverageType: { type: 'string', enum: ['individual', 'family'], example: 'family' },
            premiumAmount: { type: 'number', format: 'decimal', example: 1500.00 },
            paymentFrequency: { type: 'string', enum: ['monthly', 'quarterly', 'annually'], example: 'monthly' },
            dependents: { type: 'integer', example: 3 },
            notes: { type: 'string', example: 'Family coverage including spouse and 2 children' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Renewal: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            enrollmentId: { type: 'integer', example: 789 },
            renewalDate: { type: 'string', format: 'date', example: '2026-01-01' },
            status: { type: 'string', enum: ['pending', 'processed', 'cancelled'], example: 'processed' },
            newPremiumAmount: { type: 'number', format: 'decimal', example: 1650.00 },
            adjustmentReason: { type: 'string', example: 'Annual premium adjustment' },
            processedBy: { type: 'integer', example: 123 },
            processedAt: { type: 'string', format: 'date-time', example: '2025-12-15T09:00:00Z' },
            notes: { type: 'string', example: '5% increase due to inflation adjustment' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Benefit: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            schemeId: { type: 'integer', example: 123 },
            name: { type: 'string', example: 'Outpatient Consultation' },
            description: { type: 'string', example: 'Coverage for outpatient doctor visits' },
            category: { type: 'string', enum: ['medical', 'dental', 'vision', 'wellness'], example: 'medical' },
            coverageLimit: { type: 'number', format: 'decimal', example: 5000.00 },
            coveragePercentage: { type: 'number', format: 'decimal', example: 0.8 },
            waitingPeriod: { type: 'integer', example: 30 },
            status: { type: 'string', enum: ['active', 'inactive'], example: 'active' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        WellnessProgram: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Healthy Living Initiative' },
            description: { type: 'string', example: 'Comprehensive wellness program for employees' },
            programType: { type: 'string', enum: ['fitness', 'nutrition', 'mental_health', 'preventive_care'], example: 'fitness' },
            startDate: { type: 'string', format: 'date', example: '2025-01-01' },
            endDate: { type: 'string', format: 'date', example: '2025-12-31' },
            targetParticipants: { type: 'integer', example: 1000 },
            enrolledParticipants: { type: 'integer', example: 750 },
            status: { type: 'string', enum: ['active', 'inactive', 'completed'], example: 'active' },
            budget: { type: 'number', format: 'decimal', example: 50000.00 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        WellnessActivity: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            programId: { type: 'integer', example: 123 },
            memberId: { type: 'integer', example: 456 },
            activityType: { type: 'string', enum: ['gym_visit', 'health_screening', 'vaccination', 'seminar'], example: 'gym_visit' },
            activityDate: { type: 'string', format: 'date', example: '2025-12-15' },
            pointsEarned: { type: 'integer', example: 50 },
            description: { type: 'string', example: 'Gym workout session' },
            verified: { type: 'boolean', example: true },
            verifiedBy: { type: 'integer', example: 123 },
            verifiedAt: { type: 'string', format: 'date-time', example: '2025-12-15T18:00:00Z' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Incentive: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            memberId: { type: 'integer', example: 456 },
            programId: { type: 'integer', example: 123 },
            incentiveType: { type: 'string', enum: ['discount', 'cashback', 'gift_card', 'points'], example: 'discount' },
            amount: { type: 'number', format: 'decimal', example: 50.00 },
            description: { type: 'string', example: 'Gym membership discount' },
            earnedDate: { type: 'string', format: 'date', example: '2025-12-15' },
            expiryDate: { type: 'string', format: 'date', example: '2026-01-15' },
            status: { type: 'string', enum: ['earned', 'redeemed', 'expired'], example: 'earned' },
            redeemedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      { name: 'Gateway', description: 'API Gateway management endpoints' },
      { name: 'Authentication', description: 'User authentication and authorization' },
      { name: 'Core', description: 'Member and company management' },
      { name: 'Insurance', description: 'Insurance schemes and benefits management' },
      { name: 'Hospital', description: 'Hospital operations and patient management' },
      { name: 'Billing', description: 'Financial transactions and invoicing' },
      { name: 'Claims', description: 'Claims processing and management' },
      { name: 'Finance', description: 'Financial operations and ledger management' },
      { name: 'CRM', description: 'Customer relationship management' },
      { name: 'Membership', description: 'Membership and enrollment services' },
      { name: 'Wellness', description: 'Wellness programs and activities' }
    ],
    paths: {
      '/health': {
        get: {
          summary: 'Gateway health check',
          description: 'Returns the health status of the API Gateway and registered services',
          tags: ['Gateway'],
          responses: {
            200: {
              description: 'Gateway is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          status: { type: 'string', example: 'ok' },
                          timestamp: { type: 'string', format: 'date-time' },
                          uptime: { type: 'number' },
                          service: { type: 'string', example: 'api-gateway' },
                          version: { type: 'string' },
                          environment: { type: 'string' },
                          memory: { type: 'object' },
                          services: { type: 'object' }
                        }
                      },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/services': {
        get: {
          summary: 'Service status overview',
          description: 'Returns the status of all registered microservices',
          tags: ['Gateway'],
          security: [],
          responses: {
            200: {
              description: 'Service status retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          services: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                name: { type: 'string' },
                                url: { type: 'string' },
                                healthy: { type: 'boolean' },
                                lastChecked: { type: 'string', format: 'date-time' },
                                responseTime: { type: 'number' },
                                errorCount: { type: 'integer' },
                                circuitBreakerOpen: { type: 'boolean' }
                              }
                            }
                          },
                          totalServices: { type: 'integer' },
                          healthyServices: { type: 'integer' }
                        }
                      },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/docs': {
        get: {
          summary: 'API documentation overview',
          description: 'Returns a summary of available API endpoints and services',
          tags: ['Gateway'],
          security: [],
          responses: {
            200: {
              description: 'API documentation retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          name: { type: 'string', example: 'Medical Coverage System API Gateway' },
                          version: { type: 'string', example: '1.0.0' },
                          description: { type: 'string' },
                          endpoints: { type: 'object' },
                          versioning: { type: 'string', example: 'v1' },
                          authentication: { type: 'string', example: 'JWT Bearer Token' },
                          rateLimiting: { type: 'string' },
                          correlationId: { type: 'string' }
                        }
                      },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/auth/register': {
        post: {
          summary: 'Register a new user',
          description: 'Creates a new user account in the system',
          tags: ['Authentication'],
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'userType', 'entityId'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'user@example.com' },
                    password: { type: 'string', minLength: 8, example: 'securepassword123' },
                    userType: { type: 'string', enum: ['insurance', 'hospital', 'provider'], example: 'insurance' },
                    entityId: { type: 'integer', example: 123 }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'User registered successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/User' },
                      message: { type: 'string', example: 'User registered successfully' },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            },
            409: {
              description: 'User already exists',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/auth/login': {
        post: {
          summary: 'User login',
          description: 'Authenticates a user and returns access tokens',
          tags: ['Authentication'],
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'userType'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'user@example.com' },
                    password: { type: 'string', example: 'securepassword123' },
                    userType: { type: 'string', enum: ['insurance', 'hospital', 'provider'], example: 'insurance' }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                          refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                          user: { $ref: '#/components/schemas/User' }
                        }
                      },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            },
            401: {
              description: 'Invalid credentials',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/insurance/schemes': {
        get: {
          summary: 'List insurance schemes',
          description: 'Retrieves a paginated list of insurance schemes',
          tags: ['Insurance'],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'Page number' },
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }, description: 'Number of items per page' }
          ],
          responses: {
            200: {
              description: 'Schemes retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          schemes: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/InsuranceScheme' }
                          },
                          pagination: {
                            type: 'object',
                            properties: {
                              page: { type: 'integer' },
                              limit: { type: 'integer' },
                              total: { type: 'integer' },
                              totalPages: { type: 'integer' }
                            }
                          }
                        }
                      },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Create insurance scheme',
          description: 'Creates a new insurance scheme',
          tags: ['Insurance'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'pricingMethodology', 'status', 'effectiveDate', 'expiryDate'],
                  properties: {
                    name: { type: 'string', example: 'Premium Health Plan' },
                    description: { type: 'string', example: 'Comprehensive health coverage' },
                    pricingMethodology: { type: 'string', enum: ['community_rated', 'experience_rated'], example: 'community_rated' },
                    status: { type: 'string', enum: ['active', 'inactive'], example: 'active' },
                    effectiveDate: { type: 'string', format: 'date', example: '2025-01-01' },
                    expiryDate: { type: 'string', format: 'date', example: '2025-12-31' }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Scheme created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/InsuranceScheme' },
                      message: { type: 'string', example: 'Insurance scheme created successfully' },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/hospital/patients': {
        get: {
          summary: 'List patients',
          description: 'Retrieves a paginated list of patients',
          tags: ['Hospital'],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'Page number' },
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }, description: 'Number of items per page' },
            { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Search term for patient name or ID' }
          ],
          responses: {
            200: {
              description: 'Patients retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          patients: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Patient' }
                          },
                          pagination: {
                            type: 'object',
                            properties: {
                              page: { type: 'integer' },
                              limit: { type: 'integer' },
                              total: { type: 'integer' },
                              totalPages: { type: 'integer' }
                            }
                          }
                        }
                      },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Register patient',
          description: 'Creates a new patient record',
          tags: ['Hospital'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['firstName', 'lastName', 'dateOfBirth', 'gender', 'contactNumber'],
                  properties: {
                    firstName: { type: 'string', example: 'John' },
                    lastName: { type: 'string', example: 'Doe' },
                    dateOfBirth: { type: 'string', format: 'date', example: '1980-01-01' },
                    gender: { type: 'string', enum: ['male', 'female', 'other'], example: 'male' },
                    contactNumber: { type: 'string', example: '+1234567890' },
                    email: { type: 'string', format: 'email', example: 'john.doe@example.com' },
                    address: { type: 'string', example: '123 Main St' },
                    emergencyContact: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', example: 'Jane Doe' },
                        relationship: { type: 'string', example: 'spouse' },
                        contactNumber: { type: 'string', example: '+1234567891' }
                      }
                    }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Patient registered successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/Patient' },
                      message: { type: 'string', example: 'Patient registered successfully' },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/hospital/appointments': {
        get: {
          summary: 'List appointments',
          description: 'Retrieves appointments for a specific date or patient',
          tags: ['Hospital'],
          parameters: [
            { in: 'query', name: 'date', schema: { type: 'string', format: 'date' }, description: 'Appointment date (YYYY-MM-DD)' },
            { in: 'query', name: 'patientId', schema: { type: 'integer' }, description: 'Patient ID' },
            { in: 'query', name: 'doctorId', schema: { type: 'integer' }, description: 'Doctor ID' }
          ],
          responses: {
            200: {
              description: 'Appointments retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Appointment' }
                      },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Schedule appointment',
          description: 'Creates a new appointment',
          tags: ['Hospital'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['patientId', 'doctorId', 'appointmentDate', 'duration', 'appointmentType'],
                  properties: {
                    patientId: { type: 'integer', example: 456 },
                    doctorId: { type: 'integer', example: 123 },
                    appointmentDate: { type: 'string', format: 'date-time', example: '2025-12-21T10:00:00Z' },
                    duration: { type: 'integer', example: 30 },
                    appointmentType: { type: 'string', enum: ['consultation', 'follow-up', 'emergency'], example: 'consultation' },
                    notes: { type: 'string', example: 'Follow-up visit' }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Appointment scheduled successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/Appointment' },
                      message: { type: 'string', example: 'Appointment scheduled successfully' },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/billing/invoices': {
        get: {
          summary: 'List invoices',
          description: 'Retrieves a paginated list of invoices',
          tags: ['Billing'],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'Page number' },
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }, description: 'Number of items per page' },
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'] }, description: 'Invoice status filter' },
            { in: 'query', name: 'patientId', schema: { type: 'integer' }, description: 'Patient ID filter' }
          ],
          responses: {
            200: {
              description: 'Invoices retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          invoices: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Invoice' }
                          },
                          pagination: {
                            type: 'object',
                            properties: {
                              page: { type: 'integer' },
                              limit: { type: 'integer' },
                              total: { type: 'integer' },
                              totalPages: { type: 'integer' }
                            }
                          }
                        }
                      },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Create invoice',
          description: 'Creates a new invoice',
          tags: ['Billing'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['patientId', 'items', 'dueDate'],
                  properties: {
                    patientId: { type: 'integer', example: 456 },
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          description: { type: 'string', example: 'Consultation' },
                          quantity: { type: 'integer', example: 1 },
                          unitPrice: { type: 'number', format: 'decimal', example: 150.00 },
                          total: { type: 'number', format: 'decimal', example: 150.00 }
                        }
                      }
                    },
                    dueDate: { type: 'string', format: 'date', example: '2025-01-15' },
                    notes: { type: 'string', example: 'Medical consultation fee' }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Invoice created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/Invoice' },
                      message: { type: 'string', example: 'Invoice created successfully' },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/claims': {
        get: {
          summary: 'List claims',
          description: 'Retrieves a paginated list of claims',
          tags: ['Claims'],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'Page number' },
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }, description: 'Number of items per page' },
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['pending', 'approved', 'rejected', 'paid'] }, description: 'Claim status filter' },
            { in: 'query', name: 'patientId', schema: { type: 'integer' }, description: 'Patient ID filter' }
          ],
          responses: {
            200: {
              description: 'Claims retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          claims: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Claim' }
                          },
                          pagination: {
                            type: 'object',
                            properties: {
                              page: { type: 'integer' },
                              limit: { type: 'integer' },
                              total: { type: 'integer' },
                              totalPages: { type: 'integer' }
                            }
                          }
                        }
                      },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Submit claim',
          description: 'Creates a new claim',
          tags: ['Claims'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['patientId', 'serviceDate', 'diagnosisCode', 'procedureCode', 'claimedAmount', 'serviceProvider'],
                  properties: {
                    patientId: { type: 'integer', example: 456 },
                    serviceDate: { type: 'string', format: 'date', example: '2025-12-15' },
                    diagnosisCode: { type: 'string', example: 'J00' },
                    procedureCode: { type: 'string', example: '99201' },
                    claimedAmount: { type: 'number', format: 'decimal', example: 150.00 },
                    serviceProvider: { type: 'string', example: 'Dr. Smith' },
                    documents: {
                      type: 'array',
                      items: { type: 'string' },
                      example: ['receipt.pdf', 'prescription.pdf']
                    },
                    notes: { type: 'string', example: 'Routine consultation' }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Claim submitted successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/Claim' },
                      message: { type: 'string', example: 'Claim submitted successfully' },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/core/companies': {
        get: {
          summary: 'List companies',
          description: 'Retrieves a paginated list of companies',
          tags: ['Core'],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'Page number' },
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }, description: 'Number of items per page' },
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['active', 'inactive', 'suspended'] }, description: 'Company status filter' }
          ],
          responses: {
            200: {
              description: 'Companies retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          companies: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Company' }
                          },
                          pagination: {
                            type: 'object',
                            properties: {
                              page: { type: 'integer' },
                              limit: { type: 'integer' },
                              total: { type: 'integer' },
                              totalPages: { type: 'integer' }
                            }
                          }
                        }
                      },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Create company',
          description: 'Creates a new company record',
          tags: ['Core'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'registrationNumber', 'contactEmail'],
                  properties: {
                    name: { type: 'string', example: 'ABC Insurance Corp' },
                    registrationNumber: { type: 'string', example: 'REG123456' },
                    taxId: { type: 'string', example: 'TAX789012' },
                    address: { type: 'string', example: '123 Business Ave' },
                    contactEmail: { type: 'string', format: 'email', example: 'contact@abcinsurance.com' },
                    contactPhone: { type: 'string', example: '+1234567890' }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Company created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/Company' },
                      message: { type: 'string', example: 'Company created successfully' },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/core/members': {
        get: {
          summary: 'List members',
          description: 'Retrieves a paginated list of members',
          tags: ['Core'],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'Page number' },
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }, description: 'Number of items per page' },
            { in: 'query', name: 'companyId', schema: { type: 'integer' }, description: 'Company ID filter' },
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['active', 'inactive', 'terminated'] }, description: 'Member status filter' }
          ],
          responses: {
            200: {
              description: 'Members retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          members: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Member' }
                          },
                          pagination: {
                            type: 'object',
                            properties: {
                              page: { type: 'integer' },
                              limit: { type: 'integer' },
                              total: { type: 'integer' },
                              totalPages: { type: 'integer' }
                            }
                          }
                        }
                      },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Create member',
          description: 'Creates a new member record',
          tags: ['Core'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['companyId', 'firstName', 'lastName', 'dateOfBirth', 'email'],
                  properties: {
                    companyId: { type: 'integer', example: 123 },
                    employeeId: { type: 'string', example: 'EMP001' },
                    firstName: { type: 'string', example: 'John' },
                    lastName: { type: 'string', example: 'Doe' },
                    dateOfBirth: { type: 'string', format: 'date', example: '1980-01-01' },
                    gender: { type: 'string', enum: ['male', 'female', 'other'], example: 'male' },
                    email: { type: 'string', format: 'email', example: 'john.doe@company.com' },
                    phone: { type: 'string', example: '+1234567890' },
                    address: { type: 'string', example: '123 Employee St' },
                    department: { type: 'string', example: 'Engineering' },
                    jobTitle: { type: 'string', example: 'Software Engineer' }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Member created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/Member' },
                      message: { type: 'string', example: 'Member created successfully' },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/core/member-cards': {
        get: {
          summary: 'List member cards',
          description: 'Retrieves a paginated list of member cards',
          tags: ['Core'],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'Page number' },
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }, description: 'Number of items per page' },
            { in: 'query', name: 'memberId', schema: { type: 'integer' }, description: 'Member ID filter' },
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['active', 'inactive', 'lost', 'stolen'] }, description: 'Card status filter' }
          ],
          responses: {
            200: {
              description: 'Member cards retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          cards: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/MemberCard' }
                          },
                          pagination: {
                            type: 'object',
                            properties: {
                              page: { type: 'integer' },
                              limit: { type: 'integer' },
                              total: { type: 'integer' },
                              totalPages: { type: 'integer' }
                            }
                          }
                        }
                      },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Issue member card',
          description: 'Creates a new member card',
          tags: ['Core'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['memberId', 'cardType'],
                  properties: {
                    memberId: { type: 'integer', example: 456 },
                    cardType: { type: 'string', enum: ['primary', 'secondary'], example: 'primary' },
                    expiryDate: { type: 'string', format: 'date', example: '2026-01-01' }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Member card issued successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/MemberCard' },
                      message: { type: 'string', example: 'Member card issued successfully' },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/finance/payments': {
        get: {
          summary: 'List payments',
          description: 'Retrieves a paginated list of payments',
          tags: ['Finance'],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'Page number' },
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }, description: 'Number of items per page' },
            { in: 'query', name: 'companyId', schema: { type: 'integer' }, description: 'Company ID filter' },
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['pending', 'completed', 'failed', 'refunded'] }, description: 'Payment status filter' }
          ],
          responses: {
            200: {
              description: 'Payments retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          payments: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Payment' }
                          },
                          pagination: {
                            type: 'object',
                            properties: {
                              page: { type: 'integer' },
                              limit: { type: 'integer' },
                              total: { type: 'integer' },
                              totalPages: { type: 'integer' }
                            }
                          }
                        }
                      },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Process payment',
          description: 'Processes a new payment transaction',
          tags: ['Finance'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['amount', 'paymentMethod'],
                  properties: {
                    companyId: { type: 'integer', example: 123 },
                    memberId: { type: 'integer', example: 456 },
                    invoiceId: { type: 'integer', example: 789 },
                    amount: { type: 'number', format: 'decimal', example: 1500.00 },
                    currency: { type: 'string', example: 'USD' },
                    paymentMethod: { type: 'string', enum: ['credit_card', 'bank_transfer', 'check', 'cash'], example: 'credit_card' },
                    notes: { type: 'string', example: 'Monthly premium payment' }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Payment processed successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/Payment' },
                      message: { type: 'string', example: 'Payment processed successfully' },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/finance/ledger': {
        get: {
          summary: 'Get ledger entries',
          description: 'Retrieves ledger entries for a company or member',
          tags: ['Finance'],
          parameters: [
            { in: 'query', name: 'companyId', schema: { type: 'integer' }, description: 'Company ID filter' },
            { in: 'query', name: 'memberId', schema: { type: 'integer' }, description: 'Member ID filter' },
            { in: 'query', name: 'startDate', schema: { type: 'string', format: 'date' }, description: 'Start date filter' },
            { in: 'query', name: 'endDate', schema: { type: 'string', format: 'date' }, description: 'End date filter' },
            { in: 'query', name: 'transactionType', schema: { type: 'string', enum: ['premium', 'claim', 'adjustment', 'refund'] }, description: 'Transaction type filter' }
          ],
          responses: {
            200: {
              description: 'Ledger entries retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/LedgerEntry' }
                      },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/crm/leads': {
        get: {
          summary: 'List leads',
          description: 'Retrieves a paginated list of sales leads',
          tags: ['CRM'],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'Page number' },
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }, description: 'Number of items per page' },
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] }, description: 'Lead status filter' },
            { in: 'query', name: 'assignedAgentId', schema: { type: 'integer' }, description: 'Assigned agent ID filter' }
          ],
          responses: {
            200: {
              description: 'Leads retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          leads: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Lead' }
                          },
                          pagination: {
                            type: 'object',
                            properties: {
                              page: { type: 'integer' },
                              limit: { type: 'integer' },
                              total: { type: 'integer' },
                              totalPages: { type: 'integer' }
                            }
                          }
                        }
                      },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Create lead',
          description: 'Creates a new sales lead',
          tags: ['CRM'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['companyName', 'contactPerson', 'email', 'leadSource'],
                  properties: {
                    companyName: { type: 'string', example: 'XYZ Corp' },
                    contactPerson: { type: 'string', example: 'Jane Smith' },
                    email: { type: 'string', format: 'email', example: 'jane.smith@xyzcorp.com' },
                    phone: { type: 'string', example: '+1234567890' },
                    companySize: { type: 'integer', example: 500 },
                    industry: { type: 'string', example: 'Technology' },
                    leadSource: { type: 'string', enum: ['website', 'referral', 'cold_call', 'email_campaign'], example: 'website' },
                    assignedAgentId: { type: 'integer', example: 123 },
                    estimatedValue: { type: 'number', format: 'decimal', example: 50000.00 },
                    notes: { type: 'string', example: 'Interested in premium health plan' }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Lead created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/Lead' },
                      message: { type: 'string', example: 'Lead created successfully' },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/crm/agents': {
        get: {
          summary: 'List agents',
          description: 'Retrieves a paginated list of sales agents',
          tags: ['CRM'],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'Page number' },
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }, description: 'Number of items per page' },
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['active', 'inactive', 'terminated'] }, description: 'Agent status filter' }
          ],
          responses: {
            200: {
              description: 'Agents retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          agents: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Agent' }
                          },
                          pagination: {
                            type: 'object',
                            properties: {
                              page: { type: 'integer' },
                              limit: { type: 'integer' },
                              total: { type: 'integer' },
                              totalPages: { type: 'integer' }
                            }
                          }
                        }
                      },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Create agent',
          description: 'Creates a new sales agent',
          tags: ['CRM'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['firstName', 'lastName', 'email', 'employeeId'],
                  properties: {
                    firstName: { type: 'string', example: 'Sarah' },
                    lastName: { type: 'string', example: 'Johnson' },
                    email: { type: 'string', format: 'email', example: 'sarah.johnson@company.com' },
                    phone: { type: 'string', example: '+1234567890' },
                    employeeId: { type: 'string', example: 'AGT001' },
                    department: { type: 'string', example: 'Sales' },
                    commissionRate: { type: 'number', format: 'decimal', example: 0.05 }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Agent created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/Agent' },
                      message: { type: 'string', example: 'Agent created successfully' },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/crm/commissions': {
        get: {
          summary: 'List commissions',
          description: 'Retrieves a paginated list of agent commissions',
          tags: ['CRM'],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'Page number' },
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }, description: 'Number of items per page' },
            { in: 'query', name: 'agentId', schema: { type: 'integer' }, description: 'Agent ID filter' },
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['pending', 'paid', 'cancelled'] }, description: 'Commission status filter' }
          ],
          responses: {
            200: {
              description: 'Commissions retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          commissions: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Commission' }
                          },
                          pagination: {
                            type: 'object',
                            properties: {
                              page: { type: 'integer' },
                              limit: { type: 'integer' },
                              total: { type: 'integer' },
                              totalPages: { type: 'integer' }
                            }
                          }
                        }
                      },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/membership/enrollments': {
        get: {
          summary: 'List enrollments',
          description: 'Retrieves a paginated list of member enrollments',
          tags: ['Membership'],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'Page number' },
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }, description: 'Number of items per page' },
            { in: 'query', name: 'memberId', schema: { type: 'integer' }, description: 'Member ID filter' },
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['active', 'inactive', 'cancelled', 'expired'] }, description: 'Enrollment status filter' }
          ],
          responses: {
            200: {
              description: 'Enrollments retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          enrollments: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Enrollment' }
                          },
                          pagination: {
                            type: 'object',
                            properties: {
                              page: { type: 'integer' },
                              limit: { type: 'integer' },
                              total: { type: 'integer' },
                              totalPages: { type: 'integer' }
                            }
                          }
                        }
                      },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Create enrollment',
          description: 'Creates a new member enrollment',
          tags: ['Membership'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['memberId', 'schemeId', 'coverageType', 'premiumAmount', 'paymentFrequency'],
                  properties: {
                    memberId: { type: 'integer', example: 456 },
                    schemeId: { type: 'integer', example: 123 },
                    enrollmentDate: { type: 'string', format: 'date', example: '2025-01-01' },
                    effectiveDate: { type: 'string', format: 'date', example: '2025-01-01' },
                    coverageType: { type: 'string', enum: ['individual', 'family'], example: 'family' },
                    premiumAmount: { type: 'number', format: 'decimal', example: 1500.00 },
                    paymentFrequency: { type: 'string', enum: ['monthly', 'quarterly', 'annually'], example: 'monthly' },
                    dependents: { type: 'integer', example: 3 },
                    notes: { type: 'string', example: 'Family coverage including spouse and 2 children' }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Enrollment created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/Enrollment' },
                      message: { type: 'string', example: 'Enrollment created successfully' },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/membership/renewals': {
        get: {
          summary: 'List renewals',
          description: 'Retrieves a paginated list of membership renewals',
          tags: ['Membership'],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'Page number' },
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }, description: 'Number of items per page' },
            { in: 'query', name: 'enrollmentId', schema: { type: 'integer' }, description: 'Enrollment ID filter' },
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['pending', 'processed', 'cancelled'] }, description: 'Renewal status filter' }
          ],
          responses: {
            200: {
              description: 'Renewals retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          renewals: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Renewal' }
                          },
                          pagination: {
                            type: 'object',
                            properties: {
                              page: { type: 'integer' },
                              limit: { type: 'integer' },
                              total: { type: 'integer' },
                              totalPages: { type: 'integer' }
                            }
                          }
                        }
                      },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Process renewal',
          description: 'Processes a membership renewal',
          tags: ['Membership'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['enrollmentId', 'renewalDate', 'newPremiumAmount'],
                  properties: {
                    enrollmentId: { type: 'integer', example: 789 },
                    renewalDate: { type: 'string', format: 'date', example: '2026-01-01' },
                    newPremiumAmount: { type: 'number', format: 'decimal', example: 1650.00 },
                    adjustmentReason: { type: 'string', example: 'Annual premium adjustment' },
                    notes: { type: 'string', example: '5% increase due to inflation adjustment' }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Renewal processed successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/Renewal' },
                      message: { type: 'string', example: 'Renewal processed successfully' },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/membership/benefits': {
        get: {
          summary: 'List benefits',
          description: 'Retrieves benefits for a specific scheme',
          tags: ['Membership'],
          parameters: [
            { in: 'query', name: 'schemeId', schema: { type: 'integer' }, description: 'Scheme ID filter' },
            { in: 'query', name: 'category', schema: { type: 'string', enum: ['medical', 'dental', 'vision', 'wellness'] }, description: 'Benefit category filter' }
          ],
          responses: {
            200: {
              description: 'Benefits retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Benefit' }
                      },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/wellness/programs': {
        get: {
          summary: 'List wellness programs',
          description: 'Retrieves a paginated list of wellness programs',
          tags: ['Wellness'],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'Page number' },
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }, description: 'Number of items per page' },
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['active', 'inactive', 'completed'] }, description: 'Program status filter' }
          ],
          responses: {
            200: {
              description: 'Programs retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          programs: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/WellnessProgram' }
                          },
                          pagination: {
                            type: 'object',
                            properties: {
                              page: { type: 'integer' },
                              limit: { type: 'integer' },
                              total: { type: 'integer' },
                              totalPages: { type: 'integer' }
                            }
                          }
                        }
                      },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Create wellness program',
          description: 'Creates a new wellness program',
          tags: ['Wellness'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'programType', 'startDate', 'endDate'],
                  properties: {
                    name: { type: 'string', example: 'Healthy Living Initiative' },
                    description: { type: 'string', example: 'Comprehensive wellness program for employees' },
                    programType: { type: 'string', enum: ['fitness', 'nutrition', 'mental_health', 'preventive_care'], example: 'fitness' },
                    startDate: { type: 'string', format: 'date', example: '2025-01-01' },
                    endDate: { type: 'string', format: 'date', example: '2025-12-31' },
                    targetParticipants: { type: 'integer', example: 1000 },
                    budget: { type: 'number', format: 'decimal', example: 50000.00 }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Program created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/WellnessProgram' },
                      message: { type: 'string', example: 'Wellness program created successfully' },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/wellness/activities': {
        get: {
          summary: 'List wellness activities',
          description: 'Retrieves wellness activities for a member or program',
          tags: ['Wellness'],
          parameters: [
            { in: 'query', name: 'memberId', schema: { type: 'integer' }, description: 'Member ID filter' },
            { in: 'query', name: 'programId', schema: { type: 'integer' }, description: 'Program ID filter' },
            { in: 'query', name: 'activityType', schema: { type: 'string', enum: ['gym_visit', 'health_screening', 'vaccination', 'seminar'] }, description: 'Activity type filter' },
            { in: 'query', name: 'verified', schema: { type: 'boolean' }, description: 'Verification status filter' }
          ],
          responses: {
            200: {
              description: 'Activities retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/WellnessActivity' }
                      },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Log wellness activity',
          description: 'Logs a new wellness activity for a member',
          tags: ['Wellness'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['memberId', 'programId', 'activityType', 'activityDate'],
                  properties: {
                    memberId: { type: 'integer', example: 456 },
                    programId: { type: 'integer', example: 123 },
                    activityType: { type: 'string', enum: ['gym_visit', 'health_screening', 'vaccination', 'seminar'], example: 'gym_visit' },
                    activityDate: { type: 'string', format: 'date', example: '2025-12-15' },
                    pointsEarned: { type: 'integer', example: 50 },
                    description: { type: 'string', example: 'Gym workout session' }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Activity logged successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/WellnessActivity' },
                      message: { type: 'string', example: 'Wellness activity logged successfully' },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/api/wellness/incentives': {
        get: {
          summary: 'List incentives',
          description: 'Retrieves incentives earned by a member',
          tags: ['Wellness'],
          parameters: [
            { in: 'query', name: 'memberId', schema: { type: 'integer' }, description: 'Member ID filter' },
            { in: 'query', name: 'programId', schema: { type: 'integer' }, description: 'Program ID filter' },
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['earned', 'redeemed', 'expired'] }, description: 'Incentive status filter' }
          ],
          responses: {
            200: {
              description: 'Incentives retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Incentive' }
                      },
                      correlationId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

const specs = swaggerJsdoc(options);

export { swaggerUi, specs };