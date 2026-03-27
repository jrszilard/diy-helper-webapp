import { test, expect } from '../fixtures/test-fixtures';

function makeGuestProject() {
  return {
    id: 'store-project-001',
    name: 'Store Search Project',
    description: 'Project for store search tests',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    materials: [
      {
        id: 'store-mat-001',
        product_name: '2x6 Pressure Treated Lumber',
        quantity: 10,
        category: 'lumber',
        required: true,
        price: 12.98,
        purchased: false,
      },
    ],
  };
}

async function setupWithProject(page: import('@playwright/test').Page) {
  await page.goto('/chat');
  await page.evaluate((project) => {
    localStorage.setItem('diy-helper-guest-projects', JSON.stringify([project]));
  }, makeGuestProject());
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Select the project
  const projectButton = page.locator('text=Store Search Project').first();
  await expect(projectButton).toBeVisible({ timeout: 5000 });
  await projectButton.click();

  // Wait for shopping list to load
  await expect(page.locator('text=2x6 Pressure Treated Lumber')).toBeVisible({ timeout: 5000 });
}

test.describe('Store Search', () => {
  test.beforeEach(async ({ mockAPIs }) => {
    await mockAPIs();
  });

  test('search panel opens and closes', async ({ page }) => {
    await setupWithProject(page);

    // Click "Search Local Stores" button
    const searchButton = page.locator('button', { hasText: 'Search Local Stores' });
    await expect(searchButton).toBeVisible();
    await searchButton.click();

    // Search panel should open with location input
    await expect(page.locator('input[placeholder*="Enter location"]')).toBeVisible();

    // Click "Hide Search" to close
    const hideButton = page.locator('button', { hasText: 'Hide Search' });
    await hideButton.click();

    // Location input should no longer be visible
    await expect(page.locator('input[placeholder*="Enter location"]')).not.toBeVisible();
  });

  test('search button requires selected items and location', async ({ page }) => {
    await setupWithProject(page);

    // Open search panel
    await page.locator('button', { hasText: 'Search Local Stores' }).click();

    // Search button should be disabled when no items selected and no location
    const searchSubmit = page.locator('button', { hasText: 'Search' }).last();
    await expect(searchSubmit).toBeDisabled();

    // Enter location but no items selected
    await page.locator('input[placeholder*="Enter location"]').fill('Portsmouth, NH');
    await expect(searchSubmit).toBeDisabled();

    // Select an item
    const itemCheckbox = page.locator('input[aria-label="Select item for store search"]').first();
    await itemCheckbox.check();

    // Now search button should be enabled
    await expect(searchSubmit).toBeEnabled();
  });

  test('full search flow: select item, enter location, view results', async ({ page }) => {
    await setupWithProject(page);

    // Open search panel
    await page.locator('button', { hasText: 'Search Local Stores' }).click();

    // Select item for search
    const itemCheckbox = page.locator('input[aria-label="Select item for store search"]').first();
    await itemCheckbox.check();

    // Enter location
    await page.locator('input[placeholder*="Enter location"]').fill('Portsmouth, NH');

    // Click search
    const searchSubmit = page.locator('button', { hasText: 'Search' }).last();
    await searchSubmit.click();

    // Wait for results from mocked API
    await expect(page.locator('text=Home Depot - Portsmouth')).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Lowe's - Newington")).toBeVisible();

    // Prices should be visible (use first() since price appears in multiple places)
    await expect(page.locator('text=$12.98').first()).toBeVisible();
    await expect(page.locator('text=$13.47').first()).toBeVisible();

    // "View Product" link should be present
    await expect(page.locator('text=View Product').first()).toBeVisible();
  });
});
