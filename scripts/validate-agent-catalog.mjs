#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const harnessRoot = path.resolve(scriptDirectory, '..');
const definitionsRoot = path.join(harnessRoot, 'agents', 'definitions');
const overlaysRoot = path.join(harnessRoot, 'agents', 'overlays', 'definitions');

function readJson(relativePath) {
  const absolutePath = path.join(harnessRoot, relativePath);
  try {
    return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    throw new Error(`${relativePath}: ${error.message}`);
  }
}

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function collectSkillNames(root) {
  const names = new Set();
  if (!fs.existsSync(root)) return names;

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const child = path.join(root, entry.name);
    if (entry.isDirectory()) {
      for (const name of collectSkillNames(child)) names.add(name);
    } else if (entry.isFile() && entry.name === 'SKILL.md') {
      const body = fs.readFileSync(child, 'utf8');
      const match = body.match(/^name:\s*(.+)$/m);
      if (match) names.add(match[1].trim().replace(/^['"]|['"]$/g, ''));
    }
  }
  return names;
}

const schema = readJson('agents/schema/agent.schema.json');
const profilesDocument = readJson('agents/capability-profiles.json');
const adaptersDocument = readJson('agents/adapters/capabilities.json');
const renameManifest = readJson('agents/rename-manifest.json');
const overlaySchema = readJson('agents/overlays/schema/overlay.schema.json');
const overlayRouting = readJson('agents/overlays/routing.json');
const profiles = profilesDocument.profiles;
const adapters = adaptersDocument.capabilities;
const schemaProperties = new Set(Object.keys(schema.properties));
const namePattern = new RegExp(schema.properties.name.pattern);
const forbiddenDefinitionText = [
  /\.agent_docs/i,
  /~\/\.agents/i,
  /locationId/,
  /IAM v2/i,
  /Keychain v2/i,
  /I remember/i,
  /I have generated/i,
  /200\+ services/i,
  /"(?:Read|Grep|Glob|Bash|Write|Edit|CallMcpTool)"/
];

assert(schema.$schema?.includes('2020-12'), 'agent schema must use JSON Schema 2020-12');
assert(profilesDocument.schema_version === 1, 'capability profiles must use schema_version 1');
assert(adaptersDocument.schema_version === 1, 'capability adapters must use schema_version 1');
assert(renameManifest.schema_version === 1, 'rename manifest must use schema_version 1');

for (const [profileName, profile] of Object.entries(profiles)) {
  assert(Array.isArray(profile.capabilities) && profile.capabilities.length > 0, `${profileName}: capabilities must be non-empty`);
  for (const capability of profile.capabilities) {
    assert(adapters[capability], `${profileName}: capability ${capability} has no adapter mapping`);
    for (const runtime of ['claude', 'codex', 'cursor']) {
      assert(Array.isArray(adapters[capability][runtime]) && adapters[capability][runtime].length > 0, `${capability}: missing ${runtime} adapter`);
    }
  }
}

const definitionFiles = fs.readdirSync(definitionsRoot)
  .filter((name) => name.endsWith('.json'))
  .sort();
const definitions = new Map();
const availableSkills = collectSkillNames(path.join(harnessRoot, 'skills'));

for (const fileName of definitionFiles) {
  const relativePath = path.join('agents', 'definitions', fileName);
  const definitionText = fs.readFileSync(path.join(definitionsRoot, fileName), 'utf8');
  const definition = JSON.parse(definitionText);
  const label = `agents/definitions/${fileName}`;

  for (const key of schema.required) assert(Object.hasOwn(definition, key), `${label}: missing required property ${key}`);
  for (const key of Object.keys(definition)) assert(schemaProperties.has(key), `${label}: unknown property ${key}`);
  assert(definition.schema_version === 1, `${label}: schema_version must be 1`);
  assert(namePattern.test(definition.name), `${label}: invalid canonical name ${definition.name}`);
  assert(fileName === `${definition.name}.json`, `${label}: filename must match canonical name`);
  assert(!definitions.has(definition.name), `${label}: duplicate canonical name ${definition.name}`);
  assert(schema.properties.classification.enum.includes(definition.classification), `${label}: invalid classification`);
  assert(schema.properties.mode.enum.includes(definition.mode), `${label}: invalid mode`);
  assert(typeof definition.description === 'string' && definition.description.length >= 20 && definition.description.length <= 240, `${label}: description length is invalid`);
  assert(profiles[definition.capability_profile], `${label}: unknown capability profile ${definition.capability_profile}`);
  assert(Array.isArray(definition.skills), `${label}: skills must be an array`);
  for (const skill of definition.skills) assert(availableSkills.has(skill), `${label}: unresolved skill dependency ${skill}`);
  assert(Array.isArray(definition.required_inputs) && definition.required_inputs.includes('artifact_root'), `${label}: artifact_root must be required`);
  assert(definition.artifact_policy?.root_input === 'artifact_root', `${label}: artifact policy must use artifact_root`);
  assert(definition.artifact_policy?.invent_paths === false, `${label}: invented artifact paths must be forbidden`);
  assert(definition.artifact_policy?.path_escape === 'forbid', `${label}: artifact path escape must be forbidden`);
  assert(Array.isArray(definition.source_agents) && definition.source_agents.length > 0, `${label}: source_agents must be non-empty`);
  assert(Array.isArray(definition.instructions) && definition.instructions.length >= 3 && definition.instructions.length <= 12, `${label}: instructions must contain 3-12 items`);

  const profile = profiles[definition.capability_profile];
  const expectedWrites = profile.repository_access === 'task-scoped-write' ? 'task-scoped' : 'deny';
  assert(definition.artifact_policy.repository_writes === expectedWrites, `${label}: repository write policy conflicts with capability profile`);

  for (const pattern of forbiddenDefinitionText) assert(!pattern.test(definitionText), `${label}: forbidden internal or runtime-specific text matched ${pattern}`);
  definitions.set(definition.name, definition);
}

assert(definitions.size > 0, 'no canonical agent definitions found');

const mappingSources = new Set();
const mappedSourcesByTarget = new Map();
for (const mapping of renameManifest.mappings) {
  assert(!mappingSources.has(mapping.source), `rename manifest: duplicate source ${mapping.source}`);
  mappingSources.add(mapping.source);
  assert(definitions.has(mapping.target), `rename manifest: missing target definition ${mapping.target}`);
  const sources = mappedSourcesByTarget.get(mapping.target) ?? [];
  sources.push(mapping.source);
  mappedSourcesByTarget.set(mapping.target, sources);
}

for (const mapping of renameManifest.created ?? []) {
  assert(mapping.source === `created:${mapping.target}`, `created agent ${mapping.target}: source must be created:<target>`);
  assert(!mappingSources.has(mapping.source), `rename manifest: duplicate source ${mapping.source}`);
  mappingSources.add(mapping.source);
  assert(definitions.has(mapping.target), `rename manifest: missing created target definition ${mapping.target}`);
  const sources = mappedSourcesByTarget.get(mapping.target) ?? [];
  sources.push(mapping.source);
  mappedSourcesByTarget.set(mapping.target, sources);
}

for (const [target, definition] of definitions) {
  const mappedSources = (mappedSourcesByTarget.get(target) ?? []).sort();
  const declaredSources = [...definition.source_agents].sort();
  assert(JSON.stringify(mappedSources) === JSON.stringify(declaredSources), `${target}: source_agents disagree with rename manifest`);
}

const optionalSourceRoot = path.resolve(harnessRoot, '..', renameManifest.source_root);
if (fs.existsSync(optionalSourceRoot)) {
  for (const source of renameManifest.mappings.map(({ source }) => source)) {
    assert(fs.existsSync(path.join(optionalSourceRoot, `${source}.md`)), `rename manifest: missing source file ${source}.md`);
  }
}

assert(overlaySchema.$schema?.includes('2020-12'), 'overlay schema must use JSON Schema 2020-12');
assert(overlayRouting.schema_version === 1, 'overlay routing must use schema_version 1');
assert(overlayRouting.mode === 'detect-then-load', 'overlay routing must use detect-then-load mode');
const overlayNames = new Set();
for (const fileName of fs.readdirSync(overlaysRoot).filter((name) => name.endsWith('.json')).sort()) {
  const overlay = JSON.parse(fs.readFileSync(path.join(overlaysRoot, fileName), 'utf8'));
  const label = `agents/overlays/definitions/${fileName}`;
  for (const key of overlaySchema.required) assert(Object.hasOwn(overlay, key), `${label}: missing required property ${key}`);
  for (const key of Object.keys(overlay)) assert(Object.hasOwn(overlaySchema.properties, key), `${label}: unknown property ${key}`);
  assert(overlay.schema_version === 1, `${label}: schema_version must be 1`);
  assert(fileName === `${overlay.name}.json`, `${label}: filename must match overlay name`);
  assert(!overlayNames.has(overlay.name), `${label}: duplicate overlay name`);
  assert(overlay.capability_widening === false, `${label}: capability widening is forbidden`);
  for (const key of Object.keys(overlay.detect)) assert(Object.hasOwn(overlaySchema.properties.detect.properties, key), `${label}: unknown detector ${key}`);
  for (const detector of ['files_any', 'dependencies_any', 'terms_any']) {
    const values = overlay.detect[detector] ?? [];
    assert(Array.isArray(values), `${label}: ${detector} must be an array`);
    assert(values.every((value) => typeof value === 'string' && value.length > 0), `${label}: ${detector} contains an invalid value`);
    assert(new Set(values).size === values.length, `${label}: ${detector} contains duplicates`);
  }
  assert(overlay.detect.files_any.length + overlay.detect.dependencies_any.length + (overlay.detect.terms_any?.length ?? 0) > 0, `${label}: at least one detector is required`);
  for (const agentName of overlay.applies_to) assert(definitions.has(agentName), `${label}: unresolved agent ${agentName}`);
  for (const skillName of overlay.skills) assert(availableSkills.has(skillName), `${label}: unresolved skill ${skillName}`);
  overlayNames.add(overlay.name);
}
assert(overlayNames.size > 0, 'no specialist overlays found');

console.log(`agent catalog valid: ${definitions.size} definitions, ${renameManifest.mappings.length} imported sources, ${(renameManifest.created ?? []).length} created agents, ${overlayNames.size} overlays, ${Object.keys(profiles).length} profiles, ${Object.keys(adapters).length} capabilities`);
