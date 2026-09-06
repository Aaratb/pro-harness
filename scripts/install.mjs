#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateRuntimeAdapters } from './lib/runtime-adapters.mjs';
import { configureMcps } from './lib/mcp-configuration.mjs';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argumentsList = process.argv.slice(2);

function valueFor(flag, fallback) {
  const index = argumentsList.indexOf(flag);
  return index >= 0 ? argumentsList[index + 1] : fallback;
}

function fail(summary, nextActions) {
  console.error('status=error');
  console.error(`summary=${summary}`);
  console.error(`next_actions=${nextActions}`);
  process.exit(1);
}

function exists(file) {
  try {
    fs.lstatSync(file);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function isEmptyDirectory(directory) {
  return fs.statSync(directory).isDirectory() && fs.readdirSync(directory).length === 0;
}

function namesIn(directory, predicate) {
  return fs.readdirSync(directory, { withFileTypes: true }).filter(predicate).map((entry) => entry.name).sort();
}

function plannedLinks(adapterRoot, home, runtimes) {
  const skillNames = namesIn(path.join(sourceRoot, 'skills'), (entry) => entry.isDirectory() && fs.existsSync(path.join(sourceRoot, 'skills', entry.name, 'SKILL.md')));
  const agentNames = namesIn(path.join(sourceRoot, 'agents', 'definitions'), (entry) => entry.isFile() && entry.name.endsWith('.json')).map((name) => name.slice(0, -5));
  const commandNames = namesIn(path.join(sourceRoot, 'commands'), (entry) => entry.isFile() && entry.name.endsWith('.md')).map((name) => name.slice(0, -3));
  const links = [];
  if (runtimes.includes('claude')) {
    for (const name of skillNames) links.push([path.join(adapterRoot, 'claude', 'skills', name), path.join(home, '.claude', 'skills', name)]);
    for (const name of agentNames) links.push([path.join(adapterRoot, 'claude', 'agents', `${name}.md`), path.join(home, '.claude', 'agents', `${name}.md`)]);
    for (const name of commandNames) links.push([path.join(adapterRoot, 'claude', 'commands', `${name}.md`), path.join(home, '.claude', 'commands', `${name}.md`)]);
  }
  if (runtimes.includes('cursor')) {
    for (const name of skillNames) links.push([path.join(adapterRoot, 'cursor', 'skills', name), path.join(home, '.cursor', 'skills', name)]);
    for (const name of agentNames) links.push([path.join(adapterRoot, 'cursor', 'agents', `${name}.md`), path.join(home, '.cursor', 'agents', `${name}.md`)]);
    for (const name of commandNames) links.push([path.join(adapterRoot, 'cursor', 'commands', `${name}.md`), path.join(home, '.cursor', 'commands', `${name}.md`)]);
  }
  if (runtimes.includes('codex')) {
    const codexSkillNames = new Set([...skillNames, ...commandNames]);
    for (const name of [...codexSkillNames].sort()) links.push([path.join(adapterRoot, 'codex', 'skills', name), path.join(home, '.codex', 'skills', name)]);
    for (const name of agentNames) links.push([path.join(adapterRoot, 'codex', 'agents', `${name}.toml`), path.join(home, '.codex', 'agents', `${name}.toml`)]);
  }
  return links;
}

function preflightTarget(target, mode) {
  if (!exists(target)) return;
  if (fs.lstatSync(target).isSymbolicLink()) {
    if (mode === 'link' && fs.realpathSync(target) === sourceRoot) return;
    fail(`${target} is already a symlink to ${fs.realpathSync(target)}`, 'Move the existing link aside, then rerun with --mode link or use a separate --target.');
  }
  if (mode === 'link' && !isEmptyDirectory(target)) fail(`${target} is a non-empty directory`, 'Choose copy mode, a separate --target, or move the directory aside before link mode.');
  if (isEmptyDirectory(target)) return;
  if (!fs.existsSync(path.join(target, '.pro-harness-install.json'))) {
    fail(`${target} is non-empty and is not managed by Pro Harness`, 'Choose another --target or move the existing directory aside.');
  }
}

function preflightLinks(links, target) {
  for (const [source, destination] of links) {
    const parent = path.dirname(destination);
    if (exists(parent) && fs.lstatSync(parent).isSymbolicLink()) {
      fail(`${parent} is a whole-directory symlink`, 'Replace the legacy directory link with a real directory so Pro Harness can install non-destructive per-item links.');
    }
    if (!exists(destination)) continue;
    if (fs.lstatSync(destination).isSymbolicLink()) {
      const resolved = path.resolve(path.dirname(destination), fs.readlinkSync(destination));
      if (resolved === source || resolved.startsWith(`${target}${path.sep}`)) continue;
    }
    fail(`refusing to replace unmanaged runtime entry ${destination}`, 'Move the conflicting entry aside or install only the non-conflicting runtimes.');
  }
}

function copyHarness(target) {
  let backup;
  if (exists(target)) {
    if (isEmptyDirectory(target)) fs.rmdirSync(target);
    else {
      backup = `${target}.backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
      fs.renameSync(target, backup);
    }
  }
  fs.cpSync(sourceRoot, target, {
    recursive: true,
    filter: (source) => {
      if (path.basename(source) === '.DS_Store') return false;
      return !['.git', 'node_modules', '.runtime-adapters', 'adapters/generated'].some((segment) => source === path.join(sourceRoot, segment) || source.startsWith(`${path.join(sourceRoot, segment)}${path.sep}`));
    }
  });
  fs.writeFileSync(path.join(target, '.pro-harness-install.json'), `${JSON.stringify({ schema_version: 1, installed_at: new Date().toISOString() }, null, 2)}\n`, 'utf8');
  return backup;
}

function installLinks(links) {
  for (const [source, destination] of links) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (exists(destination)) fs.unlinkSync(destination);
    fs.symlinkSync(source, destination, fs.statSync(source).isDirectory() ? 'dir' : 'file');
  }
}

function isExactLink(destination, source) {
  return exists(destination) && fs.lstatSync(destination).isSymbolicLink()
    && path.resolve(path.dirname(destination), fs.readlinkSync(destination)) === source;
}

function plannedCodemapRename(adapterRoot, home, runtimes, previousAdapters) {
  if (!Array.isArray(previousAdapters?.commands) || !previousAdapters.commands.includes('workspace-codemap')) return [];
  const retired = [];
  for (const runtime of ['claude', 'codex', 'cursor']) {
    const suffix = runtime === 'codex' ? ['skills', 'workspace-codemap'] : ['commands', 'workspace-codemap.md'];
    const source = path.join(adapterRoot, runtime, ...suffix);
    const destination = path.join(home, `.${runtime}`, ...suffix);
    if (!isExactLink(destination, source)) continue;
    if (!runtimes.includes(runtime)) fail(`the command rename also requires updating ${runtime}`, 'Include every runtime with an installed workspace-codemap command so its replacement is installed before retiring the old link.');
    retired.push([source, destination]);
  }
  return retired;
}

const home = path.resolve(valueFor('--home', os.homedir()));
const target = path.resolve(valueFor('--target', path.join(home, '.agents')));
if (/[\r\n`]/.test(target)) fail('installation target must be a single-line path without backticks', 'Choose another --target; spaces are supported.');
const mode = valueFor('--mode', 'copy');
if (!['copy', 'link'].includes(mode)) fail(`unsupported install mode: ${mode}`, 'Use --mode copy or --mode link.');
const adapterRoot = mode === 'copy' ? path.join(target, 'adapters', 'generated') : path.join(home, '.pro-harness', 'runtime-adapters');
const runtimes = valueFor('--runtimes', 'claude,codex,cursor').split(',').filter(Boolean);
const unsupported = runtimes.filter((runtime) => !['claude', 'codex', 'cursor'].includes(runtime));
if (unsupported.length) fail(`unsupported runtimes: ${unsupported.join(', ')}`, 'Use a comma-separated subset of claude,codex,cursor.');
if (target === sourceRoot || target.startsWith(`${sourceRoot}${path.sep}`)) fail('installation target must be outside the source tree', 'Use the default ~/.agents target or another external directory.');

const links = plannedLinks(adapterRoot, home, runtimes);
preflightTarget(target, mode);
preflightLinks(links, target);
const previousManifest = path.join(adapterRoot, 'manifest.json');
const previousAdapters = exists(path.join(adapterRoot, '.pro-harness-generated.json')) && exists(previousManifest)
  ? JSON.parse(fs.readFileSync(previousManifest, 'utf8')) : undefined;
const previousRoot = previousAdapters?.canonical_root === '~/.agents' ? path.join(home, '.agents') : previousAdapters?.canonical_root;
if (mode === 'link' && previousRoot && previousRoot !== target) {
  fail(`generated link-mode adapters are already bound to ${previousRoot}`, 'Reuse that --target or choose an isolated --home; do not retarget another runtime implicitly.');
}
const retiredLinks = plannedCodemapRename(adapterRoot, home, runtimes, previousAdapters);
const mcpProvidersValue = valueFor('--mcp-providers', '');
const mcpProviders = mcpProvidersValue ? mcpProvidersValue.split(',').filter(Boolean) : undefined;
if (mcpProviders) configureMcps({ harnessRoot: sourceRoot, home, runtimes, providers: mcpProviders, dryRun: true });

if (argumentsList.includes('--dry-run')) {
  console.log('status=success');
  console.log(`summary=Preflight passed for ${runtimes.join(',')} at ${target} in ${mode} mode`);
  console.log('next_actions=Run the same command without --dry-run to install.');
  console.log(`artifacts=${target}`);
  process.exit(0);
}

try {
  let backup;
  let installedRoot;
  if (mode === 'copy') {
    backup = copyHarness(target);
    installedRoot = target;
  } else {
    if (exists(target) && !fs.lstatSync(target).isSymbolicLink()) fs.rmdirSync(target);
    if (!exists(target)) fs.symlinkSync(sourceRoot, target, 'dir');
    installedRoot = sourceRoot;
  }
  const manifest = generateRuntimeAdapters({ harnessRoot: installedRoot, outputRoot: adapterRoot, canonicalRoot: target });
  installLinks(links);
  const removedLinks = [];
  for (const [source, destination] of retiredLinks) {
    if (!isExactLink(destination, source)) continue;
    fs.unlinkSync(destination);
    removedLinks.push(destination);
  }
  let mcpResult;
  if (mcpProviders) mcpResult = configureMcps({ harnessRoot: installedRoot, home, runtimes, providers: mcpProviders });
  console.log('status=success');
  console.log(`summary=Installed Pro Harness for ${runtimes.join(',')} with ${manifest.agents.length} agents and ${manifest.commands.length} commands.`);
  console.log(`next_actions=${mcpResult ? 'Restart the selected runtimes and verify command discovery plus MCP authentication.' : 'Optionally rerun with --mcp-providers, then restart the selected runtimes.'}`);
  console.log(`artifacts=${[target, adapterRoot, ...(mcpResult?.files ?? []), ...(backup ? [backup] : [])].join(',')}`);
  if (removedLinks.length) console.log(`retired_links=${removedLinks.join(',')}; only superseded symlinks were removed; command content remains in workspace-codemap-pro.`);
} catch (error) {
  fail(error.message, 'Inspect the reported path, restore the timestamped backup if present, and retry after correcting the conflict.');
}
