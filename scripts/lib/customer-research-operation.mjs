// Pure local contract checks only. The host supplies independently trusted
// evidence; this module cannot authenticate consent, identify a real processor,
// inspect the payload behind its digest, or authorize/execute any operation.
// Optional protected-operation proposal check, not a prerequisite for ordinary
// public research already authorized under the owning capability contract.
import { digestValue } from './digests.mjs';

const VERSION = 'customer-backward-pro/operation-request@1';
const SCOPES = Object.freeze(['contact', 'record', 'transcribe', 'transfer', 'publish']);
const OPERATIONS = Object.freeze(['read', 'export', 'market_acquire', ...SCOPES]);
const APPROVAL_STATES = Object.freeze(['approved', 'unavailable', 'declined', 'withdrawn']);
const PERMISSION_STATES = Object.freeze(['granted', 'unavailable', 'declined', 'withdrawn']);
const HISTORY_STATES = Object.freeze(['not_started', 'unknown', 'running', 'partial', 'complete']);
const REQUEST_FIELDS = Object.freeze([
  'version', 'company_id', 'study_id', 'operation_id', 'operation', 'source_id',
  'identity_id', 'tool', 'destination', 'payload_digest', 'participant_data', 'limits', 'permission_requirements',
]);
const EVIDENCE_FIELDS = Object.freeze(['state', 'authority_ref', 'expires_at', 'request_digest']);
const ID_BYTES = 256;
const DESTINATION_BYTES = 1024;

function check(condition) {
  if (!condition) throw new Error('Invalid contract');
}

// Inspect descriptors before reading values. JSON records do not contain
// accessors, hidden/symbol properties, custom prototypes, or serialization hooks.
function record(value, fields) {
  check(value !== null && typeof value === 'object' && !Array.isArray(value));
  const prototype = Object.getPrototypeOf(value);
  check(prototype === Object.prototype || prototype === null);
  const keys = Reflect.ownKeys(value);
  check(keys.length === fields.length && keys.every((key) => fields.includes(key)));
  return Object.fromEntries(fields.map((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    check(descriptor && descriptor.enumerable && Object.hasOwn(descriptor, 'value'));
    return [key, descriptor.value];
  }));
}

function boundedArray(value, maxLength) {
  check(Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype);
  check(value.length <= maxLength && Reflect.ownKeys(value).length === value.length + 1);
  return Array.from({ length: value.length }, (_, index) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    check(descriptor && descriptor.enumerable && Object.hasOwn(descriptor, 'value'));
    return descriptor.value;
  });
}

function text(value, maxBytes = ID_BYTES) {
  check(typeof value === 'string' && value.length > 0 && value.length <= maxBytes);
  check(value.trim().length > 0 && !/[\u0000-\u001f\u007f]/u.test(value));
  // With the Unicode flag, surrogate pairs are single code points; only lone
  // surrogates match this range. Reject lossy UTF-8 replacement before hashing.
  check(!/[\uD800-\uDFFF]/u.test(value) && Buffer.byteLength(value, 'utf8') <= maxBytes);
  return value;
}

function choice(value, allowed) {
  check(allowed.includes(value));
  return value;
}

function digest(value) {
  check(typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value));
  return value;
}

function timestamp(value) {
  check(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value));
  const milliseconds = Date.parse(value);
  check(Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value);
  return value;
}

function nullable(value, validate) {
  return value === null ? null : validate(value);
}

function integer(value, min, max) {
  check(Number.isSafeInteger(value) && !Object.is(value, -0) && value >= min && value <= max);
  return value;
}

function validatedRequest(input) {
  const value = record(input, REQUEST_FIELDS);
  check(value.version === VERSION);
  for (const field of ['company_id', 'study_id', 'operation_id', 'source_id', 'identity_id', 'tool']) {
    value[field] = text(value[field]);
  }
  value.operation = choice(value.operation, OPERATIONS);
  value.payload_digest = digest(value.payload_digest);
  check(typeof value.participant_data === 'boolean');
  value.destination = record(value.destination, ['id', 'external']);
  value.destination.id = text(value.destination.id, DESTINATION_BYTES);
  check(typeof value.destination.external === 'boolean');
  value.limits = record(value.limits, ['max_cost_units', 'max_output_bytes', 'max_duration_ms']);
  integer(value.limits.max_cost_units, 0, 1_000_000_000);
  integer(value.limits.max_output_bytes, 1, 1_000_000_000);
  integer(value.limits.max_duration_ms, 1, 86_400_000);
  value.permission_requirements = boundedArray(value.permission_requirements, SCOPES.length)
    .map((scope) => choice(scope, SCOPES));
  check(new Set(value.permission_requirements).size === value.permission_requirements.length);
  return value;
}

function evidence(input, participant = false) {
  const value = record(input, participant ? ['scope', ...EVIDENCE_FIELDS] : EVIDENCE_FIELDS);
  value.state = choice(value.state, participant ? PERMISSION_STATES : APPROVAL_STATES);
  value.authority_ref = nullable(value.authority_ref, text);
  value.expires_at = nullable(value.expires_at, timestamp);
  value.request_digest = nullable(value.request_digest, digest);
  if (participant) value.scope = choice(value.scope, SCOPES);
  return value;
}

