import { test, expect } from '@playwright/test';
import { runStep } from '../utils/runStep';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await runStep(page, 'Navigate to home page', async () => {
      await page.goto('/');
      await expect(page.getByLabel('Ask anything')).toBeVisible();
    });
  });

  test('Initial page accessibility', async ({ page }) => {
    await runStep(page, 'Run accessibility scan on initial page', async () => {
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      
      // Log any violations for debugging
      if (accessibilityScanResults.violations.length > 0) {
        console.log('Accessibility violations:', JSON.stringify(accessibilityScanResults.violations, null, 2));
      }
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test('Accessibility after interaction', async ({ page }) => {
    await runStep(page, 'Send a prompt', async () => {
      await page.getByLabel('Ask anything').fill('What is the capital of Norway?');
      await page.getByRole('button', { name: 'Send' }).click();
      
      // Wait for the loading indicator to appear and then disappear
      await expect(page.locator('.loading-ellipsis')).toBeVisible();
      await page.waitForFunction(() => {
        return document.querySelectorAll('.loading-ellipsis').length === 0;
      });
    });

    await runStep(page, 'Run accessibility scan after interaction', async () => {
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      
      // Log any violations for debugging
      if (accessibilityScanResults.violations.length > 0) {
        console.log('Accessibility violations:', JSON.stringify(accessibilityScanResults.violations, null, 2));
      }
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test('Keyboard navigation', async ({ page }) => {
    await runStep(page, 'Test keyboard navigation', async () => {
      // Press Tab to focus on the textarea
      await page.keyboard.press('Tab');
      
      // Verify that the textarea is focused
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.id;
      });
      
      expect(focusedElement).toBe('prompt');
      
      // Enter text in the textarea
      await page.keyboard.type('Hello world');
      
      // Press Tab to focus on the Send button
      await page.keyboard.press('Tab');
      
      // Verify that the Send button is focused
      const buttonFocused = await page.evaluate(() => {
        return document.activeElement?.textContent?.trim();
      });
      
      expect(buttonFocused).toBe('Send');
      
      // Press Tab again to focus on the Clear session link
      await page.keyboard.press('Tab');
      
      // Verify that the Clear session link is focused
      const linkFocused = await page.evaluate(() => {
        return document.activeElement?.textContent?.trim();
      });
      
      expect(linkFocused).toBe('Clear session');
    });
  });

  test('Screen reader accessibility', async ({ page }) => {
    await runStep(page, 'Check ARIA attributes and labels', async () => {
      // Check that the textarea has a proper label
      const textareaLabel = await page.locator('#prompt').getAttribute('aria-describedby');
      expect(textareaLabel).toBe('prompt-hint');
      
      // Check that the hint text exists
      const hintText = await page.locator('#prompt-hint').textContent();
      expect(hintText).toContain('AI can make mistakes');
      
      // Check that the heading has a proper screen reader text
      const heading = await page.locator('h1.govuk-visually-hidden').textContent();
      expect(heading).toBe('Gov AI MCP Client Chat');
    });
  });
});