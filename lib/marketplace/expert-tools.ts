/**
 * Expert tools for licensing gap detection, code lookup prompts,
 * and draft answer generation.
 */

export interface LicensingGapResult {
  hasGap: boolean;
  questionTrade?: string;
  noLicensesOnFile?: boolean;
}

export interface LicensingRule {
  state: string;
  license_type: string | null;
  homeowner_exemption: boolean;
  homeowner_exemption_notes: string | null;
}

export interface LicensingAdvisoryInput {
  hasGap: boolean;
  questionTrade: string;
  licensingRule: LicensingRule | null;
}

export interface ProjectContext {
  projectSummary?: string;
  [key: string]: unknown;
}

/**
 * Detect whether an expert has a licensing gap for a given trade category.
 * Returns gap info including whether the expert has any licenses on file.
 */
export function detectLicensingGap(
  expertLicensedTrades: string[],
  questionTradeCategory: string,
): LicensingGapResult {
  if (expertLicensedTrades.length === 0) {
    return {
      hasGap: true,
      questionTrade: questionTradeCategory,
      noLicensesOnFile: true,
    };
  }

  const hasMatch = expertLicensedTrades.some(
    (trade) => trade.toLowerCase() === questionTradeCategory.toLowerCase(),
  );

  if (hasMatch) {
    return { hasGap: false };
  }

  return {
    hasGap: true,
    questionTrade: questionTradeCategory,
  };
}

/**
 * Build a licensing advisory message based on the gap detection result
 * and an optional licensing rule from the database.
 */
export function buildLicensingAdvisory(input: LicensingAdvisoryInput): string {
  const { questionTrade, licensingRule } = input;

  if (!licensingRule) {
    return (
      `Licensing requirements vary by state and locality for ${questionTrade} work. ` +
      `Check with your local building department to confirm whether a licensed professional ` +
      `is required for this type of work in your area.`
    );
  }

  const { state, license_type, homeowner_exemption, homeowner_exemption_notes } = licensingRule;

  let advisory = `In ${state}, ${questionTrade} work typically requires a ${license_type}.`;

  if (homeowner_exemption && homeowner_exemption_notes) {
    advisory += ` However, there is a homeowner exemption: ${homeowner_exemption_notes}.`;
  } else if (homeowner_exemption) {
    advisory += ` A homeowner exemption may apply for work on your own residence.`;
  }

  return advisory;
}

/**
 * Build a prompt for looking up building codes relevant to a topic and location.
 */
export function buildCodeLookupPrompt(
  topic: string,
  state: string,
  city?: string,
): string {
  const location = city ? `${city}, ${state}` : state;

  return (
    `Look up the current building codes and permit requirements for "${topic}" in ${location}.\n\n` +
    `Include:\n` +
    `- Applicable building code sections (IRC/IBC, NEC, UPC, etc.)\n` +
    `- Permit requirements for this type of work in ${state}\n` +
    `- Any state or local amendments that may apply${city ? ` in ${city}` : ''}\n` +
    `- Common inspection checkpoints for this work\n\n` +
    `Focus on requirements relevant to residential DIY homeowners.`
  );
}

/**
 * Build a prompt for drafting an expert answer to a homeowner question.
 */
export function buildDraftAnswerPrompt(
  questionText: string,
  projectContext?: ProjectContext,
): string {
  let prompt =
    `Draft a helpful, accurate answer to the following DIY homeowner question:\n\n` +
    `Question: ${questionText}\n`;

  if (projectContext?.projectSummary) {
    prompt +=
      `\nProject context: ${projectContext.projectSummary}\n`;
  }

  prompt +=
    `\nGuidelines:\n` +
    `- Provide clear, step-by-step guidance where appropriate\n` +
    `- Highlight any safety considerations or code requirements\n` +
    `- Note when professional help should be sought\n` +
    `- Use plain language accessible to DIY beginners`;

  return prompt;
}
