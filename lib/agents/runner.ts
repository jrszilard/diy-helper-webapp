// Core phase execution engine — runs a single agent phase with Claude + tool loop

import Anthropic from '@anthropic-ai/sdk';
import { executeTool } from '@/lib/tools/executor';
import { withRetry } from '@/lib/api-retry';
import { AuthResult } from '@/lib/auth';
import { logger } from '@/lib/logger';
import config from '@/lib/config';
import type { AgentPhase, AgentStreamEvent, ToolCallLog, TokenUsage } from './types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const shouldRetryAnthropic = (error: unknown): boolean => {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    return status === 429 || status === 529 || status >= 500;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('overloaded') || msg.includes('529') || msg.includes('500') ||
           msg.includes('network') || msg.includes('timeout');
  }
  return false;
};

export interface PhaseToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export class CancellationError extends Error {
  constructor(message = 'Run cancelled by user') {
    super(message);
    this.name = 'CancellationError';
  }
}

export interface RunPhaseOptions {
  phase: AgentPhase;
  systemPrompt: string;
  userPrompt: string;
  tools: PhaseToolDef[];
  outputToolName: string;
  auth: AuthResult;
  runId: string;
  sendEvent: (event: AgentStreamEvent) => void;
  overallProgressBase: number;  // 0-100 base for this phase
  overallProgressRange: number; // how much of the 100% this phase occupies
  maxToolLoops?: number;
  timeoutMs?: number;
  maxTokens?: number;
  model?: string; // override per-phase model (e.g. haiku for report)
  checkCancelled?: () => boolean;
}

export interface PhaseResult {
  output: Record<string, unknown>;
  toolCalls: ToolCallLog[];
  durationMs: number;
  tokenUsage: TokenUsage;
}

/**
 * Runs a single agent phase: sends a system prompt + user prompt to Claude,
 * loops on tool_use responses (executing real tools), and collects the
 * structured output from the designated output tool.
 */
