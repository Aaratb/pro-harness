import fs from 'node:fs';
import path from 'node:path';
import { assertRelativePath, createExistingContainedPathResolver } from './repository-paths.mjs';
import { readFileNoFollow } from './review-safety.mjs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function wordCount(text) {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

// Maintainer measurement, not a runtime gate or a substitute for model usage.
// Callers supply all files actually loaded; conditional references are not guessed.
export function measureLoadedContext({ harnessRoot, files }) {
  assert(Array.isArray(files) && files.length > 0 && files.length <= 256, 'provide 1–256 explicitly loaded harness files');
  const entries = [...new Set(files)].map(file => {
    assertRelativePath(file);
    const bytes = readFileNoFollow(harnessRoot, file, 1048576);
    assert(!bytes.includes(0), 'context files must be text');
    return { path: file, words: wordCount(bytes.toString('utf8')), bytes: bytes.length };
  });
  return {
    scope: 'explicit-harness-files-only', files: entries,
    words: entries.reduce((sum, entry) => sum + entry.words, 0),
    bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
    model_tokens: null,
  };
}

function patternMatches(pattern, text) {
  assert(pattern instanceof RegExp, 'forbidden terminology entries must be regular expressions');
  pattern.lastIndex = 0;
  try {
    return pattern.test(text);
  } finally {
    pattern.lastIndex = 0;
  }
}

function safeRelativePath(value, label, requiredPrefix) {
  let parts;
  try {
    parts = assertRelativePath(value);
  } catch (error) {
    throw new Error(`${label}: ${error.message}`);
  }
  if (requiredPrefix) assert(parts[0] === requiredPrefix, `${label}: path must stay beneath ${requiredPrefix}/`);
  return parts.join('/');
}

export function buildCommandCatalogs({ harnessRoot, skillManifest, mcpRegistry }) {
  const skills = new Set(skillManifest.skills.map(({ name }) => name));
  const resolveHarnessPath = createExistingContainedPathResolver(harnessRoot);
  const agentDefinitionsRoot = resolveHarnessPath('agents/definitions', { expectedType: 'directory' });
  const agentEntries = fs.readdirSync(agentDefinitionsRoot, { withFileTypes: true })
    .filter(({ name }) => name.endsWith('.json'));
  for (const entry of agentEntries) {
    assert(entry.isFile() && !entry.isSymbolicLink(), `unsafe agent definition: ${entry.name}`);
  }
  const agents = new Set(agentEntries.map(({ name }) => name.slice(0, -'.json'.length)));
  const capabilities = new Set();
  const mcpContracts = mcpRegistry.contracts.map((registryEntry) => {
    const contractPath = safeRelativePath(registryEntry.path, `${registryEntry.name}: invalid MCP contract path`);
    const relativeContractPath = path.posix.join('mcps', contractPath);
    const physicalContractPath = resolveHarnessPath(relativeContractPath, { expectedType: 'file' });
    const contract = JSON.parse(fs.readFileSync(physicalContractPath, 'utf8'));
    for (const capability of Object.keys(contract.capabilities)) capabilities.add(capability);
    return { registryEntry, contract };
  });

  return { skills, agents, capabilities, mcpContracts };
}

export function validateCommandMechanics({
  contract,
  phaseCount,
  commandRoot,
  phaseBasePath,
  read,
  mainText,
  globalTexts,
  mainWordBudget,
  mainLineBudget,
  activeWordBudget,
  phaseHeading,
  catalogs,
  phaseIndex,
  forbidden,
}) {
  const mainWords = wordCount(mainText);
  const mainLines = mainText.split('\n').length;
  assert(mainWords <= mainWordBudget, `main command exceeds ${mainWordBudget}-word budget: ${mainWords}`);
  assert(mainLines <= mainLineBudget, `main command exceeds ${mainLineBudget}-line budget: ${mainLines}`);

  const globalWords = globalTexts.reduce((total, text) => total + wordCount(text), 0);
  const resolveCommandPath = createExistingContainedPathResolver(commandRoot);
  const expectedNumbers = Array.from({ length: phaseCount }, (_, index) => index + 1);
  assert(JSON.stringify(contract.phases.map(({ number }) => number)) === JSON.stringify(expectedNumbers), `phases must be the integers 1 through ${phaseCount} in order`);
  assert(new Set(contract.phases.map(({ name }) => name)).size === phaseCount, 'phase names must be unique');
  assert(new Set(contract.phases.map(({ file }) => file)).size === phaseCount, 'phase files must be unique');

  for (const phase of contract.phases) {
    const phaseFile = safeRelativePath(phase.file, `Phase ${phase.number}: invalid phase path`, 'phases');
    const relativePath = path.posix.join(phaseBasePath, phaseFile);
    try {
      resolveCommandPath(phaseFile, { expectedType: 'file' });
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error(`Phase ${phase.number}: missing ${phase.file}`);
      throw new Error(`Phase ${phase.number}: unsafe phase file: ${error.message}`);
    }
    const text = read(relativePath);
    const activeWords = globalWords + wordCount(text);
    assert(activeWords <= activeWordBudget, `Phase ${phase.number}: active context exceeds ${activeWordBudget}-word budget: ${activeWords}`);
    assert(text.startsWith(phaseHeading(phase)), `Phase ${phase.number}: heading differs from contract`);
    if (phaseIndex) assert(phaseIndex.text.includes(phaseIndex.entry(phase)), `Phase ${phase.number}: main command does not index ${phase.file}`);
    for (const skill of [...phase.required_skills, ...phase.optional_skills]) {
      assert(catalogs.skills.has(skill), `Phase ${phase.number}: unresolved skill ${skill}`);
    }
    for (const agent of phase.agents) assert(catalogs.agents.has(agent), `Phase ${phase.number}: unresolved agent ${agent}`);
    for (const capability of phase.capabilities) assert(catalogs.capabilities.has(capability), `Phase ${phase.number}: unresolved capability ${capability}`);
  }

  if (forbidden) {
    for (const pattern of forbidden.patterns) {
      assert(!patternMatches(pattern, forbidden.text), `${forbidden.label} contains forbidden text ${pattern}`);
    }
  }

  return { expectedNumbers, mainWords, mainLines, globalWords, contextBudgetScope: 'command-shell-only' };
}
