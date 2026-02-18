// In-memory cancellation flag registry for agent runs.
// Checked at multiple points during pipeline execution.

const cancelledRuns = new Map<string, boolean>();

export function markCancelled(runId: string): void {
  cancelledRuns.set(runId, true);
}

export function isCancelled(runId: string): boolean {
  return cancelledRuns.get(runId) === true;
}

export function clearCancellation(runId: string): void {
  cancelledRuns.delete(runId);
}
