// Integration Tests for Enhanced Dependent Form Component

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { differenceInYears } from "date-fns";
import DependentForm from "@/components/dependents/DependentForm";
import { TestDataFactory, Assert, TestRunner } from "./test-framework";

// Mock API responses
jest.mock("@/lib/queryClient", () => ({
  apiRequest: jest.fn(),
  queryClient: {
    invalidateQueries: jest.fn()
  }
}));

jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn()
}));

const mockApiRequest = require("@/lib/queryClient").apiRequest;
const { useMutation, useQuery } = require("@tanstack/react-query");

describe("Enhanced Dependent Form Integration Tests", () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <DependentForm onSuccess={jest.fn()} {...props} />
      </QueryClientProvider>
    );
  };

  TestRunner.startSuite("Enhanced Dependent Form Tests");

  describe("Enhanced Dependent Types and Validation", () => {
    const test = await TestRunner.runTest("Form includes new dependent types (parent, guardian)", async () => {
      // Mock principals query
      useQuery.mockReturnValue({
        data: [{ id: 1, firstName: "John", lastName: "Doe" }],
        isLoading: false,
        error: null
      });

      const mockMutate = jest.fn();
      useMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null
      });

      renderComponent();

      // Check that new dependent types are available
      const dependentTypeSelect = screen.getByLabelText("Dependent Type");
      expect(dependentTypeSelect).toBeInTheDocument();

      // Check dropdown contains new types
      await act(async () => {
        await user.click(dependentTypeSelect);
      });

      expect(screen.getByText("Spouse")).toBeInTheDocument();
      expect(screen.getByText("Child")).toBeInTheDocument();
      expect(screen.getByText("Parent")).toBeInTheDocument();
      expect(screen.getByText("Guardian")).toBeInTheDocument();
    });

    TestRunner.addTest(test);

    const test2 = await TestRunner.runTest("Age validation works for different dependent types", async () => {
      useQuery.mockReturnValue({
        data: [{ id: 1, firstName: "John", lastName: "Doe" }],
        isLoading: false,
        error: null
      });

      const mockMutate = jest.fn();
      useMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null
      });

      renderComponent();

      // Test spouse age validation (must be 18+)
      await act(async () => {
        await user.selectOptions(screen.getByLabelText("Dependent Type"), "Spouse");
        await user.type(screen.getByLabelText("First Name"), "Jane");
        await user.type(screen.getByLabelText("Last Name"), "Doe");
        await user.type(screen.getByLabelText("Date of Birth"), "2010-05-15"); // 14 years old
        await user.click(screen.getByText("Enroll Dependent"));
      });

      expect(screen.getByText("Spouse must be at least 18 years old")).toBeInTheDocument();

      // Test child age validation (0-18 unless disabled)
      await act(async () => {
        await user.clear(screen.getByLabelText("Date of Birth"));
        await user.type(screen.getByLabelText("Date of Birth"), "1990-01-01"); // 34 years old
        await user.click(screen.getByText("Enroll Dependent"));
      });

      expect(screen.getByText("Child must be 0-18 years (unless has disability)")).toBeInTheDocument();

      // Test parent/guardian age validation (must be 18+)
      await act(async () => {
        await user.selectOptions(screen.getByLabelText("Dependent Type"), "Parent");
        await user.clear(screen.getByLabelText("Date of Birth"));
        await user.type(screen.getByLabelText("Date of Birth"), "2010-05-15"); // 14 years old
        await user.click(screen.getByText("Enroll Dependent"));
      });

      expect(screen.getByText("Parent must be 18 years or older")).toBeInTheDocument();
    });

    TestRunner.addTest(test2);

    const test3 = await TestRunner.runTest("Disability validation allows age exceptions", async () => {
      useQuery.mockReturnValue({
        data: [{ id: 1, firstName: "John", lastName: "Doe" }],
        isLoading: false,
        error: null
      });

      const mockMutate = jest.fn();
      useMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null
      });

      renderComponent();

      // Test that disabled child over 18 is allowed
      await act(async () => {
        await user.selectOptions(screen.getByLabelText("Dependent Type"), "Child");
        await user.type(screen.getByLabelText("First Name"), "Jane");
        await user.type(screen.getByLabelText("Last Name"), "Doe");
        await user.type(screen.getByLabelText("Date of Birth"), "1990-01-01"); // 34 years old

        // Enable disability
        const disabilityCheckbox = screen.getByRole("checkbox", { name: /has disability/i });
        await user.click(disabilityCheckbox);

        // Add disability details
        await user.type(screen.getByLabelText(/disability details/i), "Learning disability requiring special care");

        await user.click(screen.getByText("Enroll Dependent"));
      });

      // Should not show age validation error when disability is enabled
      expect(screen.queryByText(/Child must be 0-18 years/)).not.toBeInTheDocument();

      // Should include disability details in submission
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          hasDisability: true,
          disabilityDetails: "Learning disability requiring special care"
        })
      );
    });

    TestRunner.addTest(test3);
  });

  describe("Enhanced Fields Integration", () => {
    const test4 = await TestRunner.runTest("Optional enhanced fields work correctly", async () => {
      useQuery.mockReturnValue({
        data: [{ id: 1, firstName: "John", lastName: "Doe" }],
        isLoading: false,
        error: null
      });

      const mockMutate = jest.fn().mockResolvedValue({
        success: true,
        data: TestDataFactory.createMockMember({
          memberType: "dependent",
          dependentType: "child"
        })
      });

      useMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null
      });

      renderComponent();

      // Fill in required fields and some optional enhanced fields
      await act(async () => {
        await user.selectOptions(screen.getByLabelText("Dependent Type"), "Child");
        await user.selectOptions(screen.getByLabelText("Principal Member"), "John Doe");
        await user.type(screen.getByLabelText("First Name"), "Jane");
        await user.type(screen.getByLabelText("Last Name"), "Doe");
        await user.type(screen.getByLabelText("Email Address"), "jane.doe@example.com");
        await user.type(screen.getByLabelText("Phone Number"), "+254712345679");
        await user.type(screen.getByLabelText("Date of Birth"), "2015-05-20");

        // Optional enhanced fields
        await user.selectOptions(screen.getByLabelText("Gender (Optional)"), "Female");
        await user.selectOptions(screen.getByLabelText("Marital Status (Optional)"), "Single");
        await user.type(screen.getByLabelText("National ID Number"), "87654321");
        await user.type(screen.getByLabelText("Physical Address"), "123 Main Street");
        await user.type(screen.getByLabelText("City"), "Nairobi");
        await user.type(screen.getByLabelText("Postal Code"), "00100");
        await user.selectOptions(screen.getByLabelText("Country"), "Kenya");

        await user.click(screen.getByText("Enroll Dependent"));
      });

      // Verify submission includes enhanced fields
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          dependentType: "child",
          principalId: 1,
          firstName: "Jane",
          lastName: "Doe",
          email: "jane.doe@example.com",
          phone: "+254712345679",
          dateOfBirth: "2015-05-20",
          gender: "female",
          maritalStatus: "single",
          nationalId: "87654321",
          address: "123 Main Street",
          city: "Nairobi",
          postalCode: "00100",
          country: "Kenya"
        })
      );
    });

    TestRunner.addTest(test4);

    const test5 = await TestRunner.runTest("National ID validation works for dependents", async () => {
      useQuery.mockReturnValue({
        data: [{ id: 1, firstName: "John", lastName: "Doe" }],
        isLoading: false,
        error: null
      });

      const mockMutate = jest.fn();
      useMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null
      });

      renderComponent();

      // Test invalid National ID format
      await act(async () => {
        await user.selectOptions(screen.getByLabelText("Dependent Type"), "Child");
        await user.type(screen.getByLabelText("First Name"), "Jane");
        await user.type(screen.getByLabelText("Last Name"), "Doe");
        await user.type(screen.getByLabelText("National ID Number"), "12345"); // Too short
        await user.click(screen.getByText("Enroll Dependent"));
      });

      expect(screen.getByText("Kenyan National ID must be 8 digits")).toBeInTheDocument();

      // Test valid National ID format
      await act(async () => {
        await user.clear(screen.getByLabelText("National ID Number"));
        await user.type(screen.getByLabelText("National ID Number"), "87654321");

        // Clear previous error by changing another field
        await user.clear(screen.getByLabelText("First Name"));
        await user.type(screen.getByLabelText("First Name"), "Jane");
      });

      // Should not show National ID validation error anymore
      expect(screen.queryByText("Kenyan National ID must be 8 digits")).not.toBeInTheDocument();
    });

    TestRunner.addTest(test5);
  });

  describe("API Integration with Enhanced Endpoint", () => {
    const test6 = await TestRunner.runTest("Form submits to enhanced enrollment endpoint", async () => {
      useQuery.mockReturnValue({
        data: [{ id: 1, firstName: "John", lastName: "Doe" }],
        isLoading: false,
        error: null
      });

      // Mock successful API response
      const mockDependent = TestDataFactory.createMockMember({
        memberType: "dependent",
        dependentType: "child"
      });

      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockDependent
        })
      });

      const mockMutate = jest.fn().mockImplementation(async (data) => {
        const response = await mockApiRequest("POST", "/api/members/enroll", {
          body: JSON.stringify(data)
        });
        return response.json();
      });

      useMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null
      });

      renderComponent();

      // Fill and submit form
      await act(async () => {
        await user.selectOptions(screen.getByLabelText("Dependent Type"), "Child");
        await user.selectOptions(screen.getByLabelText("Principal Member"), "John Doe");
        await user.type(screen.getByLabelText("First Name"), "Jane");
        await user.type(screen.getByLabelText("Last Name"), "Doe");
        await user.type(screen.getByLabelText("Email Address"), "jane.doe@example.com");
        await user.type(screen.getByLabelText("Phone Number"), "+254712345679");
        await user.type(screen.getByLabelText("Date of Birth"), "2015-05-20");

        await user.click(screen.getByText("Enroll Dependent"));
      });

      // Verify correct API call
      expect(mockApiRequest).toHaveBeenCalledWith("POST", "/api/members/enroll", {
        body: expect.stringContaining("jane.doe@example.com")
      });

      // Verify query invalidation
      const queryClient = require("@/lib/queryClient").queryClient;
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['/api/members'] });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['/api/members/dependent'] });
    });

    TestRunner.addTest(test6);

    const test7 = await TestRunner.runTest("Form handles disability section visibility correctly", async () => {
      useQuery.mockReturnValue({
        data: [{ id: 1, firstName: "John", lastName: "Doe" }],
        isLoading: false,
        error: null
      });

      const mockMutate = jest.fn();
      useMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null
      });

      renderComponent();

      // Disability section should not be visible by default
      expect(screen.queryByText("Disability Information")).not.toBeInTheDocument();

      // Change to child dependent type
      await act(async () => {
        await user.selectOptions(screen.getByLabelText("Dependent Type"), "Child");
      });

      // Disability section should now be visible for children
      expect(screen.getByText("Disability Information")).toBeInTheDocument();
      expect(screen.getByText("Has disability (special needs)")).toBeInTheDocument();

      // Change to spouse type
      await act(async () => {
        await user.selectOptions(screen.getByLabelText("Dependent Type"), "Spouse");
      });

      // Disability section should not be visible for spouse
      expect(screen.queryByText("Disability Information")).not.toBeInTheDocument();

      // Change to parent type
      await act(async () => {
        await user.selectOptions(screen.getByLabelText("Dependent Type"), "Parent");
      });

      // Disability section should be visible for parents
      expect(screen.getByText("Disability Information")).toBeInTheDocument();
    });

    TestRunner.addTest(test7);
  });

  describe("Form Layout and User Experience", () => {
    const test8 = await TestRunner.runTest("Form sections are properly organized for dependents", async () => {
      useQuery.mockReturnValue({
        data: [{ id: 1, firstName: "John", lastName: "Doe" }],
        isLoading: false,
        error: null
      });

      const mockMutate = jest.fn();
      useMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null
      });

      renderComponent();

      // Check dependent-specific section headers
      expect(screen.getByText("Dependent Information")).toBeInTheDocument();
      expect(screen.getByText("Personal Information")).toBeInTheDocument();
      expect(screen.getByText("Contact Information (Optional)")).toBeInTheDocument();
      expect(screen.getByText("Address Information (Optional)")).toBeInTheDocument();
      expect(screen.getByText("Identification Information (Optional)")).toBeInTheDocument();

      // Check that principal member selection is prominent
      expect(screen.getByLabelText("Principal Member")).toBeInTheDocument();
      expect(screen.getByLabelText("Dependent Type")).toBeInTheDocument();
    });

    TestRunner.addTest(test8);

    const test9 = await TestRunner.runTest("Form shows appropriate help text for different dependent types", async () => {
      useQuery.mockReturnValue({
        data: [{ id: 1, firstName: "John", lastName: "Doe" }],
        isLoading: false,
        error: null
      });

      const mockMutate = jest.fn();
      useMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null
      });

      renderComponent();

      // Test spouse help text
      await act(async () => {
        await user.selectOptions(screen.getByLabelText("Dependent Type"), "Spouse");
        await user.type(screen.getByLabelText("Date of Birth"), "1990-01-01");
      });

      expect(screen.getByText("Spouse must be 18 years or older")).toBeInTheDocument();

      // Test child help text
      await act(async () => {
        await user.selectOptions(screen.getByLabelText("Dependent Type"), "Child");
        await user.clear(screen.getByLabelText("Date of Birth"));
        await user.type(screen.getByLabelText("Date of Birth"), "2015-01-01");
      });

      expect(screen.getByText("Child must be between 0-18 years (unless has disability)")).toBeInTheDocument();

      // Test parent help text
      await act(async () => {
        await user.selectOptions(screen.getByLabelText("Dependent Type"), "Parent");
        await user.clear(screen.getByLabelText("Date of Birth"));
        await user.type(screen.getByLabelText("Date of Birth"), "1980-01-01");
      });

      expect(screen.getByText("Must be 18 years or older")).toBeInTheDocument();
    });

    TestRunner.addTest(test9);
  });

  const testSuite = TestRunner.endSuite();
  console.log("Enhanced Dependent Form Test Suite Results:");
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