function validatedContext(input) {
  const value = record(input, ['company_id', 'study_id', 'now', 'approval', 'history', 'participant_permissions']);
  value.company_id = text(value.company_id);
  value.study_id = text(value.study_id);
  value.now = timestamp(value.now);
  value.approval = evidence(value.approval);
  value.history = record(value.history, ['operation_id', 'request_digest', 'state']);
  value.history.operation_id = text(value.history.operation_id);
  value.history.request_digest = nullable(value.history.request_digest, digest);
  value.history.state = choice(value.history.state, HISTORY_STATES);
  value.participant_permissions = boundedArray(value.participant_permissions, SCOPES.length)
    .map((entry) => evidence(entry, true));
  check(new Set(value.participant_permissions.map((entry) => entry.scope)).size === value.participant_permissions.length);
  return value;
}

/**
 * Hash the exact validated request (canonical object-key order, exact strings
 * and array order). A payload digest is an opaque host-supplied binding, not
 * proof that any actual payload or approved provider was inspected.
 * Throws only a sanitized INVALID_REQUEST error for unsupported input.
 */
export function digestResearchOperation(request) {
  try {
    return digestValue(validatedRequest(request));
  } catch {
    const error = new Error('Invalid research operation request');
    error.code = 'INVALID_REQUEST';
    throw error;
  }
}

function result(status, code, requestDigest = null) {
  return Object.freeze({ status, code, request_digest: requestDigest,
    execution_allowed: false, validation: 'local_contract_only' });
}

function evidenceFailure(entry, grantedState, now, requestDigest, prefix) {
  if (entry.state !== grantedState || !entry.authority_ref || !entry.expires_at || !entry.request_digest) {
    return `${prefix}_NOT_GRANTED`;
  }
  if (Date.parse(entry.expires_at) <= Date.parse(now)) return `${prefix}_EXPIRED`;
  if (entry.request_digest !== requestDigest) return `${prefix}_MISMATCH`;
  return null;
}

/**
 * Return an inert preflight decision. Request fields are exhaustive above;
 * trustedContext holds independently reviewed company/study, now, organization
 * approval, operation history and distinct participant permission records.
 * The history snapshot must cover this logical operation, including all prior
 * attempts. No prior-state lookup, retry, cancellation, dispatch or I/O occurs.
 * participant_data is an approval-bound host-reviewed assertion, not machine
 * classification. A future adapter must recheck that assertion, current
 * authority and the actual payload/destination before performing any operation.
 */
export function preflightResearchOperation(request, trustedContext) {
  let proposal;
  let context;
  let requestDigest;
  try {
    proposal = validatedRequest(request);
    requestDigest = digestValue(proposal);
  } catch {
    return result('blocked', 'INVALID_REQUEST');
  }
  try {
    context = validatedContext(trustedContext);
  } catch {
    return result('blocked', 'INVALID_CONTEXT', requestDigest);
  }
  const blocked = (code) => result('blocked', code, requestDigest);
  if (proposal.company_id !== context.company_id || proposal.study_id !== context.study_id) {
    return blocked('BOUNDARY_MISMATCH');
  }
  const history = context.history;
  if (history.operation_id !== proposal.operation_id) return blocked('HISTORY_SCOPE_MISMATCH');
  if (['unknown', 'running', 'partial'].includes(history.state)) {
    return result('reconcile', 'EXECUTION_UNCERTAIN', requestDigest);
  }
  if (history.request_digest !== requestDigest) return result('reconcile', 'HISTORY_MISMATCH', requestDigest);
  if (history.state === 'complete') return result('already_completed', 'ALREADY_COMPLETED', requestDigest);

  const approvalFailure = evidenceFailure(context.approval, 'approved', context.now, requestDigest, 'APPROVAL');
  if (approvalFailure) return blocked(approvalFailure);
  if (!proposal.participant_data && ['contact', 'record', 'transcribe'].includes(proposal.operation)) {
    return blocked('PARTICIPANT_DATA_REQUIRED');
  }
  const required = proposal.participant_data && SCOPES.includes(proposal.operation) ? [proposal.operation] : [];
  if (proposal.participant_data && proposal.destination.external) required.push('transfer');
  if (required.some((scope) => !proposal.permission_requirements.includes(scope))) {
    return blocked('PERMISSION_SCOPE_REQUIRED');
  }
  for (const scope of proposal.permission_requirements) {
    const permission = context.participant_permissions.find((entry) => entry.scope === scope);
    if (!permission) return blocked('PERMISSION_REQUIRED');
    const permissionFailure = evidenceFailure(permission, 'granted', context.now, requestDigest, 'PERMISSION');
    if (permissionFailure) return blocked(permissionFailure);
  }
  return result('ready_for_adapter_review', 'READY_FOR_ADAPTER_REVIEW', requestDigest);
}
