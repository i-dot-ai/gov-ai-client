import { test, expect } from '@playwright/test';
import { runStep } from '../utils/runStep';

test.describe('MCP Server Integration', () => {
  test.beforeEach(async ({ page }) => {
    await runStep(page, 'Navigate to home page', async () => {
      await page.goto('/');
      await expect(page.getByLabel('Ask anything')).toBeVisible();
    });
  });

  test('Test tool call functionality', async ({ page }) => {
    await runStep(page, 'Send a prompt that triggers a tool call', async () => {
      await page.getByLabel('Ask anything').fill('What is 6 * 7?');
      await page.getByRole('button', { name: 'Send' }).click();
      
      // Wait for the loading indicator to appear and then disappear
      await expect(page.locator('.loading-ellipsis')).toBeVisible();
      await page.waitForFunction(() => {
        return document.querySelectorAll('.loading-ellipsis').length === 0;
      });
    });

    await runStep(page, 'Verify tool call is displayed', async () => {
      // Check that the tool call is displayed
      await expect(page.getByText('Calling: ping-pong')).toBeVisible();
    });

    await runStep(page, 'Verify tool call response is displayed', async () => {
      // Check that the response contains the expected content
      await expect(page.getByText('42')).toBeVisible();
    });

    // Take a screenshot for visual verification
    await page.screenshot({ path: 'frontend/tests/artifacts/tool-call-response.png' });
  });

  test('Test complex tool call with multiple steps', async ({ page }) => {
    await runStep(page, 'Send a prompt that triggers multiple tool calls', async () => {
      await page.getByLabel('Ask anything').fill('Calculate 10 + 5 and then multiply by 2');
      await page.getByRole('button', { name: 'Send' }).click();
      
      // Wait for the loading indicator to appear and then disappear
      await expect(page.locator('.loading-ellipsis')).toBeVisible();
      await page.waitForFunction(() => {
        return document.querySelectorAll('.loading-ellipsis').length === 0;
      });
    });

    await runStep(page, 'Verify final response contains calculation result', async () => {
      // The exact response might vary, but it should contain the result 30
      await expect(page.getByText('30')).toBeVisible();
    });

    // Examine the DOM for debugging purposes
    await runStep(page, 'Examine DOM for tool call details', async () => {
      const toolCallElements = await page.locator('.message-box--llm').count();
      expect(toolCallElements).toBeGreaterThan(0);
      
      // Log the HTML content for debugging
      const html = await page.content();
      console.log('HTML structure for tool calls:', html.substring(0, 500) + '...');
    });
  });
});