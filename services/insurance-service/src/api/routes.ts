import { Router } from 'express';
import { BenefitsController, benefitsValidationMiddleware } from './controllers/benefitsController.js';
import { SchemesController, validationMiddleware as schemesValidationMiddleware } from './controllers/schemesController.js';

const router = Router();

// Benefits routes
router.get('/benefits', benefitsValidationMiddleware.validateQuery, BenefitsController.getBenefits);
router.get('/benefits/categories', BenefitsController.getBenefitCategories);
router.get('/benefits/popular', BenefitsController.getPopularBenefits);
router.get('/benefits/:id', BenefitsController.getBenefit);
router.post('/benefits', benefitsValidationMiddleware.validateCreateBenefit, BenefitsController.createBenefit);
router.put('/benefits/:id', benefitsValidationMiddleware.validateUpdateBenefit, BenefitsController.updateBenefit);
router.delete('/benefits/:id', BenefitsController.deleteBenefit);

// Schemes routes
router.get('/schemes', schemesValidationMiddleware.validateQuery, SchemesController.getSchemes);
router.get('/schemes/:id', SchemesController.getScheme);
router.post('/schemes', schemesValidationMiddleware.validateCreateScheme, SchemesController.createScheme);
router.put('/schemes/:id', schemesValidationMiddleware.validateUpdateScheme, SchemesController.updateScheme);
router.delete('/schemes/:id', SchemesController.deleteScheme);
router.put('/schemes/:id/administrator', schemesValidationMiddleware.validateUpdateScheme, SchemesController.assignSchemeAdministrator);
router.put('/schemes/:id/suspend', SchemesController.suspendScheme);
router.put('/schemes/:id/activate', SchemesController.activateScheme);
router.put('/schemes/:id/approve', SchemesController.approveScheme);

// Allowed Claim Types Management (FR-08)
router.put('/schemes/:id/allowed-claim-types', SchemesController.setAllowedClaimTypes);
router.get('/schemes/:id/allowed-claim-types', SchemesController.getAllowedClaimTypes);
router.post('/schemes/:id/validate-claim-type', SchemesController.validateClaimType);

// Scheme Benefits routes
router.post('/schemes/:id/benefits', schemesValidationMiddleware.validateAddBenefitToScheme, SchemesController.addBenefitToScheme);
router.delete('/schemes/:id/benefits/:benefitId', SchemesController.removeBenefitFromScheme);

export default router;
