import { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import {
  members,
  companies,
  employeeGrades,
  dependentRules,
  communicationLogs,
  auditLogs
} from "../../shared/schema.js";
import { eq, and, inArray } from "drizzle-orm";
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import * as xlsx from 'xlsx';

// Validation schemas for corporate operations
const bulkEnrollSchema = z.object({
  companyId: z.number(),
  members: z.array(z.object({
    firstName: z.string().min(2).max(50),
    lastName: z.string().min(2).max(50),
    email: z.string().email(),
    phone: z.string().regex(/^254[7]\d{8}$/),
    dateOfBirth: z.string(),
    employeeId: z.string().min(1),
    memberType: z.enum(["principal", "dependent"]),
    principalId: z.number().optional(),
    dependentType: z.enum(["spouse", "child", "parent"]).optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
    maritalStatus: z.enum(["single", "married", "divorced", "widowed"]).optional(),
    nationalId: z.string().regex(/^\d{8}$/).optional(),
    gradeId: z.number().optional(),
    department: z.string().optional(),
    jobTitle: z.string().optional(),
  })),
  autoActivate: z.boolean().default(false),
  sendWelcomeNotifications: z.boolean().default(true),
});

const employeeGradeSchema = z.object({
  companyId: z.number(),
  gradeCode: z.string().min(1),
  gradeName: z.string().min(1),
  level: z.number().min(1),
  description: z.string().optional(),
});

const dependentRuleSchema = z.object({
  companyId: z.number(),
  dependentType: z.enum(["spouse", "child", "parent", "guardian"]),
  maxAge: z.number().optional(),
  maxCount: z.number().optional(),
  documentationRequired: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

const bulkUpdateSchema = z.object({
  companyId: z.number(),
  memberIds: z.array(z.number()).min(1),
  updateType: z.enum(["suspend", "activate", "terminate", "update_grade", "update_department"]),
  updateData: z.record(z.any()),
  reason: z.string().min(5),
  sendNotifications: z.boolean().default(true),
});

const bulkNotificationSchema = z.object({
  companyId: z.number(),
  memberIds: z.array(z.number()).optional(),
  communicationType: z.enum([
    "enrollment_confirmation",
    "renewal_notification",
    "card_generation",
    "pre_auth_update",
    "limit_reminder",
    "payment_due",
    "suspension_notice",
    "termination_notice"
  ]),
  channel: z.enum(["sms", "email", "mobile_app"]),
  subject: z.string().min(1),
  content: z.string().min(1),
  sendToAllMembers: z.boolean().default(false),
});

// ============================================================================
// CORPORATE BULK OPERATIONS ENDPOINTS
// ============================================================================

export function setupCorporateMemberRoutes(app: any) {
  // Bulk member enrollment
  app.post("/api/companies/:id/members/bulk-enroll", async (req: Request, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);
      const validatedData = bulkEnrollSchema.parse({ ...req.body, companyId });

      // Verify company exists
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      const results = {
        successful: [],
        failed: [],
        totalProcessed: validatedData.members.length,
      };

      // Process each member
      for (const memberData of validatedData.members) {
        try {
          // Check for duplicates
          const existingMember = await storage.getMemberByEmailOrPhone(
            memberData.email,
            memberData.phone
          );

          if (existingMember) {
            results.failed.push({
              member: memberData,
              error: "Member with this email or phone already exists",
            });
            continue;
          }

          // Validate principal member for dependents
          if (memberData.memberType === "dependent" && memberData.principalId) {
            const principal = await storage.getMember(memberData.principalId);
            if (!principal || principal.memberType !== "principal") {
              results.failed.push({
                member: memberData,
                error: "Invalid principal member",
              });
              continue;
            }
          }

          // Create member
          const newMember = await storage.createMember({
            companyId,
            ...memberData,
            membershipStatus: validatedData.autoActivate ? "active" : "pending",
            enrollmentDate: new Date().toISOString().split('T')[0],
          });

          results.successful.push(newMember);

          // Send welcome notification if enabled
          if (validatedData.sendWelcomeNotifications) {
            await storage.sendMemberNotification(newMember.id, "enrollment_confirmation", {
              memberName: `${newMember.firstName} ${newMember.lastName}`,
              companyName: company.name,
              autoActivated: validatedData.autoActivate,
            });
          }

          // Log audit trail
          await storage.createAuditLog({
            entityType: "member",
            entityId: newMember.id,
            action: "create",
            newValues: JSON.stringify(newMember),
            performedBy: req.user?.id,
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
            description: `Bulk enrollment: ${newMember.firstName} ${newMember.lastName}`,
          });

        } catch (error) {
          results.failed.push({
            member: memberData,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Send bulk operation summary to company admin
      await storage.sendCompanyNotification(companyId, "bulk_operation_complete", {
        operationType: "bulk_enrollment",
        totalProcessed: results.totalProcessed,
        successful: results.successful.length,
        failed: results.failed.length,
      });

      res.json({
        success: true,
        data: results,
        message: `Bulk enrollment completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      }
      console.error("Bulk enrollment error:", error);
      res.status(500).json({ error: "Failed to process bulk enrollment" });
    }
  });

  // CSV/Excel file upload for bulk enrollment
  app.post("/api/companies/:id/members/bulk-upload", async (req: Request, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const filePath = req.file.path;
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      let membersData: any[] = [];

      try {
        if (fileExtension === '.csv') {
          // Parse CSV file
          membersData = await new Promise((resolve, reject) => {
            const results: any[] = [];
            fs.createReadStream(filePath)
              .pipe(csv())
              .on('data', (data) => results.push(data))
              .on('end', () => resolve(results))
              .on('error', reject);
          });
        } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
          // Parse Excel file
          const workbook = xlsx.readFile(filePath);
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          membersData = xlsx.utils.sheet_to_json(worksheet);
        } else {
          return res.status(400).json({ error: "Unsupported file format. Please upload CSV or Excel files" });
        }

        // Validate and transform data
        const validatedMembers = [];
        for (const row of membersData) {
          try {
            const validatedMember = {
              firstName: row.firstName || row.First_Name || row['First Name'],
              lastName: row.lastName || row.Last_Name || row['Last Name'],
              email: row.email || row.Email,
              phone: row.phone || row.Phone,
              dateOfBirth: row.dateOfBirth || row.Date_of_Birth || row['Date of Birth'],
              employeeId: row.employeeId || row.Employee_ID || row['Employee ID'],
              memberType: (row.memberType || row.Member_Type || row['Member Type'] || 'principal').toLowerCase(),
              principalId: row.principalId || row.Principal_ID || row['Principal ID'],
              dependentType: row.dependentType || row.Dependent_Type || row['Dependent Type'],
              gender: row.gender || row.Gender,
              maritalStatus: row.maritalStatus || row.Marital_Status || row['Marital Status'],
              nationalId: row.nationalId || row.National_ID || row['National ID'],
              gradeId: row.gradeId || row.Grade_ID || row['Grade ID'],
              department: row.department || row.Department,
              jobTitle: row.jobTitle || row.Job_Title || row['Job Title'],
            };

            // Basic validation
            if (!validatedMember.firstName || !validatedMember.lastName || !validatedMember.email || !validatedMember.phone) {
              throw new Error("Missing required fields: firstName, lastName, email, phone");
            }

            validatedMembers.push(validatedMember);
          } catch (error) {
            console.warn("Skipping invalid row:", row, error);
          }
        }

        if (validatedMembers.length === 0) {
          return res.status(400).json({ error: "No valid member data found in file" });
        }

        // Process bulk enrollment
        const bulkData = {
          companyId,
          members: validatedMembers,
          autoActivate: req.body.autoActivate === 'true',
          sendWelcomeNotifications: req.body.sendWelcomeNotifications !== 'false',
        };

        // Call the bulk enrollment logic
        req.body = bulkData;
        return this.constructor.prototype.bulkEnrollMembers.call({ app }, req, res);

      } finally {
        // Clean up uploaded file
        fs.unlinkSync(filePath);
      }

    } catch (error) {
      console.error("Bulk upload error:", error);
      res.status(500).json({ error: "Failed to process uploaded file" });
    }
  });

  // Bulk member updates
  app.put("/api/companies/:id/members/bulk-update", async (req: Request, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);
      const validatedData = bulkUpdateSchema.parse({ ...req.body, companyId });

      // Verify company exists
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Verify all members belong to this company
      const companyMembers = await storage.getMembersByCompany(companyId);
      const memberIdsInCompany = new Set(companyMembers.map(m => m.id));
      const invalidMembers = validatedData.memberIds.filter(id => !memberIdsInCompany.has(id));

      if (invalidMembers.length > 0) {
        return res.status(400).json({
          error: "Some members do not belong to this company",
          invalidMembers,
        });
      }

      const results = {
        successful: [],
        failed: [],
        totalProcessed: validatedData.memberIds.length,
      };

      // Process each member
      for (const memberId of validatedData.memberIds) {
        try {
          const member = await storage.getMember(memberId);
          if (!member) {
            results.failed.push({
              memberId,
              error: "Member not found",
            });
            continue;
          }

          let updatedMember;
          let lifeEventType;

          switch (validatedData.updateType) {
            case "suspend":
              updatedMember = await storage.updateMember(memberId, {
                membershipStatus: "suspended",
                lastSuspensionDate: new Date().toISOString().split('T')[0],
                suspensionReason: validatedData.reason,
              });
              lifeEventType = "suspension";
              break;

            case "activate":
              updatedMember = await storage.updateMember(memberId, {
                membershipStatus: "active",
                suspensionReason: null,
              });
              lifeEventType = "activation";
              break;

            case "terminate":
              updatedMember = await storage.updateMember(memberId, {
                membershipStatus: "terminated",
                terminationDate: new Date().toISOString().split('T')[0],
              });
              lifeEventType = "termination";
              break;

            case "update_grade":
              updatedMember = await storage.updateMember(memberId, {
                gradeId: validatedData.updateData.gradeId,
              });
              lifeEventType = "upgrade"; // Could also be 'downgrade' depending on context
              break;

            case "update_department":
              updatedMember = await storage.updateMember(memberId, {
                department: validatedData.updateData.department,
                jobTitle: validatedData.updateData.jobTitle,
              });
              lifeEventType = "upgrade"; // Profile update
              break;

            default:
              throw new Error("Invalid update type");
          }

          results.successful.push(updatedMember);

          // Create life event
          await storage.createLifeEvent({
            memberId,
            eventType: lifeEventType!,
            eventDate: new Date().toISOString().split('T')[0],
            previousStatus: member.membershipStatus,
            newStatus: updatedMember.membershipStatus,
            reason: validatedData.reason,
            processedBy: req.user?.id,
          });

          // Send notification if enabled
          if (validatedData.sendNotifications) {
            await storage.sendMemberNotification(memberId, `${validatedData.updateType}_notice`, {
              memberName: `${member.firstName} ${member.lastName}`,
              reason: validatedData.reason,
              companyName: company.name,
            });
          }

          // Log audit trail
          await storage.createAuditLog({
            entityType: "member",
            entityId: memberId,
            action: "update",
            oldValues: JSON.stringify(member),
            newValues: JSON.stringify(updatedMember),
            performedBy: req.user?.id,
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
            description: `Bulk update (${validatedData.updateType}): ${member.firstName} ${member.lastName}`,
          });

        } catch (error) {
          results.failed.push({
            memberId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      res.json({
        success: true,
        data: results,
        message: `Bulk update completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      }
      console.error("Bulk update error:", error);
      res.status(500).json({ error: "Failed to process bulk update" });
    }
  });

  // Send bulk notifications
  app.post("/api/companies/:id/members/broadcast", async (req: Request, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);
      const validatedData = bulkNotificationSchema.parse({ ...req.body, companyId });

      // Verify company exists
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      let targetMembers = [];

      if (validatedData.sendToAllMembers) {
        targetMembers = await storage.getMembersByCompany(companyId);
      } else if (validatedData.memberIds && validatedData.memberIds.length > 0) {
        targetMembers = await Promise.all(
          validatedData.memberIds.map(id => storage.getMember(id))
        );
        targetMembers = targetMembers.filter(m => m && m.companyId === companyId);
      } else {
        return res.status(400).json({ error: "Either sendToAllMembers must be true or memberIds must be provided" });
      }

      const results = {
        successful: [],
        failed: [],
        totalProcessed: targetMembers.length,
      };

      // Send notifications to all target members
      for (const member of targetMembers) {
        try {
          const communication = await storage.sendMemberNotification(member!.id, validatedData.communicationType, {
            channel: validatedData.channel,
            subject: validatedData.subject,
            content: validatedData.content,
            recipient: member!.email,
          });

          results.successful.push({
            memberId: member!.id,
            memberName: `${member!.firstName} ${member!.lastName}`,
            communication,
          });

        } catch (error) {
          results.failed.push({
            memberId: member!.id,
            memberName: `${member!.firstName} ${member!.lastName}`,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      res.json({
        success: true,
        data: results,
        message: `Bulk notification completed: ${results.successful.length} sent, ${results.failed.length} failed`,
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      }
      console.error("Bulk notification error:", error);
      res.status(500).json({ error: "Failed to send bulk notifications" });
    }
  });

  // Export member data
  app.get("/api/companies/:id/members/export", async (req: Request, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);
      const { format = 'csv', includeInactive = false, includeDependents = true } = req.query;

      // Verify company exists
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Get members data
      const members = await storage.getMembersByCompany(companyId, {
        includeInactive: includeInactive === 'true',
        includeDependents: includeDependents === 'true',
      });

      // Prepare data for export
      const exportData = members.map(member => ({
        'Member ID': member.id,
        'First Name': member.firstName,
        'Last Name': member.lastName,
        'Email': member.email,
        'Phone': member.phone,
        'Date of Birth': member.dateOfBirth,
        'Employee ID': member.employeeId,
        'Member Type': member.memberType,
        'Dependent Type': member.dependentType || '',
        'Gender': member.gender || '',
        'Marital Status': member.maritalStatus || '',
        'National ID': member.nationalId || '',
        'Membership Status': member.membershipStatus,
        'Enrollment Date': member.enrollmentDate,
        'Department': member.department || '',
        'Job Title': member.jobTitle || '',
        'Created At': member.createdAt,
      }));

      // Generate file based on format
      let fileName, contentType, fileContent;

      if (format === 'csv') {
        fileContent = convertToCSV(exportData);
        fileName = `members_export_${company.name}_${new Date().toISOString().split('T')[0]}.csv`;
        contentType = 'text/csv';
      } else if (format === 'excel') {
        const ws = xlsx.utils.json_to_sheet(exportData);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'Members');
        fileContent = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        fileName = `members_export_${company.name}_${new Date().toISOString().split('T')[0]}.xlsx`;
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else {
        return res.status(400).json({ error: "Unsupported export format. Use 'csv' or 'excel'" });
      }

      // Set response headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      // Send file
      if (format === 'csv') {
        res.send(fileContent);
      } else {
        res.send(fileContent);
      }

      // Log audit trail
      await storage.createAuditLog({
        entityType: "company",
        entityId: companyId,
        action: "read",
        performedBy: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        description: `Member data export for company: ${company.name}`,
      });

    } catch (error) {
      console.error("Member export error:", error);
      res.status(500).json({ error: "Failed to export member data" });
    }
  });

  // ============================================================================
  // EMPLOYEE GRADE MANAGEMENT
  // ============================================================================

  // Create employee grade
  app.post("/api/companies/:id/grades", async (req: Request, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);
      const validatedData = employeeGradeSchema.parse({ ...req.body, companyId });

      // Verify company exists
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Check for duplicate grade code
      const existingGrade = await storage.getEmployeeGradeByCode(companyId, validatedData.gradeCode);
      if (existingGrade) {
        return res.status(400).json({ error: "Grade code already exists for this company" });
      }

      const newGrade = await storage.createEmployeeGrade(validatedData);

      // Log audit trail
      await storage.createAuditLog({
        entityType: "company",
        entityId: companyId,
        action: "create",
        newValues: JSON.stringify(newGrade),
        performedBy: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        description: `Employee grade created: ${newGrade.gradeCode} - ${newGrade.gradeName}`,
      });

      res.status(201).json({
        success: true,
        data: newGrade,
        message: "Employee grade created successfully",
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      }
      console.error("Create employee grade error:", error);
      res.status(500).json({ error: "Failed to create employee grade" });
    }
  });

  // Get all employee grades for company
  app.get("/api/companies/:id/grades", async (req: Request, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);

      const grades = await storage.getEmployeeGrades(companyId);

      res.json({
        success: true,
        data: grades,
      });

    } catch (error) {
      console.error("Get employee grades error:", error);
      res.status(500).json({ error: "Failed to get employee grades" });
    }
  });

  // Update employee grade
  app.put("/api/companies/:id/grades/:gradeId", async (req: Request, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);
      const gradeId = parseInt(req.params.gradeId);

      const grade = await storage.getEmployeeGrade(gradeId);
      if (!grade || grade.companyId !== companyId) {
        return res.status(404).json({ error: "Employee grade not found" });
      }

      const updatedGrade = await storage.updateEmployeeGrade(gradeId, req.body);

      // Log audit trail
      await storage.createAuditLog({
        entityType: "company",
        entityId: companyId,
        action: "update",
        oldValues: JSON.stringify(grade),
        newValues: JSON.stringify(updatedGrade),
        performedBy: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        description: `Employee grade updated: ${updatedGrade.gradeCode}`,
      });

      res.json({
        success: true,
        data: updatedGrade,
        message: "Employee grade updated successfully",
      });

    } catch (error) {
      console.error("Update employee grade error:", error);
      res.status(500).json({ error: "Failed to update employee grade" });
    }
  });

  // ============================================================================
  // DEPENDENT RULES MANAGEMENT
  // ============================================================================

  // Create dependent rule
  app.post("/api/companies/:id/dependent-rules", async (req: Request, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);
      const validatedData = dependentRuleSchema.parse({ ...req.body, companyId });

      // Verify company exists
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      const newRule = await storage.createDependentRule(validatedData);

      // Log audit trail
      await storage.createAuditLog({
        entityType: "company",
        entityId: companyId,
        action: "create",
        newValues: JSON.stringify(newRule),
        performedBy: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        description: `Dependent rule created: ${newRule.dependentType}`,
      });

      res.status(201).json({
        success: true,
        data: newRule,
        message: "Dependent rule created successfully",
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      }
      console.error("Create dependent rule error:", error);
      res.status(500).json({ error: "Failed to create dependent rule" });
    }
  });

  // Get all dependent rules for company
  app.get("/api/companies/:id/dependent-rules", async (req: Request, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);

      const rules = await storage.getDependentRules(companyId);

      res.json({
        success: true,
        data: rules,
      });

    } catch (error) {
      console.error("Get dependent rules error:", error);
      res.status(500).json({ error: "Failed to get dependent rules" });
    }
  });
}

// Helper function to convert data to CSV
function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');

  const csvRows = data.map(row =>
    headers.map(header => {
      const value = row[header];
      // Escape commas and quotes in values
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    }).join(',')
  );

  return [csvHeaders, ...csvRows].join('\n');
}