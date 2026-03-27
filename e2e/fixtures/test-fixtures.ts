import { test as base, Page } from '@playwright/test';
import { buildSSEBody, sseHeaders } from './sse-helpers';
import { SIMPLE_CHAT_EVENTS, STORE_SEARCH_RESPONSE, EXTRACT_MATERIALS_RESPONSE } from './mock-data';
import type { StreamEvent } from '../../lib/tools/types';

interface MockAPIOptions {
  /** Override the default SSE events returned by /api/chat */
  chatEvents?: StreamEvent[];
  /** Override the default /api/search-stores response */
  storeSearchResponse?: object;
  /** Override the default /api/extract-materials response */
  extractMaterialsResponse?: object;
}

/**
 * Sets up page.route() interceptions for all external API calls.
 * Tests run in guest mode — Supabase auth fails silently, app falls through to guest mode.
 */
async function mockAPIs(page: Page, options: MockAPIOptions = {}) {
  const chatEvents = options.chatEvents ?? SIMPLE_CHAT_EVENTS;

  // Mock /api/chat (SSE streaming)
  await page.route('**/api/chat', async (route) => {
    await route.fulfill({
      status: 200,
      headers: sseHeaders(),
      body: buildSSEBody(chatEvents),
    });
  });

  // Mock /api/search-stores
  await page.route('**/api/search-stores', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(options.storeSearchResponse ?? STORE_SEARCH_RESPONSE),
    });
  });

  // Mock /api/extract-materials
  await page.route('**/api/extract-materials', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(options.extractMaterialsResponse ?? EXTRACT_MATERIALS_RESPONSE),
    });
  });

  // Mock /api/conversations (returns empty for guest mode)
  await page.route('**/api/conversations**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}

export const test = base.extend<{
  mockAPIs: (options?: MockAPIOptions) => Promise<void>;
  chatPage: Page;
}>({
  /**
   * Fixture that provides a function to mock all API routes.
   * Call mockAPIs() in your test before navigating.
   */
  mockAPIs: async ({ page }, use) => {
    await use((options?: MockAPIOptions) => mockAPIs(page, options));
  },

  /**
   * Fixture that navigates to /chat with mocked APIs and cleared localStorage.
   * Ready for immediate interaction.
   */
  chatPage: async ({ page }, use) => {
    await mockAPIs(page);
    await page.goto('/chat');
    // Clear any previous state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    // Re-navigate so cleared state takes effect
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    await use(page);
  },
});

export { expect } from '@playwright/test';
export type { MockAPIOptions };
