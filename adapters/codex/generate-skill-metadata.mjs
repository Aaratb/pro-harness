#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const harnessRoot = path.resolve(scriptDirectory, '..', '..');
const argumentsList = process.argv.slice(2);

function valueFor(flag) {
  const index = argumentsList.indexOf(flag);
  return index >= 0 ? argumentsList[index + 1] : undefined;
}

function fail(message) {
  console.error(message);
  process.exit(2);
}

function titleCase(name) {
  return name.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function shortDescription(description) {
  const sentence = description.split(/[.!?]/)[0].trim();
  const candidate = sentence.length >= 25 ? sentence : `Run the ${sentence.toLowerCase()} workflow`;
  return candidate.length <= 64 ? candidate : `${candidate.slice(0, 61).trimEnd()}...`;
}

function readFrontmatter(skillPath) {
  const text = fs.readFileSync(skillPath, 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) fail(`${skillPath}: missing YAML frontmatter`);
  const values = {};
  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(':');
    if (separator < 1) fail(`${skillPath}: invalid frontmatter line ${line}`);
    values[line.slice(0, separator).trim()] = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  if (!values.name || !values.description) fail(`${skillPath}: name and description are required`);
  return values;
}

const sourceRoot = path.resolve(valueFor('--source-root') ?? path.join(harnessRoot, 'skills'));
const outputRootValue = valueFor('--output-root');
if (!outputRootValue) fail('usage: generate-skill-metadata.mjs --output-root <installed-skills-root> [--source-root <canonical-skills-root>]');
const outputRoot = path.resolve(outputRootValue);
if (outputRoot === sourceRoot || outputRoot.startsWith(`${sourceRoot}${path.sep}`)) {
  fail('refusing to write Codex adapter metadata into the canonical skill tree');
}

const generated = [];
for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
  if (!entry.isDirectory()) continue;
  const skillPath = path.join(sourceRoot, entry.name, 'SKILL.md');
  if (!fs.existsSync(skillPath)) continue;
  const skill = readFrontmatter(skillPath);
  if (skill.name !== entry.name) fail(`${skillPath}: folder and skill name disagree`);
  const metadataRoot = path.join(outputRoot, skill.name, 'agents');
  fs.mkdirSync(metadataRoot, { recursive: true });
  const yaml = [
    'interface:',
    `  display_name: ${JSON.stringify(titleCase(skill.name))}`,
    `  short_description: ${JSON.stringify(shortDescription(skill.description))}`,
    `  default_prompt: ${JSON.stringify(`Use $${skill.name} to ${skill.description.charAt(0).toLowerCase()}${skill.description.slice(1)}`)}`,
    ''
  ].join('\n');
  fs.writeFileSync(path.join(metadataRoot, 'openai.yaml'), yaml, 'utf8');
  generated.push(skill.name);
}

console.log(`generated Codex UI metadata for ${generated.length} skills in ${outputRoot}`);
