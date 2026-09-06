#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fingerprintRepository } from './explainer-source.mjs';
import { assertJsonSchema } from './lib/json-schema.mjs';
import { canonicalRoot, containedPath, ensureContainedDirectory } from './lib/repository-paths.mjs';
import { htmlFor } from './lib/explainer-html.mjs';
import { renderExplainerDiagram } from './lib/explainer-diagram.mjs';
import { safeSvg, visualCompletionErrors } from './lib/explainer-visuals.mjs';

const harnessRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = JSON.parse(fs.readFileSync(path.join(harnessRoot, 'config', 'explainer-pro.json'), 'utf8'));
const schemaPath = (name) => path.join(harnessRoot, 'schemas', 'explainer-pro', `${name}.schema.json`);
const digest = (value) => `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
const digestFile = (file) => digest(fs.readFileSync(file));

function parseArguments() {
  const args = process.argv.slice(2);
  const operation = args.shift();
  const values = new Map();
  const booleans = new Set(['--certified']);
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (!flag.startsWith('--')) throw new Error(`unexpected argument ${flag}`);
    if (booleans.has(flag)) { values.set(flag, true); continue; }
    if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`${flag} requires a value`);
    values.set(flag, args[index + 1]);
    index += 1;
  }
  return { operation, value: (flag) => values.get(flag), has: (flag) => values.has(flag) };
}

function explainerContext(repositoryInput, artifactInput) {
  const repositoryRoot = canonicalRoot(repositoryInput);
  const candidate = path.isAbsolute(artifactInput) ? artifactInput : path.join(repositoryRoot, artifactInput);
  const artifactRoot = canonicalRoot(candidate);
  const artifactRelative = path.relative(repositoryRoot, artifactRoot).split(path.sep).join('/');
  if (!/^\.agents\/explanations\/[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(artifactRelative)) throw new Error('artifact root must match .agents/explanations/<slug> inside the repository');
  return { repositoryRoot, artifactRoot, artifactRelative, slug: path.posix.basename(artifactRelative) };
}

function readJsonContained(root, relativePath, schema = null) {
  const file = containedPath(root, relativePath, { expectedType: 'file' });
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (schema) assertJsonSchema(value, schemaPath(schema), relativePath);
  return value;
}

function writePrivate(file, value) {
  fs.writeFileSync(file, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

function atomicWriteJson(root, relativePath, value) {
  const target = containedPath(root, relativePath, { allowMissingLeaf: true });
  const temporary = containedPath(root, `.${path.posix.basename(relativePath)}.${crypto.randomUUID()}.tmp`, { allowMissingLeaf: true });
  writePrivate(temporary, value);
  fs.renameSync(temporary, target);
}

function hashContracts() {
  const entries = {
    command_digest: 'commands/explainer-pro.md',
    core_skill_digest: 'skills/explainer-core/SKILL.md',
    routing_digest: 'commands/explainer-pro/routing.md',
    contract_digest: 'commands/explainer-pro/contract.json',
  };
  return Object.fromEntries(Object.entries(entries).map(([key, relative]) => [key, digestFile(path.join(harnessRoot, relative))]));
}

function initialize({ repositoryRoot, artifactRoot, mode, audience }) {
  const context = explainerContext(repositoryRoot, artifactRoot);
  const statePath = path.join(context.artifactRoot, 'state.json');
  if (fs.existsSync(statePath)) throw new Error('state.json already exists; resume or choose a different slug');
  ensureContainedDirectory(context.artifactRoot, 'work');
  ensureContainedDirectory(context.artifactRoot, 'work/lanes');
  ensureContainedDirectory(context.artifactRoot, 'generations');
  const normalizedMode = String(mode ?? 'COURSE').toUpperCase();
  const normalizedAudience = String(audience ?? 'PM').toUpperCase();
  if (!policy.allowed_modes.includes(normalizedMode)) throw new Error(`mode must be one of ${policy.allowed_modes.join(', ')}`);
  if (!policy.allowed_audiences.includes(normalizedAudience)) throw new Error(`audience must be one of ${policy.allowed_audiences.join(', ')}`);
  const fingerprint = fingerprintRepository({ repositoryRoot: context.repositoryRoot, artifactRoot: context.artifactRoot });
  const state = {
    schema_version: 'explainer-pro/state@1',
    run_id: `explainer-${crypto.randomUUID()}`,
    slug: context.slug,
    mode: normalizedMode,
    audience: normalizedAudience,
    repository_root: context.repositoryRoot,
    artifact_root: context.artifactRoot,
    current_phase: 1,
    current_generation: null,
    source_fingerprint: { head: fingerprint.head, worktree_sha256: fingerprint.worktree_sha256, captured_at: fingerprint.captured_at },
    loaded_contract: { ...hashContracts(), loaded_at: new Date().toISOString() },
    phases: Object.fromEntries(Array.from({ length: 8 }, (_, index) => [String(index + 1), index === 0 ? 'in_progress' : 'pending'])),
    capabilities: {},
    invalidated_sections: [],
    doubts: [],
    coverage: { scope: context.slug, limitations: [], static_only: true },
    workflow_trace: { status: 'pending', path: 'run-events.jsonl' },
    transition_log: [],
  };
  assertJsonSchema(state, schemaPath('state'), 'initial Explainer Pro state');
  writePrivate(statePath, state);
  writePrivate(path.join(context.artifactRoot, 'source-fingerprint.json'), fingerprint);
  writePrivate(path.join(context.artifactRoot, 'work', 'claims.json'), { schema_version: 'explainer-pro/claims@1', records: [] });
  writePrivate(path.join(context.artifactRoot, 'work', 'registry.json'), { schema_version: 'explainer-pro/registry@1', terms: [], conventions: [] });
  return { state, context };
}

function transitiveDependents(capability, dependenciesByCapability = policy.capability_dependencies) {
  const dependents = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const [candidate, dependencies] of Object.entries(dependenciesByCapability)) {
      if (candidate !== capability && !dependents.has(candidate) && dependencies.some((dependency) => dependency === capability || dependents.has(dependency))) {
        dependents.add(candidate); changed = true;
      }
    }
  }
  return dependents;
}

function publishedDependencies(current) {
  const dependencies = Object.fromEntries(Object.entries(policy.capability_dependencies).map(([capability, prerequisites]) => [capability, [...prerequisites]]));
  const owners = new Map(current.claims.records.map(({ id, owner_section }) => [id, owner_section]));
  for (const section of current.sections) {
    const references = [...section.claim_ids, ...section.diagrams.flatMap(({ claim_ids }) => claim_ids), ...section.quiz.flatMap(({ claim_ids }) => claim_ids)];
    for (const id of references) {
      const owner = owners.get(id);
      if (owner && owner !== section.capability && !dependencies[section.capability].includes(owner)) dependencies[section.capability].push(owner);
    }
  }
  return dependencies;
}

function markdownFor(sections, claims, state) {
  const lines = [`# ${state.slug}: Repository Learning Course`, '', `Audience: ${state.audience}`, '', '> This course quotes repository source. Treat it as internal unless reviewed for sharing.', ''];
  for (const section of sections) {
    lines.push(`## ${section.title}`, '', `Evidence status: ${section.status}`, '', '### Orientation', '', section.content.orientation, '', '### Mechanism', '', section.content.mechanism, '');
    for (const diagram of section.diagrams) {
      lines.push(`### ${diagram.title}`, '');
      if (diagram.rendered_svg) lines.push(`![${diagram.title.replace(/[\[\]\\]/g, '\\$&')}](diagrams/${section.id}-${diagram.id}.svg)`, '', diagram.alt, '');
      else lines.push('> Visual incomplete: this diagram has not been rendered.', '', diagram.alt, '');
      lines.push('<details>', '<summary>Diagram source</summary>', '', '```mermaid', diagram.source, '```', '', '</details>', '');
    }
    lines.push('### Evidence', '', section.content.evidence, '');
    const consequence = ['### Consequence', '', section.content.consequence, ''];
    if (section.capability !== 'quiz') lines.push(...consequence);
    if (section.quiz.length) {
      lines.push('### Comprehension checks', '');
      section.quiz.forEach((question, index) => {
        lines.push(`${index + 1}. ${question.question}`);
        question.options.forEach((option) => lines.push(`   - ${option}`));
      });
      lines.push('');
    }
    if (section.capability === 'quiz') lines.push(...consequence);
  }
  const open = claims.records.filter(({ level }) => level === 'UNVERIFIED');
  if (open.length) {
    lines.push('## Open questions', '');
    for (const claim of open) lines.push(`- ${claim.text} (${claim.cite})`);
    lines.push('');
  }
  lines.push(`Coverage: ${state.coverage.scope}. ${state.coverage.limitations.join(' ') || 'No additional limitations recorded.'}`, '');
  return `${lines.join('\n')}\n`;
}


