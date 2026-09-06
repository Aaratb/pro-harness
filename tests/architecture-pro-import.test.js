'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function json(relativePath) {
  return JSON.parse(read(relativePath));
}

const expectedAgents = [
  'architecture-conformance-reviewer',
  'capacity-planner',
  'data-model-architect',
  'operability-reviewer',
  'performance-architect',
  'query-performance-architect',
  'resilience-analyst',
  'system-diagnostics-analyst',
];

const expectedSkills = [
  'architecture-capacity-and-tuning',
  'architecture-concurrency-and-overload',
  'architecture-data-model-evolution',
  'architecture-data-recovery',
  'architecture-diagnostics',
  'architecture-distributed-consistency',
  'architecture-edge-case-economics',
  'architecture-explanation-diagrams',
  'architecture-pro',
  'architecture-pro-governance',
  'architecture-query-performance',
  'architecture-review-readiness',
  'architecture-security-review',
  'architecture-system-performance',
];

test('Architecture Pro exposes a compact 13-phase repository-owned command', () => {
  const command = read('commands/architecture-pro.md');
  const contract = json('commands/architecture-pro/contract.json');

  assert.equal(contract.command, 'architecture-pro');
  assert.equal(contract.identity, 'Pro-Level System Architect');
  assert.equal(contract.phase_count, 13);
  assert.equal(contract.artifact_root, '$REPO_ROOT/.agents/architecture/<architecture-slug>');
  assert.deepEqual(contract.phases.map(({ number }) => number), Array.from({ length: 13 }, (_, index) => index + 1));
  for (const phase of contract.phases) {
    assert.ok(fs.existsSync(path.join(root, 'commands', 'architecture-pro', phase.file)), phase.file);
  }

  assert.match(command, /Pro-Level System Architect/);
  assert.match(command, /\.agents\/architecture\/<architecture-slug>/);
  assert.match(command, /resolve-architecture-root\.mjs/);
  assert.doesNotMatch(command, new RegExp(`\\.agent_docs|God-level|gstack|superpowers|${['Updated', 'Personal', 'Harness'].join('-')}`, 'i'));
  assert.ok(command.trim().split(/\s+/).length <= 1600, 'main command must stay within its progressive-loading budget');
});

test('Architecture Pro uses runtime-neutral specialist agents and one consolidated security route', () => {
  const profiles = json('agents/capability-profiles.json');
  const policy = json('config/architecture-pro.json');

  assert.deepEqual(profiles.profiles['static-analysis-read-only'].capabilities, ['filesystem.read', 'workspace.search']);
  for (const name of expectedAgents) {
    const definition = json(`agents/definitions/${name}.json`);
    assert.equal(definition.name, name);
    assert.equal(definition.capability_profile, 'static-analysis-read-only');
    assert.ok(definition.required_inputs.includes('artifact_root'));
    assert.equal(definition.artifact_policy.invent_paths, false);
    assert.equal(definition.artifact_policy.path_escape, 'forbid');
    assert.doesNotMatch(JSON.stringify(definition), /\b(?:Claude|Codex|Cursor|opus|sonnet|haiku)\b/i);
  }

  assert.ok(policy.security_routes.length >= 5);
  assert.ok(policy.security_routes.every(({ agent }) => agent === 'security-reviewer'));
  assert.deepEqual(new Set(policy.security_routes.map(({ focus }) => focus)), new Set([
    'api-and-authorization',
    'secrets-and-machine-identity',
    'privacy-and-data-transfer',
    'ai-and-tool-boundaries',
    'infrastructure-and-delivery',
  ]));
  assert.doesNotMatch(JSON.stringify(policy), /architecture-(?:api|secrets|privacy|ai-mcp|infrasec)-security-auditor/);
});

test('Architecture Pro skills are flat, canonical, resolvable, and free of legacy package names', () => {
  const manifest = json('skills/resolution-manifest.json');
  const names = new Set(manifest.skills.map(({ name }) => name));

  for (const name of expectedSkills) {
    assert.ok(names.has(name), `missing ${name} from the resolution manifest`);
    const skill = read(`skills/${name}/SKILL.md`);
    assert.match(skill, new RegExp(`^---\\nname: ${name}\\n`, 'm'));
    assert.doesNotMatch(skill, new RegExp(`gstack|superpowers|${['Updated', 'Personal', 'Harness'].join('-')}|\\.agent_docs`, 'i'));
  }
});

test('Architecture Pro shares the handoff contract and existing capability infrastructure', () => {
  const policy = json('config/architecture-pro.json');
  const handoff = json('schemas/architecture-handoff/handoff.schema.json');

  assert.equal(fs.existsSync(path.join(root, 'schemas/architecture-pro/handoff.schema.json')), false);
  assert.equal(handoff.properties.schema_version.const, 'architecture-pro/handoff@1');
  assert.equal(policy.handoff_schema, 'schemas/architecture-handoff/handoff.schema.json');
  assert.equal(policy.workflow_trace.schema, 'workflow-event@1');
  assert.deepEqual(policy.capabilities.diagram, ['diagram.render']);
  assert.deepEqual(policy.capabilities.primary_documentation, ['firecrawl.search', 'firecrawl.scrape']);
  assert.equal(policy.external_access.default, 'deny');
});

test('Architecture Pro validation and reconciliation stay first-class', () => {
  const reconciliation = json('commands/architecture-pro/reconciliation.json');
  const command = read('commands/architecture-pro.md');
  const skill = read('skills/architecture-pro/SKILL.md');
  assert.equal(reconciliation.status, 'reconciled-with-approved-normalizations');
  assert.equal(reconciliation.phase_map.length, 13);
  assert.equal(reconciliation.source_snapshot.path, undefined);
  assert.equal(reconciliation.source_snapshot.label, 'pre-externalization-architecture-pro');
  assert.ok(fs.existsSync(path.join(root, 'scripts/validate-architecture-pro-command.mjs')));
  assert.ok(fs.existsSync(path.join(root, 'scripts/validate-architecture-pro-run.mjs')));
  assert.match(skill, /node ~\/\.agents\/scripts\/resolve-architecture-root\.mjs/);
  for (const canonicalPath of [
    '~/.agents/commands/architecture-pro.md',
    '~/.agents/commands/architecture-pro/contract.json',
    '~/.agents/commands/architecture-pro/routing.md',
    '~/.agents/skills/architecture-pro-governance/SKILL.md',
  ]) {
    assert.match(skill, new RegExp(canonicalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(command, /~\/\.agents\/commands\/architecture-pro\/contract\.json/);
  assert.match(command, /~\/\.agents\/commands\/architecture-pro\/routing\.md/);
  assert.match(command, /~\/\.agents\/skills\/architecture-pro-governance\/SKILL\.md/);
});
