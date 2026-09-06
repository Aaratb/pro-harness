#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertJsonSchema } from './lib/json-schema.mjs';
import { canonicalRoot, containedPath } from './lib/repository-paths.mjs';
import { fingerprintRepository } from './explainer-source.mjs';
import { safeSvg, visualCompletionErrors } from './lib/explainer-visuals.mjs';

const harnessRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = (name) => path.join(harnessRoot, 'schemas', 'explainer-pro', `${name}.schema.json`);
const digestFile = (file) => `sha256:${crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}`;
const args = process.argv.slice(2);
const valueFor = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
const errors = [];
const verification = [];
const check = (condition, code, detail) => { verification.push({ code, status: condition ? 'passed' : 'failed', detail }); if (!condition) errors.push(`${code}: ${detail}`); };

try {
  const repositoryRoot = canonicalRoot(valueFor('--repo-root'));
  const artifactInput = valueFor('--artifact-root');
  if (!artifactInput) throw new Error('usage: validate-explainer-course.mjs --repo-root <path> --artifact-root <path>');
  const artifactRoot = canonicalRoot(path.isAbsolute(artifactInput) ? artifactInput : path.join(repositoryRoot, artifactInput));
  const relative = path.relative(repositoryRoot, artifactRoot).split(path.sep).join('/');
  check(/^\.agents\/explanations\/[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(relative), 'artifact-root', 'course root must be repository-owned');
  const pointerPath = containedPath(artifactRoot, 'CURRENT', { expectedType: 'file' });
  check(!fs.lstatSync(pointerPath).isSymbolicLink(), 'current-pointer-file', 'CURRENT must be a regular text file');
  const generationId = fs.readFileSync(pointerPath, 'utf8').trim();
  check(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(generationId), 'generation-id', 'CURRENT must contain one safe generation identifier');
  const generationRoot = containedPath(artifactRoot, `generations/${generationId}`, { expectedType: 'directory' });
  const readJson = (relativePath) => JSON.parse(fs.readFileSync(containedPath(generationRoot, relativePath, { expectedType: 'file' }), 'utf8'));
  const manifest = readJson('manifest.json');
  const claims = readJson('claims.json');
  assertJsonSchema(manifest, schema('generation'), 'generation manifest');
  assertJsonSchema(claims, schema('claims'), 'generation claims');
  check(manifest.generation_id === generationId, 'manifest-pointer', 'manifest generation must match CURRENT');
  const records = new Map(claims.records.map((claim) => [claim.id, claim]));
  check(records.size === claims.records.length, 'claim-ids', 'claim identifiers must be unique');
  const policy = JSON.parse(fs.readFileSync(path.join(harnessRoot, 'config', 'explainer-pro.json'), 'utf8'));
  const order = policy.section_order;
  const fresh = fingerprintRepository({ repositoryRoot, artifactRoot });
  check(manifest.source_fingerprint_sha256 === fresh.worktree_sha256, 'source-fingerprint', 'published evidence must match current source');
  const sections = [];
  const renderedDiagrams = [];
  for (const entry of manifest.sections) {
    const sectionPath = containedPath(generationRoot, `sections/${entry.id}.json`, { expectedType: 'file' });
    const section = JSON.parse(fs.readFileSync(sectionPath, 'utf8'));
    assertJsonSchema(section, schema('section'), `section ${entry.id}`);
    check(digestFile(sectionPath) === entry.digest, 'section-digest', `${entry.id} digest must match manifest`);
    check(section.id === entry.id && section.capability === entry.capability && section.phase === entry.phase, 'section-identity', `${entry.id} metadata must match manifest`);
    check(section.source_fingerprint_sha256 === manifest.source_fingerprint_sha256, 'section-fingerprint', `${entry.id} must use the current evidence fingerprint`);
    check(section.prerequisites.join('|') === policy.capability_dependencies[section.capability]?.join('|'), 'section-prerequisites', `${entry.id} must declare canonical prerequisites`);
    for (const claimId of section.claim_ids) check(records.has(claimId), 'section-claim', `${entry.id} references ${claimId}`);
    check(new Set(section.diagrams.map(({ id }) => id)).size === section.diagrams.length, 'diagram-ids', `${entry.id} diagram identifiers must be unique`);
    for (const diagram of section.diagrams) {
      for (const claimId of diagram.claim_ids) check(Boolean(records.get(claimId)?.independently_verified), 'diagram-claim', `${diagram.id} references independently verified ${claimId}`);
      if (diagram.rendered_svg) {
        const relative = `diagrams/${section.id}-${diagram.id}.svg`;
        check(diagram.rendered_svg === `generations/${generationId}/${relative}`, 'diagram-contained', `${diagram.id} must remain in its immutable generation`);
        check(Boolean(manifest.artifact_digests[relative]), 'diagram-digest', `${diagram.id} requires its published content digest`);
        const svg = safeSvg(fs.readFileSync(containedPath(generationRoot, relative, { expectedType: 'file' }), 'utf8'));
        renderedDiagrams.push({ id: `${section.id}/${diagram.id}`, svg });
      }
    }
    for (const question of section.quiz) for (const claimId of question.claim_ids) {
      const claim = records.get(claimId);
      check(Boolean(claim && claim.level === 'CONFIRMED' && claim.independently_verified), 'quiz-claim', `${entry.id} quiz requires confirmed ${claimId}`);
    }
    sections.push(section);
  }
  check(sections.every((section, index) => index === 0 || order.indexOf(sections[index - 1].capability) < order.indexOf(section.capability)), 'section-order', 'sections must follow canonical capability order');
  const capabilities = new Set(sections.map(({ capability }) => capability));
  if (manifest.status === 'certified') {
    const failures = visualCompletionErrors(sections, manifest.mode);
    check(failures.length === 0, 'certified-visuals', failures.join('; ') || 'required course visuals are rendered');
  }
  for (const section of sections) for (const prerequisite of section.prerequisites) check(capabilities.has(prerequisite), 'prerequisite-closure', `${section.id} requires current ${prerequisite}`);
  for (const claim of claims.records) {
    check(capabilities.has(claim.owner_section), 'claim-owner', `${claim.id} must belong to a current section`);
    check(!claim.material || claim.independently_verified, 'independent-grounding', `${claim.id} material evidence must be independently verified`);
    if (manifest.status === 'certified') check(!claim.material || claim.level !== 'UNVERIFIED', 'certified-grounding', `${claim.id} must not be unverified material in a certified course`);
  }
  for (const [relativePath, expectedDigest] of Object.entries(manifest.artifact_digests)) {
    const file = containedPath(generationRoot, relativePath, { expectedType: 'file' });
    check(digestFile(file) === expectedDigest, 'artifact-digest', `${relativePath} digest must match manifest`);
  }
  const htmlPath = containedPath(generationRoot, 'course.html', { expectedType: 'file' });
  const html = fs.readFileSync(htmlPath, 'utf8');
  const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  const csp = (html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/i)?.[1] || '').replace(/&#39;/g, "'");
  const scriptHash = inlineScript === undefined ? '' : crypto.createHash('sha256').update(inlineScript).digest('base64');
  check(Boolean(scriptHash) && csp.includes(`script-src 'sha256-${scriptHash}'`) && csp.includes("default-src 'none'") && csp.includes('img-src data:'), 'html-content-security', 'offline course requires a matching inline script hash and restrictive resource policy');
  check(/^<!doctype html>/i.test(html) && /<html\b[\s\S]*<\/html>\s*$/i.test(html), 'html-document', 'course.html must be a complete HTML document');
  check(!/<(?:script|img|iframe|link)\b[^>]*(?:src|href)\s*=\s*["'](?:https?:)?\/\//i.test(html), 'html-self-contained', 'course must not load external assets');
  check(!/<script\b[^>]+src=/i.test(html) && !/<link\b[^>]+rel=["']stylesheet/i.test(html), 'html-inline-assets', 'course scripts and styles must be inline');
  for (const diagram of renderedDiagrams) check(html.includes(`src="data:image/svg+xml;base64,${Buffer.from(diagram.svg, 'utf8').toString('base64')}"`), 'diagram-embedded', `${diagram.id} must display its verified SVG, not only the source`);
  check(/<nav\b[^>]*aria-label=/i.test(html) && /aria-live=/i.test(html) && /focus-visible/i.test(html), 'html-accessibility', 'course must include navigation, live feedback, and focus visibility');
  check(/pre\{[^}]*white-space:pre(?:-wrap)?/i.test(html), 'code-whitespace', 'course CSS must preserve code whitespace');
  check(!/<(?:script|foreignObject|iframe|object|embed)\b/i.test(html.replace(/<script>[\s\S]*?<\/script>/i, '')), 'embedded-active-content', 'embedded diagrams must not contain active content');
  check(manifest.claim_count === claims.records.length, 'claim-count', 'manifest claim count must match claims file');
  const staging = fs.readdirSync(path.join(artifactRoot, 'generations')).filter((name) => name.startsWith('.staging-'));
  check(staging.length === 0, 'atomic-publication', 'no abandoned staging generation may remain');
  console.log(JSON.stringify({ status: errors.length ? 'error' : 'success', summary: errors.length ? `${errors.length} course checks failed` : 'Explainer Pro course is valid', verification, errors, artifacts: [`generations/${generationId}/manifest.json`, `generations/${generationId}/course.html`], next_actions: errors.length ? ['Repair the candidate generation and publish a new immutable generation.'] : ['Use this result within the lifecycle gate; do not repeat checks against unchanged inputs.'] }, null, 2));
  if (errors.length) process.exit(1);
} catch (error) {
  console.log(JSON.stringify({ status: 'error', summary: error.message, verification, errors, artifacts: [], next_actions: ['Provide a contained course root with a valid CURRENT generation.'] }, null, 2));
  process.exit(1);
}
