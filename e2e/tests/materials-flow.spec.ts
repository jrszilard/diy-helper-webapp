import { test, expect } from '../fixtures/test-fixtures';
import { ChatPage } from '../pages/chat.page';
import { MATERIALS_CHAT_EVENTS } from '../fixtures/mock-data';

test.describe('Materials Flow', () => {
  test('materials in SSE response shows Save Materials button', async ({ page, mockAPIs }) => {
    await mockAPIs({ chatEvents: MATERIALS_CHAT_EVENTS });
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const chat = new ChatPage(page);
    await chat.sendMessage('What materials do I need for a 12x12 deck?');
    await chat.waitForResponse();

    // The "Save Materials" button should appear after the response
    // (materials banner detection in useChat triggers showMaterialsBanner)
    const saveMaterialsButton = page.locator('button', { hasText: 'Save Materials' });
    await expect(saveMaterialsButton).toBeVisible({ timeout: 10000 });
  });

  test('materials response contains expected content', async ({ page, mockAPIs }) => {
    await mockAPIs({ chatEvents: MATERIALS_CHAT_EVENTS });
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const chat = new ChatPage(page);
    await chat.sendMessage('Deck materials please');
    await chat.waitForResponse();

    // Response should contain materials-related content
    const response = await chat.getLastAssistantMessage();
    expect(response).toContain('deck project');
  });

  test('Save to Project button appears after conversation', async ({ page, mockAPIs }) => {
    await mockAPIs({ chatEvents: MATERIALS_CHAT_EVENTS });
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const chat = new ChatPage(page);
    await chat.sendMessage('Build me a deck');
    await chat.waitForResponse();

    // Either Save Materials or Save to Project should be visible
    const saveButton = page.locator('button', { hasText: /Save Materials|Save to Project/ });
    await expect(saveButton.first()).toBeVisible({ timeout: 10000 });
  });
});
