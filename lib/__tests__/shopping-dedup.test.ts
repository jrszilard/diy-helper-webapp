import { describe, it, expect } from 'vitest';
import { dedupeNewListItems } from '@/lib/marketplace/shopping-dedup';

type Item = { product_name: string; quantity: number };
const name = (i: Item) => i.product_name;

describe('dedupeNewListItems', () => {
  it('keeps distinct items', () => {
    const items: Item[] = [
      { product_name: '2x4 lumber', quantity: 1 },
      { product_name: 'wood screws', quantity: 2 },
    ];
    expect(dedupeNewListItems(items, name)).toEqual(items);
  });

  it('drops exact duplicates within the batch, keeping the first', () => {
    const items: Item[] = [
      { product_name: 'caulk', quantity: 1 },
      { product_name: 'caulk', quantity: 5 },
    ];
    expect(dedupeNewListItems(items, name)).toEqual([{ product_name: 'caulk', quantity: 1 }]);
  });

  it('treats names as duplicates case- and whitespace-insensitively', () => {
    const items: Item[] = [
      { product_name: '2x4 Lumber', quantity: 1 },
      { product_name: '  2x4   lumber ', quantity: 3 },
    ];
    expect(dedupeNewListItems(items, name)).toEqual([{ product_name: '2x4 Lumber', quantity: 1 }]);
  });

  it('skips items whose name already exists on the list', () => {
    const items: Item[] = [
      { product_name: 'PVC pipe', quantity: 1 },
      { product_name: 'pipe glue', quantity: 1 },
    ];
    const existing = ['pvc pipe'];
    expect(dedupeNewListItems(items, name, existing)).toEqual([
      { product_name: 'pipe glue', quantity: 1 },
    ]);
  });

  it('returns an empty array when every item is a duplicate', () => {
    const items: Item[] = [{ product_name: 'nails', quantity: 1 }];
    expect(dedupeNewListItems(items, name, ['NAILS'])).toEqual([]);
  });

  it('handles an empty incoming list', () => {
    expect(dedupeNewListItems([], name, ['anything'])).toEqual([]);
  });
});
