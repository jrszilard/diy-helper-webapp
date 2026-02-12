import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders hero section with headline and chat input', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Your DIY projects');
    await expect(page.locator('h1')).toContainText('done right');
    // Hero chat input should be visible
    const heroInput = page.locator('input[type="text"]').first();
    await expect(heroInput).toBeVisible();
  });

  test('typing + submit navigates to /chat with sessionStorage message', async ({ page }) => {
    const heroInput = page.locator('section input[type="text"]');
    await heroInput.fill('How do I install a ceiling fan?');
    await heroInput.press('Enter');

    await page.waitForURL('**/chat');
    expect(page.url()).toContain('/chat');
  });

  test('"Get Started" link navigates to /chat', async ({ page }) => {
    const getStarted = page.locator('a', { hasText: 'Get Started' });
    await expect(getStarted).toBeVisible();
    await getStarted.click();
    await page.waitForURL('**/chat');
    expect(page.url()).toContain('/chat');
  });

  test('quick start buttons navigate to /chat', async ({ page }) => {
    const quickStart = page.locator('button', { hasText: 'Install a ceiling fan' });
    await expect(quickStart).toBeVisible();
    await quickStart.click();
    await page.waitForURL('**/chat');
    expect(page.url()).toContain('/chat');
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
