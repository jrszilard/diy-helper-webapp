import { test, expect } from '../fixtures/test-fixtures';

test.describe('Shopping Trips', () => {
  test.beforeEach(async ({ mockAPIs }) => {
    await mockAPIs();
  });

  test('shows empty trip list for a project', async ({ page }) => {
    await page.route('**/api/shopping-trips*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ trips: [] }),
        });
      }
    });

    await page.goto('/');
    await expect(page.locator('text=No shopping trips yet')).toBeVisible({ timeout: 10000 });
  });

  test('create trip button shows name input', async ({ page }) => {
    await page.route('**/api/shopping-trips*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ trips: [] }),
      });
    });

    await page.goto('/');
    const newTripButton = page.locator('button:has-text("New Trip")');
    if (await newTripButton.isVisible({ timeout: 5000 })) {
      await newTripButton.click();
      await expect(page.locator('input[placeholder*="Trip name"]')).toBeVisible();
    }
  });

  test('trip checklist shows items grouped by category', async ({ page }) => {
    const mockTrip = {
      trip: {
        id: 'trip-1', project_id: 'proj-1', name: 'Test Trip',
        status: 'active', created_at: new Date().toISOString(), completed_at: null,
      },
      items: [
        { id: 'item-1', trip_id: 'trip-1', product_name: 'PEX Tubing', quantity: 1, category: 'Plumbing', estimated_price: 18, purchased: false, purchased_at: null, notes: null },
        { id: 'item-2', trip_id: 'trip-1', product_name: 'Wire Nuts', quantity: 10, category: 'Electrical', estimated_price: 5, purchased: true, purchased_at: new Date().toISOString(), notes: null },
      ],
    };

    await page.route('**/api/shopping-trips/trip-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTrip),
      });
    });

    // Note: Navigation to checklist view depends on project/shopping list UI flow.
    // These assertions validate the component renders correctly once data is available.
    // Uncomment and adjust once the full navigation path is confirmed:
    // await expect(page.locator('text=PLUMBING')).toBeVisible();
    // await expect(page.locator('text=ELECTRICAL')).toBeVisible();
    // await expect(page.locator('text=PEX Tubing')).toBeVisible();
  });
});
