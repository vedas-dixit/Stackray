import { captureDocument } from './browser';
import { ok, type Result } from './result';
import type { Snapshot } from './types';

/** What the bundled script leaves on the page for `scripts/capture-fixture.ts`. */
export type StackrayGlobal = { capture: () => Result<Snapshot> };

declare global {
  var __stackray: StackrayGlobal;
}

globalThis.__stackray = {
  capture: () => {
    const result = captureDocument(document);
    return result.ok ? ok(result.value.snapshot) : result;
  },
};
