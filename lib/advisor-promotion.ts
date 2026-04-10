// Promotion pipeline: correction_queue → rubric_examples.
// Expert corrections auto-promote; user flags require multiple reports or manual review.
//
// Research basis: Asawa et al. (2025) arXiv:2510.02453
// §3: Filter by correlation — retain only cases where feedback improved outputs.

import { RUBRIC_VERSION } from '@/lib/advisor-rubric';

interface AutoPromoteInput {
  source: string;
  reporterRole: string;
  expertSpecialties: string[];
  category: string;
}

interface AutoPromoteResult {
  autoPromote: boolean;
  weight: number;
}

export function shouldAutoPromote(input: AutoPromoteInput): AutoPromoteResult {
  if (input.source === 'expert_correction' && input.reporterRole === 'expert') {
    const inSpecialty = input.expertSpecialties.some(
      s => s === input.category || s === 'general_contractor',
    );
    return {
      autoPromote: true,
      weight: inSpecialty ? 0.9 : 0.7,
    };
  }

  if (input.source === 'canary_failure') {
    return { autoPromote: true, weight: 1.0 };
  }

  return { autoPromote: false, weight: 0.5 };
}

interface StructureCorrectionInput {
  userQuestion: string;
  aiResponse: string;
  correctionText: string;
  category: string;
  severity: 'critical' | 'warning';
  rubricItemsFailed: number[];
}

interface RubricExampleRow {
  user_question: string;
  bad_response: string;
  good_response: string;
  rubric_items_failed: number[];
  severity: 'critical' | 'warning';
  category: string;
  rubric_version: number;
}

export function structureCorrection(input: StructureCorrectionInput): RubricExampleRow {
  return {
    user_question: input.userQuestion,
    bad_response: input.aiResponse,
    good_response: input.correctionText,
    rubric_items_failed: input.rubricItemsFailed,
    severity: input.severity,
    category: input.category,
    rubric_version: RUBRIC_VERSION,
  };
}
