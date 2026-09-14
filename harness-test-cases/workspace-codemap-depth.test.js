'use strict';

// Instruction and routing checks, not a benchmark of model comprehension.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const command = () => read('commands/workspace-codemap-pro.md');
const onboarding = () => read('skills/codebase-onboarding/SKILL.md');
const context = () => read('skills/workspace-codemap-context/SKILL.md');
const has = (text, pattern, message) => assert.ok(pattern.test(text), message || pattern.toString());

test('codemap keeps its unphased utility, selectors and existing repository-owned outputs', () => {
  const text = command();
  has(text, /no numbered phase contract/);
  has(text, /\[all \| <repository> \| <repository>\/<application>\]/);
  has(text, /<repo>\/\.codemaps\//);
  has(text, /explicit owner repository/);
  for (const artifact of ['README.md', 'CODEMAP.md', 'topology.mmd', 'topology.svg', 'VIEW.html', 'MANIFEST.json', 'workspace/MASTER.md']) assert.ok(text.includes(artifact), artifact);
  assert.ok(text.trim().split(/\s+/).length <= 1650, 'compact command shell including the opening outline');
  assert.ok(!/\.agent_docs|\.aw_docs|god-level|mcp__/.test(text));
});

test('codemap begins scoped work and refreshes affected relationships instead of rebuilding blindly', () => {
  const text = command();
  has(text, /same (?:response|turn)/);
  has(text, /application.*(?:scope|bounded)|(?:scope|bounded).*application/i);
  has(text, /dirty.*untracked|untracked.*dirty/i);
  has(text, /reuse.*unchanged|unchanged.*reuse/i);
  has(text, /affected.*(?:claims|edges|views)|(?:claims|edges|views).*affected/i);
  has(text, /unknown.*freshness|freshness.*unknown/i);
  has(text, /do not.*(?:overwrite|replace).*unmanaged|unmanaged.*(?:preserve|stop)/i);
});

test('codemap checks relationship meaning and separates static source evidence from execution', () => {
  const text = command() + onboarding();
  has(text, /file exists.*not|path exists.*not|path existence.*not/i);
  has(text, /import.*(?:call|wiring)|(?:call|wiring).*import/i);
  has(text, /module.*process.*deploy/i);
  has(text, /CONFIRMED.*(?:source|static)/);
  has(text, /cross-repository.*(?:contract|evidence)|(?:contract|evidence).*cross-repository/i);
  has(text, /count.*(?:scope|exclusion)|(?:scope|exclusion).*count/i);
});

test('onboarding teaches responsibility, execution and reuse through existing method references', () => {
  const text = onboarding();
  has(text, /invariant|rule owner/);
  has(text, /(?:local|existing|shared).*(?:function|service|wrapper)/i);
  has(text, /reverse.*(?:depend|use)|(?:depend|use).*reverse/i);
  has(text, /(?:test|assertion).*(?:not|without).*(?:run|execut)|(?:not|without).*execut.*test/i);
  has(text, /caller.*(?:authority|contract)|(?:authority|contract).*caller/i);
  has(text, /inline|return content/i);
  for (const file of ['repository-archetypes.md', 'dependency-resolution.md', 'execution-timing.md']) assert.ok(text.includes(file), file);
  for (const [, target] of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    if (/^[a-z]+:|^#/.test(target)) continue;
    assert.ok(fs.existsSync(path.resolve(root, 'skills/codebase-onboarding', target)), target);
  }
});

test('codemap uses current read-only expertise on demand without implementation agents', () => {
  const text = command();
  for (const name of ['repository-explorer', 'system-architect', 'data-model-architect']) {
    assert.ok(text.includes('`' + name + '`'), name);
    const agent = JSON.parse(read(`agents/definitions/${name}.json`));
    assert.equal(agent.artifact_policy.repository_writes, 'deny');
  }
  assert.ok(!/`database-engineer`|`technical-writer`/.test(text));
  has(text, /inline/);
  has(text, /current canonical/);
  has(text, /lane_contract/);
  has(text, /evidence_manifest/);
  has(text, /host-enforced/);
  has(text, /instruction-only/);
  has(text, /(?:do not|no).*(?:Architecture|Explainer).*(?:workflow|governance|gates)/);
});

test('codemap leaves source static and gives workers no artifact writing authority', () => {
  const text = command();
  has(text, /coordinator.*(?:writes|persists)/i);
  has(text, /workers.*(?:return|never write)/i);
  has(text, /do not.*(?:execute|run).*(?:target|repository).*(?:code|scripts)/i);
  has(text, /untrusted/);
  has(text, /readFileNoFollow/);
  has(text, /symlink/);
  has(text, /no.*(?:network|production)|(?:network|production).*authorization/i);
});

test('codemap diagrams share meaningful boundaries and distinguish safe rendering from source truth', () => {
  const text = command();
  has(text, /same.*(?:identifiers|component)/i);
  has(text, /one (?:view|diagram).*cover|combine.*(?:view|diagram)/i);
  has(text, /UNRENDERED/);
  has(text, /well-formed XML/);
  has(text, /script.*event.*external|external.*script.*event/i);
  has(text, /meaning|semantic|legib/i);
  has(text, /source.*(?:freshness|truth).*integrity|integrity.*(?:freshness|truth)/i);
});

test('codemap context falls back safely and does not confuse generated digests with source freshness', () => {
  const text = context();
  has(text, /absence is not a blocker/i);
  has(text, /empty repository.*not-applicable/i);
  has(text, /dirty.*untracked|untracked.*dirty/i);
  has(text, /digest.*(?:not|never)|(?:not|never).*digest/i);
  has(text, /affected.*(?:claim|view)|(?:claim|view).*affected/i);
  has(text, /(?:do not|never).*(?:regenerate|repair|refresh).*map/i);
  has(text, /source.*(?:fallback|inspect)|(?:fallback|inspect).*source/i);
});
