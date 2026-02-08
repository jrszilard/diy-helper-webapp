// Stream event types for SSE responses

export interface ProgressEvent {
  type: 'progress';
  step: string;
  message: string;
  icon: string;
}

export interface TextEvent {
  type: 'text';
  content: string;
}

export interface ToolResultEvent {
  type: 'tool_result';
  toolName: string;
  result: unknown;
}

export interface DoneEvent {
  type: 'done';
  conversationId?: string | null;
}

export interface ErrorEvent {
  type: 'error';
  content: string;
}

export type StreamEvent = ProgressEvent | TextEvent | ToolResultEvent | DoneEvent | ErrorEvent;

// Tool name union type
export type ToolName =
  | 'search_building_codes'
  | 'search_local_codes'
  | 'search_project_videos'
  | 'extract_materials_list'
  | 'search_local_stores'
  | 'check_user_inventory'
  | 'detect_owned_items'
  | 'search_products'
  | 'calculate_wire_size'
  | 'compare_store_prices'
  | 'web_search'
  | 'web_fetch';
