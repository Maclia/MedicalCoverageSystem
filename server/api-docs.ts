import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Medical Coverage System API',
      version: '2.0.0',
      description: 'Comprehensive API documentation for the Medical Coverage System including member management, onboarding, benefits, wellness, and administrative features.',
      contact: {
        name: 'API Support',
        email: 'support@medicalcoverage.com',
        url: 'https://medicalcoverage.com/support'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.medicalcoverage.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token obtained from authentication endpoint'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['id', 'email', 'role'],
          properties: {
            id: {
              type: 'number',
              description: 'Unique user identifier'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            role: {
              type: 'string',
              enum: ['admin', 'insurance', 'member'],
              description: 'User role for access control'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User account creation timestamp'
            }
          }
        },
        Company: {
          type: 'object',
          required: ['name', 'industry', 'contactEmail'],
          properties: {
            id: {
              type: 'number',
              description: 'Unique company identifier'
            },
            name: {
              type: 'string',
              description: 'Company name'
            },
            industry: {
              type: 'string',
              description: 'Industry sector'
            },
            contactEmail: {
              type: 'string',
              format: 'email',
              description: 'Company contact email'
            },
            address: {
              type: 'string',
              description: 'Company physical address'
            }
          }
        },
        Member: {
          type: 'object',
          required: ['firstName', 'lastName', 'email', 'memberType', 'companyId'],
          properties: {
            id: {
              type: 'number',
              description: 'Unique member identifier'
            },
            firstName: {
              type: 'string',
              description: 'Member first name'
            },
            lastName: {
              type: 'string',
              description: 'Member last name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Member email address'
            },
            memberType: {
              type: 'string',
              enum: ['principal', 'dependent'],
              description: 'Type of membership'
            },
            companyId: {
              type: 'number',
              description: 'Associated company identifier'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'pending'],
              description: 'Member status'
            }
          }
        },
        OnboardingSession: {
          type: 'object',
          required: ['memberId', 'status'],
          properties: {
            id: {
              type: 'number',
              description: 'Unique session identifier'
            },
            memberId: {
              type: 'number',
              description: 'Associated member identifier'
            },
            currentDay: {
              type: 'number',
              minimum: 1,
              maximum: 7,
              description: 'Current day in onboarding journey (1-7)'
            },
            status: {
              type: 'string',
              enum: ['not_started', 'in_progress', 'completed', 'paused'],
              description: 'Onboarding session status'
            },
            activationDate: {
              type: 'string',
              format: 'date-time',
              description: 'Session activation timestamp'
            },
            completionDate: {
              type: 'string',
              format: 'date-time',
              description: 'Session completion timestamp'
            }
          }
        },
        MemberDocument: {
          type: 'object',
          required: ['memberId', 'documentType', 'fileName'],
          properties: {
            id: {
              type: 'number',
              description: 'Unique document identifier'
            },
            memberId: {
              type: 'number',
              description: 'Associated member identifier'
            },
            documentType: {
              type: 'string',
              enum: ['insurance_card', 'id_card', 'medical_history', 'proof_of_income', 'other'],
              description: 'Type of document'
            },
            fileName: {
              type: 'string',
              description: 'Original filename'
            },
            fileSize: {
              type: 'number',
              description: 'File size in bytes'
            },
            mimeType: {
              type: 'string',
              description: 'MIME type of the file'
            },
            verificationStatus: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected', 'needs_info'],
              description: 'Document verification status'
            },
            uploadDate: {
              type: 'string',
              format: 'date-time',
              description: 'Document upload timestamp'
            },
            isRequired: {
              type: 'boolean',
              description: 'Whether this document is required'
            }
          }
        },
        BenefitInsight: {
          type: 'object',
          required: ['type', 'title', 'category'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique insight identifier'
            },
            type: {
              type: 'string',
              enum: ['recommendation', 'warning', 'optimization', 'opportunity'],
              description: 'Type of insight'
            },
            title: {
              type: 'string',
              description: 'Insight title'
            },
            description: {
              type: 'string',
              description: 'Detailed insight description'
            },
            category: {
              type: 'string',
              enum: ['medical', 'wellness', 'financial', 'preventive', 'lifestyle'],
              description: 'Insight category'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'Insight priority level'
            },
            potentialSavings: {
              type: 'number',
              description: 'Potential monetary savings'
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'AI confidence score'
            }
          }
        },
        WellnessGoal: {
          type: 'object',
          required: ['title', 'category', 'targetValue'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique goal identifier'
            },
            title: {
              type: 'string',
              description: 'Goal title'
            },
            description: {
              type: 'string',
              description: 'Goal description'
            },
            category: {
              type: 'string',
              enum: ['physical', 'mental', 'nutrition', 'sleep', 'social', 'preventive'],
              description: 'Wellness category'
            },
            targetValue: {
              type: 'number',
              description: 'Target goal value'
            },
            currentValue: {
              type: 'number',
              description: 'Current progress value'
            },
            unit: {
              type: 'string',
              description: 'Measurement unit'
            },
            status: {
              type: 'string',
              enum: ['active', 'completed', 'paused', 'not_started'],
              description: 'Goal status'
            },
            points: {
              type: 'number',
              description: 'Points awarded for completion'
            }
          }
        },
        ApiError: {
          type: 'object',
          required: ['error', 'message'],
          properties: {
            error: {
              type: 'string',
              description: 'Error type or code'
            },
            message: {
              type: 'string',
              description: 'Detailed error message'
            },
            details: {
              type: 'object',
              description: 'Additional error details'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          required: ['success'],
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the operation was successful'
            },
            data: {
              type: 'object',
              description: 'Response data payload'
            },
            message: {
              type: 'string',
              description: 'Response message'
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'number',
                  description: 'Current page number'
                },
                limit: {
                  type: 'number',
                  description: 'Items per page'
                },
                total: {
                  type: 'number',
                  description: 'Total number of items'
                },
                totalPages: {
                  type: 'number',
                  description: 'Total number of pages'
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Companies',
        description: 'Company management operations'
      },
      {
        name: 'Members',
        description: 'Member management operations'
      },
      {
        name: 'Onboarding',
        description: 'Member onboarding workflows and sessions'
      },
      {
        name: 'Documents',
        description: 'Document upload, verification, and management'
      },
      {
        name: 'Benefits',
        description: 'Benefits management and intelligence'
      },
      {
        name: 'Wellness',
        description: 'Wellness programs and tracking'
      },
      {
        name: 'Email',
        description: 'Email communications and templates'
      },
      {
        name: 'Admin',
        description: 'Administrative operations and dashboards'
      }
    ]
  },
  apis: [
    './server/index.ts', // Main server file
    './server/routes.ts', // API routes
    './server/auth.ts', // Authentication endpoints
    './server/*.ts', // All server TypeScript files
  ]
};

const specs = swaggerJsdoc(options);

export function setupApiDocs(app: Express) {
  // Swagger UI documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Medical Coverage System API Documentation'
  }));

  // JSON specification
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log('📚 API Documentation available at:');
  console.log('   Swagger UI: http://localhost:5000/api-docs');
  console.log('   JSON Spec:  http://localhost:5000/api-docs.json');
}

export { specs };