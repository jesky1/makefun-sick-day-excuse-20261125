// The Funniest Sick-Day Excuse — make.fun micro entry.
// Writes exactly one line to /output/entry.txt (or $MAKEFUN_OUTPUT_DIR).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const EXCUSE =
  'Sneezed so hard this morning my back filed for divorce — I am spending today in mediation with an ice pack and a heating pad.';

function excuseIsOk(line: string): string | null {
  if (line.length < 1 || line.length > 200) return 'length must be 1-200 characters';
  if (line.trim().length === 0) return 'must not be whitespace only';
  if (/[\r\n]/.test(line)) return 'must be a single line';
  if (/[\u0000-\u001f\u007f]/.test(line)) return 'must not contain control characters';
  if (!/[A-Za-z]/.test(line)) return 'must contain a letter';
  if (line.trim().split(/\s+/).length < 5) return 'needs at least 5 words';
  if (/https?:\/\//i.test(line)) return 'must not contain a link';
  if (line !== line.trim()) return 'must not start or end with whitespace';
  return null;
}

function run(): void {
  const problem = excuseIsOk(EXCUSE);
  if (problem !== null) {
    throw new Error(`invalid excuse: ${problem}`);
  }
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'entry.txt'), EXCUSE, 'utf8');
}

run();
