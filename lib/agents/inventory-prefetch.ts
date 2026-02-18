// Pre-fetch user inventory in parallel with the plan phase start.
// Non-fatal: returns null on failure so the pipeline continues without inventory.

import { AuthResult } from '@/lib/auth';
import { logger } from '@/lib/logger';
import type { InventoryData, InventoryItem } from './types';

const PREFETCH_TIMEOUT_MS = 3_000;

export async function prefetchInventory(auth: AuthResult): Promise<InventoryData | null> {
  if (!auth.userId) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PREFETCH_TIMEOUT_MS);

    const { data, error } = await auth.supabaseClient
      .from('user_inventory')
      .select('id, item_name, category, quantity, condition')
      .eq('user_id', auth.userId)
      .order('category')
      .order('item_name')
      .abortSignal(controller.signal);

    clearTimeout(timeout);

    if (error) {
      logger.warn('Inventory prefetch query error', { error: error.message });
      return null;
    }

    if (!data || data.length === 0) return null;

    return {
      items: data as InventoryItem[],
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    // Timeout or network error — non-fatal
    logger.warn('Inventory prefetch failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export function formatInventoryForPrompt(inventory: InventoryData | null): string {
  if (!inventory || inventory.items.length === 0) {
    return 'User has no items in their inventory. They will need to purchase everything.';
  }

  const grouped: Record<string, InventoryItem[]> = {};
  for (const item of inventory.items) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  let text = `**User's Inventory (${inventory.items.length} items):**\n`;
  for (const [category, items] of Object.entries(grouped)) {
    text += `\n${category}:\n`;
    for (const item of items) {
      const qty = item.quantity > 1 ? ` (x${item.quantity})` : '';
      const cond = item.condition !== 'good' ? ` [${item.condition}]` : '';
      text += `  - ${item.item_name}${qty}${cond}\n`;
    }
  }

  return text;
}
