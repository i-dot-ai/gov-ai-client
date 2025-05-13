import { test, expect } from '@playwright/test';
import { runStep } from '../utils/runStep';

test.describe('Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await runStep(page, 'Navigate to home page', async () => {
      await page.goto('/');
      await expect(page.getByLabel('Ask anything')).toBeVisible();
    });
  });

  test('Send a prompt and receive a response', async ({ page }) => {
    await runStep(page, 'Send a prompt about Norway', async () => {
      await page.getByLabel('Ask anything').fill('What is the capital of Norway?');
      await page.getByRole('button', { name: 'Send' }).click();
      
      // Wait for the loading indicator to appear and then disappear
      await expect(page.locator('.loading-ellipsis')).toBeVisible();
      await page.waitForFunction(() => {
        return document.querySelectorAll('.loading-ellipsis').length === 0;
      });
    });

    await runStep(page, 'Verify response contains expected content', async () => {
      // Check that the response contains the expected content
      await expect(page.getByText('Oslo')).toBeVisible();
      
      // Check that the textarea is cleared after sending
      expect(await page.getByLabel('Ask anything').inputValue()).toEqual('');
    });
  });

  test('Send multiple prompts and verify all responses', async ({ page }) => {
    await runStep(page, 'Send first prompt about Norway', async () => {
      await page.getByLabel('Ask anything').fill('What is the capital of Norway?');
      await page.getByRole('button', { name: 'Send' }).click();
      
      // Wait for the loading indicator to appear and then disappear
      await expect(page.locator('.loading-ellipsis')).toBeVisible();
      await page.waitForFunction(() => {
        return document.querySelectorAll('.loading-ellipsis').length === 0;
      });
    });

    await runStep(page, 'Verify first response', async () => {
      await expect(page.getByText('Oslo')).toBeVisible();
    });

    await runStep(page, 'Send second prompt about France', async () => {
      await page.getByLabel('Ask anything').fill('What is the capital of France?');
      await page.getByRole('button', { name: 'Send' }).click();
      
      // Wait for the loading indicator to appear and then disappear
      await expect(page.locator('.loading-ellipsis')).toBeVisible();
      await page.waitForFunction(() => {
        return document.querySelectorAll('.loading-ellipsis').length === 0;
      });
    });

    await runStep(page, 'Verify both responses are visible', async () => {
      await expect(page.getByText('Oslo')).toBeVisible();
      await expect(page.getByText('Paris')).toBeVisible();
    });
  });

  test('Test session persistence across page reloads', async ({ page }) => {
    await runStep(page, 'Send a prompt about Norway', async () => {
      await page.getByLabel('Ask anything').fill('What is the capital of Norway?');
      await page.getByRole('button', { name: 'Send' }).click();
      
      // Wait for the loading indicator to appear and then disappear
      await expect(page.locator('.loading-ellipsis')).toBeVisible();
      await page.waitForFunction(() => {
        return document.querySelectorAll('.loading-ellipsis').length === 0;
      });
    });

    await runStep(page, 'Verify response before reload', async () => {
      await expect(page.getByText('Oslo')).toBeVisible();
    });

    await runStep(page, 'Reload the page', async () => {
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
    });

    await runStep(page, 'Verify response persists after reload', async () => {
      await expect(page.getByText('Oslo')).toBeVisible();
    });
  });

  test('Test clear session functionality', async ({ page }) => {
    await runStep(page, 'Send a prompt about Norway', async () => {
      await page.getByLabel('Ask anything').fill('What is the capital of Norway?');
      await page.getByRole('button', { name: 'Send' }).click();
      
      // Wait for the loading indicator to appear and then disappear
      await expect(page.locator('.loading-ellipsis')).toBeVisible();
      await page.waitForFunction(() => {
        return document.querySelectorAll('.loading-ellipsis').length === 0;
      });
    });

    await runStep(page, 'Verify message count before clearing', async () => {
      // There should be 2 message boxes (1 user, 1 AI)
      expect(await page.locator('.message-box').count()).toEqual(2);
    });

    await runStep(page, 'Clear the session', async () => {
      await page.getByRole('link', { name: 'Clear session' }).click();
      await page.waitForLoadState('domcontentloaded');
    });

    await runStep(page, 'Verify session is cleared', async () => {
      // There should be no message boxes after clearing
      expect(await page.locator('.message-box').count()).toEqual(0);
    });
  });
});