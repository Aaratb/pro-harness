#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertJsonSchema } from './lib/json-schema.mjs';
import { canonicalRoot, containedPath } from './lib/repository-paths.mjs';

const harnessRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const valueFor = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
const digestFile = (file) => `sha256:${crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}`;
const errors = [];
const verification = [];
let workflowTrace;
const check = (condition, code, detail) => { verification.push({ code, status: condition ? 'passed' : 'failed', detail }); if (!condition) errors.push(`${code}: ${detail}`); };

try {
  const repositoryRoot = canonicalRoot(valueFor('--repo-root'));
  const artifactInput = valueFor('--artifact-root');
  if (!artifactInput) throw new Error('usage: validate-explainer-pro-run.mjs --repo-root <path> --artifact-root <path> [--require-complete]');
  const artifactRoot = canonicalRoot(path.isAbsolute(artifactInput) ? artifactInput : path.join(repositoryRoot, artifactInput));
  const artifactRelative = path.relative(repositoryRoot, artifactRoot).split(path.sep).join('/');
  check(/^\.agents\/explanations\/[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(artifactRelative), 'artifact-root', 'artifact root must match the repository-owned contract');
  const statePath = containedPath(artifactRoot, 'state.json', { expectedType: 'file' });
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const policy = JSON.parse(fs.readFileSync(path.join(harnessRoot, 'config', 'explainer-pro.json'), 'utf8'));
  assertJsonSchema(state, path.join(harnessRoot, 'schemas', 'explainer-pro', 'state.schema.json'), 'Explainer Pro state');
  check(state.repository_root === repositoryRoot, 'repository-root', 'state repository root must match invocation');
  check(state.artifact_root === artifactRoot, 'state-artifact-root', 'state artifact root must match invocation');
  check(state.slug === path.posix.basename(artifactRelative), 'state-slug', 'state slug must match artifact root');
  for (const transition of state.transition_log) check(policy.phase_transitions[String(transition.from)]?.includes(transition.to), 'transition-illegal', `${transition.from} to ${transition.to} is not allowed`);
  const expectedDigests = {
    command_digest: digestFile(path.join(harnessRoot, 'commands', 'explainer-pro.md')),
    core_skill_digest: digestFile(path.join(harnessRoot, 'skills', 'explainer-core', 'SKILL.md')),
    routing_digest: digestFile(path.join(harnessRoot, 'commands', 'explainer-pro', 'routing.md')),
    contract_digest: digestFile(path.join(harnessRoot, 'commands', 'explainer-pro', 'contract.json')),
  };
  for (const [key, digest] of Object.entries(expectedDigests)) check(state.loaded_contract[key] === digest, 'contract-digest', `${key} must match the installed canonical contract`);
  if (state.current_generation) {
    const pointer = fs.readFileSync(containedPath(artifactRoot, 'CURRENT', { expectedType: 'file' }), 'utf8').trim();
    check(pointer === state.current_generation, 'state-current', 'state and CURRENT must name the same generation');
    const course = spawnSync(process.execPath, [path.join(harnessRoot, 'scripts', 'validate-explainer-course.mjs'), '--repo-root', repositoryRoot, '--artifact-root', artifactRoot], { encoding: 'utf8' });
    check(course.status === 0, 'course-validation', course.status === 0 ? 'current course passed' : JSON.parse(course.stdout || '{}').summary ?? 'course validation failed');
  }
  if (args.includes('--require-complete')) {
    const requiredPhases = state.mode === 'CHANGE' ? [1, 2, 4, 7] : [1, 2, 3, 4, 5, 6, 7];
    for (const phase of requiredPhases) check(state.phases[String(phase)] === 'passed', 'phase-complete', `Phase ${phase} must be passed`);
    check(Boolean(state.current_generation), 'generation-required', 'completed run requires a current generation');
    if (state.current_generation) {
      const manifest = JSON.parse(fs.readFileSync(containedPath(artifactRoot, `generations/${state.current_generation}/manifest.json`, { expectedType: 'file' }), 'utf8'));
      check(manifest.status === 'certified', 'generation-certified', 'completed run requires a certified generation');
      check(['scope', 'limitations', 'static_only'].every((key) => JSON.stringify(manifest.coverage?.[key]) === JSON.stringify(state.coverage[key])), 'coverage-current', 'published generation coverage and limitations must match state at completion');
    }
    const trace = spawnSync(process.execPath, [path.join(harnessRoot, 'scripts', 'validate-workflow-trace.mjs'), '--artifact-root', artifactRoot, '--workflow', 'explainer-pro', '--run-id', state.run_id], { encoding: 'utf8' });
    let traceResult;
    try { traceResult = JSON.parse(trace.stdout || '{}'); } catch { traceResult = { status: 'error', summary: 'workflow trace validator returned invalid output' }; }
    const traceValid = trace.status === 0 && traceResult.status === 'success';
    const recovered = traceResult.trace_status === 'recovered-with-gaps';
    check(traceValid, 'workflow-trace', traceValid ? 'actual trace identity, schema, privacy, and active sequence passed' : traceResult.summary ?? 'workflow trace validation failed');
    if (traceValid) {
      check(state.workflow_trace.status === (recovered ? 'degraded' : 'passed'), 'workflow-trace-state', recovered ? 'recovered history must remain degraded in state' : 'clean validated trace must be passed in state');
      if (recovered) check(state.coverage.limitations.some((limitation) => limitation.includes('recovered-with-gaps')), 'workflow-trace-disclosure', 'coverage must disclose recovered-with-gaps; trace recovery does not certify evidence or approvals');
    }
    workflowTrace = { trace_status: traceValid ? (recovered ? 'recovered-with-gaps' : 'passed') : 'blocked', verification: traceResult.verification ?? null, ...(traceResult.history ? { history: traceResult.history } : {}) };
  }
  console.log(JSON.stringify({ status: errors.length ? 'error' : 'success', summary: errors.length ? `${errors.length} run checks failed` : 'Explainer Pro run state is valid', verification, errors, ...(workflowTrace ? { workflow_trace: workflowTrace } : {}), artifacts: ['state.json'], next_actions: errors.length ? ['Repair state or publish a corrected immutable generation.'] : ['Continue within the validated lifecycle boundary; preserve any disclosed trace limitations.'] }, null, 2));
  if (errors.length) process.exit(1);
} catch (error) {
  console.log(JSON.stringify({ status: 'error', summary: error.message, verification, errors, artifacts: [], next_actions: ['Provide a contained repository-owned Explainer Pro artifact root.'] }, null, 2));
  process.exit(1);
}