function loadCurrent(context, state) {
  if (!state.current_generation) return { sections: [], claims: { schema_version: 'explainer-pro/claims@1', records: [] }, registry: { schema_version: 'explainer-pro/registry@1', terms: [], conventions: [] } };
  const pointer = fs.readFileSync(containedPath(context.artifactRoot, 'CURRENT', { expectedType: 'file' }), 'utf8').trim();
  if (pointer !== state.current_generation) throw new Error('state and CURRENT must agree before reusing evidence');
  const generationRoot = `generations/${state.current_generation}`;
  const manifest = readJsonContained(context.artifactRoot, `${generationRoot}/manifest.json`, 'generation');
  if (manifest.generation_id !== state.current_generation || manifest.source_fingerprint_sha256 !== state.source_fingerprint.worktree_sha256) throw new Error('current generation identity or source fingerprint differs from state');
  for (const entry of manifest.sections) {
    if (digestFile(containedPath(context.artifactRoot, `${generationRoot}/sections/${entry.id}.json`, { expectedType: 'file' })) !== entry.digest) throw new Error(`cannot reuse changed section ${entry.id}`);
  }
  const sections = manifest.sections.map(({ id }) => readJsonContained(context.artifactRoot, `${generationRoot}/sections/${id}.json`, 'section'));
  const requiredArtifacts = ['claims.json', 'registry.json', 'EXPLAINER.md', 'course.html'];
  for (const section of sections) for (const diagram of section.diagrams) if (diagram.rendered_svg) {
    const relative = `diagrams/${section.id}-${diagram.id}.svg`;
    if (diagram.rendered_svg !== `${generationRoot}/${relative}`) throw new Error(`cannot reuse diagram outside its immutable generation: ${diagram.id}`);
    requiredArtifacts.push(relative);
  }
  for (const required of requiredArtifacts) if (!manifest.artifact_digests[required]) throw new Error(`cannot reuse artifact without published digest ${required}`);
  for (const [relative, expectedDigest] of Object.entries(manifest.artifact_digests)) {
    if (digestFile(containedPath(context.artifactRoot, `${generationRoot}/${relative}`, { expectedType: 'file' })) !== expectedDigest) throw new Error(`cannot reuse changed artifact ${relative}`);
  }
  const claims = readJsonContained(context.artifactRoot, `${generationRoot}/claims.json`, 'claims');
  const registry = readJsonContained(context.artifactRoot, `${generationRoot}/registry.json`);
  return { sections, claims, registry };
}

