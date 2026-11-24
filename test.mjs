// Tests for the sick-day excuse entry: determinism + the gate rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EXPECTED =
  'Sneezed so hard this morning my back filed for divorce — I am spending today in mediation with an ice pack and a heating pad.';

function runMainInto(dir) {
  execFileSync('node', ['--experimental-strip-types', 'main.ts'], {
    cwd: new URL('.', import.meta.url).pathname,
    env: { ...process.env, MAKEFUN_OUTPUT_DIR: dir },
    stdio: 'pipe',
  });
  return readFileSync(join(dir, 'entry.txt'), 'utf8');
}

test('writes the exact excuse, one line, inside the 1-200 gate', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sick-day-'));
  try {
    const text = runMainInto(dir);
    assert.equal(text, EXPECTED);
    assert.equal(text.length, 125);
    assert.ok(text.length >= 1 && text.length <= 200);
    assert.equal(text.trim(), text);
    assert.ok(!/[\r\n]/.test(text));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('two runs in different dirs produce byte-identical output', () => {
  const a = mkdtempSync(join(tmpdir(), 'sick-day-a-'));
  const b = mkdtempSync(join(tmpdir(), 'sick-day-b-'));
  try {
    assert.equal(runMainInto(a), runMainInto(b));
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

// Negative checks against the same gate logic the program enforces.
function gateRejects(line) {
  if (line.length < 1 || line.length > 200) return true;
  if (line.trim().length === 0) return true;
  if (/[\r\n]/.test(line)) return true;
  if (/[\u0000-\u001f\u007f]/.test(line)) return true;
  if (!/[A-Za-z]/.test(line)) return true;
  if (line.trim().split(/\s+/).length < 5) return true;
  if (/https?:\/\//i.test(line)) return true;
  if (line !== line.trim()) return true;
  const words = line.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  if (words.some((w) => words.filter((x) => x === w).length >= 3)) return true;
  if (!/[.!?]$/.test(line)) return true;
  return false;
}

test('gate rejects over-long, blank, multi-line and sloppy lines', () => {
  assert.ok(gateRejects('x'.repeat(201)), '201 chars rejected');
  assert.ok(gateRejects('word '.repeat(40)), '200 chars + trailing space rejected');
  assert.ok(gateRejects('   '), 'whitespace-only rejected');
  assert.ok(gateRejects(''), 'empty rejected');
  assert.ok(gateRejects('line one\nline two is here'), 'newline rejected');
  assert.ok(gateRejects('line one\rline two is here'), 'carriage return rejected');
  assert.ok(gateRejects('  sneezed so hard today really'), 'leading space rejected');
  assert.ok(gateRejects('sneezed so hard today really '), 'trailing space rejected');
  assert.ok(gateRejects('bell\x07 rang and I stayed home'), 'control char rejected');
  assert.ok(gateRejects('12345 !!! ???'), 'no letters rejected');
  assert.ok(gateRejects('sick today'), 'under 5 words rejected');
  assert.ok(gateRejects('see https://example.com I am sick'), 'link rejected');
  assert.ok(gateRejects('sick sick sick day today please'), 'one word three times rejected');
  assert.ok(gateRejects('Sneezed so hard today I stayed home'), 'no terminal punctuation rejected');
});

test('gate accepts a 200-character multi-word line', () => {
  const words = Array.from({ length: 40 }, (_, i) => 'a' + String(i).padStart(3, '0'));
  const line = words.join(' ') + '.';
  assert.equal(line.length, 200);
  assert.ok(!gateRejects(line));
});

test('gate accepts the submitted excuse', () => {
  assert.ok(!gateRejects(EXPECTED));
});
