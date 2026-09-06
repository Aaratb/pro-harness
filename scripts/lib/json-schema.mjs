import fs from 'node:fs';
import path from 'node:path';

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function valueType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  if (typeof value === 'number') return 'number';
  return typeof value;
}

function acceptsType(value, expected) {
  const actual = valueType(value);
  if (expected === 'number') return actual === 'number' || actual === 'integer';
  return actual === expected;
}

function pointer(document, fragment) {
  if (!fragment || fragment === '#') return document;
  if (!fragment.startsWith('#/')) throw new Error(`unsupported schema reference fragment ${fragment}`);
  return fragment.slice(2).split('/').reduce((cursor, token) => {
    const key = token.replace(/~1/g, '/').replace(/~0/g, '~');
    if (!cursor || !Object.hasOwn(cursor, key)) throw new Error(`unresolved schema reference ${fragment}`);
    return cursor[key];
  }, document);
}

function loadReference(reference, currentFile, cache) {
  const separator = reference.indexOf('#');
  const filePart = separator >= 0 ? reference.slice(0, separator) : reference;
  const fragment = separator >= 0 ? reference.slice(separator) : '';
  const targetFile = filePart ? path.resolve(path.dirname(currentFile), filePart) : currentFile;
  let document = cache.get(targetFile);
  if (!document) {
    document = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
    cache.set(targetFile, document);
  }
  return { schema: pointer(document, fragment), file: targetFile };
}

function validateNode(value, schema, label, currentFile, cache, errors) {
  if (typeof value === 'number' && !Number.isFinite(value)) { errors.push(`${label}: number must be finite`); return; }
  if (schema === true) return;
  if (schema === false) { errors.push(`${label}: rejected by schema`); return; }
  if (schema.$ref) {
    const target = loadReference(schema.$ref, currentFile, cache);
    validateNode(value, target.schema, label, target.file, cache, errors);
    return;
  }
  if (schema.const !== undefined && !sameValue(value, schema.const)) errors.push(`${label}: must equal ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.some((candidate) => sameValue(value, candidate))) errors.push(`${label}: must be one of ${schema.enum.map(JSON.stringify).join(', ')}`);

  const expectedTypes = schema.type === undefined ? [] : Array.isArray(schema.type) ? schema.type : [schema.type];
  if (expectedTypes.length && !expectedTypes.some((expected) => acceptsType(value, expected))) {
    errors.push(`${label}: expected ${expectedTypes.join(' or ')}, received ${valueType(value)}`);
    return;
  }

  for (const branch of schema.allOf ?? []) validateNode(value, branch, label, currentFile, cache, errors);
  if (schema.anyOf) {
    const passes = schema.anyOf.some((branch) => {
      const branchErrors = [];
      validateNode(value, branch, label, currentFile, cache, branchErrors);
      return branchErrors.length === 0;
    });
    if (!passes) errors.push(`${label}: does not match any allowed schema`);
  }
  if (schema.oneOf) {
    const matches = schema.oneOf.filter((branch) => {
      const branchErrors = [];
      validateNode(value, branch, label, currentFile, cache, branchErrors);
      return branchErrors.length === 0;
    }).length;
    if (matches !== 1) errors.push(`${label}: must match exactly one schema, matched ${matches}`);
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${label}: shorter than ${schema.minLength}`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${label}: longer than ${schema.maxLength}`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${label}: does not match ${schema.pattern}`);
    if (schema.format === 'date-time' && Number.isNaN(Date.parse(value))) errors.push(`${label}: invalid date-time`);
    if (schema.format === 'uuid' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) errors.push(`${label}: invalid uuid`);
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${label}: less than ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${label}: greater than ${schema.maximum}`);
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${label}: fewer than ${schema.minItems} items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${label}: more than ${schema.maxItems} items`);
    if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) errors.push(`${label}: items must be unique`);
    if (schema.items) value.forEach((item, index) => validateNode(item, schema.items, `${label}[${index}]`, currentFile, cache, errors));
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value);
    if (schema.minProperties !== undefined && keys.length < schema.minProperties) errors.push(`${label}: fewer than ${schema.minProperties} properties`);
    if (schema.maxProperties !== undefined && keys.length > schema.maxProperties) errors.push(`${label}: more than ${schema.maxProperties} properties`);
    for (const key of schema.required ?? []) if (!Object.hasOwn(value, key)) errors.push(`${label}: missing ${key}`);
    if (schema.propertyNames) for (const key of keys) validateNode(key, schema.propertyNames, `${label}{property ${key}}`, currentFile, cache, errors);
    const known = new Set(Object.keys(schema.properties ?? {}));
    for (const [key, child] of Object.entries(value)) {
      if (known.has(key)) validateNode(child, schema.properties[key], `${label}.${key}`, currentFile, cache, errors);
      else if (schema.additionalProperties === false) errors.push(`${label}: unknown property ${key}`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') validateNode(child, schema.additionalProperties, `${label}.${key}`, currentFile, cache, errors);
    }
  }
}

export function validateJsonSchema(value, schemaFile, label = '$') {
  const absoluteSchema = path.resolve(schemaFile);
  const schema = JSON.parse(fs.readFileSync(absoluteSchema, 'utf8'));
  const cache = new Map([[absoluteSchema, schema]]);
  const errors = [];
  validateNode(value, schema, label, absoluteSchema, cache, errors);
  return errors;
}

export function assertJsonSchema(value, schemaFile, label = '$') {
  const errors = validateJsonSchema(value, schemaFile, label);
  if (errors.length) throw new Error(errors.join('\n'));
}
