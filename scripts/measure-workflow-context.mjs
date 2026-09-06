#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { measureLoadedContext } from './lib/command-validation.mjs';

const usage = 'measure-workflow-context.mjs --file <harness-relative-loaded-file> [--file <another> ...]';
try {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') {
    console.log(JSON.stringify({ usage, purpose: 'Measure the full explicitly supplied instruction file set, not just the command shell. Include loaded skills, references, agents, overlays and capability contracts. No files are written.', limits: 'Not model tokens, host context, tool outputs, repeated-read cost or elapsed time. Use runtime usage and timing for those.' }, null, 2));
  } else {
    const files = [];
    for (let i = 0; i < args.length; i += 2) {
      if (args[i] !== '--file' || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(usage);
      files.push(args[i + 1]);
    }
    const harnessRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    console.log(JSON.stringify({ status: 'success', ...measureLoadedContext({ harnessRoot, files }) }, null, 2));
  }
} catch (error) {
  console.log(JSON.stringify({ status: 'error', summary: error.message }, null, 2));
  process.exitCode = 1;
}
