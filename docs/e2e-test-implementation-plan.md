# End-to-End (E2E) Testing Plan for Browser-based Applications

## Overview

This document outlines a comprehensive plan for implementing end-to-end (E2E) tests for a browser-based application using Playwright. The tests will cover the main user flows through the application, with a focus on ensuring that all critical functionality works as expected.

## Testing Strategy

### Goals
- Create .spec.ts files to verify that all critical user flows work end-to-end. These tests:
  - Interact with the real application running on localhost:3000
  - Validate that UI components render correctly
  - Confirm that API integrations work as expected
  - Provide visual evidence of test execution through screenshots
  - Enable examination of the DOM for debugging purposes

### Testing Approach
1. **Real Application Testing**: All tests will interact with the real application running on localhost:3000, not with mocked HTML content.
2. **Chromium Only**: Tests will be run only in the Chromium browser as specified in the requirements.
3. **Non-Interactive Testing**: All tests will be fully automated and non-interactive.
4. **Visual Verification**: Screenshots will be captured at key points in the tests for visual verification and debugging.
5. **DOM Examination**: The DOM will be examined programmatically using Playwright's selectors and assertions.
6. **API Testing**: API endpoints will be tested for availability and correct responses.

### Best Practices
1. **Test Organization**:
   - Organize tests by feature or page
   - Use descriptive test names that clearly indicate what is being tested
   - Group related tests using `test.describe()`

2. **Selectors**:
   - Use robust selectors that are less likely to break with UI changes
   - Prefer role-based selectors (e.g., `page.getByRole('button', { name: 'Submit' })`)
   - Use data attributes for testing when appropriate (e.g., `page.locator('[data-testid="submit-button"]')`)
   - Avoid using CSS selectors that depend on specific class names or structure

3. **Assertions**:
   - Use explicit assertions to validate expected behavior
   - Include timeouts for assertions that may take time to resolve
   - Use appropriate assertion methods (e.g., `toBeVisible()`, `toHaveText()`, etc.)
   - Add descriptive error messages to assertions

4. **Timeouts**:
   - Set appropriate timeouts for tests that may take longer to complete
   - Use `test.setTimeout()` for test-wide timeouts
   - Use timeout options in assertions for specific waits

5. **Error Handling**:
   - Add proper error handling for expected failures
   - Use try/catch blocks when appropriate
   - Log relevant information for debugging

## Error Handling with runStep Utility

All tests must use the `runStep` utility function to handle test steps. This utility automatically captures screenshots and HTML content when a test step fails, making debugging easier.

### runStep Utility Code

The following code must be used in your tests to handle errors and capture debugging artifacts. Since this code will not be available as an external file, you must copy and use it directly in your test implementation:

```typescript
import * as fs from "node:fs";

/**
 * Runs a test step and, upon failure, saves a screenshot and HTML artifact.
 * @param page Playwright Page instance
 * @param name Step name
 * @param fn Step implementation (async function)
 */
export async function runStep(page: any, name: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error: unknown) {
    const timestamp = Date.now();
    const safeName = name.replace(/\s+/g, "_");
    await page.screenshot({
      path: `artifacts/${safeName}-${timestamp}.png`,
      fullPage: false, // Changed to false to avoid Firefox screenshot size limit issues
    });
    const html = await page.content();
    await fs.promises.writeFile(
      `artifacts/${safeName}-${timestamp}.html`,
      html,
    );
    // Handle unknown error type properly
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Test failed in step "${name}". Error: ${errorMessage}`);
    console.error(
      `📸 Debug artifacts saved to: artifacts/${safeName}-${timestamp}.[png|html]`,
    );
    throw error; // re-throw to fail the test
  }
}
```

### Using runStep in Tests

Instead of using `test.step()` directly, wrap your test steps with the `runStep` utility:

```typescript
import { test, expect } from "@playwright/test";
import { runStep } from "./utils/runStep"; // Note: In your implementation, include the runStep function directly

test("example test with runStep", async ({ page }) => {
  await runStep(page, "Navigate to home page", async () => {
    await page.goto("http://localhost:3000");
    await expect(page.getByRole("heading")).toBeVisible();
  });

  await runStep(page, "Click upload button", async () => {
    await page.getByRole("button", { name: "Upload" }).click();
    await expect(page.getByText("File uploaded successfully")).toBeVisible();
  });
});
```

### Benefits of Using runStep

1. **Automatic Error Handling**: Captures screenshots and HTML content automatically when a test step fails
2. **Consistent Naming**: Creates consistently named artifacts with timestamps
3. **Detailed Error Messages**: Provides clear error messages in the console
4. **Improved Debugging**: Makes it easier to identify and fix issues by providing visual evidence and DOM structure

Make sure to create an `artifacts` directory before running tests, or modify the code to create the directory if it doesn't exist.

### DOM Examination Guidelines
1. **Methods for Examining the DOM**:
   - Use `page.content()` to get the full HTML content
   - Use `page.locator().innerHTML()` to get the HTML of a specific element
   - Use `page.locator().textContent()` to get the text content of an element
   - Use `page.locator().getAttribute()` to get specific attributes

2. **Logging DOM Information**:
   - Log relevant DOM information for debugging
   - Use `console.log()` to output DOM information
   - Example:
     ```typescript
     const html = await page.content();
     console.log("HTML structure:", html);

     const buttonText = await page.locator('button').textContent();
     console.log("Button text:", buttonText);
     ```

3. **Assertions on DOM Elements**:
   - Use assertions to validate DOM elements
   - Check for visibility, text content, attributes, etc.
   - Example:
     ```typescript
     await expect(page.locator('h1')).toBeVisible();
     await expect(page.locator('button')).toHaveText('Submit');
     await expect(page.locator('input')).toHaveAttribute('type', 'file');
     ```

## Test Organization and Structure

All testing files should be stored in frontend/tests directory.

### Test File Structure
Each test file should follow this structure:
1. **Imports and Constants**: Import necessary modules and define constants
2. **Test Descriptions**: Use `test.describe()` to group related tests
3. **Test Steps**: Break down complex tests into steps using `runStep()`
4. **Assertions**: Validate expected behavior with assertions

## Conclusion

This E2E testing plan provides a comprehensive approach to creating tests for a browser-based application. By following these guidelines, we can ensure that all critical functionality works as expected and that the application provides a seamless user experience.

The plan emphasizes real application testing, visual verification through screenshots, and programmatic DOM examination for debugging. It also provides clear guidelines for test implementation, organization, and execution.

By implementing these tests, we can catch issues early, ensure consistent behavior across different parts of the application, and maintain a high level of quality for the browser application.
