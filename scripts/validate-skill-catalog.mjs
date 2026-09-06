#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const harnessRoot = path.resolve(scriptDirectory, '..');

function readJson(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(harnessRoot, relativePath), 'utf8'));
  } catch (error) {
    throw new Error(`${relativePath}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseFrontmatter(text, label) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  assert(match, `${label}: missing YAML frontmatter`);
  const entries = new Map();
  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(':');
    assert(separator > 0, `${label}: invalid frontmatter line ${line}`);
    entries.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, ''));
  }
  return entries;
}

const manifest = readJson('skills/resolution-manifest.json');
const adapters = readJson('agents/adapters/capabilities.json');
const firecrawl = readJson('mcps/firecrawl/capability.json');
const firecrawlSchema = readJson('mcps/schema/capability.schema.json');
const featureCommand = fs.readFileSync(path.join(harnessRoot, 'commands', 'feature-pro.md'), 'utf8');
const featureContract = readJson('commands/feature-pro/contract.json');
const featureBundleText = [
  featureCommand,
  fs.readFileSync(path.join(harnessRoot, 'commands', 'feature-pro', 'routing.md'), 'utf8'),
  fs.readFileSync(path.join(harnessRoot, 'commands', 'feature-pro', 'governance.md'), 'utf8'),
  ...fs.readdirSync(path.join(harnessRoot, 'commands', 'feature-pro', 'phases'))
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => fs.readFileSync(path.join(harnessRoot, 'commands', 'feature-pro', 'phases', name), 'utf8')),
].join('\n');

assert(manifest.schema_version === 1, 'skill manifest must use schema_version 1');
assert(manifest.artifact_root_input === 'artifact_root', 'skill manifest must require artifact_root');
assert(Array.isArray(manifest.skills) && manifest.skills.length > 0, 'skill manifest must contain skills');
assert(firecrawlSchema.$schema?.includes('2020-12'), 'MCP capability schema must use JSON Schema 2020-12');
assert(firecrawl.schema_version === 1 && firecrawl.name === 'firecrawl', 'invalid Firecrawl capability contract');
assert(firecrawl.authentication.required === true, 'Firecrawl authentication must be required');
assert(firecrawl.authentication.may_print_secret === false, 'Firecrawl must prohibit printing secrets');
assert(firecrawl.data_policy.artifact_root_required === true, 'Firecrawl must require artifact_root');

const names = new Set();
const knownCapabilities = new Set([
  ...Object.keys(adapters.capabilities),
  ...Object.keys(firecrawl.capabilities),
]);
const forbiddenRuntimeText = [
  /\bgstack\b/i,
  /\bsuperpowers\b/i,
  /\.gstack/i,
  /\bgbrain\b/i,
  /\.agent_docs/i,
  /\.aw_docs/i,
  /\b(?:app-product|app-shared|core|data|infra|review):/i,
];

for (const skill of manifest.skills) {
  assert(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(skill.name), `invalid canonical skill name ${skill.name}`);
  assert(!names.has(skill.name), `duplicate canonical skill ${skill.name}`);
  names.add(skill.name);
}

for (const skill of manifest.skills) {
  const root = path.join(harnessRoot, 'skills', skill.name);
  const skillPath = path.join(root, 'SKILL.md');
  assert(fs.existsSync(skillPath), `${skill.name}: missing SKILL.md`);
  assert(!fs.existsSync(path.join(root, 'agents', 'openai.yaml')), `${skill.name}: platform metadata must not live in the canonical skill tree`);
  const text = fs.readFileSync(skillPath, 'utf8');
  const frontmatter = parseFrontmatter(text, skill.name);
  assert(frontmatter.size === 2, `${skill.name}: frontmatter may contain only name and description`);
  assert(frontmatter.get('name') === skill.name, `${skill.name}: frontmatter name mismatch`);
  assert(frontmatter.get('description') === skill.description, `${skill.name}: description differs from manifest`);
  assert(text.split('\n').length <= 500, `${skill.name}: SKILL.md exceeds 500 lines`);
  assert(text.includes('caller-supplied `artifact_root`'), `${skill.name}: missing artifact-root contract`);
  for (const pattern of forbiddenRuntimeText) assert(!pattern.test(text), `${skill.name}: forbidden runtime taxonomy matched ${pattern}`);
  for (const dependency of skill.dependencies) assert(names.has(dependency), `${skill.name}: unresolved dependency ${dependency}`);
  for (const capability of skill.capabilities) assert(knownCapabilities.has(capability), `${skill.name}: unresolved capability ${capability}`);
}

const featureSkillNames = new Set();
for (const phase of featureContract.phases) {
  for (const skill of [...phase.required_skills, ...phase.optional_skills]) featureSkillNames.add(skill);
}
for (const name of featureSkillNames) assert(names.has(name), `Feature Pro references unresolved skill ${name}`);
for (const pattern of forbiddenRuntimeText) assert(!pattern.test(featureBundleText), `Feature Pro contains forbidden runtime taxonomy ${pattern}`);
assert(!featureSkillNames.has('firecrawl'), 'Firecrawl must resolve as an MCP capability, not a skill');
assert(names.has('competitive-research'), 'competitive-research skill is required');
const competitiveResearch = manifest.skills.find(({ name }) => name === 'competitive-research');
for (const capability of ['firecrawl.search', 'firecrawl.scrape', 'firecrawl.crawl', 'firecrawl.extract']) {
  assert(competitiveResearch.capabilities.includes(capability), `competitive-research missing ${capability}`);
}

console.log(`skill catalog valid: ${names.size} canonical skills, ${featureSkillNames.size} Feature Pro routes, ${Object.keys(firecrawl.capabilities).length} Firecrawl capabilities`);
