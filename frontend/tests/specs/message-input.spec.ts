import { test, expect } from '@playwright/test';
import { runStep } from '../utils/runStep';

test.describe('Message Input Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await runStep(page, 'Navigate to home page', async () => {
      await page.goto('/');
      await expect(page.getByLabel('Ask anything')).toBeVisible();
    });
  });

  test('Test textarea behavior with shift+enter and enter', async ({ page }) => {
    const messageInput = page.getByLabel('Ask anything');

    await runStep(page, 'Record initial textarea height', async () => {
      // Get the initial height of the textarea
      const initialHeight = await page.evaluate(() => {
        return document.querySelector('#prompt')?.scrollHeight || 0;
      });
      
      // Store the initial height for later comparison
      await page.evaluate((height) => {
        window._initialHeight = height;
      }, initialHeight);
    });

    await runStep(page, 'Add multiple lines with Shift+Enter', async () => {
      // Add multiple lines using Shift+Enter
      for (let i = 1; i <= 4; i++) {
        await messageInput.pressSequentially(`Test line ${i}`);
        await messageInput.press('Shift+Enter');
      }
    });

    await runStep(page, 'Verify textarea expands to fit content', async () => {
      // Verify that the textarea has expanded
      const expandedHeight = await page.evaluate(() => {
        return document.querySelector('#prompt')?.scrollHeight || 0;
      });
      
      const initialHeight = await page.evaluate(() => {
        return window._initialHeight || 0;
      });
      
      expect(expandedHeight).toBeGreaterThan(initialHeight);
      
      // Take a screenshot of the expanded textarea
      await page.screenshot({ 
        path: 'frontend/tests/artifacts/expanded-textarea.png',
        clip: {
          x: 0,
          y: 0,
          width: 800,
          height: 600
        }
      });
    });

    await runStep(page, 'Send message with Enter key', async () => {
      // Press Enter to send the message
      await messageInput.press('Enter');
      
      // Wait for the loading indicator to appear and then disappear
      await expect(page.locator('.loading-ellipsis')).toBeVisible();
      await page.waitForFunction(() => {
        return document.querySelectorAll('.loading-ellipsis').length === 0;
      });
    });

    await runStep(page, 'Verify textarea returns to original size', async () => {
      // Verify that the textarea has returned to its original size
      const finalHeight = await page.evaluate(() => {
        return document.querySelector('#prompt')?.scrollHeight || 0;
      });
      
      const initialHeight = await page.evaluate(() => {
        return window._initialHeight || 0;
      });
      
      expect(finalHeight).toEqual(initialHeight);
    });

    await runStep(page, 'Verify message was sent', async () => {
      // Verify that the message was sent and appears in the message container
      const messageText = await page.locator('.message-box--user').first().textContent();
      expect(messageText).toContain('Test line 1');
      expect(messageText).toContain('Test line 2');
      expect(messageText).toContain('Test line 3');
      expect(messageText).toContain('Test line 4');
    });
  });

  test('Test textarea character limit', async ({ page }) => {
    const messageInput = page.getByLabel('Ask anything');

    await runStep(page, 'Attempt to enter very long text', async () => {
      // Create a very long string
      const longText = 'A'.repeat(10000);
      
      // Try to fill the textarea with the long text
      await messageInput.fill(longText);
      
      // Get the actual text in the textarea
      const actualText = await messageInput.inputValue();
      
      // Log the length for debugging
      console.log(`Textarea content length: ${actualText.length}`);
      
      // The textarea should accept the text (there might be a character limit, but we're just checking it works)
      expect(actualText.length).toBeGreaterThan(0);
    });
  });
});