function validateClaimsAndSection(section, claims) {
  assertJsonSchema(section, schemaPath('section'), section.id);
  assertJsonSchema(claims, schemaPath('claims'), 'claims');
  if (section.id !== section.capability) throw new Error('section id must equal its canonical capability');
  if (!(section.capability in policy.capability_dependencies)) throw new Error(`unknown capability ${section.capability}`);
  if (section.prerequisites.join('|') !== policy.capability_dependencies[section.capability].join('|')) throw new Error(`section prerequisites differ from policy for ${section.capability}`);
  if (section.quiz.some((question) => question.correct_index >= question.options.length || question.explanations.length !== question.options.length)) throw new Error('quiz option, answer, and explanation counts must align');
  if (new Set(section.diagrams.map(({ id }) => id)).size !== section.diagrams.length) throw new Error('diagram identifiers must be unique within a section');
  const records = new Map(claims.records.map((claim) => [claim.id, claim]));
  if (records.size !== claims.records.length) throw new Error('claim identifiers must be unique');
  for (const claim of claims.records) {
    if (claim.owner_section !== section.id) throw new Error(`incoming claim ${claim.id} is owned by ${claim.owner_section}, not ${section.id}`);
    if (claim.material && !claim.independently_verified) throw new Error(`material claim ${claim.id} was not independently verified`);
  }
  for (const claimId of section.claim_ids) {
    const claim = records.get(claimId);
    if (!claim || claim.owner_section !== section.id) throw new Error(`section claim ${claimId} is missing or owned elsewhere`);
    if (claim.material && !claim.independently_verified) throw new Error(`material claim ${claimId} was not independently verified`);
  }
}

