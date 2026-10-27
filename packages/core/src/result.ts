/**
 * Errors inside core are returned, never thrown. A capture that fails halfway
 * still hands back what it has, with a reason the UI can show in one line.
 */

export type CoreError = {
  code: 'no-document' | 'budget-exceeded' | 'unsupported' | 'unknown';
  message: string;
};

export type Result<T, E = CoreError> = { ok: true; value: T } | { ok: false; error: E };

/**
 * Wrap a value as a successful result.
 *
 * @example
 * ok(snapshot); // { ok: true, value: snapshot }
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Wrap an error as a failed result.
 *
 * @example
 * err({ code: 'no-document', message: 'No document to capture.' });
 */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
