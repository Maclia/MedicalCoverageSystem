import { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import {
  members,
  memberLifeEvents,
  memberDocuments,
  memberConsents,
  communicationLogs,
  dependentRules,
  employeeGrades,
  auditLogs,
  companies
} from "../../shared/schema.js";
import { eq, and, desc, asc } from "drizzle-orm";

// Validation schemas for member lifecycle operations
const enrollMemberSchema = z.object({
  companyId: z.number(),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  phone: z.string().regex(/^254[7]\d{8}$/), // Kenya format
  dateOfBirth: z.string().refine((date) => {
    const birthDate = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    return age >= 18; // Minimum 18 years for principals
  }, "Principal members must be at least 18 years old"),
  employeeId: z.string().min(1),
  memberType: z.enum(["principal", "dependent"]),
  principalId: z.number().optional(),
  dependentType: z.enum(["spouse", "child", "parent"]).optional(),
  // Enhanced fields
  gender: z.enum(["male", "female", "other"]).optional(),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed"]).optional(),
  nationalId: z.string().regex(/^\d{8}$/).optional(), // Kenya format
  passportNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default("Kenya"),
  hasDisability: z.boolean().default(false),
  disabilityDetails: z.string().optional(),
});

const suspendMemberSchema = z.object({
  reason: z.string().min(5, "Suspension reason must be at least 5 characters"),
  notes: z.string().optional(),
});

const renewMemberSchema = z.object({
  renewalDate: z.string(),
  newBenefitPackage: z.number().optional(),
  notes: z.string().optional(),
});

const transferMemberSchema = z.object({
  targetCompanyId: z.number(),
  targetSchemeId: z.number(),
  transferDate: z.string(),
  reason: z.string().min(5, "Transfer reason must be at least 5 characters"),
  maintainBenefits: z.boolean().default(true),
});

const bulkMemberUpdateSchema = z.object({
  memberIds: z.array(z.number()).min(1, "At least one member ID is required"),
  updateType: z.enum(["suspend", "activate", "terminate", "renew", "transfer"]),
  updateData: z.record(z.any()),
});

const documentUploadSchema = z.object({
  documentType: z.enum([
    "national_id",
    "passport",
    "birth_certificate",
    "marriage_certificate",
    "employment_letter",
    "medical_report",
    "student_letter",
    "other"
  ]),
  documentName: z.string().min(1),
  fileName: z.string().min(1),
  filePath: z.string().min(1),
  fileSize: z.number(),
  mimeType: z.string(),
  expiresAt: z.string().optional(),
});

// ============================================================================
// MEMBER LIFECYCLE MANAGEMENT ENDPOINTS
// ============================================================================

export function setupMemberRoutes(app: any) {
  // Enhanced member enrollment with validation
  app.post("/api/members/enroll", async (req: Request, res: Response) => {
    try {
      const validatedData = enrollMemberSchema.parse(req.body);

      // Additional business logic validation
      const company = await storage.getCompany(validatedData.companyId);
      if (!company) {
        return res.status(400).json({ error: "Company not found" });
      }

      // Check for duplicate email/phone
      const existingMember = await storage.getMemberByEmailOrPhone(
        validatedData.email,
        validatedData.phone
      );
      if (existingMember) {
        return res.status(400).json({
          error: "Member with this email or phone already exists"
        });
      }

      // For dependents, validate principal member exists
      if (validatedData.memberType === "dependent") {
        if (!validatedData.principalId) {
          return res.status(400).json({
            error: "Principal member ID is required for dependents"
          });
        }
        const principal = await storage.getMember(validatedData.principalId);
        if (!principal || principal.memberType !== "principal") {
          return res.status(400).json({ error: "Invalid principal member" });
        }
      }

      // Create member record
      const newMember = await storage.createMember({
        ...validatedData,
        membershipStatus: "pending",
        enrollmentDate: new Date().toISOString().split('T')[0],
      });

      // Create enrollment life event
      await storage.createLifeEvent({
        memberId: newMember.id,
        eventType: "enrollment",
        eventDate: new Date().toISOString().split('T')[0],
        previousStatus: null,
        newStatus: "pending",
        reason: "New member enrollment",
        processedBy: req.user?.id,
      });

      // Log audit trail
      await storage.createAuditLog({
        entityType: "member",
        entityId: newMember.id,
        action: "create",
        newValues: JSON.stringify(newMember),
        performedBy: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        description: `New member enrolled: ${newMember.firstName} ${newMember.lastName}`,
      });

      res.status(201).json({
        success: true,
        data: newMember,
        message: "Member enrolled successfully. Awaiting activation.",
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      }
      console.error("Member enrollment error:", error);
      res.status(500).json({ error: "Failed to enroll member" });
    }
  });

  // Activate member
  app.put("/api/members/:id/activate", async (req: Request, res: Response) => {
    try {
      const memberId = parseInt(req.params.id);
      const member = await storage.getMember(memberId);

      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      if (member.membershipStatus === "active") {
        return res.status(400).json({ error: "Member is already active" });
      }

      // Update member status
      const updatedMember = await storage.updateMemberStatus(memberId, "active");

      // Create activation life event
      await storage.createLifeEvent({
        memberId,
        eventType: "activation",
        eventDate: new Date().toISOString().split('T')[0],
        previousStatus: member.membershipStatus,
        newStatus: "active",
        reason: "Member activation",
        processedBy: req.user?.id,
      });

      // Send activation notification
      await storage.sendMemberNotification(memberId, "enrollment_confirmation", {
        memberName: `${member.firstName} ${member.lastName}`,
        activationDate: new Date().toISOString().split('T')[0],
      });

      // Log audit trail
      await storage.createAuditLog({
        entityType: "member",
        entityId: memberId,
        action: "update",
        oldValues: JSON.stringify({ membershipStatus: member.membershipStatus }),
        newValues: JSON.stringify({ membershipStatus: "active" }),
        performedBy: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        description: `Member activated: ${member.firstName} ${member.lastName}`,
      });

      res.json({
        success: true,
        data: updatedMember,
        message: "Member activated successfully",
      });

    } catch (error) {
      console.error("Member activation error:", error);
      res.status(500).json({ error: "Failed to activate member" });
    }
  });

  // Suspend member
  app.put("/api/members/:id/suspend", async (req: Request, res: Response) => {
    try {
      const memberId = parseInt(req.params.id);
      const validatedData = suspendMemberSchema.parse(req.body);

      const member = await storage.getMember(memberId);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      if (member.membershipStatus !== "active") {
        return res.status(400).json({ error: "Only active members can be suspended" });
      }

      // Update member status
      const updatedMember = await storage.updateMember(memberId, {
        membershipStatus: "suspended",
        lastSuspensionDate: new Date().toISOString().split('T')[0],
        suspensionReason: validatedData.reason,
      });

      // Create suspension life event
      await storage.createLifeEvent({
        memberId,
        eventType: "suspension",
        eventDate: new Date().toISOString().split('T')[0],
        previousStatus: "active",
        newStatus: "suspended",
        reason: validatedData.reason,
        notes: validatedData.notes,
        processedBy: req.user?.id,
      });

      // Send suspension notification
      await storage.sendMemberNotification(memberId, "suspension_notice", {
        memberName: `${member.firstName} ${member.lastName}`,
        suspensionReason: validatedData.reason,
      });

      // Log audit trail
      await storage.createAuditLog({
        entityType: "member",
        entityId: memberId,
        action: "update",
        oldValues: JSON.stringify({ membershipStatus: "active" }),
        newValues: JSON.stringify({
          membershipStatus: "suspended",
          suspensionReason: validatedData.reason
        }),
        performedBy: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        description: `Member suspended: ${member.firstName} ${member.lastName}`,
      });

      res.json({
        success: true,
        data: updatedMember,
        message: "Member suspended successfully",
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      }
      console.error("Member suspension error:", error);
      res.status(500).json({ error: "Failed to suspend member" });
    }
  });

  // Reinstate member
  app.put("/api/members/:id/reinstate", async (req: Request, res: Response) => {
    try {
      const memberId = parseInt(req.params.id);
      const { notes } = req.body;

      const member = await storage.getMember(memberId);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      if (member.membershipStatus !== "suspended") {
        return res.status(400).json({ error: "Only suspended members can be reinstated" });
      }

      // Update member status
      const updatedMember = await storage.updateMember(memberId, {
        membershipStatus: "active",
        suspensionReason: null,
      });

      // Create reinstatement life event
      await storage.createLifeEvent({
        memberId,
        eventType: "reinstatement",
        eventDate: new Date().toISOString().split('T')[0],
        previousStatus: "suspended",
        newStatus: "active",
        reason: "Member reinstatement",
        notes: notes,
        processedBy: req.user?.id,
      });

      // Send reinstatement notification
      await storage.sendMemberNotification(memberId, "enrollment_confirmation", {
        memberName: `${member.firstName} ${member.lastName}`,
        activationDate: new Date().toISOString().split('T')[0],
        message: "Your membership has been reinstated",
      });

      // Log audit trail
      await storage.createAuditLog({
        entityType: "member",
        entityId: memberId,
        action: "update",
        oldValues: JSON.stringify({ membershipStatus: "suspended" }),
        newValues: JSON.stringify({ membershipStatus: "active" }),
        performedBy: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        description: `Member reinstated: ${member.firstName} ${member.lastName}`,
      });

      res.json({
        success: true,
        data: updatedMember,
        message: "Member reinstated successfully",
      });

    } catch (error) {
      console.error("Member reinstatement error:", error);
      res.status(500).json({ error: "Failed to reinstate member" });
    }
  });

  // Terminate member
  app.put("/api/members/:id/terminate", async (req: Request, res: Response) => {
    try {
      const memberId = parseInt(req.params.id);
      const { reason, terminationDate, beneficiaryInfo } = req.body;

      const member = await storage.getMember(memberId);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      if (member.membershipStatus === "terminated") {
        return res.status(400).json({ error: "Member is already terminated" });
      }

      // Update member status
      const updateData: any = {
        membershipStatus: "terminated",
        terminationDate: terminationDate || new Date().toISOString().split('T')[0],
      };

      if (beneficiaryInfo) {
        updateData.beneficiaryName = beneficiaryInfo.name;
        updateData.beneficiaryRelationship = beneficiaryInfo.relationship;
        updateData.beneficiaryContact = beneficiaryInfo.contact;
      }

      const updatedMember = await storage.updateMember(memberId, updateData);

      // Create termination life event
      await storage.createLifeEvent({
        memberId,
        eventType: "termination",
        eventDate: terminationDate || new Date().toISOString().split('T')[0],
        previousStatus: member.membershipStatus,
        newStatus: "terminated",
        reason: reason,
        processedBy: req.user?.id,
      });

      // Send termination notification
      await storage.sendMemberNotification(memberId, "termination_notice", {
        memberName: `${member.firstName} ${member.lastName}`,
        terminationDate: terminationDate || new Date().toISOString().split('T')[0],
        reason: reason,
      });

      // Log audit trail
      await storage.createAuditLog({
        entityType: "member",
        entityId: memberId,
        action: "update",
        oldValues: JSON.stringify({ membershipStatus: member.membershipStatus }),
        newValues: JSON.stringify(updateData),
        performedBy: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        description: `Member terminated: ${member.firstName} ${member.lastName}`,
      });

      res.json({
        success: true,
        data: updatedMember,
        message: "Member terminated successfully",
      });

    } catch (error) {
      console.error("Member termination error:", error);
      res.status(500).json({ error: "Failed to terminate member" });
    }
  });

  // Renew member
  app.put("/api/members/:id/renew", async (req: Request, res: Response) => {
    try {
      const memberId = parseInt(req.params.id);
      const validatedData = renewMemberSchema.parse(req.body);

      const member = await storage.getMember(memberId);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Update member renewal date
      const updatedMember = await storage.updateMember(memberId, {
        renewalDate: validatedData.renewalDate,
      });

      // Create renewal life event
      await storage.createLifeEvent({
        memberId,
        eventType: "renewal",
        eventDate: new Date().toISOString().split('T')[0],
        previousStatus: member.membershipStatus,
        newStatus: member.membershipStatus,
        reason: "Membership renewal",
        notes: validatedData.notes,
        processedBy: req.user?.id,
      });

      // Send renewal notification
      await storage.sendMemberNotification(memberId, "renewal_notification", {
        memberName: `${member.firstName} ${member.lastName}`,
        renewalDate: validatedData.renewalDate,
      });

      // Log audit trail
      await storage.createAuditLog({
        entityType: "member",
        entityId: memberId,
        action: "update",
        oldValues: JSON.stringify({ renewalDate: member.renewalDate }),
        newValues: JSON.stringify({ renewalDate: validatedData.renewalDate }),
        performedBy: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        description: `Member renewed: ${member.firstName} ${member.lastName}`,
      });

      res.json({
        success: true,
        data: updatedMember,
        message: "Member renewed successfully",
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      }
      console.error("Member renewal error:", error);
      res.status(500).json({ error: "Failed to renew member" });
    }
  });

  // ============================================================================
  // ENHANCED MEMBER QUERIES
  // ============================================================================

  // Get member lifecycle history
  app.get("/api/members/:id/lifecycle", async (req: Request, res: Response) => {
    try {
      const memberId = parseInt(req.params.id);

      const member = await storage.getMember(memberId);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      const lifeEvents = await storage.getMemberLifeEvents(memberId);

      res.json({
        success: true,
        data: {
          member,
          lifeEvents: lifeEvents.sort((a, b) =>
            new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
          ),
        },
      });

    } catch (error) {
      console.error("Get member lifecycle error:", error);
      res.status(500).json({ error: "Failed to get member lifecycle" });
    }
  });

  // Real-time eligibility check
  app.get("/api/members/:id/eligibility", async (req: Request, res: Response) => {
    try {
      const memberId = parseInt(req.params.id);
      const { benefitId } = req.query;

      const eligibility = await storage.checkMemberEligibility(memberId, Number(benefitId));

      res.json({
        success: true,
        data: eligibility,
      });

    } catch (error) {
      console.error("Eligibility check error:", error);
      res.status(500).json({ error: "Failed to check eligibility" });
    }
  });

  // Get member documents
  app.get("/api/members/:id/documents", async (req: Request, res: Response) => {
    try {
      const memberId = parseInt(req.params.id);

      const documents = await storage.getMemberDocuments(memberId);

      res.json({
        success: true,
        data: documents,
      });

    } catch (error) {
      console.error("Get member documents error:", error);
      res.status(500).json({ error: "Failed to get member documents" });
    }
  });

  // Upload member document
  app.post("/api/members/:id/documents", async (req: Request, res: Response) => {
    try {
      const memberId = parseInt(req.params.id);
      const validatedData = documentUploadSchema.parse(req.body);

      const member = await storage.getMember(memberId);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      const document = await storage.uploadMemberDocument({
        memberId,
        ...validatedData,
        uploadedBy: req.user?.id,
      });

      // Log audit trail
      await storage.createAuditLog({
        entityType: "document",
        entityId: document.id,
        action: "create",
        newValues: JSON.stringify(document),
        performedBy: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        description: `Document uploaded for member: ${member.firstName} ${member.lastName}`,
      });

      res.status(201).json({
        success: true,
        data: document,
        message: "Document uploaded successfully",
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      }
      console.error("Document upload error:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  // Advanced member search
  app.get("/api/members/search", async (req: Request, res: Response) => {
    try {
      const {
        query,
        companyId,
        membershipStatus,
        memberType,
        dateOfBirth,
        gender,
        page = 1,
        limit = 20
      } = req.query;

      const filters: any = {};
      if (companyId) filters.companyId = Number(companyId);
      if (membershipStatus) filters.membershipStatus = membershipStatus;
      if (memberType) filters.memberType = memberType;
      if (dateOfBirth) filters.dateOfBirth = dateOfBirth;
      if (gender) filters.gender = gender;

      const searchResults = await storage.searchMembers({
        query: query as string,
        filters,
        pagination: {
          page: Number(page),
          limit: Number(limit),
        },
      });

      res.json({
        success: true,
        data: searchResults,
      });

    } catch (error) {
      console.error("Member search error:", error);
      res.status(500).json({ error: "Failed to search members" });
    }
  });

  // Get communication history
  app.get("/api/members/:id/communications", async (req: Request, res: Response) => {
    try {
      const memberId = parseInt(req.params.id);

      const communications = await storage.getMemberCommunications(memberId);

      res.json({
        success: true,
        data: communications,
      });

    } catch (error) {
      console.error("Get communications error:", error);
      res.status(500).json({ error: "Failed to get communications" });
    }
  });

  // Send member notification
  app.post("/api/members/:id/notify", async (req: Request, res: Response) => {
    try {
      const memberId = parseInt(req.params.id);
      const { communicationType, channel, subject, content, recipient } = req.body;

      const member = await storage.getMember(memberId);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      const communication = await storage.sendMemberNotification(memberId, communicationType, {
        channel,
        subject,
        content,
        recipient: recipient || member.email,
      });

      res.status(201).json({
        success: true,
        data: communication,
        message: "Notification sent successfully",
      });

    } catch (error) {
      console.error("Send notification error:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });
}