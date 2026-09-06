#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const harnessRoot = path.resolve(scriptDirectory, '..');
const catalogPath = path.join(harnessRoot, 'skills', 'resolution-manifest.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

function titleCase(name) {
  return name.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

for (const skill of catalog.skills) {
  const skillRoot = path.join(harnessRoot, 'skills', skill.name);
  fs.mkdirSync(skillRoot, { recursive: true });

  const dependencySection = skill.dependencies.length > 0
    ? `\n## Dependencies\n\n${skill.dependencies.map((name) => `- Load \`${name}\` only when this workflow reaches the step that needs it.`).join('\n')}\n`
    : '';
  const capabilitySection = skill.capabilities.length > 0
    ? `\n## Required capabilities\n\n${skill.capabilities.map((name) => `- \`${name}\``).join('\n')}\n`
    : '';
  const body = [
    '---',
    `name: ${skill.name}`,
    `description: ${JSON.stringify(skill.description)}`,
    '---',
    '',
    `# ${titleCase(skill.name)}`,
    '',
    'Use the caller-supplied `artifact_root` for every workflow-owned artifact.',
    'Stop if the root is missing, outside the active repository, or escapes through a symlink.',
    dependencySection.trimEnd(),
    capabilitySection.trimEnd(),
    '',
    '## Workflow',
    '',
    ...skill.workflow.map((step, index) => `${index + 1}. ${step}`),
    '',
    '## Output',
    '',
    skill.output,
    '',
    '## Stop conditions',
    '',
    '- Stop when the requested outcome and its evidence are complete.',
    '- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.',
    '- Do not expand repository, network, production, or external-message scope without explicit approval.',
    ''
  ].filter((line, index, lines) => !(line === '' && lines[index - 1] === '')).join('\n');

  fs.writeFileSync(path.join(skillRoot, 'SKILL.md'), body, 'utf8');
}

console.log(`rendered ${catalog.skills.length} canonical skills`);
