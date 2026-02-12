import { test, expect } from '../fixtures/test-fixtures';

function makeGuestProject() {
  return {
    id: 'shop-project-001',
    name: 'Shopping Test Project',
    description: 'Project for shopping list tests',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    materials: [
      {
        id: 'smat-001',
        product_name: 'Cedar Planks',
        quantity: 8,
        category: 'lumber',
        required: true,
        price: 9.99,
        purchased: false,
      },
      {
        id: 'smat-002',
        product_name: 'Wood Stain',
        quantity: 2,
        category: 'finishing',
        required: true,
        price: 34.99,
        purchased: false,
      },
      {
        id: 'smat-003',
        product_name: 'Paint Brushes',
        quantity: 1,
        category: 'finishing',
        required: false,
        price: 12.49,
        purchased: false,
      },
    ],
  };
}

async function setupShoppingList(page: import('@playwright/test').Page) {
  // Pre-seed project and navigate
  await page.goto('/chat');
  await page.evaluate((project) => {
    localStorage.setItem('diy-helper-guest-projects', JSON.stringify([project]));
  }, makeGuestProject());
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Select the project to show shopping list
  const projectButton = page.locator('text=Shopping Test Project').first();
  await expect(projectButton).toBeVisible({ timeout: 5000 });
  await projectButton.click();

  // Wait for materials to load
  await expect(page.locator('text=Cedar Planks')).toBeVisible({ timeout: 5000 });
}

test.describe('Shopping List', () => {
  test.beforeEach(async ({ mockAPIs }) => {
    await mockAPIs();
  });

  test('displays items grouped by category', async ({ page }) => {
    await setupShoppingList(page);

    // Lumber category items
    await expect(page.locator('text=Cedar Planks')).toBeVisible();
    // Finishing category items
    await expect(page.locator('text=Wood Stain')).toBeVisible();
    await expect(page.locator('text=Paint Brushes')).toBeVisible();

    // Category headers should be visible (uppercase)
    await expect(page.locator('text=LUMBER').or(page.locator('h3', { hasText: /lumber/i }))).toBeVisible();
    await expect(page.locator('text=FINISHING').or(page.locator('h3', { hasText: /finishing/i }))).toBeVisible();
  });

  test('mark item purchased updates progress', async ({ page }) => {
    await setupShoppingList(page);

    // Find purchase checkbox for first item
    const purchaseButton = page.locator('button[aria-label="Mark as purchased"]').first();
    await purchaseButton.click();

    // Progress should update
    await expect(page.locator('text=1 of 3 items purchased')).toBeVisible({ timeout: 5000 });

    // Verify localStorage updated
    const purchased = await page.evaluate(() => {
      const stored = localStorage.getItem('diy-helper-guest-projects');
      if (!stored) return false;
      const projects = JSON.parse(stored);
      return projects[0].materials[0].purchased;
    });
    expect(purchased).toBe(true);
  });

  test('delete item removes from list', async ({ page }) => {
    await setupShoppingList(page);

    // Accept the confirm dialog
    page.on('dialog', (dialog) => dialog.accept());

    // Find delete button for first item
    const deleteButton = page.locator('button[aria-label="Remove item from list"]').first();
    await deleteButton.click();

    // Verify item count reduced
    const materialCount = await page.evaluate(() => {
      const stored = localStorage.getItem('diy-helper-guest-projects');
      if (!stored) return 0;
      return JSON.parse(stored)[0].materials.length;
    });
    expect(materialCount).toBe(2);
  });

  test('edit item quantity', async ({ page }) => {
    await setupShoppingList(page);

    // Click on the quantity to edit
    const qtyButton = page.locator('button', { hasText: /Qty: 8/ }).first();
    await expect(qtyButton).toBeVisible();
    await qtyButton.click();

    // Edit input should appear
    const qtyInput = page.locator('input[type="number"]').first();
    await expect(qtyInput).toBeVisible();
    await qtyInput.fill('12');

    // Click Save button (the one next to the quantity input)
    const saveBtn = page.getByRole('button', { name: 'Save', exact: true });
    await saveBtn.click();

    // Verify localStorage updated
    const updatedQty = await page.evaluate(() => {
      const stored = localStorage.getItem('diy-helper-guest-projects');
      if (!stored) return 0;
      const projects = JSON.parse(stored);
      return projects[0].materials[0].quantity;
    });
    expect(updatedQty).toBe(12);
  });
});
