// Model-agnostic provider interface for the custom review loop.
// Keeps the reviewer portable across model families (arXiv:2510.02453 §5).
// Add new providers in lib/advisor-providers/ as needed.

export interface ReviewModelResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ReviewModelProvider {
  readonly name: string;
  readonly model: string;
  call(systemPrompt: string | undefined, userMessage: string): Promise<ReviewModelResponse>;
}
