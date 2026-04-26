import { sagaOrchestrator, SagaBuilder } from '@medical-coverage/shared/message-queue/src/orchestrator/SagaOrchestrator';
import { eventClient } from './EventClient';
import { CRMEvents } from './CrmDomainEvents';
import { createLogger } from '@medical-coverage/shared/message-queue/src/config/logger';

const logger = createLogger('crm-saga-orchestrator');

/**
 * CRM Service Saga Workflows
 * Distributed transaction orchestration for cross-service business processes
 */

export const initializeCrmSagas = (): void => {
  
  // ========================================
  // MEMBER ONBOARDING SAGA
  // Flow: CRM → Membership → Insurance → Billing → Core
  // ========================================
  const memberOnboardingSaga = new SagaBuilder('member-onboarding')
    .step('publish-lead-converted-event', async () => {
      logger.debug('Saga step: Publishing lead converted event');
      return true;
    }, {
      compensate: async () => {
        logger.debug('Compensating: Revert lead conversion status');
      }
    })
    
    .step('validate-with-fraud-service', async () => {
      logger.debug('Saga step: Validating against fraud detection service');
      return { fraudScore: 0.12 };
    }, {
      compensate: async () => {
        logger.debug('Compensating: Clear fraud validation cache');
      }
    })
    
    .step('create-member-in-membership-service', async () => {
      logger.debug('Saga step: Creating member record');
      return { memberId: 'generated-id' };
    }, {
      compensate: async () => {
        logger.debug('Compensating: Delete member record');
      }
    })
    
    .step('initialize-insurance-policies', async () => {
      logger.debug('Saga step: Initializing insurance policies');
      return { policyId: 'policy-generated' };
    }, {
      compensate: async () => {
        logger.debug('Compensating: Cancel insurance policies');
      }
    })
    
    .step('setup-billing-profile', async () => {
      logger.debug('Saga step: Setting up billing profile');
      return { billingAccountId: 'account-created' };
    }, {
      compensate: async () => {
        logger.debug('Compensating: Cancel billing account');
      }
    })
    
    .step('finalize-onboarding', async () => {
      logger.debug('Saga step: Finalizing onboarding process');
      return { status: 'completed' };
    })
    
    .build();

  // ========================================
  // COMPANY ENROLLMENT SAGA
  // ========================================
  const companyEnrollmentSaga = new SagaBuilder('company-enrollment')
    .step('publish-company-created-event', async () => {
      logger.debug('Saga step: Publishing company created event');
      return true;
    })
    
    .step('register-company-in-insurance', async () => {
      logger.debug('Saga step: Registering company in insurance service');
      return { companyReference: 'INS-001' };
    }, {
      compensate: async () => {
        logger.debug('Compensating: Remove company from insurance service');
      }
    })
    
    .step('create-billing-account', async () => {
      logger.debug('Saga step: Creating company billing account');
      return { billingAccount: 'BILL-001' };
    }, {
      compensate: async () => {
        logger.debug('Compensating: Cancel billing account');
      }
    })
    
    .step('initialize-analytics-tracking', async () => {
      logger.debug('Saga step: Initializing analytics tracking');
      return { analyticsEnabled: true };
    })
    
    .build();

  // ========================================
  // OPPORTUNITY WON SAGA
  // ========================================
  const opportunityWonSaga = new SagaBuilder('opportunity-won')
    .step('publish-opportunity-won-event', async () => {
      logger.debug('Saga step: Publishing opportunity won event');
      return true;
    })
    
    .step('create-policy-quote', async () => {
      logger.debug('Saga step: Generating policy quote');
      return { quoteId: 'QUOTE-001' };
    })
    
    .step('send-approval-request', async () => {
      logger.debug('Saga step: Sending approval request');
      return { approvalRequested: true };
    })
    
    .step('create-invoice-schedule', async () => {
      logger.debug('Saga step: Creating invoice schedule');
      return { invoiceSchedule: 'SCHEDULED' };
    })
    
    .build();

  // Register all saga definitions
  sagaOrchestrator.registerDefinition(memberOnboardingSaga);
  sagaOrchestrator.registerDefinition(companyEnrollmentSaga);
  sagaOrchestrator.registerDefinition(opportunityWonSaga);

  logger.info('CRM Saga orchestrator initialized successfully', {
    sagas: ['member-onboarding', 'company-enrollment', 'opportunity-won']
  });
};

/**
 * Start member onboarding distributed workflow
 */
export const startMemberOnboardingSaga = async (leadData: any, context: any): Promise<string> => {
  const sagaId = await sagaOrchestrator.startSaga('member-onboarding', {
    leadData,
    userId: context.userId,
    correlationId: context.correlationId
  }, context.correlationId);

  logger.info('Member onboarding saga started', { sagaId, leadId: leadData.id });
  return sagaId;
};

/**
 * Start company enrollment distributed workflow
 */
export const startCompanyEnrollmentSaga = async (companyData: any, context: any): Promise<string> => {
  const sagaId = await sagaOrchestrator.startSaga('company-enrollment', {
    companyData,
    userId: context.userId,
    correlationId: context.correlationId
  }, context.correlationId);

  logger.info('Company enrollment saga started', { sagaId, companyId: companyData.id });
  return sagaId;
};

/**
 * Start opportunity won distributed workflow
 */
export const startOpportunityWonSaga = async (opportunityData: any, context: any): Promise<string> => {
  const sagaId = await sagaOrchestrator.startSaga('opportunity-won', {
    opportunityData,
    userId: context.userId,
    correlationId: context.correlationId
  }, context.correlationId);

  logger.info('Opportunity won saga started', { sagaId, opportunityId: opportunityData.id });
  return sagaId;
};

export default sagaOrchestrator;