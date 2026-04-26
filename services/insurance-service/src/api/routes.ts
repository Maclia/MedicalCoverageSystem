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

export default router;
