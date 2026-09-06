#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertJsonSchema } from './lib/json-schema.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const valueFor = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
const workflow = valueFor('--workflow');
const event = valueFor('--event');
const repositoryRoot = valueFor('--repo-root');
const artifactRoot = valueFor('--artifact-root');
const local = args.includes('--local');
const localScope = valueFor('--scope');

try {
  if (!workflow || !event || !repositoryRoot || !artifactRoot) throw new Error('usage: run-workflow-hook.mjs --workflow <name> --event <event> --repo-root <path> --artifact-root <relative-path>');
  if (local && !['review-pro', 'debug-pro'].includes(workflow)) throw new Error('--local is supported only for Review and Debug');
  if ((local || args.includes('--scope')) && (!local || !localScope || localScope.startsWith('--'))) throw new Error('--local requires an independently selected --scope JSON array');
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'hooks', 'registry.json'), 'utf8'));
  assertJsonSchema(registry, path.join(root, 'hooks', 'schema', 'registry.schema.json'), 'hook registry');
  const hook = registry.hooks.find((candidate) => candidate.workflow === workflow && candidate.event === event);
  if (!hook) throw new Error(`no hook registered for ${workflow}:${event}`);
  const variables = { repository_root: repositoryRoot, artifact_root: artifactRoot };
  const results = [];
  let workflowTrace;
  for (const step of hook.steps) {
    const stepArgs = step.arguments.map((argument) => argument.replace(/^\{([^}]+)\}$/, (_, name) => variables[name] ?? argument));
    // Only explicit caller authority propagates; state/packet fields cannot grant it.
    if (local && ['scripts/validate-review-pro-run.mjs', 'scripts/validate-review-handoffs.mjs', 'scripts/validate-review-handoff.mjs', 'scripts/validate-review-resolution.mjs', 'scripts/validate-debug-resolution.mjs'].includes(step.script)) {
      stepArgs.push('--local');
      if (localScope) stepArgs.push('--scope', localScope);
    }
    const result = spawnSync(process.execPath, [path.join(root, step.script), ...stepArgs], { encoding: 'utf8' });
    results.push({ script: step.script, status: result.status });
    let payload;
    try { payload = JSON.parse(result.stdout); } catch {}
    const trace = payload?.workflow_trace ?? (step.script === 'scripts/validate-workflow-trace.mjs' ? {
      trace_status: payload?.trace_status ?? (result.status === 0 ? 'passed' : 'degraded'),
      verification: payload?.verification,
      ...(payload?.history ? { history: payload.history } : {}),
    } : undefined);
    if (trace) workflowTrace = trace;
    if (result.status !== 0) {
      let summary = result.stderr || result.stdout;
      try { summary = JSON.parse(result.stdout).summary; } catch {}
      throw new Error(`${step.script} blocked ${event}: ${summary}`);
    }
  }
  console.log(JSON.stringify({ status: 'success', summary: `${hook.id} passed`, results, ...(workflowTrace ? { workflow_trace: workflowTrace } : {}) }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ status: 'error', summary: error.message, artifacts: [], next_actions: ['Repair the failed contract before continuing the workflow.'] }, null, 2));
  process.exit(1);
}
