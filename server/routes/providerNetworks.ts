// Provider Network Management Routes
// Comprehensive provider lifecycle management with credentialing, contracts, and performance tracking

import { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import {
  providers,
  members,
  claims,
  schemes,
  companies,
  auditLogs,
  communicationLogs
} from "../../shared/schema.js";
import { eq, and, desc, asc, ilike, or, inArray, isNotNull, gte, lte } from "drizzle-orm";

// Provider validation schemas
const createProviderSchema = z.object({
  npiNumber: z.string().min(10, "NPI number must be at least 10 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  specialization: z.string().min(1, "Specialization is required"),
  specialties: z.array(z.string()).default([]),
  credentials: z.array(z.object({
    type: z.string(),
    number: z.string(),
    issuedBy: z.string(),
    issuedDate: z.string(),
    expiryDate: z.string()
  })).default([]),
  locations: z.array(z.object({
    name: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    phone: z.string(),
    fax: z.string().optional(),
    isPrimary: z.boolean().default(false)
  })).default([]),
  taxId: z.string().min(9, "Tax ID is required"),
  entityType: z.enum(["individual", "group", "facility"]),
  networkTier: z.enum(["tier1", "tier2", "tier3"]).default("tier1"),
  participationLevel: z.enum(["full", "partial", "limited"]).default("full"),
  acceptanceStatus: z.enum(["new", "medicare", "medicaid", "private", "combo"]).default("private")
});

const updateProviderSchema = createProviderSchema.partial();

const createContractSchema = z.object({
  providerId: z.number(),
  contractType: z.enum(["standard", "capitation", "bundled", "global"]),
  reimbursementMethod: z.enum(["fee_for_service", "capitation", "bundled", "value_based"]),
  standardRates: z.array(z.object({
    serviceCode: z.string(),
    serviceName: z.string(),
    standardRate: z.number(),
    contractedRate: z.number(),
    effectiveDate: z.string()
  })).default([]),
  capitationRate: z.number().optional(),
  globalFee: z.number().optional(),
  bundledServices: z.array(z.string()).optional(),
  qualityMetrics: z.array(z.object({
    metric: z.string(),
    target: z.number(),
    weight: z.number()
  })).default([]),
  performanceBonuses: z.array(z.object({
    metric: z.string(),
    threshold: z.number(),
    bonus: z.number()
  })).default([]),
  startDate: z.string(),
  endDate: z.string(),
  terms: z.string(),
  status: z.enum(["draft", "pending_approval", "active", "expired", "terminated"]).default("draft")
});

const providerSearchSchema = z.object({
  query: z.string().optional(),
  specialization: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  networkTier: z.enum(["tier1", "tier2", "tier3"]).optional(),
  participationLevel: z.enum(["full", "partial", "limited"]).optional(),
  networkStatus: z.enum(["active", "pending", "inactive", "suspended"]).optional(),
  radius: z.number().optional(),
  page: z.number().default(1),
  limit: z.number().default(20)
});

export function setupProviderNetworkRoutes(app: any) {
  // Provider Directory - Search and list providers
  app.get("/api/providers", async (req: Request, res: Response) => {
    try {
      const searchParams = providerSearchSchema.parse(req.query);

      // Build search conditions
      const conditions = [];

      if (searchParams.query) {
        conditions.push(
          or(
            ilike(providers.firstName, `%${searchParams.query}%`),
            ilike(providers.lastName, `%${searchParams.query}%`),
            ilike(providers.specialization, `%${searchParams.query}%`),
            ilike(providers.email, `%${searchParams.query}%`)
          )
        );
      }

      if (searchParams.specialization) {
        conditions.push(ilike(providers.specialization, `%${searchParams.specialization}%`));
      }

      if (searchParams.networkTier) {
        conditions.push(eq(providers.networkTier, searchParams.networkTier));
      }

      if (searchParams.participationLevel) {
        conditions.push(eq(providers.participationLevel, searchParams.participationLevel));
      }

      if (searchParams.networkStatus) {
        conditions.push(eq(providers.networkStatus, searchParams.networkStatus));
      }

      // Location-based search
      if (searchParams.city || searchParams.state || searchParams.zipCode) {
        // TODO: Implement location search on provider locations
        // This would require parsing the locations JSON field
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count for pagination
      const totalCount = await storage.db
        .select({ count: providers.id })
        .from(providers)
        .where(whereClause);

      // Get providers with pagination
      const providersList = await storage.db
        .select()
        .from(providers)
        .where(whereClause)
        .orderBy(
          searchParams.networkStatus === 'active' ? desc(providers.networkStatus) : asc(providers.lastName),
          asc(providers.firstName)
        )
        .limit(searchParams.limit)
        .offset((searchParams.page - 1) * searchParams.limit);

      // Calculate performance metrics for each provider
      const providersWithMetrics = await Promise.all(
        providersList.map(async (provider) => {
          const recentClaims = await storage.db
            .select()
            .from(claims)
            .where(and(
              eq(claims.providerId, provider.id),
              eq(claims.status, 'approved')
            ))
            .orderBy(desc(claims.createdAt))
            .limit(10);

          const performanceMetrics = {
            totalClaims: recentClaims.length,
            averageProcessingTime: recentClaims.length > 0
              ? recentClaims.reduce((sum, claim) => {
                  const processingTime = claim.processedAt
                    ? Math.ceil((new Date(claim.processedAt).getTime() - new Date(claim.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                    : 0;
                  return sum + processingTime;
                }, 0) / recentClaims.length
              : 0,
            averageClaimAmount: recentClaims.length > 0
              ? recentClaims.reduce((sum, claim) => sum + (claim.totalAmount || 0), 0) / recentClaims.length
              : 0,
            satisfactionScore: provider.satisfactionScore || 0,
            qualityScore: provider.qualityScore || 0,
            complianceScore: provider.complianceScore || 0
          };

          return {
            ...provider,
            performanceMetrics,
            locations: provider.locations ? JSON.parse(provider.locations as string) : []
          };
        })
      );

      res.json({
        success: true,
        data: {
          providers: providersWithMetrics,
          pagination: {
            page: searchParams.page,
            limit: searchParams.limit,
            total: totalCount.length,
            totalPages: Math.ceil(totalCount.length / searchParams.limit)
          }
        },
        message: "Provider directory retrieved successfully"
      });

    } catch (error) {
      console.error("Provider directory error:", error);
      res.status(500).json({ error: "Failed to retrieve provider directory" });
    }
  });

  // Create new provider (Onboarding)
  app.post("/api/providers", async (req: Request, res: Response) => {
    try {
      const providerData = createProviderSchema.parse(req.body);

      // Check for existing NPI
      const existingProvider = await storage.db
        .select()
        .from(providers)
        .where(eq(providers.npiNumber, providerData.npiNumber))
        .limit(1);

      if (existingProvider.length > 0) {
        return res.status(400).json({ error: "Provider with this NPI number already exists" });
      }

      // Check for existing email
      const existingEmail = await storage.db
        .select()
        .from(providers)
        .where(eq(providers.email, providerData.email))
        .limit(1);

      if (existingEmail.length > 0) {
        return res.status(400).json({ error: "Provider with this email already exists" });
      }

      // Create provider with pending status
      const newProvider = await storage.db.insert(providers).values({
        npiNumber: providerData.npiNumber,
        firstName: providerData.firstName,
        lastName: providerData.lastName,
        email: providerData.email,
        phone: providerData.phone,
        specialization: providerData.specialization,
        specialties: providerData.specialties,
        credentials: providerData.credentials,
        locations: providerData.locations,
        taxId: providerData.taxId,
        entityType: providerData.entityType,
        networkTier: providerData.networkTier,
        participationLevel: providerData.participationLevel,
        acceptanceStatus: providerData.acceptanceStatus,
        networkStatus: 'pending',
        contractStatus: 'pending',
        credentialingStatus: 'in_progress',
        satisfactionScore: 0,
        qualityScore: 0,
        complianceScore: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Log provider creation
      await storage.db.insert(auditLogs).values({
        entityType: 'provider',
        entityId: newProvider[0].id,
        action: 'create',
        oldValues: null,
        newValues: JSON.stringify({
          providerData,
          timestamp: new Date().toISOString()
        }),
        performedBy: 1, // TODO: Get actual user ID
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'System',
        description: `New provider onboarded: ${providerData.firstName} ${providerData.lastName}`
      });

      // Send welcome notification
      await storage.db.insert(communicationLogs).values({
        entityType: 'provider',
        entityId: newProvider[0].id,
        communicationType: 'provider_onboarding',
        channel: 'email',
        subject: 'Welcome to Our Provider Network',
        content: `Dear ${providerData.firstName} ${providerData.lastName},\n\nThank you for your interest in joining our provider network. Your application has been received and is currently under review. You will be notified of any updates or additional requirements.\n\nBest regards,\nProvider Network Team`,
        status: 'sent',
        sentAt: new Date(),
        createdAt: new Date()
      });

      res.status(201).json({
        success: true,
        data: newProvider[0],
        message: "Provider application submitted successfully"
      });

    } catch (error) {
      console.error("Provider creation error:", error);
      res.status(500).json({ error: "Failed to create provider" });
    }
  });

  // Get provider by ID
  app.get("/api/providers/:id", async (req: Request, res: Response) => {
    try {
      const providerId = parseInt(req.params.id);

      const provider = await storage.db
        .select()
        .from(providers)
        .where(eq(providers.id, providerId))
        .limit(1);

      if (!provider.length) {
        return res.status(404).json({ error: "Provider not found" });
      }

      const providerData = provider[0];

      // Get provider's recent claims
      const recentClaims = await storage.db
        .select({
          claim: claims,
          member: members
        })
        .from(claims)
        .leftJoin(members, eq(claims.memberId, members.id))
        .where(eq(claims.providerId, providerId))
        .orderBy(desc(claims.createdAt))
        .limit(20);

      // Calculate comprehensive metrics
      const allClaims = await storage.db
        .select()
        .from(claims)
        .where(eq(claims.providerId, providerId));

      const metrics = {
        totalClaims: allClaims.length,
        approvedClaims: allClaims.filter(c => c.status === 'approved').length,
        deniedClaims: allClaims.filter(c => c.status === 'denied').length,
        pendingClaims: allClaims.filter(c => c.status === 'pending').length,
        totalAmount: allClaims.reduce((sum, c) => sum + (c.totalAmount || 0), 0),
        averageProcessingTime: allClaims.filter(c => c.processedAt).reduce((sum, claim) => {
          return sum + Math.ceil((new Date(claim.processedAt!).getTime() - new Date(claim.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        }, 0) / allClaims.filter(c => c.processedAt).length || 0,
        denialRate: allClaims.length > 0 ? (allClaims.filter(c => c.status === 'denied').length / allClaims.length) * 100 : 0
      };

      const providerWithDetails = {
        ...providerData,
        locations: providerData.locations ? JSON.parse(providerData.locations as string) : [],
        credentials: providerData.credentials ? JSON.parse(providerData.credentials as string) : [],
        specialties: providerData.specialties ? JSON.parse(providerData.specialties as string) : [],
        metrics,
        recentClaims: recentClaims.map(rc => ({
          ...rc.claim,
          memberName: rc.member ? `${rc.member.firstName} ${rc.member.lastName}` : 'Unknown'
        }))
      };

      res.json({
        success: true,
        data: providerWithDetails,
        message: "Provider details retrieved successfully"
      });

    } catch (error) {
      console.error("Provider details error:", error);
      res.status(500).json({ error: "Failed to retrieve provider details" });
    }
  });

  // Update provider information
  app.put("/api/providers/:id", async (req: Request, res: Response) => {
    try {
      const providerId = parseInt(req.params.id);
      const updateData = updateProviderSchema.parse(req.body);

      // Check if provider exists
      const existingProvider = await storage.db
        .select()
        .from(providers)
        .where(eq(providers.id, providerId))
        .limit(1);

      if (!existingProvider.length) {
        return res.status(404).json({ error: "Provider not found" });
      }

      // Check for conflicts with email/NPI if being updated
      if (updateData.email || updateData.npiNumber) {
        const conflictChecks = [];

        if (updateData.email && updateData.email !== existingProvider[0].email) {
          conflictChecks.push(
            storage.db
              .select()
              .from(providers)
              .where(and(
                eq(providers.email, updateData.email),
                eq(providers.networkStatus, 'active')
              ))
              .limit(1)
          );
        }

        if (updateData.npiNumber && updateData.npiNumber !== existingProvider[0].npiNumber) {
          conflictChecks.push(
            storage.db
              .select()
              .from(providers)
              .where(and(
                eq(providers.npiNumber, updateData.npiNumber),
                eq(providers.networkStatus, 'active')
              ))
              .limit(1)
          );
        }

        const conflicts = await Promise.all(conflictChecks);
        if (conflicts.some(conflict => conflict.length > 0)) {
          return res.status(400).json({ error: "Email or NPI number already in use" });
        }
      }

      // Update provider
      const updatedProvider = await storage.db
        .update(providers)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(providers.id, providerId))
        .returning();

      // Log update
      await storage.db.insert(auditLogs).values({
        entityType: 'provider',
        entityId: providerId,
        action: 'update',
        oldValues: JSON.stringify(existingProvider[0]),
        newValues: JSON.stringify({
          updateData,
          timestamp: new Date().toISOString()
        }),
        performedBy: 1, // TODO: Get actual user ID
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'System',
        description: `Provider updated: ${updateData.firstName || existingProvider[0].firstName} ${updateData.lastName || existingProvider[0].lastName}`
      });

      res.json({
        success: true,
        data: updatedProvider[0],
        message: "Provider information updated successfully"
      });

    } catch (error) {
      console.error("Provider update error:", error);
      res.status(500).json({ error: "Failed to update provider" });
    }
  });

  // Delete/terminate provider
  app.delete("/api/providers/:id", async (req: Request, res: Response) => {
    try {
      const providerId = parseInt(req.params.id);

      const provider = await storage.db
        .select()
        .from(providers)
        .where(eq(providers.id, providerId))
        .limit(1);

      if (!provider.length) {
        return res.status(404).json({ error: "Provider not found" });
      }

      // Check for active claims
      const activeClaims = await storage.db
        .select()
        .from(claims)
        .where(and(
          eq(claims.providerId, providerId),
          inArray(claims.status, ['pending', 'in_review', 'approved'])
        ))
        .limit(1);

      if (activeClaims.length > 0) {
        return res.status(400).json({
          error: "Cannot terminate provider with active claims. Please resolve all active claims first."
        });
      }

      // Update provider status to terminated
      const terminatedProvider = await storage.db
        .update(providers)
        .set({
          networkStatus: 'terminated',
          contractStatus: 'terminated',
          terminatedAt: new Date(),
          terminationReason: 'Administrative termination',
          updatedAt: new Date()
        })
        .where(eq(providers.id, providerId))
        .returning();

      // Log termination
      await storage.db.insert(auditLogs).values({
        entityType: 'provider',
        entityId: providerId,
        action: 'terminate',
        oldValues: JSON.stringify(provider[0]),
        newValues: JSON.stringify({
          status: 'terminated',
          timestamp: new Date().toISOString()
        }),
        performedBy: 1, // TODO: Get actual user ID
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'System',
        description: `Provider terminated: ${provider[0].firstName} ${provider[0].lastName}`
      });

      res.json({
        success: true,
        data: terminatedProvider[0],
        message: "Provider terminated successfully"
      });

    } catch (error) {
      console.error("Provider termination error:", error);
      res.status(500).json({ error: "Failed to terminate provider" });
    }
  });

  // Get provider contracts
  app.get("/api/providers/:id/contracts", async (req: Request, res: Response) => {
    try {
      const providerId = parseInt(req.params.id);

      const provider = await storage.db
        .select()
        .from(providers)
        .where(eq(providers.id, providerId))
        .limit(1);

      if (!provider.length) {
        return res.status(404).json({ error: "Provider not found" });
      }

      // Note: This assumes we have a contracts table, for now we'll return contract info from provider record
      const contractInfo = {
        providerId,
        contractStatus: provider[0].contractStatus,
        contractType: provider[0].contractType || 'standard',
        reimbursementRate: provider[0].reimbursementRate,
        capitationRate: provider[0].capitationRate,
        contractStartDate: provider[0].contractStartDate,
        contractEndDate: provider[0].contractEndDate,
        terms: provider[0].contractTerms || null
      };

      res.json({
        success: true,
        data: contractInfo,
        message: "Provider contract information retrieved successfully"
      });

    } catch (error) {
      console.error("Provider contracts error:", error);
      res.status(500).json({ error: "Failed to retrieve provider contracts" });
    }
  });

  // Create new contract for provider
  app.post("/api/providers/:id/contracts", async (req: Request, res: Response) => {
    try {
      const providerId = parseInt(req.params.id);
      const contractData = createContractSchema.parse({ ...req.body, providerId });

      const provider = await storage.db
        .select()
        .from(providers)
        .where(eq(providers.id, providerId))
        .limit(1);

      if (!provider.length) {
        return res.status(404).json({ error: "Provider not found" });
      }

      // Update provider with contract information
      const updatedProvider = await storage.db
        .update(providers)
        .set({
          contractType: contractData.contractType,
          reimbursementMethod: contractData.reimbursementMethod,
          reimbursementRate: contractData.standardRates.length > 0 ? contractData.standardRates[0].contractedRate : null,
          capitationRate: contractData.capitationRate,
          contractStartDate: contractData.startDate,
          contractEndDate: contractData.endDate,
          contractTerms: contractData.terms,
          contractStatus: contractData.status,
          updatedAt: new Date()
        })
        .where(eq(providers.id, providerId))
        .returning();

      // Log contract creation
      await storage.db.insert(auditLogs).values({
        entityType: 'provider',
        entityId: providerId,
        action: 'contract_create',
        oldValues: JSON.stringify(provider[0]),
        newValues: JSON.stringify({
          contractData,
          timestamp: new Date().toISOString()
        }),
        performedBy: 1, // TODO: Get actual user ID
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'System',
        description: `Contract created for provider: ${provider[0].firstName} ${provider[0].lastName}`
      });

      res.status(201).json({
        success: true,
        data: updatedProvider[0],
        message: "Provider contract created successfully"
      });

    } catch (error) {
      console.error("Contract creation error:", error);
      res.status(500).json({ error: "Failed to create provider contract" });
    }
  });

  // Get provider performance metrics
  app.get("/api/providers/:id/performance", async (req: Request, res: Response) => {
    try {
      const providerId = parseInt(req.params.id);
      const period = req.query.period as string || '12months'; // 3months, 6months, 12months, all

      const provider = await storage.db
        .select()
        .from(providers)
        .where(eq(providers.id, providerId))
        .limit(1);

      if (!provider.length) {
        return res.status(404).json({ error: "Provider not found" });
      }

      // Calculate date range based on period
      const now = new Date();
      let startDate = new Date();

      switch (period) {
        case '3months':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case '6months':
          startDate.setMonth(now.getMonth() - 6);
          break;
        case '12months':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate = new Date(0); // All time
      }

      // Get claims for the period
      const periodClaims = await storage.db
        .select()
        .from(claims)
        .where(and(
          eq(claims.providerId, providerId),
          gte(claims.createdAt, startDate)
        ))
        .orderBy(desc(claims.createdAt));

      // Calculate performance metrics
      const totalClaims = periodClaims.length;
      const approvedClaims = periodClaims.filter(c => c.status === 'approved').length;
      const deniedClaims = periodClaims.filter(c => c.status === 'denied').length;
      const totalAmount = periodClaims.reduce((sum, c) => sum + (c.totalAmount || 0), 0);

      const performanceMetrics = {
        period,
        totalClaims,
        approvedClaims,
        deniedClaims,
        approvalRate: totalClaims > 0 ? (approvedClaims / totalClaims) * 100 : 0,
        denialRate: totalClaims > 0 ? (deniedClaims / totalClaims) * 100 : 0,
        totalReimbursed: totalAmount,
        averageClaimAmount: totalClaims > 0 ? totalAmount / totalClaims : 0,
        averageProcessingTime: periodClaims.filter(c => c.processedAt).reduce((sum, claim) => {
          return sum + Math.ceil((new Date(claim.processedAt!).getTime() - new Date(claim.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        }, 0) / periodClaims.filter(c => c.processedAt).length || 0,
        qualityScores: {
          overall: provider[0].qualityScore || 0,
          satisfaction: provider[0].satisfactionScore || 0,
          compliance: provider[0].complianceScore || 0
        },
        monthlyTrends: calculateMonthlyTrends(periodClaims)
      };

      res.json({
        success: true,
        data: performanceMetrics,
        message: "Provider performance metrics retrieved successfully"
      });

    } catch (error) {
      console.error("Provider performance error:", error);
      res.status(500).json({ error: "Failed to retrieve provider performance" });
    }
  });

  // Get provider utilization analytics
  app.get("/api/providers/:id/utilization", async (req: Request, res: Response) => {
    try {
      const providerId = parseInt(req.params.id);
      const period = req.query.period as string || '12months';

      const provider = await storage.db
        .select()
        .from(providers)
        .where(eq(providers.id, providerId))
        .limit(1);

      if (!provider.length) {
        return res.status(404).json({ error: "Provider not found" });
      }

      // Get utilization data
      const utilizationData = await getProviderUtilizationData(providerId, period);

      res.json({
        success: true,
        data: utilizationData,
        message: "Provider utilization analytics retrieved successfully"
      });

    } catch (error) {
      console.error("Provider utilization error:", error);
      res.status(500).json({ error: "Failed to retrieve provider utilization" });
    }
  });

  // Update provider network status
  app.post("/api/providers/:id/network-status", async (req: Request, res: Response) => {
    try {
      const providerId = parseInt(req.params.id);
      const { networkStatus, reason, effectiveDate } = req.body;

      const provider = await storage.db
        .select()
        .from(providers)
        .where(eq(providers.id, providerId))
        .limit(1);

      if (!provider.length) {
        return res.status(404).json({ error: "Provider not found" });
      }

      const oldStatus = provider[0].networkStatus;

      // Update network status
      const updatedProvider = await storage.db
        .update(providers)
        .set({
          networkStatus,
          networkStatusReason: reason || null,
          networkStatusEffectiveDate: effectiveDate || new Date(),
          updatedAt: new Date()
        })
        .where(eq(providers.id, providerId))
        .returning();

      // Log status change
      await storage.db.insert(auditLogs).values({
        entityType: 'provider',
        entityId: providerId,
        action: 'network_status_change',
        oldValues: JSON.stringify({ networkStatus: oldStatus }),
        newValues: JSON.stringify({
          networkStatus,
          reason,
          effectiveDate,
          timestamp: new Date().toISOString()
        }),
        performedBy: 1, // TODO: Get actual user ID
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'System',
        description: `Provider network status changed from ${oldStatus} to ${networkStatus}: ${provider[0].firstName} ${provider[0].lastName}`
      });

      // Send notification about status change
      await storage.db.insert(communicationLogs).values({
        entityType: 'provider',
        entityId: providerId,
        communicationType: 'network_status_change',
        channel: 'email',
        subject: 'Network Status Update',
        content: `Dear ${provider[0].firstName} ${provider[0].lastName},\n\nYour network status has been updated to: ${networkStatus}.\n\n${reason ? `Reason: ${reason}` : ''}\n\nEffective date: ${effectiveDate || new Date().toLocaleDateString()}\n\nBest regards,\nProvider Network Team`,
        status: 'sent',
        sentAt: new Date(),
        createdAt: new Date()
      });

      res.json({
        success: true,
        data: updatedProvider[0],
        message: "Provider network status updated successfully"
      });

    } catch (error) {
      console.error("Network status update error:", error);
      res.status(500).json({ error: "Failed to update provider network status" });
    }
  });
}

// Helper functions
function calculateMonthlyTrends(claims: any[]) {
  const monthlyData: Record<string, any> = {};

  claims.forEach(claim => {
    const month = new Date(claim.createdAt).toISOString().slice(0, 7); // YYYY-MM

    if (!monthlyData[month]) {
      monthlyData[month] = {
        month,
        totalClaims: 0,
        approvedClaims: 0,
        deniedClaims: 0,
        totalAmount: 0
      };
    }

    monthlyData[month].totalClaims++;
    monthlyData[month].totalAmount += claim.totalAmount || 0;

    if (claim.status === 'approved') {
      monthlyData[month].approvedClaims++;
    } else if (claim.status === 'denied') {
      monthlyData[month].deniedClaims++;
    }
  });

  return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
}

async function getProviderUtilizationData(providerId: number, period: string) {
  // Calculate date range
  const now = new Date();
  let startDate = new Date();

  switch (period) {
    case '3months':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case '6months':
      startDate.setMonth(now.getMonth() - 6);
      break;
    case '12months':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate = new Date(0);
  }

  // Get claims for utilization analysis
  const claims = await storage.db
    .select({
      claim: claims,
      member: members
    })
    .from(claims)
    .leftJoin(members, eq(claims.memberId, members.id))
    .where(and(
      eq(claims.providerId, providerId),
      gte(claims.createdAt, startDate)
    ));

  // Analyze utilization patterns
  const serviceTypeBreakdown = claims.reduce((acc, { claim }) => {
    const serviceType = claim.serviceType || 'unknown';
    acc[serviceType] = (acc[serviceType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const procedureCodeBreakdown = claims.reduce((acc, { claim }) => {
    const code = claim.procedureCode || 'unknown';
    acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const memberFrequency = claims.reduce((acc, { claim, member }) => {
    if (member) {
      const memberId = member.id;
      const memberName = `${member.firstName} ${member.lastName}`;
      acc[memberId] = {
        name: memberName,
        visits: (acc[memberId]?.visits || 0) + 1,
        totalAmount: (acc[memberId]?.totalAmount || 0) + (claim.totalAmount || 0)
      };
    }
    return acc;
  }, {} as Record<string, any>);

  return {
    period,
    totalServices: claims.length,
    uniqueMembers: Object.keys(memberFrequency).length,
    averageVisitsPerMember: Object.keys(memberFrequency).length > 0 ? claims.length / Object.keys(memberFrequency).length : 0,
    serviceTypeBreakdown,
    topProcedures: Object.entries(procedureCodeBreakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([code, count]) => ({ procedureCode: code, count })),
    topMembers: Object.entries(memberFrequency)
      .sort(([, a], [, b]) => b.visits - a.visits)
      .slice(0, 10)
      .map(([id, data]) => ({ memberId: parseInt(id), ...data })),
    revenueMetrics: {
      totalRevenue: claims.reduce((sum, { claim }) => sum + (claim.totalAmount || 0), 0),
      averageRevenuePerService: claims.length > 0 ? claims.reduce((sum, { claim }) => sum + (claim.totalAmount || 0), 0) / claims.length : 0,
      revenueByServiceType: claims.reduce((acc, { claim }) => {
        const serviceType = claim.serviceType || 'unknown';
        acc[serviceType] = (acc[serviceType] || 0) + (claim.totalAmount || 0);
        return acc;
      }, {} as Record<string, number>)
    }
  };
}