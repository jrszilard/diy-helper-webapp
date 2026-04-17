import { ExtractedMaterials, Video } from '@/types';

// Module-scope regex patterns (compiled once)
const INVENTORY_PATTERN = /---INVENTORY_UPDATE---\n([\s\S]*?)\n---END_INVENTORY_UPDATE---/;
const MATERIALS_PATTERN = /---MATERIALS_DATA---([\s\S]*?)---END_MATERIALS_DATA---/;
const VIDEO_PATTERN = /---VIDEO_DATA---\n([\s\S]*?)\n---END_VIDEO_DATA---/;

const CLEAN_PATTERNS = [
  /---MATERIALS_DATA---[\s\S]*?---END_MATERIALS_DATA---/g,
  /---INVENTORY_UPDATE---[\s\S]*?---END_INVENTORY_UPDATE---/g,
  /---INVENTORY_DATA---[\s\S]*?---END_INVENTORY_DATA---/g,
  /---VIDEO_DATA---[\s\S]*?---END_VIDEO_DATA---/g,
  // Streaming: partial markers where closing tag hasn't arrived yet
  /---MATERIALS_DATA---[\s\S]*$/g,
  /---INVENTORY_UPDATE---[\s\S]*$/g,
  /---INVENTORY_DATA---[\s\S]*$/g,
  /---VIDEO_DATA---[\s\S]*$/g,
  // Stray closing markers that appear alone
  /---END_MATERIALS_DATA---/g,
  /---END_INVENTORY_UPDATE---/g,
  /---END_INVENTORY_DATA---/g,
  /---END_VIDEO_DATA---/g,
];

export function cleanMessageContent(content: string): string {
  let result = content;
  for (const pattern of CLEAN_PATTERNS) {
    result = result.replace(pattern, '');
  }
  return result.trim();
}

export function extractMaterialsData(content: string): ExtractedMaterials | null {
  const match = content.match(MATERIALS_PATTERN);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1].trim());
    } catch (e) {
      console.error('Failed to parse materials data:', e);
    }
  }
  return null;
}

export function parseVideoResults(content: string): { found: boolean; videos?: Video[]; query?: string } {
  try {
    // Primary: delimiter-based extraction (injected by SSE handler)
    const delimiterMatch = content.match(VIDEO_PATTERN);
    if (delimiterMatch && delimiterMatch[1]) {
      const data = JSON.parse(delimiterMatch[1].trim());
      if (data.success && data.videos && Array.isArray(data.videos) && data.videos.length > 0) {
        return { found: true, videos: data.videos, query: data.query || 'Project Tutorial' };
      }
    }
  } catch (e) {
    console.error('Error parsing video results:', e);
  }
  return { found: false };
}

export function detectInventoryUpdate(content: string): { added: string[]; existing: string[] } | null {
  const inventoryMatch = content.match(INVENTORY_PATTERN);
  if (inventoryMatch) {
    try {
      const data = JSON.parse(inventoryMatch[1]);
      if (data.added?.length > 0 || data.existing?.length > 0) {
        return data;
      }
    } catch (e) {
      console.error('Error parsing inventory update:', e);
    }
  }
  return null;
}
