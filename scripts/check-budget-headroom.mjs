#!/usr/bin/env node
// Warn while there is still room to act.
//
// Every command's budget is `global_context + phase file <= activeWordBudget`. Global context
// consumes 66-91% of every budget, so a phase can sit a handful of words from its ceiling and
// nobody knows until an unrelated edit fails validation with three errors at once — which is
// exactly what happened on 2026-09-10.
//
// This reports the margin BEFORE it becomes a failure. Exit 1 below WARN_AT so it fails a
// validate run while there is still room to fix it properly rather than by trimming prose.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WARN_AT = 300;
const words = (p) => fs.readFileSync(p, 'utf8').split(/\s+/).filter(Boolean).length;
const commands = fs.readdirSync(path.join(ROOT, 'scripts'))
  .filter((f) => /^validate-.+-command\.mjs$/.test(f))
  .map((f) => f.replace(/^validate-|-command\.mjs$/g, ''));

let worst = Infinity;
const rows = [];
const unreadable = [];
for (const cmd of commands) {
  const contractPath = path.join(ROOT, 'commands', cmd, 'contract.json');
  const validatorPath = path.join(ROOT, 'scripts', `validate-${cmd}-command.mjs`);
  if (!fs.existsSync(contractPath)) continue;
  // activeWordBudget may be a literal or a hoisted constant. Resolve both: matching only the
  // literal silently dropped feature-pro from this table the moment it was hoisted, and a
  // budget checker that omits a command without saying so is worse than one that fails.
  const validatorText = fs.readFileSync(validatorPath, 'utf8');
  const inline = validatorText.match(/activeWordBudget:\s*(\d+)/);
  const named = validatorText.match(/activeWordBudget:\s*([A-Z_][A-Z0-9_]*)/);
  const constant = named && validatorText.match(new RegExp(`const\\s+${named[1]}\\s*=\\s*(\\d+)`));
  const budget = Number((inline || constant || [])[1]);
  if (!budget) { unreadable.push(cmd); continue; }
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  let global = 0;
  for (const rel of contract.global_context || []) {
    for (const candidate of [path.join(ROOT, rel), path.join(ROOT, 'commands', cmd, rel)]) {
      if (fs.existsSync(candidate)) { global += words(candidate); break; }
    }
  }
  let largest = 0; let largestPhase = null;
  for (const phase of contract.phases) {
    const file = path.join(ROOT, 'commands', cmd, phase.file);
    if (!fs.existsSync(file)) continue;
    const w = words(file);
    if (w > largest) { largest = w; largestPhase = phase; }
  }
  const headroom = budget - (global + largest);
  worst = Math.min(worst, headroom);
  rows.push({ cmd, global, budget, headroom, phase: largestPhase });
}

rows.sort((a, b) => a.headroom - b.headroom);
console.log('COMMAND'.padEnd(26) + 'GLOBAL'.padStart(7) + 'BUDGET'.padStart(8) + 'HEADROOM'.padStart(10) + '  TIGHTEST PHASE');
for (const r of rows) {
  const flag = r.headroom < WARN_AT ? '  <-- LOW' : '';
  console.log(r.cmd.padEnd(26) + String(r.global).padStart(7) + String(r.budget).padStart(8)
    + String(r.headroom >= 0 ? `+${r.headroom}` : r.headroom).padStart(10)
    + `  Ph${r.phase.number} ${r.phase.name}${flag}`);
}
if (worst < WARN_AT) {
  console.error(`\nHeadroom below ${WARN_AT} words. Re-derive the budget (global + largest phase + 600);`);
  console.error('do NOT trim prose to fit — that is how instructions and asserted phrases get lost.');
  process.exit(1);
}
if (unreadable.length) {
  console.error(`\nFAIL: could not read activeWordBudget for: ${unreadable.join(', ')}`);
  console.error('A command missing from this table is not a passing command.');
  process.exit(1);
}
console.log(`\nAll commands have at least ${WARN_AT} words of headroom (lowest +${worst}).`);
