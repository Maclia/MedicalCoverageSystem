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
  insertClaimSchema
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import * as premiumCalculator from "./utils/premiumCalculator";
import { addDays, differenceInYears, parseISO } from "date-fns";

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

  // API Routes
  // Companies
  app.get("/api/companies", async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  app.get("/api/companies/:id", async (req, res) => {
    try {
      const company = await storage.getCompany(Number(req.params.id));
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company" });
    }
  });

  app.post("/api/companies", validateRequest(insertCompanySchema), async (req, res) => {
    try {
      const company = await storage.createCompany(req.body);
      res.status(201).json(company);
    } catch (error) {
      res.status(500).json({ error: "Failed to create company" });
    }
  });

  // Members
  app.get("/api/members", async (req, res) => {
    try {
      let members;
      if (req.query.companyId) {
        members = await storage.getMembersByCompany(Number(req.query.companyId));
      } else {
        members = await storage.getMembers();
      }
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });
  
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

  const httpServer = createServer(app);
  return httpServer;
}
