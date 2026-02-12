import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAuthFromRequest } from '@/lib/auth';
import { handleCorsOptions, applyCorsHeaders } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { ChatRequestSchema, parseRequestBody } from '@/lib/validation';
import config from '@/lib/config';
import { pruneConversation } from '@/lib/conversation-pruner';
import { createConversation, addMessage, generateTitle } from '@/lib/chat-history';
import { systemPrompt } from '@/lib/system-prompt';
import { tools, progressMessages } from '@/lib/tools/definitions';
import { executeTool } from '@/lib/tools/executor';
import { StreamEvent } from '@/lib/tools/types';
import { withRetry } from '@/lib/api-retry';

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

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY not set');
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'API configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const auth = await getAuthFromRequest(req);

    const rateLimitResult = checkRateLimit(req, auth.userId, 'chat');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter),
          },
        }
      ));
    }

    const body = await req.json();

    const parsed = parseRequestBody(ChatRequestSchema, body);
    if (!parsed.success) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: parsed.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { message, history, streaming, conversationId: existingConversationId } = parsed.data;

    const prunedHistory = pruneConversation(history);

    if (!streaming) {
      return handleNonStreamingRequest(auth, message, prunedHistory);
    }

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: StreamEvent) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          } catch (e) {
            console.error('Error sending SSE event:', e);
          }
        };

        try {
          sendEvent({
            type: 'progress',
            step: 'thinking',
            message: 'Analyzing your question...',
            icon: '🤔'
          });

          const messages: Anthropic.MessageParam[] = [
            ...(prunedHistory as Anthropic.MessageParam[]),
            { role: 'user' as const, content: message }
          ];

          let response = await withRetry(
            () => anthropic.messages.create({
              model: config.anthropic.model,
              max_tokens: config.anthropic.maxTokens,
              system: systemPrompt,
              tools: tools as Anthropic.Tool[],
              messages
            }),
            { maxRetries: 2, baseDelayMs: 1000, shouldRetry: shouldRetryAnthropic }
          );

          let loopCount = 0;
          const maxLoops = 10;

          while (response.stop_reason === 'tool_use' && loopCount < maxLoops) {
            loopCount++;

            const assistantContent: Anthropic.ContentBlock[] = [];
            const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];

            for (const block of response.content) {
              if (block.type === 'tool_use') {
                const progress = progressMessages[block.name as keyof typeof progressMessages] || {
                  message: `Running ${block.name}...`,
                  icon: '⚙️'
                };
                sendEvent({
                  type: 'progress',
                  step: block.name,
                  message: progress.message,
                  icon: progress.icon
                });

                const result = await executeTool(block.name, block.input as Record<string, unknown>, auth);

                // Forward inventory updates to client as dedicated SSE events
                if (block.name === 'detect_owned_items' && result.startsWith('FAILED:')) {
                  sendEvent({ type: 'tool_result', toolName: 'inventory_auth_required', result: null });
                }
                const invMatch = result.match(/---INVENTORY_UPDATE---\n([\s\S]*?)\n---END_INVENTORY_UPDATE---/);
                if (invMatch) {
                  try {
                    sendEvent({ type: 'tool_result', toolName: 'inventory_update', result: JSON.parse(invMatch[1]) });
                  } catch { /* ignore parse errors */ }
                }

                assistantContent.push(block);

                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: result
                });
              } else if (block.type === 'text') {
                assistantContent.push(block);

                if (block.text) {
                  sendEvent({ type: 'text', content: block.text });
                }
              }
            }

            messages.push({
              role: 'assistant' as const,
              content: assistantContent
            });

            messages.push({
              role: 'user' as const,
              content: toolResults
            });

            sendEvent({
              type: 'progress',
              step: 'synthesizing',
              message: 'Putting it all together...',
              icon: '✨'
            });

            response = await withRetry(
              () => anthropic.messages.create({
                model: config.anthropic.model,
                max_tokens: config.anthropic.maxTokens,
                system: systemPrompt,
                tools: tools as Anthropic.Tool[],
                messages
              }),
              { maxRetries: 2, baseDelayMs: 1000, shouldRetry: shouldRetryAnthropic }
            );
          }

          // Warn user if tool loop hit the limit
          if (loopCount >= maxLoops && response.stop_reason === 'tool_use') {
            sendEvent({
              type: 'warning',
              content: 'This response required more tool calls than allowed in a single turn. The answer below may be incomplete — try asking a follow-up to continue.'
            });
          }

          // Stream final response in chunks
          for (const block of response.content) {
            if (block.type === 'text') {
              const text = block.text;
              for (let i = 0; i < text.length; i += config.streaming.chunkSize) {
                sendEvent({ type: 'text', content: text.slice(i, i + config.streaming.chunkSize) });
                await new Promise(resolve => setTimeout(resolve, config.streaming.chunkDelayMs));
              }
            }
          }

          // Persist chat history for authenticated users
          let responseConversationId = existingConversationId || null;
          if (auth.userId) {
            try {
              let assistantText = '';
              for (const block of response.content) {
                if (block.type === 'text') assistantText += block.text;
              }

              if (!responseConversationId) {
                const conv = await createConversation(
                  auth.supabaseClient,
                  auth.userId,
                  generateTitle(message),
                  parsed.data.project_id
                );
                responseConversationId = conv.id;
              }

              const convId = responseConversationId!;
              await addMessage(auth.supabaseClient, convId, 'user', message);
              if (assistantText) {
                await addMessage(auth.supabaseClient, convId, 'assistant', assistantText);
              }
            } catch (persistErr) {
              console.error('Error persisting chat:', persistErr);
            }
          }

          sendEvent({ type: 'done', conversationId: responseConversationId });
          controller.close();

        } catch (error: unknown) {
          console.error('Stream error:', error);
          let errorContent = 'An unexpected error occurred. Please try again.';
          if (error && typeof error === 'object' && 'status' in error) {
            const status = (error as { status: number }).status;
            if (status === 429 || status === 529) {
              errorContent = 'Service is busy. Please wait a moment and try again.';
            } else if (status >= 500) {
              errorContent = 'Service temporarily unavailable. Please try again in a moment.';
            }
          } else if (error instanceof Error) {
            const msg = error.message.toLowerCase();
            if (msg.includes('overloaded') || msg.includes('529')) {
              errorContent = 'Service is busy. Please wait a moment and try again.';
            } else if (msg.includes('timeout') || msg.includes('abort')) {
              errorContent = 'The request timed out. Please try again.';
            } else if (msg.includes('network') || msg.includes('econnrefused')) {
              errorContent = 'Could not connect to the service. Please check your connection and try again.';
            }
          }
          sendEvent({ type: 'error', content: errorContent });
          sendEvent({ type: 'done' });
          controller.close();
        }
      }
    });

    return applyCorsHeaders(req, new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    }));

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Chat API error:', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        error: 'Failed to process message',
        details: errorMessage
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

