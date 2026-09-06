#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateRuntimeAdapters } from './lib/runtime-adapters.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const harnessRoot = path.resolve(scriptDirectory, '..');
const argumentsList = process.argv.slice(2);
const outputIndex = argumentsList.indexOf('--output-root');

if (outputIndex < 0 || !argumentsList[outputIndex + 1]) {
  console.error('usage: generate-runtime-adapters.mjs --output-root <directory>');
  process.exit(2);
}

try {
  const manifest = generateRuntimeAdapters({ harnessRoot, outputRoot: argumentsList[outputIndex + 1] });
  console.log(`status=success agents=${manifest.agents.length} commands=${manifest.commands.length} runtimes=${manifest.runtimes.join(',')}`);
} catch (error) {
  console.error(`status=error summary=${error.message}`);
  process.exit(1);
}
