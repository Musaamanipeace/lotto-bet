export type ErrorDetails = {
  bookmaker?: string;
  upstream?: string;
  url?: string;
  httpStatus?: number;
  bizCode?: number | string;
  cause?: string;
  bodySnippet?: string;
  unmapped?: { leg: string; reason: string }[];
  /** LLM calls: every provider tried, in order, with the real error of each failure. */
  attempts?: { provider: string; error: string; httpStatus?: number }[];
};

export type Ok<T extends object = {}> = { ok: true } & T;
export type Failure = { ok: false; error: string; details: ErrorDetails };
export type Result<T extends object = {}> = Ok<T> | Failure;

export function ok<T extends object>(value: T): Ok<T> {
  return { ok: true, ...value };
}

export function fail(error: string, details: ErrorDetails = {}): Failure {
  return { ok: false, error, details };
}