function copyDiagram(context, stagingRoot, section, diagram, claimsById, embeddedSvgs, warnings) {
  for (const claimId of diagram.claim_ids) if (!claimsById.has(claimId)) throw new Error(`diagram ${diagram.id} references missing claim ${claimId}`);
  let svg;
  if (diagram.rendered_svg) {
    const source = containedPath(context.artifactRoot, diagram.rendered_svg, { expectedType: 'file' });
    svg = fs.readFileSync(source, 'utf8');
  } else {
    try { svg = renderExplainerDiagram(diagram.source); } catch (error) {
      warnings.push({ diagram: `${section.id}/${diagram.id}`, reason: error.message });
      return false;
    }
  }
  // Unsafe supplied or generated SVG is a failed publication, never a fallback.
  const sanitized = safeSvg(svg);
  const targetDirectory = path.join(stagingRoot, 'diagrams');
  const target = path.join(targetDirectory, `${section.id}-${diagram.id}.svg`);
  writePrivate(target, sanitized);
  embeddedSvgs.set(`${section.id}/${diagram.id}`, sanitized);
  return true;
}

function certificationRequirements(mode) {
  if (mode === 'CHANGE') return ['repo-map', 'change', 'quiz'];
  return ['repo-map', 'reading-plan', 'architecture', 'feature-map', 'trace-feature', 'business-logic', 'explain-function', 'sequence', 'dependency-graph', 'libraries', 'conventions', 'glossary', 'quiz'];
}

