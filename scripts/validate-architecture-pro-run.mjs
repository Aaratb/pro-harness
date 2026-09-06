#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { digestFile, digestValue } from './lib/digests.mjs';
import { canonicalRoot, containedPath } from './lib/repository-paths.mjs';
import { validateJsonSchema } from './lib/json-schema.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const harnessRoot = path.resolve(scriptDirectory, '..');
const args = process.argv.slice(2);
const valueFor = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
const errors = [];
const verification = { state_schema: 'not-run', transitions: 'not-run', budgets: 'not-run', artifacts: 'not-run', evidence: 'not-run', trace: 'not-run', handoff: 'not-run' };
let workflowTrace;
const issue = (code, message, file = null) => errors.push({ code, message, ...(file ? { file } : {}) });

function runValidator(script, childArgs) {
  const result = spawnSync(process.execPath, [path.join(scriptDirectory, script), ...childArgs], { encoding: 'utf8' });
  let payload;
  try { payload = JSON.parse(result.stdout); } catch { payload = { summary: result.stderr || result.stdout || `validator exited ${result.status}` }; }
  return { passed: result.status === 0, payload };
}

try {
  const known = new Set(['--repo-root', '--artifact-root', '--require-complete']);
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (!known.has(flag)) throw new Error(`unknown argument ${flag}`);
    if (flag !== '--require-complete') {
      if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`${flag} requires a value`);
      index += 1;
    }
  }
  const repositoryRootInput = valueFor('--repo-root');
  const artifactRelative = valueFor('--artifact-root');
  const requireComplete = args.includes('--require-complete');
  if (!repositoryRootInput || !artifactRelative) throw new Error('usage: validate-architecture-pro-run.mjs --repo-root <repository> --artifact-root <.agents/architecture/slug> [--require-complete]');
  const match = artifactRelative.match(/^\.agents\/architecture\/([a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)$/);
  if (!match) throw new Error('artifact-root must be .agents/architecture/<slug>');
  const repositoryRoot = canonicalRoot(repositoryRootInput);
  const artifactRoot = containedPath(repositoryRoot, artifactRelative, { expectedType: 'directory' });
  const stateRelative = `${artifactRelative}/state.json`;
  const statePath = containedPath(repositoryRoot, stateRelative, { expectedType: 'file' });
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const policy = JSON.parse(fs.readFileSync(path.join(harnessRoot, 'config', 'architecture-pro.json'), 'utf8'));
  const contract = JSON.parse(fs.readFileSync(path.join(harnessRoot, 'commands', 'architecture-pro', 'contract.json'), 'utf8'));

  for (const message of validateJsonSchema(state, path.join(harnessRoot, 'schemas', 'architecture-pro', 'state.schema.json'), 'state')) issue('state-schema', message, stateRelative);
  if (state.architecture_slug !== match[1]) issue('state-slug', 'architecture_slug must match the artifact directory', stateRelative);
  if (state.artifact_root !== artifactRelative) issue('state-root', 'state artifact_root must match the repository-relative run directory', stateRelative);
  verification.state_schema = errors.some(({ code }) => code.startsWith('state-')) ? 'fail' : 'pass';

  const phaseKeys = Object.keys(state.phases ?? {});
  if (phaseKeys.join(',') !== Array.from({ length: 13 }, (_, index) => index + 1).join(',')) issue('phase-set', 'phases must contain exactly 1 through 13', stateRelative);
  const transitions = new Set(policy.state_machine[state.mode] ?? []);
  if (!transitions.size) issue('mode', `no state machine for ${state.mode}`, stateRelative);
  for (const [index, transition] of (state.transition_log ?? []).entries()) {
    if (!Number.isInteger(transition.from) || !Number.isInteger(transition.to)) issue('transition-shape', `transition ${index} requires integer from and to`, stateRelative);
    else if (!transitions.has(`${transition.from}>${transition.to}`)) issue('transition-illegal', `illegal ${state.mode} transition ${transition.from}>${transition.to}`, stateRelative);
  }
  if (state.decision_reopens > policy.state_machine.max_decision_reopens) issue('decision-reopens', 'decision reopen budget exceeded', stateRelative);
  verification.transitions = errors.some(({ code }) => code.startsWith('transition') || code === 'decision-reopens' || code === 'mode') ? 'fail' : 'pass';

  for (const [name, used] of Object.entries(state.budget_usage ?? {})) {
    const ceiling = policy.budgets[name];
    if (ceiling === undefined) issue('budget-unknown', `unknown budget ${name}`, stateRelative);
    else if (used > ceiling) issue('budget-exceeded', `${name} usage ${used} exceeds ${ceiling}`, stateRelative);
  }
  verification.budgets = errors.some(({ code }) => code.startsWith('budget-')) ? 'fail' : 'pass';

  for (const [relativeArtifact, expectedDigest] of Object.entries(state.artifact_digests ?? {})) {
    if (['state.json', 'handoff.json', 'run-events.jsonl', 'run.lock'].includes(relativeArtifact)) { issue('artifact-self-reference', `forbidden artifact reference ${relativeArtifact}`, stateRelative); continue; }
    if (!/^sha256:[a-f0-9]{64}$/.test(expectedDigest ?? '')) { issue('artifact-digest-format', `invalid digest for ${relativeArtifact}`, stateRelative); continue; }
    try {
      const artifact = containedPath(artifactRoot, relativeArtifact, { expectedType: 'file' });
      if (digestFile(artifact) !== expectedDigest) issue('artifact-digest-mismatch', `digest mismatch for ${relativeArtifact}`, relativeArtifact);
    } catch (error) { issue('artifact-read', error.message, relativeArtifact); }
  }
  verification.artifacts = errors.some(({ code }) => code.startsWith('artifact-')) ? 'fail' : 'pass';

  const evidencePath = path.join(artifactRoot, 'evidence-manifest.json');
  if (fs.existsSync(evidencePath)) {
    const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    for (const message of validateJsonSchema(evidence, path.join(harnessRoot, 'schemas', 'architecture-pro', 'evidence-manifest.schema.json'), 'evidence')) issue('evidence-schema', message, `${artifactRelative}/evidence-manifest.json`);
    const unsigned = { ...evidence };
    delete unsigned.manifest_digest;
    if (evidence.manifest_digest !== digestValue(unsigned)) issue('evidence-digest', 'manifest_digest does not match the canonical manifest without its digest field', `${artifactRelative}/evidence-manifest.json`);
  } else if (requireComplete) issue('evidence-missing', 'completed runs require evidence-manifest.json', artifactRelative);
  verification.evidence = errors.some(({ code }) => code.startsWith('evidence-')) ? 'fail' : 'pass';

  const tracePath = path.join(artifactRoot, 'run-events.jsonl');
  if (fs.existsSync(tracePath)) {
    const checked = runValidator('validate-workflow-trace.mjs', ['--artifact-root', artifactRoot, '--workflow', 'architecture-pro', '--run-id', state.run_id]);
    if (!checked.passed) issue('trace-invalid', checked.payload.summary, `${artifactRelative}/run-events.jsonl`);
    workflowTrace = { trace_status: checked.payload.trace_status ?? (checked.passed ? 'passed' : 'degraded'), verification: checked.payload.verification, ...(checked.payload.history ? { history: checked.payload.history } : {}) };
    if (checked.passed && workflowTrace.trace_status === 'recovered-with-gaps' && state.workflow_trace?.status !== 'degraded') issue('trace-disclosure', 'recovered history must remain degraded in state, not claimed clean', stateRelative);
  } else if (requireComplete) issue('trace-missing', 'completed runs require run-events.jsonl', artifactRelative);
  verification.trace = errors.some(({ code }) => code.startsWith('trace-')) ? 'fail' : 'pass';

  const handoffRelative = `${artifactRelative}/handoff.json`;
  const handoffPath = path.join(artifactRoot, 'handoff.json');
  if (fs.existsSync(handoffPath)) {
    const handoffArgs = ['--repo-root', repositoryRoot, '--handoff', handoffRelative];
    if (['DESIGN', 'MIXED'].includes(state.mode)) handoffArgs.push('--require-design');
    const checked = runValidator('validate-architecture-handoff.mjs', handoffArgs);
    if (!checked.passed) issue('handoff-invalid', checked.payload.summary, handoffRelative);
  } else if (requireComplete && state.mode !== 'ADR_ONLY') issue('handoff-missing', 'completed non-ADR runs require handoff.json', artifactRelative);
  verification.handoff = errors.some(({ code }) => code.startsWith('handoff-')) ? 'fail' : 'pass';

  if (requireComplete) {
    const requiredPath = contract.modes[state.mode.toLowerCase().replace('_', '-')];
    for (const phase of requiredPath ?? []) {
      const status = state.phases[String(phase)];
      const hardGate = contract.phases.find(({ number }) => number === phase)?.hard_gate;
      if (hardGate ? status !== 'passed' : !['passed', 'waived'].includes(status)) issue('completion-phase', `Phase ${phase} is ${status}`, stateRelative);
    }
    if (['DESIGN', 'MIXED', 'ADR_ONLY'].includes(state.mode) && state.design_certification !== 'DESIGN_CERTIFIED') issue('completion-certification', 'design path is not DESIGN_CERTIFIED', stateRelative);
    if (['AUDIT', 'MIXED'].includes(state.mode) && state.audit_certification !== 'AUDIT_CERTIFIED') issue('completion-certification', 'audit path is not AUDIT_CERTIFIED', stateRelative);
    if (!/^sha256:[a-f0-9]{64}$/.test(state.input_fingerprint?.source_fingerprint_digest ?? '')) issue('completion-fingerprint', 'completed run requires a source fingerprint digest', stateRelative);
    for (const field of ['command_digest', 'governance_skill_digest', 'routing_digest', 'contract_digest']) {
      if (!/^sha256:[a-f0-9]{64}$/.test(state.loaded_contract?.[field] ?? '')) issue('completion-contract', `completed run requires loaded_contract.${field}`, stateRelative);
    }
    if (Number.isNaN(Date.parse(state.loaded_contract?.loaded_at ?? ''))) issue('completion-contract', 'completed run requires loaded_contract.loaded_at', stateRelative);
  }

  const result = errors.length === 0
    ? { status: 'success', summary: `Architecture Pro run packet valid for ${match[1]}`, verification, artifacts: [stateRelative], next_actions: [requireComplete ? 'The packet satisfies structural completion checks; keep current-source verification visible at handoff consumption.' : 'Continue only through a transition allowed by the selected mode.'] }
    : { status: 'error', summary: `${errors.length} Architecture Pro run validation error(s)`, verification, errors, artifacts: [stateRelative], next_actions: ['Repair the packet or mark the affected lane and certification blocked.'] };
  if (workflowTrace) result.workflow_trace = workflowTrace;
  console.log(JSON.stringify(result, null, 2));
  if (errors.length) process.exit(1);
} catch (error) {
  console.log(JSON.stringify({ status: 'error', summary: error.message, verification, errors, artifacts: [], next_actions: ['Provide a contained repository-owned Architecture Pro artifact root.'] }, null, 2));
  process.exit(1);
}
