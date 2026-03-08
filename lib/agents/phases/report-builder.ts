// Deterministic report builder — no Claude call, pure TypeScript.
// Formats PlanOutput into 5 ReportSections matching the existing ReportOutput shape.

import type { PlanOutput, ReportOutput, ReportSection } from '../types';
import { parseQuantity } from './plan';

interface ReportBuildInput {
  plan: PlanOutput;
  projectDescription: string;
  location: { city: string; state: string };
  preferences: {
    budgetLevel: string;
    experienceLevel: string;
    timeframe?: string;
  };
}

export function buildReport(input: ReportBuildInput): ReportOutput {
  const { plan, projectDescription, location, preferences } = input;

  const sections: ReportSection[] = [
    buildOverviewSection(plan, projectDescription, location, preferences),
    buildPlanSection(plan),
    buildMaterialsSection(plan),
    buildCostSection(plan),
    buildResourcesSection(plan, preferences),
  ];

  const totalCost = plan.totalEstimate - plan.savingsFromInventory;

  return {
    id: '',
    title: `${projectDescription} — Project Plan`,
    sections,
    summary: buildSummary(plan, projectDescription, totalCost),
    totalCost,
    generatedAt: new Date().toISOString(),
  };
}

// ── Section Builders ─────────────────────────────────────────────────────────

function buildOverviewSection(
  plan: PlanOutput,
  projectDescription: string,
  location: { city: string; state: string },
  preferences: { budgetLevel: string; experienceLevel: string; timeframe?: string },
): ReportSection {
  let content = `### Project Summary\n`;
  content += `${plan.approach}\n\n`;

  content += `### Applicable Codes & Permits\n`;
  content += `**Building Codes:** ${plan.buildingCodes}\n\n`;
  content += `**Local Codes (${location.city}, ${location.state}):** ${plan.localCodes}\n\n`;
  content += `**Permits:** ${plan.permitRequirements}\n\n`;

  if (plan.proRequired) {
    content += `> **Professional Required:** ${plan.proRequiredReason || 'This project requires licensed professional work.'}\n\n`;
  }

  content += `### Safety Warnings\n`;
  if (plan.safetyWarnings.length > 0) {
    content += plan.safetyWarnings.map(w => `- ${w}`).join('\n') + '\n\n';
  } else {
    content += `- Follow standard safety practices for this type of project.\n\n`;
  }

  content += `### Project Details\n`;
  content += `- **Skill Level:** ${plan.skillLevel}\n`;
  content += `- **Estimated Duration:** ${plan.estimatedDuration}\n`;
  content += `- **Budget Tier:** ${preferences.budgetLevel}\n`;
  if (preferences.timeframe) {
    content += `- **Your Timeframe:** ${preferences.timeframe}\n`;
  }

  return {
    id: 'overview',
    title: 'Project Overview',
    content,
    order: 1,
    type: 'overview',
  };
}

function buildPlanSection(plan: PlanOutput): ReportSection {
  let content = '';

  const sortedSteps = [...plan.steps].sort((a, b) => a.order - b.order);
  for (const step of sortedSteps) {
    content += `### Step ${step.order}: ${step.title}\n`;
    content += `${step.description}\n\n`;
    content += `- **Time:** ${step.estimatedTime}\n`;
    content += `- **Skill Level:** ${step.skillLevel}\n`;

    if (step.safetyNotes && step.safetyNotes.length > 0) {
      content += `- **Safety:** ${step.safetyNotes.join('; ')}\n`;
    }
    if (step.inspectionRequired) {
      content += `- **Inspection Required** — Schedule before proceeding to next step.\n`;
    }

    content += '\n';
  }

  return {
    id: 'plan',
    title: 'Step-by-Step Plan',
    content,
    order: 2,
    type: 'plan',
  };
}

function buildMaterialsSection(plan: PlanOutput): ReportSection {
  const ownedNames = new Set(plan.ownedItems.map(o => o.materialName.toLowerCase()));

  // Group materials by category
  const materialsByCategory: Record<string, typeof plan.materials> = {};
  for (const m of plan.materials) {
    if (!materialsByCategory[m.category]) materialsByCategory[m.category] = [];
    materialsByCategory[m.category].push(m);
  }

  let content = '';
  for (const [category, items] of Object.entries(materialsByCategory)) {
    content += `### ${capitalize(category)}\n`;
    for (const m of items) {
      const isOwned = ownedNames.has(m.name.toLowerCase());
      const qty = m.quantity;
      const price = `$${m.estimatedPrice.toFixed(2)}`;
      const reqTag = m.required ? '' : ' (optional)';
      const notes = m.notes ? ` — ${m.notes}` : '';

      if (isOwned) {
        content += `- ~~**${m.name}** — ${qty} @ ${price}${reqTag}${notes}~~ (already owned)\n`;
      } else {
        content += `- **${m.name}** — ${qty} @ ${price}${reqTag}${notes}\n`;
      }
    }
    content += '\n';
  }

  // Tools sub-header
  content += `### Tools\n`;
  const requiredTools = plan.tools.filter(t => t.required);
  const optionalTools = plan.tools.filter(t => !t.required);

  if (requiredTools.length > 0) {
    content += `**Required:**\n`;
    for (const t of requiredTools) {
      const isOwned = ownedNames.has(t.name.toLowerCase());
      const price = t.estimatedPrice ? ` ~$${t.estimatedPrice.toFixed(2)}` : '';
      const notes = t.notes ? ` — ${t.notes}` : '';
      if (isOwned) {
        content += `- ~~**${t.name}**${price}${notes}~~ (already owned)\n`;
      } else {
        content += `- **${t.name}**${price}${notes}\n`;
      }
    }
    content += '\n';
  }

  if (optionalTools.length > 0) {
    content += `**Nice-to-Have:**\n`;
    for (const t of optionalTools) {
      const isOwned = ownedNames.has(t.name.toLowerCase());
      const price = t.estimatedPrice ? ` ~$${t.estimatedPrice.toFixed(2)}` : '';
      const notes = t.notes ? ` — ${t.notes}` : '';
      if (isOwned) {
        content += `- ~~**${t.name}**${price}${notes}~~ (already owned)\n`;
      } else {
        content += `- **${t.name}**${price}${notes}\n`;
      }
    }
    content += '\n';
  }

  return {
    id: 'materials',
    title: 'Materials & Tools',
    content,
    order: 3,
    type: 'materials',
  };
}

