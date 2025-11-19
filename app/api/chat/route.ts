import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const tools = [
  {
    name: "search_building_codes",
    description: "Search building codes database for electrical, plumbing, structural, HVAC, and safety codes",
    input_schema: {
      type: "object",
      properties: {
        query: { 
          type: "string",
          description: "Search query for building codes"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "search_products",
    description: "Search for construction materials and products with pricing",
    input_schema: {
      type: "object",
      properties: {
        query: { 
          type: "string",
          description: "Product search query"
        },
        category: {
          type: "string",
          description: "Product category (electrical, plumbing, lumber, etc.)"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "calculate_wire_size",
    description: "Calculate required wire gauge for electrical circuits",
    input_schema: {
      type: "object",
      properties: {
        amperage: { type: "number" },
        distance: { type: "number" },
        voltage: { type: "number" }
      },
      required: ["amperage", "distance"]
    }
  }
];

async function executeTool(toolName: string, toolInput: any): Promise<string> {
  if (toolName === "search_building_codes") {
    return "**Building Code Results:**\n\nKitchen countertop receptacles must be installed so that no point along the wall line is more than 24 inches from a receptacle outlet (NEC 210.52(C)(1)).\n\nGFCI protection is required for all 125-volt, 15- and 20-ampere receptacles in garages (NEC 210.8(A)(2)).\n\nSource: National Electrical Code 2023";
  }
  
  if (toolName === "search_products") {
    return "**Product Results:**\n\n1. Southwire 250 ft. 12/2 Solid Romex NM-B Wire\n   - Price: $87.43\n   - Rating: 4.7/5 (2,340 reviews)\n   - In Stock\n\n2. Leviton 20 Amp GFCI Outlet, White\n   - Price: $18.97\n   - Rating: 4.6/5 (1,892 reviews)\n   - In Stock";
  }
  
  if (toolName === "calculate_wire_size") {
    const { amperage, distance } = toolInput;
    if (amperage <= 15 && distance <= 50) {
      return "For a 15-amp circuit up to 50 feet: Use 14 AWG wire (per NEC 210.19)";
    } else if (amperage <= 20 && distance <= 50) {
      return "For a 20-amp circuit up to 50 feet: Use 12 AWG wire (per NEC 210.19)";
    } else {
      return "For a 30-amp circuit or longer runs: Use 10 AWG wire (per NEC 210.19)";
    }
  }
  
  return "Tool not implemented yet.";
}

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