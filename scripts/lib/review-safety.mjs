import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { digestValue } from './digests.mjs';
import { canonicalRoot, containedPath } from './repository-paths.mjs';

const sensitiveKeys = /(?:secret|password|passwd|token|api[_-]?key|authorization|cookie|credential|private[_-]?key|connection[_-]?(?:string|uri)|email|phone|ssn)/i;
const sensitiveValues = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /\b(?:sk|rk|pk)[-_](?:live|test|proj)?[-_A-Za-z0-9]{8,}\b/i,
  /\bwhsec_[A-Za-z0-9]{12,}\b/i,
  /\bnpm_[A-Za-z0-9]{20,}\b/i,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/i,
  /\bgh[oprsu]_[A-Za-z0-9]{12,}\b/i,
  /\bAKIA[A-Z0-9]{16}\b/,
  /\bBearer\s+[^\s,;]+/i,
  /(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis):\/\/[^\s]+/i,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b\d{3}-\d{2}-\d{4}\b/,
  /\b(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*[^\s,;]+/i,
];
const directiveValues = [
  /(?:^|[\n\r])\s*(?:system|assistant|developer|user|human)\s*:/i,
  /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?/i,
  /\bignore\b[^.\n]{0,20}\b(?:all|previous|prior|the above|earlier)\b[^.\n]{0,20}\binstructions?\b/i,
  /\bdisregard\b[^.\n]{0,20}\b(?:all|previous|prior|the above|earlier)\b/i,
  /\byou are now\b/i,
  /\bnew instructions?\s*:/i,
  /<\|im_(?:start|end)\|>|\[\[?system\]?\]|###\s*(?:system|instruction)/i,
  /(?:do not|never)\s+follow\s+(?:the\s+)?(?:system|developer|user)/i,
  /<\/?(?:system|assistant|developer|tool)[^>]*>/i,
];

function visits(value, stringCheck) {
  if (typeof value === 'string') return stringCheck(value);
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some((entry) => visits(entry, stringCheck));
  return Object.entries(value).some(([key, entry]) => sensitiveKeys.test(key) || visits(entry, stringCheck));
}

export function hasSensitiveContent(value) {
  return visits(value, (text) => sensitiveValues.some((pattern) => pattern.test(text)));
}

export function hasDirectiveContent(value) {
  const visit = (member) => {
    if (typeof member === 'string') return directiveValues.some((pattern) => pattern.test(member));
    if (!member || typeof member !== 'object') return false;
    return Object.values(member).some(visit);
  };
  return visit(value);
}

export function contentDigest(value) {
  const canonical = structuredClone(value);
  delete canonical.content_digest;
  return digestValue(canonical);
}

export function withContentDigest(value) {
  return { ...structuredClone(value), content_digest: contentDigest(value) };
}

function readError(code, message) {
  return Object.assign(new Error(message), { code });
}

export function readFileNoFollow(root, relativePath, maxBytes = 2 * 1024 * 1024) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw readError('ELIMIT', 'Read limit must be a positive safe integer');
  if (typeof relativePath !== 'string' || /[\u0000-\u001f\u007f]/.test(relativePath)) throw readError('EPATH', 'File path contains unsupported characters');
  const resolvedRoot = canonicalRoot(root);
  const file = containedPath(resolvedRoot, relativePath, { expectedType: 'file' });
  const before = fs.lstatSync(file);
  if (before.size > maxBytes) throw readError('ESIZE', 'File exceeds the configured read limit');
  const directories = [];
  for (let directory = path.dirname(file); ; directory = path.dirname(directory)) {
    directories.push({ path: directory, stat: fs.lstatSync(directory) });
    if (directory === resolvedRoot) break;
  }
  const sameIdentity = (left, right) => left.dev === right.dev && left.ino === right.ino;
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0) | (fs.constants.O_NONBLOCK ?? 0));
  try {
    const opened = fs.fstatSync(fd);
    if (!opened.isFile() || !sameIdentity(opened, before)) throw readError('EPATH_RACE', 'File identity changed while opening');
    if (opened.size > maxBytes) throw readError('ESIZE', 'File exceeds the configured read limit');
    // Node has no portable descriptor-relative traversal. Rechecking pinned
    // identities detects observed root/parent/leaf replacements, not every ABA race.
    const recheckPath = () => {
      try {
        for (const directory of directories) {
          const current = fs.lstatSync(directory.path);
          if (!current.isDirectory() || current.isSymbolicLink() || !sameIdentity(current, directory.stat)) throw new Error('directory changed');
        }
        const current = fs.lstatSync(containedPath(resolvedRoot, relativePath, { expectedType: 'file' }));
        if (!sameIdentity(current, opened) || fs.realpathSync.native(file) !== file) throw new Error('file changed');
      } catch { throw readError('EPATH_RACE', 'Root, parent or file identity changed during read'); }
    };
    recheckPath();
    const chunks = [];
    let total = 0;
    while (true) {
      const chunk = Buffer.alloc(Math.min(64 * 1024, maxBytes - total + 1));
      const count = fs.readSync(fd, chunk, 0, chunk.length, null);
      if (!count) break;
      total += count;
      if (total > maxBytes) throw readError('ESIZE', 'File exceeded the configured limit while reading');
      chunks.push(chunk.subarray(0, count));
    }
    recheckPath();
    const after = fs.fstatSync(fd);
    if (after.size !== opened.size || after.mtimeMs !== opened.mtimeMs || after.ctimeMs !== opened.ctimeMs) throw readError('EPATH_RACE', 'File changed during read');
    return Buffer.concat(chunks, total);
  } finally {
    fs.closeSync(fd);
  }
}

export function readJsonNoFollow(root, relativePath, maxBytes = 2 * 1024 * 1024) {
  const bytes = readFileNoFollow(root, relativePath, maxBytes);
  try { return JSON.parse(bytes.toString('utf8')); }
  catch { throw readError('EJSON_PARSE', 'File must contain valid JSON'); }
}

export function atomicWriteJson(root, relativePath, value) {
  const target = containedPath(root, relativePath, { allowMissingLeaf: true });
  const temporaryName = `.${path.basename(relativePath)}.${crypto.randomUUID()}.tmp`;
  const temporary = containedPath(root, temporaryName, { allowMissingLeaf: true });
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.chmodSync(temporary, 0o600);
  fs.renameSync(temporary, target);
}
