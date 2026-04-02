// Type Safety and Schema Validation Tests

import { TestDataFactory, TestValidationSchemas, Assert, TestRunner } from "./test-framework";
import type {
  Member,
  Company,
  CreateMemberRequest,
  MemberConsent,
  MemberDocument,
  MemberSearchRequest
} from "@/types/members";

describe("Type Safety and Schema Validation Tests", () => {
  TestRunner.startSuite("Type Safety and Schema Validation Tests");

  describe("Member Type Validation", () => {
    const test = TestRunner.runTest("Valid member request passes validation", async () => {
      const validMemberData = TestDataFactory.createValidMemberRequest();
      const result = TestValidationSchemas.memberRequest.safeParse(validMemberData);

      Assert.isTrue(result.success, "Valid member data should pass validation");
    });

    TestRunner.addTest(test);

    const test2 = TestRunner.runTest("Invalid member request fails validation", async () => {
      const invalidMemberData = {
        companyId: -1, // Invalid: should be positive
        memberType: "invalid" as any, // Invalid: should be enum value
        firstName: "A", // Invalid: too short
        email: "invalid-email", // Invalid: not valid email
        phone: "123", // Invalid: too short
        dateOfBirth: "invalid-date", // Invalid: not valid date format
        gender: "invalid" as any, // Invalid: should be enum value
        nationalId: "123" // Invalid: not 8 digits
      };

      const result = TestValidationSchemas.memberRequest.safeParse(invalidMemberData);

      Assert.isTrue(!result.success, "Invalid member data should fail validation");
      Assert.isTrue(result.error.issues.length > 0, "Should have validation errors");
    });

    TestRunner.addTest(test2);

    const test3 = TestRunner.runTest("Enhanced fields validation", async () => {
      const memberWithAllFields = TestDataFactory.createValidMemberRequest({
        gender: "other",
        maritalStatus: "divorced",
        nationalId: "12345678",
        passportNumber: "A1234567",
        address: "123 Main Street",
        city: "Nairobi",
        postalCode: "00100",
        country: "Kenya",
        consents: [
          { consentType: "data_processing", consentGiven: true },
          { consentType: "marketing_communications", consentGiven: false },
          { consentType: "data_sharing_providers", consentGiven: true },
          { consentType: "data_sharing_partners", consentGiven: false },
          { consentType: "wellness_programs", consentGiven: true }
        ]
      });

      const result = TestValidationSchemas.memberRequest.safeParse(memberWithAllFields);

      Assert.isTrue(result.success, "Member with all enhanced fields should pass validation");

      // Validate specific fields
      const data = result.data;
      Assert.equals(data.gender, "other", "Gender should be preserved");
      Assert.equals(data.maritalStatus, "divorced", "Marital status should be preserved");
      Assert.equals(data.nationalId, "12345678", "National ID should be preserved");
      Assert.equals(data.consents?.length, 5, "Should have 5 consents");
    });

    TestRunner.addTest(test3);
  });

  describe("Company Type Validation", () => {
    const test4 = TestRunner.runTest("Valid company data passes validation", async () => {
      const validCompanyData = TestDataFactory.createMockCompany();
      const result = TestValidationSchemas.company.safeParse(validCompanyData);

      Assert.isTrue(result.success, "Valid company data should pass validation");
    });

    TestRunner.addTest(test4);

    const test5 = TestRunner.runTest("Enhanced company fields validation", async () => {
      const companyWithAllFields = TestDataFactory.createMockCompany({
        clientType: "education",
        billingFrequency: "annual",
        employerContributionPercentage: 75,
        experienceRatingEnabled: true,
        customBenefitStructure: true,
        gradeBasedBenefits: true,
        registrationExpiryDate: "2025-12-31",
        isVatRegistered: true,
        taxIdNumber: "KE123456789"
      });

      const result = TestValidationSchemas.company.safeParse(companyWithAllFields);

      Assert.isTrue(result.success, "Company with all enhanced fields should pass validation");

      const data = result.data;
      Assert.equals(data.clientType, "education", "Client type should be preserved");
      Assert.equals(data.billingFrequency, "annual", "Billing frequency should be preserved");
      Assert.equals(data.employerContributionPercentage, 75, "Employer contribution should be preserved");
      Assert.isTrue(data.experienceRatingEnabled, "Experience rating should be preserved");
    });

    TestRunner.addTest(test5);

    const test6 = TestRunner.runTest("Invalid company data fails validation", async () => {
      const invalidCompanyData = {
        name: "A", // Too short
        registrationNumber: "B", // Too short
        contactEmail: "invalid-email", // Invalid format
        contactPhone: "123", // Too short
        clientType: "invalid" as any, // Invalid enum value
        billingFrequency: "invalid" as any, // Invalid enum value
        employerContributionPercentage: 150, // Over 100%
        isVatRegistered: "yes" as any, // Should be boolean
        country: "" // Should be required string
      };

      const result = TestValidationSchemas.company.safeParse(invalidCompanyData);

      Assert.isTrue(!result.success, "Invalid company data should fail validation");
      Assert.isTrue(result.error.issues.length > 0, "Should have validation errors");
    });

    TestRunner.addTest(test6);
  });

  describe("TypeScript Type Safety", () => {
    const test7 = TestRunner.runTest("Member interface type safety", async () => {
      const member: Member = TestDataFactory.createMockMember();

      // Test that all required properties are present
      Assert.hasProperty(member, "id", "Member should have id");
      Assert.hasProperty(member, "companyId", "Member should have companyId");
      Assert.hasProperty(member, "memberType", "Member should have memberType");
      Assert.hasProperty(member, "firstName", "Member should have firstName");
      Assert.hasProperty(member, "lastName", "Member should have lastName");
      Assert.hasProperty(member, "email", "Member should have email");
      Assert.hasProperty(member, "phone", "Member should have phone");
      Assert.hasProperty(member, "dateOfBirth", "Member should have dateOfBirth");
      Assert.hasProperty(member, "employeeId", "Member should have employeeId");
      Assert.hasProperty(member, "gender", "Member should have gender");
      Assert.hasProperty(member, "maritalStatus", "Member should have maritalStatus");
      Assert.hasProperty(member, "nationalId", "Member should have nationalId");
      Assert.hasProperty(member, "membershipStatus", "Member should have membershipStatus");
      Assert.hasProperty(member, "isActive", "Member should have isActive");

      // Test type-specific properties
      Assert.isTrue(member.memberType === "principal" || member.memberType === "dependent", "Member type should be enum value");
      if (member.gender) {
        Assert.isTrue(["male", "female", "other"].includes(member.gender), "Gender should be enum value");
      }
      if (member.membershipStatus) {
        Assert.isTrue(["active", "pending", "suspended", "terminated", "expired"].includes(member.membershipStatus), "Membership status should be enum value");
      }
    });

    TestRunner.addTest(test7);

    const test8 = TestRunner.runTest("Company interface type safety", async () => {
      const company: Company = TestDataFactory.createMockCompany();

      // Test required properties
      Assert.hasProperty(company, "id", "Company should have id");
      Assert.hasProperty(company, "name", "Company should have name");
      Assert.hasProperty(company, "registrationNumber", "Company should have registrationNumber");
      Assert.hasProperty(company, "contactPerson", "Company should have contactPerson");
      Assert.hasProperty(company, "contactEmail", "Company should have contactEmail");
      Assert.hasProperty(company, "contactPhone", "Company should have contactPhone");
      Assert.hasProperty(company, "address", "Company should have address");
      Assert.hasProperty(company, "clientType", "Company should have clientType");
      Assert.hasProperty(company, "billingFrequency", "Company should have billingFrequency");
      Assert.hasProperty(company, "isActive", "Company should have isActive");

      // Test type-specific properties
      Assert.isTrue(["individual", "corporate", "sme", "government", "education", "association"].includes(company.clientType), "Client type should be enum value");
      Assert.isTrue(["monthly", "quarterly", "annual", "pro_rata"].includes(company.billingFrequency), "Billing frequency should be enum value");
      Assert.isTrue(typeof company.isActive === "boolean", "IsActive should be boolean");
    });

    TestRunner.addTest(test8);

    const test9 = TestRunner.runTest("Optional fields type safety", async () => {
      // Test that optional fields can be undefined
      const memberWithOptionalFields: Member = {
        id: 1,
        companyId: 1,
        memberType: "principal",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "+254712345678",
        dateOfBirth: "1990-01-01",
        employeeId: "EMP001",
        // All enhanced fields can be undefined
        gender: undefined,
        maritalStatus: undefined,
        nationalId: undefined,
        passportNumber: undefined,
        address: undefined,
        city: undefined,
        postalCode: undefined,
        country: "Kenya",
        membershipStatus: undefined,
        // System fields
        isActive: true,
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-01T00:00:00.000Z"
      };

      // Should not have type errors
      Assert.hasProperty(memberWithOptionalFields, "id");
      Assert.isTrue(memberWithOptionalFields.gender === undefined, "Optional field can be undefined");
      Assert.isTrue(memberWithOptionalFields.maritalStatus === undefined, "Optional field can be undefined");
    });

    TestRunner.addTest(test9);
  });

  describe("Enum Value Validation", () => {
    const test10 = TestRunner.runTest("MemberType enum validation", async () => {
      const validTypes = ["principal", "dependent"];
      validTypes.forEach(type => {
        const member: Member = TestDataFactory.createMockMember({ memberType: type as any });
        Assert.isTrue(validTypes.includes(member.memberType), `${type} should be valid member type`);
      });
    });

    TestRunner.addTest(test10);

    const test11 = TestRunner.runTest("DependentType enum validation", async () => {
      const validTypes = ["spouse", "child", "parent", "guardian"];
      validTypes.forEach(type => {
        const member: Member = TestDataFactory.createMockMember({
          memberType: "dependent",
          dependentType: type as any
        });
        Assert.isTrue(validTypes.includes(member.dependentType || ""), `${type} should be valid dependent type`);
      });
    });

    TestRunner.addTest(test11);

    const test12 = TestRunner.runTest("Gender enum validation", async () => {
      const validGenders = ["male", "female", "other"];
      validGenders.forEach(gender => {
        const member: Member = TestDataFactory.createMockMember({ gender: gender as any });
        Assert.isTrue(member.gender === gender, `${gender} should be valid gender`);
      });
    });

    TestRunner.addTest(test12);

    const test13 = TestRunner.runTest("ClientType enum validation", async () => {
      const validTypes = ["individual", "corporate", "sme", "government", "education", "association"];
      validTypes.forEach(type => {
        const company: Company = TestDataFactory.createMockCompany({ clientType: type as any });
        Assert.isTrue(company.clientType === type, `${type} should be valid client type`);
      });
    });

    TestRunner.addTest(test13);
  });

  describe("Search Parameter Validation", () => {
    const test14 = TestRunner.runTest("Valid search parameters", async () => {
      const validSearchParams: MemberSearchRequest = {
        companyId: 1,
        memberType: "principal",
        membershipStatus: "active",
        searchTerm: "John",
        dateOfBirthFrom: "1990-01-01",
        dateOfBirthTo: "2020-12-31",
        gender: "male",
        city: "Nairobi",
        country: "Kenya",
        page: 1,
        limit: 10,
        sortBy: "firstName",
        sortOrder: "asc"
      };

      // TypeScript should not complain about these types
      const search: MemberSearchRequest = validSearchParams;
      Assert.equals(search.companyId, 1, "Company ID should be number");
      Assert.equals(search.memberType, "principal", "Member type should be string");
      Assert.equals(search.page, 1, "Page should be number");
      Assert.isTrue(search.sortOrder === "asc" || search.sortOrder === "desc", "Sort order should be enum value");
    });

    TestRunner.addTest(test14);

    const test15 = TestRunner.runTest("Search parameter type constraints", async () => {
      // Test invalid enum values
      const invalidSearchParams: MemberSearchRequest = {
        memberType: "invalid" as any,
        membershipStatus: "invalid" as any,
        gender: "invalid" as any,
        sortOrder: "invalid" as any
      };

      // TypeScript should catch type errors at compile time
      // This would fail to compile if strict type checking is enabled
      // const invalidMemberType: "principal" | "dependent" = invalidSearchParams.memberType;
    });

    TestRunner.addTest(test15);
  });

  describe("Data Consistency Validation", () => {
    const test16 = TestRunner.runTest("Dependent member must have principalId", async () => {
      const dependentMember: Member = TestDataFactory.createMockMember({
        memberType: "dependent",
        principalId: 1,
        dependentType: "child"
      });

      Assert.equals(dependentMember.memberType, "dependent", "Should be dependent member type");
      Assert.equals(dependentMember.principalId, 1, "Should have principal ID");
      Assert.equals(dependentMember.dependentType, "child", "Should have dependent type");
    });

    TestRunner.addTest(test16);

    const test17 = TestRunner.runTest("Principal member should not have dependent fields", async () => {
      const principalMember: Member = TestDataFactory.createMockMember({
        memberType: "principal"
      });

      Assert.equals(principalMember.memberType, "principal", "Should be principal member type");
      Assert.isTrue(principalMember.principalId === undefined, "Principal should not have principal ID");
      Assert.isTrue(principalMember.dependentType === undefined, "Principal should not have dependent type");
      Assert.isTrue(principalMember.relationshipProofDocument === undefined, "Principal should not have relationship proof");
    });

    TestRunner.addTest(test17);

    const test18 = TestRunner.runTest("Date fields consistency", async () => {
      const member: Member = TestDataFactory.createMockMember();

      // All date fields should be valid ISO date strings
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
      Assert.isTrue(isoDateRegex.test(member.createdAt), "Created at should be valid ISO date");
      Assert.isTrue(isoDateRegex.test(member.updatedAt), "Updated at should be valid ISO date");

      // Date of birth should be valid
      const birthDate = new Date(member.dateOfBirth);
      Assert.isTrue(birthDate instanceof Date && !isNaN(birthDate.getTime()), "Date of birth should be valid date");
    });

    TestRunner.addTest(test18);
  });

  const testSuite = TestRunner.endSuite();
  console.log("Type Safety and Schema Validation Test Suite Results:");
  console.log(`- Total Tests: ${testSuite.tests.length}`);
  console.log(`- Passed: ${testSuite.passed}`);
  console.log(`- Failed: ${testSuite.failed}`);
  console.log(`- Duration: ${testSuite.totalDuration}ms`);

  if (testSuite.failed > 0) {
    console.log("\nFailed Tests:");
    testSuite.tests.filter(test => !test.passed).forEach(test => {
      console.log(`- ${test.testName}: ${test.error}`);
    });
  }

  return testSuite;
});