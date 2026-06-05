import { describe, it, expect } from 'vitest';
import { linkConversationToProject } from '../projectLink';

// Hand-rolled fake Supabase client that records the chained call so we can
// assert the exact write contract the project-restore reads back
// (app/page.tsx queries conversations WHERE project_id = <project>).
function makeFakeClient() {
  const calls: {
    table?: string;
    update?: unknown;
    eqField?: string;
    eqValue?: unknown;
  } = {};
  const client = {
    from(table: string) {
      calls.table = table;
      return {
        update(values: unknown) {
          calls.update = values;
          return {
            eq(field: string, value: unknown) {
              calls.eqField = field;
              calls.eqValue = value;
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
      };
    },
  };
  return { client, calls };
}

describe('linkConversationToProject', () => {
  it('stamps the active conversation row with the project id', async () => {
    const { client, calls } = makeFakeClient();

    await linkConversationToProject(client as never, 'conv-123', 'proj-456');

    expect(calls.table).toBe('conversations');
    expect(calls.update).toEqual({ project_id: 'proj-456' });
    expect(calls.eqField).toBe('id');
    expect(calls.eqValue).toBe('conv-123');
  });

  it('no-ops when there is no active conversation (guest / fresh chat)', async () => {
    const { client, calls } = makeFakeClient();

    await linkConversationToProject(client as never, undefined, 'proj-456');

    expect(calls.table).toBeUndefined();
  });
});
