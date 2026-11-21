/**
 * Booking codes need a signed-in user only when the app runs in production AND has a database to hold accounts.
 * Without a database nobody can sign up, so requiring sign-in there would make code generation unreachable.
 * The API route enforces this and /api/auth/me reports it, so the panel never hides a button the server would allow.
 */
export function codegenRequiresSignIn(env: { NODE_ENV?: string; DATABASE_URL?: string } = process.env): boolean {
  return env.NODE_ENV === 'production' && !!env.DATABASE_URL;
}
