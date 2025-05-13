# End-to-End (E2E) Tests for Gov AI Client

This directory contains end-to-end tests for the Gov AI Client application using Playwright. The tests cover the main user flows through the application, with a focus on ensuring that all critical functionality works as expected.

## Test Structure

The tests are organized as follows:

- `specs/` - Contains the test files, organized by feature
  - `chat.spec.ts` - Tests for basic chat functionality
  - `mcp-integration.spec.ts` - Tests for MCP server integration (tool calls)
  - `message-input.spec.ts` - Tests for message input functionality
  - `accessibility.spec.ts` - Tests for accessibility
- `utils/` - Contains utility functions used by the tests
  - `runStep.ts` - Utility for handling test steps and capturing debugging artifacts
- `artifacts/` - Directory where test artifacts (screenshots, HTML) are saved when tests fail
- `playwright.config.ts` - Playwright configuration file

## Running the Tests

### Prerequisites

- Node.js 14 or higher
- npm or yarn

### Installation

```bash
# Install dependencies
npm install
```

### Running Tests

```bash
# Run all tests in headless mode
npm test

# Run tests with UI mode (for debugging)
npm run test:ui

# Run tests in debug mode
npm run test:debug

# Run tests in headed mode (with visible browser)
npm run test:headed

# Show test report
npm run report
```

## Test Implementation Details

### runStep Utility

All tests use the `runStep` utility function to handle test steps. This utility automatically captures screenshots and HTML content when a test step fails, making debugging easier.

Example usage:

```typescript
await runStep(page, 'Navigate to home page', async () => {
  await page.goto('/');
  await expect(page.getByLabel('Ask anything')).toBeVisible();
});
```

### Best Practices

1. **Test Organization**:
   - Tests are organized by feature or page
   - Test names clearly indicate what is being tested
   - Related tests are grouped using `test.describe()`

2. **Selectors**:
   - Tests use robust selectors that are less likely to break with UI changes
   - Role-based selectors are preferred (e.g., `page.getByRole('button', { name: 'Submit' })`)
   - Data attributes are used for testing when appropriate

3. **Assertions**:
   - Tests use explicit assertions to validate expected behavior
   - Timeouts are included for assertions that may take time to resolve
   - Appropriate assertion methods are used (e.g., `toBeVisible()`, `toHaveText()`, etc.)

4. **Error Handling**:
   - The `runStep` utility provides proper error handling for all test steps
   - Screenshots and HTML content are captured when tests fail
   - Descriptive error messages are logged

## Extending the Tests

To add new tests:

1. Create a new test file in the `specs/` directory
2. Import the necessary modules and the `runStep` utility
3. Use `test.describe()` to group related tests
4. Use `test()` to define individual tests
5. Use `runStep()` to handle test steps and capture debugging artifacts

Example:

```typescript
import { test, expect } from '@playwright/test';
import { runStep } from '../utils/runStep';

test.describe('New Feature', () => {
  test('Test new functionality', async ({ page }) => {
    await runStep(page, 'Navigate to home page', async () => {
      await page.goto('/');
      await expect(page.getByLabel('Ask anything')).toBeVisible();
    });

    await runStep(page, 'Interact with new feature', async () => {
      // Test code here
    });
  });
});
```