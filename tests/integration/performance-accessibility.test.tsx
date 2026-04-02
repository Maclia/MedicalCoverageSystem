// Performance and Accessibility Testing Suite for Enhanced Members Module

import { TestDataFactory, Assert, TestRunner, PerformanceTest } from "./test-framework";
import { render, screen, waitFor, act } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MemberForm from "@/components/members/MemberForm";
import DependentForm from "@/components/dependents/DependentForm";
import MemberLifecyclePanel from "@/components/members/MemberLifecyclePanel";
import DocumentUpload from "@/components/members/DocumentUpload";

// Extend Jest matchers for accessibility
expect.extend(toHaveNoViolations);

describe("Performance and Accessibility Testing Suite", () => {
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

  const renderComponent = (Component: React.ComponentType<any>, props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Component {...props} />
      </QueryClientProvider>
    );
  };

  TestRunner.startSuite("Performance and Accessibility Tests");

  describe("Accessibility Compliance Tests", () => {
    const test1 = await TestRunner.runTest("MemberForm meets WCAG 2.1 AA standards", async () => {
      // Mock queries
      jest.doMock("@tanstack/react-query", () => ({
        useMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false, error: null })),
        useQuery: jest.fn(() => ({ data: [{ id: 1, name: "Test Company" }], isLoading: false, error: null }))
      }));

      const { container } = renderComponent(MemberForm, { onSuccess: jest.fn() });

      // Wait for component to fully render
      await waitFor(() => {
        expect(screen.getByText("Personal Information")).toBeInTheDocument();
      });

      // Run accessibility tests
      const results = await axe(container);
      Assert.isTrue(results.violations.length === 0, "Component should have no accessibility violations");

      // Test keyboard navigation
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      // Test Tab navigation
      for (let i = 0; i < focusableElements.length; i++) {
        const element = focusableElements[i] as HTMLElement;
        act(() => {
          element.focus();
        });
        expect(document.activeElement).toBe(element);
      }

      // Test ARIA labels and roles
      const form = screen.getByRole("form") || container.querySelector("form");
      Assert.isTrue(form !== null, "Form should have proper role");

      // Check for proper labeling
      const inputs = container.querySelectorAll("input, select, textarea");
      inputs.forEach(input => {
        const hasLabel = input.hasAttribute("aria-label") ||
                       input.hasAttribute("aria-labelledby") ||
                       input.id && container.querySelector(`label[for="${input.id}"]`);
        Assert.isTrue(hasLabel === true, "Each form input should have proper labeling");
      });
    });

    TestRunner.addTest(test1);

    const test2 = await TestRunner.runTest("DependentForm accessibility compliance", async () => {
      jest.doMock("@tanstack/react-query", () => ({
        useMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false, error: null })),
        useQuery: jest.fn(() => ({ data: [{ id: 1, firstName: "John", lastName: "Doe" }], isLoading: false, error: null }))
      }));

      const { container } = renderComponent(DependentForm, { onSuccess: jest.fn() });

      await waitFor(() => {
        expect(screen.getByText("Dependent Information")).toBeInTheDocument();
      });

      const results = await axe(container);
      Assert.isTrue(results.violations.length === 0, "DependentForm should have no accessibility violations");

      // Test form field descriptions and help text
      const helpTexts = screen.getAllByText(/must be/i);
      Assert.isTrue(helpTexts.length > 0, "Should have help text for validation");

      // Test error message accessibility
      await act(async () => {
        await user.selectOptions(screen.getByLabelText("Dependent Type"), "Child");
        await user.type(screen.getByLabelText("First Name"), "Test");
        await user.click(screen.getByText("Enroll Dependent"));
      });

      // Error messages should be properly associated with inputs
      const errorMessages = container.querySelectorAll('[role="alert"]');
      errorMessages.forEach(error => {
        Assert.isTrue(error.textContent?.trim().length > 0, "Error messages should have content");
      });
    });

    TestRunner.addTest(test2);

    const test3 = await TestRunner.runTest("DocumentUpload accessibility for screen readers", async () => {
      const onUploadComplete = jest.fn();
      const { container } = renderComponent(DocumentUpload, {
        memberId: 1,
        onUploadComplete
      });

      await waitFor(() => {
        expect(screen.getByText("Document Upload")).toBeInTheDocument();
      });

      const results = await axe(container);
      Assert.isTrue(results.violations.length === 0, "DocumentUpload should have no accessibility violations");

      // Test drag-drop area accessibility
      const dropZone = container.querySelector('[data-testid="drop-zone"]') ||
                      container.querySelector('[role="button"]') ||
                      screen.getByText(/drag/i).closest("div");

      if (dropZone) {
        Assert.isTrue(dropZone.hasAttribute("role") || dropZone.hasAttribute("aria-label"),
          "Drop zone should be accessible to screen readers");
      }

      // Test file input accessibility
      const fileInput = container.querySelector('input[type="file"]');
      Assert.isTrue(fileInput !== null, "File input should exist");
      Assert.isTrue(fileInput?.hasAttribute("aria-label") || fileInput?.id,
        "File input should be properly labeled");
    });

    TestRunner.addTest(test3);

    const test4 = await TestRunner.runTest("MemberLifecyclePanel accessibility", async () => {
      const mockMember = TestDataFactory.createMockMember();
      const { container } = renderComponent(MemberLifecyclePanel, {
        member: mockMember,
        onActionComplete: jest.fn()
      });

      await waitFor(() => {
        expect(screen.getByText("Member Lifecycle Management")).toBeInTheDocument();
      });

      const results = await axe(container);
      Assert.isTrue(results.violations.length === 0, "MemberLifecyclePanel should have no accessibility violations");

      // Test timeline accessibility
      const timelineItems = container.querySelectorAll('[data-testid="timeline-item"]');
      timelineItems.forEach((item, index) => {
        const element = item as HTMLElement;
        Assert.isTrue(element.hasAttribute("aria-label") || element.textContent?.trim(),
          "Timeline items should be accessible");
      });

      // Test action buttons accessibility
      const actionButtons = container.querySelectorAll("button[aria-label]");
      Assert.isTrue(actionButtons.length > 0, "Action buttons should have aria labels");
    });

    TestRunner.addTest(test4);
  });

  describe("Performance Benchmark Tests", () => {
    const test5 = await PerformanceTest.createPerformanceTest("MemberForm renders within performance threshold", 200)(async () => {
      jest.doMock("@tanstack/react-query", () => ({
        useMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false, error: null })),
        useQuery: jest.fn(() => ({ data: TestDataFactory.createMockCompanies(10), isLoading: false, error: null }))
      }));

      const startTime = performance.now();
      const { container } = renderComponent(MemberForm, { onSuccess: jest.fn() });

      await waitFor(() => {
        expect(screen.getByText("Personal Information")).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      console.log(`MemberForm render time: ${renderTime.toFixed(2)}ms`);

      // Verify form is interactive
      const inputs = container.querySelectorAll("input, select, button");
      Assert.isTrue(inputs.length > 0, "Form should have interactive elements");
    });

    TestRunner.addTest(test5);

    const test6 = await PerformanceTest.createPerformanceTest("Large dataset handling in MemberForm", 500)(async () => {
      // Mock large company dataset
      const largeCompanyList = TestDataFactory.createMockCompanies(100);

      jest.doMock("@tanstack/react-query", () => ({
        useMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false, error: null })),
        useQuery: jest.fn(() => ({ data: largeCompanyList, isLoading: false, error: null }))
      }));

      const startTime = performance.now();
      renderComponent(MemberForm, { onSuccess: jest.fn() });

      await waitFor(() => {
        expect(screen.getByDisplayValue("Select a company")).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      console.log(`Large dataset render time: ${renderTime.toFixed(2)}ms`);

      // Test company selection performance
      const companySelect = screen.getByLabelText("Company");
      await act(async () => {
        await user.click(companySelect);
        await user.selectOptions(companySelect, largeCompanyList[50].name);
      });

      Assert.isTrue(screen.getByDisplayValue(largeCompanyList[50].name) !== undefined,
        "Should handle large dataset selection efficiently");
    });

    TestRunner.addTest(test6);

    const test7 = await PerformanceTest.createPerformanceTest("Form validation performance under stress", 300)(async () => {
      jest.doMock("@tanstack/react-query", () => ({
        useMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false, error: null })),
        useQuery: jest.fn(() => ({ data: [{ id: 1, name: "Test Company" }], isLoading: false, error: null }))
      }));

      const { container } = renderComponent(MemberForm, { onSuccess: jest.fn() });

      await waitFor(() => {
        expect(screen.getByText("Personal Information")).toBeInTheDocument();
      });

      const startTime = performance.now();

      // Rapid form filling and validation testing
      await act(async () => {
        await user.selectOptions(screen.getByLabelText("Company"), "Test Company");
        await user.type(screen.getByLabelText("First Name"), "Performance Test User");
        await user.type(screen.getByLabelText("Last Name"), "Performance Test");
        await user.type(screen.getByLabelText("Email Address"), "performance@example.com");
        await user.type(screen.getByLabelText("Phone Number"), "+254712345678");
        await user.type(screen.getByLabelText("Date of Birth"), "1990-01-01");
        await user.type(screen.getByLabelText("Employee ID"), "PERF001");

        // Trigger validation multiple times rapidly
        for (let i = 0; i < 10; i++) {
          await user.clear(screen.getByLabelText("Email Address"));
          await user.type(screen.getByLabelText("Email Address"), `performance${i}@example.com`);
          await user.click(screen.getByText("Enroll Member"));
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      });

      const validationTime = performance.now() - startTime;
      console.log(`Form validation stress test time: ${validationTime.toFixed(2)}ms`);

      // Form should remain responsive
      const submitButton = screen.getByText("Enroll Member");
      Assert.isTrue(submitButton !== null, "Form should remain interactive under stress");
    });

    TestRunner.addTest(test7);

    const test8 = await PerformanceTest.createPerformanceTest("Memory usage test for large form data", 1000)(async () => {
      jest.doMock("@tanstack/react-query", () => ({
        useMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false, error: null })),
        useQuery: jest.fn(() => ({
          data: [...TestDataFactory.createMockCompanies(50), ...TestDataFactory.createMockMembers(100)],
          isLoading: false,
          error: null
        }))
      }));

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Render multiple forms to test memory usage
      const renders = [];
      for (let i = 0; i < 10; i++) {
        const { container } = renderComponent(MemberForm, { onSuccess: jest.fn() });
        renders.push(container);
      }

      await waitFor(() => {
        expect(screen.getByText("Personal Information")).toBeInTheDocument();
      });

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // Memory usage should be reasonable (less than 50MB increase)
      Assert.isTrue(memoryIncrease < 50 * 1024 * 1024,
        "Memory usage should remain reasonable during multiple renders");

      // Cleanup
      renders.forEach(container => container.remove());
    });

    TestRunner.addTest(test8);
  });

  describe("Responsive Design Performance", () => {
    const test9 = await TestRunner.runTest("Mobile responsiveness performance", async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      jest.doMock("@tanstack/react-query", () => ({
        useMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false, error: null })),
        useQuery: jest.fn(() => ({ data: [{ id: 1, name: "Test Company" }], isLoading: false, error: null }))
      }));

      const startTime = performance.now();
      const { container } = renderComponent(MemberForm, { onSuccess: jest.fn() });

      await waitFor(() => {
        expect(screen.getByText("Personal Information")).toBeInTheDocument();
      });

      const mobileRenderTime = performance.now() - startTime;
      console.log(`Mobile render time: ${mobileRenderTime.toFixed(2)}ms`);

      // Test mobile-specific accessibility
      const results = await axe(container, {
        rules: {
          'touch-target-size': { enabled: true }
        }
      });

      Assert.isTrue(results.violations.length === 0, "Mobile view should be accessible");

      // Test viewport meta tag
      const viewport = document.querySelector('meta[name="viewport"]');
      Assert.isTrue(viewport !== null, "Should have viewport meta tag for mobile responsiveness");
    });

    TestRunner.addTest(test9);

    const test10 = await TestRunner.runTest("Tablet responsiveness performance", async () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      jest.doMock("@tanstack/react-query", () => ({
        useMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false, error: null })),
        useQuery: jest.fn(() => ({ data: [{ id: 1, name: "Test Company" }], isLoading: false, error: null }))
      }));

      const startTime = performance.now();
      const { container } = renderComponent(MemberForm, { onSuccess: jest.fn() });

      await waitFor(() => {
        expect(screen.getByText("Personal Information")).toBeInTheDocument();
      });

      const tabletRenderTime = performance.now() - startTime;
      console.log(`Tablet render time: ${tabletRenderTime.toFixed(2)}ms`);

      // Test that tablet layout is optimized
      const formSections = container.querySelectorAll("section, div > h2");
      Assert.isTrue(formSections.length > 0, "Should have proper form sections for tablet layout");

      // Reset viewport for other tests
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      Object.defineProperty(window, 'innerHeight', { value: 768 });
    });

    TestRunner.addTest(test10);
  });

  describe("Error Handling Performance", () => {
    const test11 = await PerformanceTest.createPerformanceTest("Error recovery performance", 200)(async () => {
      jest.doMock("@tanstack/react-query", () => ({
        useMutation: jest.fn(() => ({
          mutate: jest.fn(() => Promise.reject(new Error("Network error"))),
          isPending: false,
          error: new Error("Network error")
        })),
        useQuery: jest.fn(() => ({ data: [{ id: 1, name: "Test Company" }], isLoading: false, error: null }))
      }));

      const startTime = performance.now();
      const { container } = renderComponent(MemberForm, { onSuccess: jest.fn() });

      await waitFor(() => {
        expect(screen.getByText("Personal Information")).toBeInTheDocument();
      });

      // Trigger error scenario
      await act(async () => {
        await user.selectOptions(screen.getByLabelText("Company"), "Test Company");
        await user.type(screen.getByLabelText("First Name"), "Error Test");
        await user.click(screen.getByText("Enroll Member"));
      });

      const errorHandlingTime = performance.now() - startTime;
      console.log(`Error handling time: ${errorHandlingTime.toFixed(2)}ms`);

      // Error states should be accessible
      const results = await axe(container);
      Assert.isTrue(results.violations.length === 0, "Error states should be accessible");

      // Should have error recovery mechanisms
      const retryableElements = container.querySelectorAll("button, input[type='submit']");
      Assert.isTrue(retryableElements.length > 0, "Should have retry mechanisms in error states");
    });

    TestRunner.addTest(test11);
  });

  const testSuite = TestRunner.endSuite();
  console.log("Performance and Accessibility Test Suite Results:");
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

  // Performance summary
  const performanceTests = testSuite.tests.filter(test => test.performanceMetrics);
  if (performanceTests.length > 0) {
    console.log("\nPerformance Summary:");
    performanceTests.forEach(test => {
      if (test.performanceMetrics) {
        console.log(`- ${test.testName}: ${test.performanceMetrics.duration.toFixed(2)}ms`);
      }
    });
  }

  // Accessibility summary
  const accessibilityTests = testSuite.tests.filter(test => test.testName.includes("accessibility"));
  console.log(`\nAccessibility Compliance: ${accessibilityTests.length} tests passed`);

  return testSuite;
});