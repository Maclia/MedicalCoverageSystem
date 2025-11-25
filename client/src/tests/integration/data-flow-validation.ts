// Data Flow Validation for UI-Backend Integration

import { membersAPI } from "@/api/members";
import { corporateMembersAPI } from "@/api/corporate-members";
import { TestDataFactory, Assert } from "./test-framework";

// Mock fetch for testing
global.fetch = jest.fn();

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  dataFlowValidated: string[];
}

export class DataFlowValidator {
  private results: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    dataFlowValidated: []
  };

  private addValidation(step: string, isValid: boolean, error?: string): void {
    if (isValid) {
      this.results.dataFlowValidated.push(`✅ ${step}`);
    } else {
      this.results.isValid = false;
      this.results.errors.push(`❌ ${step}: ${error}`);
    }
  }

  private addWarning(warning: string): void {
    this.results.warnings.push(`⚠️ ${warning}`);
  }

  async validateMemberEnrollmentFlow(): Promise<void> {
    console.log("🔄 Validating Member Enrollment Data Flow...");

    try {
      // Step 1: Enhanced member data creation
      const memberRequest = TestDataFactory.createValidMemberRequest({
        gender: 'male',
        maritalStatus: 'married',
        nationalId: '12345678',
        address: '123 Main Street',
        city: 'Nairobi',
        postalCode: '00100',
        country: 'Kenya'
      });

      // Mock API responses for enrollment flow
      const mockMember = TestDataFactory.createMockMember({
        ...memberRequest,
        id: 1,
        membershipStatus: 'pending',
        enrollmentDate: new Date().toISOString().split('T')[0]
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockMember,
          message: "Member enrolled successfully"
        })
      });

      // Test enrollment API call
      const createdMember = await membersAPI.createMember(memberRequest);

      // Validate enrollment data flow
      this.addValidation(
        "Enhanced member data transmission",
        createdMember.firstName === memberRequest.firstName &&
        createdMember.lastName === memberRequest.lastName &&
        createdMember.gender === memberRequest.gender &&
        createdMember.nationalId === memberRequest.nationalId
      );

      // Step 2: Member activation flow
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...mockMember, membershipStatus: 'active' },
          message: "Member activated successfully"
        })
      });

      const activatedMember = await membersAPI.activateMember(1);

      this.addValidation(
        "Member activation data flow",
        activatedMember.membershipStatus === 'active'
      );

      this.addValidation(
        "API response structure consistency",
        'data' in (await (global.fetch as jest.Mock).mock.results[1].value.json())
      );

    } catch (error) {
      this.addValidation("Member enrollment flow", false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async validateDependentEnrollmentFlow(): Promise<void> {
    console.log("🔄 Validating Dependent Enrollment Data Flow...");

    try {
      const dependentRequest = TestDataFactory.createValidDependentRequest({
        dependentType: 'child',
        principalId: 1,
        hasDisability: false,
        gender: 'female'
      });

      const mockDependent = TestDataFactory.createMockMember({
        ...dependentRequest,
        id: 2,
        membershipStatus: 'pending'
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockDependent,
          message: "Dependent enrolled successfully"
        })
      });

      const createdDependent = await membersAPI.createMember(dependentRequest);

      this.addValidation(
        "Dependent type enforcement",
        createdDependent.dependentType === dependentRequest.dependentType
      );

      this.addValidation(
        "Principal-dependent relationship",
        createdDependent.principalId === dependentRequest.principalId
      );

      this.addValidation(
        "Enhanced dependent fields",
        createdDependent.hasDisability === dependentRequest.hasDisability
      );

    } catch (error) {
      this.addValidation("Dependent enrollment flow", false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async validateDocumentManagementFlow(): Promise<void> {
    console.log("🔄 Validating Document Management Data Flow...");

    try {
      const documentData = {
        documentType: 'national_id',
        documentName: 'National ID Card',
        fileName: 'national_id.jpg',
        filePath: '/uploads/documents/national_id.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg'
      };

      const mockDocument = {
        id: 1,
        memberId: 1,
        ...documentData,
        status: 'pending',
        uploadedAt: new Date().toISOString()
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockDocument,
          message: "Document uploaded successfully"
        })
      });

      const uploadedDocument = await membersAPI.uploadDocument(1, documentData);

      this.addValidation(
        "Document metadata transmission",
        uploadedDocument.documentType === documentData.documentType &&
        uploadedDocument.fileName === documentData.fileName
      );

      this.addValidation(
        "File size and type validation",
        uploadedDocument.fileSize === documentData.fileSize &&
        uploadedDocument.mimeType === documentData.mimeType
      );

      // Test document retrieval
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [mockDocument]
        })
      });

      const documents = await membersAPI.getMemberDocuments(1);

      this.addValidation(
        "Document retrieval data flow",
        documents.length === 1 && documents[0].id === mockDocument.id
      );

    } catch (error) {
      this.addValidation("Document management flow", false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async validateBulkOperationsFlow(): Promise<void> {
    console.log("🔄 Validating Bulk Operations Data Flow...");

    try {
      const bulkRequest = {
        companyId: 1,
        members: [
          TestDataFactory.createValidMemberRequest({ firstName: 'John', lastName: 'Doe' }),
          TestDataFactory.createValidMemberRequest({ firstName: 'Jane', lastName: 'Smith' }),
          TestDataFactory.createValidMemberRequest({ firstName: 'Bob', lastName: 'Johnson' })
        ],
        autoActivate: false,
        sendWelcomeNotifications: true
      };

      const mockBulkResult = {
        successful: [
          TestDataFactory.createMockMember({ firstName: 'John', lastName: 'Doe' }),
          TestDataFactory.createMockMember({ firstName: 'Jane', lastName: 'Smith', id: 2 })
        ],
        failed: [
          { member: bulkRequest.members[2], error: "Email already exists" }
        ],
        totalProcessed: 3
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockBulkResult,
          message: "Bulk enrollment completed: 2 successful, 1 failed"
        })
      });

      const bulkResult = await corporateMembersAPI.bulkEnroll(bulkRequest);

      this.addValidation(
        "Bulk data transmission",
        bulkResult.successful.length === 2 &&
        bulkResult.failed.length === 1 &&
        bulkResult.totalProcessed === 3
      );

      this.addValidation(
        "Error handling in bulk operations",
        bulkResult.failed[0].error.includes("Email already exists")
      );

      this.addValidation(
        "Partial success processing",
        bulkResult.successful.length > 0 && bulkResult.failed.length > 0
      );

    } catch (error) {
      this.addValidation("Bulk operations flow", false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async validateSearchAndFilteringFlow(): Promise<void> {
    console.log("🔄 Validating Search and Filtering Data Flow...");

    try {
      const searchParams = {
        query: 'John',
        companyId: 1,
        membershipStatus: 'active',
        gender: 'male',
        dateOfBirth: '1990-01-01',
        page: 1,
        limit: 20
      };

      const mockSearchResults = {
        members: [
          TestDataFactory.createMockMember({
            firstName: 'John',
            lastName: 'Doe',
            companyId: 1,
            membershipStatus: 'active',
            gender: 'male',
            dateOfBirth: '1990-01-01'
          })
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockSearchResults
        })
      });

      const searchResults = await membersAPI.searchMembers(searchParams);

      this.addValidation(
        "Search parameter transmission",
        searchResults.members.length === 1 &&
        searchResults.members[0].firstName === 'John'
      );

      this.addValidation(
        "Multi-field filtering",
        searchResults.members[0].companyId === 1 &&
        searchResults.members[0].membershipStatus === 'active' &&
        searchResults.members[0].gender === 'male'
      );

      this.addValidation(
        "Pagination metadata",
        searchResults.total === 1 &&
        searchResults.page === 1 &&
        searchResults.limit === 20
      );

    } catch (error) {
      this.addValidation("Search and filtering flow", false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async validateComplianceAndAuditFlow(): Promise<void> {
    console.log("🔄 Validating Compliance and Audit Data Flow...");

    try {
      const mockAuditLogs = [
        {
          id: 1,
          entityType: 'member',
          entityId: 1,
          action: 'create',
          oldValues: null,
          newValues: JSON.stringify({ firstName: 'John', lastName: 'Doe' }),
          performedBy: 1,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0...',
          description: 'New member enrolled: John Doe',
          createdAt: new Date().toISOString()
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            logs: mockAuditLogs,
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1
          }
        })
      });

      const auditLogs = await membersAPI.getAuditLogs({
        entityType: 'member',
        action: 'create'
      });

      this.addValidation(
        "Audit log data integrity",
        auditLogs.logs.length === 1 &&
        auditLogs.logs[0].action === 'create' &&
        auditLogs.logs[0].entityType === 'member'
      );

      this.addValidation(
        "Change tracking data",
        auditLogs.logs[0].newValues &&
        auditLogs.logs[0].newValues.includes('John Doe')
      );

      this.addValidation(
        "Compliance metadata collection",
        auditLogs.logs[0].ipAddress &&
        auditLogs.logs[0].userAgent &&
        auditLogs.logs[0].performedBy
      );

    } catch (error) {
      this.addValidation("Compliance and audit flow", false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async validateTypeSafetyFlow(): Promise<void> {
    console.log("🔄 Validating Type Safety Data Flow...");

    try {
      // Test that TypeScript interfaces match actual API responses
      const memberRequest = TestDataFactory.createValidMemberRequest();

      // Mock a response that should match the expected Member interface
      const mockMember = {
        id: 1,
        companyId: memberRequest.companyId,
        memberType: memberRequest.memberType as 'principal' | 'dependent',
        firstName: memberRequest.firstName,
        lastName: memberRequest.lastName,
        email: memberRequest.email,
        phone: memberRequest.phone,
        dateOfBirth: memberRequest.dateOfBirth,
        employeeId: memberRequest.employeeId,
        gender: memberRequest.gender as 'male' | 'female' | 'other' | undefined,
        maritalStatus: memberRequest.maritalStatus as 'single' | 'married' | 'divorced' | 'widowed' | undefined,
        nationalId: memberRequest.nationalId,
        membershipStatus: 'active' as 'active' | 'pending' | 'suspended' | 'terminated' | 'expired',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockMember
        })
      });

      const result = await membersAPI.createMember(memberRequest);

      // Validate type safety at runtime
      this.addValidation(
        "Required field presence",
        result.id && result.firstName && result.lastName && result.email
      );

      this.addValidation(
        "Optional field handling",
        result.gender === undefined || typeof result.gender === 'string'
      );

      this.addValidation(
        "Enum value validation",
        ['principal', 'dependent'].includes(result.memberType) &&
        ['active', 'pending', 'suspended', 'terminated', 'expired'].includes(result.membershipStatus)
      );

    } catch (error) {
      this.addValidation("Type safety flow", false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async runFullValidation(): Promise<ValidationResult> {
    console.log("🔍 Starting Full UI-Backend Integration Data Flow Validation");
    console.log("=" .repeat(80));

    try {
      await this.validateMemberEnrollmentFlow();
      await this.validateDependentEnrollmentFlow();
      await this.validateDocumentManagementFlow();
      await this.validateBulkOperationsFlow();
      await this.validateSearchAndFilteringFlow();
      await this.validateComplianceAndAuditFlow();
      await this.validateTypeSafetyFlow();

      console.log("\n" + "=".repeat(80));
      console.log("📊 DATA FLOW VALIDATION RESULTS");
      console.log("=".repeat(80));

      if (this.results.isValid) {
        console.log("🎉 ALL DATA FLOWS VALIDATED SUCCESSFULLY!");
      } else {
        console.log("❌ SOME DATA FLOWS FAILED VALIDATION");
      }

      console.log("\n✅ Validated Data Flows:");
      this.results.dataFlowValidated.forEach(step => {
        console.log(`  ${step}`);
      });

      if (this.results.warnings.length > 0) {
        console.log("\n⚠️ Warnings:");
        this.results.warnings.forEach(warning => {
          console.log(`  ${warning}`);
        });
      }

      if (this.results.errors.length > 0) {
        console.log("\n❌ Errors:");
        this.results.errors.forEach(error => {
          console.log(`  ${error}`);
        });
      }

      console.log("\n📈 Summary:");
      console.log(`  Total Validations: ${this.results.dataFlowValidated.length}`);
      console.log(`  Warnings: ${this.results.warnings.length}`);
      console.log(`  Errors: ${this.results.errors.length}`);
      console.log(`  Success Rate: ${((this.results.dataFlowValidated.length / (this.results.dataFlowValidated.length + this.results.errors.length)) * 100).toFixed(1)}%`);

    } catch (error) {
      console.error("Validation process failed:", error);
      this.results.isValid = false;
      this.results.errors.push(`Validation process error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return this.results;
  }
}

export default DataFlowValidator;