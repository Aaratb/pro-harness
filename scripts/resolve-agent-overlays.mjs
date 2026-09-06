#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const harnessRoot = path.resolve(scriptDirectory, '..');
const argumentsList = process.argv.slice(2);

function valueFor(flag) {
  const index = argumentsList.indexOf(flag);
  return index >= 0 ? argumentsList[index + 1] : undefined;
}

const repositoryRoot = path.resolve(valueFor('--repo') ?? process.cwd());
const agentName = valueFor('--agent');
const taskContext = (valueFor('--context') ?? '').toLocaleLowerCase('en-US');
if (!agentName) {
  console.error('usage: resolve-agent-overlays.mjs --agent <canonical-agent> [--repo <path>] [--context <task text>]');
  process.exit(2);
}

const definitionPath = path.join(harnessRoot, 'agents', 'definitions', `${agentName}.json`);
if (!fs.existsSync(definitionPath)) {
  console.error(`unknown canonical agent: ${agentName}`);
  process.exit(2);
}

const dependencies = new Set();
for (const manifestName of ['package.json', 'pyproject.toml', 'requirements.txt', 'pubspec.yaml']) {
  const manifestPath = path.join(repositoryRoot, manifestName);
  if (!fs.existsSync(manifestPath)) continue;
  const text = fs.readFileSync(manifestPath, 'utf8');
  if (manifestName === 'package.json') {
    const manifest = JSON.parse(text);
    for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      for (const name of Object.keys(manifest[section] ?? {})) dependencies.add(name);
    }
  } else {
    for (const token of text.match(/[A-Za-z0-9_@./-]+/g) ?? []) dependencies.add(token);
  }
}

const overlaysRoot = path.join(harnessRoot, 'agents', 'overlays', 'definitions');
const matches = [];
for (const fileName of fs.readdirSync(overlaysRoot).filter((name) => name.endsWith('.json')).sort()) {
  const overlay = JSON.parse(fs.readFileSync(path.join(overlaysRoot, fileName), 'utf8'));
  if (!overlay.applies_to.includes(agentName)) continue;
  const fileEvidence = overlay.detect.files_any.filter((name) => fs.existsSync(path.join(repositoryRoot, name)));
  const dependencyEvidence = overlay.detect.dependencies_any.filter((name) => dependencies.has(name));
  const termEvidence = (overlay.detect.terms_any ?? []).filter((term) => taskContext.includes(term.toLocaleLowerCase('en-US')));
  if (fileEvidence.length + dependencyEvidence.length + termEvidence.length === 0) continue;
  matches.push({
    name: overlay.name,
    evidence: { files: fileEvidence, dependencies: dependencyEvidence, terms: termEvidence },
    skills: overlay.skills,
  });
}

console.log(JSON.stringify({ schema_version: 1, agent: agentName, repository: repositoryRoot, overlays: matches.slice(0, 3) }, null, 2));
