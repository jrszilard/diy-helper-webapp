// DIY safety review rubric for the custom advisor loop.
// This is the domain-specific "moat" — as we collect real DIY corrections,
// they get injected as few-shot examples here.
//
// Research basis: Asawa et al. (2025) "How to Train Your Advisor" arXiv:2510.02453
// §7: Effective rubrics decompose into binary sub-criteria; concrete > abstract.
// §9: Version-control rubrics; older versions may have trained advisors.

export const RUBRIC_VERSION = 1;

const RUBRIC_ITEM_NAMES: Record<number, string> = {
  1: 'Professional Referral',
  2: 'Code Compliance',
  3: 'Safety Warnings',
  4: 'Sequence Accuracy',
  5: 'Material & Specification',
  6: 'Scope Honesty',
};

export interface FewShotExample {
  userQuestion: string;
  badResponse: string;
  goodResponse: string;
  rubricItemsFailed: number[];
  severity: 'critical' | 'warning';
}

interface BuildReviewPromptParams {
  userQuestion: string;
  draftResponse: string;
  safetyKeywordsDetected: boolean;
  safetyKeywordsMatched: string[];
  fewShotExamples?: FewShotExample[];
}

export function buildReviewPrompt(params: BuildReviewPromptParams): string {
  const {
    userQuestion,
    draftResponse,
    safetyKeywordsDetected,
    safetyKeywordsMatched,
    fewShotExamples,
  } = params;

  const safetyFlag = safetyKeywordsDetected
    ? `\n\n**ELEVATED SAFETY CONCERN:** The user's question involves safety-critical topics: ${safetyKeywordsMatched.join(', ')}. Apply extra scrutiny to the safety checklist items below.`
    : '';

  let fewShotSection = '';
  if (fewShotExamples && fewShotExamples.length > 0) {
    const examples = fewShotExamples.map((ex, i) => {
      const failedNames = ex.rubricItemsFailed
        .map(n => `${n}. ${RUBRIC_ITEM_NAMES[n] || 'Unknown'}`)
        .join(', ');
      return `**Example ${i + 1}** [${ex.severity}] — Failed: ${failedNames}
- Question: "${ex.userQuestion}"
- BAD: "${ex.badResponse}"
- GOOD: "${ex.goodResponse}"`;
    }).join('\n\n');

    fewShotSection = `\n\n## PAST MISTAKES IN THIS CATEGORY

The following are real examples of incorrect DIY advice. Watch for similar patterns:

${examples}`;
  }

  return `You are a DIY safety reviewer. Your job is to evaluate a draft response to a homeowner's question and ensure it is safe, accurate, and responsible.
${safetyFlag}

## USER QUESTION
${userQuestion}

## DRAFT RESPONSE
${draftResponse}
${fewShotSection}

## SAFETY REVIEW RUBRIC

Evaluate the draft against each checklist item. For each, note PASS or FAIL with a brief reason.

### 1. Professional Referral Check
- Does the response recommend consulting a licensed professional when the work requires permits, involves life-safety systems (electrical, gas, structural), or exceeds typical DIY skill level?
- FAIL if: The response encourages the user to do work that legally requires a licensed electrician, plumber, or structural engineer without mentioning this requirement.

### 2. Code Compliance
- Does the response reference relevant building codes (NEC, IRC, local amendments) when applicable?
- Does it avoid stating specific code requirements with false confidence?
- FAIL if: The response cites a specific code section incorrectly, or gives code-dependent advice without noting that local codes may differ.

### 3. Safety Warnings
- Are appropriate safety warnings included (PPE, power disconnection, gas shutoff, ventilation)?
- Are warnings placed BEFORE the dangerous step, not after?
- FAIL if: A step involves electrocution, gas exposure, fall, or chemical hazard risk without a preceding warning.

### 4. Sequence Accuracy
- Are the steps in the correct order? Would following them as written produce a safe, working result?
- FAIL if: Steps are out of order in a way that could cause damage or injury (e.g., reconnecting power before securing connections).

### 5. Material & Specification Accuracy
- Are wire gauges, pipe sizes, fastener types, and material specifications correct for the described application?
- FAIL if: The response recommends a material or specification that is wrong for the use case (e.g., 14-gauge wire on a 20-amp circuit).

### 6. Scope Honesty
- Does the response acknowledge uncertainty rather than guessing?
- Does it avoid hallucinating product names, model numbers, or specific prices?
- FAIL if: The response presents uncertain information as fact.

## VERDICT FORMAT

Respond with ONLY a JSON object in this exact format:
\`\`\`json
{
  "verdict": "APPROVE" | "REVISE",
  "confidence": 0.0-1.0,
  "issues": [
    {
      "rubricItem": 1-6,
      "severity": "critical" | "warning",
      "finding": "brief description of the issue",
      "suggestedFix": "how to fix it"
    }
  ],
  "revisedResponse": "full corrected response text (only if verdict is REVISE)"
}
\`\`\`

If all checklist items PASS, return verdict "APPROVE" with an empty issues array and no revisedResponse.
If any item FAILs, return verdict "REVISE" with the issues and a corrected response.`;
}
