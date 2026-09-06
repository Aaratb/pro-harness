// This is a pure contract check over host-supplied snapshots, not an access broker.
// Source locators are inert strings. No filesystem reader or dispatch function is used.
import fs from 'node:fs';
import { digestBytes } from './digests.mjs';

// Static, harness-owned routing data; no caller/source locator is opened.
const { capability_routes } = JSON.parse(fs.readFileSync(
  new URL('../../commands/customer-backward-pro/contract.json', import.meta.url), 'utf8'));
const ROUTES = new Map(capability_routes.map(route => [route.selector, route]));
const isSha256Digest = value => typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value);
const CEILINGS = Object.freeze({ max_sources: 256, max_source_bytes: 262144, max_packet_bytes: 2097152 });
const REGISTRY_LIMIT = 1024;

function reject(code) {
  const error = new Error(`Customer research packet rejected (${code}).`);
  error.name = 'CustomerResearchPacketError';
  error.code = code;
  throw error;
}

function object(value, required, optional = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) reject('ESHAPE');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).some(key => typeof key !== 'string'
      || !('value' in descriptors[key]) || !descriptors[key].enumerable
      || ![...required, ...optional].includes(key))
      || required.some(key => !Object.hasOwn(value, key))) reject('ESHAPE');
}

function text(value, max = 1024, allowEmpty = false) {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())
      || Buffer.byteLength(value, 'utf8') > max || /[\uD800-\uDFFF]/u.test(value)) reject('ESHAPE');
}

function id(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(value)) reject('ESHAPE');
}

function list(value, max, check) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype
      || value.length > max) reject('ESHAPE');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.length !== value.length + 1 || keys.some(key => key !== 'length'
      && (typeof key !== 'string' || !/^(0|[1-9][0-9]*)$/.test(key)
        || Number(key) >= value.length || !('value' in descriptors[key])))) reject('ESHAPE');
  for (let index = 0; index < value.length; index++) check(descriptors[index].value);
}

function ids(value, max = REGISTRY_LIMIT) {
  list(value, max, id);
  if (new Set(value).size !== value.length) reject('ESOURCES');
}

function limits(value) {
  object(value, Object.keys(CEILINGS));
  for (const [name, ceiling] of Object.entries(CEILINGS)) {
    if (!Number.isSafeInteger(value[name]) || value[name] < 1 || value[name] > ceiling) reject('ELIMIT');
  }
}

function sourceShape(source) {
  object(source, ['id', 'company_id', 'study_id', 'kind', 'availability', 'medium',
    'completeness', 'data_class', 'restrictions', 'derived_from', 'supersedes'],
  ['content', 'sha256', 'unavailable_reason', 'locator']);
  for (const field of ['id', 'company_id', 'study_id', 'data_class']) id(source[field]);
  if (!['original', 'derivative', 'candidate', 'correction'].includes(source.kind)
      || !['supplied', 'unavailable'].includes(source.availability)
      || !['complete', 'partial', 'unknown'].includes(source.completeness)) reject('ESHAPE');
  text(source.medium, 128);
  list(source.restrictions, 32, entry => text(entry));
  ids(source.derived_from); ids(source.supersedes);
  if (Object.hasOwn(source, 'locator')) text(source.locator, 4096);
  if (source.availability === 'supplied') {
    // Strings are immutable; Buffers, getters and other executable objects are not inputs.
    if (typeof source.content !== 'string' || !isSha256Digest(source.sha256)
        || Object.hasOwn(source, 'unavailable_reason')) reject('ESHAPE');
  } else {
    text(source.unavailable_reason);
    if (Object.hasOwn(source, 'content') || Object.hasOwn(source, 'sha256')) reject('ESHAPE');
  }
}

function validateContext(context) {
  object(context, ['company_id', 'study_id', 'allowed_roles', 'allowed_research_modes', 'allowed_source_ids',
    'allowed_data_classes', 'limits', 'sources']);
  id(context.company_id); id(context.study_id);
  ids(context.allowed_roles); ids(context.allowed_research_modes);
  ids(context.allowed_source_ids); ids(context.allowed_data_classes);
  limits(context.limits);
  list(context.sources, REGISTRY_LIMIT, sourceShape);
  const registry = new Map();
  for (const source of context.sources) {
    if (registry.has(source.id)) reject('ESOURCES');
    if (source.company_id !== context.company_id || source.study_id !== context.study_id) reject('ESCOPE');
    registry.set(source.id, source);
  }
  for (const allowed of context.allowed_source_ids) if (!registry.has(allowed)) reject('ESOURCES');
  return registry;
}

