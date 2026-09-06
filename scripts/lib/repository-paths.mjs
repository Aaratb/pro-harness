import fs from 'node:fs';
import path from 'node:path';

export function canonicalRoot(root) {
  if (typeof root !== 'string' || root.length === 0 || root.includes('\0')) throw new Error('artifact root must be a non-empty path');
  const absolute = path.resolve(root);
  const stat = fs.lstatSync(absolute);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('artifact root must be a real directory');
  return fs.realpathSync.native(absolute);
}

export function assertRelativePath(relativePath) {
  if (typeof relativePath !== 'string' || relativePath.length === 0 || relativePath.includes('\0') || relativePath.includes('\\')) throw new Error('path must be a non-empty portable relative path');
  if (path.isAbsolute(relativePath) || path.win32.isAbsolute(relativePath)) throw new Error('absolute paths are forbidden');
  const parts = relativePath.split('/');
  if (parts.some((part) => part === '' || part === '.' || part === '..')) throw new Error('dot, parent, or empty path components are forbidden');
  return parts;
}

function containedPathFromCanonicalRoot(resolvedRoot, relativePath, { allowMissingLeaf = false, expectedType = null } = {}) {
  const parts = assertRelativePath(relativePath);
  let cursor = resolvedRoot;
  for (let index = 0; index < parts.length; index += 1) {
    cursor = path.join(cursor, parts[index]);
    let stat;
    try {
      stat = fs.lstatSync(cursor);
    } catch (error) {
      if (error.code === 'ENOENT' && allowMissingLeaf && index === parts.length - 1) return cursor;
      throw error;
    }
    if (stat.isSymbolicLink()) throw new Error(`symlinked path component is forbidden: ${parts.slice(0, index + 1).join('/')}`);
    if (index < parts.length - 1 && !stat.isDirectory()) throw new Error(`non-directory path component: ${parts.slice(0, index + 1).join('/')}`);
    if (index === parts.length - 1 && expectedType === 'file' && !stat.isFile()) throw new Error('path must resolve to a regular file');
    if (index === parts.length - 1 && expectedType === 'directory' && !stat.isDirectory()) throw new Error('path must resolve to a directory');
  }
  return cursor;
}

export function createExistingContainedPathResolver(root) {
  const resolvedRoot = canonicalRoot(root);
  const recordDirectory = (physicalPath, label) => {
    const stat = fs.lstatSync(physicalPath);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`${label} must resolve to a real directory`);
    return { physicalPath, device: stat.dev, inode: stat.ino };
  };
  const resolvedDirectories = new Map([['', recordDirectory(resolvedRoot, 'root path')]]);
  return (relativePath, { expectedType = null } = {}) => {
    const parts = assertRelativePath(relativePath);
    const parentParts = parts.slice(0, -1);
    const parentKey = parentParts.join('/');
    let parentRecord = resolvedDirectories.get(parentKey);
    if (!parentRecord) {
      const physicalParent = fs.realpathSync.native(path.join(resolvedRoot, ...parentParts));
      const relativeParent = path.relative(resolvedRoot, physicalParent);
      if (path.isAbsolute(relativeParent) || relativeParent === '..' || relativeParent.startsWith(`..${path.sep}`)) {
        throw new Error(`path escapes root: ${relativePath}`);
      }
      parentRecord = recordDirectory(physicalParent, 'parent path');
      resolvedDirectories.set(parentKey, parentRecord);
    } else {
      const current = fs.lstatSync(parentRecord.physicalPath);
      if (current.isSymbolicLink() || !current.isDirectory() || current.dev !== parentRecord.device || current.ino !== parentRecord.inode) {
        throw new Error(`directory changed during validation: ${parentKey || '.'}`);
      }
    }
    const physicalPath = path.join(parentRecord.physicalPath, parts.at(-1));
    const stat = fs.lstatSync(physicalPath);
    if (stat.isSymbolicLink()) throw new Error(`symlinked path is forbidden: ${relativePath}`);
    if (expectedType === 'file' && !stat.isFile()) throw new Error('path must resolve to a regular file');
    if (expectedType === 'directory' && !stat.isDirectory()) throw new Error('path must resolve to a directory');
    if (stat.isDirectory()) {
      resolvedDirectories.set(parts.join('/'), { physicalPath, device: stat.dev, inode: stat.ino });
    }
    return physicalPath;
  };
}

export function containedPath(root, relativePath, options = {}) {
  return containedPathFromCanonicalRoot(canonicalRoot(root), relativePath, options);
}

export function ensureContainedDirectory(root, relativeDirectory) {
  const resolvedRoot = canonicalRoot(root);
  const parts = assertRelativePath(relativeDirectory);
  let cursor = resolvedRoot;
  for (const part of parts) {
    cursor = path.join(cursor, part);
    try {
      fs.mkdirSync(cursor, { mode: 0o700 });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
    const stat = fs.lstatSync(cursor);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`artifact directory is not a real directory: ${part}`);
  }
  return cursor;
}
