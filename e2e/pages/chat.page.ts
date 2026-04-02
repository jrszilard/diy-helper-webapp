import { Page, Locator, expect } from '@playwright/test';

/**
 * Page object for the unified landing page chat experience.
 * Chat now lives on / instead of /chat.
 */
export class ChatPage {
  readonly page: Page;
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly messagesArea: Locator;

  constructor(page: Page) {
    this.page = page;
    this.chatInput = page.locator('textarea');
    this.sendButton = page.locator('button[aria-label="Send message"]');
    this.messagesArea = page.locator('.overflow-y-auto');
  }

  /** Type a message and press Enter to send */
  async sendMessage(text: string) {
    await this.chatInput.fill(text);
    await this.chatInput.press('Enter');
  }

  /** Wait for the streaming response to finish (assistant message appears) */
  async waitForResponse() {
    // Wait for an assistant message bubble to appear (prose-invert is used in dark theme)
    await this.page.waitForSelector('.prose-invert', { timeout: 10000 });
    // Ensure streaming is done (no spinner visible)
    await this.page.waitForFunction(
      () => !document.querySelector('[class*="animate-spin"]'),
      { timeout: 10000 }
    );
  }

  /** Returns the text content of the last assistant message */
  async getLastAssistantMessage(): Promise<string> {
    const assistantMessages = this.page.locator('.justify-start .prose-invert');
    const count = await assistantMessages.count();
    if (count === 0) return '';
    const last = assistantMessages.nth(count - 1);
    return (await last.textContent()) ?? '';
  }

  /** Returns the count of all visible messages (user + assistant) */
  async getMessageCount(): Promise<number> {
    const userMessages = this.page.locator('.justify-end');
    const assistantMessages = this.page.locator('.justify-start .prose-invert');
    const userCount = await userMessages.count();
    const assistantCount = await assistantMessages.count();
    return userCount + assistantCount;
  }

  /** Get the retry button (shown on failed messages) */
  getRetryButton(): Locator {
    return this.page.locator('button', { hasText: 'Retry' });
  }
}
