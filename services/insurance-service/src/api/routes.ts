import { Router } from 'express';
import { BenefitsController } from './benefitsController.js';
import { SchemesController } from './schemesController.js';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'insurance-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Benefits routes
router.get('/benefits', BenefitsController.getBenefits);
router.get('/benefits/categories', BenefitsController.getBenefitCategories);
router.get('/benefits/popular', BenefitsController.getPopularBenefits);
router.get('/benefits/:id', BenefitsController.getBenefit);
router.post('/benefits', BenefitsController.createBenefit);
router.put('/benefits/:id', BenefitsController.updateBenefit);
router.delete('/benefits/:id', BenefitsController.deleteBenefit);

// Company Benefits routes
import { companyBenefitService } from '../services/CompanyBenefitService.js';
router.get('/company-benefits', (req, res) => companyBenefitService.listCompanyBenefits(req.query, req.correlationId).then(result => res.json(result)));
router.post('/company-benefits', (req, res) => companyBenefitService.createCompanyBenefit(req.body, req.correlationId).then(result => res.status(result.success ? 201 : 400).json(result)));

// Schemes routes
router.get('/schemes', SchemesController.getSchemes);
router.get('/schemes/:id', SchemesController.getScheme);
router.post('/schemes', SchemesController.createScheme);
router.put('/schemes/:id', SchemesController.updateScheme);
router.delete('/schemes/:id', SchemesController.deleteScheme);

export default router;