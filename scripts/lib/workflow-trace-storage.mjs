import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { canonicalRoot } from './repository-paths.mjs';
import { readFileNoFollow } from './review-safety.mjs';
import { MAX_TRACE_BYTES, schema, validateTrace } from './workflow-trace.mjs';

const ORIGINAL = 'run-events.jsonl';
const CONTINUATION = 'run-events.continuation.jsonl';
const RECOVERY = 'trace-recovery.json';
export const RECOVERABLE_WORKFLOWS = ['feature-pro', 'architecture-pro', 'review-pro', 'explainer-pro'];
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const exists = (root, name) => Boolean(fs.lstatSync(path.join(root, name), {throwIfNoEntry:false}));
const read = (root, name, limit = MAX_TRACE_BYTES) => readFileNoFollow(root, name, limit).toString('utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

export function withTraceLock(root, action) {
  const lockPath = path.join(root, '.run-events.lock');
  const lock = fs.openSync(lockPath, 'wx', 0o600);
  try { return action(); }
  finally {
    const owned = fs.fstatSync(lock);
    fs.closeSync(lock);
    const current = fs.lstatSync(lockPath, {throwIfNoEntry:false});
    if (current && current.dev === owned.dev && current.ino === owned.ino) fs.unlinkSync(lockPath);
  }
}

function recoverableHistory(content, workflow, runId) {
  assert(RECOVERABLE_WORKFLOWS.includes(workflow), 'trace continuation is not supported for this workflow');
  const result = validateTrace(content, {expectedWorkflow:workflow, expectedRunId:runId});
  assert(result.verification.schema === 'pass' && result.verification.privacy === 'pass', 'schema/privacy failures cannot be recovered by trace continuation');
  assert(content.endsWith('\n'), 'incomplete history cannot be recovered');
  const rows = content.trimEnd().split('\n').filter(Boolean).map(line=>JSON.parse(line));
  assert(rows.every(row=>row.workflow === workflow && row.run_id === runId), 'history identity mismatch');
  assert(!rows.some(row=>row.event === 'run-completed'), 'a terminal run cannot be reopened by recovery');
  assert(result.verification.sequence === 'fail', 'recovery requires an existing sequence failure');
  return result;
}

// Recovery selects one explicit continuation. No directory scan, arbitrary file
// selector, historical rewrite, or automatic recovery on validation failure.
export function readTraceBundle(root, options = {}) {
  if (!exists(root, RECOVERY)) {
    assert(!exists(root, CONTINUATION), 'orphan continuation: preserve it and request operator reconciliation');
    const snapshot = fs.lstatSync(path.join(root,ORIGINAL), {throwIfNoEntry:false});
    const content = options.allowMissing && !snapshot ? '' : read(root, ORIGINAL);
    return {activeName:ORIGINAL, content, snapshot, recovery:null, history:null};
  }
  const manifest = JSON.parse(read(root, RECOVERY, 16384));
  const keys = ['version','workflow','run_id','active_path','original_sha256','checkpoint','checkpoint_sha256','started_at','approval','anchor_sha256'];
  assert(manifest && typeof manifest === 'object' && !Array.isArray(manifest) && Object.keys(manifest).length === keys.length && keys.every(key=>Object.hasOwn(manifest,key)), 'invalid recovery manifest shape');
  assert(manifest.version === 1 && manifest.active_path === CONTINUATION, 'invalid recovery manifest version or active path');
  for (const key of ['original_sha256','checkpoint_sha256','anchor_sha256']) assert(typeof manifest[key] === 'string' && /^[a-f0-9]{64}$/.test(manifest[key]), 'invalid recovery digest');
  assert(typeof manifest.approval === 'string' && manifest.approval.trim().length > 0 && manifest.approval.length <= 200, 'recovery approval is required');
  assert(typeof manifest.checkpoint === 'string' && manifest.checkpoint.endsWith('.md'), 'checkpoint must be a separate Markdown reconciliation report');
  if (options.expectedWorkflow) assert(manifest.workflow === options.expectedWorkflow, 'recovery workflow mismatch');
  if (options.expectedRunId) assert(manifest.run_id === options.expectedRunId, 'recovery run identity mismatch');
  const originalBytes = readFileNoFollow(root, ORIGINAL, MAX_TRACE_BYTES);
  const original = originalBytes.toString('utf8');
  assert(digest(originalBytes) === manifest.original_sha256, 'preserved history digest mismatch');
  const history = recoverableHistory(original, manifest.workflow, manifest.run_id);
  assert(digest(readFileNoFollow(root, manifest.checkpoint, 262144)) === manifest.checkpoint_sha256, 'checkpoint digest mismatch');
  const snapshot = fs.lstatSync(path.join(root,CONTINUATION));
  const bytes = readFileNoFollow(root, CONTINUATION, MAX_TRACE_BYTES);
  const content = bytes.toString('utf8');
  const firstBytes = bytes.subarray(0, bytes.indexOf(10) + 1);
  const firstLine = firstBytes.toString('utf8');
  assert(firstLine.length > 0 && digest(firstBytes) === manifest.anchor_sha256, 'continuation anchor mismatch');
  const first = JSON.parse(firstLine);
  assert(first.event === 'run-started' && first.status === 'degraded' && first.workflow === manifest.workflow && first.run_id === manifest.run_id && first.occurred_at === manifest.started_at && first.summary === `Trace-only continuation approved: ${manifest.approval}` && JSON.stringify(first.artifacts) === JSON.stringify([ORIGINAL,manifest.checkpoint]), 'invalid continuation anchor');
  assert(validateTrace(firstLine).errors.length === 0, 'invalid continuation approval event');
  return {activeName:CONTINUATION, content, snapshot, recovery:manifest, history:{verification:history.verification, event_count:history.eventCount, errors:history.errors}};
}

export function recoverTrace(rootInput, {workflow, runId, checkpoint, approval}) {
  const root = canonicalRoot(rootInput);
  assert(typeof approval === 'string' && approval.trim().length > 0 && approval.length <= 200, 'explicit user/operator approval is required (maximum 200 characters)');
  assert(typeof checkpoint === 'string' && checkpoint.endsWith('.md'), 'a separate Markdown checkpoint reconciliation report is required');
  return withTraceLock(root, () => {
    assert(!exists(root, RECOVERY) && !exists(root, CONTINUATION), 'recovery output already exists; never overwrite it');
    const identity = fs.lstatSync(root);
    const originalBytes = readFileNoFollow(root, ORIGINAL, MAX_TRACE_BYTES);
    const original = originalBytes.toString('utf8');
    recoverableHistory(original, workflow, runId);
    const checkpointBytes = readFileNoFollow(root, checkpoint, 262144);
    assert(checkpointBytes.toString('utf8').trim().length > 0, 'checkpoint report must not be empty');
    const started = new Date().toISOString();
    const anchor = {schema_version:schema.properties.schema_version.const,event_id:crypto.randomUUID(),run_id:runId,workflow,event:'run-started',status:'degraded',occurred_at:started,summary:`Trace-only continuation approved: ${approval}`,artifacts:[ORIGINAL,checkpoint]};
    const line = JSON.stringify(anchor)+'\n';
    assert(validateTrace(line).errors.length === 0, 'invalid or sensitive recovery inputs');
    const manifest = {version:1,workflow,run_id:runId,active_path:CONTINUATION,original_sha256:digest(originalBytes),checkpoint,checkpoint_sha256:digest(checkpointBytes),started_at:started,approval,anchor_sha256:digest(line)};
    const writeNew = (name, bytes) => {
      const file = path.join(root,name);
      const fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
      try {
        const now = fs.lstatSync(root), opened=fs.fstatSync(fd), current=fs.lstatSync(file);
        assert(now.isDirectory() && !now.isSymbolicLink() && now.dev === identity.dev && now.ino === identity.ino && canonicalRoot(root) === root && current.dev === opened.dev && current.ino === opened.ino && !current.isSymbolicLink(), 'recovery output identity changed');
        fs.writeFileSync(fd,bytes,'utf8');
        fs.fsyncSync(fd);
      } finally { fs.closeSync(fd); }
    };
    // The manifest is the commit marker. A crash leaves explicit, fail-closed
    // partial output; neither readers nor a retry silently discard that evidence.
    assert(readFileNoFollow(root,ORIGINAL,MAX_TRACE_BYTES).equals(originalBytes) && readFileNoFollow(root,checkpoint,262144).equals(checkpointBytes), 'recovery inputs changed');
    writeNew(CONTINUATION,line);
    writeNew(RECOVERY,JSON.stringify(manifest,null,2)+'\n');
    return readTraceBundle(root,{expectedWorkflow:workflow,expectedRunId:runId});
  });
}
