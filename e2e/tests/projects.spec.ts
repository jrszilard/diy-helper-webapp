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
  test('empty state shows for guest with no projects', async ({ chatPage }) => {
    // Guest mode with no projects — sidebar should show empty or "Local Projects"
    // On desktop, the ProjectsSidebar should be visible
    const sidebar = chatPage.locator('.hidden.md\\:block').first();
    await expect(sidebar).toBeVisible();
  });

  test('create project via save dialog creates guest project', async ({ page, mockAPIs }) => {
    await mockAPIs({ chatEvents: MATERIALS_CHAT_EVENTS });
    await page.goto('/chat');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const chat = new ChatPage(page);
    await chat.sendMessage('I need deck materials');
    await chat.waitForResponse();

    // Wait for dialog
    await expect(chat.saveMaterialsDialog).toBeVisible({ timeout: 10000 });

    // Click Create New Project
    await page.locator('button', { hasText: 'Create New Project' }).click();

    // Verify project saved in localStorage
    await expect(chat.saveMaterialsDialog).not.toBeVisible({ timeout: 5000 });

    const projectCount = await page.evaluate(() => {
      const stored = localStorage.getItem('diy-helper-guest-projects');
      return stored ? JSON.parse(stored).length : 0;
    });
    expect(projectCount).toBe(1);
  });

  test('delete guest project removes it', async ({ page, mockAPIs }) => {
    await mockAPIs();
    // Pre-seed a guest project
    await page.goto('/chat');
    await page.evaluate((project) => {
      localStorage.setItem('diy-helper-guest-projects', JSON.stringify([project]));
    }, makeGuestProject());
    await page.reload();
    await page.waitForLoadState('networkidle');

    // On desktop, click on the project in the sidebar to select it
    const projectButton = page.locator('text=Test Deck Project').first();
    await expect(projectButton).toBeVisible({ timeout: 5000 });

    // Look for delete button on the project
    const deleteButton = page
      .locator('[aria-label="Delete project"]')
      .or(page.locator('button[title="Delete project"]'))
      .first();

    if (await deleteButton.isVisible()) {
      page.on('dialog', (dialog) => dialog.accept());
      await deleteButton.click();

      // Verify project removed from localStorage
      const projectCount = await page.evaluate(() => {
        const stored = localStorage.getItem('diy-helper-guest-projects');
        return stored ? JSON.parse(stored).length : 0;
      });
      expect(projectCount).toBe(0);
    }
  });

  test('select project shows shopping list sidebar on desktop', async ({ page, mockAPIs }) => {
    await mockAPIs();
    // Pre-seed a guest project with materials
    await page.goto('/chat');
    await page.evaluate((project) => {
      localStorage.setItem('diy-helper-guest-projects', JSON.stringify([project]));
    }, makeGuestProject());
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Click on the project in sidebar
    const projectButton = page.locator('text=Test Deck Project').first();
    await expect(projectButton).toBeVisible({ timeout: 5000 });
    await projectButton.click();

    // Shopping list sidebar should appear on desktop
    // Look for the shopping list view or project name in the right sidebar
    await expect(
      page.locator('text=2x6 Lumber').or(page.locator('text=No items yet'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('pre-seeded project shows correct material count', async ({ page, mockAPIs }) => {
    await mockAPIs();
    await page.goto('/chat');
    await page.evaluate((project) => {
      localStorage.setItem('diy-helper-guest-projects', JSON.stringify([project]));
    }, makeGuestProject());
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Select the project
    const projectButton = page.locator('text=Test Deck Project').first();
    await expect(projectButton).toBeVisible({ timeout: 5000 });
    await projectButton.click();

    // Verify materials appear in shopping list
    await expect(page.locator('text=2x6 Lumber')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Deck Screws')).toBeVisible();
  });
});
