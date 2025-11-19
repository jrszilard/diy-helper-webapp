import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { searchBuildingCodes } from '@/lib/mcp/building-codes';
import { searchProducts, calculateMaterials } from '@/lib/mcp/material-specs';
import { tools } from '@/lib/mcp/tools';
import { executeTool } from '@/lib/mcp/executor';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY not set');
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { message, history = [] } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log('Received message:', message);

    const messages = [
      ...history,
      {
        role: 'user' as const,
        content: message
      }
    ];

    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      tools: tools as any,
      messages: messages
    });

    console.log('Claude response received');

    while (response.stop_reason === 'tool_use') {
      const assistantContent: any[] = [];
      const toolResults: any[] = [];

      for (const block of response.content) {
        if (block.type === 'tool_use') {
          console.log(`Tool called: ${block.name}`);
          
          const result = await executeTool(block.name, block.input);

          assistantContent.push({
            type: 'tool_use',
            id: block.id,
            name: block.name,
            input: block.input
          });

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

      messages.push({
        role: 'assistant' as const,
        content: assistantContent
      });

      messages.push({
        role: 'user' as const,
        content: toolResults
      });

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        tools: tools as any,
        messages: messages
      });
    }

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

    messages.push({
      role: 'assistant' as const,
      content: finalContent
    });

    return NextResponse.json({
      response: finalResponse,
      history: messages
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process message',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
