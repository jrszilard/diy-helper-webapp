import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { mcpTools } from '@/lib/mcp/tools';
import { executeTool } from '@/lib/mcp/executor';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    // Add user message to history
    const messages = [
      ...history,
      {
        role: 'user' as const,
        content: message
      }
    ];

    // Call Claude with tools
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      tools: mcpTools as any,
      messages
    });

    // Handle tool use
    while (response.stop_reason === 'tool_use') {
      const assistantContent: any[] = [];
      const toolResults: any[] = [];

      for (const block of response.content) {
        if (block.type === 'tool_use') {
          console.log(`🔧 Tool called: ${block.name}`);

          // Execute the tool
          const result = await executeTool(block.name, block.input as Record<string, any>);

          // Store tool use
          assistantContent.push({
            type: 'tool_use',
            id: block.id,
            name: block.name,
            input: block.input
          });

          // Store tool result
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result
          });
        } else if (block.type === 'text') {
          assistantContent.push({
            type: 'text',
            text: block.text
          });
        }
      }

      // Add assistant response to messages
      messages.push({
        role: 'assistant' as const,
        content: assistantContent
      });

      // Add tool results to messages
      messages.push({
        role: 'user' as const,
        content: toolResults
      });

      // Continue conversation
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        tools: mcpTools as any,
        messages
      });
    }

    // Extract final response
    let finalResponse = '';
    const finalContent: any[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        finalResponse += block.text;
        finalContent.push({
          type: 'text',
          text: block.text
        });
      }
    }

    // Add final response to history
    messages.push({
      role: 'assistant' as const,
      content: finalContent
    });

    return NextResponse.json({
      response: finalResponse,
      history: messages
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}