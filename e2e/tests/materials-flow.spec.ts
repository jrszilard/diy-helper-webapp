import { test, expect } from '../fixtures/test-fixtures';
import { ChatPage } from '../pages/chat.page';
import { MATERIALS_CHAT_EVENTS } from '../fixtures/mock-data';

test.describe('Materials Flow', () => {
  test('materials in SSE response triggers SaveMaterialsDialog', async ({ page, mockAPIs }) => {
    await mockAPIs({ chatEvents: MATERIALS_CHAT_EVENTS });
    await page.goto('/chat');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const chat = new ChatPage(page);
    await chat.sendMessage('What materials do I need for a 12x12 deck?');
    await chat.waitForResponse();

    // SaveMaterialsDialog should open with correct info
    await expect(chat.saveMaterialsDialog).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Save Materials to Project')).toBeVisible();
    await expect(page.locator('text=3 items to purchase')).toBeVisible();
  });

  test('"Skip for Now" closes dialog', async ({ page, mockAPIs }) => {
    await mockAPIs({ chatEvents: MATERIALS_CHAT_EVENTS });
    await page.goto('/chat');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const chat = new ChatPage(page);
    await chat.sendMessage('Deck materials please');
    await chat.waitForResponse();

    await expect(chat.saveMaterialsDialog).toBeVisible({ timeout: 10000 });

    const skipButton = page.locator('button', { hasText: 'Skip for Now' });
    await skipButton.click();

    await expect(chat.saveMaterialsDialog).not.toBeVisible();
  });

  test('Escape key closes dialog', async ({ page, mockAPIs }) => {
    await mockAPIs({ chatEvents: MATERIALS_CHAT_EVENTS });
    await page.goto('/chat');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const chat = new ChatPage(page);
    await chat.sendMessage('Deck materials');
    await chat.waitForResponse();

    await expect(chat.saveMaterialsDialog).toBeVisible({ timeout: 10000 });

    await page.keyboard.press('Escape');

    await expect(chat.saveMaterialsDialog).not.toBeVisible();
  });

  test('"Create New Project" saves materials in guest mode', async ({ page, mockAPIs }) => {
    await mockAPIs({ chatEvents: MATERIALS_CHAT_EVENTS });
    await page.goto('/chat');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const chat = new ChatPage(page);
    await chat.sendMessage('Build me a deck');
    await chat.waitForResponse();

    await expect(chat.saveMaterialsDialog).toBeVisible({ timeout: 10000 });

    // Click "Create New Project"
    const createButton = page.locator('button', { hasText: 'Create New Project' });
    await createButton.click();

    // Dialog should close and a success message should appear
    await expect(chat.saveMaterialsDialog).not.toBeVisible({ timeout: 5000 });

    // Check that guest project was created in localStorage
    const projects = await page.evaluate(() => {
      const stored = localStorage.getItem('diy-helper-guest-projects');
      return stored ? JSON.parse(stored) : [];
    });
    expect(projects.length).toBe(1);
    expect(projects[0].name).toContain('Build a 12x12 Deck');
    expect(projects[0].materials.length).toBe(3);
  });
});