// Handle non-streaming requests (backward compatibility)
async function handleNonStreamingRequest(
  auth: Awaited<ReturnType<typeof getAuthFromRequest>>,
  message: string,
  history: Array<{ role: string; content: string | Array<Record<string, unknown>> }>
) {
  const messages: Anthropic.MessageParam[] = [
    ...(history as Anthropic.MessageParam[]),
    { role: 'user' as const, content: message }
  ];

  let response = await withRetry(
    () => anthropic.messages.create({
      model: config.anthropic.model,
      max_tokens: config.anthropic.maxTokens,
      system: systemPrompt,
      tools: tools as Anthropic.Tool[],
      messages
    }),
    { maxRetries: 2, baseDelayMs: 1000, shouldRetry: shouldRetryAnthropic }
  );

  let loopCount = 0;
  const maxLoops = 10;

  while (response.stop_reason === 'tool_use' && loopCount < maxLoops) {
    loopCount++;

    const assistantContent: Anthropic.ContentBlock[] = [];
    const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        const result = await executeTool(block.name, block.input as Record<string, unknown>, auth);

        assistantContent.push(block);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result
        });
      } else if (block.type === 'text') {
        assistantContent.push(block);
      }
    }

    messages.push({
      role: 'assistant' as const,
      content: assistantContent
    });

    messages.push({
      role: 'user' as const,
      content: toolResults
    });

    response = await withRetry(
      () => anthropic.messages.create({
        model: config.anthropic.model,
        max_tokens: config.anthropic.maxTokens,
        system: systemPrompt,
        tools: tools as Anthropic.Tool[],
        messages
      }),
      { maxRetries: 2, baseDelayMs: 1000, shouldRetry: shouldRetryAnthropic }
    );
  }

  // Warn if tool loop hit the limit
  const toolLoopWarning = loopCount >= maxLoops && response.stop_reason === 'tool_use'
    ? '\n\n> **Note:** This response required more tool calls than allowed in a single turn and may be incomplete. Try asking a follow-up to continue.'
    : '';

  let finalResponse = '';
  const finalContent: Anthropic.ContentBlock[] = [];

  for (const block of response.content) {
    if (block.type === 'text') {
      finalResponse += block.text;
      finalContent.push(block);
    }
  }

  messages.push({
    role: 'assistant' as const,
    content: finalContent
  });

  return new Response(
    JSON.stringify({
      response: finalResponse + toolLoopWarning,
      history: messages
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
