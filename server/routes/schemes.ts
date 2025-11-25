import type { Express, Request, Response } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { z } from "zod";
import { authenticate, requireRole, AuthenticatedRequest } from "../middleware/auth";
import {
  // Scheme management imports
  insertSchemeSchema,
  insertSchemeVersionSchema,
  insertPlanTierSchema,
  insertEnhancedBenefitSchema,
  insertSchemeBenefitMappingSchema,
  insertCostSharingRuleSchema,
  insertBenefitLimitSchema,
  insertCorporateSchemeConfigSchema,
  insertEmployeeGradeBenefitSchema,
  insertDependentCoverageRuleSchema,
  insertBenefitRiderSchema,
  insertMemberRiderSelectionSchema,
  insertBenefitRuleSchema,
  insertRuleExecutionLogSchema,
  // Type imports for database operations
  Scheme,
  SchemeVersion,
  PlanTier,
  EnhancedBenefit,
  SchemeBenefitMapping,
  CostSharingRule,
  BenefitLimit,
  CorporateSchemeConfig,
  EmployeeGradeBenefit,
  DependentCoverageRule,
  BenefitRider,
  MemberRiderSelection,
  BenefitRule,
  RuleExecutionLog
} from "@shared/schema";

export function registerSchemesRoutes(app: Express): void {
  // Middleware to handle zod validation errors
  const handleZodError = (error: any, res: Response) => {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: fromZodError(error).message });
    }
    return res.status(500).json({ error: "Internal server error" });
  };

  // ===== SCHEME MANAGEMENT ROUTES =====

  // Get all schemes with filtering and pagination
  app.get("/api/schemes", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const schemeType = req.query.schemeType as string;
      const targetMarket = req.query.targetMarket as string;
      const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
      const search = req.query.search as string;

      const offset = (page - 1) * limit;

      // Build query filters
      const whereConditions: any = {};
      if (schemeType) whereConditions.schemeType = schemeType;
      if (targetMarket) whereConditions.targetMarket = targetMarket;
      if (isActive !== undefined) whereConditions.isActive = isActive;
      if (search) {
        // Simple search implementation
        whereConditions.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { schemeCode: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      const schemes = await req.storage.getSchemes(whereConditions, limit, offset);
      const total = await req.storage.getSchemesCount(whereConditions);

      res.json({
        schemes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching schemes:", error);
      res.status(500).json({ error: "Failed to fetch schemes" });
    }
  });

  // Get scheme details with current version
  app.get("/api/schemes/:id", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const schemeId = parseInt(req.params.id);
      if (isNaN(schemeId)) {
        return res.status(400).json({ error: "Invalid scheme ID" });
      }

      const scheme = await req.storage.getSchemeById(schemeId);
      if (!scheme) {
        return res.status(404).json({ error: "Scheme not found" });
      }

      // Get current active version
      const currentVersion = await req.storage.getCurrentSchemeVersion(schemeId);

      // Get plan tiers
      const planTiers = await req.storage.getPlanTiersByScheme(schemeId);

      res.json({
        scheme,
        currentVersion,
        planTiers
      });
    } catch (error) {
      console.error("Error fetching scheme details:", error);
      res.status(500).json({ error: "Failed to fetch scheme details" });
    }
  });

  // Create new scheme (requires approval)
  app.post("/api/schemes", authenticate, requireRole(['insurance']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const schemeData = insertSchemeSchema.parse(req.body);

      // Add created by user
      schemeData.createdById = req.user!.id;

      const newScheme = await req.storage.createScheme(schemeData);

      // Create initial version
      const versionData = {
        schemeId: newScheme.id,
        versionNumber: "1.0",
        versionDescription: "Initial version",
        effectiveDate: new Date(),
        isActive: false,
        isDraft: true,
        createdById: req.user!.id
      };

      await req.storage.createSchemeVersion(versionData);

      res.status(201).json(newScheme);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Update scheme (creates new version)
  app.put("/api/schemes/:id", authenticate, requireRole(['insurance']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const schemeId = parseInt(req.params.id);
      if (isNaN(schemeId)) {
        return res.status(400).json({ error: "Invalid scheme ID" });
      }

      const schemeData = insertSchemeSchema.partial().parse(req.body);

      const updatedScheme = await req.storage.updateScheme(schemeId, schemeData);

      if (!updatedScheme) {
        return res.status(404).json({ error: "Scheme not found" });
      }

      res.json(updatedScheme);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Approve scheme version
  app.post("/api/schemes/:id/approve", authenticate, requireRole(['insurance']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const schemeId = parseInt(req.params.id);
      const { versionId } = req.body;

      if (!versionId) {
        return res.status(400).json({ error: "Version ID is required" });
      }

      // Update scheme version
      const updatedVersion = await req.storage.approveSchemeVersion(versionId, req.user!.id);

      if (!updatedVersion) {
        return res.status(404).json({ error: "Scheme version not found" });
      }

      res.json(updatedVersion);
    } catch (error) {
      console.error("Error approving scheme version:", error);
      res.status(500).json({ error: "Failed to approve scheme version" });
    }
  });

  // Get scheme versions
  app.get("/api/schemes/:id/versions", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const schemeId = parseInt(req.params.id);
      if (isNaN(schemeId)) {
        return res.status(400).json({ error: "Invalid scheme ID" });
      }

      const versions = await req.storage.getSchemeVersions(schemeId);
      res.json(versions);
    } catch (error) {
      console.error("Error fetching scheme versions:", error);
      res.status(500).json({ error: "Failed to fetch scheme versions" });
    }
  });

  // Create new scheme version
  app.post("/api/schemes/:id/versions", authenticate, requireRole(['insurance']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const schemeId = parseInt(req.params.id);
      if (isNaN(schemeId)) {
        return res.status(400).json({ error: "Invalid scheme ID" });
      }

      const versionData = insertSchemeVersionSchema.parse({
        ...req.body,
        schemeId,
        createdById: req.user!.id
      });

      const newVersion = await req.storage.createSchemeVersion(versionData);
      res.status(201).json(newVersion);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // ===== PLAN TIER MANAGEMENT =====

  // Get plan tiers for scheme
  app.get("/api/schemes/:schemeId/tiers", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const schemeId = parseInt(req.params.schemeId);
      if (isNaN(schemeId)) {
        return res.status(400).json({ error: "Invalid scheme ID" });
      }

      const tiers = await req.storage.getPlanTiersByScheme(schemeId);
      res.json(tiers);
    } catch (error) {
      console.error("Error fetching plan tiers:", error);
      res.status(500).json({ error: "Failed to fetch plan tiers" });
    }
  });

  // Add plan tier to scheme
  app.post("/api/schemes/:schemeId/tiers", authenticate, requireRole(['insurance']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const schemeId = parseInt(req.params.schemeId);
      if (isNaN(schemeId)) {
        return res.status(400).json({ error: "Invalid scheme ID" });
      }

      const tierData = insertPlanTierSchema.parse({
        ...req.body,
        schemeId
      });

      const newTier = await req.storage.createPlanTier(tierData);
      res.status(201).json(newTier);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Update plan tier
  app.put("/api/schemes/:schemeId/tiers/:tierId", authenticate, requireRole(['insurance']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tierId = parseInt(req.params.tierId);
      if (isNaN(tierId)) {
        return res.status(400).json({ error: "Invalid tier ID" });
      }

      const tierData = insertPlanTierSchema.partial().parse(req.body);
      const updatedTier = await req.storage.updatePlanTier(tierId, tierData);

      if (!updatedTier) {
        return res.status(404).json({ error: "Plan tier not found" });
      }

      res.json(updatedTier);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Delete plan tier
  app.delete("/api/schemes/:schemeId/tiers/:tierId", authenticate, requireRole(['insurance']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tierId = parseInt(req.params.tierId);
      if (isNaN(tierId)) {
        return res.status(400).json({ error: "Invalid tier ID" });
      }

      const deleted = await req.storage.deletePlanTier(tierId);

      if (!deleted) {
        return res.status(404).json({ error: "Plan tier not found" });
      }

      res.json({ message: "Plan tier deleted successfully" });
    } catch (error) {
      console.error("Error deleting plan tier:", error);
      res.status(500).json({ error: "Failed to delete plan tier" });
    }
  });

  // ===== BENEFIT MANAGEMENT =====

  // List enhanced benefits with hierarchy
  app.get("/api/benefits", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const category = req.query.category as string;
      const parentId = req.query.parentId ? parseInt(req.query.parentId as string) : undefined;
      const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

      const whereConditions: any = {};
      if (category) whereConditions.benefitCategory = category;
      if (parentId) whereConditions.parentId = parentId;
      if (isActive !== undefined) whereConditions.isActive = isActive;

      const benefits = await req.storage.getEnhancedBenefits(whereConditions);
      res.json(benefits);
    } catch (error) {
      console.error("Error fetching benefits:", error);
      res.status(500).json({ error: "Failed to fetch benefits" });
    }
  });

  // Create new benefit
  app.post("/api/benefits", authenticate, requireRole(['insurance']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const benefitData = insertEnhancedBenefitSchema.parse(req.body);
      const newBenefit = await req.storage.createEnhancedBenefit(benefitData);
      res.status(201).json(newBenefit);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Update benefit
  app.put("/api/benefits/:id", authenticate, requireRole(['insurance']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const benefitId = parseInt(req.params.id);
      if (isNaN(benefitId)) {
        return res.status(400).json({ error: "Invalid benefit ID" });
      }

      const benefitData = insertEnhancedBenefitSchema.partial().parse(req.body);
      const updatedBenefit = await req.storage.updateEnhancedBenefit(benefitId, benefitData);

      if (!updatedBenefit) {
        return res.status(404).json({ error: "Benefit not found" });
      }

      res.json(updatedBenefit);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Map benefits to scheme
  app.post("/api/schemes/:schemeId/benefits", authenticate, requireRole(['insurance']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const schemeId = parseInt(req.params.schemeId);
      if (isNaN(schemeId)) {
        return res.status(400).json({ error: "Invalid scheme ID" });
      }

      const mappingData = insertSchemeBenefitMappingSchema.parse({
        ...req.body,
        schemeId
      });

      const newMapping = await req.storage.createSchemeBenefitMapping(mappingData);
      res.status(201).json(newMapping);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // ===== CORPORATE CONFIGURATION =====

  // List corporate scheme configurations
  app.get("/api/corporate-configs", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : undefined;
      const schemeId = req.query.schemeId ? parseInt(req.query.schemeId as string) : undefined;

      const whereConditions: any = {};
      if (companyId) whereConditions.companyId = companyId;
      if (schemeId) whereConditions.schemeId = schemeId;

      const configs = await req.storage.getCorporateSchemeConfigs(whereConditions);
      res.json(configs);
    } catch (error) {
      console.error("Error fetching corporate configs:", error);
      res.status(500).json({ error: "Failed to fetch corporate configs" });
    }
  });

  // Configure scheme for company
  app.post("/api/companies/:companyId/schemes", authenticate, requireRole(['insurance']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.companyId);
      if (isNaN(companyId)) {
        return res.status(400).json({ error: "Invalid company ID" });
      }

      const configData = insertCorporateSchemeConfigSchema.parse({
        ...req.body,
        companyId,
        approvedById: req.user!.id
      });

      const newConfig = await req.storage.createCorporateSchemeConfig(configData);
      res.status(201).json(newConfig);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Configure employee grade benefits
  app.post("/api/companies/:companyId/grades", authenticate, requireRole(['insurance']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.companyId);
      if (isNaN(companyId)) {
        return res.status(400).json({ error: "Invalid company ID" });
      }

      // First need to get or create corporate config
      const corporateConfig = await req.storage.getOrCreateCorporateConfig(companyId, req.body.schemeId);

      const gradeBenefitData = insertEmployeeGradeBenefitSchema.parse({
        ...req.body,
        corporateConfigId: corporateConfig.id
      });

      const newGradeBenefit = await req.storage.createEmployeeGradeBenefit(gradeBenefitData);
      res.status(201).json(newGradeBenefit);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Update corporate configuration
  app.put("/api/corporate-configs/:id", authenticate, requireRole(['insurance']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const configId = parseInt(req.params.id);
      if (isNaN(configId)) {
        return res.status(400).json({ error: "Invalid config ID" });
      }

      const configData = insertCorporateSchemeConfigSchema.partial().parse(req.body);
      const updatedConfig = await req.storage.updateCorporateSchemeConfig(configId, configData);

      if (!updatedConfig) {
        return res.status(404).json({ error: "Corporate config not found" });
      }

      res.json(updatedConfig);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // ===== RULES ENGINE =====

  // List benefit rules with filtering
  app.get("/api/rules", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const category = req.query.category as string;
      const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

      const whereConditions: any = {};
      if (category) whereConditions.ruleCategory = category;
      if (isActive !== undefined) whereConditions.isActive = isActive;

      const rules = await req.storage.getBenefitRules(whereConditions);
      res.json(rules);
    } catch (error) {
      console.error("Error fetching benefit rules:", error);
      res.status(500).json({ error: "Failed to fetch benefit rules" });
    }
  });

  // Create new benefit rule
  app.post("/api/rules", authenticate, requireRole(['insurance']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ruleData = insertBenefitRuleSchema.parse({
        ...req.body,
        createdById: req.user!.id
      });

      const newRule = await req.storage.createBenefitRule(ruleData);
      res.status(201).json(newRule);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Update benefit rule
  app.put("/api/rules/:id", authenticate, requireRole(['insurance']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ruleId = parseInt(req.params.id);
      if (isNaN(ruleId)) {
        return res.status(400).json({ error: "Invalid rule ID" });
      }

      const ruleData = insertBenefitRuleSchema.partial().parse(req.body);
      const updatedRule = await req.storage.updateBenefitRule(ruleId, ruleData);

      if (!updatedRule) {
        return res.status(404).json({ error: "Benefit rule not found" });
      }

      res.json(updatedRule);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Test rule against sample data
  app.post("/api/rules/validate", authenticate, requireRole(['insurance']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ruleId, testData } = req.body;

      if (!ruleId || !testData) {
        return res.status(400).json({ error: "Rule ID and test data are required" });
      }

      // Get the rule
      const rule = await req.storage.getBenefitRuleById(parseInt(ruleId));
      if (!rule) {
        return res.status(404).json({ error: "Benefit rule not found" });
      }

      // Execute rule against test data (this would be implemented in the rules engine service)
      const result = await req.storage.testRule(rule, testData);

      res.json(result);
    } catch (error) {
      console.error("Error testing rule:", error);
      res.status(500).json({ error: "Failed to test rule" });
    }
  });

  // Get rule execution logs
  app.get("/api/rules/execution-logs", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const claimId = req.query.claimId ? parseInt(req.query.claimId as string) : undefined;
      const memberId = req.query.memberId ? parseInt(req.query.memberId as string) : undefined;
      const ruleId = req.query.ruleId ? parseInt(req.query.ruleId as string) : undefined;
      const result = req.query.result as string;
      const limit = parseInt(req.query.limit as string) || 50;

      const whereConditions: any = {};
      if (claimId) whereConditions.claimId = claimId;
      if (memberId) whereConditions.memberId = memberId;
      if (ruleId) whereConditions.ruleId = ruleId;
      if (result) whereConditions.result = result;

      const logs = await req.storage.getRuleExecutionLogs(whereConditions, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching rule execution logs:", error);
      res.status(500).json({ error: "Failed to fetch rule execution logs" });
    }
  });

  // ===== CLAIMS ADJUDICATION INTEGRATION =====

  // Run enhanced adjudication with new rules engine
  app.post("/api/claims/:claimId/adjudicate", authenticate, requireRole(['insurance', 'institution']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const claimId = parseInt(req.params.claimId);
      if (isNaN(claimId)) {
        return res.status(400).json({ error: "Invalid claim ID" });
      }

      // Run enhanced adjudication (this would call the new enhanced adjudication service)
      const adjudicationResult = await req.storage.runEnhancedClaimsAdjudication(claimId, req.user!.id);

      res.json(adjudicationResult);
    } catch (error) {
      console.error("Error running enhanced claims adjudication:", error);
      res.status(500).json({ error: "Failed to run enhanced claims adjudication" });
    }
  });

  // Get detailed rule execution results for claim
  app.get("/api/claims/:claimId/rule-results", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const claimId = parseInt(req.params.claimId);
      if (isNaN(claimId)) {
        return res.status(400).json({ error: "Invalid claim ID" });
      }

      const ruleResults = await req.storage.getClaimRuleResults(claimId);
      res.json(ruleResults);
    } catch (error) {
      console.error("Error fetching claim rule results:", error);
      res.status(500).json({ error: "Failed to fetch claim rule results" });
    }
  });
}