import { NextRequest, NextResponse } from 'next/server';

// Import Anthropic (make sure it's installed)
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Define tools (simplified for now)
const tools = [
  {
    name: "search_building_codes",
    description: "Search building codes by query",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" }
      },
      required: ["query"]
    }
  }
];

// Simple tool executor
async function executeTool(toolName: string, toolInput: any): Promise<string> {
  if (toolName === "search_building_codes") {
    return "**Building Code Result:**\n\nKitchen outlets must be spaced no more than 4 feet apart per NEC 210.52(C)(1).\n\nSource: National Electrical Code 2023";
  }
  return "Tool not implemented yet.";
}

export async function POST(req: NextRequest) {
  try {
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY not set');
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { message, history = [] } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log('Received message:', message);

    // Build messages array
    const messages = [
      ...history,
      {
        role: 'user' as const,
        content: message
      }
    ];

    // Call Claude
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      tools: tools as any,
      messages: messages
    });

    console.log('Claude response:', response);

    // Handle tool use
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

// Handle OPTIONS for CORS preflight
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