function validateRequest(request, context) {
  object(request, ['version', 'company_id', 'study_id', 'role', 'research_mode', 'skill', 'task', 'source_refs']);
  if (request.version !== 'customer-backward-pro/packet-request@2') reject('ESHAPE');
  for (const field of ['company_id', 'study_id', 'role', 'research_mode', 'skill']) id(request[field]);
  text(request.task, 16384);
  const route = ROUTES.get(request.research_mode);
  if (request.company_id !== context.company_id || request.study_id !== context.study_id
      || !context.allowed_roles.includes(request.role)
      || !context.allowed_research_modes.includes(request.research_mode)
      || route?.agent !== request.role || route?.skill !== request.skill) reject('ESCOPE');
  list(request.source_refs, REGISTRY_LIMIT, ref => {
    object(ref, ['id', 'sha256']); id(ref.id);
    if (ref.sha256 !== null && !isSha256Digest(ref.sha256)) reject('ESHAPE');
  });
  if (request.source_refs.length > context.limits.max_sources) reject('ELIMIT');
  const selected = new Set(request.source_refs.map(ref => ref.id));
  if (selected.size !== request.source_refs.length) reject('ESOURCES');
  return selected;
}

function checkGraph(registry, selected) {
  // Iterative topological walk bounds stack usage, including malformed cyclic input.
  const pending = new Map();
  const dependents = new Map();
  for (const source of registry.values()) {
    const parents = new Set([...source.derived_from, ...source.supersedes]);
    pending.set(source.id, parents.size);
    for (const parent of parents) {
      if (!registry.has(parent) || parent === source.id) reject('ELINEAGE');
      if (!dependents.has(parent)) dependents.set(parent, []);
      dependents.get(parent).push(source.id);
      if (selected.has(source.id) && !selected.has(parent)) reject('ELINEAGE');
    }
    if (!selected.has(source.id) && source.supersedes.some(parent => selected.has(parent))) reject('ECORRECTION');
  }
  const ready = [...pending].filter(([, count]) => count === 0).map(([key]) => key);
  for (let cursor = 0; cursor < ready.length; cursor++) {
    for (const child of dependents.get(ready[cursor]) || []) {
      pending.set(child, pending.get(child) - 1);
      if (pending.get(child) === 0) ready.push(child);
    }
  }
  if (ready.length !== registry.size) reject('ELINEAGE');
}

function copySources(request, context, registry) {
  let totalBytes = 0;
  return request.source_refs.map(ref => {
    const source = registry.get(ref.id);
    if (!source) reject('ESOURCES');
    if (!context.allowed_source_ids.includes(ref.id)
        || !context.allowed_data_classes.includes(source.data_class)) reject('ESCOPE');
    if (source.availability === 'supplied') {
      const byteLength = Buffer.byteLength(source.content, 'utf8');
      totalBytes += byteLength;
      if (byteLength > context.limits.max_source_bytes || totalBytes > context.limits.max_packet_bytes) reject('ELIMIT');
      if (/[\uD800-\uDFFF]/u.test(source.content)) reject('ESHAPE');
      if (ref.sha256 !== source.sha256 || digestBytes(source.content) !== source.sha256) reject('EDIGEST');
    } else if (ref.sha256 !== null) reject('EDIGEST');
    return { ...source, restrictions: [...source.restrictions], derived_from: [...source.derived_from], supersedes: [...source.supersedes] };
  });
}

function deepFreeze(value) {
  for (const item of Object.values(value)) if (item && typeof item === 'object') deepFreeze(item);
  return Object.freeze(value);
}

/**
 * Prepare a worker-packet@2 from packet-request@2 plus an independently reviewed
 * host context. The exact research_mode/skill/role triple must match the command
 * contract, and the host must explicitly allow both the actor and research mode.
 * Invocation performs no I/O or dispatch. Digests bind supplied bytes, not truth,
 * consent, source independence or tenant identity. The caller separately supplies
 * the worker's artifact_root; this evidence packet never grants artifact writes.
 * Inputs are parsed JSON or trusted plain data; hostile Proxies are out of scope.
 */
export function prepareResearchPacket(request, context) {
  const registry = validateContext(context);
  const selected = validateRequest(request, context);
  // Check selection before graph coverage to report unknown IDs independently of lineage.
  for (const sourceId of selected) if (!registry.has(sourceId)) reject('ESOURCES');
  checkGraph(registry, selected);
  const packet = {
    version: 'customer-backward-pro/worker-packet@2',
    company_id: context.company_id, study_id: context.study_id,
    role: request.role, research_mode: request.research_mode, skill: request.skill, task: request.task,
    validation: 'local_contract_only', execution_allowed: false,
    independence: 'not_verified_by_validator',
    sources: copySources(request, context, registry),
  };
  if (Buffer.byteLength(JSON.stringify(packet), 'utf8') > context.limits.max_packet_bytes) reject('ELIMIT');
  return deepFreeze(packet);
}