function publish({ repositoryRoot, artifactRoot, sectionPath, claimsPath, batchPath, registryPath, certified }) {
  const context = explainerContext(repositoryRoot, artifactRoot);
  const state = readJsonContained(context.artifactRoot, 'state.json', 'state');
  const fresh = fingerprintRepository({ repositoryRoot: context.repositoryRoot, artifactRoot: context.artifactRoot });
  if (fresh.worktree_sha256 !== state.source_fingerprint.worktree_sha256) throw new Error('source fingerprint changed; re-ground affected claims before publication');
  const inputs = batchPath ? readJsonContained(context.artifactRoot, batchPath) : [{ section: sectionPath, claims: claimsPath }];
  if (!Array.isArray(inputs) || inputs.length < 1 || inputs.length > policy.section_order.length) throw new Error(`batch must contain 1-${policy.section_order.length} section/claims pairs`);
  const incoming = inputs.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).sort().join('|') !== 'claims|section' || typeof entry.section !== 'string' || typeof entry.claims !== 'string') throw new Error('each batch member requires only section and claims paths beneath artifact_root');
    return { section: readJsonContained(context.artifactRoot, entry.section, 'section'), claims: readJsonContained(context.artifactRoot, entry.claims, 'claims') };
  });
  const replaced = new Set(incoming.map(({ section }) => section.capability));
  if (replaced.size !== incoming.length) throw new Error('batch contains a duplicate capability');
  for (const { section, claims } of incoming) {
    validateClaimsAndSection(section, claims);
    if (section.source_fingerprint_sha256 !== fresh.worktree_sha256) throw new Error('section fingerprint does not match current source');
  }
  const current = loadCurrent(context, state);
  const dependencies = publishedDependencies(current);
  const invalidated = new Set([...replaced].flatMap((capability) => [...transitiveDependents(capability, dependencies)]).filter((capability) => !replaced.has(capability)));
  const keptSections = current.sections.filter((candidate) => !replaced.has(candidate.capability) && !invalidated.has(candidate.capability));
  const sections = [...keptSections, ...incoming.map(({ section }) => section)].sort((a, b) => policy.section_order.indexOf(a.capability) - policy.section_order.indexOf(b.capability));
  const availableCapabilities = new Set(sections.map(({ capability }) => capability));
  for (const section of sections) {
    if (section.source_fingerprint_sha256 !== fresh.worktree_sha256) throw new Error(`cannot reuse stale section ${section.id}`);
    for (const prerequisite of section.prerequisites) if (!availableCapabilities.has(prerequisite)) throw new Error(`missing prerequisite capability ${prerequisite}`);
  }
  const removedOwners = new Set([...replaced, ...invalidated]);
  const records = current.claims.records.filter(({ owner_section }) => !removedOwners.has(owner_section));
  records.push(...incoming.flatMap(({ claims }) => claims.records));
  const claims = { schema_version: 'explainer-pro/claims@1', records };
  assertJsonSchema(claims, schemaPath('claims'), 'merged claims');
  if (new Set(records.map(({ id }) => id)).size !== records.length) throw new Error('merged claim identifiers must be unique');
  const claimsById = new Map(records.map((claim) => [claim.id, claim]));
  for (const candidate of sections) for (const claimId of candidate.claim_ids) if (!claimsById.has(claimId)) throw new Error(`${candidate.id} references missing claim ${claimId}`);
  for (const candidate of sections) {
    for (const question of candidate.quiz) for (const claimId of question.claim_ids) {
      const claim = claimsById.get(claimId);
      if (!claim || claim.level !== 'CONFIRMED' || !claim.independently_verified) throw new Error(`quiz claim ${claimId} is not independently confirmed`);
    }
    for (const diagram of candidate.diagrams) for (const claimId of diagram.claim_ids) {
      const claim = claimsById.get(claimId);
      if (!claim || !claim.independently_verified) throw new Error(`diagram claim ${claimId} was not independently verified`);
    }
  }
  const registrySource = registryPath ? readJsonContained(context.artifactRoot, registryPath) : current.registry;
  if (!registrySource || !Array.isArray(registrySource.terms) || !Array.isArray(registrySource.conventions)) throw new Error('registry requires terms and conventions arrays');
  const incomingRegistry = { ...registrySource };
  for (const key of ['terms', 'conventions']) incomingRegistry[key] = registrySource[key].filter((record) => {
    if (!record || typeof record.owner_section !== 'string') throw new Error('registry records require an owner_section');
    return availableCapabilities.has(record.owner_section) && (registryPath || !removedOwners.has(record.owner_section));
  });

  if (certified) {
    for (const required of certificationRequirements(state.mode)) if (!sections.some(({ capability }) => capability === required)) throw new Error(`certification requires capability ${required}`);
    if (records.some((claim) => claim.material && (!claim.independently_verified || claim.level === 'UNVERIFIED'))) throw new Error('certification forbids unverified material claims');
  }

  const generationId = `${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${crypto.randomBytes(4).toString('hex')}`;
  const publishedSections = sections.map((candidate) => ({
    ...candidate,
    diagrams: candidate.diagrams.map((diagram) => ({
      ...diagram,
      rendered_svg: null,
    })),
  }));
  const stagingName = `.staging-${generationId}-${crypto.randomUUID()}`;
  const stagingRelative = `generations/${stagingName}`;
  const stagingRoot = ensureContainedDirectory(context.artifactRoot, stagingRelative);
  const finalRelative = `generations/${generationId}`;
  const finalRoot = containedPath(context.artifactRoot, finalRelative, { allowMissingLeaf: true });
  const renderWarnings = [];
  try {
    ensureContainedDirectory(context.artifactRoot, `${stagingRelative}/sections`);
    ensureContainedDirectory(context.artifactRoot, `${stagingRelative}/diagrams`);
    const embeddedSvgs = new Map();
    for (let index = 0; index < sections.length; index += 1) {
      const sourceSection = sections[index];
      const publishedSection = publishedSections[index];
      for (let diagramIndex = 0; diagramIndex < sourceSection.diagrams.length; diagramIndex += 1) {
        const diagram = sourceSection.diagrams[diagramIndex];
        if (copyDiagram(context, stagingRoot, sourceSection, diagram, claimsById, embeddedSvgs, renderWarnings)) publishedSection.diagrams[diagramIndex].rendered_svg = `generations/${generationId}/diagrams/${sourceSection.id}-${diagram.id}.svg`;
      }
      writePrivate(path.join(stagingRoot, 'sections', `${publishedSection.id}.json`), publishedSection);
    }
    if (certified) {
      const visualErrors = visualCompletionErrors(publishedSections, state.mode);
      if (visualErrors.length) throw new Error(`certification requires complete visuals: ${visualErrors.join('; ')}`);
    }
    writePrivate(path.join(stagingRoot, 'claims.json'), claims);
    writePrivate(path.join(stagingRoot, 'registry.json'), incomingRegistry);
    writePrivate(path.join(stagingRoot, 'EXPLAINER.md'), markdownFor(publishedSections, claims, state));
    writePrivate(path.join(stagingRoot, 'course.html'), htmlFor(publishedSections, state, embeddedSvgs, { certified }));

    const sectionEntries = publishedSections.map((candidate) => ({ id: candidate.id, capability: candidate.capability, phase: candidate.phase, digest: digestFile(path.join(stagingRoot, 'sections', `${candidate.id}.json`)) }));
    const artifactDigests = {
      'claims.json': digestFile(path.join(stagingRoot, 'claims.json')),
      'registry.json': digestFile(path.join(stagingRoot, 'registry.json')),
      'EXPLAINER.md': digestFile(path.join(stagingRoot, 'EXPLAINER.md')),
      'course.html': digestFile(path.join(stagingRoot, 'course.html')),
    };
    for (const section of publishedSections) for (const diagram of section.diagrams) if (diagram.rendered_svg) {
      const relative = `diagrams/${section.id}-${diagram.id}.svg`;
      artifactDigests[relative] = digestFile(path.join(stagingRoot, relative));
    }
    const manifest = {
      schema_version: 'explainer-pro/generation@1', generation_id: generationId, previous_generation: state.current_generation,
      created_at: new Date().toISOString(), mode: state.mode, audience: state.audience, status: certified ? 'certified' : 'partial',
      source_fingerprint_sha256: fresh.worktree_sha256, sections: sectionEntries, claim_count: records.length, coverage: state.coverage,
      artifact_digests: artifactDigests,
    };
    assertJsonSchema(manifest, schemaPath('generation'), 'generation manifest');
    writePrivate(path.join(stagingRoot, 'manifest.json'), manifest);
    if (fingerprintRepository({ repositoryRoot: context.repositoryRoot, artifactRoot: context.artifactRoot }).worktree_sha256 !== fresh.worktree_sha256) throw new Error('source fingerprint changed during publication; re-ground before retrying');
    fs.renameSync(stagingRoot, finalRoot);
  } catch (error) {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
    throw error;
  }
  const pointerTemporary = containedPath(context.artifactRoot, `.CURRENT.${crypto.randomUUID()}.tmp`, { allowMissingLeaf: true });
  writePrivate(pointerTemporary, `${generationId}\n`);
  fs.renameSync(pointerTemporary, path.join(context.artifactRoot, 'CURRENT'));

  state.current_generation = generationId;
  state.current_phase = Math.max(...incoming.map(({ section }) => section.phase));
  for (const { section } of incoming) {
    state.phases[String(section.phase)] = 'passed';
    state.capabilities[section.capability] = 'passed';
  }
  for (const invalid of invalidated) if (state.capabilities[invalid] === 'passed') state.capabilities[invalid] = 'stale';
  state.invalidated_sections = [...invalidated].filter((name) => current.sections.some(({ capability }) => capability === name)).sort();
  state.source_fingerprint = { head: fresh.head, worktree_sha256: fresh.worktree_sha256, captured_at: fresh.captured_at };
  atomicWriteJson(context.artifactRoot, 'state.json', state);
  return { generationId, context, invalidated: state.invalidated_sections, renderWarnings };
}

