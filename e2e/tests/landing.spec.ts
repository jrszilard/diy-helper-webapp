import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders GuidedBot with greeting and project input', async ({ page }) => {
    // GuidedBot greeting should be visible
    await expect(page.locator('text=DIY project planner')).toBeVisible();
    await expect(page.locator('text=What kind of project are you working on')).toBeVisible();
    // Bot input should be visible
    const botInput = page.locator('input[placeholder="Describe your project..."]');
    await expect(botInput).toBeVisible();
  });

  test('"Skip to full chat" link navigates to /chat', async ({ page }) => {
    const skipLink = page.locator('a', { hasText: 'Skip to full chat' });
    await expect(skipLink).toBeVisible();
    await skipLink.click();
    await page.waitForURL('**/chat');
    expect(page.url()).toContain('/chat');
  });

  test('project template cards are visible', async ({ page }) => {
    // The GuidedBot renders ProjectCards with template buttons
    const templateButtons = page.locator('button', { hasText: /Ceiling Fan|Deck|Bathroom/ });
    await expect(templateButtons.first()).toBeVisible();
  });

  test('feature cards render', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Building Codes' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Video Tutorials' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Smart Shopping Lists' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tool Inventory' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Local Store Finder' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Smart Calculations' })).toBeVisible();
  });
});
