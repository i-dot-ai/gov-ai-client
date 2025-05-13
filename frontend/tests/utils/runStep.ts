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
      path: `frontend/tests/artifacts/${safeName}-${timestamp}.png`,
      fullPage: false, // Changed to false to avoid Firefox screenshot size limit issues
    });
    const html = await page.content();
    await fs.promises.writeFile(
      `frontend/tests/artifacts/${safeName}-${timestamp}.html`,
      html,
    );
    // Handle unknown error type properly
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Test failed in step "${name}". Error: ${errorMessage}`);
    console.error(
      `📸 Debug artifacts saved to: frontend/tests/artifacts/${safeName}-${timestamp}.[png|html]`,
    );
    throw error; // re-throw to fail the test
  }
}