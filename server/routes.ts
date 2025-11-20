import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertCompanySchema,
  insertPrincipalMemberSchema,
  insertDependentMemberSchema,
  insertPeriodSchema,
  insertPremiumRateSchema,
  insertPremiumSchema,
  insertBenefitSchema,
  insertCompanyBenefitSchema,
  insertCompanyPeriodSchema,
  insertRegionSchema,
  insertMedicalInstitutionSchema,
  insertMedicalPersonnelSchema,
  insertPanelDocumentationSchema,
  insertClaimSchema,
  insertPremiumPaymentSchema,
  insertClaimPaymentSchema,
  insertProviderDisbursementSchema,
  insertDisbursementItemSchema,
  insertInsuranceBalanceSchema,
  insertMedicalProcedureSchema,
  insertProviderProcedureRateSchema,
  insertClaimProcedureItemSchema,
  insertDiagnosisCodeSchema,
  insertUserSchema,
  insertOnboardingSessionSchema,
  insertOnboardingTaskSchema,
  insertMemberDocumentSchema,
  insertOnboardingPreferenceSchema,
  insertActivationTokenSchema,
  insertMemberPreferenceSchema,
  insertBehaviorAnalyticSchema,
  insertPersonalizationScoreSchema,
  insertJourneyStageSchema,
  insertRecommendationHistorySchema
} from "@shared/schema";
import { authenticateUser, logoutUser, refreshUserToken } from "./auth";
import { authenticate, requireRole, requireOwnership, AuthenticatedRequest } from "./middleware/auth";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import * as premiumCalculator from "./utils/premiumCalculator";
import { addDays, differenceInYears, parseISO } from "date-fns";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware to handle zod validation errors
  const validateRequest = (schema: any) => (req: Request, res: Response, next: Function) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  };

  // Authentication validation schemas
  const loginSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    userType: z.enum(["insurance", "institution", "provider"], {
      required_error: "User type is required",
      invalid_type_error: "User type must be insurance, institution, or provider"
    })
  });

  const refreshSchema = z.object({
    refreshToken: z.string().min(1, "Refresh token is required")
  });

  const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email format"),
    userType: z.enum(["insurance", "institution", "provider"], {
      required_error: "User type is required",
      invalid_type_error: "User type must be insurance, institution, or provider"
    })
  });

  const resetPasswordSchema = z.object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters")
  });

  // Authentication Routes
  app.post("/api/auth/login", validateRequest(loginSchema), async (req, res) => {
    try {
      const { email, password, userType } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      const tokens = await authenticateUser(email, password, userType);

      // Store IP and user agent for security
      if (tokens.user) {
        console.log(`User logged in: ${email} (${userType}) from ${ipAddress}`);
      }

      res.json({
        success: true,
        data: {
          ...tokens,
          ipAddress,
          userAgent
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      res.status(401).json({ error: errorMessage });
    }
  });

  app.post("/api/auth/refresh", validateRequest(refreshSchema), async (req, res) => {
    try {
      const { refreshToken } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      const tokens = await refreshUserToken(refreshToken);

      res.json({
        success: true,
        data: {
          ...tokens,
          ipAddress,
          userAgent
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
      res.status(401).json({ error: errorMessage });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(400).json({ error: 'Refresh token required for logout' });
      }

      const refreshToken = authHeader.substring(7);
      await logoutUser(refreshToken);

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      res.status(500).json({ error: errorMessage });
    }
  });

  app.get("/api/auth/profile", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get full user profile with entity data
      const userRecord = await storage.getUser(req.user.userId);
      if (!userRecord) {
        return res.status(404).json({ error: 'User not found' });
      }

      let entityData = null;
      switch (req.user.userType) {
        case 'insurance':
          const companiesData = await storage.getCompany(req.user.entityId);
          entityData = companiesData || null;
          break;
        case 'institution':
          const institutionsData = await storage.getMedicalInstitution(req.user.entityId);
          entityData = institutionsData || null;
          break;
        case 'provider':
          const personnelData = await storage.getMedicalPersonnel(req.user.entityId);
          entityData = personnelData || null;
          break;
      }

      const profile = {
        ...userRecord,
        entityData,
        permissions: getPermissionsForRole(req.user.userType)
      };

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile fetch failed';
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/auth/forgot-password", validateRequest(forgotPasswordSchema), async (req, res) => {
    try {
      const { email, userType } = req.body;

      // In a real implementation, you would:
      // 1. Generate a reset token
      // 2. Store it in the database with expiry
      // 3. Send an email with reset link
      // For now, we'll just return a success message
      res.json({
        success: true,
        message: 'Password reset link sent to your email address'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/auth/reset-password", validateRequest(resetPasswordSchema), async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      // In a real implementation, you would:
      // 1. Validate the reset token
      // 2. Check if it's expired
      // 3. Update the user's password
      // 4. Invalidate the reset token
      // For now, we'll just return a success message
      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Helper function to get permissions based on user role
  function getPermissionsForRole(userType: string) {
    switch (userType) {
      case 'insurance':
        return [
          'view_company',
          'edit_company',
          'view_members',
          'manage_members',
          'view_premiums',
          'view_benefits',
          'view_claims'
        ];
      case 'institution':
        return [
          'view_institution',
          'edit_institution',
          'view_personnel',
          'manage_personnel',
          'view_institution_claims'
        ];
      case 'provider':
        return [
          'view_profile',
          'edit_profile',
          'submit_claims',
          'view_own_claims',
          'view_institution_info'
        ];
      default:
        return [];
    }
  }

  // API Routes
  // Companies - Protected routes
  app.get("/api/companies", authenticate, requireRole(['insurance']), async (req: AuthenticatedRequest, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  app.get("/api/companies/:id",
    authenticate,
    requireRole(['insurance']),
    requireOwnership((user, resourceId) => user.entityId === parseInt(resourceId)),
    async (req: AuthenticatedRequest, res) => {
      try {
        const company = await storage.getCompany(Number(req.params.id));
        if (!company) {
          return res.status(404).json({ error: "Company not found" });
        }
        res.json(company);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch company" });
      }
    }
  );

  app.post("/api/companies",
    authenticate,
    requireRole(['insurance']),
    validateRequest(insertCompanySchema),
    async (req: AuthenticatedRequest, res) => {
      try {
        const company = await storage.createCompany(req.body);
        res.status(201).json(company);
      } catch (error) {
        res.status(500).json({ error: "Failed to create company" });
      }
    }
  );

  // Members - Protected routes
  app.get("/api/members",
    authenticate,
    requireRole(['insurance']),
    async (req: AuthenticatedRequest, res) => {
      try {
        let members;
        if (req.query.companyId) {
          // Only allow access to own company members
          if (Number(req.query.companyId) !== req.user!.entityId) {
            return res.status(403).json({ error: "Access denied - can only view your own company's members" });
          }
          members = await storage.getMembersByCompany(Number(req.query.companyId));
        } else {
          members = await storage.getMembers();
        }
        res.json(members);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch members" });
      }
    }
  );
  
  // Add endpoint for getting members by company ID in URL path
  app.get("/api/members/company/:companyId", async (req, res) => {
    try {
      const companyId = Number(req.params.companyId);
      if (isNaN(companyId)) {
        return res.status(400).json({ error: "Invalid company ID" });
      }
      
      const members = await storage.getMembersByCompany(companyId);
      
      // Get company details for reference
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      
      // Enhance members with company and dependent information
      const enhancedMembers = await Promise.all(
        members.map(async (member) => {
          const result = { 
            ...member,
            companyName: company.name 
          };
          
          // If this is a principal member, count the dependents
          if (member.memberType === 'principal') {
            const dependents = await storage.getDependentsByPrincipal(member.id);
            return {
              ...result,
              dependentCount: dependents.length
            };
          }
          
          // If this is a dependent, get principal info
          if (member.memberType === 'dependent' && member.principalId) {
            const principal = await storage.getMember(member.principalId);
            return {
              ...result,
              principalName: principal ? `${principal.firstName} ${principal.lastName}` : 'Unknown'
            };
          }
          
          return result;
        })
      );
      
      res.json(enhancedMembers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch member" });
    }
  });

  app.get("/api/members/principal", async (req, res) => {
    try {
      let members;
      if (req.query.companyId) {
        members = await storage.getPrincipalMembersByCompany(Number(req.query.companyId));
      } else {
        members = await storage.getPrincipalMembers();
      }
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch principal members" });
    }
  });

  app.get("/api/members/:id", async (req, res) => {
    try {
      const member = await storage.getMember(Number(req.params.id));
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }
      res.json(member);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch member" });
    }
  });

  app.get("/api/members/:id/dependents", async (req, res) => {
    try {
      const dependents = await storage.getDependentsByPrincipal(Number(req.params.id));
      res.json(dependents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dependents" });
    }
  });

  app.post("/api/members/principal", validateRequest(insertPrincipalMemberSchema), async (req, res) => {
    try {
      console.log("Creating principal member:", req.body);
      // Create the principal member
      const member = await storage.createMember(req.body);
      console.log("Principal member created:", member);
      
      // Get the active period
      const activePeriod = await storage.getActivePeriod();
      console.log("Active period:", activePeriod);
      
      if (activePeriod) {
        try {
          // Check if premium already exists for this company and period
          const companyPremiums = await storage.getPremiumsByCompany(member.companyId);
          const existingPremium = companyPremiums.find(p => p.periodId === activePeriod.id);
          
          if (!existingPremium) {
            // Calculate premium for the company automatically
            
            // Get premium rates for the period
            const rates = await storage.getPremiumRateByPeriod(activePeriod.id);
            if (rates) {
              // Get all members for the company
              const companyMembers = await storage.getMembersByCompany(member.companyId);
              
              // Count member types
              const principalCount = companyMembers.filter(m => m.memberType === 'principal').length;
              const spouseCount = companyMembers.filter(m => 
                m.memberType === 'dependent' && m.dependentType === 'spouse'
              ).length;
              const childCount = companyMembers.filter(m => 
                m.memberType === 'dependent' && m.dependentType === 'child' && !m.hasDisability
              ).length;
              const specialNeedsCount = companyMembers.filter(m => 
                m.memberType === 'dependent' && m.dependentType === 'child' && m.hasDisability
              ).length;
              
              // Calculate premium components
              const subtotal = 
                principalCount * rates.principalRate +
                spouseCount * rates.spouseRate +
                childCount * rates.childRate +
                specialNeedsCount * rates.specialNeedsRate;
              
              const tax = subtotal * rates.taxRate;
              const total = subtotal + tax;
              
              // Create a new premium
              await storage.createPremium({
                companyId: member.companyId,
                periodId: activePeriod.id,
                principalCount,
                spouseCount,
                childCount,
                specialNeedsCount,
                subtotal,
                tax,
                total,
                status: 'active',
                issuedDate: new Date(),
                paidDate: null,
                notes: 'Automatically generated upon member creation'
              });
            }
          } else {
            // Premium exists, recalculate it
            // Get premium rates for the period
            const rates = await storage.getPremiumRateByPeriod(activePeriod.id);
            if (rates) {
              // Get all members for the company
              const companyMembers = await storage.getMembersByCompany(member.companyId);
              
              // Count member types
              const principalCount = companyMembers.filter(m => m.memberType === 'principal').length;
              const spouseCount = companyMembers.filter(m => 
                m.memberType === 'dependent' && m.dependentType === 'spouse'
              ).length;
              const childCount = companyMembers.filter(m => 
                m.memberType === 'dependent' && m.dependentType === 'child' && !m.hasDisability
              ).length;
              const specialNeedsCount = companyMembers.filter(m => 
                m.memberType === 'dependent' && m.dependentType === 'child' && m.hasDisability
              ).length;
              
              // Calculate premium components
              const subtotal = 
                principalCount * rates.principalRate +
                spouseCount * rates.spouseRate +
                childCount * rates.childRate +
                specialNeedsCount * rates.specialNeedsRate;
              
              const tax = subtotal * rates.taxRate;
              const total = subtotal + tax;
              
              // Update the existing premium
              // Note: In a real system, we would have an updatePremium method
              // For now, we're creating a new premium entry to simulate an update
              await storage.createPremium({
                companyId: member.companyId,
                periodId: activePeriod.id,
                principalCount,
                spouseCount,
                childCount,
                specialNeedsCount,
                subtotal,
                tax,
                total,
                status: existingPremium.status,
                issuedDate: existingPremium.issuedDate,
                paidDate: existingPremium.paidDate,
                notes: 'Updated automatically upon member creation'
              });
            }
          }
        } catch (calcError) {
          console.error("Failed to calculate premium:", calcError);
          // We don't want the member creation to fail if premium calculation fails
          // So we continue without throwing an error
        }
      }
      
      res.status(201).json(member);
    } catch (error) {
      res.status(500).json({ error: "Failed to create principal member" });
    }
  });

  app.post("/api/members/dependent", async (req, res) => {
    try {
      // Custom validation for dependent age requirements
      const validatedData = insertDependentMemberSchema.parse(req.body);
      
      const dateOfBirth = parseISO(validatedData.dateOfBirth);
      const today = new Date();
      const age = differenceInYears(today, dateOfBirth);
      
      // Age validation rules
      if (validatedData.dependentType === 'spouse' && age < 18) {
        return res.status(400).json({ error: "Spouse must be at least 18 years old" });
      }
      
      if (validatedData.dependentType === 'child' && age > 18 && !validatedData.hasDisability) {
        return res.status(400).json({ error: "Child must be 18 years or younger unless they have a disability" });
      }
      
      if (validatedData.dependentType === 'child' && dateOfBirth > today) {
        return res.status(400).json({ error: "Date of birth cannot be in the future" });
      }
      
      // Validate minimum age of 1 day for child
      const oneDayAgo = addDays(new Date(), -1);
      if (validatedData.dependentType === 'child' && dateOfBirth > oneDayAgo) {
        return res.status(400).json({ error: "Child must be at least 1 day old" });
      }
      
      // Check if principal member exists
      const principal = await storage.getMember(validatedData.principalId);
      if (!principal || principal.memberType !== 'principal') {
        return res.status(404).json({ error: "Principal member not found" });
      }
      
      // Make sure the dependent is associated with the same company as the principal
      validatedData.companyId = principal.companyId;
      
      // Create the dependent member
      const member = await storage.createMember(validatedData);
      
      // Update premium calculation after dependent creation
      // Get the active period
      const activePeriod = await storage.getActivePeriod();
      if (activePeriod) {
        try {
          // Check if premium already exists for this company and period
          const companyPremiums = await storage.getPremiumsByCompany(member.companyId);
          const existingPremium = companyPremiums.find(p => p.periodId === activePeriod.id);
          
          // Get premium rates for the period
          const rates = await storage.getPremiumRateByPeriod(activePeriod.id);
          if (rates) {
            // Get all members for the company
            const companyMembers = await storage.getMembersByCompany(member.companyId);
            
            // Count member types
            const principalCount = companyMembers.filter(m => m.memberType === 'principal').length;
            const spouseCount = companyMembers.filter(m => 
              m.memberType === 'dependent' && m.dependentType === 'spouse'
            ).length;
            const childCount = companyMembers.filter(m => 
              m.memberType === 'dependent' && m.dependentType === 'child' && !m.hasDisability
            ).length;
            const specialNeedsCount = companyMembers.filter(m => 
              m.memberType === 'dependent' && m.dependentType === 'child' && m.hasDisability
            ).length;
            
            // Calculate premium components
            const subtotal = 
              principalCount * rates.principalRate +
              spouseCount * rates.spouseRate +
              childCount * rates.childRate +
              specialNeedsCount * rates.specialNeedsRate;
            
            const tax = subtotal * rates.taxRate;
            const total = subtotal + tax;
            
            if (existingPremium) {
              // Update the existing premium
              // Note: In a real system, we would have an updatePremium method
              // For now, we're creating a new premium entry to simulate an update
              await storage.createPremium({
                companyId: member.companyId,
                periodId: activePeriod.id,
                principalCount,
                spouseCount,
                childCount,
                specialNeedsCount,
                subtotal,
                tax,
                total,
                status: existingPremium.status,
                issuedDate: existingPremium.issuedDate,
                paidDate: existingPremium.paidDate,
                notes: 'Updated automatically upon dependent creation'
              });
            } else {
              // Create a new premium if it doesn't exist
              await storage.createPremium({
                companyId: member.companyId,
                periodId: activePeriod.id,
                principalCount,
                spouseCount,
                childCount,
                specialNeedsCount,
                subtotal,
                tax,
                total,
                status: 'active',
                issuedDate: new Date(),
                paidDate: null,
                notes: 'Automatically generated upon dependent creation'
              });
            }
          }
        } catch (calcError) {
          console.error("Failed to calculate premium for dependent:", calcError);
          // We don't want the dependent creation to fail if premium calculation fails
          // So we continue without throwing an error
        }
      }
      
      res.status(201).json(member);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Failed to create dependent member" });
      }
    }
  });
  
  // Delete a member
  app.delete("/api/members/:id", async (req, res) => {
    try {
      if (!storage.deleteMember) {
        return res.status(501).json({ error: 'Member deletion is not supported by the current storage implementation' });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid member ID' });
      }
      
      // Get member before deletion for premium recalculation
      const member = await storage.getMember(id);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
      
      // Check if member has any claims
      const memberClaims = await storage.getClaimsByMember(id);
      if (memberClaims && memberClaims.length > 0) {
        return res.status(400).json({ 
          error: `Cannot delete member with ID ${id} as they have ${memberClaims.length} active claim(s)`,
          claims: memberClaims
        });
      }
      
      // For principal members, check if they have dependents
      if (member.memberType === 'principal') {
        const dependents = await storage.getDependentsByPrincipal(id);
        if (dependents && dependents.length > 0) {
          return res.status(400).json({ 
            error: `Cannot delete principal member with ID ${id} as they have ${dependents.length} dependent(s). Delete dependents first.`,
            dependents: dependents
          });
        }
      }
      
      // Store company ID for premium recalculation
      const companyId = member.companyId;
      
      // Delete the member
      const deletedMember = await storage.deleteMember(id);
      if (!deletedMember) {
        return res.status(404).json({ error: 'Member not found or could not be deleted' });
      }
      
      // Recalculate premiums after member deletion
      try {
        const premium = await premiumCalculator.calculatePremiumAdjustmentForMemberDeletion(
          storage, 
          companyId,
          member
        );
        
        if (premium) {
          // Create the premium adjustment
          const newPremium = await storage.createPremium(premium);
          console.log('Premium recalculated after member deletion:', newPremium);
        }
      } catch (premiumError) {
        console.error('Error recalculating premium after member deletion:', premiumError);
        // We don't fail the request if premium recalculation fails, but we log it
      }
      
      res.json({ 
        message: 'Member deleted successfully',
        member: deletedMember
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: `Failed to delete member: ${errorMessage}` });
    }
  });

  // Periods
  app.get("/api/periods", async (req, res) => {
    try {
      console.log('GET /api/periods: Calling storage.getPeriods()');
      console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
      console.log('Storage implementation type:', storage.constructor.name);
      const periods = await storage.getPeriods();
      console.log('Periods fetched successfully:', periods.length);
      res.json(periods);
    } catch (error) {
      console.error('Error fetching periods:', error);
      res.status(500).json({ error: "Failed to fetch periods", details: error.message });
    }
  });

  app.get("/api/periods/active", async (req, res) => {
    try {
      console.log('GET /api/periods/active: Calling storage.getActivePeriod()');
      console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
      console.log('Storage implementation type:', storage.constructor.name);
      const period = await storage.getActivePeriod();
      console.log('Active period fetched:', period ? 'found' : 'not found');
      if (!period) {
        return res.status(404).json({ error: "No active period found" });
      }
      res.json(period);
    } catch (error) {
      console.error('Error fetching active period:', error);
      res.status(500).json({ error: "Failed to fetch active period", details: error.message });
    }
  });

  app.get("/api/periods/:id", async (req, res) => {
    try {
      const period = await storage.getPeriod(Number(req.params.id));
      if (!period) {
        return res.status(404).json({ error: "Period not found" });
      }
      res.json(period);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch period" });
    }
  });

  app.post("/api/periods", validateRequest(insertPeriodSchema), async (req, res) => {
    try {
      const period = await storage.createPeriod(req.body);
      res.status(201).json(period);
    } catch (error) {
      res.status(500).json({ error: "Failed to create period" });
    }
  });

  // Premium Rates
  app.get("/api/premium-rates", async (req, res) => {
    try {
      const rates = await storage.getPremiumRates();
      res.json(rates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch premium rates" });
    }
  });

  app.get("/api/premium-rates/period/:periodId", async (req, res) => {
    try {
      const rate = await storage.getPremiumRateByPeriod(Number(req.params.periodId));
      if (!rate) {
        return res.status(404).json({ error: "Premium rate not found for this period" });
      }
      res.json(rate);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch premium rate" });
    }
  });

  app.post("/api/premium-rates", validateRequest(insertPremiumRateSchema), async (req, res) => {
    try {
      const rate = await storage.createPremiumRate(req.body);
      res.status(201).json(rate);
    } catch (error) {
      res.status(500).json({ error: "Failed to create premium rate" });
    }
  });

  // Premiums
  app.get("/api/premiums", async (req, res) => {
    try {
      let premiums;
      if (req.query.companyId) {
        premiums = await storage.getPremiumsByCompany(Number(req.query.companyId));
      } else if (req.query.periodId) {
        premiums = await storage.getPremiumsByPeriod(Number(req.query.periodId));
      } else {
        premiums = await storage.getPremiums();
      }
      res.json(premiums);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch premiums" });
    }
  });
  
  // Add endpoint for getting premiums by company ID in URL path
  app.get("/api/premiums/company/:companyId", async (req, res) => {
    try {
      const companyId = Number(req.params.companyId);
      if (isNaN(companyId)) {
        return res.status(400).json({ error: "Invalid company ID" });
      }
      
      const premiums = await storage.getPremiumsByCompany(companyId);
      
      // Enhance premiums with period data
      const enhancedPremiums = await Promise.all(
        premiums.map(async (premium) => {
          const period = await storage.getPeriod(premium.periodId);
          
          return {
            ...premium,
            periodName: period?.name,
            periodStartDate: period?.startDate,
            periodEndDate: period?.endDate,
            periodStatus: period?.status
          };
        })
      );
      
      res.json(enhancedPremiums);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch premium" });
    }
  });

  app.get("/api/premiums/:id", async (req, res) => {
    try {
      const premium = await storage.getPremium(Number(req.params.id));
      if (!premium) {
        return res.status(404).json({ error: "Premium not found" });
      }
      res.json(premium);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch premium" });
    }
  });

  app.post("/api/premiums", validateRequest(insertPremiumSchema), async (req, res) => {
    try {
      const premium = await storage.createPremium(req.body);
      res.status(201).json(premium);
    } catch (error) {
      res.status(500).json({ error: "Failed to create premium" });
    }
  });

  // Premium calculation
  app.post("/api/premiums/calculate", async (req, res) => {
    try {
      const { companyId, periodId } = req.body;
      
      if (!companyId || !periodId) {
        return res.status(400).json({ error: "Company ID and Period ID are required" });
      }
      
      // Verify company exists
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      
      // Verify period exists
      const period = await storage.getPeriod(periodId);
      if (!period) {
        return res.status(404).json({ error: "Period not found" });
      }
      
      // Get premium rates for the period
      const rates = await storage.getPremiumRateByPeriod(periodId);
      if (!rates) {
        return res.status(404).json({ error: "Premium rates not found for this period" });
      }
      
      // Get all members for the company
      const members = await storage.getMembersByCompany(companyId);
      
      // Count member types
      const principalCount = members.filter(m => m.memberType === 'principal').length;
      const spouseCount = members.filter(m => m.memberType === 'dependent' && m.dependentType === 'spouse').length;
      const childCount = members.filter(m => 
        m.memberType === 'dependent' && 
        m.dependentType === 'child' && 
        !m.hasDisability
      ).length;
      const specialNeedsCount = members.filter(m => 
        m.memberType === 'dependent' && 
        m.dependentType === 'child' && 
        m.hasDisability
      ).length;
      
      // Calculate subtotal
      const subtotal = 
        principalCount * rates.principalRate +
        spouseCount * rates.spouseRate +
        childCount * rates.childRate +
        specialNeedsCount * rates.specialNeedsRate;
      
      // Calculate tax
      const tax = subtotal * rates.taxRate;
      
      // Calculate total
      const total = subtotal + tax;
      
      const calculationResult = {
        companyId,
        periodId,
        principalCount,
        spouseCount,
        childCount,
        specialNeedsCount,
        subtotal,
        tax,
        total,
        rates: {
          principalRate: rates.principalRate,
          spouseRate: rates.spouseRate,
          childRate: rates.childRate,
          specialNeedsRate: rates.specialNeedsRate,
          taxRate: rates.taxRate
        }
      };
      
      res.json(calculationResult);
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate premium" });
    }
  });

  // Dashboard statistics
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      const members = await storage.getMembers();
      const principalMembers = members.filter(m => m.memberType === 'principal');
      const dependents = members.filter(m => m.memberType === 'dependent');
      const premiums = await storage.getPremiums();
      const benefits = await storage.getBenefits();
      
      const activePeriod = await storage.getActivePeriod();
      
      // Calculate total premium value
      const totalPremiumValue = premiums.reduce((total, premium) => total + premium.total, 0);
      
      // Get recent registrations (both companies and members)
      const recentMembers = [...members]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      
      // Format recent registrations
      const recentRegistrations = await Promise.all(
        recentMembers.map(async (member) => {
          const company = await storage.getCompany(member.companyId);
          let principalMember;
          
          if (member.memberType === 'dependent' && member.principalId) {
            principalMember = await storage.getMember(member.principalId);
          }
          
          return {
            id: member.id,
            companyId: member.companyId,
            companyName: company?.name || "Unknown Company",
            memberName: `${member.firstName} ${member.lastName}`,
            memberEmail: member.email,
            memberType: member.memberType,
            dependentType: member.dependentType,
            principalName: principalMember ? `${principalMember.firstName} ${principalMember.lastName}` : null,
            createdAt: member.createdAt
          };
        })
      );
      
      const stats = {
        totalCompanies: companies.length,
        principalMembers: principalMembers.length,
        dependents: dependents.length,
        activePremiums: totalPremiumValue,
        totalBenefits: benefits.length,
        activePeriod,
        recentRegistrations
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
  });

  // Benefits
  app.get("/api/benefits", async (req, res) => {
    try {
      let benefits;
      if (req.query.category) {
        benefits = await storage.getBenefitsByCategory(req.query.category as string);
      } else if (req.query.standard === 'true') {
        benefits = await storage.getStandardBenefits();
      } else {
        benefits = await storage.getBenefits();
      }
      res.json(benefits);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch benefits" });
    }
  });

  app.get("/api/benefits/:id", async (req, res) => {
    try {
      const benefit = await storage.getBenefit(Number(req.params.id));
      if (!benefit) {
        return res.status(404).json({ error: "Benefit not found" });
      }
      res.json(benefit);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch benefit" });
    }
  });

  app.post("/api/benefits", validateRequest(insertBenefitSchema), async (req, res) => {
    try {
      const benefit = await storage.createBenefit(req.body);
      res.status(201).json(benefit);
    } catch (error) {
      res.status(500).json({ error: "Failed to create benefit" });
    }
  });

  // Company Benefits
  app.get("/api/company-benefits", async (req, res) => {
    try {
      let companyBenefits;
      if (req.query.companyId) {
        companyBenefits = await storage.getCompanyBenefitsByCompany(Number(req.query.companyId));
      } else if (req.query.premiumId) {
        companyBenefits = await storage.getCompanyBenefitsByPremium(Number(req.query.premiumId));
      } else {
        companyBenefits = await storage.getCompanyBenefits();
      }
      
      // Enhance company benefits with related data
      const enhancedCompanyBenefits = await Promise.all(
        companyBenefits.map(async (cb) => {
          const benefit = await storage.getBenefit(cb.benefitId);
          const company = await storage.getCompany(cb.companyId);
          const premium = await storage.getPremium(cb.premiumId);
          
          return {
            ...cb,
            benefitName: benefit?.name,
            benefitCategory: benefit?.category,
            companyName: company?.name,
            premiumPeriodId: premium?.periodId
          };
        })
      );
      
      res.json(enhancedCompanyBenefits);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company benefits" });
    }
  });
  
  // Add endpoint for getting company benefits by company ID in URL path
  app.get("/api/company-benefits/company/:companyId", async (req, res) => {
    try {
      const companyId = Number(req.params.companyId);
      if (isNaN(companyId)) {
        return res.status(400).json({ error: "Invalid company ID" });
      }
      
      const companyBenefits = await storage.getCompanyBenefitsByCompany(companyId);
      
      // Enhance company benefits with related data
      const enhancedCompanyBenefits = await Promise.all(
        companyBenefits.map(async (cb) => {
          const benefit = await storage.getBenefit(cb.benefitId);
          
          return {
            ...cb,
            benefitName: benefit?.name,
            benefitDescription: benefit?.description,
            benefitCategory: benefit?.category,
            coverageDetails: benefit?.coverageDetails,
            limitAmount: benefit?.limitAmount
          };
        })
      );
      
      res.json(enhancedCompanyBenefits);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company benefits" });
    }
  });

  app.get("/api/company-benefits/:id", async (req, res) => {
    try {
      const companyBenefit = await storage.getCompanyBenefit(Number(req.params.id));
      if (!companyBenefit) {
        return res.status(404).json({ error: "Company benefit not found" });
      }
      
      // Get related data
      const benefit = await storage.getBenefit(companyBenefit.benefitId);
      const company = await storage.getCompany(companyBenefit.companyId);
      const premium = await storage.getPremium(companyBenefit.premiumId);
      
      const enhancedCompanyBenefit = {
        ...companyBenefit,
        benefitDetails: benefit,
        companyName: company?.name,
        premiumDetails: premium
      };
      
      res.json(enhancedCompanyBenefit);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company benefit" });
    }
  });

  app.post("/api/company-benefits", validateRequest(insertCompanyBenefitSchema), async (req, res) => {
    try {
      // Verify if benefit exists
      const benefit = await storage.getBenefit(req.body.benefitId);
      if (!benefit) {
        return res.status(404).json({ error: "Benefit not found" });
      }
      
      // Verify if company exists
      const company = await storage.getCompany(req.body.companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      
      // Verify if premium exists
      const premium = await storage.getPremium(req.body.premiumId);
      if (!premium) {
        return res.status(404).json({ error: "Premium not found" });
      }
      
      // Create company benefit
      const companyBenefit = await storage.createCompanyBenefit(req.body);
      res.status(201).json(companyBenefit);
    } catch (error) {
      res.status(500).json({ error: "Failed to create company benefit" });
    }
  });

  // Region routes
  app.get("/api/regions", async (req, res) => {
    try {
      const regions = await storage.getRegions();
      res.json(regions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch regions" });
    }
  });

  app.get("/api/regions/:id", async (req, res) => {
    try {
      const region = await storage.getRegion(Number(req.params.id));
      if (!region) {
        return res.status(404).json({ error: "Region not found" });
      }
      res.json(region);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch region" });
    }
  });

  app.post("/api/regions", validateRequest(insertRegionSchema), async (req, res) => {
    try {
      const region = await storage.createRegion(req.body);
      res.status(201).json(region);
    } catch (error) {
      res.status(500).json({ error: "Failed to create region" });
    }
  });

  // Medical Institution routes
  app.get("/api/medical-institutions", async (req, res) => {
    try {
      let institutions;
      if (req.query.regionId) {
        institutions = await storage.getMedicalInstitutionsByRegion(Number(req.query.regionId));
      } else if (req.query.type) {
        institutions = await storage.getMedicalInstitutionsByType(req.query.type as string);
      } else if (req.query.approvalStatus) {
        institutions = await storage.getMedicalInstitutionsByApprovalStatus(req.query.approvalStatus as string);
      } else {
        institutions = await storage.getMedicalInstitutions();
      }
      res.json(institutions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch medical institutions" });
    }
  });

  app.get("/api/medical-institutions/:id", async (req, res) => {
    try {
      const institution = await storage.getMedicalInstitution(Number(req.params.id));
      if (!institution) {
        return res.status(404).json({ error: "Medical institution not found" });
      }
      res.json(institution);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch medical institution" });
    }
  });

  app.post("/api/medical-institutions", validateRequest(insertMedicalInstitutionSchema), async (req, res) => {
    try {
      const institution = await storage.createMedicalInstitution(req.body);
      res.status(201).json(institution);
    } catch (error) {
      res.status(500).json({ error: "Failed to create medical institution" });
    }
  });

  app.patch("/api/medical-institutions/:id/approval", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, validUntil } = req.body;
      
      if (!id || !status) {
        return res.status(400).json({ error: "ID and status are required" });
      }
      
      const institution = await storage.updateMedicalInstitutionApproval(
        Number(id), 
        status, 
        validUntil ? new Date(validUntil) : undefined
      );
      
      res.json(institution);
    } catch (error) {
      res.status(500).json({ error: "Failed to update medical institution approval" });
    }
  });

  // Medical Personnel routes
  app.get("/api/medical-personnel", async (req, res) => {
    try {
      let personnel;
      if (req.query.institutionId) {
        personnel = await storage.getMedicalPersonnelByInstitution(Number(req.query.institutionId));
      } else if (req.query.type) {
        personnel = await storage.getMedicalPersonnelByType(req.query.type as string);
      } else if (req.query.approvalStatus) {
        personnel = await storage.getMedicalPersonnelByApprovalStatus(req.query.approvalStatus as string);
      } else {
        personnel = await storage.getMedicalPersonnel();
      }
      res.json(personnel);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch medical personnel" });
    }
  });

  app.get("/api/medical-personnel/:id", async (req, res) => {
    try {
      const personnel = await storage.getMedicalPersonnel(Number(req.params.id));
      if (!personnel) {
        return res.status(404).json({ error: "Medical personnel not found" });
      }
      res.json(personnel);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch medical personnel" });
    }
  });

  app.post("/api/medical-personnel", validateRequest(insertMedicalPersonnelSchema), async (req, res) => {
    try {
      const personnel = await storage.createMedicalPersonnel(req.body);
      res.status(201).json(personnel);
    } catch (error) {
      res.status(500).json({ error: "Failed to create medical personnel" });
    }
  });

  app.patch("/api/medical-personnel/:id/approval", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, validUntil } = req.body;
      
      if (!id || !status) {
        return res.status(400).json({ error: "ID and status are required" });
      }
      
      const personnel = await storage.updateMedicalPersonnelApproval(
        Number(id), 
        status, 
        validUntil ? new Date(validUntil) : undefined
      );
      
      res.json(personnel);
    } catch (error) {
      res.status(500).json({ error: "Failed to update medical personnel approval" });
    }
  });

  // Panel Documentation routes
  app.get("/api/panel-documentation", async (req, res) => {
    try {
      let documentation;
      if (req.query.institutionId) {
        documentation = await storage.getPanelDocumentationsByInstitution(Number(req.query.institutionId));
      } else if (req.query.personnelId) {
        documentation = await storage.getPanelDocumentationsByPersonnel(Number(req.query.personnelId));
      } else if (req.query.isVerified !== undefined) {
        documentation = await storage.getPanelDocumentationsByVerificationStatus(req.query.isVerified === 'true');
      } else {
        documentation = await storage.getPanelDocumentations();
      }
      res.json(documentation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch panel documentation" });
    }
  });

  app.get("/api/panel-documentation/:id", async (req, res) => {
    try {
      const documentation = await storage.getPanelDocumentation(Number(req.params.id));
      if (!documentation) {
        return res.status(404).json({ error: "Panel documentation not found" });
      }
      res.json(documentation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch panel documentation" });
    }
  });

  app.post("/api/panel-documentation", validateRequest(insertPanelDocumentationSchema), async (req, res) => {
    try {
      const documentation = await storage.createPanelDocumentation(req.body);
      res.status(201).json(documentation);
    } catch (error) {
      res.status(500).json({ error: "Failed to create panel documentation" });
    }
  });

  app.patch("/api/panel-documentation/:id/verify", async (req, res) => {
    try {
      const { id } = req.params;
      const { verifiedBy, notes } = req.body;
      
      if (!id || !verifiedBy) {
        return res.status(400).json({ error: "ID and verifiedBy are required" });
      }
      
      const documentation = await storage.verifyPanelDocumentation(Number(id), verifiedBy, notes);
      res.json(documentation);
    } catch (error) {
      res.status(500).json({ error: "Failed to verify panel documentation" });
    }
  });

  // Claims routes
  app.get("/api/claims", async (req, res) => {
    try {
      let claims;
      if (req.query.institutionId) {
        claims = await storage.getClaimsByInstitution(Number(req.query.institutionId));
      } else if (req.query.personnelId) {
        claims = await storage.getClaimsByPersonnel(Number(req.query.personnelId));
      } else if (req.query.memberId) {
        claims = await storage.getClaimsByMember(Number(req.query.memberId));
      } else if (req.query.status) {
        claims = await storage.getClaimsByStatus(req.query.status as string);
      } else {
        claims = await storage.getClaims();
      }
      res.json(claims);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch claims" });
    }
  });

  app.get("/api/claims/:id", async (req, res) => {
    try {
      const claim = await storage.getClaim(Number(req.params.id));
      if (!claim) {
        return res.status(404).json({ error: "Claim not found" });
      }
      res.json(claim);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch claim" });
    }
  });

  app.post("/api/claims", validateRequest(insertClaimSchema), async (req, res) => {
    try {
      const { memberId, institutionId, personnelId, benefitId } = req.body;
      
      // 1. Verify member exists
      const member = await storage.getMember(memberId);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }
      
      // 2. Verify medical institution exists and is approved
      const institution = await storage.getMedicalInstitution(institutionId);
      if (!institution) {
        return res.status(404).json({ error: "Medical institution not found" });
      }
      
      if (institution.approvalStatus !== 'approved') {
        return res.status(403).json({ 
          error: "Medical institution is not approved to submit claims",
          status: institution.approvalStatus
        });
      }
      
      // 3. Verify medical personnel exists, belongs to this institution, and is approved
      const personnel = await storage.getMedicalPersonnel(personnelId);
      if (!personnel) {
        return res.status(404).json({ error: "Medical personnel not found" });
      }
      
      if (personnel.institutionId !== institutionId) {
        return res.status(403).json({ 
          error: "Medical personnel does not belong to the specified institution" 
        });
      }
      
      if (personnel.approvalStatus !== 'approved') {
        return res.status(403).json({ 
          error: "Medical personnel is not approved to submit claims",
          status: personnel.approvalStatus
        });
      }
      
      // 4. Verify the benefit exists
      const benefit = await storage.getBenefit(benefitId);
      if (!benefit) {
        return res.status(404).json({ error: "Benefit not found" });
      }
      
      // 5. Verify the member is eligible for this benefit
      // Get active period
      const activePeriod = await storage.getActivePeriod();
      if (!activePeriod) {
        return res.status(404).json({ error: "No active period found" });
      }
      
      // Find the company's premium for the active period
      const premiums = await storage.getPremiumsByCompany(member.companyId);
      const activePremium = premiums.find(p => p.periodId === activePeriod.id);
      
      if (!activePremium) {
        return res.status(403).json({ 
          error: "Member's company does not have an active premium for the current period" 
        });
      }
      
      // Get company benefits for this premium
      const companyBenefits = await storage.getCompanyBenefitsByPremium(activePremium.id);
      
      // Check if the specified benefit is included in the company's package
      const hasBenefit = companyBenefits.some(cb => cb.benefitId === benefitId);
      
      if (!hasBenefit) {
        return res.status(403).json({ 
          error: "The requested benefit is not included in the member's insurance package" 
        });
      }
      
      // If all validation passes, create the claim
      const claim = await storage.createClaim(req.body);
      res.status(201).json(claim);
    } catch (error) {
      res.status(500).json({ error: "Failed to create claim" });
    }
  });

  app.patch("/api/claims/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, reviewerNotes } = req.body;
      
      if (!id || !status) {
        return res.status(400).json({ error: "ID and status are required" });
      }
      
      const claim = await storage.updateClaimStatus(Number(id), status, reviewerNotes);
      res.json(claim);
    } catch (error) {
      res.status(500).json({ error: "Failed to update claim status" });
    }
  });

  app.patch("/api/claims/:id/payment", async (req, res) => {
    try {
      const { id } = req.params;
      const { paymentReference } = req.body;
      
      if (!id || !paymentReference) {
        return res.status(400).json({ error: "ID and payment reference are required" });
      }
      
      const claim = await storage.processClaimPayment(Number(id), paymentReference);
      res.json(claim);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to process claim payment" });
      }
    }
  });
  
  // New routes for provider verification and fraud detection
  
  // Get claims by provider verification status
  app.get("/api/claims/verification/:status", async (req, res) => {
    try {
      const { status } = req.params;
      const isVerified = status === 'verified';
      
      const claims = await storage.getClaimsByProviderVerification(isVerified);
      res.json(claims);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to fetch claims by verification status" });
      }
    }
  });
  
  // Get claims requiring higher approval
  app.get("/api/claims/approval/higher", async (req, res) => {
    try {
      const claims = await storage.getClaimsRequiringHigherApproval();
      res.json(claims);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to fetch claims requiring higher approval" });
      }
    }
  });
  
  // Get claims by fraud risk level
  app.get("/api/claims/fraud/:level", async (req, res) => {
    try {
      const { level } = req.params;
      const claims = await storage.getClaimsByFraudRiskLevel(level);
      res.json(claims);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to fetch claims by fraud risk level" });
      }
    }
  });
  
  // Admin approval for claim
  app.patch("/api/claims/:id/admin-approve", async (req, res) => {
    try {
      const { id } = req.params;
      const { adminNotes } = req.body;
      
      if (!id || !adminNotes) {
        return res.status(400).json({ error: "ID and admin notes are required" });
      }
      
      const claim = await storage.adminApproveClaim(Number(id), adminNotes);
      res.json(claim);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to admin approve claim" });
      }
    }
  });
  
  // Reject claim
  app.patch("/api/claims/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      if (!id || !reason) {
        return res.status(400).json({ error: "ID and rejection reason are required" });
      }
      
      const claim = await storage.rejectClaim(Number(id), reason);
      res.json(claim);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to reject claim" });
      }
    }
  });
  
  // Mark claim as fraudulent
  app.patch("/api/claims/:id/mark-fraudulent", async (req, res) => {
    try {
      const { id } = req.params;
      const { riskLevel, riskFactors, reviewerId } = req.body;
      
      if (!id || !riskLevel || !riskFactors || !reviewerId) {
        return res.status(400).json({ 
          error: "ID, risk level, risk factors, and reviewer ID are required" 
        });
      }
      
      const claim = await storage.markClaimAsFraudulent(
        Number(id), 
        riskLevel, 
        riskFactors, 
        Number(reviewerId)
      );
      res.json(claim);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to mark claim as fraudulent" });
      }
    }
  });

  // Premium Payments
  app.get("/api/premium-payments", async (req, res) => {
    try {
      let payments;
      if (req.query.companyId) {
        payments = await storage.getPremiumPaymentsByCompany(Number(req.query.companyId));
      } else if (req.query.premiumId) {
        payments = await storage.getPremiumPaymentsByPremium(Number(req.query.premiumId));
      } else if (req.query.status) {
        payments = await storage.getPremiumPaymentsByStatus(req.query.status as string);
      } else {
        payments = await storage.getPremiumPayments();
      }
      
      // Enhance premium payments with related data
      const enhancedPayments = await Promise.all(
        payments.map(async (payment) => {
          const company = await storage.getCompany(payment.companyId);
          const premium = await storage.getPremium(payment.premiumId);
          
          return {
            ...payment,
            companyName: company ? company.name : 'Unknown',
            premiumPeriod: premium ? {
              periodId: premium.periodId,
              total: premium.total
            } : null
          };
        })
      );
      
      res.json(enhancedPayments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch premium payments" });
    }
  });

  app.get("/api/premium-payments/:id", async (req, res) => {
    try {
      const payment = await storage.getPremiumPayment(Number(req.params.id));
      if (!payment) {
        return res.status(404).json({ error: "Premium payment not found" });
      }
      
      // Get related data
      const company = await storage.getCompany(payment.companyId);
      const premium = await storage.getPremium(payment.premiumId);
      
      const enhancedPayment = {
        ...payment,
        companyName: company ? company.name : 'Unknown',
        premiumPeriod: premium ? {
          periodId: premium.periodId,
          total: premium.total
        } : null
      };
      
      res.json(enhancedPayment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch premium payment" });
    }
  });

  app.post("/api/premium-payments", validateRequest(insertPremiumPaymentSchema), async (req, res) => {
    try {
      // Validate if premium exists
      const premium = await storage.getPremium(req.body.premiumId);
      if (!premium) {
        return res.status(404).json({ error: "Premium not found" });
      }
      
      // Validate if company exists
      const company = await storage.getCompany(req.body.companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      
      // Create premium payment
      const payment = await storage.createPremiumPayment(req.body);
      
      // If payment status is 'completed', update the premium
      if (payment.status === 'completed') {
        // In a real application, you would update the premium status as paid
        // For now, we're just recording the payment
        console.log(`Premium ${premium.id} has been paid.`);
      }
      
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create premium payment" });
      }
    }
  });

  app.patch("/api/premium-payments/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!id || !status) {
        return res.status(400).json({ error: "ID and status are required" });
      }
      
      const payment = await storage.updatePremiumPaymentStatus(Number(id), status);
      res.json(payment);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to update premium payment status" });
      }
    }
  });

  // Claim Payments
  app.get("/api/claim-payments", async (req, res) => {
    try {
      let payments;
      if (req.query.claimId) {
        payments = await storage.getClaimPaymentsByClaim(Number(req.query.claimId));
      } else if (req.query.memberId) {
        payments = await storage.getClaimPaymentsByMember(Number(req.query.memberId));
      } else if (req.query.institutionId) {
        payments = await storage.getClaimPaymentsByInstitution(Number(req.query.institutionId));
      } else if (req.query.status) {
        payments = await storage.getClaimPaymentsByStatus(req.query.status as string);
      } else {
        payments = await storage.getClaimPayments();
      }
      
      // Enhance claim payments with related data
      const enhancedPayments = await Promise.all(
        payments.map(async (payment) => {
          const member = await storage.getMember(payment.memberId);
          const claim = await storage.getClaim(payment.claimId);
          const institution = await storage.getMedicalInstitution(payment.institutionId);
          
          return {
            ...payment,
            memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
            claimAmount: claim ? claim.amount : 0,
            institutionName: institution ? institution.name : 'Unknown'
          };
        })
      );
      
      res.json(enhancedPayments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch claim payments" });
    }
  });

  app.get("/api/claim-payments/:id", async (req, res) => {
    try {
      const payment = await storage.getClaimPayment(Number(req.params.id));
      if (!payment) {
        return res.status(404).json({ error: "Claim payment not found" });
      }
      
      // Get related data
      const member = await storage.getMember(payment.memberId);
      const claim = await storage.getClaim(payment.claimId);
      const institution = await storage.getMedicalInstitution(payment.institutionId);
      
      const enhancedPayment = {
        ...payment,
        memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
        claimAmount: claim ? claim.amount : 0,
        institutionName: institution ? institution.name : 'Unknown'
      };
      
      res.json(enhancedPayment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch claim payment" });
    }
  });

  app.post("/api/claim-payments", validateRequest(insertClaimPaymentSchema), async (req, res) => {
    try {
      // Validate if claim exists
      const claim = await storage.getClaim(req.body.claimId);
      if (!claim) {
        return res.status(404).json({ error: "Claim not found" });
      }
      
      // Validate if claim has been approved
      if (claim.status !== 'approved' && claim.status !== 'paid') {
        return res.status(400).json({ error: "Claim must be approved before payment can be processed" });
      }
      
      // Validate if member exists
      const member = await storage.getMember(req.body.memberId);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }
      
      // Validate if institution exists
      const institution = await storage.getMedicalInstitution(req.body.institutionId);
      if (!institution) {
        return res.status(404).json({ error: "Medical institution not found" });
      }
      
      // Create claim payment
      const payment = await storage.createClaimPayment(req.body);
      
      // If payment status is 'completed', update the claim
      if (payment.status === 'completed' && claim.status !== 'paid') {
        await storage.processClaimPayment(claim.id, payment.paymentReference);
      }
      
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create claim payment" });
      }
    }
  });

  app.patch("/api/claim-payments/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!id || !status) {
        return res.status(400).json({ error: "ID and status are required" });
      }
      
      const payment = await storage.updateClaimPaymentStatus(Number(id), status);
      
      // If status is now 'completed', update the associated claim
      if (status === 'completed') {
        const claimPayment = await storage.getClaimPayment(Number(id));
        if (claimPayment) {
          const claim = await storage.getClaim(claimPayment.claimId);
          if (claim && claim.status !== 'paid') {
            await storage.processClaimPayment(claim.id, claimPayment.paymentReference);
          }
        }
      }
      
      res.json(payment);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to update claim payment status" });
      }
    }
  });

  // Provider Disbursements
  app.get("/api/provider-disbursements", async (req, res) => {
    try {
      let disbursements;
      if (req.query.institutionId) {
        disbursements = await storage.getProviderDisbursementsByInstitution(Number(req.query.institutionId));
      } else if (req.query.status) {
        disbursements = await storage.getProviderDisbursementsByStatus(req.query.status as string);
      } else {
        disbursements = await storage.getProviderDisbursements();
      }
      
      // Enhance disbursements with related data
      const enhancedDisbursements = await Promise.all(
        disbursements.map(async (disbursement) => {
          const institution = await storage.getMedicalInstitution(disbursement.institutionId);
          
          // Get disbursement items if available
          const items = await storage.getDisbursementItemsByDisbursement(disbursement.id);
          
          return {
            ...disbursement,
            institutionName: institution ? institution.name : 'Unknown',
            itemCount: items.length,
            itemsTotal: items.reduce((sum, item) => sum + item.amount, 0)
          };
        })
      );
      
      res.json(enhancedDisbursements);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch provider disbursements" });
    }
  });

  app.get("/api/provider-disbursements/:id", async (req, res) => {
    try {
      const disbursement = await storage.getProviderDisbursement(Number(req.params.id));
      if (!disbursement) {
        return res.status(404).json({ error: "Provider disbursement not found" });
      }
      
      // Get related data
      const institution = await storage.getMedicalInstitution(disbursement.institutionId);
      
      // Get disbursement items
      const items = await storage.getDisbursementItemsByDisbursement(disbursement.id);
      
      // Get claim details for each item
      const itemsWithClaims = await Promise.all(
        items.map(async (item) => {
          const claim = await storage.getClaim(item.claimId);
          const member = claim ? await storage.getMember(claim.memberId) : null;
          
          return {
            ...item,
            claim: claim ? {
              id: claim.id,
              serviceDate: claim.serviceDate,
              amount: claim.amount,
              status: claim.status
            } : null,
            memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown'
          };
        })
      );
      
      const enhancedDisbursement = {
        ...disbursement,
        institutionName: institution ? institution.name : 'Unknown',
        items: itemsWithClaims,
        itemCount: items.length,
        itemsTotal: items.reduce((sum, item) => sum + item.amount, 0)
      };
      
      res.json(enhancedDisbursement);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch provider disbursement" });
    }
  });

  app.post("/api/provider-disbursements", validateRequest(insertProviderDisbursementSchema), async (req, res) => {
    try {
      // Validate if institution exists
      const institution = await storage.getMedicalInstitution(req.body.institutionId);
      if (!institution) {
        return res.status(404).json({ error: "Medical institution not found" });
      }
      
      // Create disbursement
      const disbursement = await storage.createProviderDisbursement(req.body);
      
      res.status(201).json(disbursement);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create provider disbursement" });
      }
    }
  });

  app.post("/api/disbursement-items", validateRequest(insertDisbursementItemSchema), async (req, res) => {
    try {
      // Validate if disbursement exists
      const disbursement = await storage.getProviderDisbursement(req.body.disbursementId);
      if (!disbursement) {
        return res.status(404).json({ error: "Provider disbursement not found" });
      }
      
      // Validate if claim exists
      const claim = await storage.getClaim(req.body.claimId);
      if (!claim) {
        return res.status(404).json({ error: "Claim not found" });
      }
      
      // Create disbursement item
      const item = await storage.createDisbursementItem(req.body);
      
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create disbursement item" });
      }
    }
  });

  app.patch("/api/provider-disbursements/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!id || !status) {
        return res.status(400).json({ error: "ID and status are required" });
      }
      
      const disbursement = await storage.updateProviderDisbursementStatus(Number(id), status);
      
      // If status is changed to 'completed', update all items status
      if (status === 'completed') {
        const items = await storage.getDisbursementItemsByDisbursement(Number(id));
        
        // Update each item's status to 'completed'
        for (const item of items) {
          await storage.updateDisbursementItemStatus(item.id, 'completed');
        }
      }
      
      res.json(disbursement);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to update provider disbursement status" });
      }
    }
  });

  // Insurance Balances
  app.get("/api/insurance-balances", async (req, res) => {
    try {
      let balances;
      if (req.query.periodId) {
        const balance = await storage.getInsuranceBalanceByPeriod(Number(req.query.periodId));
        balances = balance ? [balance] : [];
      } else {
        balances = await storage.getInsuranceBalances();
      }
      
      // Enhance balances with period information
      const enhancedBalances = await Promise.all(
        balances.map(async (balance) => {
          const period = await storage.getPeriod(balance.periodId);
          
          return {
            ...balance,
            periodName: period ? period.name : 'Unknown',
            periodStart: period ? period.startDate : null,
            periodEnd: period ? period.endDate : null
          };
        })
      );
      
      res.json(enhancedBalances);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch insurance balances" });
    }
  });

  app.get("/api/insurance-balances/:id", async (req, res) => {
    try {
      const balance = await storage.getInsuranceBalance(Number(req.params.id));
      if (!balance) {
        return res.status(404).json({ error: "Insurance balance not found" });
      }
      
      // Get related period
      const period = await storage.getPeriod(balance.periodId);
      
      const enhancedBalance = {
        ...balance,
        periodName: period ? period.name : 'Unknown',
        periodStart: period ? period.startDate : null,
        periodEnd: period ? period.endDate : null
      };
      
      res.json(enhancedBalance);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch insurance balance" });
    }
  });

  app.post("/api/insurance-balances", validateRequest(insertInsuranceBalanceSchema), async (req, res) => {
    try {
      // Validate if period exists
      const period = await storage.getPeriod(req.body.periodId);
      if (!period) {
        return res.status(404).json({ error: "Period not found" });
      }
      
      // Check if balance already exists for this period
      const existingBalance = await storage.getInsuranceBalanceByPeriod(req.body.periodId);
      if (existingBalance) {
        return res.status(400).json({ error: "Balance already exists for this period" });
      }
      
      // Create balance
      const balance = await storage.createInsuranceBalance(req.body);
      
      res.status(201).json(balance);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create insurance balance" });
      }
    }
  });

  app.patch("/api/insurance-balances/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { totalPremiums, totalClaims, pendingClaims, activeBalance } = req.body;
      
      if (!id || totalPremiums === undefined || totalClaims === undefined || 
          pendingClaims === undefined || activeBalance === undefined) {
        return res.status(400).json({ 
          error: "ID, totalPremiums, totalClaims, pendingClaims, and activeBalance are required" 
        });
      }
      
      const balance = await storage.updateInsuranceBalance(
        Number(id), 
        Number(totalPremiums), 
        Number(totalClaims), 
        Number(pendingClaims), 
        Number(activeBalance)
      );
      
      res.json(balance);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to update insurance balance" });
      }
    }
  });

  // Company Periods
  app.get("/api/company-periods", async (req, res) => {
    try {
      let companyPeriods;
      if (req.query.companyId) {
        companyPeriods = await storage.getCompanyPeriodsByCompany(Number(req.query.companyId));
      } else if (req.query.periodId) {
        companyPeriods = await storage.getCompanyPeriodsByPeriod(Number(req.query.periodId));
      } else {
        companyPeriods = await storage.getCompanyPeriods();
      }
      
      // Enhance company periods with related data
      const enhancedCompanyPeriods = await Promise.all(
        companyPeriods.map(async (cp) => {
          const company = await storage.getCompany(cp.companyId);
          const period = await storage.getPeriod(cp.periodId);
          
          return {
            ...cp,
            companyName: company?.name,
            periodName: period?.name,
            periodType: period?.type,
            periodStatus: period?.status,
            startDate: period?.startDate,
            endDate: period?.endDate
          };
        })
      );
      
      res.json(enhancedCompanyPeriods);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company periods" });
    }
  });
  
  // Add endpoint for getting company periods by company ID in URL path
  app.get("/api/company-periods/company/:companyId", async (req, res) => {
    try {
      const companyId = Number(req.params.companyId);
      if (isNaN(companyId)) {
        return res.status(400).json({ error: "Invalid company ID" });
      }
      
      const companyPeriods = await storage.getCompanyPeriodsByCompany(companyId);
      
      // Enhance company periods with related data
      const enhancedCompanyPeriods = await Promise.all(
        companyPeriods.map(async (cp) => {
          const company = await storage.getCompany(cp.companyId);
          const period = await storage.getPeriod(cp.periodId);
          
          return {
            ...cp,
            companyName: company?.name,
            periodName: period?.name,
            periodType: period?.type,
            periodStatus: period?.status,
            startDate: period?.startDate,
            endDate: period?.endDate
          };
        })
      );
      
      res.json(enhancedCompanyPeriods);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company periods" });
    }
  });

  app.get("/api/company-periods/:id", async (req, res) => {
    try {
      const companyPeriod = await storage.getCompanyPeriod(Number(req.params.id));
      if (!companyPeriod) {
        return res.status(404).json({ error: "Company period not found" });
      }
      
      // Get related data
      const company = await storage.getCompany(companyPeriod.companyId);
      const period = await storage.getPeriod(companyPeriod.periodId);
      
      const enhancedCompanyPeriod = {
        ...companyPeriod,
        companyDetails: company,
        periodDetails: period
      };
      
      res.json(enhancedCompanyPeriod);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company period" });
    }
  });

  app.post("/api/company-periods", validateRequest(insertCompanyPeriodSchema), async (req, res) => {
    try {
      // Verify if company exists
      const company = await storage.getCompany(req.body.companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      
      // Verify if period exists
      const period = await storage.getPeriod(req.body.periodId);
      if (!period) {
        return res.status(404).json({ error: "Period not found" });
      }
      
      // Create company period
      const companyPeriod = await storage.createCompanyPeriod(req.body);
      res.status(201).json(companyPeriod);
    } catch (error) {
      res.status(500).json({ error: "Failed to create company period" });
    }
  });

  // Medical Procedures routes
  app.get("/api/medical-procedures", async (req, res) => {
    try {
      let procedures;
      if (req.query.category) {
        procedures = await storage.getMedicalProceduresByCategory(req.query.category as string);
      } else if (req.query.active === 'true') {
        procedures = await storage.getActiveMedicalProcedures();
      } else {
        procedures = await storage.getMedicalProcedures();
      }
      res.json(procedures);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch medical procedures" });
    }
  });

  app.get("/api/medical-procedures/:id", async (req, res) => {
    try {
      const procedure = await storage.getMedicalProcedure(Number(req.params.id));
      if (!procedure) {
        return res.status(404).json({ error: "Medical procedure not found" });
      }
      res.json(procedure);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch medical procedure" });
    }
  });

  app.post("/api/medical-procedures", validateRequest(insertMedicalProcedureSchema), async (req, res) => {
    try {
      const procedure = await storage.createMedicalProcedure(req.body);
      res.status(201).json(procedure);
    } catch (error) {
      res.status(500).json({ error: "Failed to create medical procedure" });
    }
  });

  app.patch("/api/medical-procedures/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { active } = req.body;
      
      if (!id || active === undefined) {
        return res.status(400).json({ error: "ID and active status are required" });
      }
      
      const procedure = await storage.updateMedicalProcedureStatus(Number(id), active);
      res.json(procedure);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to update medical procedure status" });
      }
    }
  });

  // Provider Procedure Rates routes
  app.get("/api/provider-procedure-rates", async (req, res) => {
    try {
      let rates;
      if (req.query.institutionId) {
        rates = await storage.getProviderProcedureRatesByInstitution(Number(req.query.institutionId));
      } else if (req.query.procedureId) {
        rates = await storage.getProviderProcedureRatesByProcedure(Number(req.query.procedureId));
      } else if (req.query.active === 'true') {
        rates = await storage.getActiveProviderProcedureRates();
      } else {
        rates = await storage.getProviderProcedureRates();
      }
      
      // Enhance rates with institution and procedure details
      const enhancedRates = await Promise.all(
        rates.map(async (rate) => {
          const institution = await storage.getMedicalInstitution(rate.institutionId);
          const procedure = await storage.getMedicalProcedure(rate.procedureId);
          
          return {
            ...rate,
            institutionName: institution ? institution.name : 'Unknown',
            procedureName: procedure ? procedure.name : 'Unknown',
            procedureCode: procedure ? procedure.code : 'Unknown',
            standardRate: procedure ? procedure.standardRate : 0,
            rateVariance: procedure ? ((rate.agreedRate - procedure.standardRate) / procedure.standardRate * 100).toFixed(2) + '%' : '0%'
          };
        })
      );
      
      res.json(enhancedRates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch provider procedure rates" });
    }
  });

  app.get("/api/provider-procedure-rates/:id", async (req, res) => {
    try {
      const rate = await storage.getProviderProcedureRate(Number(req.params.id));
      if (!rate) {
        return res.status(404).json({ error: "Provider procedure rate not found" });
      }
      
      // Get related data
      const institution = await storage.getMedicalInstitution(rate.institutionId);
      const procedure = await storage.getMedicalProcedure(rate.procedureId);
      
      const enhancedRate = {
        ...rate,
        institutionDetails: institution,
        procedureDetails: procedure,
        rateVariance: procedure 
          ? ((rate.agreedRate - procedure.standardRate) / procedure.standardRate * 100).toFixed(2) + '%' 
          : '0%'
      };
      
      res.json(enhancedRate);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch provider procedure rate" });
    }
  });

  app.post("/api/provider-procedure-rates", validateRequest(insertProviderProcedureRateSchema), async (req, res) => {
    try {
      // Verify institution exists
      const institution = await storage.getMedicalInstitution(req.body.institutionId);
      if (!institution) {
        return res.status(404).json({ error: "Medical institution not found" });
      }
      
      // Verify procedure exists
      const procedure = await storage.getMedicalProcedure(req.body.procedureId);
      if (!procedure) {
        return res.status(404).json({ error: "Medical procedure not found" });
      }
      
      const rate = await storage.createProviderProcedureRate(req.body);
      res.status(201).json(rate);
    } catch (error) {
      res.status(500).json({ error: "Failed to create provider procedure rate" });
    }
  });

  app.patch("/api/provider-procedure-rates/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { active } = req.body;
      
      if (!id || active === undefined) {
        return res.status(400).json({ error: "ID and active status are required" });
      }
      
      const rate = await storage.updateProviderProcedureRateStatus(Number(id), active);
      res.json(rate);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to update provider procedure rate status" });
      }
    }
  });

  // Claim Procedure Items routes
  app.get("/api/claim-procedure-items", async (req, res) => {
    try {
      let items;
      if (req.query.claimId) {
        items = await storage.getClaimProcedureItemsByClaim(Number(req.query.claimId));
      } else if (req.query.procedureId) {
        items = await storage.getClaimProcedureItemsByProcedure(Number(req.query.procedureId));
      } else {
        items = await storage.getClaimProcedureItems();
      }
      
      // Enhance items with procedure details
      const enhancedItems = await Promise.all(
        items.map(async (item) => {
          const procedure = await storage.getMedicalProcedure(item.procedureId);
          const claim = await storage.getClaim(item.claimId);
          
          return {
            ...item,
            procedureName: procedure ? procedure.name : 'Unknown',
            procedureCode: procedure ? procedure.code : 'Unknown',
            procedureCategory: procedure ? procedure.category : 'Unknown',
            claimStatus: claim ? claim.status : 'Unknown'
          };
        })
      );
      
      res.json(enhancedItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch claim procedure items" });
    }
  });

  app.get("/api/claim-procedure-items/:id", async (req, res) => {
    try {
      const item = await storage.getClaimProcedureItem(Number(req.params.id));
      if (!item) {
        return res.status(404).json({ error: "Claim procedure item not found" });
      }
      
      // Get related data
      const procedure = await storage.getMedicalProcedure(item.procedureId);
      const claim = await storage.getClaim(item.claimId);
      
      const enhancedItem = {
        ...item,
        procedureDetails: procedure,
        claimDetails: claim
      };
      
      res.json(enhancedItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch claim procedure item" });
    }
  });

  // Enhanced claim submission endpoint to include procedure items
  app.post("/api/claims-with-procedures", async (req, res) => {
    try {
      const { claim, procedureItems } = req.body;
      
      // Validate claim data
      insertClaimSchema.parse(claim);
      
      // Validate each procedure item
      if (!procedureItems || !Array.isArray(procedureItems) || procedureItems.length === 0) {
        return res.status(400).json({ error: "At least one procedure item is required" });
      }
      
      const { memberId, institutionId, personnelId, benefitId } = claim;
      
      // 1. Verify member exists
      const member = await storage.getMember(memberId);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }
      
      // 2. Verify medical institution exists and is approved
      const institution = await storage.getMedicalInstitution(institutionId);
      if (!institution) {
        return res.status(404).json({ error: "Medical institution not found" });
      }
      
      if (institution.approvalStatus !== 'approved') {
        return res.status(403).json({ 
          error: "Medical institution is not approved to submit claims",
          status: institution.approvalStatus
        });
      }
      
      // 3. Verify medical personnel exists and is approved
      const personnel = await storage.getMedicalPersonnelById(personnelId);
      if (!personnel) {
        return res.status(404).json({ error: "Medical personnel not found" });
      }
      
      if (personnel.institutionId !== institutionId) {
        return res.status(403).json({ 
          error: "Medical personnel does not belong to the specified institution" 
        });
      }
      
      if (personnel.approvalStatus !== 'approved') {
        return res.status(403).json({ 
          error: "Medical personnel is not approved to submit claims",
          status: personnel.approvalStatus
        });
      }
      
      // 4. Verify the benefit exists
      const benefit = await storage.getBenefit(benefitId);
      if (!benefit) {
        return res.status(404).json({ error: "Benefit not found" });
      }
      
      // 5. Verify the member is eligible for this benefit
      // Get active period
      const activePeriod = await storage.getActivePeriod();
      if (!activePeriod) {
        return res.status(404).json({ error: "No active period found" });
      }
      
      // Find the company's premium for the active period
      const premiums = await storage.getPremiumsByCompany(member.companyId);
      const activePremium = premiums.find(p => p.periodId === activePeriod.id);
      
      if (!activePremium) {
        return res.status(403).json({ 
          error: "Member's company does not have an active premium for the current period" 
        });
      }
      
      // Get company benefits for this premium
      const companyBenefits = await storage.getCompanyBenefitsByPremium(activePremium.id);
      
      // Check if the specified benefit is included in the company's package
      const hasBenefit = companyBenefits.some(cb => cb.benefitId === benefitId);
      
      if (!hasBenefit) {
        return res.status(403).json({ 
          error: "The requested benefit is not included in the member's insurance package" 
        });
      }
      
      // 6. Verify each procedure and get the institution-specific rates
      let totalAmount = 0;
      const validatedProcedureItems = [];
      
      for (const item of procedureItems) {
        // Validate the procedure item structure
        if (!item.procedureId || !item.quantity) {
          return res.status(400).json({ 
            error: "Each procedure item must include procedureId and quantity" 
          });
        }
        
        // Verify procedure exists
        const procedure = await storage.getMedicalProcedure(item.procedureId);
        if (!procedure) {
          return res.status(404).json({ 
            error: `Medical procedure with ID ${item.procedureId} not found` 
          });
        }
        
        // Get provider-specific rate if available
        const rates = await storage.getProviderProcedureRatesByInstitution(institutionId);
        const providerRate = rates.find(r => 
          r.procedureId === item.procedureId && 
          r.active && 
          (!r.expiryDate || new Date(r.expiryDate) > new Date())
        );
        
        // Use provider-specific rate if available, otherwise use standard rate
        const unitRate = providerRate ? providerRate.agreedRate : procedure.standardRate;
        const itemTotal = unitRate * item.quantity;
        
        totalAmount += itemTotal;
        
        validatedProcedureItems.push({
          procedureId: item.procedureId,
          quantity: item.quantity,
          unitRate,
          totalAmount: itemTotal,
          notes: item.notes || ''
        });
      }
      
      // 7. Update the claim with calculated amount
      claim.amount = totalAmount;
      
      // 8. Check if the provider is verified
      claim.providerVerified = institution.approvalStatus === 'approved' && 
                              personnel.approvalStatus === 'approved';
      
      // 9. If provider is not verified, set flag for higher approval
      claim.requiresHigherApproval = !claim.providerVerified;
      
      // 10. Use the transaction method to create claim and procedure items together
      const result = await storage.createClaimWithProcedureItems(claim, validatedProcedureItems);
      
      // Return the created claim with procedure items
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create claim with procedures" });
      }
    }
  });

  // Diagnosis Code Routes
  // GET all diagnosis codes
  app.get('/api/diagnosis-codes', async (req, res) => {
    try {
      const diagnosisCodes = await storage.getDiagnosisCodes();
      res.json(diagnosisCodes);
    } catch (error) {
      console.error('Error fetching diagnosis codes:', error);
      res.status(500).json({ error: 'Failed to fetch diagnosis codes' });
    }
  });

  // GET diagnosis codes by search
  app.get('/api/diagnosis-codes/search', async (req, res) => {
    try {
      const searchTerm = req.query.term as string;
      
      if (!searchTerm) {
        return res.status(400).json({ error: 'Search term is required' });
      }
      
      const diagnosisCodes = await storage.getDiagnosisCodesBySearch(searchTerm);
      res.json(diagnosisCodes);
    } catch (error) {
      console.error('Error searching diagnosis codes:', error);
      res.status(500).json({ error: 'Failed to search diagnosis codes' });
    }
  });

  // GET diagnosis code by code
  app.get('/api/diagnosis-codes/code/:code', async (req, res) => {
    try {
      const code = req.params.code;
      
      const diagnosisCode = await storage.getDiagnosisCodeByCode(code);
      if (!diagnosisCode) {
        return res.status(404).json({ error: 'Diagnosis code not found' });
      }
      
      res.json(diagnosisCode);
    } catch (error) {
      console.error('Error fetching diagnosis code by code:', error);
      res.status(500).json({ error: 'Failed to fetch diagnosis code' });
    }
  });

  // GET diagnosis codes by type
  app.get('/api/diagnosis-codes/type/:type', async (req, res) => {
    try {
      const codeType = req.params.type;
      
      const diagnosisCodes = await storage.getDiagnosisCodesByType(codeType);
      res.json(diagnosisCodes);
    } catch (error) {
      console.error('Error fetching diagnosis codes by type:', error);
      res.status(500).json({ error: 'Failed to fetch diagnosis codes' });
    }
  });

  // GET diagnosis code by ID - must be last since it uses a path parameter
  app.get('/api/diagnosis-codes/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }
      
      const diagnosisCode = await storage.getDiagnosisCode(id);
      if (!diagnosisCode) {
        return res.status(404).json({ error: 'Diagnosis code not found' });
      }
      
      res.json(diagnosisCode);
    } catch (error) {
      console.error('Error fetching diagnosis code:', error);
      res.status(500).json({ error: 'Failed to fetch diagnosis code' });
    }
  });

  // POST create new diagnosis code
  app.post('/api/diagnosis-codes', async (req, res) => {
    try {
      // Validate the request body
      const validatedData = insertDiagnosisCodeSchema.parse(req.body);
      
      // Create the diagnosis code
      const diagnosisCode = await storage.createDiagnosisCode(validatedData);
      res.status(201).json(diagnosisCode);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        console.error('Error creating diagnosis code:', error);
        res.status(500).json({ error: 'Failed to create diagnosis code' });
      }
    }
  });

  // PATCH update diagnosis code status
  app.patch('/api/diagnosis-codes/:id/status', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }
      
      // Validate request body
      if (typeof req.body.isActive !== 'boolean') {
        return res.status(400).json({ error: 'isActive must be a boolean value' });
      }
      
      // Update the diagnosis code status
      const diagnosisCode = await storage.updateDiagnosisCodeStatus(id, req.body.isActive);
      res.json(diagnosisCode);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({ error: error.message });
        }
      }
      console.error('Error updating diagnosis code status:', error);
      res.status(500).json({ error: 'Failed to update diagnosis code status' });
    }
  });

  // Member Engagement Hub - Onboarding System

  // Member Activation Endpoints
  app.post("/api/members/:id/activate", async (req, res) => {
    try {
      const memberId = Number(req.params.id);
      const { password, securityQuestions, communicationPreferences } = req.body;

      if (!memberId || !password) {
        return res.status(400).json({ error: "Member ID and password are required" });
      }

      // Verify member exists
      const member = await storage.getMember(memberId);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Check if member is already activated
      const existingSession = await storage.getOnboardingSessionByMember(memberId);
      if (existingSession && existingSession.activationCompleted) {
        return res.status(400).json({ error: "Member is already activated" });
      }

      // Create activation token (in a real system, this would be sent via email)
      const activationToken = await storage.createActivationToken({
        memberId,
        tokenHash: Buffer.from(Math.random().toString(36)).toString('base64'), // Simple token generation
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        status: 'pending',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Create or update onboarding session
      let onboardingSession;
      if (existingSession) {
        onboardingSession = await storage.updateOnboardingSession(existingSession.id, {
          activationCompleted: true,
          status: 'active'
        });
      } else {
        onboardingSession = await storage.createOnboardingSession({
          memberId,
          status: 'active',
          activationCompleted: true,
          currentDay: 1
        });
      }

      // Create onboarding preferences
      await storage.createOnboardingPreference({
        memberId,
        emailFrequency: communicationPreferences?.emailFrequency || 'daily',
        smsEnabled: communicationPreferences?.smsEnabled || true,
        timezone: communicationPreferences?.timezone || 'UTC',
        preferredTime: communicationPreferences?.preferredTime || '09:00',
        language: communicationPreferences?.language || 'en',
        communicationChannel: communicationPreferences?.communicationChannel || 'email'
      });

      // Create Day 1 tasks
      await storage.createOnboardingTasksForDay(memberId, 1);

      res.status(201).json({
        success: true,
        message: "Member activated successfully",
        activationToken: activationToken.tokenHash,
        onboardingSession
      });
    } catch (error) {
      console.error('Activation error:', error);
      res.status(500).json({ error: "Failed to activate member" });
    }
  });

  app.post("/api/members/activate-with-token", async (req, res) => {
    try {
      const { token, password, communicationPreferences } = req.body;

      if (!token || !password) {
        return res.status(400).json({ error: "Activation token and password are required" });
      }

      // Find activation token
      const activationToken = await storage.getActivationToken(token);
      if (!activationToken) {
        return res.status(404).json({ error: "Invalid activation token" });
      }

      if (activationToken.status !== 'pending') {
        return res.status(400).json({ error: "Activation token has already been used" });
      }

      if (new Date(activationToken.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Activation token has expired" });
      }

      // Get member
      const member = await storage.getMember(activationToken.memberId);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Update token status
      await storage.updateActivationToken(activationToken.id, {
        status: 'used',
        usedAt: new Date()
      });

      // Create onboarding session
      const onboardingSession = await storage.createOnboardingSession({
        memberId: activationToken.memberId,
        status: 'active',
        activationCompleted: true,
        currentDay: 1
      });

      // Create onboarding preferences
      await storage.createOnboardingPreference({
        memberId: activationToken.memberId,
        emailFrequency: communicationPreferences?.emailFrequency || 'daily',
        smsEnabled: communicationPreferences?.smsEnabled || true,
        timezone: communicationPreferences?.timezone || 'UTC',
        preferredTime: communicationPreferences?.preferredTime || '09:00',
        language: communicationPreferences?.language || 'en',
        communicationChannel: communicationPreferences?.communicationChannel || 'email'
      });

      // Create Day 1 tasks
      await storage.createOnboardingTasksForDay(activationToken.memberId, 1);

      res.status(201).json({
        success: true,
        message: "Member activated successfully",
        onboardingSession
      });
    } catch (error) {
      console.error('Token activation error:', error);
      res.status(500).json({ error: "Failed to activate member" });
    }
  });

  // Onboarding Progress Endpoints
  app.get("/api/onboarding/:memberId/status", async (req, res) => {
    try {
      const memberId = Number(req.params.id);

      const session = await storage.getOnboardingSessionByMember(memberId);
      if (!session) {
        return res.status(404).json({ error: "Onboarding session not found" });
      }

      const tasks = await storage.getOnboardingTasksBySession(session.id);
      const documents = await storage.getMemberDocuments(memberId);

      // Calculate progress
      const completedTasks = tasks.filter(task => task.completionStatus);
      const progressPercentage = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

      res.json({
        session,
        tasks,
        documents,
        progressPercentage,
        completedTasks: completedTasks.length,
        totalTasks: tasks.length,
        currentDay: session.currentDay,
        status: session.status
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch onboarding status" });
    }
  });

  app.get("/api/onboarding/:memberId/next-day", async (req, res) => {
    try {
      const memberId = Number(req.params.id);

      const session = await storage.getOnboardingSessionByMember(memberId);
      if (!session) {
        return res.status(404).json({ error: "Onboarding session not found" });
      }

      if (session.status === 'completed') {
        return res.status(400).json({ error: "Onboarding already completed" });
      }

      // Check if current day tasks are completed
      const currentTasks = await storage.getOnboardingTasksBySessionAndDay(session.id, session.currentDay);
      const incompleteTasks = currentTasks.filter(task => !task.completionStatus);

      if (incompleteTasks.length > 0 && session.currentDay > 1) {
        return res.status(400).json({
          error: "Complete current day tasks before advancing",
          incompleteTasks: incompleteTasks.map(task => ({ id: task.id, title: task.title }))
        });
      }

      const nextDay = session.currentDay + 1;

      if (nextDay > 7) {
        // Complete onboarding
        await storage.updateOnboardingSession(session.id, {
          status: 'completed',
          completionDate: new Date(),
          currentDay: 7
        });

        return res.json({
          message: "Onboarding completed!",
          status: 'completed',
          nextDay: null
        });
      }

      // Create tasks for next day
      await storage.createOnboardingTasksForDay(memberId, nextDay);
      await storage.updateOnboardingSession(session.id, { currentDay: nextDay });

      const nextTasks = await storage.getOnboardingTasksBySessionAndDay(session.id, nextDay);

      res.json({
        nextDay,
        tasks: nextTasks,
        status: 'active'
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get next day content" });
    }
  });

  app.post("/api/onboarding/:memberId/skip-day", async (req, res) => {
    try {
      const memberId = Number(req.params.id);
      const { reason } = req.body;

      const session = await storage.getOnboardingSessionByMember(memberId);
      if (!session) {
        return res.status(404).json({ error: "Onboarding session not found" });
      }

      const nextDay = Math.min(session.currentDay + 1, 7);

      await storage.updateOnboardingSession(session.id, { currentDay: nextDay });
      await storage.createOnboardingTasksForDay(memberId, nextDay);

      const nextTasks = await storage.getOnboardingTasksBySessionAndDay(session.id, nextDay);

      res.json({
        nextDay,
        tasks: nextTasks,
        skippedDay: session.currentDay,
        reason
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to skip day" });
    }
  });

  // Task Management Endpoints
  app.put("/api/onboarding/tasks/:taskId", async (req, res) => {
    try {
      const taskId = Number(req.params.id);
      const { completionStatus, taskData } = req.body;

      const task = await storage.getOnboardingTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const updateData: any = { completionStatus };
      if (completionStatus && !task.completedAt) {
        updateData.completedAt = new Date();
        updateData.pointsEarned = 10; // Base points for task completion
      } else if (!completionStatus) {
        updateData.completedAt = null;
        updateData.pointsEarned = 0;
      }

      if (taskData) {
        updateData.taskData = JSON.stringify(taskData);
      }

      const updatedTask = await storage.updateOnboardingTask(taskId, updateData);

      // Update session points if task was completed
      if (completionStatus && !task.completionStatus) {
        const session = await storage.getOnboardingSession(updatedTask.sessionId);
        if (session) {
          await storage.updateOnboardingSession(session.id, {
            totalPointsEarned: session.totalPointsEarned + updateData.pointsEarned
          });
        }
      }

      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // Document Upload Endpoints
  app.post("/api/onboarding/:memberId/documents", async (req, res) => {
    try {
      const memberId = Number(req.params.id);
      const { documentType, fileName, fileData, mimeType } = req.body;

      if (!documentType || !fileName || !fileData || !mimeType) {
        return res.status(400).json({
          error: "Document type, filename, file data, and MIME type are required"
        });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(mimeType)) {
        return res.status(400).json({
          error: "Only JPG, PNG, and PDF files are allowed"
        });
      }

      // Validate file size (10MB max)
      const fileSize = Buffer.byteLength(fileData, 'base64');
      if (fileSize > 10 * 1024 * 1024) {
        return res.status(400).json({
          error: "File size must be less than 10MB"
        });
      }

      // Generate file hash
      const crypto = require('crypto');
      const fileHash = crypto.createHash('sha256').update(fileData).digest('hex');

      // Store file (in a real system, this would be cloud storage)
      const storedFilePath = `documents/${memberId}/${Date.now()}-${fileName}`;

      const document = await storage.createMemberDocument({
        memberId,
        documentType,
        originalFileName: fileName,
        storedFilePath,
        fileHash,
        fileSize,
        mimeType,
        verificationStatus: 'pending'
      });

      // Start document validation process (in background)
      // This would typically be handled by a background job

      res.status(201).json({
        success: true,
        document: {
          id: document.id,
          documentType,
          originalFileName: fileName,
          uploadDate: document.uploadDate,
          verificationStatus: document.verificationStatus
        }
      });
    } catch (error) {
      console.error('Document upload error:', error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  app.get("/api/onboarding/:memberId/documents", async (req, res) => {
    try {
      const memberId = Number(req.params.id);
      const { status } = req.query;

      let documents;
      if (status) {
        documents = await storage.getMemberDocumentsByStatus(memberId, status as string);
      } else {
        documents = await storage.getMemberDocuments(memberId);
      }

      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Personalization Engine Endpoints
  app.get("/api/members/:id/personalized-dashboard", async (req, res) => {
    try {
      const memberId = Number(req.params.id);

      // Get member preferences
      const preferences = await storage.getMemberPreferences(memberId);

      // Get behavior analytics for recommendations
      const recentBehavior = await storage.getRecentBehaviorAnalytics(memberId, 10);

      // Get personalization scores
      const personalizationScores = await storage.getPersonalizationScores(memberId);

      // Get recommendations
      const recommendations = await storage.getActiveRecommendations(memberId);

      // Get journey stage
      const journeyStage = await storage.getJourneyStage(memberId);

      // Get current onboarding status
      const onboardingSession = await storage.getOnboardingSessionByMember(memberId);

      res.json({
        preferences,
        recentBehavior,
        personalizationScores,
        recommendations,
        journeyStage,
        onboardingStatus: onboardingSession,
        personalizationLevel: preferences?.personalizationLevel || 'moderate'
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch personalized dashboard data" });
    }
  });

  app.post("/api/members/:id/preferences", async (req, res) => {
    try {
      const memberId = Number(req.params.id);
      const preferenceData = req.body;

      // Validate member exists
      const member = await storage.getMember(memberId);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      let preferences;
      const existingPreferences = await storage.getMemberPreferences(memberId);

      if (existingPreferences) {
        preferences = await storage.updateMemberPreferences(memberId, preferenceData);
      } else {
        preferences = await storage.createMemberPreference({
          memberId,
          ...preferenceData
        });
      }

      res.json(preferences);
    } catch (error) {
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  app.get("/api/members/:id/recommendations", async (req, res) => {
    try {
      const memberId = Number(req.params.id);
      const { type, limit = 10 } = req.query;

      let recommendations;
      if (type) {
        recommendations = await storage.getRecommendationsByType(memberId, type as string, Number(limit));
      } else {
        recommendations = await storage.getActiveRecommendations(memberId, Number(limit));
      }

      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  });

  app.post("/api/members/:id/recommendations/:recommendationId/feedback", async (req, res) => {
    try {
      const memberId = Number(req.params.id);
      const recommendationId = Number(req.params.recommendationId);
      const { response, feedbackRating, feedbackText } = req.body;

      const recommendation = await storage.getRecommendationHistory(recommendationId);
      if (!recommendation || recommendation.memberId !== memberId) {
        return res.status(404).json({ error: "Recommendation not found" });
      }

      const updatedRecommendation = await storage.updateRecommendationFeedback(recommendationId, {
        memberResponse: response,
        responseDate: new Date(),
        feedbackRating,
        feedbackText
      });

      res.json(updatedRecommendation);
    } catch (error) {
      res.status(500).json({ error: "Failed to record feedback" });
    }
  });

  // Behavior Analytics Endpoints
  app.post("/api/members/:id/analytics", async (req, res) => {
    try {
      const memberId = Number(req.params.id);
      const { eventType, resourceName, resourceData, sessionId, timeOnPage, scrollDepth } = req.body;

      if (!eventType || !resourceName || !sessionId) {
        return res.status(400).json({
          error: "Event type, resource name, and session ID are required"
        });
      }

      const analytic = await storage.createBehaviorAnalytic({
        memberId,
        eventType,
        resourceName,
        resourceData: resourceData ? JSON.stringify(resourceData) : null,
        sessionId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        referrer: req.get('Referer'),
        timeOnPage: timeOnPage || null,
        scrollDepth: scrollDepth || null
      });

      res.status(201).json(analytic);
    } catch (error) {
      res.status(500).json({ error: "Failed to record analytics" });
    }
  });

  app.get("/api/members/:id/analytics", async (req, res) => {
    try {
      const memberId = Number(req.params.id);
      const { eventType, limit = 50, sessionId } = req.query;

      let analytics;
      if (sessionId) {
        analytics = await storage.getBehaviorAnalyticsBySession(memberId, sessionId as string, Number(limit));
      } else if (eventType) {
        analytics = await storage.getBehaviorAnalyticsByType(memberId, eventType as string, Number(limit));
      } else {
        analytics = await storage.getRecentBehaviorAnalytics(memberId, Number(limit));
      }

      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Admin Onboarding Management Endpoints
  app.get("/api/admin/onboarding/overview", authenticate, requireRole(['insurance']), async (req: AuthenticatedRequest, res) => {
    try {
      const { companyId, day, status } = req.query;

      // Get all onboarding sessions with filters
      let sessions;
      if (companyId) {
        sessions = await storage.getOnboardingSessionsByCompany(Number(companyId));
      } else {
        sessions = await storage.getAllOnboardingSessions();
      }

      // Apply additional filters
      if (day) {
        sessions = sessions.filter(session => session.currentDay === Number(day));
      }

      if (status) {
        sessions = sessions.filter(session => session.status === status);
      }

      // Enhance with member data
      const enhancedSessions = await Promise.all(
        sessions.map(async (session) => {
          const member = await storage.getMember(session.memberId);
          const company = member ? await storage.getCompany(member.companyId) : null;
          const tasks = await storage.getOnboardingTasksBySession(session.id);
          const completedTasks = tasks.filter(task => task.completionStatus);

          return {
            ...session,
            memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
            memberEmail: member ? member.email : 'Unknown',
            companyName: company ? company.name : 'Unknown',
            progressPercentage: tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0,
            completedTasks: completedTasks.length,
            totalTasks: tasks.length
          };
        })
      );

      // Calculate summary statistics
      const stats = {
        totalSessions: enhancedSessions.length,
        activeSessions: enhancedSessions.filter(s => s.status === 'active').length,
        completedSessions: enhancedSessions.filter(s => s.status === 'completed').length,
        averageProgress: enhancedSessions.reduce((sum, s) => sum + s.progressPercentage, 0) / enhancedSessions.length || 0,
        currentDayDistribution: {
          1: enhancedSessions.filter(s => s.currentDay === 1).length,
          2: enhancedSessions.filter(s => s.currentDay === 2).length,
          3: enhancedSessions.filter(s => s.currentDay === 3).length,
          4: enhancedSessions.filter(s => s.currentDay === 4).length,
          5: enhancedSessions.filter(s => s.currentDay === 5).length,
          6: enhancedSessions.filter(s => s.currentDay === 6).length,
          7: enhancedSessions.filter(s => s.currentDay === 7).length
        }
      };

      res.json({
        sessions: enhancedSessions,
        stats
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch onboarding overview" });
    }
  });

  app.get("/api/admin/documents/review-queue", authenticate, requireRole(['insurance']), async (req: AuthenticatedRequest, res) => {
    try {
      const { status = 'pending' } = req.query;

      let documents;
      if (status === 'pending') {
        documents = await storage.getPendingDocuments();
      } else {
        documents = await storage.getMemberDocumentsByStatus(null, status as string);
      }

      // Enhance with member data
      const enhancedDocuments = await Promise.all(
        documents.map(async (document) => {
          const member = await storage.getMember(document.memberId);
          const company = member ? await storage.getCompany(member.companyId) : null;

          return {
            ...document,
            memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
            memberEmail: member ? member.email : 'Unknown',
            companyName: company ? company.name : 'Unknown'
          };
        })
      );

      res.json(enhancedDocuments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch document review queue" });
    }
  });

  app.patch("/api/admin/documents/:documentId/verify", authenticate, requireRole(['insurance']), async (req: AuthenticatedRequest, res) => {
    try {
      const documentId = Number(req.params.id);
      const { verificationStatus, rejectionReason, verifiedBy } = req.body;

      if (!['approved', 'rejected'].includes(verificationStatus)) {
        return res.status(400).json({ error: "Verification status must be 'approved' or 'rejected'" });
      }

      if (verificationStatus === 'rejected' && !rejectionReason) {
        return res.status(400).json({ error: "Rejection reason is required when rejecting documents" });
      }

      const document = await storage.updateMemberDocument(documentId, {
        verificationStatus,
        verificationDate: new Date(),
        verifiedBy: verifiedBy || req.user?.userId,
        rejectionReason: rejectionReason || null
      });

      res.json(document);
    } catch (error) {
      res.status(500).json({ error: "Failed to verify document" });
    }
  });

  app.post("/api/admin/onboarding/:sessionId/advance-day", authenticate, requireRole(['insurance']), async (req: AuthenticatedRequest, res) => {
    try {
      const sessionId = Number(req.params.id);
      const { reason } = req.body;

      const session = await storage.getOnboardingSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Onboarding session not found" });
      }

      const nextDay = Math.min(session.currentDay + 1, 7);

      await storage.updateOnboardingSession(sessionId, { currentDay: nextDay });
      await storage.createOnboardingTasksForDay(session.memberId, nextDay);

      const nextTasks = await storage.getOnboardingTasksBySessionAndDay(sessionId, nextDay);

      res.json({
        nextDay,
        tasks: nextTasks,
        advancedBy: req.user?.userId,
        reason
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to advance onboarding day" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
