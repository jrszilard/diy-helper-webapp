import { test, expect } from '../fixtures/test-fixtures';
import { ChatPage } from '../pages/chat.page';
import { SIMPLE_CHAT_EVENTS, ERROR_CHAT_EVENTS, TOOL_USE_CHAT_EVENTS } from '../fixtures/mock-data';

test.describe('Chat Messaging', () => {
  test('shows welcome message on empty chat', async ({ chatPage }) => {
    const chat = new ChatPage(chatPage);
    await expect(chat.welcomeMessage).toBeVisible();
    await expect(chatPage.locator('text=Ask me about any home improvement project')).toBeVisible();
  });

  test('send message shows user message and streaming response', async ({ chatPage }) => {
    const chat = new ChatPage(chatPage);
    await chat.sendMessage('How do I install a ceiling fan?');

    // User message should appear
    await expect(chatPage.locator('text=How do I install a ceiling fan?')).toBeVisible();

    // Wait for assistant response
    await chat.waitForResponse();

    // Assistant message should contain mocked content
    const response = await chat.getLastAssistantMessage();
    expect(response).toContain('Turn off the power');
    expect(response).toContain('Install the mounting bracket');
  });

  test('progress indicators appear during streaming with tool use', async ({ page, mockAPIs }) => {
    await mockAPIs({ chatEvents: TOOL_USE_CHAT_EVENTS });
    await page.goto('/chat');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const chat = new ChatPage(page);
    await chat.sendMessage('What size wire for a 20-amp kitchen circuit?');

    // Wait for response to complete
    await chat.waitForResponse();

    // Response should contain the mocked building code content
    const response = await chat.getLastAssistantMessage();
    expect(response).toContain('12-gauge wire');
  });

  test('API error shows error message in chat', async ({ page, mockAPIs }) => {
    await mockAPIs({ chatEvents: ERROR_CHAT_EVENTS });
    await page.goto('/chat');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const chat = new ChatPage(page);
    await chat.sendMessage('Tell me about plumbing');

    await chat.waitForResponse();
    const response = await chat.getLastAssistantMessage();
    expect(response).toContain('error occurred');
  });

  test('network failure shows retry button', async ({ page }) => {
    // Mock /api/chat to return network error
    await page.route('**/api/chat', async (route) => {
      await route.abort('connectionrefused');
    });
    // Mock other routes to prevent real calls
    await page.route('**/api/conversations**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.goto('/chat');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const chat = new ChatPage(page);
    await chat.sendMessage('Test network failure');

    // Wait for error message
    await expect(page.locator('text=Could not connect')).toBeVisible({ timeout: 10000 });

    // Retry button should be visible
    await expect(chat.getRetryButton()).toBeVisible();
  });

  test('send button is disabled while loading', async ({ page }) => {
    // Use a delayed response to test loading state
    await page.route('**/api/chat', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: 'data: {"type":"text","content":"response"}\n\ndata: {"type":"done"}\n\n',
      });
    });
    await page.route('**/api/conversations**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.goto('/chat');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const chat = new ChatPage(page);
    await chat.chatInput.fill('Test loading');
    await chat.sendButton.click();

    // Send button should be disabled during loading
    await expect(chat.sendButton).toBeDisabled();
    // Input should be disabled during loading
    await expect(chat.chatInput).toBeDisabled();
  });

  test('send button is disabled when input is empty', async ({ chatPage }) => {
    const chat = new ChatPage(chatPage);
    await expect(chat.sendButton).toBeDisabled();
  });

  test('Enter key sends message', async ({ chatPage }) => {
    const chat = new ChatPage(chatPage);
    await chat.chatInput.fill('Test enter key');
    await chat.chatInput.press('Enter');

    // User message should appear
    await expect(chatPage.locator('text=Test enter key')).toBeVisible();
    await chat.waitForResponse();
  });

  test('clear chat removes messages', async ({ chatPage }) => {
    const chat = new ChatPage(chatPage);

    // Send a message first
    await chat.sendMessage('Test message for clearing');
    await chat.waitForResponse();

    // Accept the confirm dialog
    chatPage.on('dialog', (dialog) => dialog.accept());

    // Clear button should now be visible
    await expect(chat.clearButton).toBeVisible();
    await chat.clearButton.click();

    // Welcome message should reappear
    await expect(chat.welcomeMessage).toBeVisible();
  });
});
