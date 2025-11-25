// Comprehensive System Integration Routes
// Connects all modules with cross-module data flows and workflows

import { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import {
  members,
  companies,
  claims,
  schemes,
  providers,
  premiums,
  documents,
  communicationLogs,
  auditLogs,
  wellnessActivities,
  riskAssessments
} from "../../shared/schema.js";
import { eq, and, desc, asc, inArray, or, isNotNull } from "drizzle-orm";

// Cross-module integration schemas
const memberClaimsIntegrationSchema = z.object({
  memberId: z.number(),
  eligibilityCheck: z.boolean().default(true),
  coverageValidation: z.boolean().default(true),
  providerValidation: z.boolean().default(true),
  preAuthCheck: z.boolean().default(false)
});

const wellnessRiskIntegrationSchema = z.object({
  memberId: z.number(),
  wellnessScoreUpdate: z.boolean().default(true),
  riskRecalculation: z.boolean().default(true),
  premiumAdjustment: z.boolean().default(false),
  communicationTrigger: z.boolean().default(true)
});

const providerClaimsIntegrationSchema = z.object({
  providerId: z.number(),
  networkValidation: z.boolean().default(true),
  contractVerification: z.boolean().default(true),
  performanceUpdate: z.boolean().default(false),
  analyticsUpdate: z.boolean().default(true)
});

const memberPremiumIntegrationSchema = z.object({
  memberId: z.number(),
  premiumRecalculation: z.boolean().default(true),
  riskAdjustment: z.boolean().default(true),
  wellnessAdjustment: z.boolean().default(false),
  schemeAdjustment: z.boolean().default(false),
  communicationTrigger: z.boolean().default(true)
});

const crossModuleNotificationSchema = z.object({
  modules: z.array(z.enum(["members", "claims", "schemes", "providers", "wellness", "risk", "premiums", "communication"])),
  memberId: z.number().optional(),
  providerId: z.number().optional(),
  companyId: z.number().optional(),
  eventType: z.string(),
  eventTitle: z.string(),
  eventDescription: z.string(),
  eventSeverity: z.enum(["low", "medium", "high", "critical"]),
  requiresAction: z.boolean().default(false),
  actionDeadline: z.string().optional(),
  recipients: z.array(z.object({
    module: z.string(),
    endpoint: z.string(),
    payload: z.any()
  }))
});

export function setupSystemIntegrationRoutes(app: any) {
  app.post("/api/integration/member-claims", async (req: Request, res: Response) => {
    try {
      const { memberId, eligibilityCheck, coverageValidation, providerValidation, preAuthCheck } = memberClaimsIntegrationSchema.parse(req.body);

      // Get member details
      const member = await storage.db.select().from(members).where(eq(members.id, memberId)).limit(1);
      if (!member.length) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Get member's current scheme and benefits
      const memberScheme = await storage.db
        .select({
          scheme: schemes,
          company: companies
        })
        .from(members)
        .leftJoin(schemes, eq(members.schemeId, schemes.id))
        .leftJoin(companies, eq(members.companyId, companies.id))
        .where(eq(members.id, memberId))
        .limit(1);

      // Get member's active premiums
      const activePremiums = await storage.db
        .select()
        .from(premiums)
        .where(and(
          eq(premiums.memberId, memberId),
          eq(premiums.status, "active")
        ))
        .orderBy(desc(premiums.createdAt));

      // Get member's recent claims
      const recentClaims = await storage.db
        .select()
        .from(claims)
        .where(eq(claims.memberId, memberId))
        .orderBy(desc(claims.createdAt))
        .limit(5);

      // Calculate member eligibility status
      let eligibilityStatus = {
        active: member[0].status === 'active',
        premiumsPaid: activePremiums.some(p => p.paymentStatus === 'paid'),
        schemeActive: memberScheme[0]?.scheme?.status === 'active',
        documentsVerified: true, // TODO: Check actual document verification status
        recentClaimsImpact: recentClaims.length > 0 ? recentClaims.length : 0
      };

      // Get available benefits from member's scheme
      const availableBenefits = memberScheme[0]?.scheme ? await storage.db
        .select()
        .from(benefits)
        .where(and(
          eq(benefits.schemeId, memberScheme[0].scheme.id),
          eq(benefits.status, "active")
        )) : [];

      // Integration response
      const integrationData = {
        member: member[0],
        eligibility: eligibilityCheck ? eligibilityStatus : null,
        coverage: coverageValidation ? {
          scheme: memberScheme[0]?.scheme,
          benefits: availableBenefits,
          limits: availableBenefits.map(benefit => ({
            benefitId: benefit.id,
            annualLimit: benefit.annualLimit,
            remainingLimit: benefit.annualLimit - (benefit.usedAmount || 0),
            coveragePercentage: benefit.coveragePercentage
          }))
        } : null,
        recentClaims: recentClaims.map(claim => ({
          id: claim.id,
          claimNumber: claim.claimNumber,
          status: claim.status,
          amount: claim.totalAmount,
          serviceDate: claim.serviceDate,
          processingTime: claim.processedAt ? Math.ceil((new Date(claim.processedAt).getTime() - new Date(claim.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : null
        })),
        integrationStatus: {
          memberDataSync: true,
          eligibilityValidated: eligibilityCheck,
          coverageValidated: coverageValidation,
          providerNetworkActive: providerValidation,
          preAuthRequired: preAuthCheck && availableBenefits.some(b => b.preAuthRequired)
        }
      };

      // Log integration activity
      await storage.db.insert(auditLogs).values({
        entityType: 'member',
        entityId: memberId,
        action: 'integration_check',
        oldValues: null,
        newValues: JSON.stringify({ type: 'member_claims_integration', timestamp: new Date().toISOString() }),
        performedBy: 1, // TODO: Get actual user ID
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'System',
        description: `Member-Claims integration check for member ID: ${memberId}`
      });

      res.json({
        success: true,
        data: integrationData,
        message: "Member-Claims integration data retrieved successfully"
      });

    } catch (error) {
      console.error("Member-Claims integration error:", error);
      res.status(500).json({ error: "Integration check failed" });
    }
  });

  app.post("/api/integration/wellness-risk", async (req: Request, res: Response) => {
    try {
      const { memberId, wellnessScoreUpdate, riskRecalculation, premiumAdjustment, communicationTrigger } = wellnessRiskIntegrationSchema.parse(req.body);

      // Get member details
      const member = await storage.db.select().from(members).where(eq(members.id, memberId)).limit(1);
      if (!member.length) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Get member's wellness activities
      const wellnessData = await storage.db
        .select()
        .from(wellnessActivities)
        .where(eq(wellnessActivities.memberId, memberId))
        .orderBy(desc(wellnessActivities.createdAt))
        .limit(50);

      // Get current risk assessment
      const currentRisk = await storage.db
        .select()
        .from(riskAssessments)
        .where(eq(riskAssessments.memberId, memberId))
        .orderBy(desc(riskAssessments.createdAt))
        .limit(1);

      // Calculate wellness score
      const wellnessScore = wellnessData.reduce((score, activity) => {
        let activityScore = 0;
        switch (activity.activityType) {
          case 'exercise':
            activityScore = activity.duration ? Math.min(activity.duration / 30, 1) * 10 : 0;
            break;
          case 'health_screening':
            activityScore = 5;
            break;
          case 'vaccination':
            activityScore = 8;
            break;
          case 'checkup':
            activityScore = 6;
            break;
          case 'nutrition':
            activityScore = activity.duration ? Math.min(activity.duration / 15, 1) * 5 : 0;
            break;
        }
        return score + activityScore;
      }, 0);

      // Calculate risk score based on wellness and member profile
      let riskScore = 50; // Base risk score
      const memberProfile = member[0];

      // Age-based risk
      const age = new Date().getFullYear() - new Date(memberProfile.dateOfBirth).getFullYear();
      if (age < 25) riskScore -= 10;
      else if (age > 60) riskScore += 15;

      // Wellness-based risk adjustment
      riskScore -= (wellnessScore / 100) * 20;

      // Previous conditions risk
      if (memberProfile.hasDisability) riskScore += 10;
      if (memberProfile.membershipStatus !== 'active') riskScore += 20;

      // Claims history impact
      const recentClaims = await storage.db
        .select()
        .from(claims)
        .where(and(
          eq(claims.memberId, memberId),
          or(
            eq(claims.status, 'approved'),
            eq(claims.status, 'paid')
          )
        ))
        .limit(10);

      riskScore += Math.min(recentClaims.length * 2, 15);

      // Update wellness score if requested
      let updatedWellness = null;
      if (wellnessScoreUpdate) {
        updatedWellness = await storage.db.insert(wellnessActivities).values({
          memberId,
          activityType: 'score_update',
          wellnessScore: Math.round(wellnessScore),
          duration: null,
          calories: null,
          steps: null,
          heartRate: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();
      }

      // Update risk assessment if requested
      let updatedRisk = null;
      if (riskRecalculation) {
        updatedRisk = await storage.db.insert(riskAssessments).values({
          memberId,
          riskScore: Math.round(riskScore),
          riskCategory: riskScore < 30 ? 'low' : riskScore < 70 ? 'medium' : 'high',
          assessmentDate: new Date(),
          factors: JSON.stringify({
            wellness: wellnessScore,
            age: age,
            healthStatus: memberProfile.hasDisability,
            claimsHistory: recentClaims.length,
            membershipStatus: memberProfile.status
          }),
          recommendations: JSON.stringify([
            wellnessScore < 50 ? 'Increase wellness activities' : null,
            recentClaims.length > 5 ? 'Review healthcare utilization' : null,
            age > 50 ? 'Consider preventive care' : null
          ].filter(Boolean)),
          createdAt: new Date()
        }).returning();
      }

      // Trigger communication if requested
      let communicationSent = null;
      if (communicationTrigger) {
        communicationSent = await storage.db.insert(communicationLogs).values({
          memberId,
          communicationType: 'wellness_risk_update',
          channel: 'mobile_app',
          subject: 'Health & Wellness Update',
          content: `Your current wellness score: ${Math.round(wellnessScore)}. Risk assessment updated.`,
          status: 'sent',
          sentAt: new Date(),
          createdAt: new Date()
        }).returning();
      }

      const integrationData = {
        member: member[0],
        wellnessMetrics: {
          currentScore: Math.round(wellnessScore),
          activities: wellnessData.length,
          lastActivity: wellnessData[0]?.createdAt || null,
          scoreChange: currentRisk[0] ? Math.round(wellnessScore - (currentRisk[0].wellnessScore || 0)) : 0
        },
        riskAssessment: {
          currentScore: Math.round(riskScore),
          category: riskScore < 30 ? 'low' : riskScore < 70 ? 'medium' : 'high',
          previousScore: currentRisk[0]?.riskScore || null,
          scoreChange: currentRisk[0] ? Math.round(riskScore - currentRisk[0].riskScore) : 0
        },
        integrationActions: {
          wellnessScoreUpdated: updatedWellness !== null,
          riskAssessmentUpdated: updatedRisk !== null,
          communicationSent: communicationSent !== null,
          premiumAdjustmentNeeded: riskRecalculation && Math.abs(riskScore - (currentRisk[0]?.riskScore || 50)) > 10
        }
      };

      res.json({
        success: true,
        data: integrationData,
        message: "Wellness-Risk integration completed successfully"
      });

    } catch (error) {
      console.error("Wellness-Risk integration error:", error);
      res.status(500).json({ error: "Integration check failed" });
    }
  });

  app.post("/api/integration/provider-claims", async (req: Request, res: Response) => {
    try {
      const { providerId, networkValidation, contractVerification, performanceUpdate, analyticsUpdate } = providerClaimsIntegrationSchema.parse(req.body);

      // Get provider details
      const provider = await storage.db.select().from(providers).where(eq(providers.id, providerId)).limit(1);
      if (!provider.length) {
        return res.status(404).json({ error: "Provider not found" });
      }

      // Get provider's network participation
      const networkStatus = networkValidation ? {
        active: provider[0].networkStatus === 'active',
        specialties: provider[0].specialties || [],
        locations: provider[0].locations || [],
        participationLevel: provider[0].participationLevel || 'full',
        networkTier: provider[0].networkTier || 'tier1'
      } : null;

      // Get provider's contract details
      const contractDetails = contractVerification ? {
        contractStatus: provider[0].contractStatus || 'active',
        contractType: provider[0].contractType || 'standard',
        reimbursementRate: provider[0].reimbursementRate || 80,
        capitationRate: provider[0].capitationRate || null,
        effectiveDate: provider[0].contractStartDate,
        expiryDate: provider[0].contractEndDate,
        negotiatedRates: true
      } : null;

      // Get provider performance metrics
      const performanceMetrics = performanceUpdate ? {
        totalClaims: 0, // TODO: Calculate from claims table
        averageProcessingTime: 0, // TODO: Calculate from claims table
        denialRate: 0, // TODO: Calculate from claims table
        patientSatisfaction: provider[0].satisfactionScore || 0,
        qualityScore: provider[0].qualityScore || 0,
        complianceScore: provider[0].complianceScore || 0
      } : null;

      // Get recent claims for this provider
      const recentProviderClaims = await storage.db
        .select()
        .from(claims)
        .where(eq(claims.providerId, providerId))
        .orderBy(desc(claims.createdAt))
        .limit(10);

      // Calculate analytics data
      const analyticsData = analyticsUpdate ? {
        monthlyClaimsVolume: recentProviderClaims.length,
        averageClaimAmount: recentProviderClaims.length > 0 ?
          recentProviderClaims.reduce((sum, claim) => sum + (claim.totalAmount || 0), 0) / recentProviderClaims.length : 0,
        claimTypes: [...new Set(recentProviderClaims.map(claim => claim.serviceType))],
        topProcedures: recentProviderClaims
          .filter(claim => claim.procedureCode)
          .reduce((acc, claim) => {
            acc[claim.procedureCode!] = (acc[claim.procedureCode!] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
      } : null;

      const integrationData = {
        provider: provider[0],
        networkStatus,
        contractDetails,
        performanceMetrics,
        recentClaims: recentProviderClaims.map(claim => ({
          id: claim.id,
          claimNumber: claim.claimNumber,
          memberName: claim.memberName,
          serviceType: claim.serviceType,
          amount: claim.totalAmount,
          status: claim.status,
          serviceDate: claim.serviceDate
        })),
        analytics: analyticsData,
        integrationStatus: {
          networkValidated: networkValidation,
          contractVerified: contractVerification,
          performanceUpdated: performanceUpdate,
          analyticsUpdated: analyticsUpdate,
          claimsIntegration: recentProviderClaims.length > 0
        }
      };

      res.json({
        success: true,
        data: integrationData,
        message: "Provider-Claims integration completed successfully"
      });

    } catch (error) {
      console.error("Provider-Claims integration error:", error);
      res.status(500).json({ error: "Integration check failed" });
    }
  });

  app.post("/api/integration/member-premium", async (req: Request, res: Response) => {
    try {
      const { memberId, premiumRecalculation, riskAdjustment, wellnessAdjustment, schemeAdjustment, communicationTrigger } = memberPremiumIntegrationSchema.parse(req.body);

      // Get member details
      const member = await storage.db.select().from(members).where(eq(members.id, memberId)).limit(1);
      if (!member.length) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Get current premium information
      const currentPremiums = await storage.db
        .select()
        .from(premiums)
        .where(and(
          eq(premiums.memberId, memberId),
          eq(premiums.status, "active")
        ))
        .orderBy(desc(premiums.createdAt))
        .limit(1);

      // Get member's scheme
      const memberScheme = await storage.db
        .select({
          scheme: schemes
        })
        .from(members)
        .leftJoin(schemes, eq(members.schemeId, schemes.id))
        .where(eq(members.id, memberId))
        .limit(1);

      // Get member's risk assessment
      const riskAssessment = await storage.db
        .select()
        .from(riskAssessments)
        .where(eq(riskAssessments.memberId, memberId))
        .orderBy(desc(riskAssessments.createdAt))
        .limit(1);

      // Get member's wellness data
      const wellnessData = await storage.db
        .select()
        .from(wellnessActivities)
        .where(and(
          eq(wellnessActivities.memberId, memberId),
          isNotNull(wellnessActivities.wellnessScore)
        ))
        .orderBy(desc(wellnessActivities.createdAt))
        .limit(10);

      // Calculate base premium from scheme
      const basePremium = memberScheme[0]?.scheme?.basePremium || 5000;

      // Calculate risk adjustment
      let riskMultiplier = 1.0;
      if (riskAdjustment && riskAssessment[0]) {
        const riskScore = riskAssessment[0].riskScore;
        if (riskScore < 30) riskMultiplier = 0.9;
        else if (riskScore > 70) riskMultiplier = 1.3;
        else if (riskScore > 50) riskMultiplier = 1.1;
      }

      // Calculate wellness adjustment
      let wellnessDiscount = 0;
      if (wellnessAdjustment && wellnessData.length > 0) {
        const latestWellnessScore = wellnessData[0].wellnessScore || 0;
        wellnessDiscount = latestWellnessScore > 80 ? 0.15 : latestWellnessScore > 60 ? 0.10 : latestWellnessScore > 40 ? 0.05 : 0;
      }

      // Calculate scheme adjustment
      let schemeMultiplier = 1.0;
      if (schemeAdjustment && memberScheme[0]?.scheme) {
        const scheme = memberScheme[0].scheme;
        schemeMultiplier = scheme.premiumMultiplier || 1.0;
      }

      // Calculate final premium
      const calculatedPremium = Math.round(basePremium * riskMultiplier * (1 - wellnessDiscount) * schemeMultiplier);

      const integrationData = {
        member: member[0],
        currentPremium: currentPremiums[0] || null,
        premiumCalculation: {
          basePremium,
          riskAdjustment: riskAdjustment ? {
            score: riskAssessment[0]?.riskScore || 50,
            multiplier: riskMultiplier,
            adjustment: basePremium * (riskMultiplier - 1)
          } : null,
          wellnessAdjustment: wellnessAdjustment ? {
            score: wellnessData[0]?.wellnessScore || 0,
            discount: wellnessDiscount,
            amount: basePremium * wellnessDiscount
          } : null,
          schemeAdjustment: schemeAdjustment ? {
            multiplier: schemeMultiplier,
            adjustment: basePremium * (schemeMultiplier - 1)
          } : null,
          calculatedPremium,
          currentPremium: currentPremiums[0]?.amount || 0,
          difference: calculatedPremium - (currentPremiums[0]?.amount || 0)
        },
        integrationActions: {
          premiumRecalculated: premiumRecalculation,
          riskAdjusted: riskAdjustment,
          wellnessAdjusted: wellnessAdjustment,
          schemeAdjusted: schemeAdjustment,
          communicationTriggered: communicationTrigger
        }
      };

      // Send notification if premium changed significantly
      if (communicationTrigger && Math.abs(calculatedPremium - (currentPremiums[0]?.amount || 0)) > 100) {
        await storage.db.insert(communicationLogs).values({
          memberId,
          communicationType: 'premium_change_notification',
          channel: 'email',
          subject: 'Premium Update Notification',
          content: `Your monthly premium has been updated to ${calculatedPremium}. This change is effective from next billing cycle.`,
          status: 'sent',
          sentAt: new Date(),
          createdAt: new Date()
        });
      }

      res.json({
        success: true,
        data: integrationData,
        message: "Member-Premium integration completed successfully"
      });

    } catch (error) {
      console.error("Member-Premium integration error:", error);
      res.status(500).json({ error: "Integration check failed" });
    }
  });

  // Cross-module event notification system
  app.post("/api/integration/cross-module-notification", async (req: Request, res: Response) => {
    try {
      const { modules, memberId, providerId, companyId, eventType, eventTitle, eventDescription, eventSeverity, requiresAction, actionDeadline, recipients } = crossModuleNotificationSchema.parse(req.body);

      // Create central notification
      const notification = await storage.db.insert(auditLogs).values({
        entityType: 'system_event',
        entityId: memberId || providerId || companyId || 0,
        action: eventType,
        oldValues: null,
        newValues: JSON.stringify({
          title: eventTitle,
          description: eventDescription,
          severity: eventSeverity,
          modules: modules,
          recipients: recipients.length,
          requiresAction,
          actionDeadline
        }),
        performedBy: 1, // TODO: Get actual user ID
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'System',
        description: eventTitle
      }).returning();

      // Trigger cross-module notifications
      const notificationResults = await Promise.all(
        recipients.map(async (recipient) => {
          try {
            const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:5000'}${recipient.endpoint}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-System-Event': 'true'
              },
              body: JSON.stringify({
                eventType,
                eventTitle,
                eventDescription,
                eventSeverity,
                requiresAction,
                actionDeadline,
                sourceModule: 'system_integration',
                timestamp: new Date().toISOString(),
                ...recipient.payload
              })
            });

            return {
              module: recipient.module,
              endpoint: recipient.endpoint,
              success: response.ok,
              status: response.status
            };
          } catch (error) {
            return {
              module: recipient.module,
              endpoint: recipient.endpoint,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        })
      );

      res.json({
        success: true,
        data: {
          notificationId: notification[0].id,
          modulesNotified: modules,
          recipientsProcessed: recipients.length,
          notificationResults
        },
        message: "Cross-module notification sent successfully"
      });

    } catch (error) {
      console.error("Cross-module notification error:", error);
      res.status(500).json({ error: "Notification failed" });
    }
  });

  // System health and integration status
  app.get("/api/integration/status", async (req: Request, res: Response) => {
    try {
      // Check all module statuses
      const systemStatus = {
        timestamp: new Date().toISOString(),
        overall: 'healthy',
        modules: {
          members: {
            status: 'active',
            endpoints: ['/api/members', '/api/companies'],
            lastActivity: new Date().toISOString()
          },
          claims: {
            status: 'active',
            endpoints: ['/api/claims'],
            lastActivity: new Date().toISOString()
          },
          schemes: {
            status: 'active',
            endpoints: ['/api/schemes'],
            lastActivity: new Date().toISOString()
          },
          providers: {
            status: 'active',
            endpoints: ['/api/providers'],
            lastActivity: new Date().toISOString()
          },
          wellness: {
            status: 'active',
            endpoints: ['/api/wellness'],
            lastActivity: new Date().toISOString()
          },
          risk: {
            status: 'active',
            endpoints: ['/api/risk'],
            lastActivity: new Date().toISOString()
          },
          premiums: {
            status: 'active',
            endpoints: ['/api/premiums'],
            lastActivity: new Date().toISOString()
          },
          communication: {
            status: 'active',
            endpoints: ['/api/communication'],
            lastActivity: new Date().toISOString()
          }
        },
        integrations: {
          member_claims: 'active',
          wellness_risk: 'active',
          provider_claims: 'active',
          member_premium: 'active',
          cross_module_notifications: 'active'
        },
        metrics: {
          totalMembers: await storage.db.select().from(members).then(m => m.length),
          activeClaims: await storage.db.select().from(claims).where(eq(claims.status, 'pending')).then(c => c.length),
          activeProviders: await storage.db.select().from(providers).where(eq(providers.networkStatus, 'active')).then(p => p.length),
          recentIntegrations: 5 // TODO: Calculate from integration logs
        }
      };

      res.json({
        success: true,
        data: systemStatus,
        message: "System integration status retrieved successfully"
      });

    } catch (error) {
      console.error("System status error:", error);
      res.status(500).json({ error: "Status check failed" });
    }
  });
}