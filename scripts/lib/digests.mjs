import crypto from 'node:crypto';
import fs from 'node:fs';

export function canonicalize(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

export function digestValue(value) {
  return digestBytes(JSON.stringify(canonicalize(value)));
}

export function digestBytes(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

export function digestFile(filePath) {
  return digestBytes(fs.readFileSync(filePath));
}
