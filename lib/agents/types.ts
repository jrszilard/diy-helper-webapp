// Agent Delegation System — Core Types

// ── Phase Names ───────────────────────────────────────────────────────────────

export type AgentPhase = 'research' | 'design' | 'sourcing' | 'report';
export type AgentRunStatus = 'pending' | 'running' | 'completed' | 'error' | 'cancelled';
export type PhaseStatus = 'pending' | 'running' | 'completed' | 'error' | 'skipped';

// ── Agent Context (accumulates data through the pipeline) ─────────────────────

export interface AgentContext {
  // Input (set at run creation)
  projectDescription: string;
  location: {
    city: string;
    state: string;
    zipCode?: string;
  };
  projectId?: string;
  userId: string;
  preferences: {
    budgetLevel: 'budget' | 'mid-range' | 'premium';
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
    timeframe?: string;
  };

  // Phase 1 output: Research
  research?: ResearchOutput;

  // Phase 2 output: Design
  design?: DesignOutput;

  // Phase 3 output: Sourcing
  sourcing?: SourcingOutput;

  // Phase 4 output: Report
  report?: ReportOutput;
}

// ── Phase Outputs ─────────────────────────────────────────────────────────────

export interface ResearchOutput {
  buildingCodes: string;
  localCodes: string;
  permitRequirements: string;
  bestPractices: string;
  commonPitfalls: string;
  safetyWarnings: string[];
  proRequired: boolean;
  proRequiredReason?: string;
}

export interface DesignOutput {
  approach: string;
  steps: ProjectStep[];
  materials: DesignMaterial[];
  tools: DesignTool[];
  estimatedDuration: string;
  skillLevel: string;
  videos: DesignVideo[];
  alternativeApproaches?: string;
}

export interface SourcingOutput {
  pricedMaterials: PricedMaterial[];
  ownedItems: OwnedItem[];
  storeSummary: StoreSummary[];
  totalEstimate: number;
  savingsFromInventory: number;
}

export interface ReportOutput {
  id: string;
  title: string;
  sections: ReportSection[];
  summary: string;
  totalCost: number;
  generatedAt: string;
}

// ── Supporting Types ──────────────────────────────────────────────────────────

export interface ProjectStep {
  order: number;
  title: string;
  description: string;
  estimatedTime: string;
  skillLevel: string;
  safetyNotes?: string[];
  inspectionRequired?: boolean;
}

export interface DesignMaterial {
  name: string;
  quantity: string;
  category: string;
  estimatedPrice: number;
  required: boolean;
  notes?: string;
}

export interface DesignTool {
  name: string;
  category: string;
  required: boolean;
  estimatedPrice?: number;
  notes?: string;
}

export interface DesignVideo {
  title: string;
  url: string;
  channel: string;
  description: string;
}

export interface PricedMaterial {
  name: string;
  quantity: string;
  category: string;
  estimatedPrice: number;
  bestPrice?: number;
  bestStore?: string;
  productUrl?: string;
  required: boolean;
  priceConfidence: 'high' | 'medium' | 'low';
}

export interface OwnedItem {
  materialName: string;
  ownedAs: string;
  category: string;
}

export interface StoreSummary {
  store: string;
  itemCount: number;
  totalPrice: number;
}

export interface ReportSection {
  id: string;
  title: string;
  content: string; // markdown
  order: number;
  type: 'overview' | 'codes' | 'safety' | 'plan' | 'materials' | 'tools' |
        'cost' | 'shopping' | 'videos' | 'timeline' | 'resources';
}

// ── Token Usage ──────────────────────────────────────────────────────────────

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

// ── SSE Progress Events ───────────────────────────────────────────────────────

export interface AgentProgressEvent {
  type: 'agent_progress';
  runId: string;
  phase: AgentPhase;
  phaseStatus: 'started' | 'tool_call' | 'thinking' | 'completed' | 'error';
  message: string;
  detail?: string;
  overallProgress: number; // 0-100
}

export interface AgentCompleteEvent {
  type: 'agent_complete';
  runId: string;
  reportId: string;
  summary: string;
  totalCost: number;
  report?: ProjectReportRecord; // included for anon users who can't fetch separately
  apiCost?: { totalTokens: number; estimatedCost: number };
}

export interface AgentErrorEvent {
  type: 'agent_error';
  runId: string;
  phase: AgentPhase;
  message: string;
  recoverable: boolean;
}

export interface AgentHeartbeatEvent {
  type: 'heartbeat';
}

export interface AgentDoneEvent {
  type: 'done';
}

export type AgentStreamEvent =
  | AgentProgressEvent
  | AgentCompleteEvent
  | AgentErrorEvent
  | AgentHeartbeatEvent
  | AgentDoneEvent;

// ── Tool Call Log Entry ───────────────────────────────────────────────────────

export interface ToolCallLog {
  tool: string;
  input: Record<string, unknown>;
  durationMs: number;
  success: boolean;
  error?: string;
}

// ── API Request/Response Types ────────────────────────────────────────────────

export interface StartAgentRunRequest {
  projectDescription: string;
  city: string;
  state: string;
  zipCode?: string;
  budgetLevel?: 'budget' | 'mid-range' | 'premium';
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  timeframe?: string;
  projectId?: string;
}

export interface AgentRunRecord {
  id: string;
  user_id: string;
  project_id: string | null;
  project_description: string;
  location_city: string | null;
  location_state: string | null;
  location_zip: string | null;
  budget_level: string | null;
  experience_level: string | null;
  timeframe: string | null;
  status: AgentRunStatus;
  current_phase: AgentPhase | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentPhaseRecord {
  id: string;
  run_id: string;
  phase: AgentPhase;
  status: PhaseStatus;
  input_data: unknown;
  output_data: unknown;
  tool_calls: ToolCallLog[];
  error_message: string | null;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface ProjectReportRecord {
  id: string;
  run_id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  sections: ReportSection[];
  summary: string | null;
  version: number;
  total_cost: number | null;
  share_token: string | null;
  share_enabled: boolean;
  created_at: string;
  updated_at: string;
}
