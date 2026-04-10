import Anthropic from '@anthropic-ai/sdk';
import type { ReviewModelProvider, ReviewModelResponse } from '@/lib/advisor-provider';

export class AnthropicReviewProvider implements ReviewModelProvider {
  readonly name = 'anthropic';

  constructor(
    readonly model: string,
    private client: Anthropic,
  ) {}

  async call(systemPrompt: string | undefined, userMessage: string): Promise<ReviewModelResponse> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    return {
      text: textBlock && textBlock.type === 'text' ? textBlock.text : '',
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    };
  }
}