function recordDoubt({ repositoryRoot, artifactRoot, question, capability, answer }) {
  const context = explainerContext(repositoryRoot, artifactRoot);
  const state = readJsonContained(context.artifactRoot, 'state.json', 'state');
  const now = new Date().toISOString();
  const doubt = {
    id: `doubt-${crypto.randomBytes(8).toString('hex')}`,
    question,
    capability: capability ?? null,
    evidence_refs: [],
    status: answer ? 'answered' : 'open',
    created_at: now,
    resolved_at: answer ? now : null,
    answer: answer ?? null,
  };
  assertJsonSchema(doubt, schemaPath('doubt'), 'doubt');
  state.doubts.push(doubt);
  atomicWriteJson(context.artifactRoot, 'state.json', state);
  return { doubt, context };
}

function main() {
  const args = parseArguments();
  const repositoryRoot = args.value('--repo-root');
  const artifactRoot = args.value('--artifact-root');
  if (!repositoryRoot || !artifactRoot) throw new Error('all operations require --repo-root and --artifact-root');
  if (args.operation === 'init') {
    const result = initialize({ repositoryRoot, artifactRoot, mode: args.value('--mode'), audience: args.value('--audience') });
    return { status: 'success', summary: 'initialized Explainer Pro state', artifacts: [path.join(result.context.artifactRoot, 'state.json')], next_actions: ['Build the intake substrate and start the selected phase.'] };
  }
  if (args.operation === 'publish') {
    if (args.has('--batch') ? args.has('--section') || args.has('--claims') : !args.value('--section') || !args.value('--claims')) throw new Error('publish requires either --batch or both --section and --claims paths beneath artifact_root');
    const result = publish({ repositoryRoot, artifactRoot, sectionPath: args.value('--section'), claimsPath: args.value('--claims'), batchPath: args.value('--batch'), registryPath: args.value('--registry'), certified: args.has('--certified') });
    return { status: 'success', summary: `published immutable generation ${result.generationId}`, artifacts: [path.join(result.context.artifactRoot, 'generations', result.generationId), path.join(result.context.artifactRoot, 'CURRENT')], invalidated: result.invalidated, render_warnings: result.renderWarnings, next_actions: [...(result.renderWarnings.length ? ['Render the listed diagrams locally and republish before certification.'] : []), 'Run the lifecycle transition hook once at this checkpoint; it includes run-state and course validation.'] };
  }
  if (args.operation === 'record-doubt') {
    if (!args.value('--question')) throw new Error('record-doubt requires --question');
    const result = recordDoubt({ repositoryRoot, artifactRoot, question: args.value('--question'), capability: args.value('--capability'), answer: args.value('--answer') });
    return { status: 'success', summary: `recorded ${result.doubt.id}`, artifacts: [path.join(result.context.artifactRoot, 'state.json')], next_actions: ['Re-ground the answer and publish a new generation; never append to an existing generation.'] };
  }
  throw new Error('usage: explainer-course.mjs <init|publish|record-doubt> --repo-root <path> --artifact-root <path> [operation arguments]');
}

try { console.log(JSON.stringify(main(), null, 2)); } catch (error) {
  console.log(JSON.stringify({ status: 'error', summary: error.message, artifacts: [], next_actions: ['Repair the typed input or artifact boundary and retry without mutating the current generation.'] }, null, 2));
  process.exit(1);
}
