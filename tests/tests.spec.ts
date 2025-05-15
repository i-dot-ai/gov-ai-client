import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.beforeEach(async ({ page }) => {
  await page.goto('localhost:4321/')
});


const sendPrompt = async (prompt: string, page: Page) => {
  await page.locator('#prompt').fill(prompt)
  await page.getByText('Send').click()
  await expect(page.locator('.loading-ellipsis')).toBeVisible()
  await page.waitForFunction(() => {
    return document.querySelectorAll('.loading-ellipsis').length === 0
  })
}


const testAccessibility = async (page: Page) => {
  const accessibilityScanResults = await new AxeBuilder({page}).analyze()
  expect(accessibilityScanResults.violations).toEqual([])
}


test('Basic prompt-related tasks', async ({ page }) => {

  await sendPrompt('What is the capital of Norway?', page)

  // check the response is shown
  await expect(page.getByText('Oslo')).toBeVisible()

  // check the textarea is cleared
  expect(await page.locator('#prompt').inputValue()).toEqual('')

  // check that another prompt/response can happen, without affecting existing content
  await sendPrompt('What is the capital of France?', page)
  await expect(page.getByText('Paris')).toBeVisible()
  await expect(page.getByText('Oslo')).toBeVisible()

  // test accessibility of CSR content
  await testAccessibility(page)

  // check that the response is still visible on page reload
  await page.reload()
  await page.waitForLoadState('domcontentloaded')
  await expect(page.getByText('Paris')).toBeVisible()
  await expect(page.getByText('Oslo')).toBeVisible()

  // test accessibility of SSR content
  await testAccessibility(page)

  // check that the session can be cleared
  expect(await page.locator('.message-box--llm').count()).toEqual(2)
  await page.locator('a[href="/clear-session"]').click({ clickCount: 3 })
  await page.waitForLoadState('domcontentloaded')
  expect(await page.locator('.message-box--llm').count()).toEqual(0)
 
})


test('MCP call', async ({ page }) => {
  
  await sendPrompt('What is 6 * 7?', page)

  // check the tool call and the response is shown
  await expect(page.getByText('Calling: ping-pong')).toBeVisible()
  await expect(page.getByText('42')).toBeVisible()

  await testAccessibility(page)

})


test('Message input functionality', async ({ page }) => {

  const messageInput = page.locator('#prompt');

  const height1 = await page.evaluate(() => document.querySelector('#prompt')?.scrollHeight || 0)

  // Pressing shift + enter doesn't send the message
  for (let i = 1; i <= 4; i++) {
    await messageInput.pressSequentially(`Test line ${i}`)
    await messageInput.press('Shift+Enter')
  }
  
  // The height of the textarea increases to fit content
  const height2 = await page.evaluate(() => document.querySelector('#prompt')?.scrollHeight || 0)
  expect(height2 > height1).toBeTruthy()

  // Pressing enter key (without shift) sends the message
  await messageInput.press('Enter')
  await expect(page.locator('.loading-ellipsis')).toBeVisible()
  await page.waitForFunction(() => {
    return document.querySelectorAll('.loading-ellipsis').length === 0
  })

  // And the height of the textarea returns to it's original height
  const height3 = await page.evaluate(() => document.querySelector('#prompt')?.scrollHeight || 0)
  expect(height3).toEqual(height1)

})


test('Copy to clipboard', async ({ page, browserName }) => {

  await sendPrompt('What is the capital of Norway?', page)

  const copyButton = page.getByRole('button', { name: 'Copy' }).last()
  await copyButton.click()
  
  // Buttons have accessible text to make each one unique
  expect((await copyButton.allInnerTexts()).toString()).toContain('response 1')

  // Content is copied to the clipboard
  let clipboardText = await page.evaluate('navigator.clipboard.readText()')
  expect(clipboardText).toContain('Oslo')

})
