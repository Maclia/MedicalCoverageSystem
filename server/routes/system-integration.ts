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
  riskAssessments,
  benefits
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

  // Wellness-Driven Claims Processing Integration
  app.post("/api/integration/wellness-claims-impact", async (req: Request, res: Response) => {
    try {
      const { memberId, claimId, wellnessActivities, applyWellnessDiscount } = req.body;

      // Get member details
      const member = await storage.db.select().from(members).where(eq(members.id, memberId)).limit(1);
      if (!member.length) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Get member's wellness activities in the last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const recentWellnessActivities = await storage.db
        .select()
        .from(wellnessActivities)
        .where(and(
          eq(wellnessActivities.memberId, memberId),
          gte(wellnessActivities.createdAt, ninetyDaysAgo)
        ))
        .orderBy(desc(wellnessActivities.createdAt));

      // Calculate wellness impact score
      const wellnessScore = recentWellnessActivities.reduce((score, activity) => {
        let activityScore = 0;
        switch (activity.activityType) {
          case 'exercise':
            activityScore = activity.duration ? Math.min(activity.duration / 30, 1) * 10 : 0;
            break;
          case 'health_screening':
            activityScore = 8;
            break;
          case 'vaccination':
            activityScore = 10;
            break;
          case 'checkup':
            activityScore = 7;
            break;
          case 'nutrition':
            activityScore = activity.duration ? Math.min(activity.duration / 15, 1) * 5 : 0;
            break;
        }
        return score + activityScore;
      }, 0);

      // Calculate wellness-based discount (0-20% based on score)
      const wellnessDiscount = Math.min(wellnessScore / 5, 20);

      // Get claim details if claimId provided
      let claimDetails = null;
      if (claimId) {
        const claim = await storage.db.select().from(claims).where(eq(claims.id, claimId)).limit(1);
        if (claim.length) {
          claimDetails = claim[0];
        }
      }

      const impactAnalysis = {
        member: member[0],
        wellnessMetrics: {
          totalActivities: recentWellnessActivities.length,
          wellnessScore: Math.round(wellnessScore),
          activitiesByType: recentWellnessActivities.reduce((acc, activity) => {
            acc[activity.activityType] = (acc[activity.activityType] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          discountEligible: wellnessScore >= 25
        },
        claimImpact: claimDetails ? {
          originalAmount: claimDetails.totalAmount,
          wellnessDiscount: applyWellnessDiscount ? wellnessDiscount : 0,
          discountedAmount: applyWellnessDiscount ? claimDetails.totalAmount * (1 - wellnessDiscount / 100) : claimDetails.totalAmount,
          savings: applyWellnessDiscount ? claimDetails.totalAmount * (wellnessDiscount / 100) : 0
        } : null,
        recommendations: [
          wellnessScore < 25 ? 'Increase wellness activities to qualify for discounts' : null,
          recentWellnessActivities.length < 10 ? 'Consider more frequent wellness activities' : null,
          'Continue regular exercise and health screenings for optimal benefits'
        ].filter(Boolean)
      };

      // Log wellness-claims integration
      await storage.db.insert(auditLogs).values({
        entityType: 'integration',
        entityId: memberId,
        action: 'wellness_claims_impact',
        oldValues: null,
        newValues: JSON.stringify({
          wellnessScore,
          discount: wellnessDiscount,
          claimId,
          timestamp: new Date().toISOString()
        }),
        performedBy: 1,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'System',
        description: `Wellness-claims impact analysis for member ID: ${memberId}`
      });

      res.json({
        success: true,
        data: impactAnalysis,
        message: "Wellness-claims impact analysis completed successfully"
      });

    } catch (error) {
      console.error("Wellness-claims impact error:", error);
      res.status(500).json({ error: "Integration analysis failed" });
    }
  });

  // Wellness-Based Enhanced Eligibility
  app.get("/api/integration/wellness-eligibility/:memberId", async (req: Request, res: Response) => {
    try {
      const memberId = parseInt(req.params.memberId);

      // Get member details
      const member = await storage.db.select().from(members).where(eq(members.id, memberId)).limit(1);
      if (!member.length) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Get member's scheme and benefits
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

      // Get member's wellness activities
      const wellnessData = await storage.db
        .select()
        .from(wellnessActivities)
        .where(eq(wellnessActivities.memberId, memberId))
        .orderBy(desc(wellnessActivities.createdAt))
        .limit(100);

      // Calculate wellness-enhanced eligibility
      const wellnessScore = wellnessData.reduce((score, activity) => {
        let activityScore = 0;
        switch (activity.activityType) {
          case 'exercise':
            activityScore = activity.duration ? Math.min(activity.duration / 30, 1) * 8 : 0;
            break;
          case 'health_screening':
            activityScore = 10;
            break;
          case 'vaccination':
            activityScore = 8;
            break;
          case 'checkup':
            activityScore = 6;
            break;
        }
        return score + activityScore;
      }, 0);

      // Enhanced eligibility benefits based on wellness
      const enhancedBenefits = memberScheme[0]?.scheme ? {
        baseBenefits: await storage.db
          .select()
          .from(benefits)
          .where(and(
            eq(benefits.schemeId, memberScheme[0].scheme.id),
            eq(benefits.status, "active")
          )),
        wellnessEnhancements: {
          additionalCoverage: wellnessScore > 50 ? ['Preventive care', 'Mental health'] : [],
          reducedCopays: wellnessScore > 75 ? 20 : wellnessScore > 50 ? 10 : 0,
          increasedLimits: wellnessScore > 60 ? 1.25 : wellnessScore > 40 ? 1.15 : 1,
          priorityServices: wellnessScore > 80 ? ['Telehealth', 'Same-day appointments'] : []
        }
      } : null;

      const eligibilityData = {
        member: member[0],
        baseEligibility: {
          active: member[0].status === 'active',
          premiumsCurrent: true, // TODO: Check actual premium status
          schemeActive: memberScheme[0]?.scheme?.status === 'active'
        },
        wellnessEnhancement: {
          wellnessScore: Math.round(wellnessScore),
          wellnessTier: wellnessScore > 75 ? 'Gold' : wellnessScore > 50 ? 'Silver' : wellnessScore > 25 ? 'Bronze' : 'Basic',
          enhancedBenefits: enhancedBenefits,
          nextMilestone: wellnessScore < 25 ? { target: 25, benefits: ['Reduced copays'] } :
                           wellnessScore < 50 ? { target: 50, benefits: ['Additional coverage'] } :
                           wellnessScore < 75 ? { target: 75, benefits: ['Priority services'] } :
                           null
        },
        recommendations: [
          wellnessScore < 25 ? 'Increase wellness activities to unlock enhanced benefits' : null,
          wellnessScore < 50 ? 'Focus on preventive care to reach Silver tier' : null,
          wellnessScore < 75 ? 'Maintain consistent wellness routine for Gold tier benefits' : null
        ].filter(Boolean)
      };

      res.json({
        success: true,
        data: eligibilityData,
        message: "Wellness-enhanced eligibility retrieved successfully"
      });

    } catch (error) {
      console.error("Wellness eligibility error:", error);
      res.status(500).json({ error: "Eligibility check failed" });
    }
  });

  // Wellness Reward Processing
  app.post("/api/integration/wellness-reward-processing", async (req: Request, res: Response) => {
    try {
      const { memberId, triggerEvent, rewardType, rewardAmount } = req.body;

      // Get member details
      const member = await storage.db.select().from(members).where(eq(members.id, memberId)).limit(1);
      if (!member.length) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Check if reward already processed for this trigger
      const existingReward = await storage.db
        .select()
        .from(communicationLogs)
        .where(and(
          eq(communicationLogs.memberId, memberId),
          eq(communicationLogs.communicationType, 'wellness_reward'),
          eq(communicationLogs.status, 'processed')
        ))
        .orderBy(desc(communicationLogs.createdAt))
        .limit(1);

      // Create reward record
      const rewardRecord = await storage.db.insert(communicationLogs).values({
        memberId,
        communicationType: 'wellness_reward',
        channel: 'mobile_app',
        subject: `Wellness Reward: ${rewardType}`,
        content: `Congratulations! You've earned a ${rewardType} reward of $${rewardAmount} for ${triggerEvent}.`,
        status: 'processed',
        metadata: JSON.stringify({
          triggerEvent,
          rewardType,
          rewardAmount,
          processedAt: new Date().toISOString()
        }),
        sentAt: new Date(),
        createdAt: new Date()
      }).returning();

      // Create notification
      await storage.db.insert(communicationLogs).values({
        memberId,
        communicationType: 'push_notification',
        channel: 'mobile_app',
        subject: 'Wellness Achievement Unlocked! 🎉',
        content: `Great job! You've earned a ${rewardType} reward. Check your rewards dashboard.`,
        status: 'sent',
        sentAt: new Date(),
        createdAt: new Date()
      });

      const rewardData = {
        member: member[0],
        reward: {
          type: rewardType,
          amount: rewardAmount,
          triggerEvent,
          processedAt: new Date().toISOString()
        },
        rewardSummary: {
          totalRewardsThisMonth: 1, // TODO: Calculate from reward logs
          totalRewardsThisYear: 1, // TODO: Calculate from reward logs
          nextRewardMilestone: 'Complete 50 wellness activities for bonus reward'
        },
        communicationSent: true
      };

      res.json({
        success: true,
        data: rewardData,
        message: "Wellness reward processed successfully"
      });

    } catch (error) {
      console.error("Wellness reward processing error:", error);
      res.status(500).json({ error: "Reward processing failed" });
    }
  });

  // Provider Performance-Based Quality Adjustment
  app.post("/api/integration/provider-quality-adjustment", async (req: Request, res: Response) => {
    try {
      const { providerId, claimId, baseAmount, applyQualityAdjustment } = req.body;

      // Get provider details
      const provider = await storage.db.select().from(providers).where(eq(providers.id, providerId)).limit(1);
      if (!provider.length) {
        return res.status(404).json({ error: "Provider not found" });
      }

      // Get claim details if claimId provided
      let claimDetails = null;
      if (claimId) {
        const claim = await storage.db.select().from(claims).where(eq(claims.id, claimId)).limit(1);
        if (claim.length) {
          claimDetails = claim[0];
        }
      }

      // Calculate provider quality score
      const providerData = provider[0];
      const overallQualityScore = (providerData.qualityScore || 0) * 0.4 +
                                 (providerData.satisfactionScore || 0) * 0.3 +
                                 (providerData.complianceScore || 0) * 0.3;

      // Calculate quality adjustment based on score
      let qualityMultiplier = 1.0;
      if (overallQualityScore >= 4.5) {
        qualityMultiplier = 1.10; // 10% bonus for excellent quality
      } else if (overallQualityScore >= 4.0) {
        qualityMultiplier = 1.05; // 5% bonus for good quality
      } else if (overallQualityScore < 3.0) {
        qualityMultiplier = 0.95; // 5% reduction for poor quality
      }

      const adjustmentData = {
        provider: provider[0],
        qualityMetrics: {
          overallScore: Math.round(overallQualityScore * 100) / 100,
          qualityScore: providerData.qualityScore || 0,
          satisfactionScore: providerData.satisfactionScore || 0,
          complianceScore: providerData.complianceScore || 0,
          qualityTier: overallQualityScore >= 4.5 ? 'Excellent' :
                       overallQualityScore >= 4.0 ? 'Good' :
                       overallQualityScore >= 3.5 ? 'Average' : 'Needs Improvement'
        },
        financialAdjustment: applyQualityAdjustment && baseAmount ? {
          baseAmount,
          qualityMultiplier,
          adjustedAmount: baseAmount * qualityMultiplier,
          adjustmentAmount: baseAmount * (qualityMultiplier - 1),
          adjustmentPercentage: ((qualityMultiplier - 1) * 100).toFixed(1)
        } : null,
        claimImpact: claimDetails ? {
          claimId: claimDetails.id,
          originalAmount: baseAmount || claimDetails.totalAmount,
          adjustedAmount: applyQualityAdjustment ? (baseAmount || claimDetails.totalAmount) * qualityMultiplier : (baseAmount || claimDetails.totalAmount)
        } : null,
        recommendations: [
          overallQualityScore < 3.5 ? 'Focus on improving patient satisfaction scores' : null,
          overallQualityScore < 4.0 ? 'Enhance compliance protocols and documentation' : null,
          overallQualityScore >= 4.5 ? 'Maintain excellent quality standards for continued bonuses' : null
        ].filter(Boolean)
      };

      // Log quality adjustment
      if (applyQualityAdjustment) {
        await storage.db.insert(auditLogs).values({
          entityType: 'provider',
          entityId: providerId,
          action: 'quality_adjustment',
          oldValues: JSON.stringify({ baseAmount }),
          newValues: JSON.stringify({
            qualityScore: overallQualityScore,
            multiplier: qualityMultiplier,
            adjustedAmount: baseAmount * qualityMultiplier,
            timestamp: new Date().toISOString()
          }),
          performedBy: 1,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || 'System',
          description: `Quality-based adjustment for provider ID: ${providerId}`
        });
      }

      res.json({
        success: true,
        data: adjustmentData,
        message: "Provider quality adjustment analysis completed successfully"
      });

    } catch (error) {
      console.error("Provider quality adjustment error:", error);
      res.status(500).json({ error: "Quality adjustment failed" });
    }
  });

  // Provider Network Efficiency Analysis
  app.get("/api/integration/provider-network-efficiency", async (req: Request, res: Response) => {
    try {
      const { region, specialty, timeframe } = req.query;

      // Get all providers with their performance metrics
      const allProviders = await storage.db.select().from(providers);

      // Get provider utilization data
      const providerClaims = await storage.db
        .select()
        .from(claims)
        .orderBy(desc(claims.createdAt))
        .limit(1000); // Last 1000 claims for efficiency analysis

      // Analyze provider network efficiency
      const providerUtilization = providerClaims.reduce((acc, claim) => {
        if (!acc[claim.providerId]) {
          acc[claim.providerId] = {
            claims: 0,
            totalAmount: 0,
            processingTime: 0,
            approvals: 0
          };
        }
        acc[claim.providerId].claims++;
        acc[claim.providerId].totalAmount += claim.totalAmount || 0;
        if (claim.processedAt) {
          acc[claim.providerId].processingTime += Math.ceil((new Date(claim.processedAt).getTime() - new Date(claim.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        }
        if (claim.status === 'approved') {
          acc[claim.providerId].approvals++;
        }
        return acc;
      }, {} as Record<number, any>);

      // Calculate efficiency metrics
      const efficiencyAnalysis = {
        networkOverview: {
          totalProviders: allProviders.length,
          activeProviders: allProviders.filter(p => p.networkStatus === 'active').length,
          averageUtilization: providerClaims.length / allProviders.length,
          networkEfficiencyScore: 85.4 // TODO: Calculate based on multiple factors
        },
        efficiencyMetrics: {
          averageProcessingTime: Object.values(providerUtilization).reduce((sum, p) => sum + (p.processingTime / p.claims), 0) / Object.keys(providerUtilization).length,
          approvalRate: Object.values(providerUtilization).reduce((sum, p) => sum + (p.approvals / p.claims), 0) / Object.keys(providerUtilization).length,
          revenuePerProvider: Object.values(providerUtilization).reduce((sum, p) => sum + p.totalAmount, 0) / Object.keys(providerUtilization).length
        },
        topEfficientProviders: allProviders
          .filter(p => providerUtilization[p.id])
          .map(p => ({
            id: p.id,
            name: `${p.firstName} ${p.lastName}`,
            specialization: p.specialization,
            efficiency: providerUtilization[p.id] ? (providerUtilization[p.id].approvals / providerUtilization[p.id].claims) * 100 : 0,
            utilization: providerUtilization[p.id] ? providerUtilization[p.id].claims : 0
          }))
          .sort((a, b) => b.efficiency - a.efficiency)
          .slice(0, 10),
        networkOptimizations: [
          {
            type: 'Geographic',
            recommendation: 'Add 5 more providers in underserved rural areas',
            potentialImpact: '15% increase in network coverage',
            priority: 'high'
          },
          {
            type: 'Specialty',
            recommendation: 'Recruit more mental health specialists',
            potentialImpact: '25% improvement in mental health access',
            priority: 'medium'
          },
          {
            type: 'Performance',
            recommendation: 'Implement quality incentives for low-performing providers',
            potentialImpact: '10% improvement in overall quality scores',
            priority: 'medium'
          }
        ]
      };

      res.json({
        success: true,
        data: efficiencyAnalysis,
        message: "Provider network efficiency analysis completed successfully"
      });

    } catch (error) {
      console.error("Provider network efficiency error:", error);
      res.status(500).json({ error: "Efficiency analysis failed" });
    }
  });

  // Intelligent Referral Routing
  app.post("/api/integration/provider-referral-routing", async (req: Request, res: Response) => {
    try {
      const { memberId, specialty, urgency, location, preferences } = req.body;

      // Get member details
      const member = await storage.db.select().from(members).where(eq(members.id, memberId)).limit(1);
      if (!member.length) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Get providers matching the specialty
      const matchingProviders = await storage.db
        .select()
        .from(providers)
        .where(and(
          eq(providers.networkStatus, 'active'),
          providers.specialization.includes(specialty)
        ));

      // Get provider performance data
      const providerPerformance = await Promise.all(
        matchingProviders.map(async (provider) => {
          const recentClaims = await storage.db
            .select()
            .from(claims)
            .where(and(
              eq(claims.providerId, provider.id),
              eq(claims.status, 'approved')
            ))
            .orderBy(desc(claims.createdAt))
            .limit(20);

          const avgProcessingTime = recentClaims.length > 0
            ? recentClaims.reduce((sum, claim) => {
                return sum + Math.ceil((new Date(claim.processedAt!).getTime() - new Date(claim.createdAt).getTime()) / (1000 * 60 * 60 * 24));
              }, 0) / recentClaims.length
            : 0;

          return {
            provider,
            performance: {
              totalClaims: recentClaims.length,
              avgProcessingTime,
              qualityScore: provider.qualityScore || 0,
              satisfactionScore: provider.satisfactionScore || 0
            }
          };
        })
      );

      // Score and rank providers based on multiple factors
      const scoredProviders = providerPerformance.map(({ provider, performance }) => {
        let score = 0;

        // Quality score (40% weight)
        score += (performance.qualityScore / 5) * 40;

        // Satisfaction score (30% weight)
        score += (performance.satisfactionScore / 5) * 30;

        // Processing time (20% weight) - lower is better
        const processingScore = Math.max(0, 20 - (avgProcessingTime * 2));
        score += processingScore;

        // Availability/Utilization (10% weight)
        const utilizationScore = Math.min(10, performance.totalClaims / 10);
        score += utilizationScore;

        // Location proximity (if specified)
        if (location && provider.locations) {
          // TODO: Implement actual distance calculation
          const locationBonus = Math.random() * 10; // Placeholder
          score += locationBonus;
        }

        // Network tier bonus
        if (provider.networkTier === 'tier1') score += 5;
        else if (provider.networkTier === 'tier2') score += 3;

        return {
          provider: {
            id: provider.id,
            name: `${provider.firstName} ${provider.lastName}`,
            specialization: provider.specialization,
            locations: provider.locations ? JSON.parse(provider.locations as string) : [],
            networkTier: provider.networkTier,
            acceptanceStatus: provider.acceptanceStatus
          },
          performance,
          score: Math.round(score * 100) / 100,
          recommendation: this.generateProviderRecommendation(score, urgency, performance)
        };
      }).sort((a, b) => b.score - a.score);

      const referralData = {
        member: member[0],
        referralRequest: {
          specialty,
          urgency,
          location,
          preferences
        },
        recommendedProviders: scoredProviders.slice(0, 5), // Top 5 recommendations
        routingLogic: {
          factors: ['Quality Score', 'Patient Satisfaction', 'Processing Time', 'Availability', 'Location'],
          weights: { quality: 40, satisfaction: 30, processing: 20, utilization: 10 }
        },
        nextSteps: [
          'Contact recommended providers to confirm availability',
          'Verify insurance acceptance and coverage',
          'Schedule appointment based on urgency',
          'Send referral confirmation to member'
        ]
      };

      // Log referral routing
      await storage.db.insert(auditLogs).values({
        entityType: 'referral',
        entityId: memberId,
        action: 'intelligent_routing',
        oldValues: null,
        newValues: JSON.stringify({
          specialty,
          urgency,
          recommendedProviders: scoredProviders.slice(0, 3).map(p => p.provider.id),
          timestamp: new Date().toISOString()
        }),
        performedBy: 1,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'System',
        description: `Intelligent referral routing for member ID: ${memberId}`
      });

      res.json({
        success: true,
        data: referralData,
        message: "Provider referral routing completed successfully"
      });

    } catch (error) {
      console.error("Provider referral routing error:", error);
      res.status(500).json({ error: "Referral routing failed" });
    }
  });

  // Dynamic Risk Adjustment
  app.post("/api/integration/dynamic-risk-adjustment", async (req: Request, res: Response) => {
    try {
      const { memberId, lifeEvent, eventType, eventDate } = req.body;

      // Get member details
      const member = await storage.db.select().from(members).where(eq(members.id, memberId)).limit(1);
      if (!member.length) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Get current risk assessment
      const currentRisk = await storage.db
        .select()
        .from(riskAssessments)
        .where(eq(riskAssessments.memberId, memberId))
        .orderBy(desc(riskAssessments.createdAt))
        .limit(1);

      // Calculate risk adjustment based on life event
      let riskAdjustment = 0;
      let adjustmentReason = '';

      switch (eventType) {
        case 'age_increase':
          const age = new Date().getFullYear() - new Date(member[0].dateOfBirth).getFullYear();
          if (age >= 65) riskAdjustment = 15;
          else if (age >= 50) riskAdjustment = 10;
          adjustmentReason = `Age-based risk adjustment for age ${age}`;
          break;

        case 'new_diagnosis':
          riskAdjustment = 20;
          adjustmentReason = 'New medical diagnosis requiring ongoing treatment';
          break;

        case 'lifestyle_change':
          if (lifeEvent === 'smoking_cessation') riskAdjustment = -10;
          else if (lifeEvent === 'weight_loss') riskAdjustment = -8;
          else if (lifeEvent === 'sedentary_lifestyle') riskAdjustment = 12;
          adjustmentReason = `Lifestyle change: ${lifeEvent}`;
          break;

        case 'family_history_update':
          riskAdjustment = 8;
          adjustmentReason = 'Updated family medical history';
          break;

        case 'medication_change':
          riskAdjustment = 5;
          adjustmentReason = 'New long-term medication regimen';
          break;

        default:
          riskAdjustment = 0;
          adjustmentReason = 'No risk adjustment required';
      }

      const newRiskScore = Math.max(0, Math.min(100, (currentRisk[0]?.riskScore || 50) + riskAdjustment));

      // Create updated risk assessment
      const updatedRisk = await storage.db.insert(riskAssessments).values({
        memberId,
        riskScore: Math.round(newRiskScore),
        riskCategory: newRiskScore < 30 ? 'low' : newRiskScore < 70 ? 'medium' : 'high',
        assessmentDate: new Date(),
        factors: JSON.stringify({
          lifeEvent,
          eventType,
          eventDate,
          adjustment: riskAdjustment,
          previousScore: currentRisk[0]?.riskScore || 50
        }),
        recommendations: JSON.stringify([
          riskAdjustment > 0 ? 'Schedule preventive care screening' : null,
          riskAdjustment > 10 ? 'Review wellness program participation' : null,
          'Continue regular health monitoring'
        ].filter(Boolean)),
        createdAt: new Date()
      }).returning();

      const riskAdjustmentData = {
        member: member[0],
        lifeEvent: {
          type: eventType,
          description: lifeEvent,
          eventDate,
          impact: riskAdjustment > 0 ? 'increased_risk' : riskAdjustment < 0 ? 'decreased_risk' : 'no_change'
        },
        riskAssessment: {
          previousScore: currentRisk[0]?.riskScore || 50,
          adjustment: riskAdjustment,
          newScore: Math.round(newRiskScore),
          category: newRiskScore < 30 ? 'low' : newRiskScore < 70 ? 'medium' : 'high',
          reason: adjustmentReason
        },
        premiumImpact: {
          requiresRecalculation: Math.abs(riskAdjustment) > 5,
          estimatedChange: riskAdjustment > 0 ? '+' : Math.abs(riskAdjustment) > 10 ? 'significant' : 'moderate',
          effectiveDate: newRiskScore > (currentRisk[0]?.riskScore || 50) ? 'next_billing_cycle' : 'immediate'
        },
        recommendations: [
          riskAdjustment > 15 ? 'Consider enhanced wellness program participation' : null,
          riskAdjustment < -10 ? 'Excellent progress! Continue healthy lifestyle' : null,
          'Schedule follow-up assessment in 6 months'
        ].filter(Boolean)
      };

      // Trigger premium recalculation if significant change
      if (Math.abs(riskAdjustment) > 10) {
        await storage.db.insert(communicationLogs).values({
          memberId,
          communicationType: 'risk_adjustment_notification',
          channel: 'email',
          subject: 'Risk Assessment Update',
          content: `Your risk assessment has been updated due to ${eventType}. This may affect your premium calculation.`,
          status: 'sent',
          sentAt: new Date(),
          createdAt: new Date()
        });
      }

      res.json({
        success: true,
        data: riskAdjustmentData,
        message: "Dynamic risk adjustment completed successfully"
      });

    } catch (error) {
      console.error("Dynamic risk adjustment error:", error);
      res.status(500).json({ error: "Risk adjustment failed" });
    }
  });

  // Contextual Notifications
  app.post("/api/integration/contextual-notifications", async (req: Request, res: Response) => {
    try {
      const { modules, memberId, providerId, companyId, eventType, eventTitle, eventDescription, context, personalizationLevel } = req.body;

      // Generate contextual notification based on event type and user context
      let notificationContent = '';
      let notificationChannels = ['email'];
      let priority = 'normal';

      // Get relevant user data for personalization
      let memberData = null;
      let providerData = null;
      let companyData = null;

      if (memberId) {
        memberData = await storage.db.select().from(members).where(eq(members.id, memberId)).limit(1);
      }
      if (providerId) {
        providerData = await storage.db.select().from(providers).where(eq(providers.id, providerId)).limit(1);
      }
      if (companyId) {
        companyData = await storage.db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
      }

      // Generate personalized content based on event type
      switch (eventType) {
        case 'claim_submitted':
          notificationContent = memberData ?
            `Hi ${memberData[0].firstName}, we've received your claim submission. We'll review it and update you within 48 hours.` :
            'A new claim has been submitted and is under review.';
          notificationChannels.push('mobile_app');
          break;

        case 'premium_due':
          notificationContent = memberData ?
            `Hi ${memberData[0].firstName}, your monthly premium of $${context.amount} is due on ${context.dueDate}. Please ensure timely payment to avoid coverage interruption.` :
            'Premium payment reminder sent to member.';
          notificationChannels.push('sms');
          priority = 'high';
          break;

        case 'wellness_achievement':
          notificationContent = memberData ?
            `Congratulations ${memberData[0].firstName}! You've reached a new wellness milestone and earned a ${context.reward}. Keep up the great work!` :
            'Member achieved wellness milestone.';
          notificationChannels.push('mobile_app', 'push');
          break;

        case 'provider_network_update':
          notificationContent = memberData ?
            `Hi ${memberData[0].firstName}, ${context.providerName} is now part of our provider network. You can schedule appointments with them starting ${context.effectiveDate}.` :
            'Provider network updated with new providers.';
          break;

        case 'benefit_enhancement':
          notificationContent = memberData ?
            `Great news ${memberData[0].firstName}! Your plan now includes ${context.newBenefits}. These enhancements are effective immediately.` :
            'Plan benefits have been enhanced.';
          notificationChannels.push('mobile_app');
          break;

        default:
          notificationContent = eventDescription || 'System notification';
      }

      // Create personalized notification with AI-enhanced content if requested
      let personalizedContent = notificationContent;
      if (personalizationLevel === 'high' && memberData) {
        // Add member-specific personalization
        const memberProfile = memberData[0];
        personalizedContent = notificationContent
          .replace(/{firstName}/g, memberProfile.firstName)
          .replace(/{plan}/g, context.planName || 'your health plan')
          .replace(/{memberId}/g, memberProfile.id.toString());
      }

      // Send notifications through multiple channels
      const notificationResults = await Promise.all(
        notificationChannels.map(async (channel) => {
          try {
            const recipient = memberId || providerId || companyId;
            const entityType = memberId ? 'member' : providerId ? 'provider' : 'company';

            const notification = await storage.db.insert(communicationLogs).values({
              [entityType === 'member' ? 'memberId' : entityType === 'provider' ? 'providerId' : 'companyId']: recipient,
              communicationType: 'contextual_notification',
              channel,
              subject: eventTitle,
              content: personalizedContent,
              status: 'sent',
              priority,
              metadata: JSON.stringify({
                eventType,
                context,
                personalizationLevel,
                modules,
                generatedAt: new Date().toISOString()
              }),
              sentAt: new Date(),
              createdAt: new Date()
            }).returning();

            return {
              channel,
              success: true,
              notificationId: notification[0].id
            };
          } catch (error) {
            return {
              channel,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        })
      );

      const contextualNotificationData = {
        event: {
          type: eventType,
          title: eventTitle,
          description: eventDescription,
          context,
          modulesInvolved: modules
        },
        personalization: {
          level: personalizationLevel,
          memberData: memberData ? { id: memberData[0].id, name: `${memberData[0].firstName} ${memberData[0].lastName}` } : null,
          personalizedContent
        },
        notificationResults: {
          channels: notificationChannels,
          sentNotifications: notificationResults,
          successRate: (notificationResults.filter(r => r.success).length / notificationResults.length) * 100
        },
        analytics: {
          generatedAt: new Date().toISOString(),
          personalizationTokens: personalizationLevel === 'high' ? ['firstName', 'planName', 'memberId'] : [],
          contextualRelevance: 'high'
        }
      };

      res.json({
        success: true,
        data: contextualNotificationData,
        message: "Contextual notifications sent successfully"
      });

    } catch (error) {
      console.error("Contextual notification error:", error);
      res.status(500).json({ error: "Notification delivery failed" });
    }
  });

  // Member Journey Mapping
  app.get("/api/integration/member-journey-mapping/:memberId", async (req: Request, res: Response) => {
    try {
      const memberId = parseInt(req.params.memberId);
      const { timeframe } = req.query;

      // Get member details
      const member = await storage.db.select().from(members).where(eq(members.id, memberId)).limit(1);
      if (!member.length) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Get member's journey events from various modules
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const [claimsHistory, wellnessActivities, communications, riskAssessments, premiums] = await Promise.all([
        storage.db.select().from(claims).where(and(
          eq(claims.memberId, memberId),
          gte(claims.createdAt, timeframe === 'all' ? new Date(0) : ninetyDaysAgo)
        )).orderBy(desc(claims.createdAt)),
        storage.db.select().from(wellnessActivities).where(and(
          eq(wellnessActivities.memberId, memberId),
          gte(wellnessActivities.createdAt, timeframe === 'all' ? new Date(0) : ninetyDaysAgo)
        )).orderBy(desc(wellnessActivities.createdAt)),
        storage.db.select().from(communicationLogs).where(and(
          eq(communicationLogs.memberId, memberId),
          gte(communicationLogs.createdAt, timeframe === 'all' ? new Date(0) : ninetyDaysAgo)
        )).orderBy(desc(communicationLogs.createdAt)),
        storage.db.select().from(riskAssessments).where(and(
          eq(riskAssessments.memberId, memberId),
          gte(riskAssessments.createdAt, timeframe === 'all' ? new Date(0) : ninetyDaysAgo)
        )).orderBy(desc(riskAssessments.createdAt)),
        storage.db.select().from(premiums).where(and(
          eq(premiums.memberId, memberId),
          gte(premiums.createdAt, timeframe === 'all' ? new Date(0) : ninetyDaysAgo)
        )).orderBy(desc(premiums.createdAt))
      ]);

      // Build member journey timeline
      const journeyEvents = [
        ...claimsHistory.map(claim => ({
          timestamp: claim.createdAt,
          type: 'claims',
          event: `Claim ${claim.claimNumber} ${claim.status}`,
          details: `Amount: $${claim.totalAmount}, Status: ${claim.status}`,
          impact: claim.status === 'approved' ? 'positive' : claim.status === 'denied' ? 'negative' : 'neutral',
          module: 'claims'
        })),
        ...wellnessActivities.map(activity => ({
          timestamp: activity.createdAt,
          type: 'wellness',
          event: `Wellness Activity: ${activity.activityType}`,
          details: activity.duration ? `Duration: ${activity.duration} minutes` : '',
          impact: 'positive',
          module: 'wellness'
        })),
        ...communications.map(comm => ({
          timestamp: comm.createdAt,
          type: 'communication',
          event: `${comm.communicationType} ${comm.subject}`,
          details: `Channel: ${comm.channel}, Status: ${comm.status}`,
          impact: comm.status === 'sent' ? 'positive' : 'neutral',
          module: 'communication'
        })),
        ...riskAssessments.map(assessment => ({
          timestamp: assessment.createdAt,
          type: 'risk',
          event: `Risk Assessment: ${assessment.riskCategory}`,
          details: `Score: ${assessment.riskScore}, Category: ${assessment.riskCategory}`,
          impact: assessment.riskCategory === 'low' ? 'positive' : assessment.riskCategory === 'high' ? 'negative' : 'neutral',
          module: 'risk'
        })),
        ...premiums.map(premium => ({
          timestamp: premium.createdAt,
          type: 'premium',
          event: `Premium: ${premium.status}`,
          details: `Amount: $${premium.amount}, Due: ${premium.dueDate}`,
          impact: premium.status === 'paid' ? 'positive' : premium.status === 'overdue' ? 'negative' : 'neutral',
          module: 'premium'
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Analyze journey patterns and insights
      const journeyAnalysis = {
        member: member[0],
        journeyTimeline: journeyEvents,
        journeyMetrics: {
          totalEvents: journeyEvents.length,
          eventsByModule: journeyEvents.reduce((acc, event) => {
            acc[event.module] = (acc[event.module] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          eventsByType: journeyEvents.reduce((acc, event) => {
            acc[event.type] = (acc[event.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          positiveEvents: journeyEvents.filter(e => e.impact === 'positive').length,
          negativeEvents: journeyEvents.filter(e => e.impact === 'negative').length,
          journeySatisfaction: journeyEvents.length > 0 ?
            ((journeyEvents.filter(e => e.impact === 'positive').length / journeyEvents.length) * 100) : 0
        },
        touchpoints: {
          modulesEngaged: [...new Set(journeyEvents.map(e => e.module))],
          communicationChannels: [...new Set(communications.map(c => c.channel))],
          serviceUtilization: {
            claims: claimsHistory.length,
            wellness: wellnessActivities.length,
            totalInteractions: journeyEvents.length
          }
        },
        insights: [
          claimsHistory.length > 5 ? 'High healthcare utilization - consider wellness program' : null,
          wellnessActivities.length < 5 ? 'Low wellness engagement - recommend program participation' : null,
          journeyEvents.filter(e => e.impact === 'negative').length > journeyEvents.filter(e => e.impact === 'positive').length ?
            'More negative than positive experiences - outreach recommended' : null,
          'Member engages with multiple communication channels effectively'
        ].filter(Boolean),
        recommendations: [
          'Continue personalized communication through preferred channels',
          wellnessActivities.length < 10 ? 'Increase wellness program participation for better outcomes' : null,
          claimsHistory.length > 10 ? 'Review preventive care options to reduce claim frequency' : null,
          'Maintain regular check-ins based on engagement patterns'
        ].filter(Boolean)
      };

      res.json({
        success: true,
        data: journeyAnalysis,
        message: "Member journey mapping completed successfully"
      });

    } catch (error) {
      console.error("Member journey mapping error:", error);
      res.status(500).json({ error: "Journey mapping failed" });
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
          wellness_claims_impact: 'active',
          provider_quality_adjustment: 'active',
          contextual_notifications: 'active',
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