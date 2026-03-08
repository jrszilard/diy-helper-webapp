// Pre-composed message templates — no API calls needed

export const greeting = `Hey there! I'm your DIY project planner. I'll walk you through a few quick questions, then build you a complete plan with building codes, materials lists, and local store prices.

**What kind of project are you working on?** Pick one below, or just type a description.`;

export function projectConfirmation(name: string): string {
  return `Great choice — **${name}**! Let me gather a few details so I can tailor the plan to your situation.`;
}

export function scopePrompt(category: string): string {
  const categoryPrompts: Record<string, string> = {
    electrical: "What's the scope? For example: which room, how many fixtures, any existing wiring you're working with?",
    plumbing: "Tell me a bit more — which fixture, what room, and anything specific about your current setup?",
    flooring: "What room is this for, and roughly how big is the space? (e.g., 10x12 bathroom, 15x20 living room)",
    outdoor: "How big are you thinking? Give me rough dimensions and any details about your yard or existing setup.",
    structural: "Where's the damage or where do you want to work? How big is the area you're dealing with?",
    painting: "Which room(s) and roughly how big? Any special conditions like textured walls or dark existing colors?",
  };
  return categoryPrompts[category] || "Tell me more about the scope — dimensions, room, and any details that would help me plan this out.";
}

export const locationPrompt = "Where is this project located? I need your **city and state** to look up the right building codes and find store prices near you.";

export const toolsPrompt = `Do you already have any **tools or materials** for this project?

This helps me exclude items you own from the shopping list and cost estimate. List anything relevant — like a drill, circular saw, leftover tile, etc.`;

export const experiencePrompt = "How much DIY experience do you have? This helps me adjust the level of detail in your plan.";

export const budgetPrompt = "What's your budget approach for this project?";

export const summaryIntro = "Here's your project summary. Review the details and tap **Build My Plan** when you're ready — I'll research codes, design a step-by-step plan, find materials at local stores, and put together a full report.";

export const pipelineStarted = "Building your plan now! This takes a couple minutes — I'm researching codes, designing your project plan, and sourcing materials at local stores.";

export function freeformConfirmation(projectType: string, description: string): string {
  return `Got it — sounds like a **${projectType}** project. "${description}"

Let me gather a few more details to build you a great plan.`;
}
