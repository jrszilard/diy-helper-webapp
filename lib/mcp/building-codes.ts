// Building Codes MCP Logic
import codesData from './codes.json';

export interface CodeSection {
  id: string;
  code_ref: string;
  title: string;
  category: string;
  jurisdiction: string;
  summary: string;
  source: string;
  common_questions: string[];
  notes?: string;
  related_codes?: string[];
}

export class BuildingCodesDatabase {
  private codes: CodeSection[];

  constructor() {
    this.codes = codesData as CodeSection[];
  }

  async search(
    query: string,
    jurisdiction: string = "National",
    codeType?: string,
    topK: number = 3
  ): Promise<CodeSection[]> {
    const queryLower = query.toLowerCase();
    const results: Array<CodeSection & { score: number }> = [];

    for (const code of this.codes) {
      // Filter by jurisdiction
      if (code.jurisdiction !== jurisdiction) continue;

      // Filter by code type if specified
      if (codeType && code.category !== codeType) continue;

      // Simple keyword matching
      const searchableText = `${code.title} ${code.summary} ${code.common_questions.join(' ')}`.toLowerCase();

      let score = 0;
      for (const word of queryLower.split(' ')) {
        if (searchableText.includes(word)) {
          score += 1;
        }
      }

      if (score > 0) {
        results.push({ ...code, score });
      }
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, topK);
  }

  async getSection(
    sectionReference: string,
    jurisdiction: string = "National"
  ): Promise<CodeSection | null> {
    return this.codes.find(
      (code) =>
        code.code_ref === sectionReference &&
        code.jurisdiction === jurisdiction
    ) || null;
  }
}

// Export singleton instance
export const buildingCodesDb = new BuildingCodesDatabase();