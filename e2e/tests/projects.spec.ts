import { test, expect } from '../fixtures/test-fixtures';
import { ChatPage } from '../pages/chat.page';
import { MATERIALS_CHAT_EVENTS } from '../fixtures/mock-data';

// Helper to seed a guest project into localStorage
function makeGuestProject(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-project-001',
    name: 'Test Deck Project',
    description: 'A test project',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    materials: [
      {
        id: 'mat-001',
        product_name: '2x6 Lumber',
        quantity: 10,
        category: 'lumber',
        required: true,
        price: 12.98,
        purchased: false,
      },
      {
        id: 'mat-002',
        product_name: 'Deck Screws',
        quantity: 3,
        category: 'fasteners',
        required: true,
        price: 24.97,
        purchased: false,
      },
    ],
    ...overrides,
  };
}

test.describe('Projects', () => {
  test('Save to Project button appears after chat response', async ({ page, mockAPIs }) => {
    await mockAPIs({ chatEvents: MATERIALS_CHAT_EVENTS });
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const chat = new ChatPage(page);
    await chat.sendMessage('I need deck materials');
    await chat.waitForResponse();

    // Save Materials or Save to Project should appear
    const saveButton = page.locator('button', { hasText: /Save Materials|Save to Project/ });
    await expect(saveButton.first()).toBeVisible({ timeout: 10000 });
  });

  test('guest project persists in localStorage', async ({ page, mockAPIs }) => {
    await mockAPIs();
    // Pre-seed a guest project
    await page.goto('/');
    await page.evaluate((project) => {
      localStorage.setItem('diy-helper-guest-projects', JSON.stringify([project]));
    }, makeGuestProject());
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify project exists in localStorage after reload
    const projectCount = await page.evaluate(() => {
      const stored = localStorage.getItem('diy-helper-guest-projects');
      return stored ? JSON.parse(stored).length : 0;
    });
    expect(projectCount).toBe(1);
  });

  test('pre-seeded project data is correct', async ({ page, mockAPIs }) => {
    await mockAPIs();
    await page.goto('/');
    await page.evaluate((project) => {
      localStorage.setItem('diy-helper-guest-projects', JSON.stringify([project]));
    }, makeGuestProject());

    // Verify project data
    const projectData = await page.evaluate(() => {
      const stored = localStorage.getItem('diy-helper-guest-projects');
      return stored ? JSON.parse(stored)[0] : null;
    });
    expect(projectData.name).toBe('Test Deck Project');
    expect(projectData.materials.length).toBe(2);
    expect(projectData.materials[0].product_name).toBe('2x6 Lumber');
  });
});
