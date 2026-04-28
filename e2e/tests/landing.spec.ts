import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API routes for guest mode
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        body: 'data: {"type":"progress","step":"thinking","message":"Analyzing...","icon":"🤔"}\n\ndata: {"type":"text","content":"Here is your answer."}\n\ndata: {"type":"done"}\n\n',
      });
    });
    await page.route('**/api/conversations**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.goto('/');
  });

  test('renders hero section with tabs', async ({ page }) => {
    // Two tabs should be visible
    await expect(page.locator('button', { hasText: 'Ask Anything' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Talk to a Pro' })).toBeVisible();
  });

  test('renders suggestion chips', async ({ page }) => {
    await expect(page.locator('button', { hasText: 'mortar' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'electrical panel' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'bathroom remodel' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'permits' })).toBeVisible();
  });

  test('clicking suggestion chip morphs to chat', async ({ page }) => {
    const chip = page.locator('button', { hasText: 'bathroom remodel' });
    await chip.click();

    // User message should appear
    await expect(page.locator('text=Price out a bathroom remodel')).toBeVisible();
    // Suggestion chips should disappear once chat is active
    await expect(chip).not.toBeVisible();
  });

  test('typing and sending morphs to chat', async ({ page }) => {
    const textarea = page.getByPlaceholder(/Describe your project or ask a question/);
    await textarea.fill('How do I install a ceiling fan?');
    await textarea.press('Enter');

    // User message should appear in chat
    await expect(page.locator('text=How do I install a ceiling fan?')).toBeVisible();
    // Suggestion chips should disappear once chat is active
    await expect(page.locator('button', { hasText: 'bathroom remodel' })).not.toBeVisible();
  });

  test('tab switching shows expert form', async ({ page }) => {
    await page.locator('button', { hasText: 'Talk to a Pro' }).click();
    // Expert form's question textarea should appear (QASubmitForm)
    await expect(page.getByPlaceholder(/Describe your question in detail/)).toBeVisible();
  });

  test('/chat redirects to /', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForURL('/');
    expect(page.url()).not.toContain('/chat');
  });

  test('footer links are visible in hero state', async ({ page }) => {
    await expect(page.locator('a', { hasText: 'About' })).toBeVisible();
    await expect(page.locator('a', { hasText: 'Become an Expert' })).toBeVisible();
  });
});
