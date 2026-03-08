import { Page, Locator, expect } from '@playwright/test';

export class ChatPage {
  readonly page: Page;
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly clearButton: Locator;
  readonly myToolsButton: Locator;
  readonly welcomeMessage: Locator;
  readonly saveMaterialsDialog: Locator;
  readonly messagesArea: Locator;

  constructor(page: Page) {
    this.page = page;
    this.chatInput = page.locator(
      'input[placeholder="Ask me anything about your DIY project..."]'
    );
    this.sendButton = page.locator('button', { hasText: 'Send' });
    this.clearButton = page.locator('button[aria-label="Clear chat history"]');
    this.myToolsButton = page.locator('button', { hasText: 'My Tools' });
    this.welcomeMessage = page.locator('text=Welcome to DIY Helper!');
    this.saveMaterialsDialog = page.locator(
      '[role="dialog"][aria-label="Save materials to project"]'
    );
    this.messagesArea = page.locator('.overflow-y-auto');
  }

  /** Type a message and click Send */
  async sendMessage(text: string) {
    await this.chatInput.fill(text);
    await this.sendButton.click();
  }

  /** Wait for the streaming response to finish (done event produces an assistant message) */
  async waitForResponse() {
    // Wait for the bouncing dots to appear then disappear, or for assistant message to appear.
    // The assistant message is rendered inside a div with prose-stone class after streaming completes.
    await this.page.waitForSelector('.prose-stone', { timeout: 10000 });
    // Ensure streaming is done (no more bouncing dots)
    await this.page.waitForFunction(
      () => !document.querySelector('.animate-bounce'),
      { timeout: 10000 }
    );
  }

  /** Returns the text content of the last assistant message */
  async getLastAssistantMessage(): Promise<string> {
    const assistantMessages = this.page.locator('.justify-start .prose-stone');
    const count = await assistantMessages.count();
    if (count === 0) return '';
    const last = assistantMessages.nth(count - 1);
    return (await last.textContent()) ?? '';
  }

  /** Returns the count of all visible messages (user + assistant) */
  async getMessageCount(): Promise<number> {
    const userMessages = this.page.locator('.justify-end .max-w-3xl');
    const assistantMessages = this.page.locator('.justify-start .max-w-3xl');
    const userCount = await userMessages.count();
    const assistantCount = await assistantMessages.count();
    return userCount + assistantCount;
  }

  /** Get the retry button (shown on failed messages) */
  getRetryButton(): Locator {
    return this.page.locator('button', { hasText: 'Retry' });
  }
}
