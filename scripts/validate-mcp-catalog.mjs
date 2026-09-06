#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const harnessRoot = path.resolve(scriptDirectory, '..');
function readJson(relativePath) { return JSON.parse(fs.readFileSync(path.join(harnessRoot, relativePath), 'utf8')); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const registry = readJson('mcps/registry.json');
const schema = readJson('mcps/schema/capability.schema.json');
const providerSchema = readJson('mcps/schema/providers.schema.json');
const providersDocument = readJson('mcps/providers.json');
const adapters = readJson('agents/adapters/capabilities.json').capabilities;
assert(registry.schema_version === 1, 'MCP registry must use schema_version 1');
assert(registry.selection === 'capability-first', 'MCP registry must use capability-first selection');
assert(schema.$schema?.includes('2020-12'), 'MCP schema must use JSON Schema 2020-12');
assert(providerSchema.$schema?.includes('2020-12'), 'MCP provider schema must use JSON Schema 2020-12');
assert(providersDocument.schema_version === 1, 'MCP providers must use schema_version 1');

const contractNames = new Set();
const capabilityOwners = new Map();
const workflowLimits = { 'architecture-pro': 13, 'customer-backward-pro': 8, 'debug-pro': 13, 'explainer-pro': 8, 'feature-pro': 20, 'review-pro': 10 };
for (const entry of registry.contracts) {
  assert(!contractNames.has(entry.name), `duplicate MCP contract ${entry.name}`);
  contractNames.add(entry.name);
  const contract = readJson(path.posix.join('mcps', entry.path));
  assert(contract.schema_version === 1, `${entry.name}: schema_version must be 1`);
  assert(contract.name === entry.name, `${entry.name}: registry and contract names disagree`);
  assert(entry.workflows && typeof entry.workflows === 'object' && !Array.isArray(entry.workflows), `${entry.name}: workflows routing is required`);
  for (const [workflow, phases] of Object.entries(entry.workflows)) {
    assert(workflowLimits[workflow], `${entry.name}: unknown workflow route ${workflow}`);
    assert(Array.isArray(phases) && phases.length > 0, `${entry.name}: ${workflow} route must contain phases`);
    assert(phases.every((phase) => Number.isInteger(phase) && phase >= 1 && phase <= workflowLimits[workflow]), `${entry.name}: ${workflow} phases are invalid`);
    assert(new Set(phases).size === phases.length, `${entry.name}: ${workflow} phases contain duplicates`);
  }
  for (const field of schema.required) assert(Object.hasOwn(contract, field), `${entry.name}: missing ${field}`);
  assert(['stdio', 'streamable-http', 'adapter-resolved'].includes(contract.transport), `${entry.name}: unsupported transport`);
  assert(Object.keys(contract.capabilities).length > 0, `${entry.name}: no capabilities`);
  assert(contract.data_policy.artifact_root_required === true, `${entry.name}: artifact_root must be required`);
  const serialized = JSON.stringify(contract);
  assert(!/(?:YOUR_[A-Z_]+|gh[oprsu]_[A-Za-z0-9]{12,}|sk-[A-Za-z0-9_-]{12,})/.test(serialized), `${entry.name}: credential-like value detected`);
  for (const capability of Object.keys(contract.capabilities)) {
    assert(!capabilityOwners.has(capability), `${capability}: owned by both ${capabilityOwners.get(capability)} and ${entry.name}`);
    capabilityOwners.set(capability, entry.name);
    assert(adapters[capability], `${capability}: missing runtime adapter mapping`);
    for (const runtime of ['claude', 'codex', 'cursor']) assert(Array.isArray(adapters[capability][runtime]) && adapters[capability][runtime].length > 0, `${capability}: missing ${runtime} adapter`);
  }
}

const providerNames = new Set();
for (const [name, provider] of Object.entries(providersDocument.providers)) {
  assert(!providerNames.has(name), `duplicate MCP provider ${name}`);
  providerNames.add(name);
  assert(['stdio', 'streamable-http'].includes(provider.transport), `${name}: unsupported provider transport`);
  if (provider.transport === 'stdio') {
    assert(typeof provider.command === 'string' && provider.command.length > 0, `${name}: stdio provider requires command`);
    assert(Array.isArray(provider.args), `${name}: stdio provider requires args`);
  } else {
    assert(/^https:\/\//.test(provider.url), `${name}: remote provider requires HTTPS URL`);
  }
  assert(Array.isArray(provider.required_env), `${name}: required_env must be an array`);
  assert(Array.isArray(provider.capabilities) && provider.capabilities.length > 0, `${name}: capabilities required`);
  for (const capability of provider.capabilities) assert(capabilityOwners.has(capability), `${name}: unknown capability ${capability}`);
  const serialized = JSON.stringify(provider);
  assert(!/(?:YOUR_[A-Z_]+|gh[oprsu]_[A-Za-z0-9]{12,}|sk-[A-Za-z0-9_-]{12,})/.test(serialized), `${name}: credential-like value detected`);
}

console.log(`MCP catalog valid: ${contractNames.size} contracts, ${capabilityOwners.size} canonical capabilities, ${providerNames.size} provider configurations`);
