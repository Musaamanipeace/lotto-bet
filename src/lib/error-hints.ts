/**
 * One-line "what to do next" for the AI Picks error box, chosen from the real error text.
 * Returns null when there is no specific advice, so an unrelated failure (a timeout, a bad key,
 * a database error) is never blamed on a missing fetch run.
 */
export function hintForError(error: string | null | undefined): string | null {
  if (!error) return null;
  if (/DATABASE_URL/.test(error)) return 'Set DATABASE_URL in the hosting environment variables, then redeploy.';
  if (/Sign in/i.test(error)) return 'Sign in, then press Regenerate AI again.';
  if (/No finished fetch run|Latest run has no games/i.test(error)) return 'Fetch games first: open the home page (or POST /api/admin/refresh, or run the daily cron), then press Regenerate AI.';
  if (/No AI picks have been generated|saved AI snapshot has no picks/i.test(error)) return 'Press Regenerate AI. If it then reports no fetch run, fetch games first.';
  return null;
}