export async function runPhase(options: RunPhaseOptions): Promise<PhaseResult> {
  const {
    phase, systemPrompt, userPrompt, tools, outputToolName,
    auth, runId, sendEvent,
    overallProgressBase, overallProgressRange,
    maxToolLoops = 10,
    timeoutMs = 120_000,
    maxTokens = 4096,
    model,
    checkCancelled,
  } = options;

  const phaseModel = model || config.anthropic.model;

  const startTime = Date.now();
  const toolCalls: ToolCallLog[] = [];
  let structuredOutput: Record<string, unknown> | null = null;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Phase started
  sendEvent({
    type: 'agent_progress',
    runId,
    phase,
    phaseStatus: 'started',
    message: `Starting ${phase} phase...`,
    overallProgress: overallProgressBase,
  });

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userPrompt },
  ];

  // Combine real tools with the output submission tool
  const allTools = tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  })) as Anthropic.Tool[];

  // Check cancellation before first API call
  if (checkCancelled?.()) throw new CancellationError();

  const apiStart = Date.now();
  let response = await withRetry(
    () => anthropic.messages.create({
      model: phaseModel,
      max_tokens: maxTokens,
      system: systemPrompt,
      tools: allTools,
      messages,
    }),
    { maxRetries: 2, baseDelayMs: 1000, shouldRetry: shouldRetryAnthropic }
  );

  // Track token usage
  if (response.usage) {
    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;
  }

  logger.info('Agent phase initial call', {
    phase, runId, duration: Date.now() - apiStart, stopReason: response.stop_reason,
  });

  let loopCount = 0;

  while ((response.stop_reason === 'tool_use' || response.stop_reason === 'max_tokens') && loopCount < maxToolLoops) {
    // Check timeout
    if (Date.now() - startTime > timeoutMs) {
      logger.warn('Agent phase timeout', { phase, runId, elapsed: Date.now() - startTime });
      break;
    }

    loopCount++;

    const assistantContent: Anthropic.ContentBlock[] = [];
    const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];

    // Separate tool_use blocks into output tools and real tools for parallel execution
    const outputToolBlocks: Anthropic.ToolUseBlock[] = [];
    const realToolBlocks: Anthropic.ToolUseBlock[] = [];

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        if (block.name === outputToolName) {
          outputToolBlocks.push(block);
        } else {
          realToolBlocks.push(block);
        }
      } else if (block.type === 'text') {
        assistantContent.push(block);
      }
    }

    // Handle output submission tools first
    for (const block of outputToolBlocks) {
      structuredOutput = block.input as Record<string, unknown>;
      assistantContent.push(block);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: 'Results received successfully.',
      });
    }

    // Execute real tools in parallel
    if (realToolBlocks.length > 0) {
      // Check cancellation before tool execution
      if (checkCancelled?.()) throw new CancellationError();

      const progressPct = overallProgressBase +
        (overallProgressRange * (loopCount / (maxToolLoops * 0.7)));

      // Send progress for all tools being executed
      const toolNames = realToolBlocks.map(b => b.name);
      sendEvent({
        type: 'agent_progress',
        runId,
        phase,
        phaseStatus: 'tool_call',
        message: realToolBlocks.length > 1
          ? `Running ${realToolBlocks.length} lookups in parallel...`
          : getToolProgressMessage(realToolBlocks[0].name),
        detail: toolNames.join(', '),
        overallProgress: Math.min(
          Math.round(progressPct),
          overallProgressBase + overallProgressRange - 5,
        ),
      });

      // Execute all real tools concurrently
      const toolPromises = realToolBlocks.map(async (block) => {
        const toolStart = Date.now();
        let result: string;
        let success = true;
        let toolError: string | undefined;

        try {
          result = await executeTool(block.name, block.input as Record<string, unknown>, auth);
        } catch (err) {
          success = false;
          toolError = err instanceof Error ? err.message : String(err);
          result = `Error executing ${block.name}: ${toolError}`;
          logger.error('Agent tool error', err, { phase, runId, tool: block.name });
        }

        const toolDuration = Date.now() - toolStart;
        toolCalls.push({
          tool: block.name,
          input: block.input as Record<string, unknown>,
          durationMs: toolDuration,
          success,
          error: toolError,
        });

        logger.info('Agent tool executed', {
          phase, runId, tool: block.name, duration: toolDuration, success,
        });

        return { block, result };
      });

      const results = await Promise.all(toolPromises);

      // Collect results in original order
      for (const { block, result } of results) {
        assistantContent.push(block);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        });
      }
    }

    // If we already got the structured output, no need to continue the loop
    if (structuredOutput) break;

    // If max_tokens was hit with no tool calls, the model ran out of space.
    // Send the partial content back and nudge it to call the output tool.
    if (realToolBlocks.length === 0 && outputToolBlocks.length === 0) {
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: `You ran out of output space. Call ${outputToolName} now with the structured data. Be concise.` });
    } else {
      messages.push({ role: 'assistant', content: assistantContent });
      messages.push({ role: 'user', content: toolResults });
    }

    sendEvent({
      type: 'agent_progress',
      runId,
      phase,
      phaseStatus: 'thinking',
      message: `Analyzing ${phase} results...`,
      overallProgress: Math.round(
        overallProgressBase + overallProgressRange * 0.8
      ),
    });

    // Check cancellation before follow-up API call
    if (checkCancelled?.()) throw new CancellationError();

    const followUpStart = Date.now();
    response = await withRetry(
      () => anthropic.messages.create({
        model: phaseModel,
        max_tokens: maxTokens,
        system: systemPrompt,
        tools: allTools,
        messages,
      }),
      { maxRetries: 2, baseDelayMs: 1000, shouldRetry: shouldRetryAnthropic }
    );

    // Track token usage
    if (response.usage) {
      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;
    }

    logger.info('Agent phase follow-up call', {
      phase, runId, duration: Date.now() - followUpStart, loop: loopCount,
      stopReason: response.stop_reason,
    });
  }

  // If we didn't get structured output from the tool, check the final response
  // for any text content and try to extract the output tool call
  if (!structuredOutput) {
    for (const block of response.content) {
      if (block.type === 'tool_use' && block.name === outputToolName) {
        structuredOutput = block.input as Record<string, unknown>;
      }
    }
  }

  // If still no structured output, try to parse any text as a fallback
  if (!structuredOutput) {
    // Look for JSON in text blocks as last resort
    for (const block of response.content) {
      if (block.type === 'text' && block.text.includes('{')) {
        try {
          const jsonMatch = block.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            structuredOutput = JSON.parse(jsonMatch[0]);
          }
        } catch {
          // Not valid JSON, continue
        }
      }
    }
  }

  if (!structuredOutput) {
    throw new Error(`Phase ${phase} did not produce structured output after ${loopCount} tool loops`);
  }

  const durationMs = Date.now() - startTime;

  sendEvent({
    type: 'agent_progress',
    runId,
    phase,
    phaseStatus: 'completed',
    message: `${capitalize(phase)} phase complete`,
    overallProgress: overallProgressBase + overallProgressRange,
  });

  const tokenUsage: TokenUsage = { inputTokens: totalInputTokens, outputTokens: totalOutputTokens };

  logger.info('Agent phase completed', {
    phase, runId, durationMs, toolCallCount: toolCalls.length, loops: loopCount,
    inputTokens: totalInputTokens, outputTokens: totalOutputTokens,
  });

  return { output: structuredOutput, toolCalls, durationMs, tokenUsage };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getToolProgressMessage(toolName: string): string {
  const messages: Record<string, string> = {
    search_building_codes: 'Searching national building codes...',
    search_local_codes: 'Looking up local building codes...',
    search_project_videos: 'Finding tutorial videos...',
    search_local_stores: 'Checking local store prices...',
    check_user_inventory: 'Checking your inventory...',
    search_products: 'Searching for products...',
    calculate_wire_size: 'Calculating wire requirements...',
    compare_store_prices: 'Comparing store prices...',
    web_search: 'Searching the web...',
    web_fetch: 'Fetching page content...',
    extract_materials_list: 'Analyzing materials...',
  };
  return messages[toolName] || `Running ${toolName}...`;
}