function buildCostSection(plan: PlanOutput): ReportSection {
  // Calculate subtotals
  const materialsSubtotal = plan.materials.reduce(
    (sum, m) => sum + m.estimatedPrice * parseQuantity(m.quantity),
    0,
  );
  const toolsSubtotal = plan.tools
    .filter(t => t.required && t.estimatedPrice)
    .reduce((sum, t) => sum + (t.estimatedPrice || 0), 0);
  const subtotal = materialsSubtotal + toolsSubtotal;
  const contingency = subtotal * 0.1;
  const grandTotal = subtotal + contingency - plan.savingsFromInventory;

  let content = `### Cost Breakdown\n`;
  content += `- **Materials Subtotal:** $${materialsSubtotal.toFixed(2)}\n`;
  content += `- **Tools Subtotal:** $${toolsSubtotal.toFixed(2)}\n`;
  if (plan.savingsFromInventory > 0) {
    content += `- **Savings from Your Inventory:** -$${plan.savingsFromInventory.toFixed(2)}\n`;
  }
  content += `- **Contingency (10%):** $${contingency.toFixed(2)}\n`;
  content += `- **Grand Total:** $${grandTotal.toFixed(2)}\n`;
  content += '\n';

  // Per-category breakdown
  content += `### Category Breakdown\n`;
  const categoryTotals: Record<string, number> = {};
  for (const m of plan.materials) {
    const cat = m.category;
    const total = m.estimatedPrice * parseQuantity(m.quantity);
    categoryTotals[cat] = (categoryTotals[cat] || 0) + total;
  }
  for (const [cat, total] of Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])) {
    content += `- **${capitalize(cat)}:** $${total.toFixed(2)}\n`;
  }

  return {
    id: 'cost',
    title: 'Cost Estimate',
    content,
    order: 4,
    type: 'cost',
  };
}

function buildResourcesSection(
  plan: PlanOutput,
  preferences: { experienceLevel: string; timeframe?: string },
): ReportSection {
  let content = '';

  // Tutorial videos
  if (plan.videos.length > 0) {
    content += `### Tutorial Videos\n`;
    for (const v of plan.videos) {
      content += `- [${v.title}](${v.url}) by ${v.channel} — ${v.description}\n`;
    }
    content += '\n';
  }

  // Timeline
  content += `### Suggested Timeline\n`;
  content += `**Estimated Duration:** ${plan.estimatedDuration}\n\n`;

  const totalSteps = plan.steps.length;
  if (totalSteps > 0) {
    // Rough weekend breakdown
    const stepsPerWeekend = Math.max(2, Math.ceil(totalSteps / 4));
    let weekendNum = 1;
    for (let i = 0; i < totalSteps; i += stepsPerWeekend) {
      const batch = plan.steps.slice(i, i + stepsPerWeekend);
      const stepNames = batch.map(s => s.title).join(', ');
      content += `- **Weekend ${weekendNum}:** ${stepNames}\n`;
      weekendNum++;
    }
    content += '\n';
  }

  // Tips
  content += `### Pro Tips\n`;
  if (plan.bestPractices) {
    content += `${plan.bestPractices}\n\n`;
  }
  if (plan.commonPitfalls) {
    content += `### Common Mistakes to Avoid\n`;
    content += `${plan.commonPitfalls}\n\n`;
  }

  if (plan.alternativeApproaches) {
    content += `### Alternative Approaches\n`;
    content += `${plan.alternativeApproaches}\n`;
  }

  return {
    id: 'resources',
    title: 'Resources & Timeline',
    content,
    order: 5,
    type: 'resources',
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildSummary(plan: PlanOutput, projectDescription: string, totalCost: number): string {
  return `This plan covers your ${projectDescription} project with ${plan.steps.length} steps, ` +
    `${plan.materials.length} materials, and ${plan.tools.length} tools. ` +
    `Estimated cost: $${totalCost.toFixed(2)}. ` +
    `Skill level: ${plan.skillLevel}. Duration: ${plan.estimatedDuration}.` +
    (plan.savingsFromInventory > 0
      ? ` You save $${plan.savingsFromInventory.toFixed(2)} from items you already own.`
      : '');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
