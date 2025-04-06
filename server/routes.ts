import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertCompanySchema, 
  insertPrincipalMemberSchema,
  insertDependentMemberSchema, 
  insertPeriodSchema, 
  insertPremiumRateSchema, 
  insertPremiumSchema 
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
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
      const member = await storage.createMember(req.body);
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
      
      const member = await storage.createMember(validatedData);
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

  // Periods
  app.get("/api/periods", async (req, res) => {
    try {
      const periods = await storage.getPeriods();
      res.json(periods);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch periods" });
    }
  });

  app.get("/api/periods/active", async (req, res) => {
    try {
      const period = await storage.getActivePeriod();
      if (!period) {
        return res.status(404).json({ error: "No active period found" });
      }
      res.json(period);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active period" });
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
        activePeriod,
        recentRegistrations
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
