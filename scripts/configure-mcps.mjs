#!/usr/bin/env node

import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureMcps } from './lib/mcp-configuration.mjs';

const argumentsList = process.argv.slice(2);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const harnessRoot = path.resolve(scriptDirectory, '..');

function valueFor(flag, fallback) {
  const index = argumentsList.indexOf(flag);
  return index >= 0 ? argumentsList[index + 1] : fallback;
}

const home = path.resolve(valueFor('--home', os.homedir()));
const runtimes = valueFor('--runtimes', 'claude,codex,cursor').split(',').filter(Boolean);
const providersValue = valueFor('--providers', '');
const providers = providersValue ? providersValue.split(',').filter(Boolean) : undefined;

try {
  const result = configureMcps({ harnessRoot, home, runtimes, providers });
  console.log(`status=success providers=${result.providers.join(',')} files=${result.files.join(',')}`);
} catch (error) {
  console.error(`status=error summary=${error.message}`);
  console.error('next_actions=Export the missing variables, remove conflicting provider entries, or select a smaller provider set; then retry once.');
  process.exit(1);
}
